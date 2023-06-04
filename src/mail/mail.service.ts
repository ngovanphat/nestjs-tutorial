import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendUserEmailConfirmation(user: User, token: string) {
    const url = `localhost:3000/auth/verify-email?token=${token}`;
    const userName = user.email.split('@');
    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Welcome to our app! Please confirm your email',
      template: './email_confirmation',
      context: {
        name: `${userName[0]}`,
        url,
      },
    });
  }
}
