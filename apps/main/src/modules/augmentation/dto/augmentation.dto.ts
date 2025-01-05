import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class AugmentationDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  count: number;
}
