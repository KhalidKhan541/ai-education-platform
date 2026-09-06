import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { quizSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; quizId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id, quizId } = await params;
    const session = await getServerSession(authOptions);
    const isInstructor =
      session?.user?.role === "INSTRUCTOR" || session?.user?.role === "ADMIN";

    const where: Record<string, unknown> = {
      id: quizId,
      courseId: id,
    };

    if (!isInstructor) {
      where.isPublished = true;
    }

    const quiz = await prisma.quiz.findUnique({
      where,
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: isInstructor
            ? {
                id: true,
                type: true,
                question: true,
                options: true,
                correctAnswer: true,
                points: true,
                explanation: true,
                order: true,
              }
            : {
                id: true,
                type: true,
                question: true,
                options: true,
                points: true,
                order: true,
              },
        },
        attempts: isInstructor
          ? {
              orderBy: { completedAt: "desc" },
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            }
          : {
              where: session?.user ? { userId: session.user.id } : undefined,
              orderBy: { completedAt: "desc" },
              select: {
                id: true,
                score: true,
                passed: true,
                answers: true,
                completedAt: true,
                timeTakenSeconds: true,
              },
            },
        _count: {
          select: { attempts: true },
        },
      },
    });

    if (!quiz) {
      return notFoundResponse("Quiz not found");
    }

    return successResponse({
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(String(q.options)) : null,
      })),
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return serverErrorResponse("Failed to fetch quiz");
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can update quizzes");
    }

    const { id, quizId } = await params;
    const body = await request.json();

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId, courseId: id },
      include: { course: { select: { instructorId: true } } },
    });

    if (!existingQuiz) {
      return notFoundResponse("Quiz not found");
    }

    if (
      existingQuiz.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only update your own quizzes");
    }

    const validation = validateRequest(quizSchema.partial(), body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { questions, ...quizUpdateData } = validation.data;

    const updatedQuiz = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.update({
        where: { id: quizId },
        data: quizUpdateData,
      });

      if (questions && questions.length > 0) {
        await tx.question.deleteMany({ where: { quizId } });

        await tx.question.createMany({
          data: questions.map((q, index) => ({
            quizId,
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            points: q.points,
            explanation: q.explanation,
            order: index,
          })),
        });
      }

      return quiz;
    });

    const fullQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            correctAnswer: true,
            points: true,
            explanation: true,
            order: true,
          },
        },
      },
    });

    return successResponse({
      ...fullQuiz,
      questions: fullQuiz?.questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(String(q.options)) : null,
      })),
    });
  } catch (error) {
    console.error("Error updating quiz:", error);
    return serverErrorResponse("Failed to update quiz");
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can delete quizzes");
    }

    const { id, quizId } = await params;

    const existingQuiz = await prisma.quiz.findUnique({
      where: { id: quizId, courseId: id },
      include: {
        course: { select: { instructorId: true } },
        _count: { select: { attempts: true } },
      },
    });

    if (!existingQuiz) {
      return notFoundResponse("Quiz not found");
    }

    if (
      existingQuiz.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only delete your own quizzes");
    }

    if (existingQuiz._count.attempts > 0) {
      return errorResponse(
        "Cannot delete quiz with existing attempts. Archive it instead."
      );
    }

    await prisma.quiz.delete({ where: { id: quizId } });

    return successResponse({ message: "Quiz deleted successfully" });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    return serverErrorResponse("Failed to delete quiz");
  }
}
