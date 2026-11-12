import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicModule } from '../academic/academic.module';
import { AuditModule } from '../audit/audit.module';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';
import {
  CourseRegistration,
  CourseRegistrationSchema,
} from './schema/course-registration.schema';

@Module({
  imports: [
    AcademicModule,
    AuditModule,
    MongooseModule.forFeature([
      { name: CourseRegistration.name, schema: CourseRegistrationSchema },
    ]),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService],
  exports: [MongooseModule],
})
export class RegistrationModule {}
