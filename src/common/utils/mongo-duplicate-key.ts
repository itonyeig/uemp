type MongoDuplicateKeyError = {
  code: number;
  message?: string;
  keyPattern?: Record<string, unknown>;
};

const DUPLICATE_MESSAGES: Record<string, string> = {
  email: 'This email is already registered',
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
