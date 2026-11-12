import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { ResponseFormatter } from '../common/interceptors/response-formatter';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { StudentService } from './student.service';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({
      data: {
        student: await this.studentService.populateProfile(
          request.user.student,
        ),
      },
    });
  }

  @Patch('me')
  async updateMe(
    @Req() request: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const student = await this.studentService.updateProfile(
      request.user.student._id,
      updateProfileDto,
      request.ip,
    );
    return ResponseFormatter.Ok({
      data: { student: await this.studentService.populateProfile(student) },
      message: 'Profile updated',
    });
  }
}
