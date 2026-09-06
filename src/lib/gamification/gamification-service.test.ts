import { GamificationService, ACHIEVEMENTS } from "@/lib/gamification/gamification-service";
import prisma from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  __esModule: true,
  default: {
    points: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    achievement: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  points: {
    create: jest.Mock;
    findMany: jest.Mock;
    aggregate: jest.Mock;
  };
  achievement: {
    create: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
    count: jest.Mock;
  };
  user: { findMany: jest.Mock };
};

describe("GamificationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("ACHIEVEMENTS", () => {
    it("should have valid achievement definitions", () => {
      expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
      ACHIEVEMENTS.forEach((a) => {
        expect(a.id).toBeDefined();
        expect(a.name).toBeDefined();
        expect(a.points).toBeGreaterThan(0);
        expect(a.category).toBeDefined();
      });
    });

    it("should have unique IDs", () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("addPoints", () => {
    it("should add points to user", async () => {
      mockPrisma.points.create.mockResolvedValue({ id: "p1", points: 50 });

      const result = await GamificationService.addPoints("u1", 50, "lesson", "Completed lesson");
      expect(result.points).toBe(50);
    });
  });

  describe("getTotalPoints", () => {
    it("should return total points", async () => {
      mockPrisma.points.aggregate.mockResolvedValue({ _sum: { points: 250 } });

      const result = await GamificationService.getTotalPoints("u1");
      expect(result).toBe(250);
    });

    it("should return 0 if no points", async () => {
      mockPrisma.points.aggregate.mockResolvedValue({ _sum: { points: null } });
      const result = await GamificationService.getTotalPoints("u1");
      expect(result).toBe(0);
    });
  });

  describe("getPointsHistory", () => {
    it("should return points history", async () => {
      mockPrisma.points.findMany.mockResolvedValue([
        { id: "p1", points: 50 },
        { id: "p2", points: 30 },
      ]);

      const result = await GamificationService.getPointsHistory("u1");
      expect(result).toHaveLength(2);
    });
  });

  describe("awardAchievement", () => {
    it("should award an achievement", async () => {
      mockPrisma.achievement.findFirst.mockResolvedValue(null);
      mockPrisma.achievement.create.mockResolvedValue({ id: "a1" });
      mockPrisma.points.create.mockResolvedValue({});

      const result = await GamificationService.awardAchievement("u1", "first-lesson");
      expect(result.id).toBe("a1");
    });

    it("should not duplicate achievements", async () => {
      mockPrisma.achievement.findFirst.mockResolvedValue({ id: "existing" });

      const result = await GamificationService.awardAchievement("u1", "first-lesson");
      expect(result.id).toBe("existing");
      expect(mockPrisma.achievement.create).not.toHaveBeenCalled();
    });

    it("should throw for invalid achievement", async () => {
      mockPrisma.achievement.findFirst.mockResolvedValue(null);

      await expect(
        GamificationService.awardAchievement("u1", "nonexistent")
      ).rejects.toThrow("Achievement not found");
    });

    it("should award points for achievement", async () => {
      mockPrisma.achievement.findFirst.mockResolvedValue(null);
      mockPrisma.achievement.create.mockResolvedValue({});
      mockPrisma.points.create.mockResolvedValue({});

      await GamificationService.awardAchievement("u1", "quiz-master");

      expect(mockPrisma.points.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            points: 50,
            source: "achievement",
          }),
        })
      );
    });
  });

  describe("getUserAchievements", () => {
    it("should return user achievements", async () => {
      mockPrisma.achievement.findMany.mockResolvedValue([
        { id: "a1", name: "First Steps" },
      ]);

      const result = await GamificationService.getUserAchievements("u1");
      expect(result).toHaveLength(1);
    });
  });

  describe("hasAchievement", () => {
    it("should return true if has achievement", async () => {
      mockPrisma.achievement.count.mockResolvedValue(1);
      const result = await GamificationService.hasAchievement("u1", "first-lesson");
      expect(result).toBe(true);
    });

    it("should return false if no achievement", async () => {
      mockPrisma.achievement.count.mockResolvedValue(0);
      const result = await GamificationService.hasAchievement("u1", "first-lesson");
      expect(result).toBe(false);
    });
  });

  describe("getLeaderboard", () => {
    it("should return sorted leaderboard", async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: "u1", name: "Alice", image: null, points: [{ points: 100 }, { points: 50 }] },
        { id: "u2", name: "Bob", image: null, points: [{ points: 200 }] },
      ]);

      const result = await GamificationService.getLeaderboard();
      expect(result[0].totalPoints).toBe(200);
      expect(result[1].totalPoints).toBe(150);
    });
  });

  describe("checkAndAwardStreak", () => {
    it("should return streak count", async () => {
      const now = new Date();
      mockPrisma.points.findMany.mockResolvedValue([
        { createdAt: now },
        { createdAt: new Date(now.getTime() - 86400000) },
        { createdAt: new Date(now.getTime() - 2 * 86400000) },
      ]);

      const result = await GamificationService.checkAndAwardStreak("u1");
      expect(result).toBe(3);
    });

    it("should return undefined for empty history", async () => {
      mockPrisma.points.findMany.mockResolvedValue([]);
      const result = await GamificationService.checkAndAwardStreak("u1");
      expect(result).toBeUndefined();
    });
  });

  describe("getLevel", () => {
    it("should calculate level from points", async () => {
      mockPrisma.points.aggregate.mockResolvedValue({ _sum: { points: 350 } });

      const result = await GamificationService.getLevel("u1");
      expect(result.level).toBe(4);
      expect(result.totalPoints).toBe(350);
      expect(result.pointsInLevel).toBe(50);
      expect(result.nextLevelPoints).toBe(50);
    });

    it("should handle zero points", async () => {
      mockPrisma.points.aggregate.mockResolvedValue({ _sum: { points: null } });

      const result = await GamificationService.getLevel("u1");
      expect(result.level).toBe(1);
      expect(result.totalPoints).toBe(0);
    });
  });
});
