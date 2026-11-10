import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  if (bcrypt.truncates(password)) {
    throw new BadRequestException('Password must be 72 bytes or fewer');
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (bcrypt.truncates(password)) {
    return false;
  }

  return bcrypt.compare(password, passwordHash);
}
