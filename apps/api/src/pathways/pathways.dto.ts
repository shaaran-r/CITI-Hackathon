import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SelectPathwayDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  pathwayId!: string;
}
