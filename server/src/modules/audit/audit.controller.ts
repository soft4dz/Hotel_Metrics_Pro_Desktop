import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private service: AuditService) {}

  @Get()
  findAll(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll(module, userId ? +userId : undefined, limit ? +limit : 100);
  }
}
