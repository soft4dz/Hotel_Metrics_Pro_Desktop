import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { PrismaService } from '../../prisma.service';
import { LicenseAdminGuard, LicensePublicRateLimitGuard } from './licenses.guards';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, PrismaService, LicenseAdminGuard, LicensePublicRateLimitGuard],
  exports: [LicensesService],
})
export class LicensesModule {}
