import { NextAuthOptions, getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db";
import { config } from "./config";

// ==================== TYPES ====================

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    role: string;
    isEmailVerified: boolean;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      firstName: string | null;
      lastName: string | null;
      image: string | null;
      role: string;
      isEmailVerified: boolean;
    };
    expires: string;
  }

  interface Account {
    provider: string;
    type: string;
    providerAccountId: string;
    access_token?: string;
    token_type?: string;
    id_token?: string;
    refresh_token?: string;
    expires_at?: number;
    scope?: string;
    session_state?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    image: string | null;
    role: string;
    isEmailVerified: boolean;
  }
}

// ==================== VALIDATION SCHEMA ====================

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ==================== AUTH CONFIGURATION ====================

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
    newUser: "/auth/welcome",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const validatedFields = loginSchema.safeParse(credentials);
        if (!validatedFields.success) {
          throw new Error("Invalid credentials");
        }

        const { email, password } = validatedFields.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            firstName: true,
            lastName: true,
            image: true,
            role: true,
            passwordHash: true,
            isEmailVerified: true,
            isActive: true,
          },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No account found with this email");
        }

        if (!user.isActive) {
          throw new Error("Account has been deactivated");
        }

        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          image: user.image,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
        };
      },
    }),

    GitHubProvider({
      clientId: config.env.GITHUB_CLIENT_ID,
      clientSecret: config.env.GITHUB_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),

    GoogleProvider({
      clientId: config.env.GOOGLE_CLIENT_ID,
      clientSecret: config.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (!profile?.email) {
        return false;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: profile.email.toLowerCase() },
      });

      if (existingUser) {
        if (!existingUser.isActive) {
          return false;
        }

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account?.provider ?? "",
              providerAccountId: account?.providerAccountId ?? "",
            },
          },
        });

        if (!existingAccount) {
          await prisma.account.create({
            data: {
              userId: existingUser.id,
              type: account?.type ?? "oauth",
              provider: account?.provider ?? "",
              providerAccountId: account?.providerAccountId ?? "",
              refresh_token: account?.refresh_token ?? null,
              access_token: account?.access_token ?? null,
              expires_at: account?.expires_at ?? null,
              token_type: account?.token_type ?? null,
              scope: account?.scope ?? null,
              id_token: account?.id_token ?? null,
              session_state: account?.session_state ?? null,
            },
          });
        }

        user.id = existingUser.id;
        (user as Record<string, unknown>).role = existingUser.role;
        (user as Record<string, unknown>).isEmailVerified = existingUser.isEmailVerified;

        return true;
      }

      const name = profile.name ?? "";
      const nameParts = name.split(" ");
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ");

      const newUser = await prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          name,
          firstName,
          lastName,
          image: (profile as { picture?: string }).picture ?? null,
          role: "STUDENT",
          isEmailVerified: true,
        },
      });

      user.id = newUser.id;
      (user as Record<string, unknown>).role = newUser.role;
      (user as Record<string, unknown>).isEmailVerified = newUser.isEmailVerified;

      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.firstName = (user as Record<string, unknown>).firstName as string | null;
        token.lastName = (user as Record<string, unknown>).lastName as string | null;
        token.image = user.image;
        token.role = (user as Record<string, unknown>).role as string;
        token.isEmailVerified = (user as Record<string, unknown>).isEmailVerified as boolean;
      }

      if (account?.provider === "credentials" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isEmailVerified: true, isActive: true },
        });

        if (dbUser) {
          token.role = dbUser.role;
          token.isEmailVerified = dbUser.isEmailVerified;

          if (!dbUser.isActive) {
            return {} as typeof token;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token && token.id) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          name: token.name as string | null,
          firstName: token.firstName as string | null,
          lastName: token.lastName as string | null,
          image: token.image as string | null,
          role: token.role as string,
          isEmailVerified: token.isEmailVerified as boolean,
        };
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return baseUrl;
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      if (isNewUser && user.id) {
        await prisma.notificationPreference.create({
          data: {
            userId: user.id,
            email: true,
            push: true,
            inApp: true,
            sms: false,
            types: [
              "COURSE_UPDATE",
              "ASSIGNMENT_DUE",
              "GRADE_POSTED",
              "DISCUSSION_REPLY",
              "LIVE_SESSION_START",
              "CERTIFICATE_ISSUED",
              "SYSTEM",
              "AI_RESPONSE",
              "ENROLLMENT",
              "REMINDER",
            ],
          },
        });
      }
    },
  },

  debug: config.env.NODE_ENV === "development",
};

