import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsMongoId,
} from 'class-validator';

export class RegisterCoursesDto {
  @ApiProperty({
    type: [String],
    description: 'IDs of course offerings from the available courses list',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsMongoId({ each: true })
  offeringIds: string[];
}
