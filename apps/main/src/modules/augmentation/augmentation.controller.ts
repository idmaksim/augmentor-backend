import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';
import { AugmentationService } from './augmentation.service';
import { AugmentationDto } from './dto/augmentation.dto';

@Controller('augmentation')
export class AugmentationController {
  constructor(private readonly augmentationService: AugmentationService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'The file to summarize',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        count: {
          type: 'number',
          description: 'Количество аугментаций',
        },
      },
      required: ['file', 'count'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: AugmentationDto,
  ) {
    return this.augmentationService.processZipFile(file.buffer, body.count);
  }
}
