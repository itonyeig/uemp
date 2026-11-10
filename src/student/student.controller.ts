import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { ResponseFormatter } from '../common/interceptors/response-formatter';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({ data: { student: request.user.student } });
  }
}
