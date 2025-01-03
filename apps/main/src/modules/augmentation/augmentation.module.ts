import { Module } from '@nestjs/common';
import { AugmentationController } from './augmentation.controller';
import { AugmentationGateway } from './augmentation.gateway';
import { AugmentationService } from './augmentation.service';
import { AugmentationConsumer } from './augmentation.consumer';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [BullModule.registerQueue({ name: 'augmentation' })],
  controllers: [AugmentationController],
  providers: [AugmentationGateway, AugmentationService, AugmentationConsumer],
  exports: [AugmentationService],
})
export class AugmentationModule {}
