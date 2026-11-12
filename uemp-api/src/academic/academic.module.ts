import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicService } from './academic.service';
import { CourseService } from './course.service';
import {
  AcademicSession,
  AcademicSessionSchema,
} from './schema/academic-session.schema';
import {
  CourseOffering,
  CourseOfferingSchema,
} from './schema/course-offering.schema';
import { Course, CourseSchema } from './schema/course.schema';
import { Department, DepartmentSchema } from './schema/department.schema';
import { Faculty, FacultySchema } from './schema/faculty.schema';
import { Program, ProgramSchema } from './schema/program.schema';
import { Semester, SemesterSchema } from './schema/semester.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Faculty.name, schema: FacultySchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: AcademicSession.name, schema: AcademicSessionSchema },
      { name: Semester.name, schema: SemesterSchema },
      { name: Course.name, schema: CourseSchema },
      { name: CourseOffering.name, schema: CourseOfferingSchema },
    ]),
  ],
  providers: [AcademicService, CourseService],
  exports: [AcademicService, CourseService, MongooseModule],
})
export class AcademicModule {}
