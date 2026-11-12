type MongoDuplicateKeyError = {
  code: number;
  message?: string;
  keyPattern?: Record<string, unknown>;
};

const DUPLICATE_MESSAGES: Record<string, string> = {
  email: 'This email is already registered',
  normalizedName: 'A faculty with this name already exists',
  faculty_normalizedName: 'This department already exists in the faculty',
  department_normalizedName: 'This program already exists in the department',
  label: 'This academic session already exists',
  academicSession_number:
    'This semester already exists in the academic session',
  isCurrent: 'A current semester already exists',
  code: 'This course code already exists',
  course_semester: 'This course already has an offering in the semester',
  student_course_semester:
    'You have already registered for this course this semester',
  registration: 'A result already exists for this registration',
};

export function isMongoDuplicateKeyError(
  error: unknown,
): error is MongoDuplicateKeyError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as MongoDuplicateKeyError).code === 11000
  );
}

export function getDuplicateKeyMessage(error: MongoDuplicateKeyError): string {
  const fieldNames = Object.keys(error.keyPattern ?? {});
  const compoundFieldName = fieldNames.join('_');
  const fieldName = compoundFieldName || fieldNames[0] || 'Field';

  return DUPLICATE_MESSAGES[fieldName] ?? `${fieldName} already exists`;
}
