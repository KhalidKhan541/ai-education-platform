import prisma from "@/lib/prisma";

export interface CreateAssignmentData {
  courseId: string;
  title: string;
  description?: string;
  instructions?: string;
  maxPoints: number;
  passingPoints?: number;
  dueDate?: string;
  allowLateSub?: boolean;
  latePenalty?: number;
  maxAttempts?: number;
  isPublished?: boolean;
}

export interface SubmissionData {
  assignmentId: string;
  userId: string;
  content?: string;
  fileUrls?: string[];
}

export class AssignmentService {
  static async getAssignmentsByCourse(courseId: string) {
    return prisma.assignment.findMany({
      where: { courseId },
      include: {
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getAssignmentById(id: string) {
    return prisma.assignment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
        submissions: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { submittedAt: "desc" },
        },
        _count: { select: { submissions: true } },
      },
    });
  }

  static async createAssignment(data: CreateAssignmentData) {
    return prisma.assignment.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        maxPoints: data.maxPoints,
        passingPoints: data.passingPoints,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        allowLateSub: data.allowLateSub ?? true,
        latePenalty: data.latePenalty,
        maxAttempts: data.maxAttempts ?? 3,
        isPublished: data.isPublished ?? false,
      },
    });
  }

  static async updateAssignment(id: string, data: Partial<CreateAssignmentData>) {
    return prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    });
  }

  static async deleteAssignment(id: string) {
    return prisma.assignment.delete({ where: { id } });
  }

  static async submitAssignment(data: SubmissionData) {
    const assignment = await prisma.assignment.findUnique({
      where: { id: data.assignmentId },
      include: { submissions: { where: { userId: data.userId } } },
    });

    if (!assignment) throw new Error("Assignment not found");
    if (!assignment.isPublished) throw new Error("Assignment is not published");

    const attemptCount = assignment.submissions.length;
    if (attemptCount >= assignment.maxAttempts) {
      throw new Error("Maximum attempts reached");
    }

    if (assignment.dueDate && new Date() > assignment.dueDate && !assignment.allowLateSub) {
      throw new Error("Submission deadline passed");
    }

    let penalty = 0;
    if (assignment.dueDate && new Date() > assignment.dueDate && assignment.latePenalty) {
      const daysLate = Math.ceil(
        (Date.now() - assignment.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      penalty = Math.min(assignment.latePenalty * daysLate, 100);
    }

    return prisma.submission.create({
      data: {
        assignmentId: data.assignmentId,
        userId: data.userId,
        content: data.content,
        fileUrls: data.fileUrls ? JSON.stringify(data.fileUrls) : null,
        attemptNumber: attemptCount + 1,
        latePenalty: penalty,
        status: "SUBMITTED",
      },
      include: {
        assignment: { select: { id: true, title: true, maxPoints: true } },
      },
    });
  }

  static async gradeSubmission(
    submissionId: string,
    points: number,
    feedback?: string
  ) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) throw new Error("Submission not found");

    const penalty = submission.latePenalty ?? 0;
    const finalScore = Math.max(0, points * (1 - penalty / 100));

    return prisma.submission.update({
      where: { id: submissionId },
      data: {
        points: finalScore,
        feedback,
        status: "GRADED",
        gradedAt: new Date(),
      },
    });
  }

  static async getUserSubmissions(userId: string, assignmentId: string) {
    return prisma.submission.findMany({
      where: { userId, assignmentId },
      orderBy: { submittedAt: "desc" },
    });
  }

  static async getSubmissionById(id: string) {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        assignment: true,
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async isOverdue(assignmentId: string): Promise<boolean> {
    const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment?.dueDate) return false;
    return new Date() > assignment.dueDate;
  }

  static async getAssignmentStats(assignmentId: string) {
    const [total, graded, submissions] = await Promise.all([
      prisma.submission.count({ where: { assignmentId } }),
      prisma.submission.count({ where: { assignmentId, status: "GRADED" } }),
      prisma.submission.findMany({
        where: { assignmentId, status: "GRADED" },
        select: { points: true },
      }),
    ]);

    const scores = submissions.map((s) => s.points ?? 0);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return { total, graded, avgScore, submissions: scores };
  }
}
