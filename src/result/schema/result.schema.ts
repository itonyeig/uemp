import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Course } from '../../academic/schema/course.schema';
import { Semester } from '../../academic/schema/semester.schema';
import { CourseRegistration } from '../../registration/schema/course-registration.schema';
import { Student } from '../../student/schema/student.schema';
import {
  CA_MAX_SCORE,
  EXAM_MAX_SCORE,
  GRADING_SCALE,
  type Grade,
} from '../grading';

export enum ResultStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ collection: 'results', timestamps: true })
export class Result {
  readonly _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseRegistration.name,
    required: true,
    unique: true,
  })
  registration: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Student.name,
    required: true,
  })
  student: Types.ObjectId;

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

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  creditUnits: number;

  @Prop({ required: true, min: 0, max: CA_MAX_SCORE })
  caScore: number;

  @Prop({ required: true, min: 0, max: EXAM_MAX_SCORE })
  examScore: number;

  @Prop({ required: true, min: 0, max: CA_MAX_SCORE + EXAM_MAX_SCORE })
  totalScore: number;

  @Prop({
    type: String,
    required: true,
    enum: GRADING_SCALE.map(({ grade }) => grade),
  })
  grade: Grade;

  @Prop({ required: true, min: 0 })
  gradePoint: number;

  @Prop({
    type: String,
    enum: ResultStatus,
    required: true,
    default: ResultStatus.DRAFT,
  })
  status: ResultStatus;

  @Prop({ type: Date, default: null })
  submittedAt: Date | null;

  @Prop({ type: Date, default: null })
  approvedAt: Date | null;
}

export const ResultSchema = SchemaFactory.createForClass(Result);
ResultSchema.index({ student: 1, status: 1 });
