import prisma from "@/lib/prisma";

export interface CreateCourseData {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  currency?: string;
  categoryId?: string;
  difficulty?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  estimatedHours?: number;
  maxEnrollments?: number;
  tags?: string[];
  prerequisites?: string[];
  learningObjectives?: string[];
}

export interface UpdateCourseData extends Partial<CreateCourseData> {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "UNDER_REVIEW";
  isPublished?: boolean;
}

export interface CourseFilters {
  search?: string;
  categoryId?: string;
  instructorId?: string;
  status?: string;
  difficulty?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class CourseService {
  static async getCourses(filters: CourseFilters): Promise<PaginatedResult<unknown>> {
    const where: Record<string, unknown> = {};

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.instructorId) where.instructorId = filters.instructorId;
    if (filters.status) where.status = filters.status;
    if (filters.difficulty) where.difficulty = filters.difficulty;

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: { select: { id: true, name: true, image: true } },
          _count: { select: { enrollments: true, modules: true } },
        },
        orderBy: { [filters.sortBy]: filters.sortOrder },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNext: filters.page * filters.limit < total,
      hasPrev: filters.page > 1,
    };
  }

  static async getCourseById(id: string) {
    return prisma.course.findUnique({
      where: { id },
      include: {
        instructor: { select: { id: true, name: true, image: true, email: true } },
        modules: {
          include: { lessons: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { enrollments: true, modules: true } },
      },
    });
  }

  static async getCourseBySlug(slug: string) {
    return prisma.course.findUnique({
      where: { slug },
      include: {
        instructor: { select: { id: true, name: true, image: true } },
        modules: {
          include: { lessons: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  }

  static async createCourse(data: CreateCourseData, instructorId: string) {
    return prisma.course.create({
      data: {
        title: data.title,
        slug: data.slug,
        description: data.description,
        shortDescription: data.shortDescription,
        price: data.price ?? 0,
        currency: data.currency ?? "USD",
        categoryId: data.categoryId,
        difficulty: data.difficulty ?? "BEGINNER",
        estimatedHours: data.estimatedHours,
        maxEnrollments: data.maxEnrollments,
        tags: data.tags ? JSON.stringify(data.tags) : "[]",
        prerequisites: data.prerequisites ? JSON.stringify(data.prerequisites) : "[]",
        instructorId,
        status: "DRAFT",
        isPublished: false,
      },
      include: {
        instructor: { select: { id: true, name: true, image: true } },
      },
    });
  }

  static async updateCourse(id: string, data: UpdateCourseData) {
    return prisma.course.update({
      where: { id },
      data: {
        ...data,
        tags: data.tags ? JSON.stringify(data.tags) : undefined,
        prerequisites: data.prerequisites ? JSON.stringify(data.prerequisites) : undefined,
      },
    });
  }

  static async deleteCourse(id: string) {
    return prisma.course.delete({ where: { id } });
  }

  static async publishCourse(id: string) {
    return prisma.course.update({
      where: { id },
      data: { status: "PUBLISHED", isPublished: true },
    });
  }

  static async archiveCourse(id: string) {
    return prisma.course.update({
      where: { id },
      data: { status: "ARCHIVED", isPublished: false },
    });
  }

  static async getCourseStats(courseId: string) {
    const [enrollmentCount, moduleCount, lessonCount, avgRating] = await Promise.all([
      prisma.enrollment.count({ where: { courseId } }),
      prisma.module.count({ where: { courseId } }),
      prisma.lesson.count({ where: { courseId } }),
      prisma.course.findUnique({
        where: { id: courseId },
        select: { rating: true, reviewCount: true },
      }),
    ]);

    return {
      enrollmentCount,
      moduleCount,
      lessonCount,
      avgRating: avgRating?.rating ?? 0,
      reviewCount: avgRating?.reviewCount ?? 0,
    };
  }
}
