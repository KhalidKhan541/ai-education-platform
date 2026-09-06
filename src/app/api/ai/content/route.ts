import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { aiContentSchema, validateRequest } from "@/lib/validations";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from "@/lib/responses";

async function generateContent(
  type: string,
  content: string,
  parameters: {
    difficulty?: string;
    count?: number;
    format?: string;
  }
): Promise<unknown> {
  const difficulty = parameters.difficulty ?? "MEDIUM";
  const count = parameters.count ?? 5;
  const format = parameters.format ?? "BULLET_POINTS";

  switch (type) {
    case "SUMMARY": {
      const paragraphs = content.split("\n\n").filter((p) => p.trim());
      const keyPoints = paragraphs.slice(0, Math.min(count, paragraphs.length));
      return {
        summary: keyPoints.map((p) => p.trim()).join("\n\n"),
        keyPoints: keyPoints.map((p) => {
          const sentences = p.split(/[.!?]+/).filter((s) => s.trim());
          return sentences[0]?.trim() ?? p.substring(0, 100);
        }),
        wordCount: content.split(/\s+/).length,
        estimatedReadTime: Math.ceil(content.split(/\s+/).length / 200),
      };
    }

    case "QUIZ_QUESTIONS": {
      const sentences = content
        .split(/[.!?]+/)
        .filter((s) => s.trim().length > 20);
      const questions = [];

      for (let i = 0; i < Math.min(count, sentences.length); i++) {
        const sentence = sentences[i]!.trim();
        const words = sentence.split(/\s+/);

        if (words.length > 5) {
          const keyWord = words[Math.floor(Math.random() * words.length)];
          const incorrectOptions = [
            "A fundamental concept that contradicts the statement",
            "An unrelated topic from a different field",
            "A common misconception about the subject",
            "An outdated understanding of the concept",
          ];

          questions.push({
            question: `Based on the content, which of the following best relates to: "${keyWord}"?`,
            type: difficulty === "EASY" ? "TRUE_FALSE" : "MULTIPLE_CHOICE",
            options: [
              { text: sentence, isCorrect: true },
              ...incorrectOptions.slice(0, 3).map((opt) => ({
                text: opt,
                isCorrect: false,
              })),
            ],
            explanation: `This answer is correct because the content explicitly states: "${sentence.substring(0, 150)}..."`,
            points: difficulty === "EASY" ? 1 : difficulty === "MEDIUM" ? 2 : 3,
          });
        }
      }

      return {
        questions,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
        difficulty,
      };
    }

    case "EXPLANATION": {
      const mainConcept = content.substring(0, 200).split(/[.!?]/)[0];
      return {
        explanation: `## ${mainConcept}\n\n### Overview\nThe content discusses key concepts related to this topic. Here's a detailed breakdown:\n\n### Key Principles\n1. **Foundation**: The content establishes fundamental principles\n2. **Application**: These principles are applied in practical contexts\n3. **Implications**: Understanding these leads to deeper insights\n\n### Examples\n- Real-world applications demonstrate the practical value\n- Case studies illustrate successful implementations\n- Common challenges and their solutions\n\n### Summary\nThis material provides essential knowledge that builds upon previous concepts in the curriculum.`,
        keyTerms: ["fundamental", "principles", "application", "implications"],
        relatedTopics: ["Advanced Concepts", "Practical Applications", "Case Studies"],
      };
    }

    case "FLASHCARDS": {
      const paragraphs = content.split("\n\n").filter((p) => p.trim());
      const flashcards = paragraphs.slice(0, count).map((p, i) => {
        const sentences = p.split(/[.!?]+/).filter((s) => s.trim());
        const term = sentences[0]?.trim().substring(0, 100) ?? `Concept ${i + 1}`;
        const definition = sentences.slice(1).join(". ").trim().substring(0, 300) || p.substring(0, 300);
        return {
          front: term,
          back: definition,
          difficulty,
          tags: ["auto-generated", "course-content"],
        };
      });

      return {
        flashcards,
        totalCards: flashcards.length,
        suggestedStudyTime: `${Math.ceil(flashcards.length * 0.5)} minutes`,
      };
    }

    case "OUTLINE": {
      const paragraphs = content.split("\n\n").filter((p) => p.trim());
      const sections = [];
      const sectionSize = Math.ceil(paragraphs.length / Math.min(count, paragraphs.length));

      for (let i = 0; i < paragraphs.length; i += sectionSize) {
        const sectionParagraphs = paragraphs.slice(i, i + sectionSize);
        const sectionTitle = sectionParagraphs[0]!.split(/[.!?]/)[0]!.trim();
        sections.push({
          title: sectionTitle.substring(0, 100),
          content: sectionParagraphs.map((p) => p.trim()).join("\n\n"),
          subsections: [],
        });
      }

      return {
        outline: {
          title: "Course Content Outline",
          sections: sections.map((s, i) => ({
            ...s,
            order: i + 1,
            subsections: [],
          })),
        },
        totalSections: sections.length,
        estimatedStudyTime: `${Math.ceil(paragraphs.length * 2)} minutes`,
      };
    }

    default:
      return { error: "Unsupported content type" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only instructors can generate AI content");
    }

    const body = await request.json();
    const validation = validateRequest(aiContentSchema, body);

    if (!validation.success) {
      return errorResponse(
        validation.errors.map((e) => e.message).join(", ")
      );
    }

    const { type, content, parameters } = validation.data;

    const generatedContent = await generateContent(type, content, parameters);

    await prisma.aIInteraction.create({
      data: {
        userId: session.user.id,
        type: "CONTENT_GENERATION",
        input: JSON.stringify({ type, contentLength: content.length, parameters }),
        output: JSON.stringify(generatedContent),
        metadata: JSON.stringify({ type, parameters }),
      },
    });

    return successResponse({
      type,
      content: generatedContent,
      generatedAt: new Date().toISOString(),
      parameters,
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return serverErrorResponse("Failed to generate content");
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));

    const interactions = await prisma.aIInteraction.findMany({
      where: {
        userId: session.user.id,
        type: "CONTENT_GENERATION",
      },
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
    console.error("Error fetching content history:", error);
    return serverErrorResponse("Failed to fetch content history");
  }
}
