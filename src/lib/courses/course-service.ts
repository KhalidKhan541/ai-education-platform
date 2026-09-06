import prisma from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import type {
  Course,
  CourseModule,
  CourseStatus,
  Prisma,
} from "@prisma/client";

// ── Types ──────────────────────────────────────────────────────────────

export type CourseWithModules = Course & {
  modules: (CourseModule & {
    lessons: { id: string; title: string; type: string; order: number }[];
  })[];
  _count: { enrollments: number; lessons: number };
};

export type CourseListItem = Course & {
  instructor: { id: string; name: string | null; image: string | null };
  _count: { enrollments: number; lessons: number };
  category: { id: string; name: string; slug: string } | null;
};

export interface CreateCourseInput {
  title: string;
  description: string;
  instructorId: string;
  categoryId?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  price?: number;
  isPublished?: boolean;
  tags?: string[];
  prerequisites?: string[];
  estimatedHours?: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  language?: string;
  maxStudents?: number;
}

export interface UpdateCourseInput {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  price?: number;
  tags?: string[];
  prerequisites?: string[];
  estimatedHours?: number;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  language?: string;
  maxStudents?: number;
}

export interface CourseFilter {
  categoryId?: string;
  instructorId?: string;
  status?: CourseStatus;
  difficulty?: string;
  isPublished?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  sortBy?: "createdAt" | "updatedAt" | "title" | "price" | "enrollments";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CourseAnalytics {
  totalEnrollments: number;
  activeStudents: number;
  completionRate: number;
  averageRating: number;
  totalRevenue: number;
  enrollmentTrend: { date: string; count: number }[];
  completionTrend: { date: string; count: number }[];
  topModules: { title: string; completionRate: number }[];
  studentDemographics: { country: string; count: number }[];
}

export interface ModuleInput {
  title: string;
  description?: string;
  order?: number;
  isRequired?: boolean;
}

export interface ReorderModulesInput {
  moduleIds: string[];
}

// ── Service ────────────────────────────────────────────────────────────

export const CourseService = {
  async create(input: CreateCourseInput): Promise<Course> {
    const slug = await generateUniqueSlug(input.title);

    return prisma.course.create({
      data: {
        id: generateId(),
        title: input.title,
        slug,
        description: input.description,
        instructorId: input.instructorId,
        categoryId: input.categoryId,
        thumbnailUrl: input.thumbnailUrl,
        bannerUrl: input.bannerUrl,
        price: input.price ?? 0,
        isPublished: input.isPublished ?? false,
        status: input.isPublished ? "PUBLISHED" : "DRAFT",
        tags: input.tags ?? [],
        prerequisites: input.prerequisites ?? [],
        estimatedHours: input.estimatedHours,
        difficulty: input.difficulty ?? "BEGINNER",
        language: input.language ?? "en",
        maxStudents: input.maxStudents,
      },
    });
  },

  async getById(id: string): Promise<CourseWithModules | null> {
    return prisma.course.findUnique({
      where: { id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              select: { id: true, title: true, type: true, order: true },
              orderBy: { order: "asc" },
            },
          },
        },
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
  },

  async getBySlug(slug: string): Promise<CourseWithModules | null> {
    return prisma.course.findUnique({
      where: { slug },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              select: { id: true, title: true, type: true, order: true },
              orderBy: { order: "asc" },
            },
          },
        },
        _count: { select: { enrollments: true, lessons: true } },
      },
    });
  },

  async update(id: string, input: UpdateCourseInput): Promise<Course> {
    const data: Prisma.CourseUpdateInput = { ...input };

    if (input.title) {
      data.slug = await generateUniqueSlug(input.title, id);
    }

    return prisma.course.update({ where: { id }, data });
  },

  async delete(id: string): Promise<void> {
    const enrollments = await prisma.enrollment.count({
      where: { courseId: id, status: "ACTIVE" },
    });

    if (enrollments > 0) {
      throw new Error("Cannot delete course with active enrollments. Archive it instead.");
    }

    await prisma.course.delete({ where: { id } });
  },

  async publish(id: string): Promise<Course> {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new Error("Course not found");

    const moduleCount = await prisma.courseModule.count({
      where: { courseId: id },
    });
    if (moduleCount === 0) {
      throw new Error("Cannot publish a course without at least one module");
    }

    const lessonCount = await prisma.lesson.count({
      where: { courseModule: { courseId: id } },
    });
    if (lessonCount === 0) {
      throw new Error("Cannot publish a course without at least one lesson");
    }

    return prisma.course.update({
      where: { id },
      data: { isPublished: true, status: "PUBLISHED", publishedAt: new Date() },
    });
  },

  async unpublish(id: string): Promise<Course> {
    return prisma.course.update({
      where: { id },
      data: { isPublished: false, status: "DRAFT" },
    });
  },

  async archive(id: string): Promise<Course> {
    return prisma.course.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  },

  async list(filters: CourseFilter = {}): Promise<{
    courses: CourseListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.instructorId) where.instructorId = filters.instructorId;
    if (filters.status) where.status = filters.status;
    if (filters.isPublished !== undefined) where.isPublished = filters.isPublished;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.tags?.length) where.tags = { hasSome: filters.tags };
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.CourseOrderByWithRelationInput = {};
    if (filters.sortBy === "enrollments") {
      orderBy.enrollments = { _count: filters.sortOrder ?? "desc" };
    } else if (filters.sortBy) {
      orderBy[filters.sortBy] = filters.sortOrder ?? "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: { select: { id: true, name: true, image: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { enrollments: true, lessons: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    return { courses, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getFeatured(limit = 10): Promise<CourseListItem[]> {
    return prisma.course.findMany({
      where: { isPublished: true, isFeatured: true },
      include: {
        instructor: { select: { id: true, name: true, image: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { enrollments: true, lessons: true } },
      },
      orderBy: { enrollments: { _count: "desc" } },
      take: limit,
    });
  },

  async toggleFeatured(id: string): Promise<Course> {
    const course = await prisma.course.findUnique({ where: { id } });
    if (!course) throw new Error("Course not found");
    return prisma.course.update({
      where: { id },
      data: { isFeatured: !course.isFeatured },
    });
  },

  // ── Module Management ──────────────────────────────────────────────

  async addModule(courseId: string, input: ModuleInput): Promise<CourseModule> {
    const maxOrder = await prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    return prisma.courseModule.create({
      data: {
        id: generateId(),
        courseId,
        title: input.title,
        description: input.description,
        order: input.order ?? (maxOrder?.order ?? 0) + 1,
        isRequired: input.isRequired ?? true,
      },
    });
  },

  async updateModule(moduleId: string, input: Partial<ModuleInput>): Promise<CourseModule> {
    return prisma.courseModule.update({
      where: { id: moduleId },
      data: input,
    });
  },

  async deleteModule(moduleId: string): Promise<void> {
    const lessonCount = await prisma.lesson.count({
      where: { courseModuleId: moduleId },
    });
    if (lessonCount > 0) {
      throw new Error("Cannot delete module with lessons. Remove lessons first.");
    }
    await prisma.courseModule.delete({ where: { id: moduleId } });
  },

  async reorderModules(courseId: string, input: ReorderModulesInput): Promise<void> {
    await prisma.$transaction(
      input.moduleIds.map((moduleId, index) =>
        prisma.courseModule.update({
          where: { id: moduleId, courseId },
          data: { order: index + 1 },
        })
      )
    );
  },

  // ── Duplication ────────────────────────────────────────────────────

  async duplicate(
    courseId: string,
    newInstructorId?: string
  ): Promise<Course> {
    const original = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: { lessons: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!original) throw new Error("Course not found");

    const newSlug = await generateUniqueSlug(`${original.title} (Copy)`);

    return prisma.$transaction(async (tx) => {
      const newCourse = await tx.course.create({
        data: {
          id: generateId(),
          title: `${original.title} (Copy)`,
          slug: newSlug,
          description: original.description,
          instructorId: newInstructorId ?? original.instructorId,
          categoryId: original.categoryId,
          thumbnailUrl: original.thumbnailUrl,
          bannerUrl: original.bannerUrl,
          price: original.price,
          isPublished: false,
          status: "DRAFT",
          tags: original.tags,
          prerequisites: original.prerequisites,
          estimatedHours: original.estimatedHours,
          difficulty: original.difficulty,
          language: original.language,
          maxStudents: original.maxStudents,
        },
      });

      for (const module of original.modules) {
        const newModule = await tx.courseModule.create({
          data: {
            id: generateId(),
            courseId: newCourse.id,
            title: module.title,
            description: module.description,
            order: module.order,
            isRequired: module.isRequired,
          },
        });

        for (const lesson of module.lessons) {
          await tx.lesson.create({
            data: {
              id: generateId(),
              courseModuleId: newModule.id,
              title: lesson.title,
              slug: lesson.slug,
              description: lesson.description,
              type: lesson.type,
              order: lesson.order,
              content: lesson.content,
              duration: lesson.duration,
              isRequired: lesson.isRequired,
              isPublished: false,
            },
          });
        }
      }

      return newCourse;
    });
  },

  // ── Analytics ──────────────────────────────────────────────────────

  async getAnalytics(courseId: string): Promise<CourseAnalytics> {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new Error("Course not found");

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalEnrollments,
      activeStudents,
      completedStudents,
      enrollmentsByDay,
      completionsByDay,
      moduleStats,
    ] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.enrollment.count({ where: { courseId, status: "ACTIVE" } }),
      prisma.enrollment.count({ where: { courseId, status: "COMPLETED" } }),
      prisma.enrollment.groupBy({
        by: ["enrolledAt"],
        where: { courseId, enrolledAt: { gte: thirtyDaysAgo } },
        _count: true,
        orderBy: { enrolledAt: "asc" },
      }),
      prisma.lessonProgress.groupBy({
        by: ["completedAt"],
        where: {
          lesson: { courseModule: { courseId } },
          completedAt: { not: null, gte: thirtyDaysAgo },
        },
        _count: true,
        orderBy: { completedAt: "asc" },
      }),
      prisma.courseModule.findMany({
        where: { courseId },
        include: {
          lessons: {
            include: {
              progress: { where: { completedAt: { not: null } } },
            },
          },
        },
        orderBy: { order: "asc" },
      }),
    ]);

    const completionRate = totalEnrollments > 0
      ? (completedStudents / totalEnrollments) * 100
      : 0;

    const totalRevenue = totalEnrollments * Number(course.price);

    const enrollmentTrend = enrollmentsByDay.map((entry) => ({
      date: entry.enrolledAt.toISOString().split("T")[0],
      count: entry._count,
    }));

    const completionTrend = completionsByDay.map((entry) => ({
      date: entry.completedAt?.toISOString().split("T")[0] ?? "",
      count: entry._count,
    }));

    const topModules = moduleStats.map((mod) => {
      const totalLessons = mod.lessons.length;
      const completedLessons = mod.lessons.filter(
        (l) => l.progress.length > 0
      ).length;
      return {
        title: mod.title,
        completionRate: totalLessons > 0
          ? (completedLessons / totalLessons) * 100
          : 0,
      };
    });

    return {
      totalEnrollments,
      activeStudents,
      completionRate,
      averageRating: 0,
      totalRevenue,
      enrollmentTrend,
      completionTrend,
      topModules,
      studentDemographics: [],
    };
  },

  async getInstructorCourses(
    instructorId: string,
    page = 1,
    limit = 20
  ): Promise<{ courses: CourseListItem[]; total: number }> {
    const skip = (page - 1) * limit;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where: { instructorId },
        include: {
          instructor: { select: { id: true, name: true, image: true } },
          category: { select: { id: true, name: true, slug: true } },
          _count: { select: { enrollments: true, lessons: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.course.count({ where: { instructorId } }),
    ]);

    return { courses, total };
  },

  async getCourseStudents(courseId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: { enrolledAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.enrollment.count({ where: { courseId } }),
    ]);

    return { enrollments, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
};

// ── Helpers ────────────────────────────────────────────────────────────

async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.course.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (!existing) return slug;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export default CourseService;
