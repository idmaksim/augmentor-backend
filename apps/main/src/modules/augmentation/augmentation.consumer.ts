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
  private readonly SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

  constructor(
    @InjectS3() private readonly s3: S3,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      const { tempPath, sessionId } = job.data;
      const augmentedDir = await this.prepareAugmentedDirectory(sessionId);
      await this.processAllFiles(tempPath, augmentedDir);
      await this.createAndUploadZip(augmentedDir, sessionId);
      await this.cleanup(tempPath, augmentedDir);
    } catch (error) {
      console.error(error);
    }
  }

  private async prepareAugmentedDirectory(sessionId: string): Promise<string> {
    const augmentedDir = path.join(process.cwd(), 'augmented', sessionId);
    await fs.mkdir(augmentedDir, { recursive: true });
    return augmentedDir;
  }

  private async processAllFiles(
    tempPath: string,
    augmentedDir: string,
  ): Promise<void> {
    const files = await fs.readdir(tempPath);
    const imageFiles = files.filter((file) => this.isImageFile(file));

    await Promise.all(
      imageFiles.map((file) =>
        this.processImage(file, tempPath, augmentedDir, 10),
      ),
    );
  }

  private isImageFile(filename: string): boolean {
    return this.SUPPORTED_EXTENSIONS.some((ext) =>
      filename.toLowerCase().endsWith(ext),
    );
  }

  private async processImage(
    filename: string,
    sourcePath: string,
    destinationPath: string,
    augmentationCount: number,
  ): Promise<void> {
    const inputPath = path.join(sourcePath, filename);
    const augmentationTasks = Array.from(
      { length: augmentationCount },
      (_, i) =>
        this.createAugmentedImage(inputPath, destinationPath, filename, i),
    );

    await Promise.all(augmentationTasks);
  }

  private async createAugmentedImage(
    inputPath: string,
    destinationPath: string,
    filename: string,
    index: number,
  ): Promise<void> {
    const outputPath = path.join(
      destinationPath,
      `augmented_${index}_${filename}`,
    );
    const randomAngle = this.generateRandomAngle();

    await sharp(inputPath).rotate(randomAngle).sharpen().toFile(outputPath);
  }

  private generateRandomAngle(): number {
    return Math.floor(Math.random() * 360);
  }

  private async createAndUploadZip(
    augmentedDir: string,
    sessionId: string,
  ): Promise<void> {
    const zip = new AdmZip();
    zip.addLocalFolder(augmentedDir);
    const zipBuffer = zip.toBuffer();

    await this.s3
      .putObject({
        Bucket: this.configService.get('S3_BUCKET'),
        Key: `${sessionId}.zip`,
        Body: zipBuffer,
        ContentType: 'application/zip',
      })
      .then((res) => {
        console.log(res);
      });
  }

  private async cleanup(tempPath: string, augmentedDir: string): Promise<void> {
    await Promise.all([
      fs.rm(tempPath, { recursive: true, force: true }),
      fs.rm(augmentedDir, { recursive: true, force: true }),
    ]);
  }
}
