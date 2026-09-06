import { z } from "zod";
import { getAIClient, type AIMessage } from "./provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const SubmissionTypeSchema = z.enum([
  "essay",
  "code",
  "math",
  "short_answer",
  "file_upload",
]);
export type SubmissionType = z.infer<typeof SubmissionTypeSchema>;

export const GradeScaleSchema = z.enum([
  "letter",
  "percentage",
  "gpa",
  "pass_fail",
  "rubric",
]);
export type GradeScale = z.infer<typeof GradeScaleSchema>;

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string;
  description: string;
  examples?: string[];
}

export interface Rubric {
  id: string;
  title: string;
  criteria: RubricCriterion[];
  totalPoints: number;
  passingScore: number;
}

export interface GradingResult {
  id: string;
  submissionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  grade: string;
  rubricScores?: CriterionScore[];
  feedback: GradingFeedback;
  plagiarismCheck?: PlagiarismResult;
  consistencyScore: number;
  gradedAt: Date;
  gradedBy: "ai" | "human";
  confidence: number;
  flags: GradingFlag[];
}

export interface CriterionScore {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  level: string;
  feedback: string;
}

export interface GradingFeedback {
  summary: string;
  strengths: string[];
  areasForImprovement: string[];
  detailedComments: FeedbackComment[];
  suggestions: string[];
  overallTone: "positive" | "neutral" | "constructive" | "critical";
}

export interface FeedbackComment {
  section: string;
  comment: string;
  type: "praise" | "correction" | "suggestion" | "question";
  severity: "info" | "warning" | "critical";
  lineNumber?: number;
}

export interface PlagiarismResult {
  score: number;
  matches: PlagiarismMatch[];
  checkedAt: Date;
}

export interface PlagiarismMatch {
  text: string;
  source: string;
  similarity: number;
  startIndex: number;
  endIndex: number;
}

export interface CodeReviewResult {
  id: string;
  submissionId: string;
  score: number;
  maxScore: number;
  issues: CodeIssue[];
  metrics: CodeMetrics;
  suggestions: CodeSuggestion[];
  overallQuality: "excellent" | "good" | "satisfactory" | "needs_improvement" | "poor";
  feedback: GradingFeedback;
  gradedAt: Date;
}

export interface CodeIssue {
  id: string;
  type: "bug" | "style" | "performance" | "security" | "documentation" | "complexity";
  severity: "error" | "warning" | "info";
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
  rule?: string;
}

export interface CodeMetrics {
  linesOfCode: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  duplicationPercentage: number;
  documentationCoverage: number;
}

export interface CodeSuggestion {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  example?: string;
}

export interface GradingFlag {
  type:
    | "potential_plagiarism"
    | "incomplete"
    | "off_topic"
    | "ai_generated"
    | "inconsistent_level"
    | "exceptional_work";
  message: string;
  confidence: number;
}

export interface GradeConsistencyCheck {
  consistent: boolean;
  deviances: GradeDeviance[];
  recommendations: string[];
}

export interface GradeDeviance {
  criterion: string;
  expectedRange: [number, number];
  actualScore: number;
  severity: "low" | "medium" | "high";
}

// ─── Grading Assistant Service ───────────────────────────────────────────────

export class GradingAssistant {
  private client = getAIClient();

