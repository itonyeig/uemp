import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { CourseOffering } from '../../academic/schema/course-offering.schema';
import { Course } from '../../academic/schema/course.schema';
import { Program } from '../../academic/schema/program.schema';
import { Semester } from '../../academic/schema/semester.schema';
import { Student } from '../../student/schema/student.schema';

@Schema({ collection: 'courseRegistrations', timestamps: true })
export class CourseRegistration {
  readonly _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Student.name,
    required: true,
  })
  student: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseOffering.name,
    required: true,
  })
  offering: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Course.name,
    required: true,
  })
  course: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Semester.name,
    required: true,
  })
  semester: Types.ObjectId;

  // Program, level and units are copied at registration so history stays
  // correct after the student is promoted or the course is changed.
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Program.name,
    required: true,
  })
  program: Types.ObjectId;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  academicLevel: number;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  creditUnits: number;

  readonly createdAt?: Date;
}

export const CourseRegistrationSchema =
  SchemaFactory.createForClass(CourseRegistration);
CourseRegistrationSchema.index(
  { student: 1, course: 1, semester: 1 },
  { unique: true },
);
