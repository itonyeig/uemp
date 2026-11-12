import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Courses } from './courses';
import { StudentApi } from '../../../core/student-api';
import { AvailableCourses } from '../../../core/models';

const initial: AvailableCourses = {
  semester: { _id: 'semester', number: 1, session: '2026/2027' },
  maxCreditUnits: 24,
  registeredCreditUnits: 3,
  courses: [
    {
      offeringId: 'existing',
      code: 'CSC101',
      title: 'Computing',
      creditUnits: 3,
      registered: true,
    },
    { offeringId: 'new', code: 'CSC103', title: 'Programming', creditUnits: 3, registered: false },
  ],
};
describe('Course registration', () => {
  function setup() {
    const api = {
      availableCourses: vi.fn().mockReturnValue(of(initial)),
      register: vi
        .fn()
        .mockReturnValue(
          of({ courses: [{}, {}], totalCreditUnits: 6, semester: initial.semester }),
        ),
    };
    TestBed.configureTestingModule({
      imports: [Courses],
      providers: [provideRouter([]), { provide: StudentApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(Courses);
    return { fixture, component: fixture.componentInstance, api };
  }
  it('disables registered courses, submits selected IDs, and refreshes after success', async () => {
    const { fixture, component, api } = setup();
    await fixture.whenStable();
    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type=checkbox]',
    ) as NodeListOf<HTMLInputElement>;
    expect(checkboxes[0].disabled).toBe(true);
    checkboxes[1].click();
    await fixture.whenStable();
    expect(component.selectedUnits()).toBe(3);
    api.availableCourses.mockReturnValue(
      of({
        ...initial,
        registeredCreditUnits: 6,
        courses: initial.courses.map((c) => ({ ...c, registered: true })),
      }),
    );
    await component.register();
    await fixture.whenStable();
    expect(api.register).toHaveBeenCalledWith(['new']);
    expect(api.availableCourses).toHaveBeenCalledTimes(2);
    expect(component.selectedCourses()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Courses registered successfully');
    expect((fixture.nativeElement.querySelectorAll('input')[1] as HTMLInputElement).disabled).toBe(
      true,
    );
  });
  it('shows server duplicate errors and reconciles stale selections', async () => {
    const { fixture, component, api } = setup();
    await fixture.whenStable();
    component.toggle(initial.courses[1]);
    api.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { message: 'Already registered for CSC103' },
          }),
      ),
    );
    api.availableCourses.mockReturnValue(
      of({ ...initial, courses: initial.courses.map((c) => ({ ...c, registered: true })) }),
    );
    await component.register();
    await fixture.whenStable();
    expect(component.error()).toBe('Already registered for CSC103');
    expect(component.selectedCourses()).toEqual([]);
    expect(component.busy()).toBe(false);
  });
});
