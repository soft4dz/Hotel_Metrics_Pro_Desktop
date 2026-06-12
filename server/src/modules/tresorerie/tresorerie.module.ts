import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TresorerieController } from './tresorerie.controller';
import { TresorerieService } from './tresorerie.service';

@Module({
  controllers: [TresorerieController],
  providers: [TresorerieService, PrismaService],
  exports: [TresorerieService],
})
export class TresorerieModule {}
