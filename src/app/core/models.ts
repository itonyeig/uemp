export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
}
export interface AcademicEntity {
  _id: string;
  name: string;
}
export interface Student {
  _id: string;
  email: string;
  matricNumber: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  address: string | null;
  isActive: boolean;
  academicLevel: number;
  program: AcademicEntity | null;
  department: AcademicEntity | null;
  faculty: AcademicEntity | null;
}
export interface LoginResponse {
  student: Student;
  token: string;
  expiresAt: string;
}
export interface ProfileChanges {
  phoneNumber?: string;
  address?: string;
}
export interface Semester {
  _id: string;
  number: number;
  session: string;
}
export interface Course {
  offeringId: string;
  code: string;
  title: string;
  creditUnits: number;
}
export interface AvailableCourse extends Course {
  registered: boolean;
}
export interface RegisteredCourse extends Course {
  registrationId: string;
  registeredAt: string;
}
export interface AvailableCourses {
  semester: Semester;
  maxCreditUnits: number;
  registeredCreditUnits: number;
  courses: AvailableCourse[];
}
export interface RegistrationSummary {
  semester: Semester;
  totalCreditUnits: number;
  courses: RegisteredCourse[];
}
export interface CourseResult {
  _id: string;
  code: string;
  title: string;
  creditUnits: number;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
}
export interface SemesterResults {
  semester: Semester;
  gpa: number;
  totalCreditUnits: number;
  results: CourseResult[];
}
export interface AcademicHistory {
  gradingScale: { grade: string; minScore: number; gradePoint: number }[];
  cgpa: number;
  totalCreditUnits: number;
  semesters: SemesterResults[];
}
