import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AssignMissionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  missionId!: string;

  @ApiPropertyOptional({ example: '2026-11-01T12:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  dueAt?: string;
}

export class SubmitMissionEvidenceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  assignmentId!: string;

  @ApiProperty({ description: 'Stable client-generated key used for offline retry deduplication.' })
  @IsString()
  @MinLength(16)
  @MaxLength(80)
  clientSubmissionId!: string;

  @ApiProperty({ enum: ['NOTE', 'CHECKLIST'] })
  @IsIn(['NOTE', 'CHECKLIST'])
  evidenceType!: 'NOTE' | 'CHECKLIST';

  @ApiProperty({ maxLength: 4000 })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  evidenceNote!: string;
}

export class ReviewMissionSubmissionDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION'] })
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_RESUBMISSION'])
  decision!: 'APPROVE' | 'REJECT' | 'REQUEST_RESUBMISSION';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