// ==================== HELPER FUNCTIONS ====================

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireRole(role: string) {
  const user = await requireAuth();
  if (user.role !== role && user.role !== "ADMIN") {
    throw new Error(`Access denied. Required role: ${role}`);
  }
  return user;
}

export function isStudent(user: { role: string } | null): boolean {
  return user?.role === "STUDENT";
}

export function isInstructor(user: { role: string } | null): boolean {
  return user?.role === "INSTRUCTOR";
}

export function isTA(user: { role: string } | null): boolean {
  return user?.role === "TA";
}

export function isAdmin(user: { role: string } | null): boolean {
  return user?.role === "ADMIN";
}

export function hasRole(
  user: { role: string } | null,
  roles: string[]
): boolean {
  return user !== null && roles.includes(user.role);
}

export function canAccessCourse(
  user: { role: string; id: string } | null,
  course: { instructorId: string; isPublished: boolean }
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN" || user.role === "TA") {
    return true;
  }

  if (user.role === "INSTRUCTOR") {
    return user.id === course.instructorId;
  }

  return course.isPublished;
}

export function canEditCourse(
  user: { role: string; id: string } | null,
  course: { instructorId: string }
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "INSTRUCTOR") {
    return user.id === course.instructorId;
  }

  return false;
}

export function canGradeAssignments(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "INSTRUCTOR" || user.role === "TA" || user.role === "ADMIN";
}

export function canManageLiveSessions(
  user: { role: string; id: string } | null,
  session: { hostId: string }
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "INSTRUCTOR") {
    return user.id === session.hostId;
  }

  return false;
}

export function canViewAnalytics(
  user: { role: string; id: string } | null,
  course?: { instructorId: string }
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "INSTRUCTOR" && course) {
    return user.id === course.instructorId;
  }

  return false;
}

export function canCreateDiscussion(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return ["STUDENT", "INSTRUCTOR", "TA", "ADMIN"].includes(user.role);
}

export function canModerateDiscussion(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return ["INSTRUCTOR", "TA", "ADMIN"].includes(user.role);
}

export function canAccessAI(
  user: { role: string } | null,
  course?: { isPublished: boolean }
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (course?.isPublished) return true;
  return false;
}

export function canIssueCertificates(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return ["INSTRUCTOR", "ADMIN"].includes(user.role);
}

export function canManagePayments(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

export function canViewStudentProgress(
  user: { role: string } | null,
  studentId?: string,
  currentUserId?: string
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  if (user.role === "INSTRUCTOR" || user.role === "TA") {
    return true;
  }

  if (user.role === "STUDENT") {
    return studentId === currentUserId;
  }

  return false;
}

export function canExportData(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return ["INSTRUCTOR", "ADMIN"].includes(user.role);
}

export function canDeleteContent(
  user: { role: string; id: string } | null,
  content: { uploadedById: string }
): boolean {
  if (!user) return false;

  if (user.role === "ADMIN") return true;

  return user.id === content.uploadedById;
}

export function canManageUsers(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

export function canCreateCourses(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return ["INSTRUCTOR", "ADMIN"].includes(user.role);
}

export function canEnrollInCourse(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "STUDENT";
}

export function canSubmitAssignment(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "STUDENT";
}

export function canTakeQuiz(
  user: { role: string } | null
): boolean {
  if (!user) return false;
  return user.role === "STUDENT";
}
