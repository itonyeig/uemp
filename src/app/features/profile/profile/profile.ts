import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Auth } from '../../../core/auth';
import { StudentApi } from '../../../core/student-api';
import { apiError } from '../../../core/api-error';
import { ProfileChanges } from '../../../core/models';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './profile.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Profile {
  readonly auth = inject(Auth);
  private readonly api = inject(StudentApi);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly success = signal('');
  readonly form = inject(NonNullableFormBuilder).group({
    phoneNumber: [this.auth.student()?.phoneNumber ?? '', [Validators.pattern(/^\+?\d{7,15}$/)]],
    address: [this.auth.student()?.address ?? '', [Validators.maxLength(300)]],
  });
  async save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.busy()) return;
    const { phoneNumber, address } = this.form.getRawValue();
    const changes: ProfileChanges = {};
    if (this.form.controls.phoneNumber.dirty) {
      if (!phoneNumber.trim()) {
        this.error.set(
          'Enter a phone number with 7–15 digits. An existing phone number cannot be cleared here.',
        );
        return;
      }
      changes.phoneNumber = phoneNumber.trim();
    }
    if (this.form.controls.address.dirty) changes.address = address.trim();
    if (!Object.keys(changes).length) return;
    this.busy.set(true);
    this.error.set('');
    this.success.set('');
    try {
      const student = await firstValueFrom(this.api.updateProfile(changes));
      this.auth.student.set(student);
      this.form.reset({ phoneNumber: student.phoneNumber ?? '', address: student.address ?? '' });
      this.success.set('Your contact information has been updated.');
    } catch (error) {
      this.error.set(apiError(error));
    } finally {
      this.busy.set(false);
    }
  }
}
