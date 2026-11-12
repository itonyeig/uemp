import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(Auth);
  if (auth.token()) return true;
  auth.clear();
  return inject(Router).createUrlTree(['/student/login'], {
    queryParams: { returnUrl: state.url },
  });
};
