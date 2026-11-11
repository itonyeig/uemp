import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'academicSessions', timestamps: true })
export class AcademicSession {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, unique: true, trim: true, match: /^\d{4}\/\d{4}$/ })
  label: string;
}

export const AcademicSessionSchema =
  SchemaFactory.createForClass(AcademicSession);
