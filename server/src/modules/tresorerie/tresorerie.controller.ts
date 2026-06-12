import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  TresorerieService,
  CreateEncaissementDto,
  CreateCompteDto,
  CreateJournalDto,
} from './tresorerie.service';

@ApiTags('tresorerie')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tresorerie')
export class TresorerieController {
  constructor(private service: TresorerieService) {}

  @Get('encaissements')
  findEncaissements(@Query('hotelId') hotelId?: string, @Query('statut') statut?: string) {
    return this.service.findEncaissements(hotelId ? +hotelId : undefined, statut);
  }

  @Post('encaissements')
  createEncaissement(@Body() dto: CreateEncaissementDto, @CurrentUser() user: any) {
    return this.service.createEncaissement(dto, user.id);
  }

  @Patch('encaissements/:id/statut')
  updateStatut(@Param('id', ParseIntPipe) id: number, @Body('statut') statut: string) {
    return this.service.updateStatutEncaissement(id, statut);
  }

  @Get('comptes')
  findComptes(@Query('hotelId') hotelId?: string) {
    return this.service.findComptes(hotelId ? +hotelId : undefined);
  }

  @Post('comptes')
  createCompte(@Body() dto: CreateCompteDto) {
    return this.service.createCompte(dto);
  }

  @Get('journal')
  findJournal(
    @Query('hotelId') hotelId?: string,
    @Query('dateDebut') dateDebut?: string,
    @Query('dateFin') dateFin?: string,
  ) {
    return this.service.findJournal(hotelId ? +hotelId : undefined, dateDebut, dateFin);
  }

  @Post('journal')
  createJournalEntry(@Body() dto: CreateJournalDto, @CurrentUser() user: any) {
    return this.service.createJournalEntry(dto, user.id);
  }
}
