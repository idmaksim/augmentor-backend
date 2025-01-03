import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as sharp from 'sharp';

@Processor('augmentation')
export class AugmentationConsumer extends WorkerHost {
  private readonly SUPPORTED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

  async process(job: Job) {
    try {
      const { tempPath, sessionId } = job.data;
      const augmentedDir = await this.prepareAugmentedDirectory(sessionId);
      await this.processAllFiles(tempPath, augmentedDir);
      await this.deleteTempFiles(tempPath);
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

  private async deleteTempFiles(tempPath: string): Promise<void> {
    await fs.rm(tempPath, { recursive: true, force: true });
  }
}
