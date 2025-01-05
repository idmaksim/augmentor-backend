import { Module } from '@nestjs/common';
import { AugmentationController } from './augmentation.controller';
import { AugmentationGateway } from './augmentation.gateway';
import { AugmentationService } from './augmentation.service';
import { BullModule } from '@nestjs/bullmq';
import { AugmentationConsumer } from './augmentation.consumer';
import { AugmentationScheduler } from './augmentation.scheduler';
import { UsersModule } from '@app/users';
import { TokenModule } from '@app/token';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'augmentation' }),
    UsersModule,
    TokenModule,
  ],
  controllers: [AugmentationController],
  providers: [
    AugmentationGateway,
    AugmentationService,
    AugmentationConsumer,
    AugmentationScheduler,
  ],
  exports: [AugmentationService],
})
export class AugmentationModule {}
