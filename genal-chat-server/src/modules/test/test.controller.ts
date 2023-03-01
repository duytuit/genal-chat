import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Controller('test')
export class TestController {
  constructor(private readonly userService: UserService) {}
  
  @Get('/postUserBot')
  postUserBot() {
    return this.userService.postUserBot({
      "userId":"6f0d1003-88f2-4394-886a-f6738edcfe07",
      "username":"BOT",
      "avatar":"api/avatar/avatar(20).png"
    });
  }
}
