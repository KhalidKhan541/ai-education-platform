export interface GradeEntry {
  score: number;
  maxScore: number;
  weight: number;
  name: string;
  category?: string;
  submittedAt?: string;
  gradedAt?: string;
}

export interface GradeResult {
  percentage: number;
  letterGrade: string;
  gpaPoints: number;
  totalWeightedScore: number;
  totalWeight: number;
  passed: boolean;
}

export interface WeightedCategory {
  name: string;
  weight: number;
  assignments: GradeEntry[];
}

// Letter grade scale (US standard)
const LETTER_GRADE_SCALE: Array<{
  min: number;
  max: number;
  grade: string;
  gpa: number;
}> = [
  { min: 97, max: 100, grade: "A+", gpa: 4.0 },
  { min: 93, max: 96.99, grade: "A", gpa: 4.0 },
  { min: 90, max: 92.99, grade: "A-", gpa: 3.7 },
  { min: 87, max: 89.99, grade: "B+", gpa: 3.3 },
  { min: 83, max: 86.99, grade: "B", gpa: 3.0 },
  { min: 80, max: 82.99, grade: "B-", gpa: 2.7 },
  { min: 77, max: 79.99, grade: "C+", gpa: 2.3 },
  { min: 73, max: 76.99, grade: "C", gpa: 2.0 },
  { min: 70, max: 72.99, grade: "C-", gpa: 1.7 },
  { min: 67, max: 69.99, grade: "D+", gpa: 1.3 },
  { min: 63, max: 66.99, grade: "D", gpa: 1.0 },
  { min: 60, max: 62.99, grade: "D-", gpa: 0.7 },
  { min: 0, max: 59.99, grade: "F", gpa: 0.0 },
];

// Alternative grading scales
export type GradingScale =
  | "standard"
  | "plus-minus"
  | "pass-fail"
  | "percentage"
  | "10-point";

const PASS_FAIL_SCALE = [
  { min: 60, max: 100, grade: "P", gpa: 0.0 },
  { min: 0, max: 59.99, grade: "F", gpa: 0.0 },
];

const TEN_POINT_SCALE = [
  { min: 90, max: 100, grade: "A", gpa: 4.0 },
  { min: 80, max: 89.99, grade: "B", gpa: 3.0 },
  { min: 70, max: 79.99, grade: "C", gpa: 2.0 },
  { min: 60, max: 69.99, grade: "D", gpa: 1.0 },
  { min: 0, max: 59.99, grade: "F", gpa: 0.0 },
];

export function getLetterGrade(
  percentage: number,
  scale: GradingScale = "plus-minus"
): { grade: string; gpa: number } {
  let gradeScale = LETTER_GRADE_SCALE;

  if (scale === "pass-fail") gradeScale = PASS_FAIL_SCALE;
  else if (scale === "10-point") gradeScale = TEN_POINT_SCALE;

  const clamped = Math.max(0, Math.min(100, percentage));
  const match = gradeScale.find(
    (entry) => clamped >= entry.min && clamped <= entry.max
  );
  return match
    ? { grade: match.grade, gpa: match.gpa }
    : { grade: "F", gpa: 0.0 };
}

export function calculateWeightedAverage(
  grades: GradeEntry[]
): GradeResult {
  if (grades.length === 0) {
    return {
      percentage: 0,
      letterGrade: "F",
      gpaPoints: 0,
      totalWeightedScore: 0,
      totalWeight: 0,
      passed: false,
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const grade of grades) {
    const scorePercent =
      grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
    totalWeightedScore += scorePercent * grade.weight;
    totalWeight += grade.weight;
  }

  const percentage = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
  const { grade: letterGrade, gpa } = getLetterGrade(percentage);

  return {
    percentage: Math.round(percentage * 100) / 100,
    letterGrade,
    gpaPoints: gpa,
    totalWeightedScore,
    totalWeight,
    passed: percentage >= 60,
  };
}

export function calculateCategoryGrades(
  categories: WeightedCategory[]
): GradeResult {
  const categoryGrades: Array<{
    percentage: number;
    weight: number;
  }> = [];

  for (const category of categories) {
    if (category.assignments.length === 0) continue;

    const result = calculateWeightedAverage(category.assignments);
    categoryGrades.push({
      percentage: result.percentage,
      weight: category.weight,
    });
  }

  if (categoryGrades.length === 0) {
    return {
      percentage: 0,
      letterGrade: "F",
      gpaPoints: 0,
      totalWeightedScore: 0,
      totalWeight: 0,
      passed: false,
    };
  }

  let totalWeighted = 0;
  let totalWeight = 0;

  for (const cg of categoryGrades) {
    totalWeighted += cg.percentage * cg.weight;
    totalWeight += cg.weight;
  }

  const percentage = totalWeight > 0 ? totalWeighted / totalWeight : 0;
  const { grade: letterGrade, gpa } = getLetterGrade(percentage);

  return {
    percentage: Math.round(percentage * 100) / 100,
    letterGrade,
    gpaPoints: gpa,
    totalWeightedScore: totalWeighted,
    totalWeight,
    passed: percentage >= 60,
  };
}

// GPA calculation
export function calculateGPA(
  courses: Array<{
    grade: string;
    credits: number;
    scale?: GradingScale;
  }>
): number {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const course of courses) {
    const percentage = letterGradeToPercentage(course.grade);
    const { gpa } = getLetterGrade(percentage, course.scale || "plus-minus");
    totalPoints += gpa * course.credits;
    totalCredits += course.credits;
  }

  return totalCredits > 0
    ? Math.round((totalPoints / totalCredits) * 100) / 100
    : 0;
}

