import { Module } from '@nestjs/common';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, PrismaService],
  exports: [LicensesService],
})
export class LicensesModule {}
