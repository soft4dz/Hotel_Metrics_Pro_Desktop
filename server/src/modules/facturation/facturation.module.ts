import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { FacturationController } from './facturation.controller';
import { FacturationService } from './facturation.service';

@Module({
  controllers: [FacturationController],
  providers: [FacturationService, PrismaService],
  exports: [FacturationService],
})
export class FacturationModule {}
