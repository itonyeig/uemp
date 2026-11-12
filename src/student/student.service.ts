import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomInt } from 'node:crypto';
import type { Department } from '../academic/schema/department.schema';
import type { Faculty } from '../academic/schema/faculty.schema';
import { Program } from '../academic/schema/program.schema';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schema/audit-log.schema';
import { SessionUserType } from '../auth/schema/session.schema';
import { isMongoDuplicateKeyError } from '../common/utils/mongo-duplicate-key';
import { hashPassword } from '../common/utils/password';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  Student,
  type StudentIdentity,
  toStudentIdentity,
} from './schema/student.schema';

type FacultySummary = Pick<Faculty, '_id' | 'name'>;
type DepartmentPlacement = Pick<Department, '_id' | 'name'> & {
  faculty: FacultySummary | null;
};
type ProgramPlacement = Pick<Program, '_id' | 'name'> & {
  department: DepartmentPlacement | null;
};

const MATRIC_NUMBER_MAX_ATTEMPTS = 5;
const MATRIC_NUMBER_ERROR = 'Could not generate a unique matriculation number';

@Injectable()
export class StudentService implements OnModuleInit {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
    @InjectModel(Program.name)
    private readonly programModel: Model<Program>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    await this.studentModel.init();
  }

  async populateProfile(student: StudentIdentity) {
    const profile = toStudentIdentity(student);
    const { program } = await this.studentModel.populate<{
      program: ProgramPlacement | null;
    }>(profile, {
      path: 'program' satisfies keyof Student,
      select: {
        _id: 1,
        name: 1,
        department: 1,
      } satisfies SelectAll<ProgramPlacement>,
      options: { lean: true },
      populate: {
        path: 'department' satisfies keyof Program,
        select: {
          _id: 1,
          name: 1,
          faculty: 1,
        } satisfies SelectAll<DepartmentPlacement>,
        populate: {
          path: 'faculty' satisfies keyof Department,
          select: { _id: 1, name: 1 } satisfies SelectAll<FacultySummary>,
        },
      },
    });
    const department = program?.department;

    return {
      ...profile,
      program: program ? { _id: program._id, name: program.name } : null,
      department: department
        ? { _id: department._id, name: department.name }
        : null,
      faculty: department?.faculty ?? null,
    };
  }

  async create(students: CreateStudentDto[]) {
    if (!students.length) {
      return [];
    }

    const programs = [
      ...new Set(students.map(({ program }) => program.toLowerCase())),
    ];
    const count = await this.programModel.countDocuments({
      _id: { $in: programs },
    });
    if (count !== programs.length) {
      throw new NotFoundException('Program not found');
    }

    const assignedNumbers = new Set<string>();
    const records: Pick<
      Student,
      | 'email'
      | 'firstName'
      | 'lastName'
      | 'matricNumber'
      | 'passwordHash'
      | 'program'
      | 'academicLevel'
    >[] = [];

    for (const {
      email,
      firstName,
      lastName,
      password,
      program,
      academicLevel,
    } of students) {
      const passwordHash = await hashPassword(password);
      const matricNumber = await this.generateMatricNumber(assignedNumbers);
      assignedNumbers.add(matricNumber);
      records.push({
        email,
        firstName,
        lastName,
        matricNumber,
        passwordHash,
        program: new Types.ObjectId(program),
        academicLevel,
      });
    }

    try {
      const created = await this.studentModel.create(records, {
        ordered: true,
      });
      return created.map(toStudentIdentity);
    } catch (error) {
      if (isMongoDuplicateKeyError(error) && error.keyPattern?.matricNumber) {
        throw new InternalServerErrorException(MATRIC_NUMBER_ERROR);
      }
      throw error;
    }
  }

  async updateProfile(
    studentId: Types.ObjectId,
    changes: UpdateProfileDto,
    ip?: string,
  ) {
    const student = await this.studentModel
      .findByIdAndUpdate(
        studentId,
        { $set: changes },
        { returnDocument: 'after', runValidators: true },
      )
      .lean()
      .orFail(() => new NotFoundException('Student not found'))
      .exec();

    await this.auditService.record({
      actor: studentId,
      actorType: SessionUserType.STUDENT,
      action: AuditAction.PROFILE_UPDATE,
      details: { fields: Object.keys(changes) },
      ip,
    });

    return toStudentIdentity(student);
  }

  private async generateMatricNumber(
    assignedNumbers: ReadonlySet<string>,
    attempt = 1,
  ): Promise<string> {
    if (attempt > MATRIC_NUMBER_MAX_ATTEMPTS) {
      throw new InternalServerErrorException(MATRIC_NUMBER_ERROR);
    }

    const prefix = randomInt(10_000_000, 100_000_000);
    const suffix = randomInt(100_000_000).toString().padStart(8, '0');
    const matricNumber = `${prefix}${suffix}`;

    if (
      assignedNumbers.has(matricNumber) ||
      (await this.studentModel.exists({ matricNumber }).exec())
    ) {
      return this.generateMatricNumber(assignedNumbers, attempt + 1);
    }

    return matricNumber;
  }
}
