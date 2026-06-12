import { Controller, Post, Body, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
}

class ChangePasswordDto {
  @IsString() oldPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Connexion' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('change-password')
  @ApiOperation({ summary: 'Changement de mot de passe' })
  changePassword(@CurrentUser() user: any, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto.oldPassword, dto.newPassword);
  }
}
