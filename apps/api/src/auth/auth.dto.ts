import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '+919000000001' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone!: string;
}

export class VerifyOtpDto extends SendOtpDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(8)
  code!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(20)
  refreshToken!: string;
}
