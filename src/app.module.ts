import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  TelegramConfig,
  appConfig,
  dbConfig,
  minioConfig,
  openAIConfig,
} from './common/config/app.config';
import { APP_FILTER } from '@nestjs/core';
import { CronJobModule } from './common/cron/cron.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AllExceptionFilter } from './common/filter/all-exceptions.filter';

import { TelegrafModule } from 'nestjs-telegraf';
import { VehicleModule } from './modules/vehicle/vehicle.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OperatorModule } from './modules/operator/operator.module';
import { ChargingStationModule } from './modules/charging-station/charging-station.module';
import { ConnectorModule } from './modules/connector/connector.module';
import { ConnectorStatusLogModule } from './modules/connector-status-log/connector-status-log.module';
import { StationPricingModule } from './modules/station-pricing/station-pricing.module';
import { ChargingSessionModule } from './modules/charging-session/charging-session.module';
import { OperatorPayoutModule } from './modules/operator-payout/operator-payout.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { WalletTransactionModule } from './modules/wallet-transaction/wallet-transaction.module';
import { PaymentModule } from './modules/payment/payment.module';
import { LegalModule } from './modules/legal/legal.module';
import { DiscountModule } from './modules/discount/discount.module';
import { StationLikeModule } from './modules/station-like/station-like.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, minioConfig, openAIConfig],
    }),
    // TelegrafModule.forRoot({
    //   token: process.env.TELEGRAM_BOT_TOKEN,
    // }),
    // MongooseModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     uri: configService.get<string>('db.url') || process.env.DATABASE_URL,
    //   }),
    //   inject: [ConfigService],
    // }),
    PrismaModule,
    CronJobModule,
    VehicleModule,
    AuthModule,
    UsersModule,
    OperatorModule,
    ChargingStationModule,
    ConnectorModule,
    ConnectorStatusLogModule,
    StationPricingModule,
    ChargingSessionModule,
    OperatorPayoutModule,
    WalletModule,
    WalletTransactionModule,
    PaymentModule,
    LegalModule,
    DiscountModule,
    StationLikeModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionFilter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  // constructor(
  //   private readonly userSeedService: UserSeedService,
  //   private readonly rolePermissionSeedService: RolePermissionSeedService
  // ) {}

  async onModuleInit() {
    // await this.rolePermissionSeedService.seed();
    // await this.userSeedService.seed();
  }
}
