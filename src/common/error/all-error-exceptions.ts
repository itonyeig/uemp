import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  getDuplicateKeyMessage,
  isMongoDuplicateKeyError,
} from '../utils/mongo-duplicate-key';

type ErrorStatusDetails = {
  status: HttpStatus;
  message?: string;
};

@Catch()
export class AllErrorsExceptionsFilter implements ExceptionFilter {
  private readonly defaultMessage = 'Something went wrong';

  private readonly errorStatusMap: Record<string, ErrorStatusDetails> = {
    ValidationError: { status: HttpStatus.BAD_REQUEST },
    CastError: {
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid identifier',
    },
    StrictModeError: {
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid fields in request',
    },
    // TokenExpiredError: {
    //   status: HttpStatus.UNAUTHORIZED,
    //   message: 'JWT Token expired',
    // },
    // JsonWebTokenError: { status: HttpStatus.UNAUTHORIZED },
    // BadGatewayException: {
    //   status: HttpStatus.SERVICE_UNAVAILABLE,
    //   message: 'Service is temporarily unavailable. Please try again later.',
    // },
  };

  catch(exception: unknown, host: ArgumentsHost) {
    Logger.error(exception);

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';
    let error =
      exception instanceof Error
        ? exception.constructor.name
        : 'Internal Server Error';

    if (isMongoDuplicateKeyError(exception)) {
      status = HttpStatus.CONFLICT;
      message = getDuplicateKeyMessage(exception);
      error = 'ConflictException';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseBody = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        message = responseBody.message || message;
        error = exception.constructor.name;
      } else {
        message = exceptionResponse.toString();
      }
    } else if (exception instanceof Error) {
      const errorDetails = this.errorStatusMap[exception.name];

      if (errorDetails) {
        status = errorDetails.status;
        message = errorDetails.message || exception.message;
        error =
          message === this.defaultMessage
            ? 'InternalServerErrorException'
            : exception.name;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = this.defaultMessage;
      }
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message: this.formatMessage(message),
    });
  }

  private formatMessage(message: string | string[]): string | string[] {
    if (Array.isArray(message)) {
      return message.map((item) => this.capitalizeFirstLetter(item));
    }

    return this.capitalizeFirstLetter(message);
  }

  private capitalizeFirstLetter(text: string): string {
    if (!text) {
      return text;
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}
