import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto); }

  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.remove(id, user.id);
  }
}
