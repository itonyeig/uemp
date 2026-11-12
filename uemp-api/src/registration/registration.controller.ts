import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { ResponseFormatter } from '../common/interceptors/response-formatter';
import { RegisterCoursesDto } from './dto/register-courses.dto';
import { RegistrationService } from './registration.service';

@ApiTags('Course registration')
@ApiBearerAuth()
@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('available-courses')
  async availableCourses(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({
      data: await this.registrationService.findAvailableCourses(
        request.user.student,
      ),
    });
  }

  @Get('')
  async registrations(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({
      data: await this.registrationService.findRegistrations(
        request.user.student,
      ),
    });
  }

  @Post('')
  async register(
    @Req() request: AuthenticatedRequest,
    @Body() { offeringIds }: RegisterCoursesDto,
  ) {
    return ResponseFormatter.Ok({
      data: await this.registrationService.register(
        request.user.student,
        offeringIds,
        request.ip,
      ),
      message: 'Courses registered',
    });
  }
}
