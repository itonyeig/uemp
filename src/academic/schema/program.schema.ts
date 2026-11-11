import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Department } from './department.schema';

@Schema({ collection: 'programs', timestamps: true })
export class Program {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  normalizedName: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Department.name,
    required: true,
  })
  department: Types.ObjectId;
}

export const ProgramSchema = SchemaFactory.createForClass(Program);
ProgramSchema.index({ department: 1, normalizedName: 1 }, { unique: true });
