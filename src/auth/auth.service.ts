import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}
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

    // if the user did not verify email then throw exception
    if (!user.isEmailVerified) {
      throw new ForbiddenException('Need to verify email');
    }
    // compare the password
    const isMatchPassword = await argon.verify(user.hash, dto.password);
    // if the password is incorrect then throw the exception
    if (!isMatchPassword) {
      throw new ForbiddenException('Credentials incorrect');
    }
    return this.signToken(user.id, user.email);
  }

  async signToken(
    userId: number,
    email: string,
  ): Promise<{ accessToken: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');
    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '60m',
      secret: secret,
    });
    return {
      accessToken,
    };
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
      // create email verification token and save to DB, then send the token to user
      const token = Math.floor(100000 + Math.random() * 900000).toString();

      await Promise.all([
        this.prisma.user.update({
          data: {
            emailVerificationToken: token,
          },
          where: {
            id: user.id,
          },
        }),
        this.mailService.sendUserEmailConfirmation(user, token),
      ]);

      return {
        message: 'User created successfully!',
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  async verifyEmail(token: string) {
    //get user base on token
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
      },
    });
    // check if token is used then return error
    if (!user) {
      throw new ForbiddenException('Invalid Token!');
    }
    //update the isVerifiedEmail for user and remove token
    const isUpdated = await this.prisma.user.update({
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
      },
      where: { id: user.id },
    });
    // check if update is successful
    if (!isUpdated) {
      throw new ForbiddenException('Can not verify email!');
    }
    //return result message successful

    return {
      message: 'Email is verified!',
    };
  }
}
