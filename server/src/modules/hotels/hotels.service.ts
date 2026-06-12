import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class HotelsService {
  constructor(private prisma: PrismaService) {}

  findAll(user: any) {
    const where = this.buildWhere(user);
    return this.prisma.hotel.findMany({ where, orderBy: { name: 'asc' } });
  }

  async findOne(id: number, user: any) {
    const where = { id, ...this.buildWhere(user) };
    const hotel = await this.prisma.hotel.findFirst({ where });
    if (!hotel) throw new NotFoundException('Hôtel introuvable');
    return hotel;
  }

  private buildWhere(user: any) {
    if (user.role === 'GLOBAL_ADMIN' || user.role === 'ADMIN') return { deletedAt: null };
    return { id: { in: user.hotels as number[] }, deletedAt: null };
  }
}
