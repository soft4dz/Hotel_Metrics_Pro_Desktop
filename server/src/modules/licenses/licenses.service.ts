import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma.service';
import {
  assertFutureExpiry,
  issueLicenseKey,
  parseLicenseKey,
  type BusinessSectorId,
  type LicenseEdition,
} from './licenses.util';

interface AuditActor {
  id?: number;
  email?: string;
}

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, service: 'raqmi-licenses', version: '2.0', database: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Base de licences indisponible.');
    }
  }

  private async audit(
    action: string,
    entityId: string | null,
    actor: AuditActor | null,
    details: Record<string, unknown>,
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const hash = createHash('sha256')
      .update(JSON.stringify({ actorId: actor?.id ?? null, action, entityId, timestamp, details }))
      .digest('hex');
    await this.prisma.auditLog.create({
      data: {
        userId: actor?.id ?? null,
        userEmail: actor?.email ?? null,
        module: 'licenses',
        action,
        entityId,
        newValue: details as Prisma.InputJsonValue,
        hash,
      },
    });
  }

  async activate(input: {
    key: string;
    machineId: string;
    organizationCode?: string | null;
    holder?: string | null;
    deviceLabel?: string | null;
  }) {
    const parsed = parseLicenseKey(input.key);
    if (!parsed) throw new BadRequestException('Clé V2 invalide ou signature incorrecte.');
    if (parsed.mode !== 'remote') {
      throw new BadRequestException('Une licence offline doit être activée localement sur le poste prévu.');
    }
    if (new Date(`${parsed.expiresAt}T23:59:59.999Z`).getTime() < Date.now()) {
      throw new BadRequestException(`Clé expirée le ${parsed.expiresAt}.`);
    }

    const requestedOrg = input.organizationCode?.trim().toUpperCase();
    if (requestedOrg && requestedOrg !== parsed.organizationCode) {
      throw new ForbiddenException('Cette clé appartient à une autre organisation.');
    }

    const record = await this.prisma.licenseRecord.findUnique({
      where: { publicId: parsed.licenseId },
      include: { organization: true },
    });
    if (!record || record.licenseKey !== parsed.licenseKey) {
      throw new ForbiddenException('Licence non émise ou inconnue du registre Raqmi.');
    }
    if (!record.organization.active) throw new ForbiddenException('Organisation suspendue.');
    if (record.organization.code !== parsed.organizationCode) {
      throw new ForbiddenException('Organisation de licence incohérente.');
    }
    if (record.status !== 'active') throw new ForbiddenException('Licence révoquée côté éditeur.');
    if (
      record.edition !== parsed.edition ||
      record.businessSector !== parsed.businessSector ||
      record.expiresAt.toISOString().slice(0, 10) !== parsed.expiresAt ||
      record.maxActivations !== parsed.maxActivations
    ) {
      throw new ForbiddenException('Données de licence incohérentes avec le registre central.');
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.licenseActivation.findUnique({
        where: { licenseId_machineId: { licenseId: record.id, machineId: input.machineId } },
      });
      if (existing?.revokedAt) throw new ForbiddenException('Activation révoquée pour ce poste.');
      if (existing) {
        await tx.licenseActivation.update({
          where: { id: existing.id },
          data: { lastSeenAt: new Date(), deviceLabel: input.deviceLabel ?? existing.deviceLabel },
        });
        return;
      }
      const count = await tx.licenseActivation.count({
        where: { licenseId: record.id, revokedAt: null },
      });
      if (count >= record.maxActivations) {
        throw new ForbiddenException(`Nombre maximal d'activations atteint (${record.maxActivations}).`);
      }
      await tx.licenseActivation.create({
        data: {
          licenseId: record.id,
          machineId: input.machineId,
          deviceLabel: input.deviceLabel ?? null,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    await this.audit('activate', record.publicId, null, {
      organizationCode: record.organization.code,
      machineId: input.machineId,
    });

    return {
      ok: true,
      licenseId: record.publicId,
      edition: record.edition as LicenseEdition,
      expiresAt: parsed.expiresAt,
      holder: record.organization.legalName,
      organizationCode: record.organization.code,
      businessSector: record.businessSector as BusinessSectorId,
      message: `Licence ${record.edition} activée pour ${record.organization.code}.`,
    };
  }

  async validate(input: { key: string; machineId: string; organizationCode?: string | null }) {
    const parsed = parseLicenseKey(input.key);
    if (!parsed || parsed.mode !== 'remote') return this.invalidResponse('Clé invalide.');

    const record = await this.prisma.licenseRecord.findUnique({
      where: { publicId: parsed.licenseId },
      include: { organization: true, activations: true },
    });
    if (!record || record.licenseKey !== parsed.licenseKey) {
      return this.invalidResponse('Licence inconnue du registre central.', parsed.licenseId);
    }
    if (
      record.organization.code !== parsed.organizationCode ||
      record.edition !== parsed.edition ||
      record.businessSector !== parsed.businessSector ||
      record.expiresAt.toISOString().slice(0, 10) !== parsed.expiresAt ||
      record.maxActivations !== parsed.maxActivations
    ) {
      return this.invalidResponse('Licence incohérente avec le registre central.', parsed.licenseId);
    }
    const base = {
      licenseId: record.publicId,
      edition: record.edition as LicenseEdition,
      expiresAt: record.expiresAt.toISOString().slice(0, 10),
      holder: record.organization.legalName,
      organizationCode: record.organization.code,
      businessSector: record.businessSector as BusinessSectorId,
    };
    if (!record.organization.active || record.status !== 'active') {
      return { ok: false, state: 'revoked' as const, ...base, message: 'Licence ou organisation révoquée.' };
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return { ok: false, state: 'expired' as const, ...base, message: 'Licence expirée.' };
    }
    if (
      input.organizationCode?.trim() &&
      record.organization.code !== input.organizationCode.trim().toUpperCase()
    ) {
      return { ok: false, state: 'invalid' as const, ...base, message: 'Code organisation incorrect.' };
    }
    const activation = record.activations.find(
      (item) => item.machineId === input.machineId && !item.revokedAt,
    );
    if (!activation) {
      return { ok: false, state: 'invalid' as const, ...base, message: 'Poste non activé pour cette licence.' };
    }
    await this.prisma.licenseActivation.update({
      where: { id: activation.id },
      data: { lastSeenAt: new Date() },
    });
    return { ok: true, state: 'active' as const, ...base, message: 'Licence active.' };
  }

  private invalidResponse(message: string, licenseId: string | null = null) {
    return {
      ok: false,
      state: 'invalid' as const,
      licenseId,
      edition: null,
      expiresAt: null,
      holder: null,
      organizationCode: null,
      businessSector: null,
      message,
    };
  }

  async issue(input: {
    organizationCode: string;
    legalName: string;
    edition: LicenseEdition;
    expiresAt: string;
    businessSector?: BusinessSectorId;
    maxActivations?: number;
  }, actor: AuditActor) {
    try {
      assertFutureExpiry(input.expiresAt);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Expiration invalide.');
    }
    const orgCode = input.organizationCode.trim().toUpperCase();
    const sector = input.businessSector ?? 'hotel';
    const maxActivations = input.maxActivations ?? 3;

    const organization = await this.prisma.licenseOrganization.upsert({
      where: { code: orgCode },
      create: { code: orgCode, legalName: input.legalName.trim() },
      update: { legalName: input.legalName.trim() },
    });
    if (!organization.active) throw new ForbiddenException('Organisation suspendue.');

    let issued;
    try {
      issued = issueLicenseKey({
        organizationCode: orgCode,
        edition: input.edition,
        expiresAt: input.expiresAt,
        businessSector: sector,
        maxActivations,
        mode: 'remote',
      });
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Clé privée de licence indisponible.',
      );
    }

    const record = await this.prisma.licenseRecord.create({
      data: {
        publicId: issued.payload.licenseId,
        licenseKey: issued.licenseKey,
        organizationId: organization.id,
        edition: input.edition,
        businessSector: sector,
        expiresAt: new Date(`${input.expiresAt}T23:59:59.999Z`),
        maxActivations,
        status: 'active',
      },
    });
    await this.audit('issue', record.publicId, actor, {
      organizationCode: orgCode,
      edition: input.edition,
      businessSector: sector,
      expiresAt: input.expiresAt,
      maxActivations,
    });

    return {
      licenseId: record.publicId,
      licenseKey: issued.licenseKey,
      organizationCode: orgCode,
      edition: input.edition,
      expiresAt: input.expiresAt,
      businessSector: sector,
      maxActivations,
    };
  }

  async listOrganizations() {
    const rows = await this.prisma.licenseOrganization.findMany({
      orderBy: { code: 'asc' },
      include: { _count: { select: { licenses: true } } },
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
    const status = filters?.status?.trim().toLowerCase();
    if (status && status !== 'active' && status !== 'revoked') {
      throw new BadRequestException('Filtre de statut invalide.');
    }
    const rows = await this.prisma.licenseRecord.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(orgCode ? { organization: { code: orgCode } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        organization: true,
        activations: { where: { revokedAt: null } },
      },
    });
    return rows.map((record) => ({
      id: record.id,
      licenseId: record.publicId,
      licenseKey: record.licenseKey,
      organizationCode: record.organization.code,
      legalName: record.organization.legalName,
      edition: record.edition,
      businessSector: record.businessSector,
      expiresAt: record.expiresAt.toISOString().slice(0, 10),
      maxActivations: record.maxActivations,
      activeActivations: record.activations.length,
      status: record.status,
      createdAt: record.createdAt,
      activations: record.activations.map((activation) => ({
        id: activation.id,
        machineId: activation.machineId,
        deviceLabel: activation.deviceLabel,
        activatedAt: activation.activatedAt,
        lastSeenAt: activation.lastSeenAt,
      })),
    }));
  }

  async revoke(input: {
    licenseKey?: string;
    activationId?: number;
    revokeAllActivations?: boolean;
  }, actor: AuditActor) {
    if (input.activationId) {
      const activation = await this.prisma.licenseActivation.findUnique({
        where: { id: input.activationId },
        include: { license: true },
      });
      if (!activation) throw new BadRequestException('Activation introuvable.');
      await this.prisma.licenseActivation.update({
        where: { id: activation.id },
        data: { revokedAt: new Date() },
      });
      await this.audit('revoke-activation', activation.license.publicId, actor, {
        activationId: activation.id,
        machineId: activation.machineId,
      });
      return { ok: true, message: 'Activation poste révoquée.' };
    }

    const key = input.licenseKey?.trim();
    if (!key) throw new BadRequestException('licenseKey ou activationId requis.');
    const record = await this.prisma.licenseRecord.findUnique({
      where: { licenseKey: key },
      include: { activations: true },
    });
    if (!record) throw new BadRequestException('Licence introuvable.');

    await this.prisma.$transaction(async (tx) => {
      if (input.revokeAllActivations) {
        await tx.licenseActivation.updateMany({
          where: { licenseId: record.id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await tx.licenseRecord.update({
        where: { id: record.id },
        data: { status: 'revoked' },
      });
    });
    await this.audit('revoke-license', record.publicId, actor, {
      revokeAllActivations: Boolean(input.revokeAllActivations),
    });
    return { ok: true, message: 'Licence révoquée côté éditeur.' };
  }
}
