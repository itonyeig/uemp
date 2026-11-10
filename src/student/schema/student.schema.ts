import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ collection: 'students', timestamps: true })
export class Student {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

export type StudentIdentity = Pick<
  Student,
  '_id' | 'email' | 'firstName' | 'lastName' | 'isActive'
>;

export function toStudentIdentity(student: StudentIdentity): StudentIdentity {
  const { _id, email, firstName, lastName, isActive } = student;
  return { _id, email, firstName, lastName, isActive };
}
