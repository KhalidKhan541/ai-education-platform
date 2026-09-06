import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { assignmentSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  paginatedResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = { courseId: id };

    if (!isInstructor) {
      where.isPublished = true;
    }

    const [assignments, total] = await Promise.all([
      prisma.assignment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.assignment.count({ where }),
    ]);

    const enrichedAssignments = await Promise.all(
      assignments.map(async (assignment) => {
        let userSubmission = null;
        if (session?.user && !isInstructor) {
          userSubmission = await prisma.submission.findUnique({
            where: {
              userId_assignmentId: {
                userId: session.user.id,
                assignmentId: assignment.id,
              },
            },
            select: {
              id: true,
              status: true,
              score: true,
              submittedAt: true,
            },
          });
        }
        return {
          ...assignment,
          userSubmission,
          attachments:
            typeof assignment.attachments === "string"
              ? JSON.parse(assignment.attachments)
              : assignment.attachments,
          rubric:
            typeof assignment.rubric === "string"
              ? JSON.parse(assignment.rubric)
              : assignment.rubric,
        };
      })
    );

    return paginatedResponse(enrichedAssignments, total, page, limit);
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return serverErrorResponse("Failed to fetch assignments");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can create assignments");
    }

    const { id } = await params;
    const body = await request.json();

    const validation = validateRequest(assignmentSchema, body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const course = await prisma.course.findUnique({
      where: { id },
      select: { instructorId: true },
    });

    if (!course) {
      return notFoundResponse("Course not found");
    }

    if (course.instructorId !== session.user.id && session.user.role !== "ADMIN") {
      return forbiddenResponse("You can only create assignments for your own courses");
    }

    const assignment = await prisma.assignment.create({
      data: {
        ...validation.data,
        courseId: id,
        attachments: JSON.stringify(validation.data.attachments),
        rubric: JSON.stringify(validation.data.rubric),
      },
    });

    return successResponse(
      {
        ...assignment,
        attachments: validation.data.attachments,
        rubric: validation.data.rubric,
      },
      201
    );
  } catch (error) {
    console.error("Error creating assignment:", error);
    return serverErrorResponse("Failed to create assignment");
  }
}
