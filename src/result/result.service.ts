import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  semesterWithSessionPopulate,
  toSemesterSummary,
  type SemesterSummary,
} from '../academic/academic.service';
import { AcademicSession } from '../academic/schema/academic-session.schema';
import { Course } from '../academic/schema/course.schema';
import { Semester } from '../academic/schema/semester.schema';
import type { SelectAll } from '../common/utils/types/helpers.types';
import { calculateGpa, GRADING_SCALE } from './grading';
import { Result, ResultStatus } from './schema/result.schema';

type CourseSummary = Pick<Course, '_id' | 'code' | 'title'>;
type ResultRecord = Pick<
  Result,
  | '_id'
  | 'creditUnits'
  | 'caScore'
  | 'examScore'
  | 'totalScore'
  | 'grade'
  | 'gradePoint'
> & {
  course: CourseSummary;
  semester: Pick<Semester, '_id' | 'number'> & {
    academicSession: Pick<AcademicSession, '_id' | 'label'> | null;
  };
};

@Injectable()
export class ResultService implements OnModuleInit {
  constructor(
    @InjectModel(Result.name) private readonly resultModel: Model<Result>,
  ) {}

  async onModuleInit() {
    await this.resultModel.init();
  }

  async findAcademicHistory(studentId: Types.ObjectId) {
    const results = await this.resultModel
      .find({ student: studentId, status: ResultStatus.APPROVED })
      .select({
        _id: 1,
        course: 1,
        semester: 1,
        creditUnits: 1,
        caScore: 1,
        examScore: 1,
        totalScore: 1,
        grade: 1,
        gradePoint: 1,
      } satisfies SelectAll<ResultRecord>)
      .populate({
        path: 'course' satisfies keyof Result,
        select: {
          _id: 1,
          code: 1,
          title: 1,
        } satisfies SelectAll<CourseSummary>,
      })
      .populate({
        path: 'semester' satisfies keyof Result,
        select: { _id: 1, number: 1, academicSession: 1 },
        populate: semesterWithSessionPopulate,
      })
      .lean<ResultRecord[]>()
      .exec();

    const semesters = new Map<
      string,
      { semester: SemesterSummary; results: Omit<ResultRecord, 'semester'>[] }
    >();
    for (const { semester, ...result } of results) {
      const key = semester._id.toHexString();
      const entry = semesters.get(key) ?? {
        semester: toSemesterSummary(semester),
        results: [],
      };
      entry.results.push(result);
      semesters.set(key, entry);
    }

    return {
      gradingScale: GRADING_SCALE,
      cgpa: calculateGpa(results),
      totalCreditUnits: sumCreditUnits(results),
      semesters: [...semesters.values()]
        .sort(
          (a, b) =>
            a.semester.session.localeCompare(b.semester.session) ||
            a.semester.number - b.semester.number,
        )
        .map(({ semester, results: semesterResults }) => ({
          semester,
          gpa: calculateGpa(semesterResults),
          totalCreditUnits: sumCreditUnits(semesterResults),
          results: semesterResults
            .map(({ course, ...result }) => ({
              ...result,
              code: course.code,
              title: course.title,
            }))
            .sort((a, b) => a.code.localeCompare(b.code)),
        })),
    };
  }
}

function sumCreditUnits(results: Pick<Result, 'creditUnits'>[]) {
  return results.reduce((sum, { creditUnits }) => sum + creditUnits, 0);
}
