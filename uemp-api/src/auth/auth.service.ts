import {
  ConflictException,
  ForbiddenException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { isMongoId, isUUID } from 'class-validator';
import { Model, Types, mongo } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schema/audit-log.schema';
import { verifyPassword } from '../common/utils/password';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { SESSION_DURATION_MS } from '../constants';
import {
  Student,
  type StudentIdentity,
  toStudentIdentity,
} from '../student/schema/student.schema';
import { StudentService } from '../student/student.service';
import { LoginDto } from './dto/login.dto';
import type { SessionTokenPayload } from './interface/auth.interface';
import {
  Session,
  SessionRevocationReason,
  SessionUserType,
} from './schema/session.schema';

type SessionStudent = StudentIdentity;
type SessionForAuthentication = Omit<Session, 'user'> & {
  user: SessionStudent | null;
};

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<Session>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly studentService: StudentService,
  ) {}

  async onModuleInit() {
    await this.sessionModel.init();
  }

  async login(loginDto: LoginDto, ip?: string) {
    const student = await this.studentModel
      .findOne({ email: loginDto.email })
      .select('+passwordHash')
      .lean()
      .exec();

    if (!student) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await verifyPassword(
      loginDto.password,
      student?.passwordHash,
    );

    if (!student?.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const profile = await this.studentService.populateProfile(student);
    const owner = { user: student._id, userType: SessionUserType.STUDENT };
    const exp = Math.floor((Date.now() + SESSION_DURATION_MS) / 1000);
    const expiresAt = new Date(exp * 1000);

    for (let attempt = 0; attempt < 2; attempt++) {
      const payload: SessionTokenPayload = {
        sub: student._id.toString(),
        sid: randomUUID(),
        exp,
      };
      const token = await this.jwtService.signAsync(payload);

      await this.sessionModel
        .updateOne(
          { ...owner, revokedAt: null },
          {
            $set: {
              revokedAt: new Date(),
              revokedReason: SessionRevocationReason.NEW_LOGIN,
            },
          },
        )
        .exec();

      try {
        await this.sessionModel.create({
          ...owner,
          _id: payload.sid,
          expiresAt,
        });
        await this.auditService.record({
          ...this.auditActor(student._id),
          action: AuditAction.LOGIN,
          ip,
        });
        return { student: profile, token, expiresAt };
      } catch (error: unknown) {
        if (
          !(error instanceof mongo.MongoServerError) ||
          error.code !== 11000
        ) {
          throw error;
        }
      }
    }

    throw new ConflictException(
      'Another login is in progress. Please try again',
    );
  }

  async authenticate(token: string) {
    let payload: SessionTokenPayload;
    try {
      payload = this.jwtService.verify<SessionTokenPayload>(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Session has expired');
      }
      throw new UnauthorizedException('Invalid session token');
    }

    if (!isMongoId(payload.sub) || !isUUID(payload.sid, '4')) {
      throw new UnauthorizedException('Invalid session token');
    }

    const session = await this.sessionModel
      .findOne({
        _id: payload.sid,
        user: payload.sub,
      })
      .populate<{ user: SessionStudent | null }>({
        path: 'user' satisfies keyof Session,
        select: {
          _id: 1,
          email: 1,
          matricNumber: 1,
          firstName: 1,
          lastName: 1,
          phoneNumber: 1,
          address: 1,
          isActive: 1,
          program: 1,
          academicLevel: 1,
        } satisfies SelectAll<SessionStudent>,
      })
      .lean<SessionForAuthentication | null>()
      .exec();

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    if (session.userType !== SessionUserType.STUDENT) {
      throw new ForbiddenException('Invalid session type');
    }

    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (!session.expiresAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    const student = session.user;
    if (!student) {
      throw new UnauthorizedException('Student account not found');
    }

    if (!student.isActive) {
      throw new UnauthorizedException('Student account is inactive');
    }

    return { student: toStudentIdentity(student), sessionId: session._id };
  }

  async logout(studentId: Types.ObjectId, sessionId: string, ip?: string) {
    const { modifiedCount } = await this.sessionModel
      .updateOne(
        {
          _id: sessionId,
          user: studentId,
          userType: SessionUserType.STUDENT,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: SessionRevocationReason.LOGOUT,
          },
        },
      )
      .exec();

    if (modifiedCount) {
      await this.auditService.record({
        ...this.auditActor(studentId),
        action: AuditAction.LOGOUT,
        ip,
      });
    }
  }

  private auditActor(studentId: Types.ObjectId) {
    return { actor: studentId, actorType: SessionUserType.STUDENT };
  }
}
