import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsPhoneNumber } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  // @Matches(/^\+?\d{7,15}$/, { message: 'Phone number must be 7-15 digits' })
  @IsPhoneNumber('NG', { message: 'Invalid phone number' })
  @Transform(trim)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '12 Unity Road, Lugbe, Abuja' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trim)
  address?: string;
}
