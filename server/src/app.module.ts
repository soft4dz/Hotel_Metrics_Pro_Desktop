import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { ClientsModule } from './modules/clients/clients.module';
import { FacturationModule } from './modules/facturation/facturation.module';
import { TresorerieModule } from './modules/tresorerie/tresorerie.module';
import { AuditModule } from './modules/audit/audit.module';
import { LicensesModule } from './modules/licenses/licenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    HotelsModule,
    ClientsModule,
    FacturationModule,
    TresorerieModule,
    AuditModule,
    LicensesModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
