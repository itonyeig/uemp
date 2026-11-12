import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0)
      return 'Unable to reach the portal service. Check your connection and try again.';
    const message: unknown = error.error?.message;
    if (Array.isArray(message)) return message.filter((item) => typeof item === 'string').join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (error.status === 403) return 'You do not have permission to access this information.';
  }
  return 'Something went wrong. Please try again.';
}
