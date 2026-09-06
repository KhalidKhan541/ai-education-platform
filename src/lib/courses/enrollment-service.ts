import prisma from "@/lib/prisma";

export interface EnrollmentResult {
  success: boolean;
  enrollment?: unknown;
  error?: string;
}

export class EnrollmentService {
  static async enrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { success: false, error: "Course not found" };
    if (!course.isPublished) return { success: false, error: "Course is not published" };

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) return { success: false, error: "Already enrolled" };

    if (course.maxEnrollments) {
      const count = await prisma.enrollment.count({ where: { courseId } });
      if (count >= course.maxEnrollments) return { success: false, error: "Course is full" };
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId, status: "ACTIVE", progress: 0 },
      include: { course: true, user: { select: { id: true, name: true, email: true } } },
    });

    return { success: true, enrollment };
  }

  static async unenrollUser(userId: string, courseId: string): Promise<EnrollmentResult> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) return { success: false, error: "Not enrolled" };

    await prisma.enrollment.delete({
      where: { userId_courseId: { userId, courseId } },
    });

    return { success: true };
  }

  static async getEnrollment(userId: string, courseId: string) {
    return prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        course: {
          include: {
            modules: { include: { lessons: true }, orderBy: { sortOrder: "asc" } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async getUserEnrollments(userId: string) {
    return prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true, image: true } },
            _count: { select: { modules: true, lessons: true } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  static async getCourseEnrollments(courseId: string) {
    return prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  static async updateProgress(userId: string, courseId: string, progress: number) {
    const clampedProgress = Math.min(100, Math.max(0, progress));
    return prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { progress: clampedProgress },
    });
  }

  static async completeCourse(userId: string, courseId: string) {
    return prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    });
  }

  static async getEnrollmentStats(courseId: string) {
    const [total, active, completed] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.enrollment.count({ where: { courseId, status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { courseId, status: "COMPLETED" } }),
    ]);

    const avgProgress = await prisma.enrollment.aggregate({
      where: { courseId },
      _avg: { progress: true },
    });

    return {
      total,
      active,
      completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      avgProgress: avgProgress._avg.progress ?? 0,
    };
  }

  static async isEnrolled(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    return !!enrollment;
  }
}
