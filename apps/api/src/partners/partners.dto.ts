import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePartnerApplicationDto {
  @ApiProperty({ enum: ['MENTOR', 'EMPLOYER', 'NGO'] })
  @IsIn(['MENTOR', 'EMPLOYER', 'NGO'])
  partnerType!: 'MENTOR' | 'EMPLOYER' | 'NGO';

  @ApiProperty({ maxLength: 80 })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  contactName!: string;

  @ApiPropertyOptional({ maxLength: 120 })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  organizationName?: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @ApiPropertyOptional({ maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(80)
  district?: string;

  @ApiProperty({ type: [String], maxItems: 8 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  focusAreas!: string[];

  @ApiProperty({ maxLength: 1200 })
  @IsString()
  @MinLength(10)
  @MaxLength(1200)
  message!: string;

  @ApiProperty()
  @IsBoolean()
  consentAccepted!: boolean;
}

export class UpdatePartnerApplicationStatusDto {
  @ApiProperty({ enum: ['REVIEWED', 'ACCEPTED', 'DECLINED'] })
  @IsIn(['REVIEWED', 'ACCEPTED', 'DECLINED'])
  status!: 'REVIEWED' | 'ACCEPTED' | 'DECLINED';
}
