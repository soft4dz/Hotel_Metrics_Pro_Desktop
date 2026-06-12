import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
