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

    const [quizzes, total] = await Promise.all([
      prisma.quiz.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { attempts: true, questions: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quiz.count({ where }),
    ]);

    const enrichedQuizzes = await Promise.all(
      quizzes.map(async (quiz) => {
        let userBestAttempt = null;
        let userAttemptsCount = 0;

        if (session?.user && !isInstructor) {
          const [best, count] = await Promise.all([
            prisma.quizAttempt.findFirst({
              where: {
                userId: session.user.id,
                quizId: quiz.id,
              },
              orderBy: { score: "desc" },
              select: {
                id: true,
                score: true,
                passed: true,
                completedAt: true,
              },
            }),
            prisma.quizAttempt.count({
              where: {
                userId: session.user.id,
                quizId: quiz.id,
              },
            }),
          ]);
          userBestAttempt = best;
          userAttemptsCount = count;
        }

        return {
          ...quiz,
          questions: undefined,
          userBestAttempt,
          userAttemptsCount,
        };
      })
    );

    return paginatedResponse(enrichedQuizzes, total, page, limit);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    return serverErrorResponse("Failed to fetch quizzes");
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can create quizzes");
    }

    const { id } = await params;
    const body = await request.json();

    const validation = validateRequest(quizSchema, body);
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
      return forbiddenResponse("You can only create quizzes for your own courses");
    }

    const { questions, ...quizData } = validation.data;

    const quiz = await prisma.quiz.create({
      data: {
        ...quizData,
        courseId: id,
        questions: {
          create: questions.map((q, index) => ({
            type: q.type,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correctAnswer,
            points: q.points,
            explanation: q.explanation,
            order: index,
          })),
        },
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            points: true,
            order: true,
          },
        },
      },
    });

    return successResponse(
      {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })),
      },
      201
    );
  } catch (error) {
    console.error("Error creating quiz:", error);
    return serverErrorResponse("Failed to create quiz");
  }
}
