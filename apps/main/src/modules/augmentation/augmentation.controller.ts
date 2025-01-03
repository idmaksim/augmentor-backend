import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { Express } from 'express';

@Controller('augmentation')
export class AugmentationController {
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'The file to summarize',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    console.log(file);
  }
}
