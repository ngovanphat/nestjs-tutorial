import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule, JwtModule],
  controllers: [UserController],
  providers: [AuthService, MailService, UserService],
})
export class UserModule {}
