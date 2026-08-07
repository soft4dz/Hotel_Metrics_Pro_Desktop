import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import {
  formatLicenseKey,
  parseLicenseKey,
  type BusinessSectorId,
  type LicenseEdition,
} from './licenses.util';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  health() {
    return { ok: true, service: 'raqmi-licenses', version: '1.0' };
  }

  async activate(input: {
    key: string;
    machineId: string;
    organizationCode?: string | null;
    holder?: string | null;
    deviceLabel?: string | null;
  }) {
    const parsed = parseLicenseKey(input.key);
    if (!parsed) {
      throw new BadRequestException('Clé de licence invalide ou signature incorrecte.');
    }

    const expiresAtDate = new Date(`${parsed.expiresAt}T23:59:59`);
    if (expiresAtDate.getTime() < Date.now()) {
      throw new BadRequestException(`Clé expirée le ${parsed.expiresAt}.`);
    }

    const orgCode = (input.organizationCode?.trim() || `ORG-${parsed.licenseKey.slice(-8)}`).toUpperCase();
    const legalName = input.holder?.trim() || orgCode;

    let organization = await this.prisma.licenseOrganization.findUnique({ where: { code: orgCode } });
    if (!organization) {
      organization = await this.prisma.licenseOrganization.create({
        data: { code: orgCode, legalName, email: null },
      });
    }

    let record = await this.prisma.licenseRecord.findUnique({ where: { licenseKey: parsed.licenseKey } });
    if (!record) {
      record = await this.prisma.licenseRecord.create({
        data: {
          licenseKey: parsed.licenseKey,
          organizationId: organization.id,
          edition: parsed.edition,
          businessSector: parsed.businessSector,
          expiresAt: expiresAtDate,
          maxActivations: 3,
          status: 'active',
        },
      });
    } else if (record.expiresAt.getTime() < expiresAtDate.getTime()) {
      record = await this.prisma.licenseRecord.update({
        where: { id: record.id },
        data: { expiresAt: expiresAtDate, status: 'active' },
      });
    }

    if (record.status === 'revoked') {
      throw new ForbiddenException('Licence révoquée côté éditeur.');
    }

    const existing = await this.prisma.licenseActivation.findUnique({
      where: { licenseId_machineId: { licenseId: record.id, machineId: input.machineId } },
    });

    if (!existing) {
      const count = await this.prisma.licenseActivation.count({
        where: { licenseId: record.id, revokedAt: null },
      });
      if (count >= record.maxActivations) {
        throw new ForbiddenException(`Nombre max d'activations atteint (${record.maxActivations}).`);
      }
      await this.prisma.licenseActivation.create({
        data: {
          licenseId: record.id,
          machineId: input.machineId,
          deviceLabel: input.deviceLabel ?? null,
        },
      });
    } else if (existing.revokedAt) {
      throw new ForbiddenException('Activation révoquée pour ce poste.');
    } else {
      await this.prisma.licenseActivation.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), deviceLabel: input.deviceLabel ?? existing.deviceLabel },
      });
    }

    return {
      ok: true,
      edition: parsed.edition,
      expiresAt: parsed.expiresAt,
      holder: legalName,
      organizationCode: organization.code,
      businessSector: (record.businessSector || parsed.businessSector) as BusinessSectorId,
      message: `Licence ${parsed.edition} activée pour ${organization.code}.`,
    };
  }

  async validate(input: { key: string; machineId: string; organizationCode?: string | null }) {
    const parsed = parseLicenseKey(input.key);
    if (!parsed) {
      return {
        ok: false,
        state: 'invalid' as const,
        edition: null,
        expiresAt: null,
        holder: null,
        organizationCode: null,
        message: 'Clé invalide.',
        businessSector: null,
      };
    }

    const record = await this.prisma.licenseRecord.findUnique({
      where: { licenseKey: parsed.licenseKey },
      include: { organization: true, activations: true },
    });

    if (!record || record.status === 'revoked') {
      return {
        ok: false,
        state: 'revoked' as const,
        edition: parsed.edition,
        expiresAt: parsed.expiresAt,
        holder: record?.organization.legalName ?? null,
        organizationCode: record?.organization.code ?? null,
        message: 'Licence révoquée.',
        businessSector: (record?.businessSector ?? parsed.businessSector) as BusinessSectorId | null,
      };
    }

    if (record.expiresAt.getTime() < Date.now()) {
      return {
        ok: false,
        state: 'expired' as const,
        edition: record.edition as LicenseEdition,
        expiresAt: parsed.expiresAt,
        holder: record.organization.legalName,
        organizationCode: record.organization.code,
        message: 'Licence expirée.',
        businessSector: record.businessSector as BusinessSectorId,
      };
    }

    const activation = record.activations.find(
      (a) => a.machineId === input.machineId && !a.revokedAt,
    );
    if (!activation) {
      return {
        ok: false,
        state: 'invalid' as const,
        edition: record.edition as LicenseEdition,
        expiresAt: parsed.expiresAt,
        holder: record.organization.legalName,
        organizationCode: record.organization.code,
        message: 'Poste non activé pour cette licence.',
        businessSector: record.businessSector as BusinessSectorId,
      };
    }

    await this.prisma.licenseActivation.update({
      where: { id: activation.id },
      data: { lastSeenAt: new Date() },
    });

    if (input.organizationCode?.trim() && record.organization.code !== input.organizationCode.trim().toUpperCase()) {
      return {
        ok: false,
        state: 'invalid' as const,
        edition: record.edition as LicenseEdition,
        expiresAt: parsed.expiresAt,
        holder: record.organization.legalName,
        organizationCode: record.organization.code,
        message: 'Code organisation incorrect.',
        businessSector: record.businessSector as BusinessSectorId,
      };
    }

    return {
      ok: true,
      state: 'active' as const,
      edition: record.edition as LicenseEdition,
      expiresAt: parsed.expiresAt,
      holder: record.organization.legalName,
      organizationCode: record.organization.code,
      businessSector: record.businessSector as BusinessSectorId,
      message: 'Licence active.',
    };
  }

  async issue(input: {
    organizationCode: string;
    legalName: string;
    edition: LicenseEdition;
    expiresAt: string;
    businessSector?: BusinessSectorId;
    maxActivations?: number;
  }) {
    const orgCode = input.organizationCode.trim().toUpperCase();
    const sector = input.businessSector ?? 'hotel';
    const key = formatLicenseKey(input.edition, input.expiresAt, sector);

    let organization = await this.prisma.licenseOrganization.findUnique({ where: { code: orgCode } });
    if (!organization) {
      organization = await this.prisma.licenseOrganization.create({
        data: { code: orgCode, legalName: input.legalName.trim() },
      });
    }

    await this.prisma.licenseRecord.upsert({
      where: { licenseKey: key },
      create: {
        licenseKey: key,
        organizationId: organization.id,
        edition: input.edition,
        businessSector: sector,
        expiresAt: new Date(`${input.expiresAt}T23:59:59`),
        maxActivations: input.maxActivations ?? 3,
        status: 'active',
      },
      update: {
        status: 'active',
        businessSector: sector,
        expiresAt: new Date(`${input.expiresAt}T23:59:59`),
        maxActivations: input.maxActivations ?? 3,
      },
    });

    return {
      licenseKey: key,
      organizationCode: orgCode,
      edition: input.edition,
      expiresAt: input.expiresAt,
      businessSector: sector,
      maxActivations: input.maxActivations ?? 3,
    };
  }

  async listOrganizations() {
    const rows = await this.prisma.licenseOrganization.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { licenses: true } },
      },
    });
    return rows.map((org) => ({
      id: org.id,
      code: org.code,
      legalName: org.legalName,
      active: org.active,
      licenseCount: org._count.licenses,
      createdAt: org.createdAt,
    }));
  }

  async listLicenses(filters?: { organizationCode?: string; status?: string }) {
    const orgCode = filters?.organizationCode?.trim().toUpperCase();
    const rows = await this.prisma.licenseRecord.findMany({
      where: {
        ...(filters?.status ? { status: filters.status } : {}),
        ...(orgCode ? { organization: { code: orgCode } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: true,
        activations: { where: { revokedAt: null } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      licenseKey: r.licenseKey,
      organizationCode: r.organization.code,
      legalName: r.organization.legalName,
      edition: r.edition,
      businessSector: r.businessSector,
      expiresAt: r.expiresAt.toISOString().slice(0, 10),
      maxActivations: r.maxActivations,
      activeActivations: r.activations.length,
      status: r.status,
      createdAt: r.createdAt,
      activations: r.activations.map((a) => ({
        id: a.id,
        machineId: a.machineId,
        deviceLabel: a.deviceLabel,
        activatedAt: a.activatedAt,
        lastSeenAt: a.lastSeenAt,
      })),
    }));
  }

  async revoke(input: {
    licenseKey?: string;
    activationId?: number;
    revokeAllActivations?: boolean;
  }) {
    if (input.activationId) {
      await this.prisma.licenseActivation.update({
        where: { id: input.activationId },
        data: { revokedAt: new Date() },
      });
      return { ok: true, message: 'Activation poste révoquée.' };
    }

    const key = input.licenseKey?.trim().toUpperCase();
    if (!key) {
      throw new BadRequestException('licenseKey ou activationId requis.');
    }

    const record = await this.prisma.licenseRecord.findUnique({
      where: { licenseKey: key },
      include: { activations: true },
    });
    if (!record) {
      throw new BadRequestException('Licence introuvable.');
    }

    if (input.revokeAllActivations) {
      await this.prisma.licenseActivation.updateMany({
        where: { licenseId: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.prisma.licenseRecord.update({
      where: { id: record.id },
      data: { status: 'revoked' },
    });

    return { ok: true, message: 'Licence révoquée côté éditeur.' };
  }
}
