import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StudentApi } from '../../../core/student-api';
import { apiError } from '../../../core/api-error';
import { AvailableCourse, AvailableCourses } from '../../../core/models';

@Component({
  selector: 'app-courses',
  imports: [RouterLink],
  templateUrl: './courses.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Courses {
  private readonly api = inject(StudentApi);
  readonly data = signal<AvailableCourses | null>(null);
  readonly emptySelection: ReadonlySet<string> = new Set();
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly loadError = signal('');
  readonly success = signal('');
  readonly selectedCourses = computed(
    () =>
      this.data()?.courses.filter(
        (course) => this.selected().has(course.offeringId) && !course.registered,
      ) ?? [],
  );
  readonly selectedUnits = computed(() =>
    this.selectedCourses().reduce((sum, course) => sum + course.creditUnits, 0),
  );
  readonly projectedUnits = computed(
    () => (this.data()?.registeredCreditUnits ?? 0) + this.selectedUnits(),
  );
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.loadError.set('');
    try {
      const data = await firstValueFrom(this.api.availableCourses());
      this.data.set(data);
      const eligible = new Set(data.courses.filter((c) => !c.registered).map((c) => c.offeringId));
      this.selected.update((selected) => new Set([...selected].filter((id) => eligible.has(id))));
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
  toggle(course: AvailableCourse) {
    if (course.registered || this.busy()) return;
    this.success.set('');
    this.error.set('');
    this.selected.update((current) => {
      const next = new Set(current);
      if (next.has(course.offeringId)) next.delete(course.offeringId);
      else next.add(course.offeringId);
      return next;
    });
  }
  async register() {
    if (this.busy() || this.loading() || this.loadError() || !this.selectedCourses().length) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const summary = await firstValueFrom(
        this.api.register(this.selectedCourses().map((c) => c.offeringId)),
      );
      this.selected.set(new Set());
      this.success.set(
        'Courses registered successfully. You now have ' +
          summary.courses.length +
          ' registered courses (' +
          summary.totalCreditUnits +
          ' credit units).',
      );
    } catch (error) {
      this.error.set(apiError(error));
    }
    // Refresh on both success and rejection: another tab may have registered a course.
    await this.load();
    this.busy.set(false);
  }
}
