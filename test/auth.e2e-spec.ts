import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { Model } from 'mongoose';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import type { SessionTokenPayload } from '../src/auth/interface/auth.interface';
import {
  Session,
  SessionRevocationReason,
  SessionUserType,
} from '../src/auth/schema/session.schema';
import { configureApp } from '../src/config/configure-app';
import { Student } from '../src/student/schema/student.schema';

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
  };
  let app: INestApplication<App>;
  let studentModel: Model<Student>;
  let sessionModel: Model<Session>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();

    studentModel = app.get(getModelToken(Student.name));
    sessionModel = app.get(getModelToken(Session.name));

    const created = await request(app.getHttpServer())
      .post(`${path}/students`)
      .send(studentDto)
      .expect(201);

    expect(created.body).toHaveProperty('data.email', email);
    expect(created.body).toHaveProperty('data.firstName', 'Tobi');
    expect(created.body).not.toHaveProperty('data.passwordHash');
    expect(created.headers['set-cookie']).toBeUndefined();

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
          await sessionModel
            .deleteMany({
              user: student._id,
              userType: SessionUserType.STUDENT,
            })
            .exec();
          await studentModel.deleteOne({ _id: student._id }).exec();
        }
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
    await request(app.getHttpServer())
      .post(`${path}/students`)
      .send({ ...studentDto, email })
      .expect(409)
      .expect({
        success: false,
        statusCode: 409,
        error: 'ConflictException',
        message: 'This email is already registered',
      });
  });

  it('validates signup fields and rejects invalid credentials and unauthenticated requests', async () => {
    await request(app.getHttpServer())
      .post(`${path}/students`)
      .send({ ...studentDto, email: 1, firstName: {} })
      .expect(400);

    await request(app.getHttpServer())
      .post(`${path}/students`)
      .send({ ...studentDto, password: 'é'.repeat(37) })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toHaveProperty(
          'message',
          'Password must be 72 bytes or fewer',
        );
      });

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
