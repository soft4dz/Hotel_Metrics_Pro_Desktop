import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ClientsService, CreateClientDto, UpdateClientDto } from './clients.service';

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get() findAll(@Query('search') search?: string) { return this.service.findAll(search); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() create(@Body() dto: CreateClientDto) { return this.service.create(dto); }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
