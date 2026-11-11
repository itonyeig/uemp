import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { AcademicService } from '../academic/academic.service';
import { ResponseFormatter } from '../common/interceptors/response-formatter';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { StudentIdentity } from './schema/student.schema';
import { StudentService } from './student.service';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(
    private readonly academicService: AcademicService,
    private readonly studentService: StudentService,
  ) {}

  @Get('me')
  async me(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({
      data: { student: await this.toProfile(request.user.student) },
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
      data: { student: await this.toProfile(student) },
      message: 'Profile updated',
    });
  }

  private async toProfile(student: StudentIdentity) {
    const placement = await this.academicService.findPlacement(student.program);
    return {
      ...student,
      program: placement?.program ?? null,
      department: placement?.department ?? null,
      faculty: placement?.faculty ?? null,
    };
  }
}
