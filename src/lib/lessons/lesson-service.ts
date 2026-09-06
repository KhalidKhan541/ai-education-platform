import prisma from "@/lib/prisma";

export interface CreateLessonData {
  courseId: string;
  moduleId?: string;
  title: string;
  description?: string;
  lessonType?: "VIDEO" | "TEXT" | "INTERACTIVE" | "QUIZ" | "ASSIGNMENT" | "LIVE" | "DOCUMENT" | "AUDIO";
  sortOrder?: number;
  duration?: number;
  isPublished?: boolean;
  isRequired?: boolean;
  content?: string;
  videoUrl?: string;
}

export interface UpdateLessonData extends Partial<CreateLessonData> {}

export class LessonService {
  static async getLessonsByCourse(courseId: string) {
    return prisma.lesson.findMany({
      where: { courseId },
      include: {
        module: { select: { id: true, title: true } },
        _count: { select: { contents: true } },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  static async getLessonsByModule(moduleId: string) {
    return prisma.lesson.findMany({
      where: { moduleId },
      orderBy: { sortOrder: "asc" },
    });
  }

  static async getLessonById(id: string) {
    return prisma.lesson.findUnique({
      where: { id },
      include: {
        module: true,
        course: { select: { id: true, title: true, instructorId: true } },
        contents: { orderBy: { sortOrder: "asc" } },
      },
    });
  }

  static async createLesson(data: CreateLessonData) {
    return prisma.lesson.create({
      data: {
        courseId: data.courseId,
        moduleId: data.moduleId,
        title: data.title,
        description: data.description,
        lessonType: data.lessonType ?? "TEXT",
        sortOrder: data.sortOrder ?? 0,
        duration: data.duration,
        isPublished: data.isPublished ?? false,
        isRequired: data.isRequired ?? true,
        content: data.content,
        videoUrl: data.videoUrl,
      },
      include: { module: true, contents: true },
    });
  }

  static async updateLesson(id: string, data: UpdateLessonData) {
    return prisma.lesson.update({
      where: { id },
      data,
    });
  }

  static async deleteLesson(id: string) {
    return prisma.lesson.delete({ where: { id } });
  }

  static async reorderLessons(courseId: string, lessonIds: string[]) {
    const updates = lessonIds.map((id, index) =>
      prisma.lesson.update({
        where: { id },
        data: { sortOrder: index },
      })
    );
    return prisma.$transaction(updates);
  }

  static async publishLesson(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  static async unpublishLesson(id: string) {
    return prisma.lesson.update({
      where: { id },
      data: { isPublished: false },
    });
  }

  static async getNextLesson(currentLessonId: string) {
    const current = await prisma.lesson.findUnique({ where: { id: currentLessonId } });
    if (!current) return null;

    return prisma.lesson.findFirst({
      where: {
        courseId: current.courseId,
        isPublished: true,
        sortOrder: { gt: current.sortOrder },
      },
      orderBy: { sortOrder: "asc" },
    });
  }

  static async getPreviousLesson(currentLessonId: string) {
    const current = await prisma.lesson.findUnique({ where: { id: currentLessonId } });
    if (!current) return null;

    return prisma.lesson.findFirst({
      where: {
        courseId: current.courseId,
        isPublished: true,
        sortOrder: { lt: current.sortOrder },
      },
      orderBy: { sortOrder: "desc" },
    });
  }

  static async getLessonCount(courseId: string): Promise<number> {
    return prisma.lesson.count({ where: { courseId } });
  }

  static async getPublishedLessonCount(courseId: string): Promise<number> {
    return prisma.lesson.count({ where: { courseId, isPublished: true } });
  }
}
