import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { Assignment, AssignmentSubmission, RubricCriterion, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type AssignmentWithLesson = Assignment & {
  lesson: { id: string; title: string; courseModule: { courseId: string } };
  _count: { submissions: number };
};

export type SubmissionWithAssignment = AssignmentSubmission & {
  assignment: { id: string; title: string; maxScore: number; dueDate: Date | null };
  user: { id: string; name: string | null; email: string; image: string | null };
  grades: { id: string; criterionId: string; score: number; comment: string | null }[];
};

export interface CreateAssignmentInput {
  lessonId: string;
  title: string;
  description: string;
  instructions?: string;
  maxScore: number;
  dueDate?: Date;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  maxAttempts?: number;
  plagiarismDetection?: boolean;
  rubric?: RubricInput[];
  attachments?: AssignmentAttachment[];
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  instructions?: string;
  maxScore?: number;
  dueDate?: Date;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  maxAttempts?: number;
  plagiarismDetection?: boolean;
  rubric?: RubricInput[];
  attachments?: AssignmentAttachment[];
}

export interface RubricInput {
  criterion: string;
  description?: string;
  maxScore: number;
  weight?: number;
}

export interface AssignmentAttachment {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  userId: string;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  notes?: string;
}

export interface GradeSubmissionInput {
  submissionId: string;
  graderId: string;
  overallScore: number;
  grades: { criterionId: string; score: number; comment?: string }[];
  feedback?: string;
}

export interface AssignmentFilter {
  lessonId?: string;
  courseId?: string;
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
  page?: number;
  limit?: number;
}

export interface SubmissionFilter {
  assignmentId?: string;
  userId?: string;
  status?: string;
  graded?: boolean;
  page?: number;
  limit?: number;
}

export interface LateSubmissionPolicy {
  allowed: boolean;
  penaltyPercent: number;
  maxLateHours: number;
  autoDeduct: boolean;
}

export interface PlagiarismCheckResult {
  score: number;
  matches: { submissionId: string; similarity: number; matchedContent: string }[];
  recommendation: "PASS" | "REVIEW" | "FLAG";
}

export interface AssignmentAnalytics {
  totalSubmissions: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  lateSubmissions: number;
  onTimeRate: number;
  averageTimeToSubmit: number;
  scoreDistribution: { range: string; count: number }[];
  submissionTrend: { date: string; count: number }[];
}

// ── Service ────────────────────────────────────────────────────────────

export const AssignmentService = {
  // ── Assignment CRUD ────────────────────────────────────────────────

  async create(input: CreateAssignmentInput): Promise<Assignment> {
    const lesson = await prisma.lesson.findUnique({
      where: { id: input.lessonId },
    });
    if (!lesson) throw new Error("Lesson not found");

    const assignment = await prisma.assignment.create({
      data: {
        id: generateId(),
        lessonId: input.lessonId,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        maxScore: input.maxScore,
        dueDate: input.dueDate,
        allowLateSubmission: input.allowLateSubmission ?? true,
        latePenaltyPercent: input.latePenaltyPercent ?? 10,
        maxAttempts: input.maxAttempts ?? 3,
        plagiarismDetection: input.plagiarismDetection ?? false,
      },
    });

    if (input.rubric?.length) {
      await prisma.rubricCriterion.createMany({
        data: input.rubric.map((item) => ({
          id: generateId(),
          assignmentId: assignment.id,
          criterion: item.criterion,
          description: item.description,
          maxScore: item.maxScore,
          weight: item.weight ?? 1,
        })),
      });
    }

    return assignment;
  },

  async getById(id: string): Promise<AssignmentWithLesson | null> {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            courseModule: { select: { courseId: true } },
          },
        },
        rubric: true,
        _count: { select: { submissions: true } },
      },
    });
  },

  async update(id: string, input: UpdateAssignmentInput): Promise<Assignment> {
    const data: Prisma.AssignmentUpdateInput = { ...input };

    if (input.rubric) {
      await prisma.rubricCriterion.deleteMany({ where: { assignmentId: id } });
      if (input.rubric.length > 0) {
        await prisma.rubricCriterion.createMany({
          data: input.rubric.map((item) => ({
            id: generateId(),
            assignmentId: id,
            criterion: item.criterion,
            description: item.description,
            maxScore: item.maxScore,
            weight: item.weight ?? 1,
          })),
        });
      }
    }

    return prisma.assignment.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId: id },
    });
    if (submissionCount > 0) {
      throw new Error(
        "Cannot delete assignment with submissions. Archive it instead."
      );
    }

    await prisma.rubricCriterion.deleteMany({ where: { assignmentId: id } });
    await prisma.assignment.delete({ where: { id } });
  },

  async list(filters: AssignmentFilter = {}): Promise<{
    assignments: AssignmentWithLesson[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AssignmentWhereInput = {};
    if (filters.lessonId) where.lessonId = filters.lessonId;
    if (filters.courseId) where.lesson = { courseModule: { courseId: filters.courseId } };
    if (filters.dueBefore) where.dueDate = { lte: filters.dueBefore };
    if (filters.dueAfter) where.dueDate = { gte: filters.dueAfter };
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              courseModule: { select: { courseId: true } },
            },
          },
          rubric: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    return { assignments, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // ── Submission Handling ────────────────────────────────────────────

  async submit(input: SubmitAssignmentInput): Promise<AssignmentSubmission> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: input.assignmentId },
    });
    if (!assignment) throw new Error("Assignment not found");

    const existingSubmissions = await prisma.assignmentSubmission.count({
      where: {
        assignmentId: input.assignmentId,
        userId: input.userId,
      },
    });

    if (assignment.maxAttempts && existingSubmissions >= assignment.maxAttempts) {
      throw new Error(
        `Maximum attempts (${assignment.maxAttempts}) reached`
      );
    }

    if (assignment.dueDate) {
      const isLate = new Date() > assignment.dueDate;
      if (isLate && !assignment.allowLateSubmission) {
        throw new Error("Late submissions are not allowed");
      }
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        id: generateId(),
        assignmentId: input.assignmentId,
        userId: input.userId,
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        notes: input.notes,
        status: "SUBMITTED",
        submittedAt: new Date(),
        attemptNumber: existingSubmissions + 1,
        isLate: assignment.dueDate ? new Date() > assignment.dueDate : false,
      },
    });

    if (assignment.plagiarismDetection) {
      this.runPlagiarismCheck(submission.id).catch(console.error);
    }

    return submission;
  },

  async getSubmission(submissionId: string): Promise<SubmissionWithAssignment | null> {
    return prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          select: { id: true, title: true, maxScore: true, dueDate: true },
        },
        user: { select: { id: true, name: true, email: true, image: true } },
        grades: true,
      },
    });
  },

  async getUserSubmissions(
    assignmentId: string,
    userId: string
  ): Promise<SubmissionWithAssignment[]> {
    return prisma.assignmentSubmission.findMany({
      where: { assignmentId, userId },
      include: {
        assignment: {
          select: { id: true, title: true, maxScore: true, dueDate: true },
        },
        user: { select: { id: true, name: true, email: true, image: true } },
        grades: true,
      },
      orderBy: { submittedAt: "desc" },
    });
  },

  async listSubmissions(filters: SubmissionFilter = {}): Promise<{
    submissions: SubmissionWithAssignment[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AssignmentSubmissionWhereInput = {};
    if (filters.assignmentId) where.assignmentId = filters.assignmentId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.graded !== undefined) {
      where.score = filters.graded ? { not: null } : null;
    }

    const [submissions, total] = await Promise.all([
      prisma.assignmentSubmission.findMany({
        where,
        include: {
          assignment: {
            select: { id: true, title: true, maxScore: true, dueDate: true },
          },
          user: { select: { id: true, name: true, email: true, image: true } },
          grades: true,
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.assignmentSubmission.count({ where }),
    ]);

    return { submissions, total, page, limit };
  },

  // ── Grading ────────────────────────────────────────────────────────

  async gradeSubmission(input: GradeSubmissionInput): Promise<AssignmentSubmission> {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: input.submissionId },
      include: {
        assignment: { select: { maxScore: true, dueDate: true } },
      },
    });
    if (!submission) throw new Error("Submission not found");

    const assignment = submission.assignment;
    let finalScore = input.overallScore;

    if (submission.isLate && assignment.dueDate) {
      const lateHours =
        (Date.now() - assignment.dueDate.getTime()) / (1000 * 60 * 60);
      const penaltyMultiplier = Math.max(
        0,
        1 - Math.floor(lateHours / 24) * 0.1
      );
      finalScore = Math.round(finalScore * penaltyMultiplier * 100) / 100;
    }

    finalScore = Math.min(finalScore, assignment.maxScore);

    return prisma.$transaction(async (tx) => {
      if (input.grades.length > 0) {
        await tx.submissionGrade.deleteMany({
          where: { submissionId: input.submissionId },
        });

        await tx.submissionGrade.createMany({
          data: input.grades.map((g) => ({
            id: generateId(),
            submissionId: input.submissionId,
            criterionId: g.criterionId,
            score: g.score,
            comment: g.comment,
          })),
        });
      }

      return tx.assignmentSubmission.update({
        where: { id: input.submissionId },
        data: {
          score: finalScore,
          feedback: input.feedback,
          status: "GRADED",
          gradedAt: new Date(),
          gradedBy: input.graderId,
        },
      });
    });
  },

  async getRubric(submissionId: string) {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      select: { assignmentId: true },
    });
    if (!submission) throw new Error("Submission not found");

    const rubric = await prisma.rubricCriterion.findMany({
      where: { assignmentId: submission.assignmentId },
      orderBy: { createdAt: "asc" },
    });

    const grades = await prisma.submissionGrade.findMany({
      where: { submissionId },
    });

    const gradeMap = new Map(grades.map((g) => [g.criterionId, g]));

    return rubric.map((criterion) => ({
      ...criterion,
      grade: gradeMap.get(criterion.id) ?? null,
    }));
  },

  // ── Late Submission Policy ─────────────────────────────────────────

  async getLatePolicy(assignmentId: string): Promise<LateSubmissionPolicy> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        allowLateSubmission: true,
        latePenaltyPercent: true,
      },
    });

    if (!assignment) throw new Error("Assignment not found");

    return {
      allowed: assignment.allowLateSubmission,
      penaltyPercent: assignment.latePenaltyPercent ?? 10,
      maxLateHours: 168,
      autoDeduct: true,
    };
  },

  async isSubmissionLate(assignmentId: string, submittedAt: Date): Promise<{
    isLate: boolean;
    lateHours: number;
    penalty: number;
  }> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { dueDate: true, latePenaltyPercent: true, allowLateSubmission: true },
    });

    if (!assignment?.dueDate) {
      return { isLate: false, lateHours: 0, penalty: 0 };
    }

    const isLate = submittedAt > assignment.dueDate;
    const lateHours = isLate
      ? (submittedAt.getTime() - assignment.dueDate.getTime()) / (1000 * 60 * 60)
      : 0;
    const penalty = isLate
      ? Math.min(100, Math.floor(lateHours / 24) * (assignment.latePenaltyPercent ?? 10))
      : 0;

    return { isLate, lateHours, penalty };
  },

  // ── Plagiarism Detection (Conceptual) ──────────────────────────────

  async runPlagiarismCheck(submissionId: string): Promise<PlagiarismCheckResult> {
    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: { select: { id: true, lesson: { select: { courseModule: { select: { courseId: true } } } } } } },
    });
    if (!submission) throw new Error("Submission not found");

    const courseId = submission.assignment.lesson.courseModule.courseId;

    const otherSubmissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: submission.assignmentId,
        id: { not: submissionId },
        content: { not: null },
      },
      select: { id: true, content: true },
    });

    const matches: PlagiarismCheckResult["matches"] = [];
    const submissionContent = (submission.content as string) ?? "";

    for (const other of otherSubmissions) {
      const otherContent = (other.content as string) ?? "";
      const similarity = calculateSimilarity(submissionContent, otherContent);

      if (similarity > 0.3) {
        matches.push({
          submissionId: other.id,
          similarity,
          matchedContent: findMatchingContent(submissionContent, otherContent),
        });
      }
    }

    const maxSimilarity = matches.length > 0
      ? Math.max(...matches.map((m) => m.similarity))
      : 0;

    let recommendation: "PASS" | "REVIEW" | "FLAG" = "PASS";
    if (maxSimilarity > 0.7) recommendation = "FLAG";
    else if (maxSimilarity > 0.4) recommendation = "REVIEW";

    return {
      score: maxSimilarity,
      matches: matches.sort((a, b) => b.similarity - a.similarity).slice(0, 5),
      recommendation,
    };
  },

  // ── Analytics ──────────────────────────────────────────────────────

  async getAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { maxScore: true, dueDate: true },
    });
    if (!assignment) throw new Error("Assignment not found");

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      select: {
        score: true,
        isLate: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    const gradedSubmissions = submissions.filter((s) => s.score !== null);
    const scores = gradedSubmissions.map((s) => s.score!);

    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    const sortedScores = [...scores].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    const lateSubmissions = submissions.filter((s) => s.isLate).length;
    const onTimeSubmissions = submissions.length - lateSubmissions;

    const averageTimeToSubmit =
      submissions.length > 0
        ? submissions.reduce((acc, s) => {
            const hours =
              (s.submittedAt.getTime() - s.createdAt.getTime()) / (1000 * 60 * 60);
            return acc + hours;
          }, 0) / submissions.length
        : 0;

    const bucketSize = Math.ceil(assignment.maxScore / 5);
    const ranges = Array.from({ length: 5 }, (_, i) => {
      const low = i * bucketSize;
      const high = Math.min((i + 1) * bucketSize, assignment.maxScore);
      return { range: `${low}-${high}`, count: 0 };
    });

    scores.forEach((score) => {
      const bucketIndex = Math.min(
        Math.floor(score / bucketSize),
        ranges.length - 1
      );
      ranges[bucketIndex].count++;
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSubmissions = submissions.filter(
      (s) => s.submittedAt >= sevenDaysAgo
    );
    const submissionByDay = new Map<string, number>();
    recentSubmissions.forEach((s) => {
      const date = s.submittedAt.toISOString().split("T")[0];
      submissionByDay.set(date, (submissionByDay.get(date) ?? 0) + 1);
    });

    return {
      totalSubmissions: submissions.length,
      averageScore: Math.round(averageScore * 100) / 100,
      medianScore,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      lateSubmissions,
      onTimeRate: submissions.length > 0
        ? Math.round((onTimeSubmissions / submissions.length) * 100)
        : 0,
      averageTimeToSubmit: Math.round(averageTimeToSubmit * 10) / 10,
      scoreDistribution: ranges,
      submissionTrend: Array.from(submissionByDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  },

  async getUngradedSubmissions(assignmentId: string) {
    return prisma.assignmentSubmission.findMany({
      where: {
        assignmentId,
        status: "SUBMITTED",
        score: null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { submittedAt: "asc" },
    });
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((w) => set2.has(w)));
  const union = new Set([...set1, ...set2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

function findMatchingContent(text1: string, text2: string): string {
  const sentences1 = text1.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const sentences2 = new Set(
    text2.split(/[.!?]+/).filter((s) => s.trim().length > 10)
  );

  for (const sentence of sentences1) {
    const trimmed = sentence.trim();
    for (const s2 of sentences2) {
      if (calculateSimilarity(trimmed, s2.trim()) > 0.6) {
        return trimmed.slice(0, 200);
      }
    }
  }

  return "";
}

export default AssignmentService;
