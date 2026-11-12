import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(request: Request, response: Response, next: NextFunction) {
    const authorization = request.get('Authorization') ?? '';
    const token = /^Bearer +(\S+)$/i.exec(authorization)?.[1];

    if (!token) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const { student, sessionId } = await this.authService.authenticate(token);
    request.user = { student };
    request.sessionId = sessionId;
    response.setHeader('Cache-Control', 'no-store');
    next();
  }
}
