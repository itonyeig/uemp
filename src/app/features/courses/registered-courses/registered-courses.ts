import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StudentApi } from '../../../core/student-api';
import { apiError } from '../../../core/api-error';
import { RegistrationSummary } from '../../../core/models';
import { PrintHeading } from '../../../shared/print-heading/print-heading';

@Component({
  selector: 'app-registered-courses',
  imports: [RouterLink, DatePipe, PrintHeading],
  templateUrl: './registered-courses.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisteredCourses {
  private readonly api = inject(StudentApi);
  readonly data = signal<RegistrationSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await firstValueFrom(this.api.registrations()));
    } catch (error) {
      this.error.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
  print() {
    window.print();
  }
}
