import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { AcademicSession } from './schema/academic-session.schema';
import { Department } from './schema/department.schema';
import { Faculty } from './schema/faculty.schema';
import { Program } from './schema/program.schema';
import { Semester } from './schema/semester.schema';

type FacultySummary = Pick<Faculty, '_id' | 'name'>;
type DepartmentPlacement = Pick<Department, '_id' | 'name'> & {
  faculty: FacultySummary | null;
};
type ProgramPlacement = Pick<Program, '_id' | 'name'> & {
  department: DepartmentPlacement | null;
};
type SessionSummary = Pick<AcademicSession, '_id' | 'label'>;
type SemesterWithSession = Pick<Semester, '_id' | 'number'> & {
  academicSession: SessionSummary | null;
};
export type SemesterSummary = Pick<Semester, '_id' | 'number'> & {
  session: string;
};

export function toSemesterSummary(
  semester: SemesterWithSession,
): SemesterSummary {
  return {
    _id: semester._id,
    number: semester.number,
    session: semester.academicSession?.label ?? '',
  };
}

export const semesterWithSessionPopulate = {
  path: 'academicSession' satisfies keyof Semester,
  select: { _id: 1, label: 1 } satisfies SelectAll<SessionSummary>,
};

export function normalizeAcademicName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

@Injectable()
export class AcademicService implements OnModuleInit {
  constructor(
    @InjectModel(Faculty.name) private readonly facultyModel: Model<Faculty>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<Department>,
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
    @InjectModel(AcademicSession.name)
    private readonly academicSessionModel: Model<AcademicSession>,
    @InjectModel(Semester.name) private readonly semesterModel: Model<Semester>,
  ) {}

  async onModuleInit() {
    await Promise.all([
      this.facultyModel.init(),
      this.departmentModel.init(),
      this.programModel.init(),
      this.academicSessionModel.init(),
      this.semesterModel.init(),
    ]);
  }

  createFaculties(faculties: Pick<Faculty, 'name'>[]) {
    return this.facultyModel.create(
      faculties.map(({ name }) => ({
        name,
        normalizedName: normalizeAcademicName(name),
      })),
      { ordered: true },
    );
  }

  async createDepartments(departments: Pick<Department, 'name' | 'faculty'>[]) {
    const faculties = [
      ...new Set(departments.map(({ faculty }) => faculty.toString())),
    ];
    const count = await this.facultyModel.countDocuments({
      _id: { $in: faculties },
    });
    if (count !== faculties.length) {
      throw new NotFoundException('Faculty not found');
    }

    return this.departmentModel.create(
      departments.map((department) => ({
        ...department,
        normalizedName: normalizeAcademicName(department.name),
      })),
      { ordered: true },
    );
  }

  async createPrograms(programs: Pick<Program, 'name' | 'department'>[]) {
    const departments = [
      ...new Set(programs.map(({ department }) => department.toString())),
    ];
    const count = await this.departmentModel.countDocuments({
      _id: { $in: departments },
    });
    if (count !== departments.length) {
      throw new NotFoundException('Department not found');
    }

    return this.programModel.create(
      programs.map((program) => ({
        ...program,
        normalizedName: normalizeAcademicName(program.name),
      })),
      { ordered: true },
    );
  }

  createAcademicSessions(sessions: Pick<AcademicSession, 'label'>[]) {
    return this.academicSessionModel.create(sessions, { ordered: true });
  }

  async createSemesters(
    semesters: Pick<Semester, 'academicSession' | 'number' | 'isCurrent'>[],
  ) {
    const sessions = [
      ...new Set(
        semesters.map(({ academicSession }) => academicSession.toHexString()),
      ),
    ];
    const count = await this.academicSessionModel.countDocuments({
      _id: { $in: sessions },
    });
    if (count !== sessions.length) {
      throw new NotFoundException('Academic session not found');
    }

    return this.semesterModel.create(semesters, { ordered: true });
  }

  async findCurrentSemester(): Promise<SemesterSummary> {
    const semester = await this.semesterModel
      .findOne({ isCurrent: true })
      .select({ _id: 1, number: 1, academicSession: 1 })
      .populate<{
        academicSession: SessionSummary | null;
      }>(semesterWithSessionPopulate)
      .lean<SemesterWithSession | null>()
      .exec();

    if (!semester) {
      throw new NotFoundException('No semester is currently open');
    }
    return toSemesterSummary(semester);
  }

  async findPlacement(programId: Types.ObjectId) {
    const program = await this.programModel
      .findById(programId)
      .select({
        _id: 1,
        name: 1,
        department: 1,
      } satisfies SelectAll<ProgramPlacement>)
      .populate<{ department: DepartmentPlacement | null }>({
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
      })
      .lean<ProgramPlacement | null>()
      .exec();

    if (!program?.department?.faculty) {
      return null;
    }

    const {
      department: { faculty, ...department },
      ...programSummary
    } = program;
    return { program: programSummary, department, faculty };
  }
}
