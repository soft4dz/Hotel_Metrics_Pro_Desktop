import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { requireStrongJwtSecret } from './jwt-secret';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireStrongJwtSecret(cfg),
    });
  }

  validate(payload: any) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      hotels: payload.hotels ?? [],
    };
  }
}
