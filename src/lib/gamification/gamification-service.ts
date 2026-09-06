import prisma from "@/lib/prisma";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-lesson", name: "First Steps", description: "Complete your first lesson", icon: "🎯", points: 10, category: "learning" },
  { id: "course-completed", name: "Course Champion", description: "Complete a full course", icon: "🏆", points: 100, category: "learning" },
  { id: "quiz-master", name: "Quiz Master", description: "Score 100% on 5 quizzes", icon: "🧠", points: 50, category: "quizzes" },
  { id: "streak-7", name: "Week Warrior", description: "Maintain a 7-day streak", icon: "🔥", points: 30, category: "engagement" },
  { id: "streak-30", name: "Monthly Maven", description: "Maintain a 30-day streak", icon: "⭐", points: 150, category: "engagement" },
  { id: "perfect-assignment", name: "Perfectionist", description: "Get 100% on an assignment", icon: "💎", points: 40, category: "assignments" },
  { id: "help-others", name: "Community Helper", description: "Help 10 students in discussions", icon: "🤝", points: 60, category: "social" },
  { id: "speed-learner", name: "Speed Learner", description: "Complete 5 lessons in one day", icon: "⚡", points: 25, category: "learning" },
  { id: "explorer", name: "Explorer", description: "Enroll in 3 different courses", icon: "🗺️", points: 20, category: "engagement" },
  { id: "ai-user", name: "AI Enthusiast", description: "Use AI tutor 50 times", icon: "🤖", points: 35, category: "ai" },
];

export class GamificationService {
  static async addPoints(userId: string, points: number, source: string, description: string) {
    return prisma.points.create({
      data: { userId, points, source, description },
    });
  }

  static async getTotalPoints(userId: string): Promise<number> {
    const result = await prisma.points.aggregate({
      where: { userId },
      _sum: { points: true },
    });
    return result._sum.points ?? 0;
  }

  static async getPointsHistory(userId: string, limit = 20) {
    return prisma.points.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  static async awardAchievement(userId: string, achievementId: string) {
    const existing = await prisma.achievement.findFirst({
      where: { userId, achievementId },
    });
    if (existing) return existing;

    const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!achievement) throw new Error("Achievement not found");

    const result = await prisma.achievement.create({
      data: { userId, achievementId, name: achievement.name, description: achievement.description },
    });

    await this.addPoints(userId, achievement.points, "achievement", `Achievement: ${achievement.name}`);

    return result;
  }

  static async getUserAchievements(userId: string) {
    return prisma.achievement.findMany({
      where: { userId },
      orderBy: { awardedAt: "desc" },
    });
  }

  static async hasAchievement(userId: string, achievementId: string): Promise<boolean> {
    const count = await prisma.achievement.count({
      where: { userId, achievementId },
    });
    return count > 0;
  }

  static async getLeaderboard(limit = 10) {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        image: true,
        points: {
          select: { points: true },
        },
      },
      take: limit,
    });

    return users
      .map((u) => ({
        userId: u.id,
        name: u.name,
        image: u.image,
        totalPoints: u.points.reduce((sum, p) => sum + p.points, 0),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  }

  static async checkAndAwardStreak(userId: string) {
    const recentPoints = await prisma.points.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    });

    if (recentPoints.length === 0) return;

    let streak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i < recentPoints.length; i++) {
      const prev = new Date(recentPoints[i - 1].createdAt);
      const curr = new Date(recentPoints[i].createdAt);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);

      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    if (streak >= 7) await this.awardAchievement(userId, "streak-7").catch(() => {});
    if (streak >= 30) await this.awardAchievement(userId, "streak-30").catch(() => {});

    return streak;
  }

  static async getLevel(userId: string) {
    const totalPoints = await this.getTotalPoints(userId);
    const level = Math.floor(totalPoints / 100) + 1;
    const pointsInLevel = totalPoints % 100;
    const nextLevelPoints = 100 - pointsInLevel;

    return { level, totalPoints, pointsInLevel, nextLevelPoints };
  }
}
