import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AcademicModule } from '../academic/academic.module';
import { AuditModule } from '../audit/audit.module';
import { Student, StudentSchema } from './schema/student.schema';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({
  imports: [
    AcademicModule,
    AuditModule,
    MongooseModule.forFeature([{ name: Student.name, schema: StudentSchema }]),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [MongooseModule, StudentService],
})
export class StudentModule {}
