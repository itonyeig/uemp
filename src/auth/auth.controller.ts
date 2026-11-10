import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../@types/custom';
import { ResponseFormatter } from '../common/interceptors/response-formatter';
import { CreateStudentDto } from '../student/dto/create-student.dto';
import { StudentService } from '../student/student.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly studentService: StudentService,
  ) {}

  @Post('students')
  async createStudent(@Body() createStudentDto: CreateStudentDto) {
    const data = await this.studentService.create(createStudentDto);
    return ResponseFormatter.Ok({ data, message: 'Student created' });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async login(@Body() loginDto: LoginDto) {
    const data = await this.authService.login(loginDto);
    return ResponseFormatter.Ok({
      data,
      message: 'Login successful',
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.logout(request.user.student._id, request.sessionId);

    return ResponseFormatter.Ok({ message: 'Logged out successfully' });
  }
}
