import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { ResponseFormatter } from '../common/interceptors/response-formatter';
import { ResultService } from './result.service';

@ApiTags('Results')
@ApiBearerAuth()
@Controller('students/me')
export class ResultController {
  constructor(private readonly resultService: ResultService) {}

  @Get('results')
  async results(@Req() request: AuthenticatedRequest) {
    return ResponseFormatter.Ok({
      data: await this.resultService.findAcademicHistory(
        request.user.student._id,
      ),
    });
  }
}
