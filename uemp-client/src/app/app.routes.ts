import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'student' },
  {
    path: 'student/login',
    title: 'Sign in · UEMP',
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'student',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layouts/student-layout/student-layout').then((m) => m.StudentLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · UEMP',
        loadComponent: () =>
          import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'profile',
        title: 'My profile · UEMP',
        loadComponent: () => import('./features/profile/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'courses',
        title: 'Course registration · UEMP',
        loadComponent: () => import('./features/courses/courses/courses').then((m) => m.Courses),
      },
      {
        path: 'registered-courses',
        title: 'Registered courses · UEMP',
        loadComponent: () =>
          import('./features/courses/registered-courses/registered-courses').then(
            (m) => m.RegisteredCourses,
          ),
      },
      {
        path: 'results',
        title: 'Results & history · UEMP',
        loadComponent: () => import('./features/results/results/results').then((m) => m.Results),
      },
    ],
  },
  { path: '**', redirectTo: 'student' },
];
