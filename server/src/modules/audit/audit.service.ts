import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  findAll(module?: string, userId?: number, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(module ? { module } : {}),
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 500),
    });
  }
}
