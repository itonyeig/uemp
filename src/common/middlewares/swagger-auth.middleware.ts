import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class SwaggerAuthMiddleware implements NestMiddleware {
  use = (req: Request, res: Response, next: NextFunction) => {
    const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
    const username = process.env.SWAGGER_USERNAME;
    const password = process.env.SWAGGER_PASSWORD;

    if (
      scheme.toLowerCase() === 'basic' &&
      encoded &&
      username &&
      password &&
      Buffer.from(encoded, 'base64').toString() === `${username}:${password}`
    ) {
      next();
      return;
    }

    res.setHeader('WWW-Authenticate', 'Basic');
    res.status(401).send('Unauthorized');
  };
}
