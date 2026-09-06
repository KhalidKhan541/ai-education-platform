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
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; assignmentId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id, assignmentId } = await params;
    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = {
      id: assignmentId,
      courseId: id,
    };

    if (!isInstructor) {
      where.isPublished = true;
    }

    const assignment = await prisma.assignment.findUnique({
      where,
      include: {
        submissions: isInstructor
          ? {
              orderBy: { submittedAt: "desc" },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            }
          : {
              where: session?.user ? { userId: session.user.id } : undefined,
              orderBy: { submittedAt: "desc" },
              select: {
                id: true,
                status: true,
                score: true,
                feedback: true,
                submittedAt: true,
                gradedAt: true,
              },
            },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!assignment) {
      return notFoundResponse("Assignment not found");
    }

    return successResponse({
      ...assignment,
      attachments:
        typeof assignment.attachments === "string"
          ? JSON.parse(assignment.attachments)
          : assignment.attachments,
      rubric:
        typeof assignment.rubric === "string"
          ? JSON.parse(assignment.rubric)
          : assignment.rubric,
    });
  } catch (error) {
    console.error("Error fetching assignment:", error);
    return serverErrorResponse("Failed to fetch assignment");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can update assignments");
    }

    const { id, assignmentId } = await params;
    const body = await request.json();

    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId, courseId: id },
      include: { course: { select: { instructorId: true } } },
    });

    if (!existingAssignment) {
      return notFoundResponse("Assignment not found");
    }

    if (
      existingAssignment.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only update your own assignments");
    }

    const validation = validateRequest(assignmentSchema.partial(), body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.attachments) {
      updateData.attachments = JSON.stringify(validation.data.attachments);
    }
    if (validation.data.rubric) {
      updateData.rubric = JSON.stringify(validation.data.rubric);
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: updateData,
    });

    return successResponse({
      ...updatedAssignment,
      attachments:
        typeof updatedAssignment.attachments === "string"
          ? JSON.parse(updatedAssignment.attachments)
          : updatedAssignment.attachments,
      rubric:
        typeof updatedAssignment.rubric === "string"
          ? JSON.parse(updatedAssignment.rubric)
          : updatedAssignment.rubric,
    });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return serverErrorResponse("Failed to update assignment");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can delete assignments");
    }

    const { id, assignmentId } = await params;

    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: assignmentId, courseId: id },
      include: {
        course: { select: { instructorId: true } },
        _count: { select: { submissions: true } },
      },
    });

    if (!existingAssignment) {
      return notFoundResponse("Assignment not found");
    }

    if (
      existingAssignment.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only delete your own assignments");
    }

    if (existingAssignment._count.submissions > 0) {
      return errorResponse(
        "Cannot delete assignment with existing submissions. Archive it instead."
      );
    }

    await prisma.assignment.delete({ where: { id: assignmentId } });

    return successResponse({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return serverErrorResponse("Failed to delete assignment");
  }
}
