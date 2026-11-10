import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class AllErrorsExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    Logger.error(exception);

    const response = host.switchToHttp().getResponse<Response>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';
    const error =
      exception instanceof Error
        ? exception.constructor.name
        : 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();

      const detail =
        typeof body === 'string'
          ? body
          : (body as { message?: unknown }).message;

      if (
        typeof detail === 'string' ||
        (Array.isArray(detail) &&
          detail.every((item) => typeof item === 'string'))
      ) {
        message = detail;
      }
    } else if (exception instanceof Error) {
      message = 'Something went wrong';
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message: Array.isArray(message)
        ? message.map((item) => this.capitalizeFirstLetter(item))
        : this.capitalizeFirstLetter(message),
    });
  }

  private capitalizeFirstLetter(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
