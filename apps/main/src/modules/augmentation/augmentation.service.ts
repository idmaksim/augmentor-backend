import { BadRequestException, Injectable } from '@nestjs/common';
import AdmZip = require('adm-zip');
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AugmentationService {
  private readonly tempDir = 'temp';

  constructor(
    @InjectQueue('augmentation')
    private readonly queue: Queue,
  ) {}

  async processZipFile(zipBuffer: Buffer): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const paths = this.createPaths(sessionId);

      await this.ensureDirectories(paths.tempPath);
      await this.extractZipFile(zipBuffer, paths.tempPath);
      await this.queueProcessingJob(sessionId, paths);

      return sessionId;
    } catch {
      throw new BadRequestException('Only ZIP files supports');
    }
  }

  private generateSessionId(): string {
    return uuidv4();
  }

  private createPaths(sessionId: string) {
    return {
      tempPath: path.join(this.tempDir, sessionId),
    };
  }

  private async extractZipFile(
    zipBuffer: Buffer,
    tempPath: string,
  ): Promise<void> {
    const zip = new AdmZip(zipBuffer);
    await new Promise<void>((resolve, reject) => {
      try {
        zip.extractAllTo(tempPath, true);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async queueProcessingJob(
    sessionId: string,
    paths: { tempPath: string },
  ): Promise<void> {
    await this.queue.add('process-files', {
      sessionId,
      tempPath: paths.tempPath,
    });
  }

  private async ensureDirectories(...dirs: string[]): Promise<void> {
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }
}
