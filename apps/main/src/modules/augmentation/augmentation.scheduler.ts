import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectS3, S3 } from 'nestjs-s3';

@Injectable()
export class AugmentationScheduler {
  private readonly logger = new Logger(AugmentationScheduler.name);

  constructor(
    @InjectS3() private readonly s3: S3,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async clearOldArchives() {
    this.logger.debug('Начало очистки S3 хранилища');

    try {
      const objects = await this.s3.listObjectsV2({
        Bucket: this.configService.get('S3_BUCKET'),
      });

      const tenMinutesAgo = new Date();
      tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);

      const oldObjects =
        objects.Contents?.filter((obj) => obj.LastModified < tenMinutesAgo) ||
        [];

      for (const obj of oldObjects) {
        await this.s3.deleteObject({
          Bucket: this.configService.get('S3_BUCKET'),
          Key: obj.Key,
        });

        this.logger.debug(`Удален объект: ${obj.Key}`);
      }
    } catch (error) {
      this.logger.error('Ошибка при очистке S3:', error);
    }
  }
}
