import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { EmailDto } from '../../common/dto/email.dto';

export class CreateStudentDto extends EmailDto {
  @ApiProperty({
    example: 'DemoStudentPass123!',
    format: 'password',
    description: 'Password up to 72 UTF-8 bytes',
  })
  @IsString()
  @MinLength(15)
  @MaxLength(72)
  password: string;

  @ApiProperty({ example: 'Tobi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  firstName: string;

  @ApiProperty({ example: 'Ade' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  lastName: string;
}
