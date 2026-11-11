import {
  BadRequestException,
  ConflictException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AcademicService,
  type SemesterSummary,
} from '../academic/academic.service';
import { CourseOffering } from '../academic/schema/course-offering.schema';
import { Course } from '../academic/schema/course.schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schema/audit-log.schema';
import { SessionUserType } from '../auth/schema/session.schema';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { MAX_SEMESTER_CREDIT_UNITS } from '../constants';
import type { StudentIdentity } from '../student/schema/student.schema';
import { CourseRegistration } from './schema/course-registration.schema';

type CourseSummary = Pick<Course, '_id' | 'code' | 'title' | 'creditUnits'>;
type OfferingWithCourse = Pick<CourseOffering, '_id'> & {
  course: CourseSummary;
};
type RegistrationWithCourse = Pick<
  CourseRegistration,
  '_id' | 'offering' | 'creditUnits' | 'createdAt'
> & { course: CourseSummary };

const courseSummaryPopulate = {
  path: 'course',
  select: {
    _id: 1,
    code: 1,
    title: 1,
    creditUnits: 1,
  } satisfies SelectAll<CourseSummary>,
};

@Injectable()
export class RegistrationService implements OnModuleInit {
  constructor(
    @InjectModel(CourseRegistration.name)
    private readonly registrationModel: Model<CourseRegistration>,
    @InjectModel(CourseOffering.name)
    private readonly offeringModel: Model<CourseOffering>,
    private readonly academicService: AcademicService,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.registrationModel.init();
  }

  async findAvailableCourses(student: StudentIdentity) {
    const semester = await this.academicService.findCurrentSemester();
    const [offerings, registrations] = await Promise.all([
      this.findEligibleOfferings(student, semester),
      this.findSemesterRegistrations(student._id, semester._id),
    ]);
    const registered = new Set(
      registrations.map(({ offering }) => offering.toHexString()),
    );

    return {
      semester,
      maxCreditUnits: MAX_SEMESTER_CREDIT_UNITS,
      registeredCreditUnits: sumCreditUnits(registrations),
      courses: offerings
        .map(({ _id, course }) => ({
          offeringId: _id,
          code: course.code,
          title: course.title,
          creditUnits: course.creditUnits,
          registered: registered.has(_id.toHexString()),
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
  }

  async findRegistrations(student: StudentIdentity) {
    const semester = await this.academicService.findCurrentSemester();
    return this.toRegistrationSummary(
      semester,
      await this.findSemesterRegistrations(student._id, semester._id),
    );
  }

  async register(student: StudentIdentity, offeringIds: string[], ip?: string) {
    const semester = await this.academicService.findCurrentSemester();
    const [offerings, existing] = await Promise.all([
      this.findEligibleOfferings(student, semester, offeringIds),
      this.findSemesterRegistrations(student._id, semester._id),
    ]);

    if (offerings.length !== offeringIds.length) {
      throw new BadRequestException(
        'One or more courses are not available for your program, level and the current semester',
      );
    }

    const registeredCourses = new Set(
      existing.map(({ course }) => course._id.toHexString()),
    );
    const duplicates = offerings.filter(({ course }) =>
      registeredCourses.has(course._id.toHexString()),
    );
    if (duplicates.length) {
      throw new ConflictException(
        `Already registered for ${duplicates.map(({ course }) => course.code).join(', ')}`,
      );
    }

    const totalUnits =
      sumCreditUnits(existing) +
      offerings.reduce((sum, { course }) => sum + course.creditUnits, 0);
    if (totalUnits > MAX_SEMESTER_CREDIT_UNITS) {
      throw new BadRequestException(
        `You can register at most ${MAX_SEMESTER_CREDIT_UNITS} credit units per semester (this would make ${totalUnits})`,
      );
    }

    await this.registrationModel.insertMany(
      offerings.map(({ _id, course }) => ({
        student: student._id,
        offering: _id,
        course: course._id,
        semester: semester._id,
        program: student.program,
        academicLevel: student.academicLevel,
        creditUnits: course.creditUnits,
      })),
    );

    await this.auditService.record({
      actor: student._id,
      actorType: SessionUserType.STUDENT,
      action: AuditAction.COURSE_REGISTRATION,
      details: {
        semester: semester._id,
        courses: offerings.map(({ course }) => course.code),
      },
      ip,
    });

    return this.findRegistrations(student);
  }

  private findEligibleOfferings(
    student: StudentIdentity,
    semester: SemesterSummary,
    offeringIds?: string[],
  ) {
    return this.offeringModel
      .find({
        ...(offeringIds && {
          _id: { $in: offeringIds.map((id) => new Types.ObjectId(id)) },
        }),
        semester: semester._id,
        eligibility: {
          $elemMatch: {
            program: student.program,
            academicLevel: student.academicLevel,
          },
        },
      })
      .select({ _id: 1, course: 1 })
      .populate<{ course: CourseSummary }>(courseSummaryPopulate)
      .lean<OfferingWithCourse[]>()
      .exec();
  }

  private findSemesterRegistrations(
    studentId: Types.ObjectId,
    semesterId: Types.ObjectId,
  ) {
    return this.registrationModel
      .find({ student: studentId, semester: semesterId })
      .select({ _id: 1, offering: 1, course: 1, creditUnits: 1, createdAt: 1 })
      .populate<{ course: CourseSummary }>(courseSummaryPopulate)
      .lean<RegistrationWithCourse[]>()
      .exec();
  }

  private toRegistrationSummary(
    semester: SemesterSummary,
    registrations: RegistrationWithCourse[],
  ) {
    return {
      semester,
      totalCreditUnits: sumCreditUnits(registrations),
      courses: registrations
        .map(({ _id, offering, course, creditUnits, createdAt }) => ({
          registrationId: _id,
          offeringId: offering,
          code: course.code,
          title: course.title,
          creditUnits,
          registeredAt: createdAt,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
  }
}

function sumCreditUnits(
  registrations: Pick<CourseRegistration, 'creditUnits'>[],
) {
  return registrations.reduce((sum, { creditUnits }) => sum + creditUnits, 0);
}
