import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { LessonProgress, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type ProgressWithLesson = LessonProgress & {
  lesson: {
    id: string;
    title: string;
    slug: string;
    type: string;
    duration: number | null;
    courseModule: {
      id: string;
      title: string;
      courseId: string;
    };
  };
};

export interface ProgressUpdateInput {
  userId: string;
  lessonId: string;
  timeSpent?: number;
  score?: number;
  completed?: boolean;
}

export interface CourseProgress {
  courseId: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalTimeSpent: number;
  lastAccessedAt: Date | null;
  moduleProgress: ModuleProgress[];
  estimatedTimeRemaining: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ModuleProgress {
  moduleId: string;
  title: string;
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
}

export interface LearningPathProgress {
  pathId: string;
  courses: {
    courseId: string;
    title: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    progressPercentage: number;
    order: number;
  }[];
  overallProgress: number;
  estimatedCompletionDate: Date | null;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date | null;
  totalActiveDays: number;
  weeklyActivity: { day: string; active: boolean; minutesSpent: number }[];
}

export interface ProgressFilter {
  userId?: string;
  courseId?: string;
  lessonId?: string;
  completed?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

// ── Service ────────────────────────────────────────────────────────────

export const ProgressService = {
  // ── Core Progress Tracking ─────────────────────────────────────────

  async updateProgress(input: ProgressUpdateInput): Promise<LessonProgress> {
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId: input.userId, lessonId: input.lessonId } },
    });

    const data: Prisma.LessonProgressUpdateInput = {
      lastAccessedAt: new Date(),
    };

    if (input.timeSpent !== undefined) {
      data.timeSpent = { increment: input.timeSpent };
    }
    if (input.score !== undefined) {
      data.score = input.score;
    }
    if (input.completed) {
      data.completedAt = new Date();
    }

    if (existing) {
      return prisma.lessonProgress.update({
        where: { id: existing.id },
        data,
      });
    }

    return prisma.lessonProgress.create({
      data: {
        id: generateId(),
        userId: input.userId,
        lessonId: input.lessonId,
        timeSpent: input.timeSpent ?? 0,
        score: input.score,
        completedAt: input.completed ? new Date() : null,
        lastAccessedAt: new Date(),
      },
    });
  },

  async markComplete(userId: string, lessonId: string): Promise<LessonProgress> {
    return this.updateProgress({
      userId,
      lessonId,
      completed: true,
    });
  },

  async markIncomplete(userId: string, lessonId: string): Promise<LessonProgress> {
    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (!existing) throw new Error("No progress record found");

    return prisma.lessonProgress.update({
      where: { id: existing.id },
      data: { completedAt: null },
    });
  },

  async trackTime(userId: string, lessonId: string, seconds: number): Promise<void> {
    if (seconds <= 0) return;

    const existing = await prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (existing) {
      await prisma.lessonProgress.update({
        where: { id: existing.id },
        data: {
          timeSpent: { increment: seconds },
          lastAccessedAt: new Date(),
        },
      });
    } else {
      await prisma.lessonProgress.create({
        data: {
          id: generateId(),
          userId,
          lessonId,
          timeSpent: seconds,
          lastAccessedAt: new Date(),
        },
      });
    }
  },

  // ── Progress Queries ───────────────────────────────────────────────

  async getLessonProgress(
    userId: string,
    lessonId: string
  ): Promise<LessonProgress | null> {
    return prisma.lessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  },

  async getUserProgress(
    userId: string,
    page = 1,
    limit = 50
  ): Promise<{
    progress: ProgressWithLesson[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;

    const [progress, total] = await Promise.all([
      prisma.lessonProgress.findMany({
        where: { userId },
        include: {
          lesson: {
            select: {
              id: true,
              title: true,
              slug: true,
              type: true,
              duration: true,
              courseModule: {
                select: { id: true, title: true, courseId: true },
              },
            },
          },
        },
        orderBy: { lastAccessedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.lessonProgress.count({ where: { userId } }),
    ]);

    return { progress, total, page, limit };
  },

  async getCourseProgress(userId: string, courseId: string): Promise<CourseProgress> {
    const modules = await prisma.courseModule.findMany({
      where: { courseId },
      include: {
        lessons: {
          select: { id: true, title: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));

    const allProgress = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lessonId: { in: allLessonIds },
      },
      select: {
        lessonId: true,
        completedAt: true,
        timeSpent: true,
        lastAccessedAt: true,
      },
    });

    const completedLessonIds = new Set(
      allProgress.filter((p) => p.completedAt).map((p) => p.lessonId)
    );

    const totalTimeSpent = allProgress.reduce((acc, p) => acc + p.timeSpent, 0);

    const lastAccess = allProgress
      .filter((p) => p.lastAccessedAt)
      .sort((a, b) => b.lastAccessedAt!.getTime() - a.lastAccessedAt!.getTime())[0];

    const totalLessons = allLessonIds.length;
    const completedLessons = completedLessonIds.size;

    const moduleProgress: ModuleProgress[] = modules.map((mod) => {
      const modLessonIds = mod.lessons.map((l) => l.id);
      const modCompleted = modLessonIds.filter((id) => completedLessonIds.has(id)).length;
      return {
        moduleId: mod.id,
        title: mod.title,
        totalLessons: modLessonIds.length,
        completedLessons: modCompleted,
        progressPercentage:
          modLessonIds.length > 0
            ? Math.round((modCompleted / modLessonIds.length) * 100)
            : 0,
      };
    });

    const incompleteLessons = modules.flatMap((mod) =>
      mod.lessons.filter((l) => !completedLessonIds.has(l.id))
    );
    const estimatedTimeRemaining = incompleteLessons.length * 10 * 60;

    const streakInfo = await this.getStreakInfo(userId);

    return {
      courseId,
      totalLessons,
      completedLessons,
      progressPercentage:
        totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      totalTimeSpent,
      lastAccessedAt: lastAccess?.lastAccessedAt ?? null,
      moduleProgress,
      estimatedTimeRemaining,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
    };
  },

  // ── Learning Path Progress ─────────────────────────────────────────

  async getLearningPathProgress(
    userId: string,
    pathId: string
  ): Promise<LearningPathProgress> {
    const pathCourses = await prisma.learningPathCourse.findMany({
      where: { learningPathId: pathId },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { order: "asc" },
    });

    const courseProgressEntries = await Promise.all(
      pathCourses.map(async (pc) => {
        const progress = await this.getCourseProgress(userId, pc.courseId);
        let status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";
        if (progress.progressPercentage === 100) status = "COMPLETED";
        else if (progress.progressPercentage > 0) status = "IN_PROGRESS";

        return {
          courseId: pc.courseId,
          title: pc.course.title,
          status,
          progressPercentage: progress.progressPercentage,
          order: pc.order,
        };
      })
    );

    const completedCourses = courseProgressEntries.filter((c) => c.status === "COMPLETED").length;
    const overallProgress = Math.round(
      (completedCourses / (pathCourses.length || 1)) * 100
    );

    let estimatedCompletionDate: Date | null = null;
    const incompleteCourses = courseProgressEntries.filter((c) => c.status !== "COMPLETED");
    if (incompleteCourses.length > 0 && overallProgress > 0) {
      const daysPerCourse = 14;
      estimatedCompletionDate = new Date();
      estimatedCompletionDate.setDate(
        estimatedCompletionDate.getDate() + incompleteCourses.length * daysPerCourse
      );
    }

    return {
      pathId,
      courses: courseProgressEntries,
      overallProgress,
      estimatedCompletionDate,
    };
  },

  // ── Streak Tracking ────────────────────────────────────────────────

  async getStreakInfo(userId: string): Promise<StreakInfo> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activity = await prisma.lessonProgress.findMany({
      where: {
        userId,
        lastAccessedAt: { gte: thirtyDaysAgo },
        timeSpent: { gt: 0 },
      },
      select: {
        lastAccessedAt: true,
        timeSpent: true,
      },
    });

    const activeDates = new Map<string, number>();
    activity.forEach((a) => {
      if (a.lastAccessedAt) {
        const dateStr = a.lastAccessedAt.toISOString().split("T")[0];
        activeDates.set(dateStr, (activeDates.get(dateStr) ?? 0) + a.timeSpent);
      }
    });

    const sortedDates = Array.from(activeDates.keys()).sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastActiveDate: Date | null = null;

    if (sortedDates.length > 0) {
      lastActiveDate = new Date(sortedDates[0]);

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      if (sortedDates[0] === today || sortedDates[0] === yesterday) {
        for (let i = 0; i < sortedDates.length; i++) {
          if (i === 0) {
            currentStreak = 1;
            tempStreak = 1;
          } else {
            const prevDate = new Date(sortedDates[i - 1]);
            const currDate = new Date(sortedDates[i]);
            const diffDays =
              (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

            if (Math.abs(diffDays - 1) < 0.1) {
              currentStreak++;
              tempStreak++;
            } else {
              break;
            }
          }
        }
      }

      tempStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays =
          (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24);

        if (Math.abs(diffDays - 1) < 0.1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    }

    const totalActiveDays = activeDates.size;

    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyActivity = weekDays.map((day) => {
      const dayIndex = weekDays.indexOf(day);
      const dayMinutes = Array.from(activeDates.entries())
        .filter(([, minutes]) => minutes > 0)
        .reduce((acc) => acc, 0);
      return {
        day,
        active: dayMinutes > 0,
        minutesSpent: Math.round(dayMinutes / 60),
      };
    });

    return {
      currentStreak,
      longestStreak,
      lastActiveDate,
      totalActiveDays,
      weeklyActivity,
    };
  },

  async recordDailyActivity(userId: string): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    const todayProgress = await prisma.lessonProgress.findFirst({
      where: {
        userId,
        lastAccessedAt: {
          gte: new Date(today),
          lt: new Date(Date.now() + 86400000),
        },
        timeSpent: { gt: 0 },
      },
    });

    if (todayProgress) {
      const existing = await prisma.dailyActivity.findUnique({
        where: { userId_date: { userId, date: new Date(today) } },
      });

      if (existing) {
        const totalTime = await prisma.lessonProgress.aggregate({
          where: {
            userId,
            lastAccessedAt: {
              gte: new Date(today),
              lt: new Date(Date.now() + 86400000),
            },
          },
          _sum: { timeSpent: true },
        });

        await prisma.dailyActivity.update({
          where: { id: existing.id },
          data: { minutesSpent: Math.round((totalTime._sum.timeSpent ?? 0) / 60) },
        });
      } else {
        const totalTime = await prisma.lessonProgress.aggregate({
          where: {
            userId,
            lastAccessedAt: {
              gte: new Date(today),
              lt: new Date(Date.now() + 86400000),
            },
          },
          _sum: { timeSpent: true },
        });

        await prisma.dailyActivity.create({
          data: {
            id: generateId(),
            userId,
            date: new Date(today),
            minutesSpent: Math.round((totalTime._sum.timeSpent ?? 0) / 60),
          },
        });
      }
    }
  },

  // ── Progress Analytics ─────────────────────────────────────────────

  async getProgressAnalytics(userId: string) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [totalProgress, recentProgress, courseIds] = await Promise.all([
      prisma.lessonProgress.aggregate({
        where: { userId },
        _count: true,
        _sum: { timeSpent: true },
      }),
      prisma.lessonProgress.findMany({
        where: {
          userId,
          lastAccessedAt: { gte: thirtyDaysAgo },
        },
        include: {
          lesson: {
            select: {
              courseModule: { select: { courseId: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: "desc" },
      }),
      prisma.enrollment.findMany({
        where: { userId, status: "ACTIVE" },
        select: { courseId: true },
      }),
    ]);

    const timeByDay = new Map<string, number>();
    recentProgress.forEach((p) => {
      if (p.lastAccessedAt) {
        const date = p.lastAccessedAt.toISOString().split("T")[0];
        timeByDay.set(date, (timeByDay.get(date) ?? 0) + p.timeSpent);
      }
    });

    const dailyTime = Array.from(timeByDay.entries())
      .map(([date, seconds]) => ({
        date,
        minutes: Math.round(seconds / 60),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const completedLessons = recentProgress.filter((p) => p.completedAt).length;
    const totalLessonsAccessed = recentProgress.length;

    return {
      totalLessonsCompleted: totalProgress._count,
      totalTimeSpent: totalProgress._sum.timeSpent ?? 0,
      recentActivity: {
        lessonsAccessed: totalLessonsAccessed,
        lessonsCompleted: completedLessons,
        dailyTime,
      },
      activeCourses: courseIds.length,
      averageSessionLength:
        totalLessonsAccessed > 0
          ? Math.round((totalProgress._sum.timeSpent ?? 0) / totalLessonsAccessed)
          : 0,
    };
  },

  async getLeaderboard(courseId: string, limit = 10) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId, status: "ACTIVE" },
      select: { userId: true },
    });

    const userIds = enrollments.map((e) => e.userId);

    const progressData = await prisma.lessonProgress.groupBy({
      by: ["userId"],
      where: {
        userId: { in: userIds },
        completedAt: { not: null },
      },
      _count: true,
      _sum: { timeSpent: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    const userIdsInLeaderboard = progressData.map((p) => p.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIdsInLeaderboard } },
      select: { id: true, name: true, image: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return progressData.map((p, index) => ({
      rank: index + 1,
      userId: p.userId,
      name: userMap.get(p.userId)?.name ?? "Unknown",
      image: userMap.get(p.userId)?.image ?? null,
      completedLessons: p._count,
      totalTimeSpent: p._sum.timeSpent ?? 0,
    }));
  },

  // ── Batch Operations ───────────────────────────────────────────────

  async batchUpdateProgress(
    updates: ProgressUpdateInput[]
  ): Promise<LessonProgress[]> {
    return prisma.$transaction(
      updates.map((update) =>
        this.updateProgress(update)
      )
    );
  },

  async resetProgress(userId: string, courseId: string): Promise<void> {
    const lessons = await prisma.lesson.findMany({
      where: { courseModule: { courseId } },
      select: { id: true },
    });

    await prisma.lessonProgress.deleteMany({
      where: {
        userId,
        lessonId: { in: lessons.map((l) => l.id) },
      },
    });
  },

  async exportProgress(userId: string, courseId: string) {
    const lessons = await prisma.lesson.findMany({
      where: { courseModule: { courseId } },
      include: {
        progress: { where: { userId } },
        courseModule: { select: { title: true } },
      },
      orderBy: [{ courseModule: { order: "asc" } }, { order: "asc" }],
    });

    return lessons.map((lesson) => ({
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      moduleTitle: lesson.courseModule.title,
      type: lesson.type,
      duration: lesson.duration,
      completed: lesson.progress[0]?.completedAt !== null,
      timeSpent: lesson.progress[0]?.timeSpent ?? 0,
      score: lesson.progress[0]?.score,
      lastAccessedAt: lesson.progress[0]?.lastAccessedAt,
    }));
  },
};

export default ProgressService;
