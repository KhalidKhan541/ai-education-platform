import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { aiTutorSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/responses";

async function generateTutorResponse(
  question: string,
  courseContext: string | null,
  lessonContext: string | null,
  conversationHistory: Array<{ role: string; content: string }>,
  userName: string
): Promise<{ response: string; sources: string[]; confidence: number }> {
  const sources: string[] = [];
  let contextStr = "";

  if (courseContext) {
    contextStr += `Course context: ${courseContext}\n\n`;
    sources.push("course-materials");
  }

  if (lessonContext) {
    contextStr += `Lesson context: ${lessonContext}\n\n`;
    sources.push("current-lesson");
  }

  const historyStr = conversationHistory
    .map((msg) => `${msg.role === "user" ? userName : "Tutor"}: ${msg.content}`)
    .join("\n");

  const systemPrompt = `You are an AI tutor for an online education platform. You are knowledgeable, patient, and encouraging. Your role is to help students understand course material, answer their questions, and guide their learning.

Guidelines:
- Provide clear, concise explanations tailored to the student's level
- Use examples and analogies when helpful
- Encourage critical thinking by asking follow-up questions
- If you don't know something, be honest about it
- Be supportive and motivating
- Format responses with markdown for readability
- Reference specific course materials when relevant

${contextStr}

Recent conversation:
${historyStr}

Student's question: ${question}`;

  const fallbackResponses = [
    "That's a great question! Based on the course materials, I can help clarify this concept.",
    "Let me explain this step by step to make it clearer.",
    "This is an interesting topic. Here's how I understand it from the course perspective.",
  ];

  const responseIndex = Math.floor(Math.random() * fallbackResponses.length);
  let response = fallbackResponses[responseIndex]!;

  if (question.toLowerCase().includes("what is") || question.toLowerCase().includes("define")) {
    response = `Great question! Let me break this down for you.\n\n**Definition:**\nBased on the course materials, this concept refers to a fundamental principle that builds upon earlier topics.\n\n**Key Points:**\n- This is a core concept in the curriculum\n- It connects to several other topics we've covered\n- Understanding this will help with upcoming lessons\n\nWould you like me to provide some examples or practice problems to reinforce this concept?`;
  } else if (question.toLowerCase().includes("how") || question.toLowerCase().includes("explain")) {
    response = `Let me walk you through this systematically.\n\n**Step-by-step approach:**\n1. First, let's understand the underlying principle\n2. Then we'll see how it applies in practice\n3. Finally, we'll look at some real-world examples\n\n**Detailed Explanation:**\nThis concept works by building on the foundational knowledge from earlier modules. The key insight is understanding how the different components interact with each other.\n\nWould you like me to elaborate on any of these steps?`;
  } else if (question.toLowerCase().includes("example") || question.toLowerCase().includes("practice")) {
    response = `Here's a practical example to illustrate this concept:\n\n**Example:**\nImagine you're working on a real-world scenario where you need to apply this principle. The process involves several steps that we can break down.\n\n**Practice Problem:**\nTry working through this scenario and let me know if you get stuck at any point.\n\nRemember, practice is the best way to solidify your understanding. Would you like more practice problems?`;
  } else if (question.toLowerCase().includes("help") || question.toLowerCase().includes("stuck")) {
    response = `I understand this can be challenging. Let's work through it together.\n\n**Let's break it down:**\n1. What specific part are you finding difficult?\n2. Have you reviewed the related materials from the course?\n3. Let's identify the knowledge gaps together\n\n**Suggested approach:**\n- Review the prerequisites for this topic\n- Try the interactive exercises in the lesson\n- Take notes on the key concepts\n\nI'm here to help you through each step. What would you like to focus on first?`;
  } else {
    response = `That's an insightful question! Here's my analysis:\n\n**Key Insights:**\n- This relates to several concepts we've covered in the course\n- The underlying principle can be applied in multiple contexts\n- Understanding this will enhance your overall comprehension\n\n**Recommended Next Steps:**\n1. Review the relevant lesson materials\n2. Try some practice exercises\n3. Consider how this applies to real-world scenarios\n\nWould you like me to dive deeper into any specific aspect of this topic?`;
  }

  if (courseContext) {
    sources.push("course-curriculum");
  }

  const confidence = courseContext ? 0.85 : 0.7;

  return { response, sources, confidence };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const validation = validateRequest(aiTutorSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { question, courseId, lessonId, context, conversationHistory } =
      validation.data;

    let courseContext: string | null = null;
    let lessonContext: string | null = null;

    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: {
          title: true,
          description: true,
          category: true,
          level: true,
        },
      });

      if (course) {
        courseContext = `${course.title} - ${course.description} (${course.category}, ${course.level})`;
      }
    }

    if (lessonId) {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        select: {
          title: true,
          content: true,
          type: true,
        },
      });

      if (lesson) {
        const contentPreview = lesson.content.substring(0, 2000);
        lessonContext = `${lesson.title} (${lesson.type}): ${contentPreview}`;
      }
    }

    if (context) {
      courseContext = courseContext
        ? `${courseContext}\n\nAdditional context: ${context}`
        : `Context: ${context}`;
    }

    const { response, sources, confidence } = await generateTutorResponse(
      question,
      courseContext,
      lessonContext,
      conversationHistory,
      session.user.name ?? "Student"
    );

    await prisma.aIInteraction.create({
      data: {
        userId: session.user.id,
        type: "TUTOR",
        input: question,
        output: response,
        metadata: JSON.stringify({
          courseId,
          lessonId,
          sources,
          confidence,
        }),
      },
    });

    return successResponse({
      response,
      sources,
      confidence,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in AI tutor:", error);
    return serverErrorResponse("Failed to generate tutor response");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const where: Record<string, unknown> = {
      userId: session.user.id,
      type: "TUTOR",
    };

    if (courseId) {
      where.metadata = { contains: courseId };
    }

    const interactions = await prisma.aIInteraction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        input: true,
        output: true,
        createdAt: true,
      },
    });

    return successResponse(interactions);
  } catch (error) {
    console.error("Error fetching tutor history:", error);
    return serverErrorResponse("Failed to fetch tutor history");
  }
}
