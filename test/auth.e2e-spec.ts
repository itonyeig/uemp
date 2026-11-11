import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import { type Model, Types } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AcademicService } from '../src/academic/academic.service';
import { Department } from '../src/academic/schema/department.schema';
import { Faculty } from '../src/academic/schema/faculty.schema';
import { Program } from '../src/academic/schema/program.schema';
import { AppModule } from '../src/app.module';
import { AuditLog } from '../src/audit/schema/audit-log.schema';
import type { SessionTokenPayload } from '../src/auth/interface/auth.interface';
import {
  Session,
  SessionRevocationReason,
  SessionUserType,
} from '../src/auth/schema/session.schema';
import { configureApp } from '../src/config/configure-app';
import { Student } from '../src/student/schema/student.schema';
import { StudentService } from '../src/student/student.service';

describe('Student authentication (e2e)', () => {
  const path = '/api/v1/auth';
  const mePath = '/api/v1/students/me';
  const email = `student-${randomUUID()}@example.com`;
  const password = 'DemoStudentPass123!';
  const studentDto = {
    email: ` ${email.toUpperCase()} `,
    password,
    firstName: ' Tobi ',
    lastName: 'Ade',
    program: '',
    academicLevel: 100,
  };
  let app: INestApplication<App>;
  let studentModel: Model<Student>;
  let sessionModel: Model<Session>;
  let faculty: Faculty;
  let department: Department;
  let program: Program;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    studentModel = app.get(getModelToken(Student.name));
    sessionModel = app.get(getModelToken(Session.name));

    const academic = app.get(AcademicService);
    [faculty] = await academic.createFaculties([
      { name: `Test faculty ${randomUUID()}` },
    ]);
    [department] = await academic.createDepartments([
      { name: 'Test department', faculty: faculty._id },
    ]);
    [program] = await academic.createPrograms([
      { name: 'Test program', department: department._id },
    ]);
    studentDto.program = program._id.toString();

    const [created] = await app
      .get(StudentService)
      .create([{ ...studentDto, email, firstName: 'Tobi' }]);

    expect(created).toMatchObject({
      email,
      firstName: 'Tobi',
      program: program._id,
      academicLevel: 100,
      matricNumber: expect.stringMatching(/^\d{16}$/) as string,
    });
    expect(created).not.toHaveProperty('passwordHash');

    const student = await studentModel
      .findOne({ email })
      .select('+passwordHash')
      .orFail()
      .exec();
    expect(student.passwordHash).toMatch(/^\$2b\$12\$/);
  });

  afterAll(async () => {
    try {
      if (studentModel && sessionModel) {
        const student = await studentModel.findOne({ email }).lean().exec();

        if (student) {
          await app
            .get<Model<AuditLog>>(getModelToken(AuditLog.name))
            .deleteMany({ actor: student._id })
            .exec();
          await sessionModel
            .deleteMany({
              user: student._id,
              userType: SessionUserType.STUDENT,
            })
            .exec();
          await studentModel.deleteOne({ _id: student._id }).exec();
        }
      }
      if (program) {
        await app
          .get<Model<Program>>(getModelToken(Program.name))
          .deleteOne({ _id: program._id });
      }
      if (department) {
        await app
          .get<Model<Department>>(getModelToken(Department.name))
          .deleteOne({ _id: department._id });
      }
      if (faculty) {
        await app
          .get<Model<Faculty>>(getModelToken(Faculty.name))
          .deleteOne({ _id: faculty._id });
      }
    } finally {
      await app?.close();
    }
  });

  function login() {
    return request(app.getHttpServer())
      .post(`${path}/login`)
      .send({ email, password })
      .expect(200);
  }

  function getToken(response: request.Response) {
    const body = response.body as { data?: { token?: unknown } };
    if (typeof body.data?.token !== 'string') {
      throw new Error('Expected a bearer token');
    }
    return body.data.token;
  }

  it('rejects a duplicate email regardless of whitespace or case', async () => {
    await expect(
      app.get(StudentService).create([{ ...studentDto }]),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it('creates students through the endpoint at 100 level by default', async () => {
    const otherEmail = `other-${email}`;
    try {
      const response = await request(app.getHttpServer())
        .post(`${path}/students`)
        .send({ ...studentDto, email: otherEmail, academicLevel: undefined })
        .expect(201);
      expect(response.body).toHaveProperty('data.email', otherEmail);
      expect(response.body).toHaveProperty('data.academicLevel', 100);
      expect(response.body).not.toHaveProperty('data.passwordHash');

      await request(app.getHttpServer())
        .post(`${path}/students`)
        .send({ ...studentDto, email: 1 })
        .expect(400);
    } finally {
      await studentModel.deleteOne({ email: otherEmail }).exec();
    }
  });

  it('rejects invalid credentials, unknown programs and unauthenticated requests', async () => {
    await expect(
      app.get(StudentService).create([
        {
          ...studentDto,
          email: `other-${email}`,
          program: new Types.ObjectId().toHexString(),
        },
      ]),
    ).rejects.toThrow('Program not found');

    await request(app.getHttpServer())
      .post(`${path}/login`)
      .send({ email, password: 'wrong-password' })
      .expect(401);

    await request(app.getHttpServer()).get(mePath).expect(401);
    await request(app.getHttpServer()).post(`${path}/logout`).expect(401);
  });

  it('rotates sessions on login and keeps the revoked record on logout', async () => {
    const firstLogin = await login();
    const firstToken = getToken(firstLogin);
    const payload = app.get(JwtService).verify<SessionTokenPayload>(firstToken);
    expect(firstLogin.headers['set-cookie']).toBeUndefined();
    expect(firstLogin.body).not.toHaveProperty('data.sessionId');
    expect(firstLogin.body).not.toHaveProperty('data.student.passwordHash');
    expect(firstLogin.headers['cache-control']).toBe('no-store');

    const firstStudent = await studentModel.findOne({ email }).orFail().exec();
    const secondToken = getToken(await login());
    expect(secondToken).not.toBe(firstToken);

    await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${firstToken}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty('message', 'Session has been revoked');
      });

    await request(app.getHttpServer())
      .get(mePath)
      .set('Cookie', `uemp_session=${secondToken}`)
      .expect(401);

    const me = await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200);
    expect(me.body).toHaveProperty('data.student.email', email);
    expect(me.body).toHaveProperty('data.student.academicLevel', 100);
    expect(me.body).toHaveProperty('data.student.program.name', program.name);
    expect(me.body).toHaveProperty(
      'data.student.department.name',
      department.name,
    );
    expect(me.body).toHaveProperty('data.student.faculty.name', faculty.name);
    expect(me.body).toHaveProperty(
      'data.student.matricNumber',
      firstStudent.matricNumber,
    );
    expect(me.body).not.toHaveProperty('data.student.passwordHash');

    await request(app.getHttpServer())
      .get(`${path}/me`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(404);

    const invalidToken = secondToken.replace(/\.[^.]+$/, '.bad-signature');
    await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);

    const logout = await request(app.getHttpServer())
      .post(`${path}/logout`)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(200);
    expect(logout.headers['set-cookie']).toBeUndefined();

    await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${secondToken}`)
      .expect(401);

    const previous = await sessionModel.findById(payload.sid).orFail().exec();
    expect(isUUID(previous._id, '4')).toBe(true);
    expect(previous.user).toEqual(firstStudent._id);
    expect(previous.userType).toBe(SessionUserType.STUDENT);
    expect(previous.toObject()).not.toHaveProperty('tokenHash');
    expect(payload).toMatchObject({
      sub: firstStudent._id.toString(),
      sid: previous._id,
      exp: previous.expiresAt.getTime() / 1000,
    });
    expect(previous.revokedReason).toBe(SessionRevocationReason.NEW_LOGIN);

    const revoked = await sessionModel
      .findOne({
        user: firstStudent._id,
        userType: SessionUserType.STUDENT,
        revokedReason: SessionRevocationReason.LOGOUT,
      })
      .orFail()
      .exec();
    expect(revoked.revokedAt).toBeInstanceOf(Date);
  });

  it('reports expiry from the JWT and from the stored session', async () => {
    const token = getToken(await login());
    const jwtService = app.get(JwtService);
    const payload = jwtService.verify<SessionTokenPayload>(token);
    const expiredAt = new Date(Date.now() - 1_000);
    const expiredToken = jwtService.sign({
      ...payload,
      exp: Math.floor(expiredAt.getTime() / 1000),
    });

    await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty('message', 'Session has expired');
      });

    await sessionModel.updateOne(
      { _id: payload.sid },
      { expiresAt: expiredAt },
    );

    await request(app.getHttpServer())
      .get(mePath)
      .set('Authorization', `Bearer ${token}`)
      .expect(401)
      .expect(({ body }) => {
        expect(body).toHaveProperty('message', 'Session has expired');
      });
  });

  it('accepts exactly one session after concurrent logins', async () => {
    const logins = await Promise.all([login(), login()]);
    const results = await Promise.all(
      logins.map((response) =>
        request(app.getHttpServer())
          .get(mePath)
          .set('Authorization', `Bearer ${getToken(response)}`),
      ),
    );

    expect(results.map(({ status }) => status).sort()).toEqual([200, 401]);
  });
});
