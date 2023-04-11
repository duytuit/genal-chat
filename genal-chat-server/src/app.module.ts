import { Module } from '@nestjs/common';
import {TypeOrmModule, TypeOrmModuleOptions} from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { ChatModule } from './modules/chat/chat.module';
import { FriendModule } from './modules/friend/friend.module';
import { GroupModule } from './modules/group/group.module';
import { AuthModule } from './modules/auth/auth.module';
import { TestModule } from './modules/test/test.module';

 const _opntion_dev:TypeOrmModuleOptions = {
  type: 'mysql',
  port: 3306,
  username: 'root',
  password: 'Duytuit89!',
  database: 'chat_socket',
  charset: "utf8mb4", // 设置chatset编码为utf8mb4
  autoLoadEntities: true,
  synchronize: true
};

const _opntion_pro:TypeOrmModuleOptions = {
  type: 'mysql',
  port: 3306,
  username: 'root',
  password: 'Hoilamgi@134!',
  database: 'chat_socket_pro',
  charset: "utf8mb4", // 设置chatset编码为utf8mb4
  autoLoadEntities: true,
  synchronize: true
};

@Module({
  imports: [
    TypeOrmModule.forRoot({
        type: 'mysql',
        port: 3306,
        username: 'root',
        password: 'Hoilamgi@134!',
        database: 'chat_socket_pro',
        charset: "utf8mb4", // 设置chatset编码为utf8mb4
        autoLoadEntities: true,
        synchronize: true
    }),
    UserModule,
    ChatModule,
    FriendModule,
    GroupModule,
    AuthModule,
    TestModule
  ],
})
export class AppModule {}
