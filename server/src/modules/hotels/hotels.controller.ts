import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HotelsService } from './hotels.service';

@ApiTags('hotels')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('hotels')
export class HotelsController {
  constructor(private service: HotelsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }
}
