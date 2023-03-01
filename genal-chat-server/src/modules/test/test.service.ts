import { Injectable } from '@nestjs/common';
import { Repository, Like, getRepository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RCode } from 'src/common/constant/rcode';
import { User } from '../user/entity/user.entity';

@Injectable()
export class TestService {
  constructor(
  ) {}
}
