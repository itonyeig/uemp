import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AcademicHistory,
  ApiResponse,
  AvailableCourses,
  ProfileChanges,
  RegistrationSummary,
  Student,
} from './models';

@Injectable({ providedIn: 'root' })
export class StudentApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  profile() {
    return this.http
      .get<ApiResponse<{ student: Student }>>(`${this.base}/students/me`)
      .pipe(map((r) => r.data.student));
  }
  updateProfile(changes: ProfileChanges) {
    return this.http
      .patch<ApiResponse<{ student: Student }>>(`${this.base}/students/me`, changes)
      .pipe(map((r) => r.data.student));
  }
  availableCourses() {
    return this.http
      .get<ApiResponse<AvailableCourses>>(`${this.base}/registration/available-courses`)
      .pipe(map((r) => r.data));
  }
  registrations() {
    return this.http
      .get<ApiResponse<RegistrationSummary>>(`${this.base}/registration`)
      .pipe(map((r) => r.data));
  }
  register(offeringIds: string[]) {
    return this.http
      .post<ApiResponse<RegistrationSummary>>(`${this.base}/registration`, { offeringIds })
      .pipe(map((r) => r.data));
  }
  results() {
    return this.http
      .get<ApiResponse<AcademicHistory>>(`${this.base}/students/me/results`)
      .pipe(map((r) => r.data));
  }
}
