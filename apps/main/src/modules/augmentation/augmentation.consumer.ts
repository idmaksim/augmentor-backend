import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { InjectS3, S3 } from 'nestjs-s3';
import * as path from 'path';
import * as sharp from 'sharp';
import * as AdmZip from 'adm-zip';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AugmentationGateway } from './augmentation.gateway';

@Processor('augmentation')
export class AugmentationConsumer extends WorkerHost {
  private readonly logger = new Logger(AugmentationConsumer.name);
  private readonly SUPPORTED_IMAGE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ];
  private readonly downloadUrl: string;

  constructor(
    @InjectS3() private readonly s3: S3,
    private readonly configService: ConfigService,
    private readonly augmentationGateway: AugmentationGateway,
  ) {
    super();
    this.downloadUrl = `${this.configService.get('S3_ENDPOINT')}/${this.configService.get('S3_BUCKET')}`;
  }

  async process(job: Job): Promise<void> {
    const { tempPath, sessionId, count, userId } = job.data;
    this.logger.log(
      `Начало обработки задания: ${job.id}, sessionId: ${sessionId}`,
    );

    try {
      const augmentedDir = await this.createDirectory('augmented', sessionId);
      this.logger.log(`Создана директория для аугментации: ${augmentedDir}`);

      await this.augmentImages(tempPath, augmentedDir, count);
      this.logger.log(
        `Аугментация изображений завершена для sessionId: ${sessionId}`,
      );

      await this.handleUpload(augmentedDir, sessionId);
      this.logger.log(`Загрузка на S3 завершена для sessionId: ${sessionId}`);

      await this.cleanup(tempPath, augmentedDir);
      this.logger.log(
        `Очистка временных директорий завершена для sessionId: ${sessionId}`,
      );

      await this.augmentationGateway.emitResultToUser(
        userId,
        `${this.downloadUrl}/${sessionId}.zip`,
      );
    } catch (error) {
      this.logger.error(`Ошибка в процессе аугментации: ${error.message}`);
      throw new Error(`Augmentation process failed: ${error.message}`);
    }
  }

  private async augmentImages(
    sourcePath: string,
    destinationPath: string,
    count: number,
  ): Promise<void> {
    const files = await fs.readdir(sourcePath);
    const imageFiles = files.filter(this.isImage.bind(this));
    this.logger.log(`Найдено ${imageFiles.length} изображений для аугментации`);

    await Promise.all(
      imageFiles.map((file) =>
        this.createAugmentedVersions(file, sourcePath, destinationPath, count),
      ),
    );
  }

  private isImage(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
  }

  private async createAugmentedVersions(
    filename: string,
    sourcePath: string,
    destinationPath: string,
    count: number,
  ): Promise<void> {
    const inputPath = path.join(sourcePath, filename);
    const tasks = Array.from({ length: count }, (_, index) =>
      this.augmentSingleImage(inputPath, destinationPath, filename, index),
    );

    await Promise.all(tasks);
  }

  private async augmentSingleImage(
    inputPath: string,
    destinationPath: string,
    filename: string,
    index: number,
  ): Promise<void> {
    const outputPath = path.join(
      destinationPath,
      `augmented_${index}_${filename}`,
    );
    const angle = this.generateRandomAngle();
    this.logger.log(`Аугментация изображения: ${filename}, угол: ${angle}`);

    await sharp(inputPath).rotate(angle).sharpen().toFile(outputPath);
  }

  private generateRandomAngle(): number {
    return Math.floor(Math.random() * 360);
  }

  private async handleUpload(
    augmentedDir: string,
    sessionId: string,
  ): Promise<void> {
    const zipBuffer = await this.createZip(augmentedDir);
    await this.uploadToS3(zipBuffer, `${sessionId}.zip`);
  }

  private async createZip(directory: string): Promise<Buffer> {
    const zip = new AdmZip();
    zip.addLocalFolder(directory);
    this.logger.log(`Создан ZIP архив для директории: ${directory}`);
    return zip.toBuffer();
  }

  private async uploadToS3(buffer: Buffer, key: string): Promise<void> {
    await this.s3.putObject({
      Bucket: this.configService.get('S3_BUCKET'),
      Key: key,
      Body: buffer,
      ContentType: 'application/zip',
    });
    this.logger.log(`Файл загружен на S3: ${key}`);
  }

  private async createDirectory(type: string, id: string): Promise<string> {
    const dir = path.join(process.cwd(), type, id);
    await fs.mkdir(dir, { recursive: true });
    this.logger.log(`Создана директория: ${dir}`);
    return dir;
  }

  private async cleanup(...dirs: string[]): Promise<void> {
    await Promise.all(
      dirs.map((dir) => fs.rm(dir, { recursive: true, force: true })),
    );
    this.logger.log(`Удалены директории: ${dirs.join(', ')}`);
  }
}
