import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { courseSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  paginatedResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "12")));
    const search = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const level = searchParams.get("level") ?? "";
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const isPublished = searchParams.get("published");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (level) {
      where.level = level;
    }

    if (isPublished !== null) {
      where.isPublished = isPublished === "true";
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              modules: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    return paginatedResponse(courses, total, page, limit);
  } catch (error) {
    console.error("Error fetching courses:", error);
    return serverErrorResponse("Failed to fetch courses");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return errorResponse("Only instructors can create courses", 403);
    }

    const body = await request.json();
    const validation = validateRequest(courseSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const course = await prisma.course.create({
      data: {
        ...validation.data,
        instructorId: session.user.id,
        tags: validation.data.tags ? JSON.stringify(validation.data.tags) : "[]",
        prerequisites: validation.data.prerequisites ? JSON.stringify(validation.data.prerequisites) : "[]",
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return successResponse(course, 201);
  } catch (error) {
    console.error("Error creating course:", error);
    return serverErrorResponse("Failed to create course");
  }
}
