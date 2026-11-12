import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { hashPassword } from '../common/utils/password';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { ResultStatus } from '../result/schema/result.schema';
import { Student } from '../student/schema/student.schema';
import { StudentService } from '../student/student.service';
import type { SeedProgramKey } from './academic-fixtures';
import { requireSeedId, seedAcademics } from './seed-academics';
import { type DemoResult, seedResults } from './seed-results';

const { APPROVED, SUBMITTED } = ResultStatus;

type DemoStudent = {
  email: string;
  firstName: string;
  lastName: string;
  program: SeedProgramKey;
  academicLevel: number;
  history?: DemoResult[];
};

const demoStudents: DemoStudent[] = [
  {
    email: 'demo.student1@example.test',
    firstName: 'Tobi',
    lastName: 'Ade',
    program: 'computer-science',
    academicLevel: 100,
  },
  {
    email: 'demo.student2@example.test',
    firstName: 'Amara',
    lastName: 'Okafor',
    program: 'computer-science',
    academicLevel: 200,
    history: [
      ['CSC101', 'earlier', 30, 42, APPROVED],
      ['CSC103', 'earlier', 18, 30, APPROVED],
      ['CSC105', 'earlier', 26, 36, APPROVED],
      ['CSC102', 'previous', 32, 45, APPROVED],
      ['CSC104', 'previous', 25, 38, APPROVED],
      ['CSC106', 'previous', 20, 34, APPROVED],
      ['CSC108', 'previous', 28, 40, SUBMITTED],
    ],
  },
  {
    email: 'demo.student3@example.test',
    firstName: 'Aisha',
    lastName: 'Bello',
    program: 'electrical-engineering',
    academicLevel: 100,
  },
  {
    email: 'demo.student4@example.test',
    firstName: 'David',
    lastName: 'Okon',
    program: 'computer-science',
    academicLevel: 100,
  },
  {
    email: 'demo.student5@example.test',
    firstName: 'Chinedu',
    lastName: 'Eze',
    program: 'software-engineering',
    academicLevel: 100,
  },
  {
    email: 'demo.student6@example.test',
    firstName: 'Fatima',
    lastName: 'Yusuf',
    program: 'software-engineering',
    academicLevel: 200,
    history: [
      ['CSC101', 'earlier', 35, 50, APPROVED],
      ['CSC103', 'earlier', 30, 38, APPROVED],
      ['CSC105', 'earlier', 28, 40, APPROVED],
      ['CSC102', 'previous', 26, 40, APPROVED],
      ['CSC104', 'previous', 34, 48, APPROVED],
      ['CSC106', 'previous', 30, 42, APPROVED],
      ['CSC108', 'previous', 22, 30, APPROVED],
    ],
  },
  {
    email: 'demo.student7@example.test',
    firstName: 'Kemi',
    lastName: 'Adeyemi',
    program: 'mathematics',
    academicLevel: 100,
  },
  {
    email: 'demo.student8@example.test',
    firstName: 'Ibrahim',
    lastName: 'Musa',
    program: 'statistics',
    academicLevel: 100,
  },
  {
    email: 'demo.student9@example.test',
    firstName: 'Ngozi',
    lastName: 'Obi',
    program: 'civil-engineering',
    academicLevel: 100,
  },
  {
    email: 'demo.student10@example.test',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    program: 'business-administration',
    academicLevel: 100,
  },
  {
    email: 'demo.student11@example.test',
    firstName: 'Zainab',
    lastName: 'Lawal',
    program: 'accounting',
    academicLevel: 100,
  },
];

async function seed() {
  const password = process.env.DEMO_STUDENT_PASSWORD;
  if (!password || password.length < 15) {
    throw new Error('Set DEMO_STUDENT_PASSWORD to at least 15 characters');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    abortOnError: false,
  });
  try {
    const { programIds, semesterIds, courseIds } = await seedAcademics(app);
    const studentModel = app.get<Model<Student>>(getModelToken(Student.name));
    const students = demoStudents.map(
      ({ email, firstName, lastName, program, academicLevel }) => ({
        email,
        firstName,
        lastName,
        academicLevel,
        password,
        program: requireSeedId(programIds, program).toHexString(),
      }),
    );
    const existing = await studentModel
      .find({ email: { $in: students.map(({ email }) => email) } })
      .select({ email: 1 } satisfies SelectAll<Pick<Student, 'email'>>)
      .lean()
      .exec();
    const existingEmails = new Set(existing.map(({ email }) => email));
    const missing = students.filter(({ email }) => !existingEmails.has(email));
    const created = await app.get(StudentService).create(missing);
    await studentModel
      .updateMany(
        { email: { $in: [...existingEmails] } },
        { $set: { passwordHash: await hashPassword(password) } },
      )
      .exec();
    console.log(
      `Created ${created.length} and reset ${existingEmails.size} demo student account(s).`,
    );

    for (const { email, history } of demoStudents) {
      if (!history) {
        continue;
      }
      const student = await studentModel.findOne({ email }).orFail().lean();
      await seedResults(
        app,
        { ...student, academicLevel: student.academicLevel - 100 },
        history,
        { semesterIds, courseIds },
      );
    }
  } finally {
    await app.close();
  }
}

void seed().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
