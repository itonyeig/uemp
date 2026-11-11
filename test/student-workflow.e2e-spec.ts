import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Model, Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { CourseOffering } from '../src/academic/schema/course-offering.schema';
import { AppModule } from '../src/app.module';
import { AuditAction, AuditLog } from '../src/audit/schema/audit-log.schema';
import { Session } from '../src/auth/schema/session.schema';
import { configureApp } from '../src/config/configure-app';
import { CourseRegistration } from '../src/registration/schema/course-registration.schema';
import { gradeResult } from '../src/result/grading';
import { Result, ResultStatus } from '../src/result/schema/result.schema';
import { requireSeedId, seedAcademics } from '../src/seed/seed-academics';
import type { SeedSemesterKey } from '../src/seed/academic-fixtures';
import { Student } from '../src/student/schema/student.schema';
import { StudentService } from '../src/student/student.service';

type CourseItem = { code: string; offeringId: string; registered: boolean };

describe('Student workflow (e2e)', () => {
  const api = '/api/v1';
  const email = `workflow-${randomUUID()}@example.com`;
  const password = 'DemoStudentPass123!';
  let app: INestApplication<App>;
  let token: string;
  let studentId: Types.ObjectId;
  let programId: Types.ObjectId;
  let ids: Awaited<ReturnType<typeof seedAcademics>>;
  const studentIds: Types.ObjectId[] = [];

  const model = <T>(name: string) => app.get<Model<T>>(getModelToken(name));
  const call = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())
      [method](`${api}${path}`)
      .set('Authorization', `Bearer ${token}`);

  async function offeringId(
    code: string,
    semester: SeedSemesterKey = 'current',
  ) {
    const offering = await model<CourseOffering>(CourseOffering.name)
      .findOne({
        course: requireSeedId(ids.courseIds, code),
        semester: requireSeedId(ids.semesterIds, semester),
      })
      .orFail()
      .lean()
      .exec();
    return offering._id;
  }

  async function createWorkflowStudent(email: string) {
    const [student] = await app.get(StudentService).create([
      {
        email,
        password,
        firstName: 'Workflow',
        lastName: 'Student',
        program: programId.toHexString(),
        academicLevel: 100,
      },
    ]);
    studentIds.push(student._id);

    const login = await request(app.getHttpServer())
      .post(`${api}/auth/login`)
      .send({ email, password })
      .expect(200);
    return {
      studentId: student._id,
      token: (login.body as { data: { token: string } }).data.token,
    };
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    ids = await seedAcademics(app);
    programId = requireSeedId(ids.programIds, 'computer-science');
    ({ studentId, token } = await createWorkflowStudent(email));
  });

  afterAll(async () => {
    try {
      if (studentIds.length > 0) {
        const testStudents = { $in: studentIds };
        const registrations = model<CourseRegistration>(
          CourseRegistration.name,
        );
        await Promise.all([
          model<Result>(Result.name)
            .deleteMany({ student: testStudents })
            .exec(),
          registrations.deleteMany({ student: testStudents }).exec(),
          model<AuditLog>(AuditLog.name)
            .deleteMany({ actor: testStudents })
            .exec(),
          model<Session>(Session.name)
            .deleteMany({ user: testStudents })
            .exec(),
          model<Student>(Student.name).deleteMany({ _id: testStudents }).exec(),
        ]);
      }
    } finally {
      await app?.close();
    }
  });

  it('lists only courses for the program, level and current semester', async () => {
    const response = await call(
      'get',
      '/registration/available-courses',
    ).expect(200);
    const { data } = response.body as {
      data: { semester: object; courses: CourseItem[] };
    };
    const codes = data.courses.map(({ code }) => code);

    expect(data.semester).toMatchObject({ session: '2026/2027', number: 1 });
    expect(codes).toEqual(
      expect.arrayContaining(['CSC100', 'CSC101', 'MTH101']),
    );
    expect(codes).not.toContain('MTH103');
    expect(codes).not.toContain('CSC201');
    expect(codes).not.toContain('CSC102');
  });

  it('registers courses and blocks duplicates, ineligible courses and overloads', async () => {
    const csc101 = await offeringId('CSC101');
    const registered = await call('post', '/registration')
      .send({ offeringIds: [csc101] })
      .expect(201);
    expect(registered.body).toMatchObject({
      data: {
        totalCreditUnits: 3,
        courses: [{ code: 'CSC101', creditUnits: 3 }],
      },
    });

    await call('post', '/registration')
      .send({ offeringIds: [csc101] })
      .expect(409);
    await call('post', '/registration')
      .send({ offeringIds: [await offeringId('MTH103')] })
      .expect(400);
    await call('post', '/registration')
      .send({ offeringIds: [await offeringId('CSC102', 'previous')] })
      .expect(400);

    const available = await call('get', '/registration/available-courses');
    const remaining = (
      available.body as { data: { courses: CourseItem[] } }
    ).data.courses
      .filter(({ registered }) => !registered)
      .map(({ offeringId }) => offeringId);
    await call('post', '/registration')
      .send({ offeringIds: remaining })
      .expect(400);

    const list = await call('get', '/registration').expect(200);
    expect(list.body).toMatchObject({
      data: { totalCreditUnits: 3, courses: [{ code: 'CSC101' }] },
    });

    const audit = await model<AuditLog>(AuditLog.name)
      .findOne({ actor: studentId, action: AuditAction.COURSE_REGISTRATION })
      .orFail()
      .lean()
      .exec();
    expect(audit.details).toMatchObject({ courses: ['CSC101'] });
  });

  it('shows only approved results with GPA and CGPA', async () => {
    const semester = requireSeedId(ids.semesterIds, 'earlier');
    for (const [code, caScore, examScore, status] of [
      ['CSC101', 30, 42, ResultStatus.APPROVED],
      ['CSC103', 18, 30, ResultStatus.SUBMITTED],
    ] as const) {
      const course = requireSeedId(ids.courseIds, code);
      const registration = await model<CourseRegistration>(
        CourseRegistration.name,
      ).create({
        student: studentId,
        offering: await offeringId(code, 'earlier'),
        course,
        semester,
        program: programId,
        academicLevel: 100,
        creditUnits: 3,
      });
      await model<Result>(Result.name).create({
        registration: registration._id,
        student: studentId,
        course,
        semester,
        creditUnits: 3,
        caScore,
        examScore,
        ...gradeResult(caScore, examScore),
        status,
      });
    }

    const response = await call('get', '/students/me/results').expect(200);
    const body = response.body as {
      data: { semesters: { results: unknown[] }[] };
    };
    expect(body).toMatchObject({
      data: {
        cgpa: 5,
        totalCreditUnits: 3,
        semesters: [
          {
            semester: { session: '2025/2026', number: 1 },
            gpa: 5,
            results: [{ code: 'CSC101', totalScore: 72, grade: 'A' }],
          },
        ],
      },
    });
    expect(body.data.semesters[0].results).toHaveLength(1);
  });

  it('updates permitted profile fields and never protected ones', async () => {
    const updated = await call('patch', '/students/me')
      .send({ phoneNumber: '+2348012345678', address: '12 Unity Road' })
      .expect(200);
    expect(updated.body).toMatchObject({
      data: {
        student: { phoneNumber: '+2348012345678', address: '12 Unity Road' },
      },
    });

    await call('patch', '/students/me')
      .send({ phoneNumber: 'not-a-phone' })
      .expect(400);

    await call('patch', '/students/me')
      .send({ academicLevel: 500, matricNumber: '0000000000000000' })
      .expect(({ status }) => expect([200, 400]).toContain(status));

    const me = await call('get', '/students/me').expect(200);
    expect(me.body).toMatchObject({
      data: { student: { academicLevel: 100 } },
    });
    expect(me.body).not.toHaveProperty(
      'data.student.matricNumber',
      '0000000000000000',
    );
  });
});
