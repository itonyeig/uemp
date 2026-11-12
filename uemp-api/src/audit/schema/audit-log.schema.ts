import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import { SessionUserType } from '../../auth/schema/session.schema';

export enum AuditAction {
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  PROFILE_UPDATE = 'student.profile_update',
  COURSE_REGISTRATION = 'registration.create',
}

@Schema({
  collection: 'auditLogs',
  timestamps: { createdAt: true, updatedAt: false },
})
export class AuditLog {
  readonly _id: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    refPath: 'actorType',
    required: true,
  })
  actor: Types.ObjectId;

  @Prop({ type: String, enum: SessionUserType, required: true })
  actorType: SessionUserType;

  @Prop({ type: String, enum: AuditAction, required: true })
  action: AuditAction;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details?: Record<string, unknown>;

  @Prop({ type: String })
  ip?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actor: 1, createdAt: -1 });
