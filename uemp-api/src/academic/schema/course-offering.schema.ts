import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Course } from './course.schema';
import { Program } from './program.schema';
import { Semester } from './semester.schema';

@Schema({ _id: false })
export class CourseEligibility {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Program.name,
    required: true,
  })
  program: Types.ObjectId;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  academicLevel: number;
}

const CourseEligibilitySchema = SchemaFactory.createForClass(CourseEligibility);

@Schema({ collection: 'courseOfferings', timestamps: true })
export class CourseOffering {
  readonly _id: Types.ObjectId;

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

  @Prop({ type: [CourseEligibilitySchema], required: true })
  eligibility: CourseEligibility[];
}

export const CourseOfferingSchema =
  SchemaFactory.createForClass(CourseOffering);
CourseOfferingSchema.index({ course: 1, semester: 1 }, { unique: true });
