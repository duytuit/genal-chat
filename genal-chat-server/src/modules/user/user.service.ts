import { Injectable } from '@nestjs/common';
import { Repository, Like } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entity/user.entity';
import { Group, GroupMap } from '../group/entity/group.entity';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { RCode } from 'src/common/constant/rcode';
import { GroupMessage } from '../group/entity/groupMessage.entity';
import { UserMap } from '../friend/entity/friend.entity';
import { FriendMessage } from '../friend/entity/friendMessage.entity';
import { nameVerify, passwordVerify } from 'src/common/tool/utils';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupUserRepository: Repository<GroupMap>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
    @InjectRepository(UserMap)
    private readonly friendRepository: Repository<UserMap>,
    @InjectRepository(FriendMessage)
    private readonly friendMessageRepository: Repository<FriendMessage>,
  ) {}

  async getUser(userId: string) {
    try {
      let data;
      if(userId) {
        data = await this.userRepository.findOne({
          where:{userId: userId}
        });
        return { msg:'Nhận được thành công của người dùng', data };
      }
    } catch(e) {
      return { code: RCode.ERROR , msg:'Có được thất bại của người dùng', data: e };
    }
  }

  async postUsers(userIds: string) {
    try {
      if(userIds) {
        const userIdArr = userIds.split(',');
        const userArr = [];
        for(const userId of userIdArr) {
          if(userId) {
            const data = await this.userRepository.findOne({
              where:{userId: userId}
            });
            userArr.push(data);
          }
        }
        console.log(userIdArr);
        
        return { msg:'Nhận thông tin người dùng thành công', data: userArr};
      }
      return {code: RCode.FAIL, msg:'Không lấy được thông tin người dùng', data: null };
    } catch(e) {
      return { code: RCode.ERROR , msg:'Không lấy được thông tin người dùng', data: e };
    }
  }

  async postUserBot(data) {
    try {
      if(data) {
        const userBot = await this.userRepository.save(data)
        return { msg:'Nhận thông tin người dùng thành công', data: userBot};
      }
      return {code: RCode.FAIL, msg:'Không lấy được thông tin người dùng', data: null };
    } catch(e) {
      return { code: RCode.ERROR , msg:'Không lấy được thông tin người dùng', data: e };
    }
  }

  async updateUserName(user: User) {
    try {
      const oldUser = await this.userRepository.findOne({userId: user.userId, password: user.password});
      if(oldUser && nameVerify(user.username)) {
        const isHaveName = await this.userRepository.findOne({username: user.username});
        if(isHaveName) {
          return {code: 1, msg:'Tên người dùng trùng lặp', data: ''};
        }
        const newUser = JSON.parse(JSON.stringify(oldUser));
        newUser.username = user.username;
        newUser.password = user.password;
        await this.userRepository.update(oldUser,newUser);
        return { msg:'Cập nhật tên người dùng thành công', data: newUser};
      }
      return {code: RCode.FAIL, msg:'Cập nhật thất bại', data: '' };
    } catch(e) {
      return {code: RCode.ERROR, msg: 'Cập nhật lỗi tên người dùng', data: e };
    }
  }

  async updatePassword(user: User, password: string) {
    try {
      const oldUser = await this.userRepository.findOne({userId: user.userId, username: user.username, password: user.password});
      if(oldUser && passwordVerify(password)) {
        const newUser = JSON.parse(JSON.stringify(oldUser));
        newUser.password = password;
        await this.userRepository.update(oldUser, newUser);
        return { msg:'Cập nhật thành công về mật khẩu người dùng', data: newUser};
      } 
      return {code: RCode.FAIL, msg:'Cập nhật thất bại', data: '' };
    } catch(e) {
      return {code: RCode.ERROR, msg: 'Cập nhật lỗi mật khẩu người dùng', data: e };
    }
  }

  async jurisdiction(userId: string) {
    const user = await this.userRepository.findOne({userId: userId});
    const newUser = JSON.parse(JSON.stringify(user));
    if(user.username === 'Chen Guanxi') {
      newUser.role = 'admin';
      await this.userRepository.update(user,newUser);
      return { msg:'Cập nhật thông tin người dùng thành công', data: newUser};
    }
  }

  async delUser(uid: string, psw: string, did: string) {
    try {
      const user = await this.userRepository.findOne({userId: uid, password: psw});
      if(user.role === 'admin' && user.username === 'Chen Guanxi') {
        // 被删用户自己创建的群
        const groups = await this.groupRepository.find({userId: did});
        for(const group of groups) {
          await this.groupRepository.delete({groupId: group.groupId});
          await this.groupUserRepository.delete({groupId: group.groupId});
          await this.groupMessageRepository.delete({groupId: group.groupId});
        }
        // 被删用户加入的群
        await this.groupUserRepository.delete({userId: did});
        await this.groupMessageRepository.delete({userId: did});
        // 被删用户好友
        await this.friendRepository.delete({userId: did});
        await this.friendRepository.delete({friendId: did});
        await this.friendMessageRepository.delete({userId: did});
        await this.friendMessageRepository.delete({friendId: did});
        await this.userRepository.delete({userId: did});
        return { msg: 'Người dùng xóa thành công'};
      }
      return {code: RCode.FAIL, msg:'Việc xóa người dùng không thành công'};
    } catch(e) {
      return {code: RCode.ERROR, msg:'Việc xóa người dùng không thành công', data: e};
    }
  }

  async getUsersByName(username: string) {
    try {
      if(username) {
        const users = await this.userRepository.find({
          where:{username: Like(`%${username}%`)}
        });
        return { data: users };
      }
      return {code: RCode.FAIL, msg:'Vui lòng nhập tên người dùng', data: null};
    } catch(e) {
      return {code: RCode.ERROR, msg:'Tìm lỗi người dùng', data: null};
    }
  }

  async setUserAvatar(user: User, file) {
    const newUser = await this.userRepository.findOne({userId: user.userId, password: user.password});
    if(newUser) {
      const random = Date.now() + '&';
      const stream = createWriteStream(join('public/avatar', random + file.originalname));
      stream.write(file.buffer);
      newUser.avatar = `api/avatar/${random}${file.originalname}`;
      newUser.password = user.password;
      await this.userRepository.save(newUser);
      return { msg: 'Sửa đổi thành công Avatar', data: newUser};
    } else {
      return {code: RCode.FAIL, msg: 'Sửa đổi lỗi Avatar'};
    }
  }
}
