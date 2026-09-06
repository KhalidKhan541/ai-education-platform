import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { submissionSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  conflictResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; assignmentId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, assignmentId } = await params;
    const body = await request.json();

    const validation = validateRequest(submissionSchema, body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId, courseId: id },
      select: {
        id: true,
        dueDate: true,
        allowLateSubmission: true,
        maxScore: true,
        isPublished: true,
      },
    });

    if (!assignment) {
      return notFoundResponse("Assignment not found");
    }

    if (!assignment.isPublished) {
      return errorResponse("This assignment is not yet available");
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: id,
        },
      },
      select: { status: true },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return errorResponse("You must be enrolled to submit assignments");
    }

    const existingSubmission = await prisma.submission.findUnique({
      where: {
        userId_assignmentId: {
          userId: session.user.id,
          assignmentId,
        },
      },
      select: { id: true, status: true },
    });

    if (existingSubmission && existingSubmission.status === "GRADED") {
      return conflictResponse("You have already received a grade for this assignment");
    }

    const isLate =
      assignment.dueDate && new Date() > new Date(assignment.dueDate);

    if (isLate && !assignment.allowLateSubmission) {
      return errorResponse("The deadline for this assignment has passed");
    }

    let submission;

    if (existingSubmission) {
      submission = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          content: validation.data.content,
          attachments: JSON.stringify(validation.data.attachments),
          status: "RESUBMITTED",
          submittedAt: new Date(),
          isLate,
        },
      });
    } else {
      submission = await prisma.submission.create({
        data: {
          userId: session.user.id,
          assignmentId,
          content: validation.data.content,
          attachments: JSON.stringify(validation.data.attachments),
          status: "SUBMITTED",
          isLate,
        },
      });
    }

    if (!isLate && !existingSubmission) {
      const totalSubmissions = await prisma.submission.count({
        where: { assignmentId, status: { not: "DRAFT" } },
      });

      if (totalSubmissions >= 5) {
        await prisma.notification.create({
          data: {
            userId: session.user.id,
            type: "ASSIGNMENT_SUBMITTED",
            title: "Assignment Submitted",
            message: `Your submission for assignment has been received.`,
            metadata: JSON.stringify({ assignmentId, submissionId: submission.id }),
          },
        });
      }
    }

    return successResponse(
      {
        submission: {
          id: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
        },
        message: isLate
          ? "Late submission accepted with penalty"
          : "Submission received successfully",
      },
      existingSubmission ? 200 : 201
    );
  } catch (error) {
    console.error("Error submitting assignment:", error);
    return serverErrorResponse("Failed to submit assignment");
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, assignmentId } = await params;
    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    const where: Record<string, unknown> = {
      assignmentId,
      assignment: { courseId: id },
    };

    if (!isInstructor) {
      where.userId = session.user.id;
    }

    const submissions = await prisma.submission.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      include: isInstructor
        ? {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          }
        : undefined,
    });

    return successResponse(
      submissions.map((s) => ({
        ...s,
        attachments:
          typeof s.attachments === "string"
            ? JSON.parse(s.attachments)
            : s.attachments,
      }))
    );
  } catch (error) {
    console.error("Error fetching submissions:", error);
    return serverErrorResponse("Failed to fetch submissions");
  }
}
