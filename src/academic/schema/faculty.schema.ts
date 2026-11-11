import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'faculties', timestamps: true })
export class Faculty {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true })
  normalizedName: string;
}

export const FacultySchema = SchemaFactory.createForClass(Faculty);
