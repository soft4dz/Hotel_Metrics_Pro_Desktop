import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FacturationService, CreateFactureDto, AddPaiementDto } from './facturation.service';

@ApiTags('facturation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facturation')
export class FacturationController {
  constructor(private service: FacturationService) {}

  @Get()
  findAll(@Query('hotelId') hotelId?: string, @Query('statut') statut?: string) {
    return this.service.findAll(hotelId ? +hotelId : undefined, statut);
  }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post()
  create(@Body() dto: CreateFactureDto, @CurrentUser() user: any) {
    return this.service.create(dto, user.id);
  }

  @Post(':id/paiements')
  addPaiement(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddPaiementDto,
    @CurrentUser() user: any,
  ) {
    return this.service.addPaiement(id, dto, user.id);
  }

  @Patch(':id/statut')
  updateStatut(@Param('id', ParseIntPipe) id: number, @Body('statut') statut: string) {
    return this.service.updateStatut(id, statut);
  }
}
