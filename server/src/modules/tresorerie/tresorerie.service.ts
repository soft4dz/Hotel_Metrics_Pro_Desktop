import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsOptional, IsInt, IsNumber, Min } from 'class-validator';
import { PrismaService } from '../../prisma.service';

export class CreateEncaissementDto {
  @IsInt() hotelId: number;
  @IsString() dateEncaissement: string;
  @IsNumber() @Min(0.01) montant: number;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() compteBancaireId?: number;
}

export class CreateCompteDto {
  @IsInt() hotelId: number;
  @IsString() intitule: string;
  @IsOptional() @IsString() banque?: string;
  @IsOptional() @IsString() numeroCompte?: string;
  @IsOptional() @IsNumber() soldeInitial?: number;
}

export class CreateJournalDto {
  @IsInt() hotelId: number;
  @IsString() dateOperation: string;
  @IsString() libelle: string;
  @IsOptional() @IsNumber() entree?: number;
  @IsOptional() @IsNumber() sortie?: number;
}

@Injectable()
export class TresorerieService {
  constructor(private prisma: PrismaService) {}

  // ── Encaissements ──────────────────────────────────────────────────────────

  findEncaissements(hotelId?: number, statut?: string) {
    return this.prisma.encaissement.findMany({
      where: {
        deletedAt: null,
        ...(hotelId ? { hotelId } : {}),
        ...(statut ? { statut } : {}),
      },
      include: { compteBancaire: true },
      orderBy: { dateEncaissement: 'desc' },
    });
  }

  async createEncaissement(dto: CreateEncaissementDto, userId: number) {
    return this.prisma.encaissement.create({
      data: { ...dto, mode: dto.mode ?? 'especes', createdBy: userId },
      include: { compteBancaire: true },
    });
  }

  async updateStatutEncaissement(id: number, statut: string) {
    const enc = await this.prisma.encaissement.findFirst({ where: { id, deletedAt: null } });
    if (!enc) throw new NotFoundException('Encaissement introuvable');
    return this.prisma.encaissement.update({ where: { id }, data: { statut } });
  }

  // ── Comptes bancaires ──────────────────────────────────────────────────────

  findComptes(hotelId?: number) {
    return this.prisma.compteBancaire.findMany({
      where: { ...(hotelId ? { hotelId } : {}), actif: true },
      orderBy: { intitule: 'asc' },
    });
  }

  createCompte(dto: CreateCompteDto) {
    return this.prisma.compteBancaire.create({ data: { ...dto, banque: dto.banque ?? '' } });
  }

  // ── Journal de caisse ──────────────────────────────────────────────────────

  findJournal(hotelId?: number, dateDebut?: string, dateFin?: string) {
    return this.prisma.journalCaisse.findMany({
      where: {
        deletedAt: null,
        ...(hotelId ? { hotelId } : {}),
        ...(dateDebut ? { dateOperation: { gte: dateDebut } } : {}),
        ...(dateFin ? { dateOperation: { lte: dateFin } } : {}),
      },
      orderBy: { dateOperation: 'desc' },
    });
  }

  createJournalEntry(dto: CreateJournalDto, userId: number) {
    return this.prisma.journalCaisse.create({
      data: { ...dto, entree: dto.entree ?? 0, sortie: dto.sortie ?? 0, createdBy: userId },
    });
  }
}
