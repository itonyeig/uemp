import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Auth } from '../../core/auth';

@Component({
  selector: 'app-print-heading',
  imports: [DatePipe],
  templateUrl: './print-heading.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintHeading {
  readonly auth = inject(Auth);
  readonly title = input.required<string>();
  readonly date = new Date();
}
