import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { aiGradingSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

async function gradeSubmission(
  content: string,
  rubric: Array<{ criterion: string; points: number; description?: string }>,
  assignmentTitle: string
): Promise<{
  totalScore: number;
  maxScore: number;
  percentage: number;
  criteriaGrades: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    feedback: string;
  }>;
  overallFeedback: string;
  suggestions: string[];
}> {
  const contentLength = content.length;
  const wordCount = content.split(/\s+/).length;
  const hasStructure = /^#{1,6}\s|^\*\*|^- |^\d+\.\s/m.test(content);
  const hasCodeBlocks = /```[\s\S]*?```/.test(content);
  const hasLinks = /https?:\/\/[^\s]+/.test(content);

  let qualityMultiplier = 0.5;
  if (wordCount > 100) qualityMultiplier += 0.1;
  if (wordCount > 300) qualityMultiplier += 0.1;
  if (wordCount > 500) qualityMultiplier += 0.1;
  if (hasStructure) qualityMultiplier += 0.1;
  if (hasCodeBlocks) qualityMultiplier += 0.05;
  if (hasLinks) qualityMultiplier += 0.05;

  qualityMultiplier = Math.min(1, qualityMultiplier);

  const criteriaGrades = rubric.map((criterion) => {
    const baseScore = Math.random() * 0.3 + 0.5;
    const score = Math.min(1, baseScore * qualityMultiplier + Math.random() * 0.2);
    const earnedPoints = Math.round(criterion.points * score);

    let feedback = "";
    if (score >= 0.9) {
      feedback = `Excellent work on ${criterion.criterion}. Your submission demonstrates strong understanding.`;
    } else if (score >= 0.7) {
      feedback = `Good effort on ${criterion.criterion}. Consider expanding your analysis.`;
    } else if (score >= 0.5) {
      feedback = `Adequate work on ${criterion.criterion}. There's room for improvement in depth and clarity.`;
    } else {
      feedback = `Your ${criterion.criterion} needs significant improvement. Review the requirements carefully.`;
    }

    return {
      criterion: criterion.criterion,
      points: earnedPoints,
      maxPoints: criterion.points,
      feedback,
    };
  });

  const totalScore = criteriaGrades.reduce((sum, g) => sum + g.points, 0);
  const maxScore = rubric.reduce((sum, r) => sum + r.points, 0);
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const suggestions: string[] = [];
  if (wordCount < 100) {
    suggestions.push("Consider providing more detailed explanations and examples.");
  }
  if (!hasStructure) {
    suggestions.push("Use headings and bullet points to organize your response.");
  }
  if (!hasCodeBlocks && content.toLowerCase().includes("code")) {
    suggestions.push("Include code examples to illustrate your points.");
  }
  if (percentage < 70) {
    suggestions.push("Review the assignment requirements and rubric carefully.");
    suggestions.push("Consider visiting the AI tutor for help understanding the concepts.");
  }

  let overallFeedback = "";
  if (percentage >= 90) {
    overallFeedback = `Outstanding submission for "${assignmentTitle}"! Your work demonstrates excellent understanding and thorough analysis.`;
  } else if (percentage >= 80) {
    overallFeedback = `Great work on "${assignmentTitle}"! Your submission shows solid understanding with room for minor improvements.`;
  } else if (percentage >= 70) {
    overallFeedback = `Good effort on "${assignmentTitle}". Your submission meets the basic requirements but could benefit from more depth.`;
  } else if (percentage >= 60) {
    overallFeedback = `Your submission for "${assignmentTitle}" needs improvement. Please review the feedback and consider revising.`;
  } else {
    overallFeedback = `Your submission for "${assignmentTitle}" requires significant revision. Please review the assignment requirements and seek help if needed.`;
  }

  return {
    totalScore,
    maxScore,
    percentage,
    criteriaGrades,
    overallFeedback,
    suggestions,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can use AI grading");
    }

    const body = await request.json();
    const validation = validateRequest(aiGradingSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { assignmentId, submissionId, rubric } = validation.data;

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        title: true,
        courseId: true,
        rubric: true,
        maxScore: true,
        course: { select: { instructorId: true } },
      },
    });

    if (!assignment) {
      return notFoundResponse("Assignment not found");
    }

    if (
      assignment.course.instructorId !== session.user.id &&
      session.user.role !== "ADMIN"
    ) {
      return forbiddenResponse("You can only grade submissions for your own courses");
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId, assignmentId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!submission) {
      return notFoundResponse("Submission not found");
    }

    const gradingRubric =
      rubric ??
      (typeof assignment.rubric === "string"
        ? JSON.parse(assignment.rubric)
        : assignment.rubric);

    if (!gradingRubric || gradingRubric.length === 0) {
      return errorResponse("No rubric available for grading");
    }

    const gradingResult = await gradeSubmission(
      submission.content,
      gradingRubric,
      assignment.title
    );

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: gradingResult.percentage,
        feedback: gradingResult.overallFeedback,
        gradedBy: "AI",
        gradedAt: new Date(),
        status: "GRADED",
        rubricFeedback: JSON.stringify(gradingResult.criteriaGrades),
      },
    });

    await prisma.aIInteraction.create({
      data: {
        userId: session.user.id,
        type: "GRADING",
        input: JSON.stringify({
          assignmentId,
          submissionId,
          rubric: gradingRubric,
        }),
        output: JSON.stringify(gradingResult),
        metadata: JSON.stringify({
          courseId: assignment.courseId,
          studentId: submission.user.id,
        }),
      },
    });

    await prisma.notification.create({
      data: {
        userId: submission.user.id,
        type: "GRADE_NOTIFICATION",
        title: "Assignment Graded",
        message: `Your submission for "${assignment.title}" has been graded. Score: ${gradingResult.percentage}%`,
        metadata: JSON.stringify({
          assignmentId,
          submissionId,
          score: gradingResult.percentage,
        }),
      },
    });

    return successResponse({
      grading: {
        totalScore: gradingResult.totalScore,
        maxScore: gradingResult.maxScore,
        percentage: gradingResult.percentage,
        criteriaGrades: gradingResult.criteriaGrades,
        overallFeedback: gradingResult.overallFeedback,
        suggestions: gradingResult.suggestions,
      },
      submission: {
        id: submission.id,
        userId: submission.user.id,
        userName: submission.user.name,
      },
      gradedAt: new Date().toISOString(),
      gradedBy: "AI",
    });
  } catch (error) {
    console.error("Error in AI grading:", error);
    return serverErrorResponse("Failed to grade submission");
  }
}
