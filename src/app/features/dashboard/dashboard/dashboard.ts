import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../core/auth';
import { StudentApi } from '../../../core/student-api';
import { AcademicHistory, RegistrationSummary } from '../../../core/models';
import { apiError } from '../../../core/api-error';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly auth = inject(Auth);
  private readonly api = inject(StudentApi);
  readonly registration = signal<RegistrationSummary | null>(null);
  readonly history = signal<AcademicHistory | null>(null);
  readonly loading = signal(true);
  readonly registrationError = signal('');
  readonly resultsError = signal('');
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.registrationError.set('');
    this.resultsError.set('');
    await Promise.all([
      firstValueFrom(this.api.registrations())
        .then((data) => this.registration.set(data))
        .catch((error) => this.registrationError.set(apiError(error))),
      firstValueFrom(this.api.results())
        .then((data) => this.history.set(data))
        .catch((error) => this.resultsError.set(apiError(error))),
    ]);
    this.loading.set(false);
  }
}
