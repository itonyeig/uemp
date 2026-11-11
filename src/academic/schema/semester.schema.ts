import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { AcademicSession } from './academic-session.schema';

@Schema({ collection: 'semesters', timestamps: true })
export class Semester {
  readonly _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: AcademicSession.name,
    required: true,
  })
  academicSession: Types.ObjectId;

  @Prop({ required: true, enum: [1, 2] })
  number: number;

  @Prop({ required: true, default: false })
  isCurrent: boolean;
}

export const SemesterSchema = SchemaFactory.createForClass(Semester);
SemesterSchema.index({ academicSession: 1, number: 1 }, { unique: true });
SemesterSchema.index(
  { isCurrent: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } },
);
