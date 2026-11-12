import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, LoginResponse, Student } from './models';
import { StudentApi } from './student-api';

interface StoredSession {
  token: string;
  expiresAt: string;
}
export const SESSION_KEY = 'uemp.student.session';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly api = inject(StudentApi);
  private readonly session = signal<StoredSession | null>(this.restore());
  private expiryTimer?: ReturnType<typeof setTimeout>;
  readonly student = signal<Student | null>(null);
  readonly notice = signal('');
  readonly initials = computed(
    () => `${this.student()?.firstName.charAt(0) ?? ''}${this.student()?.lastName.charAt(0) ?? ''}`,
  );
  constructor() {
    this.scheduleExpiry();
  }
  token(): string | null {
    const session = this.session();
    return session && Date.parse(session.expiresAt) > Date.now() ? session.token : null;
  }
  async login(email: string, password: string) {
    const { data } = await firstValueFrom(
      this.http.post<ApiResponse<LoginResponse>>(`${environment.apiUrl}/auth/login`, {
        email,
        password,
      }),
    );
    const session = { token: data.token, expiresAt: data.expiresAt };
    this.session.set(session);
    this.student.set(data.student);
    this.notice.set('');
    // Tab-scoped storage survives a refresh without persisting profile data.
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* Use a memory-only session if storage is unavailable. */
    }
    this.scheduleExpiry();
  }
  async loadStudent() {
    const student = await firstValueFrom(this.api.profile());
    this.student.set(student);
    return student;
  }
  async logout() {
    await firstValueFrom(
      this.http.post<ApiResponse<undefined>>(`${environment.apiUrl}/auth/logout`, {}),
    );
    this.clear();
    this.notice.set('You have been signed out.');
    await this.router.navigateByUrl('/student/login');
  }
  expire() {
    if (!this.session()) return;
    this.clear();
    this.notice.set('Your session has ended. Please sign in again.');
    void this.router.navigate(['/student/login']);
  }
  clear() {
    this.session.set(null);
    this.student.set(null);
    clearTimeout(this.expiryTimer);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Storage may be disabled. */
    }
  }
  private restore(): StoredSession | null {
    try {
      const value = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) ?? 'null',
      ) as StoredSession | null;
      if (
        value &&
        typeof value.token === 'string' &&
        value.token &&
        typeof value.expiresAt === 'string' &&
        Date.parse(value.expiresAt) > Date.now()
      )
        return value;
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* A malformed or unavailable stored session is treated as signed out. */
    }
    return null;
  }
  private scheduleExpiry() {
    clearTimeout(this.expiryTimer);
    const session = this.session();
    if (session)
      this.expiryTimer = setTimeout(
        () => this.expire(),
        Math.min(Math.max(0, Date.parse(session.expiresAt) - Date.now()), 2_147_483_647),
      );
  }
}
