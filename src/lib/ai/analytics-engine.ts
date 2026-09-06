import { z } from "zod";
import { getAIClient, type AIMessage } from "./provider";

// ─── Types ───────────────────────────────────────────────────────────────────

export const MetricTypeSchema = z.enum([
  "performance",
  "engagement",
  "progress",
  "behavior",
  "retention",
]);
export type MetricType = z.infer<typeof MetricTypeSchema>;

export const TimeRangeSchema = z.enum([
  "day",
  "week",
  "month",
  "quarter",
  "semester",
  "all_time",
]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export interface StudentPerformanceData {
  studentId: string;
  studentName: string;
  enrollments: EnrollmentData[];
  assessments: AssessmentData[];
  activityLogs: ActivityLog[];
  learningSessions: LearningSession[];
  goalProgress: GoalProgress[];
}

export interface EnrollmentData {
  courseId: string;
  courseName: string;
  enrolledAt: Date;
  progress: number;
  lastActivityAt: Date;
  status: "active" | "completed" | "dropped" | "paused";
}

export interface AssessmentData {
  id: string;
  courseId: string;
  title: string;
  type: "quiz" | "assignment" | "exam" | "project" | "participation";
  score: number;
  maxScore: number;
  submittedAt: Date;
  gradedAt?: Date;
  timeSpentMinutes: number;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  type: "login" | "lesson_view" | "quiz_attempt" | "forum_post" | "video_watch" | "resource_download";
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface LearningSession {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  courseId: string;
  activities: string[];
  engagementScore: number;
}

export interface GoalProgress {
  goalId: string;
  goal: string;
  targetDate: Date;
  progress: number;
  milestones: { name: string; completed: boolean; completedAt?: Date }[];
}

export interface PerformanceAnalysis {
  studentId: string;
  overallScore: number;
  subjectBreakdown: SubjectPerformance[];
  trendAnalysis: TrendData;
  strengths: string[];
  weaknesses: string[];
  learningStyle: string;
  engagementLevel: "high" | "medium" | "low";
  riskLevel: "low" | "medium" | "high" | "critical";
  insights: string[];
  generatedAt: Date;
}

export interface SubjectPerformance {
  subject: string;
  score: number;
  trend: "improving" | "stable" | "declining";
  assessmentCount: number;
  averageTimeMinutes: number;
  masteryLevel: "novice" | "beginner" | "intermediate" | "advanced" | "expert";
}

export interface TrendData {
  direction: "improving" | "stable" | "declining";
  rate: number;
  consistency: number;
  predictedNextScore: number;
  dataPoints: { date: string; score: number }[];
}

export interface LearningGap {
  id: string;
  topic: string;
  subject: string;
  currentMastery: number;
  expectedMastery: number;
  gapSeverity: "critical" | "significant" | "minor";
  prerequisites: string[];
  recommendedActions: GapRecommendation[];
  estimatedTimeToClose: number;
}

export interface GapRecommendation {
  type: "lesson" | "practice" | "tutoring" | "resource" | "assessment";
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: number;
}

export interface AtRiskPrediction {
  studentId: string;
  studentName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  riskFactors: RiskFactor[];
  interventions: Intervention[];
  predictedOutcome: string;
  confidence: number;
  generatedAt: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface Intervention {
  type: "notification" | "tutoring" | "counseling" | "parent_contact" | "extension" | "resource";
  title: string;
  description: string;
  urgency: "immediate" | "within_week" | "within_month";
  expectedImpact: number;
}

export interface EngagementMetrics {
  studentId: string;
  overallEngagement: number;
  dailyActiveMinutes: number[];
  weeklyTrend: "increasing" | "stable" | "decreasing";
  mostActiveTime: string;
  preferredContent: string[];
  interactionRate: number;
  completionRate: number;
  streakDays: number;
  lastActiveAt: Date;
}

export interface Recommendation {
  id: string;
  type: "course" | "resource" | "study_method" | "peer" | "goal";
  title: string;
  description: string;
  reason: string;
  confidence: number;
  estimatedImpact: number;
  relatedTopics: string[];
  metadata?: Record<string, unknown>;
}

// ─── Analytics Engine Service ────────────────────────────────────────────────

export class AnalyticsEngine {
  private client = getAIClient();

  async analyzePerformance(
    data: StudentPerformanceData,
    options?: {
      timeRange?: TimeRange;
      includePredictions?: boolean;
      compareWith?: "class_average" | "top_performers" | "historical";
    },
  ): Promise<PerformanceAnalysis> {
    const assessmentScores = data.assessments.map((a) => ({
      score: (a.score / a.maxScore) * 100,
      date: a.submittedAt,
      courseId: a.courseId,
      type: a.type,
    }));

    const overallScore =
      assessmentScores.length > 0
        ? assessmentScores.reduce((sum, a) => sum + a.score, 0) /
          assessmentScores.length
        : 0;

    const subjectBreakdown = this.calculateSubjectBreakdown(data);
    const trendAnalysis = this.calculateTrend(assessmentScores);
    const engagementLevel = this.calculateEngagementLevel(data);
    const riskLevel = this.calculateRiskLevel(data, overallScore, trendAnalysis);

    const systemPrompt = `Analyze this student's performance data and provide actionable insights.

Student: ${data.studentName}
Overall Score: ${overallScore.toFixed(1)}%
Assessment Count: ${data.assessments.length}
Sessions Count: ${data.learningSessions.length}
Engagement Level: ${engagementLevel}
Risk Level: ${riskLevel}

Subject Breakdown:
${subjectBreakdown.map((s) => `- ${s.subject}: ${s.score.toFixed(1)}% (${s.trend}, ${s.masteryLevel})`).join("\n")}

Trend: ${trendAnalysis.direction} at ${trendAnalysis.rate.toFixed(2)}% per period

Provide 3-5 specific, actionable insights. Return JSON:
{
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "learningStyle": "detected learning style",
  "insights": ["insight1", "insight2", "insight3"]
}

Focus on patterns, not just raw numbers.`;

    const result = await this.client.complete(
      [{ role: "user", content: "Analyze student performance." }],
      { temperature: 0.4, maxTokens: 1024 },
    );

    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let learningStyle = "unknown";
    let insights: string[] = [];

    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        strengths = parsed.strengths ?? [];
        weaknesses = parsed.weaknesses ?? [];
        learningStyle = parsed.learningStyle ?? "unknown";
        insights = parsed.insights ?? [];
      }
    } catch {
      insights = [
        "Based on the data, the student shows consistent engagement.",
        "Consider focusing on areas with declining trends.",
      ];
    }

    return {
      studentId: data.studentId,
      overallScore,
      subjectBreakdown,
      trendAnalysis,
      strengths,
      weaknesses,
      learningStyle,
      engagementLevel,
      riskLevel,
      insights,
      generatedAt: new Date(),
    };
  }

  async identifyLearningGaps(
    data: StudentPerformanceData,
    courseObjectives: { topic: string; expectedMastery: number; prerequisites: string[] }[],
  ): Promise<LearningGap[]> {
    const gaps: LearningGap[] = [];

    for (const objective of courseObjectives) {
      const relevantAssessments = data.assessments.filter(
        (a) =>
          a.title.toLowerCase().includes(objective.topic.toLowerCase()) ||
          a.courseId === objective.topic,
      );

      const currentMastery =
        relevantAssessments.length > 0
          ? relevantAssessments.reduce(
              (sum, a) => sum + (a.score / a.maxScore) * 100,
              0,
            ) / relevantAssessments.length
          : 0;

      const gap = objective.expectedMastery - currentMastery;

      if (gap > 10) {
        const gapSeverity: LearningGap["gapSeverity"] =
          gap > 40 ? "critical" : gap > 25 ? "significant" : "minor";

        const recommendedActions = await this.generateGapRecommendations(
          objective.topic,
          currentMastery,
          gapSeverity,
          data.studentId,
        );

        gaps.push({
          id: `gap_${Date.now()}_${objective.topic}`,
          topic: objective.topic,
          subject: objective.topic,
          currentMastery,
          expectedMastery: objective.expectedMastery,
          gapSeverity,
          prerequisites: objective.prerequisites,
          recommendedActions,
          estimatedTimeToClose: Math.ceil(gap * 1.5),
        });
      }
    }

    return gaps.sort((a, b) => {
      const severityOrder = { critical: 0, significant: 1, minor: 2 };
      return severityOrder[a.gapSeverity] - severityOrder[b.gapSeverity];
    });
  }

  async predictAtRiskStudents(
    studentData: StudentPerformanceData[],
    historicalData?: { studentId: string; wasAtRisk: boolean; factors: string[] }[],
  ): Promise<AtRiskPrediction[]> {
    const predictions: AtRiskPrediction[] = [];

    for (const student of studentData) {
      const assessmentScores = student.assessments.map(
        (a) => (a.score / a.maxScore) * 100,
      );

      const avgScore =
        assessmentScores.length > 0
          ? assessmentScores.reduce((a, b) => a + b, 0) /
            assessmentScores.length
          : 0;

      const recentScores = assessmentScores.slice(-5);
      const recentAvg =
        recentScores.length > 0
          ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length
          : avgScore;

      const daysSinceActive = Math.floor(
        (Date.now() - new Date(student.activityLogs.at(-1)?.timestamp ?? Date.now()).getTime()) /
          (1000 * 60 * 60 * 24),
      );

      const sessionCount = student.learningSessions.length;
      const avgSessionDuration =
        sessionCount > 0
          ? student.learningSessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
            sessionCount
          : 0;

      let riskScore = 0;

      if (avgScore < 50) riskScore += 30;
      else if (avgScore < 60) riskScore += 20;
      else if (avgScore < 70) riskScore += 10;

      if (recentAvg < avgScore - 15) riskScore += 20;

      if (daysSinceActive > 14) riskScore += 25;
      else if (daysSinceActive > 7) riskScore += 15;
      else if (daysSinceActive > 3) riskScore += 5;

      if (sessionCount < 3) riskScore += 15;
      if (avgSessionDuration < 10) riskScore += 10;

      const declineCount = recentScores.filter(
        (s, i) => i > 0 && s < recentScores[i - 1],
      ).length;
      if (declineCount >= 3) riskScore += 15;

      riskScore = Math.min(riskScore, 100);

      const riskLevel: AtRiskPrediction["riskLevel"] =
        riskScore >= 70
          ? "critical"
          : riskScore >= 50
            ? "high"
            : riskScore >= 30
              ? "medium"
              : "low";

      const riskFactors: RiskFactor[] = [];
      if (avgScore < 60)
        riskFactors.push({
          factor: "Low average score",
          weight: 30,
          description: `Average score is ${avgScore.toFixed(1)}%, below the 60% threshold.`,
          severity: "high",
        });
      if (daysSinceActive > 7)
        riskFactors.push({
          factor: "Inactivity",
          weight: 20,
          description: `Last active ${daysSinceActive} days ago.`,
          severity: daysSinceActive > 14 ? "high" : "medium",
        });
      if (sessionCount < 5)
        riskFactors.push({
          factor: "Low engagement",
          weight: 15,
          description: `Only ${sessionCount} learning sessions recorded.`,
          severity: "medium",
        });
      if (recentAvg < avgScore - 10)
        riskFactors.push({
          factor: "Declining performance",
          weight: 20,
          description: "Recent performance is significantly below historical average.",
          severity: "high",
        });

      const interventions = this.generateInterventions(riskLevel, riskFactors);

      predictions.push({
        studentId: student.studentId,
        studentName: student.studentName,
        riskScore,
        riskLevel,
        riskFactors,
        interventions,
        predictedOutcome:
          riskLevel === "critical"
            ? "Likely to fail without immediate intervention"
            : riskLevel === "high"
              ? "At significant risk of falling behind"
              : riskLevel === "medium"
                ? "Moderate risk - monitor closely"
                : "On track for success",
        confidence: 0.75,
        generatedAt: new Date(),
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  }

  async calculateEngagementMetrics(
    data: StudentPerformanceData,
    timeRange: TimeRange = "month",
  ): Promise<EngagementMetrics> {
    const now = new Date();
    const rangeStart = this.getRangeStart(now, timeRange);

    const filteredLogs = data.activityLogs.filter(
      (log) => new Date(log.timestamp) >= rangeStart,
    );

    const filteredSessions = data.learningSessions.filter(
      (session) => new Date(session.startTime) >= rangeStart,
    );

    const totalMinutes = filteredSessions.reduce(
      (sum, s) => sum + s.durationMinutes,
      0,
    );

    const daysInRange = Math.max(
      1,
      Math.ceil((now.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const dailyActiveMinutes = Array.from({ length: Math.min(daysInRange, 30) }, (_, i) => {
      const day = new Date(rangeStart);
      day.setDate(day.getDate() + i);
      const dayStr = day.toISOString().split("T")[0];

      return filteredSessions
        .filter((s) => new Date(s.startTime).toISOString().split("T")[0] === dayStr)
        .reduce((sum, s) => sum + s.durationMinutes, 0);
    });

    const weeklyMinutes = [0, 0, 0, 0];
    filteredSessions.forEach((s) => {
      const weekIndex = Math.min(
        3,
        Math.floor(
          (new Date(s.startTime).getTime() - rangeStart.getTime()) /
            (7 * 24 * 60 * 60 * 1000),
        ),
      );
      weeklyMinutes[weekIndex] += s.durationMinutes;
    });

    const weeklyTrend =
      weeklyMinutes[3] > weeklyMinutes[0] * 1.1
        ? "increasing"
        : weeklyMinutes[3] < weeklyMinutes[0] * 0.9
          ? "decreasing"
          : "stable";

    const hourCounts = new Array(24).fill(0);
    filteredSessions.forEach((s) => {
      const hour = new Date(s.startTime).getHours();
      hourCounts[hour] += s.durationMinutes;
    });
    const mostActiveHour = hourCounts.indexOf(Math.max(...hourCounts));
    const mostActiveTime = `${mostActiveHour}:00 - ${(mostActiveHour + 1) % 24}:00`;

    const contentTypeCounts = new Map<string, number>();
    filteredLogs.forEach((log) => {
      contentTypeCounts.set(
        log.type,
        (contentTypeCounts.get(log.type) ?? 0) + 1,
      );
    });
    const preferredContent = Array.from(contentTypeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    const lastSession = filteredSessions.at(-1);
    const streakDays = this.calculateStreak(filteredSessions);

    return {
      studentId: data.studentId,
      overallEngagement: this.computeEngagementScore(
        totalMinutes,
        filteredLogs.length,
        filteredSessions.length,
        daysInRange,
      ),
      dailyActiveMinutes,
      weeklyTrend,
      mostActiveTime,
      preferredContent,
      interactionRate: filteredLogs.length / Math.max(daysInRange, 1),
      completionRate: this.calculateCompletionRate(data),
      streakDays,
      lastActiveAt: lastSession?.endTime ?? now,
    };
  }

  async generateRecommendations(
    data: StudentPerformanceData,
    performance: PerformanceAnalysis,
    engagement: EngagementMetrics,
  ): Promise<Recommendation[]> {
    const systemPrompt = `Generate personalized learning recommendations for this student.

Student: ${data.studentName}
Overall Score: ${performance.overallScore.toFixed(1)}%
Engagement: ${engagement.overallEngagement.toFixed(0)}/100
Risk Level: ${performance.riskLevel}
Learning Style: ${performance.learningStyle}
Weaknesses: ${performance.weaknesses.join(", ")}
Preferred Content: ${engagement.preferredContent.join(", ")}
Streak: ${engagement.streakDays} days

Generate 5-7 recommendations as a JSON array:
[{
  "type": "course|resource|study_method|peer|goal",
  "title": "Recommendation title",
  "description": "Detailed description",
  "reason": "Why this is recommended",
  "confidence": 0.85,
  "estimatedImpact": 75,
  "relatedTopics": ["topic1"]
}]

Be specific, actionable, and consider the student's current state.`;

    const result = await this.client.complete(
      [{ role: "user", content: "Generate recommendations." }],
      { temperature: 0.6, maxTokens: 1500 },
    );

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map(
          (r: Record<string, unknown>, i: number) =>
            ({
              id: `rec_${Date.now()}_${i}`,
              type: r.type ?? "resource",
              title: r.title ?? "",
              description: r.description ?? "",
              reason: r.reason ?? "",
              confidence: (r.confidence as number) ?? 0.7,
              estimatedImpact: (r.estimatedImpact as number) ?? 50,
              relatedTopics: (r.relatedTopics as string[]) ?? [],
            }) as Recommendation,
        );
      }
    } catch {
      // fallback
    }

    return this.getDefaultRecommendations(performance, engagement);
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────

  private calculateSubjectBreakdown(
    data: StudentPerformanceData,
  ): SubjectPerformance[] {
    const courseMap = new Map<string, AssessmentData[]>();

    data.assessments.forEach((a) => {
      const existing = courseMap.get(a.courseId) ?? [];
      existing.push(a);
      courseMap.set(a.courseId, existing);
    });

    const breakdowns: SubjectPerformance[] = [];

    courseMap.forEach((assessments, courseId) => {
      const scores = assessments.map((a) => (a.score / a.maxScore) * 100);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      const sortedScores = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sortedScores.length / 2);
      const median =
        sortedScores.length % 2 === 0
          ? (sortedScores[mid - 1] + sortedScores[mid]) / 2
          : sortedScores[mid];

      let trend: SubjectPerformance["trend"] = "stable";
      if (scores.length >= 3) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg + 5) trend = "improving";
        else if (secondAvg < firstAvg - 5) trend = "declining";
      }

      let masteryLevel: SubjectPerformance["masteryLevel"] = "novice";
      if (avgScore >= 90) masteryLevel = "expert";
      else if (avgScore >= 80) masteryLevel = "advanced";
      else if (avgScore >= 70) masteryLevel = "intermediate";
      else if (avgScore >= 60) masteryLevel = "beginner";

      const avgTime =
        assessments.reduce((sum, a) => sum + a.timeSpentMinutes, 0) /
        assessments.length;

      breakdowns.push({
        subject: courseId,
        score: avgScore,
        trend,
        assessmentCount: assessments.length,
        averageTimeMinutes: avgTime,
        masteryLevel,
      });
    });

    return breakdowns;
  }

  private calculateTrend(
    scores: { score: number; date: Date }[],
  ): TrendData {
    if (scores.length < 2) {
      return {
        direction: "stable",
        rate: 0,
        consistency: 1,
        predictedNextScore: scores[0]?.score ?? 0,
        dataPoints: scores.map((s) => ({
          date: new Date(s.date).toISOString().split("T")[0],
          score: s.score,
        })),
      };
    }

    const sorted = [...scores].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const n = sorted.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    sorted.forEach((point, i) => {
      sumX += i;
      sumY += point.score;
      sumXY += i * point.score;
      sumX2 += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedNextScore = slope * n + intercept;

    const mean = sumY / n;
    const ssRes = sorted.reduce(
      (sum, point, i) =>
        sum + Math.pow(point.score - (slope * i + intercept), 2),
      0,
    );
    const ssTot = sorted.reduce(
      (sum, point) => sum + Math.pow(point.score - mean, 2),
      0,
    );
    const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
    const consistency = Math.max(0, Math.min(1, rSquared));

    const direction: TrendData["direction"] =
      slope > 0.5 ? "improving" : slope < -0.5 ? "declining" : "stable";

    return {
      direction,
      rate: slope,
      consistency,
      predictedNextScore: Math.max(0, Math.min(100, predictedNextScore)),
      dataPoints: sorted.map((s) => ({
        date: new Date(s.date).toISOString().split("T")[0],
        score: s.score,
      })),
    };
  }

  private calculateEngagementLevel(
    data: StudentPerformanceData,
  ): "high" | "medium" | "low" {
    const recentSessions = data.learningSessions.slice(-10);
    const avgDuration =
      recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + s.durationMinutes, 0) /
          recentSessions.length
        : 0;

    const avgEngagement =
      recentSessions.length > 0
        ? recentSessions.reduce((sum, s) => sum + s.engagementScore, 0) /
          recentSessions.length
        : 0;

    const loginDays = new Set(
      data.activityLogs
        .filter((l) => l.type === "login")
        .map((l) => new Date(l.timestamp).toISOString().split("T")[0]),
    ).size;

    const daysSinceFirst =
      data.activityLogs.length > 0
        ? Math.max(
            1,
            Math.ceil(
              (Date.now() -
                new Date(data.activityLogs[0].timestamp).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 1;

    const loginFrequency = loginDays / daysSinceFirst;

    const score =
      avgDuration * 0.3 + avgEngagement * 0.4 + loginFrequency * 100 * 0.3;

    if (score > 60) return "high";
    if (score > 30) return "medium";
    return "low";
  }

  private calculateRiskLevel(
    data: StudentPerformanceData,
    overallScore: number,
    trend: TrendData,
  ): "low" | "medium" | "high" | "critical" {
    let risk = 0;

    if (overallScore < 50) risk += 30;
    else if (overallScore < 60) risk += 20;
    else if (overallScore < 70) risk += 10;

    if (trend.direction === "declining") risk += 15;
    if (trend.rate < -1) risk += 10;

    const daysSinceActive =
      data.activityLogs.length > 0
        ? Math.floor(
            (Date.now() -
              new Date(data.activityLogs.at(-1)!.timestamp).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 30;

    if (daysSinceActive > 14) risk += 25;
    else if (daysSinceActive > 7) risk += 15;

    if (data.learningSessions.length < 5) risk += 10;

    risk = Math.min(risk, 100);

    if (risk >= 70) return "critical";
    if (risk >= 50) return "high";
    if (risk >= 30) return "medium";
    return "low";
  }

  private async generateGapRecommendations(
    topic: string,
    currentMastery: number,
    severity: LearningGap["gapSeverity"],
    studentId: string,
  ): Promise<GapRecommendation[]> {
    void studentId;
    const recommendations: GapRecommendation[] = [];

    if (currentMastery < 30) {
      recommendations.push({
        type: "lesson",
        title: `Review Fundamentals of ${topic}`,
        description: `Start with basic concepts of ${topic} to build a strong foundation.`,
        estimatedMinutes: 45,
        priority: 1,
      });
    }

    if (severity === "critical" || severity === "significant") {
      recommendations.push({
        type: "tutoring",
        title: `Schedule Tutoring for ${topic}`,
        description: `Get personalized help with ${topic} from an AI tutor or instructor.`,
        estimatedMinutes: 30,
        priority: 1,
      });
    }

    recommendations.push({
      type: "practice",
      title: `Practice Problems: ${topic}`,
      description: `Work through targeted practice problems to reinforce understanding.`,
      estimatedMinutes: 30,
      priority: 2,
    });

    recommendations.push({
      type: "resource",
      title: `Supplementary Materials for ${topic}`,
      description: `Review additional resources including videos and articles.`,
      estimatedMinutes: 20,
      priority: 3,
    });

    if (currentMastery >= 30) {
      recommendations.push({
        type: "assessment",
        title: `Re-assess: ${topic}`,
        description: `Take a diagnostic quiz to measure improvement.`,
        estimatedMinutes: 15,
        priority: 4,
      });
    }

    return recommendations;
  }

  private generateInterventions(
    riskLevel: AtRiskPrediction["riskLevel"],
    factors: RiskFactor[],
  ): Intervention[] {
    const interventions: Intervention[] = [];

    if (riskLevel === "critical") {
      interventions.push({
        type: "counseling",
        title: "Immediate Academic Counseling",
        description: "Schedule an urgent meeting with academic advisor.",
        urgency: "immediate",
        expectedImpact: 80,
      });
      interventions.push({
        type: "parent_contact",
        title: "Parent/Guardian Notification",
        description: "Notify parents/guardians about academic concerns.",
        urgency: "immediate",
        expectedImpact: 60,
      });
    }

    if (riskLevel === "high" || riskLevel === "critical") {
      interventions.push({
        type: "tutoring",
        title: "Intensive Tutoring Sessions",
        description: "Schedule 2-3 tutoring sessions per week.",
        urgency: "within_week",
        expectedImpact: 70,
      });
    }

    if (factors.some((f) => f.factor === "Inactivity")) {
      interventions.push({
        type: "notification",
        title: "Re-engagement Campaign",
        description: "Send personalized encouragement and check-in messages.",
        urgency: "within_week",
        expectedImpact: 50,
      });
    }

    if (factors.some((f) => f.factor === "Low average score")) {
      interventions.push({
        type: "resource",
        title: "Remedial Resources",
        description: "Provide targeted learning materials for weak areas.",
        urgency: "within_week",
        expectedImpact: 60,
      });
    }

    if (riskLevel === "medium") {
      interventions.push({
        type: "extension",
        title: "Assignment Extensions",
        description: "Consider granting extensions for pending assignments.",
        urgency: "within_month",
        expectedImpact: 40,
      });
    }

    if (interventions.length === 0) {
      interventions.push({
        type: "notification",
        title: "Progress Check",
        description: "Schedule a routine progress check-in.",
        urgency: "within_month",
        expectedImpact: 30,
      });
    }

    return interventions;
  }

  private calculateStreak(sessions: LearningSession[]): number {
    if (sessions.length === 0) return 0;

    const sorted = [...sessions].sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const hasSession = sorted.some(
        (s) => new Date(s.startTime).toISOString().split("T")[0] === dateStr,
      );

      if (hasSession) {
        streak++;
      } else if (i > 0) {
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  private computeEngagementScore(
    totalMinutes: number,
    logCount: number,
    sessionCount: number,
    daysInRange: number,
  ): number {
    const minutesScore = Math.min(30, (totalMinutes / (daysInRange * 30)) * 30);
    const logScore = Math.min(30, (logCount / (daysInRange * 3)) * 30);
    const sessionScore = Math.min(40, (sessionCount / daysInRange) * 40);

    return Math.round(minutesScore + logScore + sessionScore);
  }

  private calculateCompletionRate(data: StudentPerformanceData): number {
    const completed = data.enrollments.filter(
      (e) => e.status === "completed",
    ).length;
    return data.enrollments.length > 0
      ? (completed / data.enrollments.length) * 100
      : 0;
  }

  private getRangeStart(end: Date, range: TimeRange): Date {
    const start = new Date(end);
    switch (range) {
      case "day":
        start.setDate(start.getDate() - 1);
        break;
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(start.getMonth() - 3);
        break;
      case "semester":
        start.setMonth(start.getMonth() - 6);
        break;
      case "all_time":
        start.setFullYear(start.getFullYear() - 10);
        break;
    }
    return start;
  }

  private getDefaultRecommendations(
    performance: PerformanceAnalysis,
    engagement: EngagementMetrics,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    if (performance.riskLevel !== "low") {
      recommendations.push({
        id: `rec_${Date.now()}_urgent`,
        type: "study_method",
        title: "Structured Study Schedule",
        description: "Create a consistent daily study routine with timed sessions.",
        reason: `Risk level is ${performance.riskLevel}. Structure can help improve consistency.`,
        confidence: 0.8,
        estimatedImpact: 60,
        relatedTopics: ["time_management", "study_skills"],
      });
    }

    if (engagement.streakDays < 3) {
      recommendations.push({
        id: `rec_${Date.now()}_streak`,
        type: "goal",
        title: "Build a Learning Streak",
        description: "Try to study for at least 15 minutes every day for a week.",
        reason: `Current streak is ${engagement.streakDays} days. Consistent practice improves retention.`,
        confidence: 0.85,
        estimatedImpact: 50,
        relatedTopics: ["consistency", "habit_formation"],
      });
    }

    if (performance.weaknesses.length > 0) {
      recommendations.push({
        id: `rec_${Date.now()}_weakness`,
        type: "resource",
        title: `Focus on: ${performance.weaknesses[0]}`,
        description: `Dedicate extra time to improve in ${performance.weaknesses[0]}.`,
        reason: `This is identified as an area for improvement.`,
        confidence: 0.75,
        estimatedImpact: 55,
        relatedTopics: performance.weaknesses.slice(0, 3),
      });
    }

    recommendations.push({
      id: `rec_${Date.now()}_peer`,
      type: "peer",
      title: "Join a Study Group",
      description: "Collaborate with peers for better understanding and motivation.",
      reason: "Peer learning has been shown to improve outcomes.",
      confidence: 0.7,
      estimatedImpact: 45,
      relatedTopics: ["collaboration", "peer_learning"],
    });

    return recommendations;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────────────

let analyticsEngine: AnalyticsEngine | null = null;

export function getAnalyticsEngine(): AnalyticsEngine {
  if (!analyticsEngine) {
    analyticsEngine = new AnalyticsEngine();
  }
  return analyticsEngine;
}
