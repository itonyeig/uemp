import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Auth } from '../../core/auth';
import { apiError } from '../../core/api-error';

@Component({
  selector: 'app-student-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './student-layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentLayout {
  readonly auth = inject(Auth);
  readonly menuOpen = signal(false);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly logoutError = signal('');
  readonly signingOut = signal(false);
  readonly links = [
    { path: 'dashboard', label: 'Overview', icon: '◫' },
    { path: 'courses', label: 'Course registration', icon: '＋' },
    { path: 'registered-courses', label: 'Registered courses', icon: '▤' },
    { path: 'results', label: 'Results & history', icon: '▥' },
    { path: 'profile', label: 'My profile', icon: '○' },
  ];
  constructor() {
    void this.load();
  }
  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.loadStudent();
    } catch (error) {
      this.error.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
  async logout() {
    if (this.signingOut()) return;
    this.signingOut.set(true);
    this.logoutError.set('');
    try {
      await this.auth.logout();
    } catch (error) {
      this.logoutError.set(apiError(error));
    } finally {
      this.signingOut.set(false);
    }
  }
}
