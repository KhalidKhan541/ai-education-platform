import { registerSchema, loginSchema, courseSchema, lessonSchema, quizSchema, validateRequest } from "@/lib/validations";

describe("Validators", () => {
  describe("registerSchema", () => {
    it("should accept valid registration data", () => {
      const result = registerSchema.safeParse({
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
        role: "STUDENT",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "not-an-email",
        password: "Password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject short name", () => {
      const result = registerSchema.safeParse({
        name: "J",
        email: "john@example.com",
        password: "Password123",
      });
      expect(result.success).toBe(false);
    });

    it("should reject weak password", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "john@example.com",
        password: "123",
      });
      expect(result.success).toBe(false);
    });

    it("should default role to STUDENT", () => {
      const result = registerSchema.safeParse({
        name: "John",
        email: "john@example.com",
        password: "Password123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("STUDENT");
      }
    });
  });

  describe("loginSchema", () => {
    it("should accept valid login", () => {
      const result = loginSchema.safeParse({
        email: "john@example.com",
        password: "password",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty password", () => {
      const result = loginSchema.safeParse({
        email: "john@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("courseSchema", () => {
    it("should accept valid course data", () => {
      const result = courseSchema.safeParse({
        title: "JavaScript Fundamentals",
        description: "A comprehensive course about JavaScript programming",
        category: "Programming",
        level: "BEGINNER",
        price: 49.99,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty title", () => {
      const result = courseSchema.safeParse({
        title: "",
        description: "Course description here",
        category: "Programming",
        level: "BEGINNER",
        price: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject short description", () => {
      const result = courseSchema.safeParse({
        title: "Course",
        description: "Short",
        category: "Programming",
        level: "BEGINNER",
        price: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid level", () => {
      const result = courseSchema.safeParse({
        title: "Course",
        description: "A valid description that is long enough",
        category: "Programming",
        level: "INVALID",
        price: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative price", () => {
      const result = courseSchema.safeParse({
        title: "Course",
        description: "A valid description that is long enough",
        category: "Programming",
        level: "BEGINNER",
        price: -10,
      });
      expect(result.success).toBe(false);
    });

    it("should accept default values", () => {
      const result = courseSchema.safeParse({
        title: "Course",
        description: "A valid description that is long enough for validation",
        category: "Programming",
        level: "INTERMEDIATE",
        price: 0,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isPublished).toBe(false);
        expect(result.data.prerequisites).toEqual([]);
        expect(result.data.tags).toEqual([]);
      }
    });
  });

  describe("lessonSchema", () => {
    it("should accept valid lesson data", () => {
      const result = lessonSchema.safeParse({
        title: "Introduction to Variables",
        content: "Variables are containers for storing data values.",
        type: "TEXT",
        order: 0,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty content", () => {
      const result = lessonSchema.safeParse({
        title: "Lesson",
        content: "",
        type: "TEXT",
        order: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should accept video lessons with URL", () => {
      const result = lessonSchema.safeParse({
        title: "Video Lesson",
        content: "Video content",
        type: "VIDEO",
        order: 1,
        videoUrl: "https://youtube.com/watch?v=123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid video URL", () => {
      const result = lessonSchema.safeParse({
        title: "Video Lesson",
        content: "Content",
        type: "VIDEO",
        order: 0,
        videoUrl: "not-a-url",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("quizSchema", () => {
    it("should accept valid quiz data", () => {
      const result = quizSchema.safeParse({
        title: "Chapter 1 Quiz",
        questions: [
          {
            type: "MULTIPLE_CHOICE",
            question: "What is 2+2?",
            options: [
              { text: "3", isCorrect: false },
              { text: "4", isCorrect: true },
            ],
            points: 5,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty questions array", () => {
      const result = quizSchema.safeParse({
        title: "Quiz",
        questions: [],
      });
      expect(result.success).toBe(false);
    });

    it("should accept default values", () => {
      const result = quizSchema.safeParse({
        title: "Quiz",
        questions: [
          { type: "TRUE_FALSE", question: "True or false?", points: 1 },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxAttempts).toBe(1);
        expect(result.data.passingScore).toBe(70);
      }
    });
  });

  describe("validateRequest", () => {
    it("should return success with data", () => {
      const result = validateRequest(loginSchema, {
        email: "test@example.com",
        password: "pass",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("test@example.com");
      }
    });

    it("should return errors for invalid data", () => {
      const result = validateRequest(loginSchema, {
        email: "invalid",
        password: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].field).toBeDefined();
        expect(result.errors[0].message).toBeDefined();
      }
    });
  });
});
