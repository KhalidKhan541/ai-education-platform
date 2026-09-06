import prisma from "@/lib/prisma";

export interface RubricCriterion {
  criterion: string;
  points: number;
  description?: string;
}

export interface GradingResult {
  submissionId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  criteriaScores: Array<{
    criterion: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export class GradingAssistant {
  static async gradeSubmission(
    submissionId: string,
    rubric?: RubricCriterion[]
  ): Promise<GradingResult> {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: { include: { course: true } },
        user: { select: { id: true, name: true } },
      },
    });

    if (!submission) throw new Error("Submission not found");

    const content = submission.content ?? "";

    if (rubric && rubric.length > 0) {
      return this.gradeWithRubric(submissionId, content, rubric);
    }

    return this.gradeWithoutRubric(submissionId, content);
  }

  private static async gradeWithRubric(
    submissionId: string,
    content: string,
    rubric: RubricCriterion[]
  ): Promise<GradingResult> {
    const prompt = this.buildRubricPrompt(content, rubric);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a fair and constructive grading assistant." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) throw new Error("Grading API error");

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";

      return this.parseRubricResponse(submissionId, text, rubric);
    } catch {
      return this.getDefaultGrading(submissionId, rubric);
    }
  }

  private static buildRubricPrompt(content: string, rubric: RubricCriterion[]): string {
    const rubricText = rubric
      .map((r) => `- ${r.criterion} (${r.points} points): ${r.description ?? "No description"}`)
      .join("\n");

    return `Grade the following submission using this rubric:\n\n${rubricText}\n\nSubmission:\n${content}\n\nReturn JSON with: totalScore, feedback, and criteriaScores array (each with criterion, score, maxScore, feedback).`;
  }

  private static parseRubricResponse(
    submissionId: string,
    text: string,
    rubric: RubricCriterion[]
  ): GradingResult {
    try {
      const parsed = JSON.parse(text);
      const maxScore = rubric.reduce((sum, r) => sum + r.points, 0);

      return {
        submissionId,
        totalScore: parsed.totalScore ?? 0,
        maxScore,
        percentage: maxScore > 0 ? ((parsed.totalScore ?? 0) / maxScore) * 100 : 0,
        feedback: parsed.feedback ?? "",
        criteriaScores: parsed.criteriaScores ?? [],
      };
    } catch {
      return this.getDefaultGrading(submissionId, rubric);
    }
  }

  private static getDefaultGrading(
    submissionId: string,
    rubric: RubricCriterion[]
  ): GradingResult {
    const maxScore = rubric.reduce((sum, r) => sum + r.points, 0);
    return {
      submissionId,
      totalScore: 0,
      maxScore,
      percentage: 0,
      feedback: "Unable to grade automatically. Please review manually.",
      criteriaScores: rubric.map((r) => ({
        criterion: r.criterion,
        score: 0,
        maxScore: r.points,
        feedback: "Manual review needed",
      })),
    };
  }

  private static async gradeWithoutRubric(
    submissionId: string,
    content: string
  ): Promise<GradingResult> {
    const prompt = `Grade this submission on a scale of 0-100:\n\n${content}\n\nReturn JSON with score and feedback.`;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a fair grading assistant." },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error("Grading API error");

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(text);

      return {
        submissionId,
        totalScore: parsed.score ?? 0,
        maxScore: 100,
        percentage: parsed.score ?? 0,
        feedback: parsed.feedback ?? "",
        criteriaScores: [],
      };
    } catch {
      return {
        submissionId,
        totalScore: 0,
        maxScore: 100,
        percentage: 0,
        feedback: "Unable to grade automatically.",
        criteriaScores: [],
      };
    }
  }

  static async getGradingFeedback(submissionId: string): Promise<string> {
    const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new Error("Submission not found");

    if (submission.feedback) return submission.feedback;
    return "This submission has not been graded yet.";
  }

  static async bulkGrade(
    submissionIds: string[],
    rubric?: RubricCriterion[]
  ): Promise<GradingResult[]> {
    const results = await Promise.allSettled(
      submissionIds.map((id) => this.gradeSubmission(id, rubric))
    );

    return results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return {
        submissionId: submissionIds[i],
        totalScore: 0,
        maxScore: 100,
        percentage: 0,
        feedback: "Grading failed",
        criteriaScores: [],
      };
    });
  }
}
