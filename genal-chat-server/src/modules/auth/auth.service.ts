import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { GroupMap } from '../group/entity/group.entity'; 
import { nameVerify, passwordVerify } from 'src/common/tool/utils';
import { RCode } from 'src/common/constant/rcode';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GroupMap)
    private readonly groupUserRepository: Repository<GroupMap>,
    private readonly jwtService: JwtService,
  ) {}

  async login(data: User): Promise<any> {
    const user = await this.userRepository.findOne({username:data.username, password: data.password});
    if(!user) {
      return {code: 1 , msg:'sai mật khẩu', data: ''};
    }
    if(!passwordVerify(data.password) || !nameVerify(data.username)) {
      return {code: RCode.FAIL, msg:'Không thông qua xác minh đăng ký!', data: '' };
    }
    user.password = data.password;
    const payload = {userId: user.userId, password: data.password};
    const token =  this.jwtService.sign(payload);
    console.log(token);
    
    return {
      msg:'đăng nhập thành công',
      data: {
        user: user,
        token: token
      },
    };
  }

  async register(user: User): Promise<any> {
    const isHave = await this.userRepository.find({username: user.username});
    if(isHave.length) {
      return {code: RCode.FAIL, msg:'Tên người dùng trùng lặp', data: '' };
    }
    if(!passwordVerify(user.password) || !nameVerify(user.username)) {
      return {code: RCode.FAIL, msg:'Không thông qua xác minh đăng ký!', data: '' };
    }
    user.avatar = `api/avatar/avatar(${Math.round(Math.random()*19 +1)}).png`;
    user.role = 'user';
    const newUser = await this.userRepository.save(user);
    const payload = {userId: newUser.userId, password: newUser.password};
    await this.groupUserRepository.save({
      userId: newUser.userId,
      groupId: 'phong_chat',
    });
    return {
      msg:'Đăng ký thành công',
      data: { 
        user: newUser,
        token: this.jwtService.sign(payload)
      },
    };
  }
}
