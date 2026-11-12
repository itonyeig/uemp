import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get(@Res() response: Response)
  health(@Res() response: Response) {
    response.status(200).send('OK');
  }
}
