import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import { InjectS3, S3 } from 'nestjs-s3';
import * as path from 'path';
import * as sharp from 'sharp';
import * as AdmZip from 'adm-zip';
import { ConfigService } from '@nestjs/config';

@Processor('augmentation')
export class AugmentationConsumer extends WorkerHost {
  private readonly SUPPORTED_IMAGE_EXTENSIONS = [
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
  ];
  private readonly AUGMENTATION_COUNT = 10;

  constructor(
    @InjectS3() private readonly s3: S3,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { tempPath, sessionId } = job.data;

    try {
      const augmentedDir = await this.createAugmentedDirectory(sessionId);
      await this.augmentImages(tempPath, augmentedDir);
      await this.uploadAugmentedImages(augmentedDir, sessionId);
      await this.removeTemporaryDirectories(tempPath, augmentedDir);
    } catch (error) {
      throw new Error(`Augmentation process failed: ${error.message}`);
    }
  }

  private async augmentImages(
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const files = await fs.readdir(sourcePath);
    const imageFiles = this.filterImageFiles(files);

    await Promise.all(
      imageFiles.map((file) =>
        this.createAugmentedVersions(file, sourcePath, destinationPath),
      ),
    );
  }

  private filterImageFiles(files: string[]): string[] {
    return files.filter((file) => this.isImage(file));
  }

  private isImage(filename: string): boolean {
    const lowercaseFilename = filename.toLowerCase();
    return this.SUPPORTED_IMAGE_EXTENSIONS.some((ext) =>
      lowercaseFilename.endsWith(ext),
    );
  }

  private async createAugmentedVersions(
    filename: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const inputPath = path.join(sourcePath, filename);
    const augmentationTasks = this.generateAugmentationTasks(
      inputPath,
      destinationPath,
      filename,
    );

    await Promise.all(augmentationTasks);
  }

  private generateAugmentationTasks(
    inputPath: string,
    destinationPath: string,
    filename: string,
  ): Promise<void>[] {
    return Array.from({ length: this.AUGMENTATION_COUNT }, (_, index) =>
      this.augmentSingleImage(inputPath, destinationPath, filename, index),
    );
  }

  private async augmentSingleImage(
    inputPath: string,
    destinationPath: string,
    filename: string,
    index: number,
  ): Promise<void> {
    const outputPath = this.generateOutputPath(
      destinationPath,
      filename,
      index,
    );
    const angle = this.generateRandomAngle();

    await this.applyImageTransformations(inputPath, outputPath, angle);
  }

  private generateOutputPath(
    destinationPath: string,
    filename: string,
    index: number,
  ): string {
    return path.join(destinationPath, `augmented_${index}_${filename}`);
  }

  private async applyImageTransformations(
    inputPath: string,
    outputPath: string,
    angle: number,
  ): Promise<void> {
    await sharp(inputPath).rotate(angle).sharpen().toFile(outputPath);
  }

  private async uploadAugmentedImages(
    augmentedDir: string,
    sessionId: string,
  ): Promise<void> {
    const zipBuffer = this.createZipArchive(augmentedDir);
    await this.uploadToS3(zipBuffer, sessionId);
  }

  private createZipArchive(directory: string): Buffer {
    const zip = new AdmZip();
    zip.addLocalFolder(directory);
    return zip.toBuffer();
  }

  private async uploadToS3(
    zipBuffer: Buffer,
    sessionId: string,
  ): Promise<void> {
    const bucket = this.configService.get('S3_BUCKET');
    const key = `${sessionId}.zip`;

    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: zipBuffer,
      ContentType: 'application/zip',
    });
  }

  private async createAugmentedDirectory(sessionId: string): Promise<string> {
    const augmentedDir = path.join(process.cwd(), 'augmented', sessionId);
    await fs.mkdir(augmentedDir, { recursive: true });
    return augmentedDir;
  }

  private async removeTemporaryDirectories(
    tempPath: string,
    augmentedDir: string,
  ): Promise<void> {
    await Promise.all([
      fs.rm(tempPath, { recursive: true, force: true }),
      fs.rm(augmentedDir, { recursive: true, force: true }),
    ]);
  }

  private generateRandomAngle(): number {
    return Math.floor(Math.random() * 360);
  }
}
