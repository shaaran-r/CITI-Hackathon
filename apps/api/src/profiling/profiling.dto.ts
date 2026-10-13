import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { OnboardingAnswers } from '@kaushalsetu/types';

export class CompleteProfileDto implements OnboardingAnswers {
  @ApiProperty({ example: '10' })
  @IsString()
  @MaxLength(20)
  gradeLevel!: string;

  @ApiProperty({ example: 'hi' })
  @IsString()
  @IsIn(['hi', 'en', 'mr', 'bn', 'te', 'ta', 'kn', 'gu'])
  preferredLanguage!: string;

  @ApiPropertyOptional({ example: 'Mysuru' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: ['agriculture', 'technology'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  interests!: string[];

  @ApiProperty({ example: ['communication', 'observation'] })
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsString({ each: true })
  strengths!: string[];

  @ApiProperty({ example: 60 })
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  dailyAvailableMinutes!: number;

  @ApiProperty({ enum: ['LOCAL_ONLY', 'SOME_TRAVEL', 'CAN_RELOCATE'] })
  @IsIn(['LOCAL_ONLY', 'SOME_TRAVEL', 'CAN_RELOCATE'])
  mobility!: OnboardingAnswers['mobility'];

  @ApiProperty({ enum: ['PERSONAL', 'SHARED', 'LIMITED'] })
  @IsIn(['PERSONAL', 'SHARED', 'LIMITED'])
  deviceAccess!: OnboardingAnswers['deviceAccess'];

  @ApiProperty({ enum: ['HIGH', 'MEDIUM', 'LOW'] })
  @IsIn(['HIGH', 'MEDIUM', 'LOW'])
  incomeUrgency!: OnboardingAnswers['incomeUrgency'];

  @ApiProperty({ enum: ['EARN_SOON', 'PRACTICAL_SKILLS', 'HIGHER_STUDIES', 'BALANCED'] })
  @IsIn(['EARN_SOON', 'PRACTICAL_SKILLS', 'HIGHER_STUDIES', 'BALANCED'])
  futureGoal!: OnboardingAnswers['futureGoal'];
}
