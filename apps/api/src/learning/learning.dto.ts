import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLearningModuleDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ maxLength: 1000 })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @ApiProperty({ enum: ['hi', 'en', 'mr', 'bn'] })
  @IsIn(['hi', 'en', 'mr', 'bn'])
  language!: string;

  @ApiProperty({ type: [String], maxItems: 12 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(1500, { each: true })
  lessons!: string[];

  @ApiProperty({ enum: ['FREE', 'ONE_TIME', 'SUBSCRIPTION'] })
  @IsIn(['FREE', 'ONE_TIME', 'SUBSCRIPTION'])
  pricingModel!: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';

  @ApiPropertyOptional({ minimum: 0, maximum: 100000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  priceInr?: number;
}
