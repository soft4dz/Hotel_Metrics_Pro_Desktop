import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { IsString, IsOptional, IsInt, IsNumber, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '../../prisma.service';

class LigneDto {
  @IsString() designation: string;
  @IsNumber() @Min(0) quantite: number;
  @IsNumber() @Min(0) prixUnitaire: number;
  @IsOptional() @IsNumber() tauxTva?: number;
  @IsOptional() @IsInt() ordre?: number;
}

export class CreateFactureDto {
  @IsInt() hotelId: number;
  @IsOptional() @IsInt() clientId?: number;
  @IsOptional() @IsString() clientNom?: string;
  @IsString() dateEmission: string;
  @IsOptional() @IsString() dateEcheance?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LigneDto) lignes: LigneDto[];
}

export class AddPaiementDto {
  @IsString() datePaiement: string;
  @IsNumber() @Min(0.01) montant: number;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class FacturationService {
  constructor(private prisma: PrismaService) {}

  findAll(hotelId?: number, statut?: string) {
    return this.prisma.facture.findMany({
      where: {
        deletedAt: null,
        ...(hotelId ? { hotelId } : {}),
        ...(statut ? { statut } : {}),
      },
      include: { lignes: true, paiements: { where: { deletedAt: null } }, client: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const f = await this.prisma.facture.findFirst({
      where: { id, deletedAt: null },
      include: { lignes: { orderBy: { ordre: 'asc' } }, paiements: { where: { deletedAt: null } }, client: true },
    });
    if (!f) throw new NotFoundException('Facture introuvable');
    return f;
  }

  async create(dto: CreateFactureDto, userId: number) {
    const numero = await this.generateNumero(dto.hotelId);
    const { lignes, ...factureData } = dto;
    const totaux = this.calcTotaux(lignes);

    return this.prisma.facture.create({
      data: {
        ...factureData,
        clientNom: dto.clientNom ?? '',
        numero,
        createdBy: userId,
        ...totaux,
        lignes: {
          create: lignes.map((l, i) => ({
            ...l,
            tauxTva: l.tauxTva ?? 19,
            ordre: l.ordre ?? i,
            montantHt: l.quantite * l.prixUnitaire,
            montantTva: l.quantite * l.prixUnitaire * ((l.tauxTva ?? 19) / 100),
            montantTtc: l.quantite * l.prixUnitaire * (1 + (l.tauxTva ?? 19) / 100),
          })),
        },
      },
      include: { lignes: true, client: true },
    });
  }

  async addPaiement(factureId: number, dto: AddPaiementDto, userId: number) {
    const facture = await this.findOne(factureId);
    if (facture.statut === 'annulee') throw new BadRequestException('Facture annulée');

    const paiement = await this.prisma.paiementFacture.create({
      data: { factureId, ...dto, mode: dto.mode ?? 'especes', createdBy: userId },
    });

    const totalPaye = await this.prisma.paiementFacture.aggregate({
      where: { factureId, deletedAt: null },
      _sum: { montant: true },
    });

    const montantPaye = totalPaye._sum.montant ?? 0;
    const newStatut = montantPaye >= facture.montantTtc ? 'payee'
      : montantPaye > 0 ? 'partiellement_payee'
      : facture.statut;

    await this.prisma.facture.update({
      where: { id: factureId },
      data: { montantPaye, statut: newStatut },
    });

    return paiement;
  }

  async updateStatut(id: number, statut: string) {
    await this.findOne(id);
    return this.prisma.facture.update({ where: { id }, data: { statut } });
  }

  private calcTotaux(lignes: LigneDto[]) {
    let montantHt = 0, montantTva = 0;
    for (const l of lignes) {
      const ht = l.quantite * l.prixUnitaire;
      const tva = ht * ((l.tauxTva ?? 19) / 100);
      montantHt += ht;
      montantTva += tva;
    }
    return { montantHt, montantTva, montantTtc: montantHt + montantTva };
  }

  private async generateNumero(hotelId: number): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.facture.count({
      where: { hotelId, numero: { startsWith: `FAC-${year}-` } },
    });
    return `FAC-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
