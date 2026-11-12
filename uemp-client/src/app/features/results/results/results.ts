import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { StudentApi } from '../../../core/student-api';
import { apiError } from '../../../core/api-error';
import { AcademicHistory } from '../../../core/models';
import { PrintHeading } from '../../../shared/print-heading/print-heading';

@Component({
  selector: 'app-results',
  imports: [DecimalPipe, PrintHeading],
  templateUrl: './results.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Results {
  private readonly api = inject(StudentApi);
  readonly data = signal<AcademicHistory | null>(null);
  readonly selectedSemester = signal('');
  readonly visibleSemesters = computed(
    () =>
      this.data()?.semesters.filter(
        (s) => !this.selectedSemester() || s.semester._id === this.selectedSemester(),
      ) ?? [],
  );
  readonly loading = signal(true);
  readonly error = signal('');
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.data.set(await firstValueFrom(this.api.results()));
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
