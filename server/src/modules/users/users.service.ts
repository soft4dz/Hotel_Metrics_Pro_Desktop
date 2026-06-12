import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IsEmail, IsString, IsOptional, IsInt, IsArray } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma.service';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() password: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsInt() roleId: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) hotelIds?: number[];
}

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsInt() roleId?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) hotelIds?: number[];
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true, uuid: true, email: true, firstName: true, lastName: true,
        isActive: true, lastLoginAt: true, createdAt: true,
        role: { select: { id: true, code: true, label: true } },
        userHotels: { select: { hotelId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true, userHotels: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async create(dto: CreateUserDto) {
    const hash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        mustChangePassword: true,
        userHotels: dto.hotelIds?.length
          ? { create: dto.hotelIds.map((id) => ({ hotelId: id })) }
          : undefined,
      },
      include: { role: true },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.hotelIds !== undefined) {
      await this.prisma.userHotel.deleteMany({ where: { userId: id } });
      if (dto.hotelIds.length) {
        await this.prisma.userHotel.createMany({
          data: dto.hotelIds.map((hid) => ({ userId: id, hotelId: hid })),
        });
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
      },
      include: { role: true },
    });
  }

  async remove(id: number, requesterId: number) {
    if (id === requesterId) throw new ForbiddenException('Impossible de supprimer son propre compte');
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