function letterGradeToPercentage(grade: string): number {
  const normalizedGrade = grade.trim().toUpperCase();
  const match = LETTER_GRADE_SCALE.find(
    (entry) => entry.grade === normalizedGrade
  );
  if (match) return (match.min + match.max) / 2;
  return 0;
}

// Progress calculation
export function calculateCourseProgress(
  completedItems: number,
  totalItems: number
): number {
  if (totalItems === 0) return 0;
  return Math.round((completedItems / totalItems) * 10000) / 100;
}

export function calculateModuleProgress(
  completedLessons: number,
  totalLessons: number,
  completedAssignments: number,
  totalAssignments: number,
  completedQuizzes: number,
  totalQuizzes: number,
  weights?: {
    lessons?: number;
    assignments?: number;
    quizzes?: number;
  }
): number {
  const w = {
    lessons: weights?.lessons ?? 0.4,
    assignments: weights?.assignments ?? 0.35,
    quizzes: weights?.quizzes ?? 0.25,
  };

  const lessonProgress =
    totalLessons > 0 ? completedLessons / totalLessons : 0;
  const assignmentProgress =
    totalAssignments > 0 ? completedAssignments / totalAssignments : 0;
  const quizProgress =
    totalQuizzes > 0 ? completedQuizzes / totalQuizzes : 0;

  const progress =
    lessonProgress * w.lessons +
    assignmentProgress * w.assignments +
    quizProgress * w.quizzes;

  return Math.round(progress * 10000) / 100;
}

// Grade distribution analysis
export interface GradeDistribution {
  total: number;
  average: number;
  median: number;
  mode: number;
  standardDeviation: number;
  min: number;
  max: number;
  ranges: Record<string, number>;
}

export function analyzeGradeDistribution(
  grades: number[]
): GradeDistribution {
  if (grades.length === 0) {
    return {
      total: 0,
      average: 0,
      median: 0,
      mode: 0,
      standardDeviation: 0,
      min: 0,
      max: 0,
      ranges: {},
    };
  }

  const sorted = [...grades].sort((a, b) => a - b);
  const total = sorted.length;
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const average = sum / total;

  // Median
  const mid = Math.floor(total / 2);
  const median =
    total % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  // Mode
  const frequency = new Map<number, number>();
  for (const grade of sorted) {
    frequency.set(grade, (frequency.get(grade) || 0) + 1);
  }
  let mode = sorted[0];
  let maxFreq = 0;
  for (const [value, freq] of frequency.entries()) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = value;
    }
  }

  // Standard deviation
  const squaredDiffs = sorted.map((val) => Math.pow(val - average, 2));
  const variance =
    squaredDiffs.reduce((acc, val) => acc + val, 0) / total;
  const standardDeviation = Math.sqrt(variance);

  // Range distribution
  const ranges: Record<string, number> = {
    "A (90-100)": 0,
    "B (80-89)": 0,
    "C (70-79)": 0,
    "D (60-69)": 0,
    "F (0-59)": 0,
  };

  for (const grade of sorted) {
    if (grade >= 90) ranges["A (90-100)"]++;
    else if (grade >= 80) ranges["B (80-89)"]++;
    else if (grade >= 70) ranges["C (70-79)"]++;
    else if (grade >= 60) ranges["D (60-69)"]++;
    else ranges["F (0-59)"]++;
  }

  return {
    total,
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    mode: Math.round(mode * 100) / 100,
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    ranges,
  };
}

// Rubric scoring
export interface RubricCriterion {
  name: string;
  maxPoints: number;
  description?: string;
}

export interface RubricScore {
  criterion: string;
  points: number;
  feedback?: string;
}

export function calculateRubricScore(
  criteria: RubricCriterion[],
  scores: RubricScore[]
): {
  total: number;
  maxTotal: number;
  percentage: number;
  breakdown: Array<RubricScore & { maxPoints: number; percentage: number }>;
} {
  let total = 0;
  let maxTotal = 0;
  const breakdown: Array<
    RubricScore & { maxPoints: number; percentage: number }
  > = [];

  for (const criterion of criteria) {
    const score = scores.find((s) => s.criterion === criterion.name);
    const points = score?.points || 0;
    const percentage =
      criterion.maxPoints > 0
        ? (points / criterion.maxPoints) * 100
        : 0;

    total += points;
    maxTotal += criterion.maxPoints;

    breakdown.push({
      criterion: criterion.name,
      points,
      maxPoints: criterion.maxPoints,
      percentage: Math.round(percentage * 100) / 100,
      feedback: score?.feedback,
    });
  }

  return {
    total,
    maxTotal,
    percentage:
      maxTotal > 0 ? Math.round((total / maxTotal) * 10000) / 100 : 0,
    breakdown,
  };
}

// Grade weights helper
export function normalizeWeights(
  items: Array<{ name: string; weight: number }>
): Array<{ name: string; weight: number; normalizedWeight: number }> {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  return items.map((item) => ({
    ...item,
    normalizedWeight:
      totalWeight > 0
        ? Math.round((item.weight / totalWeight) * 10000) / 100
        : 0,
  }));
}

// Score color helper (for UI)
export function getScoreColor(percentage: number): string {
  if (percentage >= 90) return "#22c55e"; // green
  if (percentage >= 80) return "#3b82f6"; // blue
  if (percentage >= 70) return "#f59e0b"; // amber
  if (percentage >= 60) return "#f97316"; // orange
  return "#ef4444"; // red
}

// GPA to description
export function getGpaDescription(gpa: number): string {
  if (gpa >= 3.9) return "Outstanding";
  if (gpa >= 3.5) return "Excellent";
  if (gpa >= 3.0) return "Good";
  if (gpa >= 2.5) return "Above Average";
  if (gpa >= 2.0) return "Average";
  if (gpa >= 1.0) return "Below Average";
  if (gpa > 0) return "Poor";
  return "No Grade";
}
