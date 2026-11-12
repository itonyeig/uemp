import { calculateGpa, gradeResult } from './grading';

describe('grading', () => {
  it.each([
    [40, 60, 'A', 5],
    [30, 40, 'A', 5],
    [30, 39, 'B', 4],
    [20, 30, 'C', 3],
    [20, 25, 'D', 2],
    [15, 25, 'E', 1],
    [15, 24, 'F', 0],
    [0, 0, 'F', 0],
  ])(
    'grades CA %i + exam %i as %s (%i points)',
    (ca, exam, grade, gradePoint) => {
      expect(gradeResult(ca, exam)).toEqual({
        totalScore: ca + exam,
        grade,
        gradePoint,
      });
    },
  );

  it('weights GPA by credit units and rounds to two decimals', () => {
    expect(
      calculateGpa([
        { creditUnits: 3, gradePoint: 5 },
        { creditUnits: 3, gradePoint: 2 },
        { creditUnits: 2, gradePoint: 4 },
      ]),
    ).toBe(3.63);
  });

  it('returns 0 when there are no results', () => {
    expect(calculateGpa([])).toBe(0);
  });
});
