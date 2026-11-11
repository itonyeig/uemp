import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import { CourseOffering } from '../academic/schema/course-offering.schema';
import { CourseRegistration } from '../registration/schema/course-registration.schema';
import { gradeResult } from '../result/grading';
import { Result, ResultStatus } from '../result/schema/result.schema';
import type { SeedSemesterKey } from './academic-fixtures';
import { requireSeedId } from './seed-academics';

export type DemoResult = [
  code: string,
  semester: SeedSemesterKey,
  caScore: number,
  examScore: number,
  status: ResultStatus,
];

export async function seedResults(
  app: INestApplicationContext,
  student: {
    _id: Types.ObjectId;
    program: Types.ObjectId;
    academicLevel: number;
  },
  demoResults: DemoResult[],
  ids: {
    semesterIds: ReadonlyMap<SeedSemesterKey, Types.ObjectId>;
    courseIds: ReadonlyMap<string, Types.ObjectId>;
  },
) {
  const offeringModel = app.get<Model<CourseOffering>>(
    getModelToken(CourseOffering.name),
  );
  const registrationModel = app.get<Model<CourseRegistration>>(
    getModelToken(CourseRegistration.name),
  );
  const resultModel = app.get<Model<Result>>(getModelToken(Result.name));

  for (const [code, semesterKey, caScore, examScore, status] of demoResults) {
    const course = requireSeedId(ids.courseIds, code);
    const semester = requireSeedId(ids.semesterIds, semesterKey);
    const offering = await offeringModel
      .findOne({ course, semester })
      .populate<{ course: { creditUnits: number } }>('course', 'creditUnits')
      .orFail()
      .lean()
      .exec();
    const creditUnits = offering.course.creditUnits;

    const registration = await registrationModel
      .findOneAndUpdate(
        { student: student._id, course, semester },
        {
          $setOnInsert: {
            offering: offering._id,
            program: student.program,
            academicLevel: student.academicLevel,
            creditUnits,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .orFail()
      .lean()
      .exec();

    const approvedAt = status === ResultStatus.APPROVED ? new Date() : null;
    await resultModel
      .updateOne(
        { registration: registration._id },
        {
          $setOnInsert: {
            student: student._id,
            course,
            semester,
            creditUnits,
            caScore,
            examScore,
            ...gradeResult(caScore, examScore),
            status,
            submittedAt: new Date(),
            approvedAt,
          },
        },
        { upsert: true },
      )
      .exec();
  }

  console.log(`Seeded ${demoResults.length} demo result(s).`);
}
