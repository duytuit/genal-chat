import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entity/user.entity';
import { Group, GroupMap } from '../group/entity/group.entity';
import { GroupMessage } from '../group/entity/groupMessage.entity';
import { UserMap } from '../friend/entity/friend.entity';
import { FriendMessage } from '../friend/entity/friendMessage.entity';
import { Test } from './entity/test.entity';
import { UserService } from '../user/user.service';
import { TestController } from './test.controller';
import { TestService } from './test.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Test,User, Group, GroupMap, GroupMessage, UserMap, FriendMessage])
  ],
  providers: [TestService,UserService],
  controllers: [TestController],
})
export class TestModule {}
