import type { Request } from 'express';
import type { StudentIdentity } from '../student/schema/student.schema';

declare global {
  namespace Express {
    interface Request {
      user?: { student: StudentIdentity };
      sessionId?: string;
    }
  }
}

export type AuthenticatedRequest = Request &
  Required<Pick<Request, 'user' | 'sessionId'>>;
