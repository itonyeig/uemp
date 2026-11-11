import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseOffering } from './schema/course-offering.schema';
import { Course } from './schema/course.schema';
import { Department } from './schema/department.schema';
import { Program } from './schema/program.schema';
import { Semester } from './schema/semester.schema';

@Injectable()
export class CourseService implements OnModuleInit {
  constructor(
    @InjectModel(Course.name) private readonly courseModel: Model<Course>,
    @InjectModel(CourseOffering.name)
    private readonly offeringModel: Model<CourseOffering>,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<Department>,
    @InjectModel(Program.name) private readonly programModel: Model<Program>,
    @InjectModel(Semester.name) private readonly semesterModel: Model<Semester>,
  ) {}

  async onModuleInit() {
    await Promise.all([this.courseModel.init(), this.offeringModel.init()]);
  }

  async createCourses(courses: Omit<Course, '_id'>[]) {
    const departments = [
      ...new Set(courses.map(({ department }) => department.toHexString())),
    ];
    const count = await this.departmentModel.countDocuments({
      _id: { $in: departments },
    });
    if (count !== departments.length) {
      throw new NotFoundException('Department not found');
    }

    return this.courseModel.create(courses, { ordered: true });
  }

  async createOfferings(offerings: Omit<CourseOffering, '_id'>[]) {
    const courses = [
      ...new Set(offerings.map(({ course }) => course.toHexString())),
    ];
    const semesters = [
      ...new Set(offerings.map(({ semester }) => semester.toHexString())),
    ];
    const programs = [
      ...new Set(
        offerings.flatMap(({ eligibility }) =>
          eligibility.map(({ program }) => program.toHexString()),
        ),
      ),
    ];
    const [courseCount, semesterCount, programCount] = await Promise.all([
      this.courseModel.countDocuments({ _id: { $in: courses } }),
      this.semesterModel.countDocuments({ _id: { $in: semesters } }),
      this.programModel.countDocuments({ _id: { $in: programs } }),
    ]);
    if (
      courseCount !== courses.length ||
      semesterCount !== semesters.length ||
      programCount !== programs.length
    ) {
      throw new NotFoundException('Course, semester or program not found');
    }

    return this.offeringModel.create(offerings, { ordered: true });
  }
}
