import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.code,
      hotels: await this.getUserHotelIds(user.id),
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.code,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false },
    });
  }

  private async getUserHotelIds(userId: number): Promise<number[]> {
    const links = await this.prisma.userHotel.findMany({ where: { userId } });
    return links.map((l) => l.hotelId);
  }
}
