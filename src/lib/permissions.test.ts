import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getRolePermissions,
  canAccessCourse,
  canGradeSubmissions,
  canManageCourse,
} from "@/lib/permissions";

describe("Permissions", () => {
  describe("hasPermission", () => {
    it("should grant STUDENT course read permission", () => {
      expect(hasPermission("STUDENT", "course:read")).toBe(true);
    });

    it("should deny STUDENT course create permission", () => {
      expect(hasPermission("STUDENT", "course:create")).toBe(false);
    });

    it("should grant INSTRUCTOR course create permission", () => {
      expect(hasPermission("INSTRUCTOR", "course:create")).toBe(true);
    });

    it("should grant INSTRUCTOR assignment grade permission", () => {
      expect(hasPermission("INSTRUCTOR", "assignment:grade")).toBe(true);
    });

    it("should grant TA assignment grade permission", () => {
      expect(hasPermission("TA", "assignment:grade")).toBe(true);
    });

    it("should deny TA course delete permission", () => {
      expect(hasPermission("TA", "course:delete")).toBe(false);
    });

    it("should grant ADMIN all permissions", () => {
      const adminPermissions = getRolePermissions("ADMIN");
      adminPermissions.forEach((perm) => {
        expect(hasPermission("ADMIN", perm)).toBe(true);
      });
    });

    it("should grant INSTRUCTOR course publish permission", () => {
      expect(hasPermission("INSTRUCTOR", "course:publish")).toBe(true);
    });

    it("should deny STUDENT quiz grade permission", () => {
      expect(hasPermission("STUDENT", "quiz:grade")).toBe(false);
    });

    it("should grant STUDENT quiz attempt permission", () => {
      expect(hasPermission("STUDENT", "quiz:attempt")).toBe(true);
    });

    it("should grant STUDENT ai use permission", () => {
      expect(hasPermission("STUDENT", "ai:use")).toBe(true);
    });

    it("should deny STUDENT ai configure permission", () => {
      expect(hasPermission("STUDENT", "ai:configure")).toBe(false);
    });

    it("should grant INSTRUCTOR ai configure permission", () => {
      expect(hasPermission("INSTRUCTOR", "ai:configure")).toBe(true);
    });
  });

  describe("hasAnyPermission", () => {
    it("should return true if user has at least one permission", () => {
      expect(hasAnyPermission("STUDENT", ["course:read", "course:create"])).toBe(true);
    });

    it("should return false if user has none of the permissions", () => {
      expect(hasAnyPermission("STUDENT", ["course:create", "course:delete"])).toBe(false);
    });

    it("should return true for ADMIN with any permissions", () => {
      expect(hasAnyPermission("ADMIN", ["course:delete", "user:delete"])).toBe(true);
    });
  });

  describe("hasAllPermissions", () => {
    it("should return true if user has all permissions", () => {
      expect(
        hasAllPermissions("INSTRUCTOR", ["course:create", "course:read", "course:update"])
      ).toBe(true);
    });

    it("should return false if user is missing any permission", () => {
      expect(
        hasAllPermissions("INSTRUCTOR", ["course:create", "course:delete"])
      ).toBe(false);
    });
  });

  describe("getRolePermissions", () => {
    it("should return correct permissions for STUDENT", () => {
      const perms = getRolePermissions("STUDENT");
      expect(perms).toContain("course:read");
      expect(perms).toContain("enrollment:enroll");
      expect(perms).not.toContain("course:create");
      expect(perms).not.toContain("course:delete");
    });

    it("should return correct permissions for INSTRUCTOR", () => {
      const perms = getRolePermissions("INSTRUCTOR");
      expect(perms).toContain("course:create");
      expect(perms).toContain("course:publish");
      expect(perms).toContain("assignment:grade");
      expect(perms).not.toContain("user:delete");
    });

    it("should return correct permissions for TA", () => {
      const perms = getRolePermissions("TA");
      expect(perms).toContain("assignment:grade");
      expect(perms).toContain("lesson:create");
      expect(perms).not.toContain("course:delete");
    });

    it("should return all permissions for ADMIN", () => {
      const perms = getRolePermissions("ADMIN");
      expect(perms).toContain("course:delete");
      expect(perms).toContain("user:delete");
      expect(perms).toContain("user:manage-roles");
      expect(perms).toContain("certificate:revoke");
    });
  });

  describe("canAccessCourse", () => {
    it("should allow ADMIN to access any course", () => {
      expect(canAccessCourse("ADMIN", "admin-id", "instructor-id")).toBe(true);
    });

    it("should allow INSTRUCTOR to access own course", () => {
      expect(canAccessCourse("INSTRUCTOR", "inst-id", "inst-id")).toBe(true);
    });

    it("should deny INSTRUCTOR to access other course", () => {
      expect(canAccessCourse("INSTRUCTOR", "inst-1", "inst-2")).toBe(false);
    });

    it("should deny STUDENT course management access", () => {
      expect(canAccessCourse("STUDENT", "student-id", "instructor-id")).toBe(false);
    });
  });

  describe("canGradeSubmissions", () => {
    it("should return true for INSTRUCTOR", () => {
      expect(canGradeSubmissions("INSTRUCTOR")).toBe(true);
    });

    it("should return true for TA", () => {
      expect(canGradeSubmissions("TA")).toBe(true);
    });

    it("should return true for ADMIN", () => {
      expect(canGradeSubmissions("ADMIN")).toBe(true);
    });

    it("should return false for STUDENT", () => {
      expect(canGradeSubmissions("STUDENT")).toBe(false);
    });
  });

  describe("canManageCourse", () => {
    it("should return true for INSTRUCTOR", () => {
      expect(canManageCourse("INSTRUCTOR")).toBe(true);
    });

    it("should return true for ADMIN", () => {
      expect(canManageCourse("ADMIN")).toBe(true);
    });

    it("should return false for STUDENT", () => {
      expect(canManageCourse("STUDENT")).toBe(false);
    });

    it("should return false for TA", () => {
      expect(canManageCourse("TA")).toBe(false);
    });
  });
});
