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
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

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
    AuthModule,
    UsersModule,
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
