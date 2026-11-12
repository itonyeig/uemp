import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { Program } from '../../academic/schema/program.schema';

@Schema({ collection: 'students', timestamps: true })
export class Student {
  readonly _id: Types.ObjectId;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, unique: true, match: /^\d{16}$/ })
  matricNumber: string;

  @Prop({ required: true, select: false })
  passwordHash: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ type: String, trim: true, default: null })
  phoneNumber: string | null;

  @Prop({ type: String, trim: true, default: null })
  address: string | null;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Program.name,
    required: true,
  })
  program: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, validate: Number.isInteger })
  academicLevel: number;
}

export const StudentSchema = SchemaFactory.createForClass(Student);

export type StudentIdentity = Pick<
  Student,
  | '_id'
  | 'email'
  | 'matricNumber'
  | 'firstName'
  | 'lastName'
  | 'phoneNumber'
  | 'address'
  | 'isActive'
  | 'program'
  | 'academicLevel'
>;

export function toStudentIdentity(student: StudentIdentity): StudentIdentity {
  const {
    _id,
    email,
    matricNumber,
    firstName,
    lastName,
    phoneNumber,
    address,
    isActive,
    program,
    academicLevel,
  } = student;
  return {
    _id,
    email,
    matricNumber,
    firstName,
    lastName,
    phoneNumber: phoneNumber ?? null,
    address: address ?? null,
    isActive,
    program,
    academicLevel,
  };
}
