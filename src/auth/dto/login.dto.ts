import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { EmailDto } from '../../common/dto/email.dto';

export class LoginDto extends EmailDto {
  @ApiProperty({ example: 'DemoStudentPass123!', format: 'password' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
