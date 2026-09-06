import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type { Lesson, LessonType, Prisma } from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type LessonWithModule = Lesson & {
  courseModule: {
    id: string;
    title: string;
    courseId: string;
    course: { id: string; title: string; slug: string };
  };
};

export type LessonDetail = LessonWithModule & {
  prerequisites: { id: string; title: string; slug: string }[];
  _count: { progress: number; comments: number };
};

export interface CreateLessonInput {
  courseModuleId: string;
  title: string;
  description?: string;
  type: LessonType;
  content?: Prisma.InputJsonValue;
  duration?: number;
  isRequired?: boolean;
  isPublished?: boolean;
  videoUrl?: string;
  assignmentId?: string;
  quizId?: string;
  prerequisiteIds?: string[];
}

export interface UpdateLessonInput {
  title?: string;
  description?: string;
  content?: Prisma.InputJsonValue;
  duration?: number;
  isRequired?: boolean;
  isPublished?: boolean;
  videoUrl?: string;
  assignmentId?: string;
  quizId?: string;
  prerequisiteIds?: string[];
}

export interface LessonFilter {
  courseModuleId?: string;
  courseId?: string;
  type?: LessonType;
  isPublished?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ReorderLessonsInput {
  lessonIds: string[];
}

export interface LessonCompletionStatus {
  lessonId: string;
  completed: boolean;
  timeSpent: number;
  lastAccessedAt: Date | null;
  score: number | null;
}

export interface LessonWithProgress extends LessonDetail {
  completionStatus: LessonCompletionStatus | null;
}

// ── Service ────────────────────────────────────────────────────────────

export const LessonService = {
  async create(input: CreateLessonInput): Promise<Lesson> {
    const module = await prisma.courseModule.findUnique({
      where: { id: input.courseModuleId },
    });
    if (!module) throw new Error("Module not found");

    const maxOrder = await prisma.lesson.findFirst({
      where: { courseModuleId: input.courseModuleId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const slug = await generateUniqueLessonSlug(
      input.title,
      input.courseModuleId
    );

    const lesson = await prisma.lesson.create({
      data: {
        id: generateId(),
        courseModuleId: input.courseModuleId,
        title: input.title,
        slug,
        description: input.description,
        type: input.type,
        content: input.content ?? {},
        duration: input.duration,
        isRequired: input.isRequired ?? true,
        isPublished: input.isPublished ?? false,
        order: (maxOrder?.order ?? 0) + 1,
        videoUrl: input.videoUrl,
        assignmentId: input.assignmentId,
        quizId: input.quizId,
      },
    });

    if (input.prerequisiteIds?.length) {
      await prisma.lessonDependency.createMany({
        data: input.prerequisiteIds.map((prerequisiteId) => ({
          id: generateId(),
          lessonId: lesson.id,
          prerequisiteId,
        })),
      });
    }

    return lesson;
  },

  async getById(id: string, userId?: string): Promise<LessonDetail | null> {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        courseModule: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
        prerequisites: {
          include: { prerequisite: { select: { id: true, title: true, slug: true } } },
        },
        _count: { select: { progress: true, comments: true } },
      },
    });

    if (!lesson) return null;

    return {
      ...lesson,
      prerequisites: lesson.prerequisites.map((dep) => dep.prerequisite),
    } as LessonDetail;
  },

  async getWithProgress(
    lessonId: string,
    userId: string
  ): Promise<LessonWithProgress | null> {
    const lesson = await this.getById(lessonId);
    if (!lesson) return null;

    const progress = await prisma.lessonProgress.findUnique({
      where: {
        userId_lessonId: { userId, lessonId },
      },
    });

    return {
      ...lesson,
      completionStatus: progress
        ? {
            lessonId: progress.lessonId,
            completed: progress.completedAt !== null,
            timeSpent: progress.timeSpent,
            lastAccessedAt: progress.lastAccessedAt,
            score: progress.score,
          }
        : null,
    };
  },

  async update(id: string, input: UpdateLessonInput): Promise<Lesson> {
    const data: Prisma.LessonUpdateInput = { ...input };

    if (input.title) {
      const lesson = await prisma.lesson.findUnique({ where: { id } });
      if (lesson) {
        data.slug = await generateUniqueLessonSlug(
          input.title,
          lesson.courseModuleId,
          id
        );
      }
    }

    if (input.prerequisiteIds !== undefined) {
      await prisma.lessonDependency.deleteMany({ where: { lessonId: id } });
      if (input.prerequisiteIds.length > 0) {
        await prisma.lessonDependency.createMany({
          data: input.prerequisiteIds.map((prerequisiteId) => ({
            id: generateId(),
            lessonId: id,
            prerequisiteId,
          })),
        });
      }
    }

    return prisma.lesson.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    const progressCount = await prisma.lessonProgress.count({
      where: { lessonId: id },
    });
    if (progressCount > 0) {
      throw new Error("Cannot delete lesson with student progress. Archive it instead.");
    }

    await prisma.lessonDependency.deleteMany({ where: { lessonId: id } });
    await prisma.lesson.delete({ where: { id } });
  },

  async publish(id: string): Promise<Lesson> {
    const lesson = await prisma.lesson.findUnique({ where: { id } });
    if (!lesson) throw new Error("Lesson not found");

    if (!lesson.content || Object.keys(lesson.content as object).length === 0) {
      throw new Error("Cannot publish a lesson without content");
    }

    return prisma.lesson.update({
      where: { id },
      data: { isPublished: true },
    });
  },

  async unpublish(id: string): Promise<Lesson> {
    return prisma.lesson.update({
      where: { id },
      data: { isPublished: false },
    });
  },

  async list(filters: LessonFilter = {}): Promise<{
    lessons: LessonWithModule[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.LessonWhereInput = {};
    if (filters.courseModuleId) where.courseModuleId = filters.courseModuleId;
    if (filters.courseId) where.courseModule = { courseId: filters.courseId };
    if (filters.type) where.type = filters.type;
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [lessons, total] = await Promise.all([
      prisma.lesson.findMany({
        where,
        include: {
          courseModule: {
            include: {
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
        orderBy: { order: "asc" },
        skip,
        take: limit,
      }),
      prisma.lesson.count({ where }),
    ]);

    return { lessons, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async reorderLessons(moduleId: string, input: ReorderLessonsInput): Promise<void> {
    await prisma.$transaction(
      input.lessonIds.map((lessonId, index) =>
        prisma.lesson.update({
          where: { id: lessonId, courseModuleId: moduleId },
          data: { order: index + 1 },
        })
      )
    );
  },

  async getModuleLessons(
    moduleId: string,
    includeUnpublished = false
  ): Promise<LessonWithModule[]> {
    return prisma.lesson.findMany({
      where: {
        courseModuleId: moduleId,
        ...(includeUnpublished ? {} : { isPublished: true }),
      },
      include: {
        courseModule: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });
  },

  async getCourseLessons(
    courseId: string,
    includeUnpublished = false
  ): Promise<LessonWithModule[]> {
    return prisma.lesson.findMany({
      where: {
        courseModule: { courseId },
        ...(includeUnpublished ? {} : { isPublished: true }),
      },
      include: {
        courseModule: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
          },
        },
      },
      orderBy: [{ courseModule: { order: "asc" } }, { order: "asc" }],
    });
  },

  // ── Prerequisites ──────────────────────────────────────────────────

  async getPrerequisites(lessonId: string) {
    const deps = await prisma.lessonDependency.findMany({
      where: { lessonId },
      include: {
        prerequisite: { select: { id: true, title: true, slug: true, type: true } },
      },
    });
    return deps.map((d) => d.prerequisite);
  },

  async getLessonsUnlockedBy(lessonId: string) {
    const deps = await prisma.lessonDependency.findMany({
      where: { prerequisiteId: lessonId },
      include: {
        lesson: { select: { id: true, title: true, slug: true } },
      },
    });
    return deps.map((d) => d.lesson);
  },

  async checkPrerequisitesMet(
    lessonId: string,
    userId: string
  ): Promise<{ met: boolean; missing: string[] }> {
    const prerequisites = await this.getPrerequisites(lessonId);
    if (prerequisites.length === 0) return { met: true, missing: [] };

    const completed = await prisma.lessonProgress.findMany({
      where: {
        userId,
        completedAt: { not: null },
        lessonId: { in: prerequisites.map((p) => p.id) },
      },
      select: { lessonId: true },
    });

    const completedIds = new Set(completed.map((c) => c.lessonId));
    const missing = prerequisites
      .filter((p) => !completedIds.has(p.id))
      .map((p) => p.title);

    return { met: missing.length === 0, missing };
  },

  // ── Analytics ──────────────────────────────────────────────────────

  async getLessonAnalytics(lessonId: string) {
    const [totalStudents, completedStudents, averageTime, scoreDistribution] =
      await Promise.all([
        prisma.lessonProgress.count({
          where: { lessonId, timeSpent: { gt: 0 } },
        }),
        prisma.lessonProgress.count({
          where: { lessonId, completedAt: { not: null } },
        }),
        prisma.lessonProgress.aggregate({
          where: { lessonId, timeSpent: { gt: 0 } },
          _avg: { timeSpent: true },
        }),
        prisma.lessonProgress.groupBy({
          by: ["score"],
          where: { lessonId, score: { not: null } },
          _count: true,
          orderBy: { score: "asc" },
        }),
      ]);

    return {
      totalStudents,
      completedStudents,
      completionRate: totalStudents > 0
        ? (completedStudents / totalStudents) * 100
        : 0,
      averageTime: Math.round(averageTime._avg.timeSpent ?? 0),
      scoreDistribution: scoreDistribution.map((s) => ({
        score: s.score,
        count: s._count,
      })),
    };
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

async function generateUniqueLessonSlug(
  title: string,
  moduleSlug: string,
  excludeId?: string
): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.lesson.findFirst({
      where: {
        slug,
        courseModuleId: moduleSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export default LessonService;
