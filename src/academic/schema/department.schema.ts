import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Faculty } from './faculty.schema';

@Schema({ collection: 'departments', timestamps: true })
export class Department {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  normalizedName: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Faculty.name,
    required: true,
  })
  faculty: Types.ObjectId;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);
DepartmentSchema.index({ faculty: 1, normalizedName: 1 }, { unique: true });
