import { Injectable, NotFoundException } from '@nestjs/common';
import {
  IsString, IsOptional, IsEmail, IsBoolean, IsArray, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma.service';

class ContactDto {
  @IsString() nom: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() titre?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() principal?: boolean;
  @IsOptional() @IsString() notes?: string;
}

export class CreateClientDto {
  @IsOptional() @IsString() type?: string;
  @IsString() nom: string;
  @IsOptional() @IsString() prenom?: string;
  @IsOptional() @IsString() raisonSociale?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telephone?: string;
  @IsOptional() @IsString() mobile?: string;
  @IsOptional() @IsString() ville?: string;
  @IsOptional() @IsString() wilaya?: string;
  @IsOptional() @IsString() nif?: string;
  @IsOptional() @IsString() rc?: string;
  @IsOptional() @IsBoolean() assujettITva?: boolean;
  @IsOptional() @IsString() notesInternes?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactDto) contacts?: ContactDto[];
}

export class UpdateClientDto extends CreateClientDto {}

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  findAll(search?: string) {
    return this.prisma.client.findMany({
      where: {
        deletedAt: null,
        ...(search ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' } },
            { raisonSociale: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { contacts: true },
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: { contacts: true },
    });
    if (!client) throw new NotFoundException('Client introuvable');
    return client;
  }

  async create(dto: CreateClientDto) {
    const { contacts, ...data } = dto;
    return this.prisma.client.create({
      data: {
        ...data,
        contacts: contacts?.length
          ? { create: contacts }
          : undefined,
      },
      include: { contacts: true },
    });
  }

  async update(id: number, dto: UpdateClientDto) {
    await this.findOne(id);
    const { contacts, ...data } = dto;

    if (contacts !== undefined) {
      await this.prisma.clientContact.deleteMany({ where: { clientId: id } });
      if (contacts.length) {
        await this.prisma.clientContact.createMany({
          data: contacts.map((c) => ({ ...c, clientId: id })),
        });
      }
    }

    return this.prisma.client.update({
      where: { id },
      data,
      include: { contacts: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.client.update({ where: { id }, data: { deletedAt: new Date(), actif: false } });
  }
}
