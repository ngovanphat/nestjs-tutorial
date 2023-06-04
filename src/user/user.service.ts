import { Injectable } from '@nestjs/common';
import { EditUserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async editUser(userId: number, editUserDto: EditUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...editUserDto,
      },
      select: {
        id: true,
        email: true,
        lastName: true,
        firstName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }
}
