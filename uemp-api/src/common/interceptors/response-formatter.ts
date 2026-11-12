import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable, map } from 'rxjs';

type OkResponse<T = unknown> = {
  success: true;
  statusCode?: number;
  message: string;
  data?: T;
};

export class ResponseFormatter {
  static Ok<T>({
    data,
    statusCode,
    message = 'Request was successful',
  }: { data?: T; statusCode?: number; message?: string } = {}): OkResponse<T> {
    return { success: true, statusCode, message, data };
  }
}

@Injectable()
export class ResponseFormatterInterceptor<T> implements NestInterceptor<
  T,
  OkResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T | OkResponse<T>>,
  ): Observable<OkResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;

        if (this.isFormattedResponse(data)) {
          return { ...data, statusCode: data.statusCode ?? statusCode };
        }

        if (typeof data === 'string') {
          return ResponseFormatter.Ok<T>({ message: data, statusCode });
        }

        return ResponseFormatter.Ok({ data, statusCode });
      }),
    );
  }

  private isFormattedResponse(value: unknown): value is OkResponse<T> {
    return (
      value !== null &&
      typeof value === 'object' &&
      'success' in value &&
      value.success === true &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }
}
