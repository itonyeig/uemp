import type { INestApplicationContext } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import type { Model, Types } from 'mongoose';
import {
  AcademicService,
  normalizeAcademicName,
} from '../academic/academic.service';
import { CourseService } from '../academic/course.service';
import { AcademicSession } from '../academic/schema/academic-session.schema';
import { CourseOffering } from '../academic/schema/course-offering.schema';
import { Course } from '../academic/schema/course.schema';
import { Department } from '../academic/schema/department.schema';
import { Faculty } from '../academic/schema/faculty.schema';
import { Program } from '../academic/schema/program.schema';
import { Semester } from '../academic/schema/semester.schema';
import type { SelectAll } from '../common/utils/types/helpers.types';
import {
  academicStructure,
  courseGroups,
  semesters,
  type SeedDepartmentKey,
  type SeedProgramKey,
  type SeedSemesterKey,
} from './academic-fixtures';

export function requireSeedId<Key extends string>(
  ids: ReadonlyMap<Key, Types.ObjectId>,
  key: Key,
) {
  const id = ids.get(key);
  if (!id) {
    throw new Error(`Missing seed record for ${key}`);
  }
  return id;
}

export async function seedAcademics(app: INestApplicationContext) {
  const academic = app.get(AcademicService);
  const facultyModel = app.get<Model<Faculty>>(getModelToken(Faculty.name));
  const departmentModel = app.get<Model<Department>>(
    getModelToken(Department.name),
  );
  const programModel = app.get<Model<Program>>(getModelToken(Program.name));
  const departmentIds = new Map<SeedDepartmentKey, Types.ObjectId>();
  const programIds = new Map<SeedProgramKey, Types.ObjectId>();

  for (const facultySpec of academicStructure) {
    const faculty =
      (await facultyModel
        .findOne({ normalizedName: normalizeAcademicName(facultySpec.name) })
        .lean()
        .exec()) ??
      (await academic.createFaculties([{ name: facultySpec.name }]))[0];

    for (const departmentSpec of facultySpec.departments) {
      const department =
        (await departmentModel
          .findOne({
            faculty: faculty._id,
            normalizedName: normalizeAcademicName(departmentSpec.name),
          })
          .lean()
          .exec()) ??
        (
          await academic.createDepartments([
            { name: departmentSpec.name, faculty: faculty._id },
          ])
        )[0];
      departmentIds.set(departmentSpec.key, department._id);

      for (const programSpec of departmentSpec.programs) {
        const program =
          (await programModel
            .findOne({
              department: department._id,
              normalizedName: normalizeAcademicName(programSpec.name),
            })
            .lean()
            .exec()) ??
          (
            await academic.createPrograms([
              { name: programSpec.name, department: department._id },
            ])
          )[0];
        programIds.set(programSpec.key, program._id);
      }
    }
  }

  const academicSessionModel = app.get<Model<AcademicSession>>(
    getModelToken(AcademicSession.name),
  );
  const semesterModel = app.get<Model<Semester>>(getModelToken(Semester.name));
  const semesterIds = new Map<SeedSemesterKey, Types.ObjectId>();

  for (const { key, session, number, isCurrent } of semesters) {
    const academicSession =
      (await academicSessionModel.findOne({ label: session }).lean().exec()) ??
      (await academic.createAcademicSessions([{ label: session }]))[0];
    const semester =
      (await semesterModel
        .findOne({ academicSession: academicSession._id, number })
        .lean()
        .exec()) ??
      (
        await academic.createSemesters([
          { academicSession: academicSession._id, number, isCurrent },
        ])
      )[0];
    semesterIds.set(key, semester._id);
  }

  const catalogue = courseGroups.flatMap((group) => {
    const department = requireSeedId(departmentIds, group.department);
    const semester = requireSeedId(semesterIds, group.semester ?? 'current');
    const eligibility = group.programs.map((program) => ({
      program: requireSeedId(programIds, program),
      academicLevel: group.academicLevel,
    }));
    return group.courses.map(([code, title, creditUnits]) => ({
      course: { code, title, creditUnits, department },
      semester,
      eligibility,
    }));
  });
  const courseService = app.get(CourseService);
  const courseModel = app.get<Model<Course>>(getModelToken(Course.name));
  const existingCourses = await courseModel
    .find({ code: { $in: catalogue.map(({ course }) => course.code) } })
    .select({ _id: 1, code: 1 } satisfies SelectAll<
      Pick<Course, '_id' | 'code'>
    >)
    .lean()
    .exec();
  const courseIds = new Map(
    existingCourses.map(({ code, _id }) => [code, _id]),
  );
  const missingCourses = new Map(
    catalogue
      .filter(({ course }) => !courseIds.has(course.code))
      .map(({ course }) => [course.code, course]),
  );
  const courses = await courseService.createCourses([
    ...missingCourses.values(),
  ]);
  for (const course of courses) {
    courseIds.set(course.code, course._id);
  }

  const offeringModel = app.get<Model<CourseOffering>>(
    getModelToken(CourseOffering.name),
  );
  const existingOfferings = await offeringModel
    .find({
      semester: { $in: [...semesterIds.values()] },
      course: { $in: [...courseIds.values()] },
    })
    .select({ course: 1, semester: 1 } satisfies SelectAll<
      Pick<CourseOffering, 'course' | 'semester'>
    >)
    .lean()
    .exec();
  const offeringKeys = new Set(
    existingOfferings.map(
      ({ course, semester }) =>
        `${course.toHexString()}:${semester.toHexString()}`,
    ),
  );
  const offerings = await courseService.createOfferings(
    catalogue
      .map(({ course, semester, eligibility }) => ({
        course: requireSeedId(courseIds, course.code),
        semester,
        eligibility,
      }))
      .filter(
        ({ course, semester }) =>
          !offeringKeys.has(
            `${course.toHexString()}:${semester.toHexString()}`,
          ),
      ),
  );

  console.log(
    `Created ${courses.length} course(s) and ${offerings.length} offering(s).`,
  );
  return { programIds, semesterIds, courseIds };
}
