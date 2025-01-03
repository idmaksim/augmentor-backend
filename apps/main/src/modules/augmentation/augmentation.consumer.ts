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
    const imageFiles = await this.filterImageFiles(files);

    await Promise.all(
      imageFiles.map((file) =>
        this.createAugmentedVersions(file, sourcePath, destinationPath),
      ),
    );
  }

  private async filterImageFiles(files: string[]): Promise<string[]> {
    return Promise.all(
      files.map(async (file) => ({
        file,
        isImage: await this.isImage(file),
      })),
    ).then((results) => results.filter((r) => r.isImage).map((r) => r.file));
  }

  private async isImage(filename: string): Promise<boolean> {
    const lowercaseFilename = filename.toLowerCase();
    return Promise.resolve(
      this.SUPPORTED_IMAGE_EXTENSIONS.some((ext) =>
        lowercaseFilename.endsWith(ext),
      ),
    );
  }

  private async createAugmentedVersions(
    filename: string,
    sourcePath: string,
    destinationPath: string,
  ): Promise<void> {
    const inputPath = path.join(sourcePath, filename);
    const augmentationTasks = await this.generateAugmentationTasks(
      inputPath,
      destinationPath,
      filename,
    );

    await Promise.all(augmentationTasks);
  }

  private async generateAugmentationTasks(
    inputPath: string,
    destinationPath: string,
    filename: string,
  ) {
    return Array.from({ length: this.AUGMENTATION_COUNT }, async (_, index) =>
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
    const angle = await this.generateRandomAngle();

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
    const image = sharp(inputPath);
    await image
      .rotate(await angle)
      .sharpen()
      .toFile(outputPath);
  }

  private async uploadAugmentedImages(
    augmentedDir: string,
    sessionId: string,
  ): Promise<void> {
    const zipBuffer = await this.createZipArchive(augmentedDir);
    await this.uploadToS3(zipBuffer, sessionId);
  }

  private async createZipArchive(directory: string): Promise<Buffer> {
    const zip = new AdmZip();
    return new Promise((resolve) => {
      zip.addLocalFolder(directory);
      resolve(zip.toBuffer());
    });
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

  private async generateRandomAngle(): Promise<number> {
    return Promise.resolve(Math.floor(Math.random() * 360));
  }
}
