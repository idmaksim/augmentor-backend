import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import config from '../../config/config';
import { AuthModule } from '../auth/auth.module';
import { LoggerMiddleware } from '@app/common/middlewares/logger.middleware';
import { PermissionModule } from 'libs/permissions/src';
import { PermissionGuard } from '@app/common/guards/permission.guard';
import { TokenModule } from '@app/token';
import { UsersModule } from '../users/users.module';
import { BullModule } from '@nestjs/bullmq';
import { AugmentationModule } from '../augmentation/augmentation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get('REDIS_URL'),
        },
      }),
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'ru-*': 'ru',
        'en-*': 'en',
      },
      loaderOptions: {
        path: `./libs/i18n/`,
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    AuthModule,
    TokenModule,
    UsersModule,
    AugmentationModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
