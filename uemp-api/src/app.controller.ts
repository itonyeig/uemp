import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  health(@Res() res: Response) {
    res.status(200).send('OK');
  }
}
