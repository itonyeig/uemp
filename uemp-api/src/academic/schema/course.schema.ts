import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from './department.schema';

@Schema({ collection: 'courses', timestamps: true })
export class Course {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 1, validate: Number.isInteger })
  creditUnits: number;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Department.name,
    required: true,
  })
  department: Types.ObjectId;
}

export const CourseSchema = SchemaFactory.createForClass(Course);