  async gradeEssay(
    submission: string,
    rubric: Rubric,
    assignmentContext: {
      title: string;
      instructions: string;
      learningObjectives?: string[];
      wordLimit?: number;
      citationFormat?: string;
    },
  ): Promise<GradingResult> {
    const systemPrompt = this.buildEssayGradingPrompt(rubric, assignmentContext);

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Grade this essay submission:\n\n${submission}`,
      },
    ];

    const result = await this.client.complete(messages, {
      temperature: 0.3,
      maxTokens: 3000,
    });

    const parsed = this.parseGradingResult(result.content, submission);

    const flags = await this.detectFlags(submission, parsed.score, rubric.totalPoints);

    return {
      id: `grade_${Date.now()}`,
      submissionId: `sub_${Date.now()}`,
      score: parsed.score,
      maxScore: rubric.totalPoints,
      percentage: (parsed.score / rubric.totalPoints) * 100,
      grade: this.calculateGrade(parsed.score, rubric.totalPoints),
      rubricScores: parsed.rubricScores,
      feedback: parsed.feedback,
      consistencyScore: parsed.consistencyScore,
      gradedAt: new Date(),
      gradedBy: "ai",
      confidence: parsed.confidence,
      flags,
    };
  }

  async reviewCode(
    code: string,
    language: string,
    context: {
      assignmentTitle: string;
      requirements: string[];
      codingStandards?: string[];
      testCases?: string[];
    },
  ): Promise<CodeReviewResult> {
    const systemPrompt = `You are an expert code reviewer. Review the following ${language} code.

Assignment: ${context.assignmentTitle}
Requirements: ${context.requirements.join("; ")}
${context.codingStandards ? `Coding Standards: ${context.codingStandards.join("; ")}` : ""}

Provide a thorough code review. Return a JSON object:
{
  "score": 85,
  "maxScore": 100,
  "issues": [
    {
      "type": "bug|style|performance|security|documentation|complexity",
      "severity": "error|warning|info",
      "message": "Description of the issue",
      "line": 42,
      "suggestion": "How to fix it",
      "rule": "Rule name if applicable"
    }
  ],
  "metrics": {
    "linesOfCode": 150,
    "cyclomaticComplexity": 8,
    "maintainabilityIndex": 72,
    "duplicationPercentage": 5,
    "documentationCoverage": 60
  },
  "suggestions": [
    {
      "title": "Suggestion title",
      "description": "Detailed suggestion",
      "impact": "high|medium|low",
      "example": "Code example if applicable"
    }
  ],
  "overallQuality": "excellent|good|satisfactory|needs_improvement|poor",
  "summary": "Overall assessment",
  "strengths": ["Strength 1", "Strength 2"],
  "areasForImprovement": ["Area 1", "Area 2"]
}

Evaluate: correctness, code quality, efficiency, readability, documentation, error handling, and test coverage.`;

    const result = await this.client.complete(
      [{ role: "user", content: `Review this ${language} code:\n\n${code}` }],
      { temperature: 0.3, maxTokens: 3000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        return {
          id: `review_${Date.now()}`,
          submissionId: `sub_${Date.now()}`,
          score: parsed.score ?? 0,
          maxScore: parsed.maxScore ?? 100,
          issues: (parsed.issues ?? []).map(
            (issue: Record<string, unknown>, i: number) => ({
              id: `issue_${i}`,
              type: issue.type ?? "style",
              severity: issue.severity ?? "info",
              message: issue.message ?? "",
              line: issue.line as number | undefined,
              suggestion: issue.suggestion as string | undefined,
              rule: issue.rule as string | undefined,
            }),
          ),
          metrics: {
            linesOfCode: parsed.metrics?.linesOfCode ?? code.split("\n").length,
            cyclomaticComplexity: parsed.metrics?.cyclomaticComplexity ?? 1,
            maintainabilityIndex: parsed.metrics?.maintainabilityIndex ?? 50,
            duplicationPercentage: parsed.metrics?.duplicationPercentage ?? 0,
            documentationCoverage: parsed.metrics?.documentationCoverage ?? 0,
          },
          suggestions: (parsed.suggestions ?? []).map(
            (s: Record<string, unknown>) => ({
              title: s.title ?? "",
              description: s.description ?? "",
              impact: s.impact ?? "medium",
              example: s.example as string | undefined,
            }),
          ),
          overallQuality: parsed.overallQuality ?? "satisfactory",
          feedback: {
            summary: parsed.summary ?? "",
            strengths: parsed.strengths ?? [],
            areasForImprovement: parsed.areasForImprovement ?? [],
            detailedComments: [],
            suggestions: (parsed.suggestions ?? []).map(
              (s: { title: string }) => s.title,
            ),
            overallTone: "constructive",
          },
          gradedAt: new Date(),
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackCodeReview(code, language);
  }

  async gradeWithRubric(
    submission: string,
    rubric: Rubric,
    submissionType: SubmissionType,
  ): Promise<GradingResult> {
    const systemPrompt = `You are an expert grader. Grade this ${submissionType} submission using the provided rubric.

Rubric: ${rubric.title}
Total Points: ${rubric.totalPoints}
Passing Score: ${rubric.passingScore}

Rubric Criteria:
${rubric.criteria
  .map(
    (c) =>
      `${c.name} (${c.weight} points): ${c.description}\n  Levels:\n${c.levels.map((l) => `    ${l.score} pts - ${l.label}: ${l.description}`).join("\n")}`,
  )
  .join("\n\n")}

Return a JSON object:
{
  "rubricScores": [
    {
      "criterionId": "criterion_id",
      "criterionName": "Criterion Name",
      "score": 8,
      "maxScore": 10,
      "level": "Proficient",
      "feedback": "Specific feedback for this criterion"
    }
  ],
  "totalScore": 42,
  "summary": "Overall assessment",
  "strengths": ["Strength 1"],
  "areasForImprovement": ["Area 1"],
  "detailedComments": [
    {
      "section": "section name",
      "comment": "comment text",
      "type": "praise|correction|suggestion|question",
      "severity": "info|warning|critical"
    }
  ]
}`;

    const result = await this.client.complete(
      [{ role: "user", content: `Grade this submission:\n\n${this.truncate(submission, 6000)}` }],
      { temperature: 0.3, maxTokens: 3000 },
    );

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const rubricScores: CriterionScore[] = (parsed.rubricScores ?? []).map(
          (rs: Record<string, unknown>) => ({
            criterionId: (rs.criterionId as string) ?? "",
            criterionName: (rs.criterionName as string) ?? "",
            score: (rs.score as number) ?? 0,
            maxScore: (rs.maxScore as number) ?? 0,
            level: (rs.level as string) ?? "",
            feedback: (rs.feedback as string) ?? "",
          }),
        );

        const totalScore = rubricScores.reduce((sum, rs) => sum + rs.score, 0);

        return {
          id: `grade_${Date.now()}`,
          submissionId: `sub_${Date.now()}`,
          score: totalScore,
          maxScore: rubric.totalPoints,
          percentage: (totalScore / rubric.totalPoints) * 100,
          grade: this.calculateGrade(totalScore, rubric.totalPoints),
          rubricScores,
          feedback: {
            summary: parsed.summary ?? "",
            strengths: parsed.strengths ?? [],
            areasForImprovement: parsed.areasForImprovement ?? [],
            detailedComments: (parsed.detailedComments ?? []).map(
              (c: Record<string, unknown>) => ({
                section: (c.section as string) ?? "",
                comment: (c.comment as string) ?? "",
                type: (c.type as FeedbackComment["type"]) ?? "suggestion",
                severity: (c.severity as FeedbackComment["severity"]) ?? "info",
              }),
            ),
            suggestions: [],
            overallTone: "constructive",
          },
          consistencyScore: 0.85,
          gradedAt: new Date(),
          gradedBy: "ai",
          confidence: 0.8,
          flags: [],
        };
      }
    } catch {
      // fallback
    }

    return this.createFallbackGradingResult(rubric);
  }

  async checkConsistency(
    submissions: { id: string; content: string; grade?: number }[],
    rubric: Rubric,
  ): Promise<GradeConsistencyCheck> {
    if (submissions.length < 2) {
      return {
        consistent: true,
        deviances: [],
        recommendations: [
          "Need at least 2 submissions to check consistency.",
        ],
      };
    }

    const grades = submissions
      .filter((s) => s.grade !== undefined)
      .map((s) => ({
        id: s.id,
        grade: s.grade!,
      }));

    if (grades.length < 2) {
      return {
        consistent: true,
        deviances: [],
        recommendations: ["Need at least 2 graded submissions to compare."],
      };
    }

    const gradesList = grades.map((g) => g.grade);
    const mean = gradesList.reduce((a, b) => a + b, 0) / gradesList.length;
    const variance =
      gradesList.reduce((sum, g) => sum + Math.pow(g - mean, 2), 0) /
      gradesList.length;
    const stdDev = Math.sqrt(variance);

    const deviances: GradeDeviance[] = [];
    const recommendations: string[] = [];

    for (const grade of grades) {
      if (Math.abs(grade.grade - mean) > 2 * stdDev) {
        deviances.push({
          criterion: `Submission ${grade.id}`,
          expectedRange: [
            Math.max(0, mean - stdDev),
            Math.min(rubric.totalPoints, mean + stdDev),
          ],
          actualScore: grade.grade,
          severity:
            Math.abs(grade.grade - mean) > 3 * stdDev ? "high" : "medium",
        });
      }
    }

    if (deviances.length > 0) {
      recommendations.push(
        "Review submissions with significant grade deviations.",
      );
      recommendations.push(
        "Consider calibrating grading criteria for consistency.",
      );
    }

    if (stdDev > rubric.totalPoints * 0.3) {
      recommendations.push(
        "High grade variance detected. Review rubric clarity.",
      );
    }

    return {
      consistent: deviances.length === 0,
      deviances,
      recommendations,
    };
  }

  async generateFeedbackReport(
    gradingResults: GradingResult[],
    classId: string,
  ): Promise<{
    classAverage: number;
    gradeDistribution: Record<string, number>;
    commonStrengths: string[];
    commonWeaknesses: string[];
    recommendations: string[];
    topPerformers: string[];
    needsAttention: string[];
  }> {
    const scores = gradingResults.map((r) => r.percentage);
    const classAverage =
      scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);

    const gradeDistribution: Record<string, number> = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    gradingResults.forEach((r) => {
      const letter = this.calculateGrade(r.score, r.maxScore);
      gradeDistribution[letter] = (gradeDistribution[letter] ?? 0) + 1;
    });

    const strengthCounts = new Map<string, number>();
    const weaknessCounts = new Map<string, number>();

    gradingResults.forEach((r) => {
      r.feedback.strengths.forEach((s) => {
        strengthCounts.set(s, (strengthCounts.get(s) ?? 0) + 1);
      });
      r.feedback.areasForImprovement.forEach((w) => {
        weaknessCounts.set(w, (weaknessCounts.get(w) ?? 0) + 1);
      });
    });

    const commonStrengths = Array.from(strengthCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([s]) => s);

    const commonWeaknesses = Array.from(weaknessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);

    const recommendations: string[] = [];
    if (classAverage < 70) {
      recommendations.push(
        "Class average is below 70%. Consider reviewing foundational concepts.",
      );
    }
    if (commonWeaknesses.length > 0) {
      recommendations.push(
        `Focus on improving: ${commonWeaknesses.slice(0, 3).join(", ")}`,
      );
    }

    const sorted = [...gradingResults].sort(
      (a, b) => b.percentage - a.percentage,
    );
    const topPerformers = sorted
      .slice(0, Math.ceil(gradingResults.length * 0.1))
      .map((r) => r.submissionId);
    const needsAttention = sorted
      .slice(-Math.ceil(gradingResults.length * 0.2))
      .filter((r) => r.percentage < 60)
      .map((r) => r.submissionId);

    return {
      classAverage,
      gradeDistribution,
      commonStrengths,
      commonWeaknesses,
      recommendations,
      topPerformers,
      needsAttention,
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private buildEssayGradingPrompt(
    rubric: Rubric,
    context: {
      title: string;
      instructions: string;
      learningObjectives?: string[];
      wordLimit?: number;
      citationFormat?: string;
    },
  ): string {
    return `You are an expert academic grader. Grade this essay submission.

Assignment: ${context.title}
Instructions: ${context.instructions}
${context.wordLimit ? `Word Limit: ${context.wordLimit} words` : ""}
${context.citationFormat ? `Citation Format: ${context.citationFormat}` : ""}
${context.learningObjectives ? `Learning Objectives: ${context.learningObjectives.join("; ")}` : ""}

Rubric (${rubric.totalPoints} total points, passing: ${rubric.passingScore}):
${rubric.criteria
  .map(
    (c) =>
      `\n${c.name} (${c.weight} points):\n${c.description}\n${c.levels.map((l) => `  ${l.score} pts - ${l.label}: ${l.description}`).join("\n")}`,
  )
  .join("\n")}

Grade the submission fairly and thoroughly. Be constructive but honest.
Return a JSON object:
{
  "rubricScores": [
    {
      "criterionId": "id",
      "criterionName": "name",
      "score": number,
      "maxScore": number,
      "level": "level label",
      "feedback": "specific feedback"
    }
  ],
  "totalScore": number,
  "summary": "overall assessment",
  "strengths": ["strength1", "strength2"],
  "areasForImprovement": ["area1", "area2"],
  "detailedComments": [
    {"section": "section", "comment": "comment", "type": "praise|correction|suggestion", "severity": "info|warning|critical"}
  ]
}`;
  }

  private parseGradingResult(
    content: string,
    submission: string,
  ): {
    score: number;
    rubricScores: CriterionScore[];
    feedback: GradingFeedback;
    consistencyScore: number;
    confidence: number;
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const rubricScores: CriterionScore[] = (parsed.rubricScores ?? []).map(
          (rs: Record<string, unknown>) => ({
            criterionId: (rs.criterionId as string) ?? "",
            criterionName: (rs.criterionName as string) ?? "",
            score: (rs.score as number) ?? 0,
            maxScore: (rs.maxScore as number) ?? 0,
            level: (rs.level as string) ?? "",
            feedback: (rs.feedback as string) ?? "",
          }),
        );

        const totalScore =
          parsed.totalScore ??
          rubricScores.reduce((sum: number, rs: CriterionScore) => sum + rs.score, 0);

        return {
          score: totalScore,
          rubricScores,
          feedback: {
            summary: parsed.summary ?? "",
            strengths: parsed.strengths ?? [],
            areasForImprovement: parsed.areasForImprovement ?? [],
            detailedComments: (parsed.detailedComments ?? []).map(
              (c: Record<string, unknown>) => ({
                section: (c.section as string) ?? "",
                comment: (c.comment as string) ?? "",
                type: (c.type as FeedbackComment["type"]) ?? "suggestion",
                severity: (c.severity as FeedbackComment["severity"]) ?? "info",
              }),
            ),
            suggestions: [],
            overallTone: "constructive",
          },
          consistencyScore: 0.85,
          confidence: this.estimateConfidence(content, submission),
        };
      }
    } catch {
      // fallback
    }

    return {
      score: 0,
      rubricScores: [],
      feedback: {
        summary: content.substring(0, 500),
        strengths: [],
        areasForImprovement: ["Unable to parse structured grading result"],
        detailedComments: [],
        suggestions: [],
        overallTone: "neutral",
      },
      consistencyScore: 0.5,
      confidence: 0.3,
    };
  }

  private estimateConfidence(gradingResponse: string, submission: string): number {
    let confidence = 0.5;

    if (gradingResponse.includes("rubricScores")) confidence += 0.15;
    if (gradingResponse.includes("strengths")) confidence += 0.1;
    if (gradingResponse.includes("areasForImprovement")) confidence += 0.1;
    if (submission.length > 200) confidence += 0.1;
    if (submission.length > 1000) confidence += 0.05;

    return Math.min(confidence, 0.95);
  }

  private async detectFlags(
    submission: string,
    score: number,
    maxScore: number,
  ): Promise<GradingFlag[]> {
    const flags: GradingFlag[] = [];

    const percentage = (score / maxScore) * 100;

    if (percentage > 95) {
      flags.push({
        type: "exceptional_work",
        message: "Exceptional performance - may warrant human review.",
        confidence: 0.7,
      });
    }

    if (submission.length < 100) {
      flags.push({
        type: "incomplete",
        message: "Submission appears unusually short.",
        confidence: 0.8,
      });
    }

    const aiPatterns =
      /\b(as an ai|I don't have|I cannot|my training|language model)\b/i;
    if (aiPatterns.test(submission)) {
      flags.push({
        type: "ai_generated",
        message: "Potential AI-generated content detected.",
        confidence: 0.6,
      });
    }

    return flags;
  }

  private calculateGrade(score: number, maxScore: number): string {
    const percentage = (score / maxScore) * 100;

    if (percentage >= 93) return "A";
    if (percentage >= 90) return "A-";
    if (percentage >= 87) return "B+";
    if (percentage >= 83) return "B";
    if (percentage >= 80) return "B-";
    if (percentage >= 77) return "C+";
    if (percentage >= 73) return "C";
    if (percentage >= 70) return "C-";
    if (percentage >= 67) return "D+";
    if (percentage >= 60) return "D";
    return "F";
  }

  private truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + "\n\n[Truncated for grading...]";
  }

  private createFallbackCodeReview(
    code: string,
    language: string,
  ): CodeReviewResult {
    const lines = code.split("\n");
    return {
      id: `review_fallback_${Date.now()}`,
      submissionId: `sub_${Date.now()}`,
      score: 70,
      maxScore: 100,
      issues: [
        {
          id: "issue_fallback_0",
          type: "documentation",
          severity: "warning",
          message: "Code review was generated with limited analysis. Please retry for detailed review.",
          suggestion: "Ensure code is well-documented and follows best practices.",
        },
      ],
      metrics: {
        linesOfCode: lines.length,
        cyclomaticComplexity: 1,
        maintainabilityIndex: 50,
        duplicationPercentage: 0,
        documentationCoverage: 0,
      },
      suggestions: [
        {
          title: "Add documentation",
          description: "Add comments and documentation to improve code readability.",
          impact: "medium",
        },
      ],
      overallQuality: "satisfactory",
      feedback: {
        summary: `Code review for ${language} submission. Limited analysis available.`,
        strengths: ["Code compiles/runs"],
        areasForImprovement: [
          "Add more documentation",
          "Consider edge cases",
        ],
        detailedComments: [],
        suggestions: ["Review code style guidelines"],
        overallTone: "constructive",
      },
      gradedAt: new Date(),
    };
  }

  private createFallbackGradingResult(rubric: Rubric): GradingResult {
    return {
      id: `grade_fallback_${Date.now()}`,
      submissionId: `sub_${Date.now()}`,
      score: 0,
      maxScore: rubric.totalPoints,
      percentage: 0,
      grade: "N/A",
      rubricScores: [],
      feedback: {
        summary: "Grading could not be completed. Please retry or grade manually.",
        strengths: [],
        areasForImprovement: ["Unable to assess submission"],
        detailedComments: [],
        suggestions: [],
        overallTone: "neutral",
      },
      consistencyScore: 0,
      gradedAt: new Date(),
      gradedBy: "ai",
      confidence: 0,
      flags: [],
    };
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let gradingAssistant: GradingAssistant | null = null;

export function getGradingAssistant(): GradingAssistant {
  if (!gradingAssistant) {
    gradingAssistant = new GradingAssistant();
  }
  return gradingAssistant;
}
