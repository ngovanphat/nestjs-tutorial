import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  async login(dto: AuthDto) {
    // find the user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
      },
    });
    // if the user don't exist throw exception
    if (!user) {
      throw new ForbiddenException('Credentials incorrect');
    }
    // compare the password
    const isMatchPassword = await argon.verify(user.hash, dto.password);
    // if the password is incorrect then throw the exception
    if (!isMatchPassword) {
      throw new ForbiddenException('Credentials incorrect');
    }
    // send back the user
    delete user.hash;
    return user;
  }

  async signup(dto: AuthDto) {
    // generate the password first
    const hash = await argon.hash(dto.password);
    // save the new user to the db
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          hash,
        },
      });

      delete user.hash;
      // return the saved user
      return user;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }
}
