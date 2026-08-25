import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { LicenseAdminGuard, LicensePublicRateLimitGuard } from './licenses.guards';
import { LicensesService } from './licenses.service';
import type { BusinessSectorId, LicenseEdition } from './licenses.util';

class ActivateLicenseDto {
  @IsString() @MinLength(100) @MaxLength(4096) key: string;
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{7,127}$/i) machineId: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/) organizationCode?: string;
  @IsOptional() @IsString() @MaxLength(200) holder?: string;
  @IsOptional() @IsString() @MaxLength(120) deviceLabel?: string;
}

class ValidateLicenseDto {
  @IsString() @MinLength(100) @MaxLength(4096) key: string;
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{7,127}$/i) machineId: string;
  @IsOptional() @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/) organizationCode?: string;
}

class IssueLicenseDto {
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{2,63}$/) organizationCode: string;
  @IsString() @MinLength(2) @MaxLength(200) legalName: string;
  @IsIn(['STANDARD', 'PRO', 'ENTERPRISE']) edition: LicenseEdition;
  @IsDateString({ strict: true }) expiresAt: string;
  @IsOptional()
  @IsIn(['hotel', 'restaurant', 'commerce', 'services', 'industrie', 'port', 'generic'])
  businessSector?: BusinessSectorId;
  @IsOptional() @IsInt() @Min(1) @Max(999) maxActivations?: number;
}

class RevokeLicenseDto {
  @IsOptional() @IsString() @MaxLength(4096) licenseKey?: string;
  @IsOptional() @IsInt() @Min(1) activationId?: number;
  @IsOptional() @IsBoolean() revokeAllActivations?: boolean;
}

@ApiTags('licenses')
@Controller('licenses')
export class LicensesController {
  constructor(private licenses: LicensesService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Santé du service licences et de sa base' })
  health() {
    return this.licenses.health();
  }

  @Public()
  @UseGuards(LicensePublicRateLimitGuard)
  @Post('activate')
  @ApiOperation({ summary: 'Activer une licence sur un poste client' })
  activate(@Body() dto: ActivateLicenseDto) {
    return this.licenses.activate(dto);
  }

  @Public()
  @UseGuards(LicensePublicRateLimitGuard)
  @Post('validate')
  @ApiOperation({ summary: 'Valider une activation existante sans exposer la clé dans l’URL' })
  validate(@Body() dto: ValidateLicenseDto) {
    return this.licenses.validate(dto);
  }

  @UseGuards(JwtAuthGuard, LicenseAdminGuard)
  @ApiBearerAuth()
  @Post('admin/issue')
  @ApiOperation({ summary: 'Émettre une clé — administrateur global Raqmi uniquement' })
  issue(@CurrentUser() user: any, @Body() dto: IssueLicenseDto) {
    return this.licenses.issue(dto, user);
  }

  @UseGuards(JwtAuthGuard, LicenseAdminGuard)
  @ApiBearerAuth()
  @Get('admin/organizations')
  @ApiOperation({ summary: 'Lister les organisations clientes' })
  listOrganizations() {
    return this.licenses.listOrganizations();
  }

  @UseGuards(JwtAuthGuard, LicenseAdminGuard)
  @ApiBearerAuth()
  @Get('admin/licenses')
  @ApiOperation({ summary: 'Lister les licences émises' })
  listLicenses(
    @Query('organizationCode') organizationCode?: string,
    @Query('status') status?: string,
  ) {
    return this.licenses.listLicenses({ organizationCode, status });
  }

  @UseGuards(JwtAuthGuard, LicenseAdminGuard)
  @ApiBearerAuth()
  @Post('admin/revoke')
  @ApiOperation({ summary: 'Révoquer une licence ou une activation poste' })
  revoke(@CurrentUser() user: any, @Body() dto: RevokeLicenseDto) {
    return this.licenses.revoke(dto, user);
  }
}
