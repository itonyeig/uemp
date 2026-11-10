import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { hashPassword } from '../common/utils/password';
import { CreateStudentDto } from './dto/create-student.dto';
import { Student, toStudentIdentity } from './schema/student.schema';

@Injectable()
export class StudentService implements OnModuleInit {
  constructor(
    @InjectModel(Student.name)
    private readonly studentModel: Model<Student>,
  ) {}

  async onModuleInit() {
    await this.studentModel.init();
  }

  async create(createStudentDto: CreateStudentDto) {
    const { email, firstName, lastName, password } = createStudentDto;
    const passwordHash = await hashPassword(password);

    const student = await this.studentModel.create({
      email,
      firstName,
      lastName,
      passwordHash,
    });

    return toStudentIdentity(student);
  }
}
