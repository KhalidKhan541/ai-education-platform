import prisma from "@/lib/prisma";

export interface ProgressData {
  userId: string;
  lessonId: string;
  completed: boolean;
  timeSpentSeconds?: number;
  score?: number;
}

export class ProgressService {
  static async updateProgress(data: ProgressData) {
    const existing = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId: data.userId, lessonId: data.lessonId } },
    });

    if (existing) {
      return prisma.progress.update({
        where: { id: existing.id },
        data: {
          completed: data.completed,
          timeSpentSeconds: data.timeSpentSeconds
            ? (existing.timeSpentSeconds ?? 0) + data.timeSpentSeconds
            : existing.timeSpentSeconds,
          score: data.score ?? existing.score,
          completedAt: data.completed && !existing.completed ? new Date() : existing.completedAt,
        },
      });
    }

    return prisma.progress.create({
      data: {
        userId: data.userId,
        lessonId: data.lessonId,
        completed: data.completed,
        timeSpentSeconds: data.timeSpentSeconds ?? 0,
        score: data.score,
        completedAt: data.completed ? new Date() : null,
      },
    });
  }

  static async getProgress(userId: string, lessonId: string) {
    return prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      include: {
        lesson: { select: { id: true, title: true, courseId: true } },
      },
    });
  }

  static async getUserCourseProgress(userId: string, courseId: string) {
    const lessons = await prisma.lesson.findMany({
      where: { courseId, isPublished: true },
      select: { id: true },
    });

    const progress = await prisma.progress.findMany({
      where: {
        userId,
        lessonId: { in: lessons.map((l) => l.id) },
      },
    });

    const totalLessons = lessons.length;
    const completedLessons = progress.filter((p) => p.completed).length;
    const totalTimeSpent = progress.reduce((sum, p) => sum + (p.timeSpentSeconds ?? 0), 0);
    const avgScore =
      progress.filter((p) => p.score !== null).reduce((sum, p) => sum + (p.score ?? 0), 0) /
        (progress.filter((p) => p.score !== null).length || 1);

    return {
      totalLessons,
      completedLessons,
      progressPercent: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
      totalTimeSpent,
      avgScore,
      lessons: progress,
    };
  }

  static async getUserProgress(userId: string) {
    return prisma.progress.findMany({
      where: { userId },
      include: {
        lesson: {
          select: { id: true, title: true, courseId: true, course: { select: { id: true, title: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  static async markComplete(userId: string, lessonId: string) {
    return this.updateProgress({ userId, lessonId, completed: true });
  }

  static async isLessonComplete(userId: string, lessonId: string): Promise<boolean> {
    const progress = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    return progress?.completed ?? false;
  }

  static async getCompletionRate(courseId: string, userId: string): Promise<number> {
    const total = await prisma.lesson.count({ where: { courseId, isPublished: true } });
    if (total === 0) return 0;

    const completed = await prisma.progress.count({
      where: { userId, completed: true, lesson: { courseId } },
    });

    return (completed / total) * 100;
  }
}
