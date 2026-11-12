import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

export enum SessionUserType {
  STUDENT = 'Student',
}

export enum SessionRevocationReason {
  LOGOUT = 'logout',
  NEW_LOGIN = 'new_login',
}

@Schema({ collection: 'sessions', timestamps: true })
export class Session {
  @Prop({ type: String, required: true })
  readonly _id: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'userType',
    required: true,
  })
  user: Types.ObjectId;

  @Prop({ type: String, enum: SessionUserType, required: true })
  userType: SessionUserType;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: String, enum: SessionRevocationReason })
  revokedReason?: SessionRevocationReason;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.index(
  { userType: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $exists: true }, revokedAt: null },
  },
);
