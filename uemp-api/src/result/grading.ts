export const CA_MAX_SCORE = 40;
export const EXAM_MAX_SCORE = 60;

// Nigerian university 5-point scale; scores are inclusive lower bounds.
export const GRADING_SCALE = [
  { grade: 'A', minScore: 70, gradePoint: 5 },
  { grade: 'B', minScore: 60, gradePoint: 4 },
  { grade: 'C', minScore: 50, gradePoint: 3 },
  { grade: 'D', minScore: 45, gradePoint: 2 },
  { grade: 'E', minScore: 40, gradePoint: 1 },
  { grade: 'F', minScore: 0, gradePoint: 0 },
] as const;

export type Grade = (typeof GRADING_SCALE)[number]['grade'];

export function gradeResult(caScore: number, examScore: number) {
  const totalScore = caScore + examScore;
  const { grade, gradePoint } =
    GRADING_SCALE.find(({ minScore }) => totalScore >= minScore) ??
    GRADING_SCALE[GRADING_SCALE.length - 1];
  return { totalScore, grade, gradePoint };
}

export function calculateGpa(
  results: { creditUnits: number; gradePoint: number }[],
) {
  const totalUnits = results.reduce((sum, r) => sum + r.creditUnits, 0);
  if (!totalUnits) {
    return 0;
  }
  const totalPoints = results.reduce(
    (sum, r) => sum + r.creditUnits * r.gradePoint,
    0,
  );
  return Math.round((totalPoints / totalUnits) * 100) / 100;
}
