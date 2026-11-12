import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Auth } from './auth';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(Auth);
  const isApi = request.url.startsWith(`${environment.apiUrl}/`);
  const isLogin = request.url === `${environment.apiUrl}/auth/login`;
  const token = isApi && !isLogin ? auth.token() : null;
  const authenticated = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  return next(authenticated).pipe(
    catchError((error: unknown) => {
      // A delayed response from an older session must not sign out a new login.
      if (
        isApi &&
        !isLogin &&
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token === auth.token()
      )
        auth.expire();
      return throwError(() => error);
    }),
  );
};
