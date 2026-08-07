import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LicensesService } from './licenses.service';
import type { LicenseEdition } from './licenses.util';

class ActivateLicenseDto {
  @IsString() @MinLength(10) key: string;
  @IsString() @MinLength(8) machineId: string;
  @IsOptional() @IsString() organizationCode?: string;
  @IsOptional() @IsString() holder?: string;
  @IsOptional() @IsString() deviceLabel?: string;
}

class IssueLicenseDto {
  @IsString() @MinLength(3) organizationCode: string;
  @IsString() @MinLength(2) legalName: string;
  @IsIn(['STANDARD', 'PRO', 'ENTERPRISE']) edition: LicenseEdition;
  @IsString() expiresAt: string;
  @IsOptional()
  @IsIn(['hotel', 'restaurant', 'commerce', 'services', 'industrie', 'port', 'generic'])
  businessSector?: import('./licenses.util').BusinessSectorId;
  @IsOptional() maxActivations?: number;
}

class RevokeLicenseDto {
  @IsOptional() @IsString() licenseKey?: string;
  @IsOptional() activationId?: number;
  @IsOptional() revokeAllActivations?: boolean;
}

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private licenses: LicensesService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Santé du service licences' })
  health() {
    return this.licenses.health();
  }

  @Public()
  @Post('activate')
  @ApiOperation({ summary: 'Activer une licence sur un poste client' })
  activate(@Body() dto: ActivateLicenseDto) {
    return this.licenses.activate(dto);
  }

  @Public()
  @Get('validate')
  @ApiOperation({ summary: 'Valider une activation existante' })
  validate(
    @Query('key') key: string,
    @Query('machineId') machineId: string,
    @Query('organizationCode') organizationCode?: string,
  ) {
    return this.licenses.validate({ key, machineId, organizationCode });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/issue')
  @ApiOperation({ summary: 'Émettre une clé (éditeur Raqmi)' })
  issue(@Body() dto: IssueLicenseDto) {
    return this.licenses.issue(dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/organizations')
  @ApiOperation({ summary: 'Lister les organisations clientes' })
  listOrganizations() {
    return this.licenses.listOrganizations();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('admin/licenses')
  @ApiOperation({ summary: 'Lister les licences émises' })
  listLicenses(
    @Query('organizationCode') organizationCode?: string,
    @Query('status') status?: string,
  ) {
    return this.licenses.listLicenses({ organizationCode, status });
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('admin/revoke')
  @ApiOperation({ summary: 'Révoquer une licence ou une activation poste' })
  revoke(@Body() dto: RevokeLicenseDto) {
    return this.licenses.revoke(dto);
  }
}
