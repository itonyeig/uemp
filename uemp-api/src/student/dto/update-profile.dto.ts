import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{7,15}$/, { message: 'Phone number must be 7-15 digits' })
  @Transform(trim)
  phoneNumber?: string;

  @ApiPropertyOptional({ example: '12 Unity Road, Abuja' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Transform(trim)
  address?: string;
}
