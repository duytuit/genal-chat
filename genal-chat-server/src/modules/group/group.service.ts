import { Injectable } from '@nestjs/common';
import { Repository, Like, getRepository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Group, GroupMap } from './entity/group.entity';
import { GroupMessage } from './entity/groupMessage.entity';
import { RCode } from 'src/common/constant/rcode';
import { User } from '../user/entity/user.entity';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(GroupMap)
    private readonly groupUserRepository: Repository<GroupMap>,
    @InjectRepository(GroupMessage)
    private readonly groupMessageRepository: Repository<GroupMessage>,
  ) {}

  async postGroups(groupIds: string) {
    try {
      if(groupIds) {
        const groupIdArr = groupIds.split(',');
        const groupArr = [];
        for(const groupId of groupIdArr) {
          const data = await this.groupRepository.findOne({groupId: groupId});
          groupArr.push(data);
        }
        return { msg:'Nhận thông tin nhóm thành công', data: groupArr};
      }
      return {code: RCode.FAIL, msg:'Có được thông tin nhóm không thành công', data: null};
    } catch (e) {
      return {code: RCode.ERROR, msg:'Có được thất bại nhóm',data: e};
    }
  }

  async getUserGroups(userId: string) {
    try {
      let data;
      if(userId) {
        data = await this.groupUserRepository.find({userId: userId});
        return { msg:'Nhận được thành công của tất cả các nhóm người dùng', data};
      }
      data = await this.groupUserRepository.find();
      return { msg:'Nhận tất cả thành công của nhóm trong hệ thống', data};
    } catch (e) {
      return {code: RCode.ERROR, msg:'Nhóm không thể có được người dùng',data: e};
    }
  }

  async getGroupUsers(groupId: string) {
    try {
      let data;
      if(groupId) {
        data = await this.groupUserRepository.find({groupId: groupId});
        return { msg:'Có được tất cả những người dùng thành công của nhóm', data};
      }
    } catch (e) {
      return {code: RCode.ERROR, msg:'Người dùng có được nhóm không thành công',data: e};
    }
  }

  async getGroupMessages(groupId: string, current: number, pageSize: number) {
    let groupMessage = await getRepository(GroupMessage)
    .createQueryBuilder("groupMessage")
    .orderBy("groupMessage.time", "DESC")
    .where("groupMessage.groupId = :id", { id: groupId })
    .skip(current)
    .take(pageSize)
    .getMany();
    groupMessage = groupMessage.reverse();

    const userGather: {[key: string]: User} = {};
    let userArr: FriendDto[] = [];
    for(const message of groupMessage) {
      if(!userGather[message.userId]) {
        userGather[message.userId] = await getRepository(User)
        .createQueryBuilder("user")
        .where("user.userId = :id", { id: message.userId })
        .getOne();
      }
    }
    userArr = Object.values(userGather);
    return {msg: '', data: { messageArr: groupMessage, userArr: userArr }};
  }

  async getGroupsByName(groupName: string) {
    try {
      if(groupName) {
        const groups = await this.groupRepository.find({groupName: Like(`%${groupName}%`)});
        return { data: groups};
      }
      return {code: RCode.FAIL, msg:'Vui lòng nhập biệt danh nhóm', data: null};
    } catch(e) {
      return {code: RCode.ERROR, msg:'Tìm lỗi nhóm', data: null};
    }
  }
}
