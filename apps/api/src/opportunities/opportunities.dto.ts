import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BookmarkOpportunityDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  opportunityId!: string;

  @ApiProperty()
  @IsBoolean()
  saved!: boolean;
}

export class StartOpportunityApplicationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  opportunityId!: string;
}

export class UpdateStudentApplicationDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'SUBMITTED'] })
  @IsIn(['IN_PROGRESS', 'SUBMITTED'])
  status!: 'IN_PROGRESS' | 'SUBMITTED';
}

export class RequestApplicationHelpDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class RecommendOpportunityDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  studentId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  opportunityId!: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class UpdateFacilitatorApplicationDto {
  @ApiProperty({ enum: ['IN_PROGRESS', 'SUBMITTED', 'SELECTED', 'REJECTED'] })
  @IsIn(['IN_PROGRESS', 'SUBMITTED', 'SELECTED', 'REJECTED'])
  status!: 'IN_PROGRESS' | 'SUBMITTED' | 'SELECTED' | 'REJECTED';

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  facilitatorNote?: string;
}
