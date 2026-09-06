import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { quizAttemptSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

type Params = { params: Promise<{ id: string; quizId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, quizId } = await params;
    const body = await request.json();

    const validation = validateRequest(quizAttemptSchema, body);
    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, courseId: id, isPublished: true },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      return notFoundResponse("Quiz not found");
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
      return errorResponse("You must be enrolled to attempt quizzes");
    }

    const previousAttempts = await prisma.quizAttempt.count({
      where: {
        userId: session.user.id,
        quizId,
      },
    });

    if (previousAttempts >= quiz.maxAttempts) {
      return errorResponse(
        `You have used all ${quiz.maxAttempts} attempt(s) for this quiz`
      );
    }

    const { answers, timeTakenSeconds } = validation.data;

    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers: Array<{
      questionId: string;
      questionIndex: number;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      points: number;
      earnedPoints: number;
      explanation?: string;
    }> = [];

    for (let i = 0; i < quiz.questions.length; i++) {
      const question = quiz.questions[i]!;
      const userAnswer = answers.find((a) => a.questionIndex === i);
      const userAnswerText = userAnswer?.answer ?? "";

      let isCorrect = false;
      let correctAnswer = "";

      if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
        const options = question.options
          ? JSON.parse(String(question.options))
          : [];
        const correctOption = options.find(
          (opt: { isCorrect: boolean }) => opt.isCorrect
        );
        correctAnswer = correctOption?.text ?? "";
        isCorrect =
          userAnswerText.toLowerCase().trim() ===
          correctAnswer.toLowerCase().trim();
      } else {
        correctAnswer = question.correctAnswer ?? "";
        if (correctAnswer) {
          isCorrect =
            userAnswerText.toLowerCase().trim() ===
            correctAnswer.toLowerCase().trim();
        }
      }

      const earnedPoints = isCorrect ? question.points : 0;
      totalScore += earnedPoints;
      maxScore += question.points;

      gradedAnswers.push({
        questionId: question.id,
        questionIndex: i,
        userAnswer: userAnswerText,
        correctAnswer,
        isCorrect,
        points: question.points,
        earnedPoints,
        explanation: question.explanation ?? undefined,
      });
    }

    const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passed = scorePercentage >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        quizId,
        score: scorePercentage,
        passed,
        answers: JSON.stringify(gradedAnswers),
        timeTakenSeconds,
        completedAt: new Date(),
      },
    });

    const showCorrectAnswers = quiz.showCorrectAnswers;

    return successResponse(
      {
        attempt: {
          id: attempt.id,
          score: scorePercentage,
          passed,
          totalScore,
          maxScore,
          timeTakenSeconds,
          completedAt: attempt.completedAt,
        },
        results: gradedAnswers.map((a) => ({
          questionIndex: a.questionIndex,
          isCorrect: a.isCorrect,
          earnedPoints: a.earnedPoints,
          maxPoints: a.points,
          explanation: showCorrectAnswers ? a.explanation : undefined,
          correctAnswer: showCorrectAnswers ? a.correctAnswer : undefined,
        })),
        passingScore: quiz.passingScore,
        attemptNumber: previousAttempts + 1,
        maxAttempts: quiz.maxAttempts,
        message: passed
          ? "Congratulations! You passed the quiz!"
          : `You scored ${Math.round(scorePercentage)}%. You need ${quiz.passingScore}% to pass.`,
      },
      201
    );
  } catch (error) {
    console.error("Error submitting quiz attempt:", error);
    return serverErrorResponse("Failed to submit quiz attempt");
  }
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { id, quizId } = await params;
    const isInstructor =
      session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN";

    const where: Record<string, unknown> = {
      quizId,
      quiz: { courseId: id },
    };

    if (!isInstructor) {
      where.userId = session.user.id;
    }

    const attempts = await prisma.quizAttempt.findMany({
      where,
      orderBy: { completedAt: "desc" },
      include: isInstructor
        ? {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          }
        : undefined,
    });

    return successResponse(
      attempts.map((a) => ({
        ...a,
        answers: typeof a.answers === "string" ? JSON.parse(a.answers) : a.answers,
      }))
    );
  } catch (error) {
    console.error("Error fetching quiz attempts:", error);
    return serverErrorResponse("Failed to fetch quiz attempts");
  }
}
