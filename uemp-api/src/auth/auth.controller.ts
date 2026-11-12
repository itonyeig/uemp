import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
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

  @ApiOperation({ summary: 'Create a new student for my testing purposes' })
  @Post('students')
  async createStudent(@Body() createStudentDto: CreateStudentDto) {
    const [data] = await this.studentService.create([createStudentDto]);
    return ResponseFormatter.Ok({ data, message: 'Student created' });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(@Body() loginDto: LoginDto, @Req() request: Request) {
    const data = await this.authService.login(loginDto, request.ip);
    return ResponseFormatter.Ok({
      data,
      message: 'Login successful',
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  async logout(@Req() request: AuthenticatedRequest) {
    await this.authService.logout(
      request.user.student._id,
      request.sessionId,
      request.ip,
    );

    return ResponseFormatter.Ok({ message: 'Logged out successfully' });
  }
}
