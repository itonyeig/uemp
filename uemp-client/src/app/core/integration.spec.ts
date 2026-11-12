import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth, SESSION_KEY } from './auth';
import { authInterceptor } from './auth-interceptor';
import { StudentApi } from './student-api';
import { environment } from '../../environments/environment';
import { apiError } from './api-error';
import { Student } from './models';

const base = environment.apiUrl;
const student: Student = {
  _id: 'student',
  firstName: 'Test',
  lastName: 'Student',
  email: 'student@example.test',
  matricNumber: '1234567890123456',
  phoneNumber: null,
  address: null,
  academicLevel: 100,
  program: null,
  department: null,
  faculty: null,
  isActive: true,
};
const wrap = <T>(data: T) => ({ success: true, statusCode: 200, message: 'OK', data });

describe('Student API and session integration', () => {
  let http: HttpTestingController;
  let auth: Auth;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
  });
  afterEach(() => {
    auth.clear();
    http.verify();
  });
  async function login() {
    const operation = auth.login('student@example.test', 'password');
    const request = http.expectOne(base + '/auth/login');
    expect(request.request.body).toEqual({ email: 'student@example.test', password: 'password' });
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(
      wrap({
        student,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      }),
    );
    await operation;
  }
  it('stores only the session, sends a bearer token, and unwraps the profile', async () => {
    await login();
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!)).not.toHaveProperty('student');
    const operation = firstValueFrom(TestBed.inject(StudentApi).profile());
    const request = http.expectOne(base + '/students/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush(wrap({ student }));
    expect(await operation).toEqual(student);
  });
  it('does not leak the token to an unrelated origin', async () => {
    await login();
    const operation = firstValueFrom(TestBed.inject(HttpClient).get('https://example.test/api'));
    const request = http.expectOne('https://example.test/api');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
    await operation;
  });
  it('submits offeringIds, with no student ID or academic fields', async () => {
    const operation = firstValueFrom(TestBed.inject(StudentApi).register(['offering-1']));
    const request = http.expectOne(base + '/registration');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ offeringIds: ['offering-1'] });
    request.flush(
      wrap({
        courses: [],
        totalCreditUnits: 0,
        semester: { _id: 's', number: 1, session: '2026/2027' },
      }),
    );
    await operation;
  });
  it('clears a rejected session and redirects to login on a protected 401', async () => {
    await login();
    const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const operation = firstValueFrom(TestBed.inject(StudentApi).profile()).catch((error) => error);
    http
      .expectOne(base + '/students/me')
      .flush({ message: 'Session has been revoked' }, { status: 401, statusText: 'Unauthorized' });
    await operation;
    expect(auth.token()).toBeNull();
    expect(auth.student()).toBeNull();
    expect(navigation).toHaveBeenCalledWith(['/student/login']);
  });
  it('revokes the server session before clearing local state on logout', async () => {
    await login();
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const operation = auth.logout();
    const request = http.expectOne(base + '/auth/logout');
    expect(request.request.method).toBe('POST');
    expect(auth.token()).toBe('test-token');
    request.flush(wrap(undefined));
    await operation;
    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });
  it('displays validation lists and connection failures clearly', () => {
    expect(
      apiError(
        new HttpErrorResponse({
          status: 400,
          error: { message: ['Invalid course', 'Duplicate offering'] },
        }),
      ),
    ).toBe('Invalid course Duplicate offering');
    expect(apiError(new HttpErrorResponse({ status: 0 }))).toContain('Unable to reach');
  });
  it('rejects an expired stored session', () => {
    auth.clear();
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: 'expired', expiresAt: '2000-01-01T00:00:00.000Z' }),
    );
    const restored = TestBed.runInInjectionContext(() => new Auth());
    expect(restored.token()).toBeNull();
  });
});
