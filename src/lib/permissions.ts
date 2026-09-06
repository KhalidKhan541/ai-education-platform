export type Role = "STUDENT" | "INSTRUCTOR" | "TA" | "ADMIN";

export type Permission =
  | "course:create"
  | "course:read"
  | "course:update"
  | "course:delete"
  | "course:publish"
  | "enrollment:enroll"
  | "enrollment:unenroll"
  | "enrollment:view"
  | "lesson:create"
  | "lesson:update"
  | "lesson:delete"
  | "lesson:view"
  | "assignment:create"
  | "assignment:update"
  | "assignment:delete"
  | "assignment:submit"
  | "assignment:grade"
  | "quiz:create"
  | "quiz:update"
  | "quiz:delete"
  | "quiz:attempt"
  | "quiz:grade"
  | "certificate:issue"
  | "certificate:verify"
  | "certificate:revoke"
  | "user:read"
  | "user:update"
  | "user:delete"
  | "user:manage-roles"
  | "analytics:view"
  | "ai:use"
  | "ai:configure"
  | "discussion:create"
  | "discussion:moderate";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: [
    "course:read",
    "enrollment:enroll",
    "enrollment:unenroll",
    "enrollment:view",
    "lesson:view",
    "assignment:submit",
    "quiz:attempt",
    "certificate:verify",
    "user:read",
    "user:update",
    "ai:use",
    "discussion:create",
  ],
  TA: [
    "course:read",
    "course:update",
    "enrollment:view",
    "lesson:view",
    "lesson:create",
    "lesson:update",
    "assignment:create",
    "assignment:update",
    "assignment:grade",
    "quiz:create",
    "quiz:update",
    "quiz:grade",
    "certificate:issue",
    "user:read",
    "analytics:view",
    "ai:use",
    "discussion:create",
    "discussion:moderate",
  ],
  INSTRUCTOR: [
    "course:create",
    "course:read",
    "course:update",
    "course:publish",
    "enrollment:view",
    "lesson:create",
    "lesson:update",
    "lesson:delete",
    "assignment:create",
    "assignment:update",
    "assignment:delete",
    "assignment:grade",
    "quiz:create",
    "quiz:update",
    "quiz:delete",
    "quiz:grade",
    "certificate:issue",
    "certificate:verify",
    "user:read",
    "analytics:view",
    "ai:use",
    "ai:configure",
    "discussion:create",
    "discussion:moderate",
  ],
  ADMIN: [
    "course:create",
    "course:read",
    "course:update",
    "course:delete",
    "course:publish",
    "enrollment:enroll",
    "enrollment:unenroll",
    "enrollment:view",
    "lesson:create",
    "lesson:update",
    "lesson:delete",
    "lesson:view",
    "assignment:create",
    "assignment:update",
    "assignment:delete",
    "assignment:submit",
    "assignment:grade",
    "quiz:create",
    "quiz:update",
    "quiz:delete",
    "quiz:attempt",
    "quiz:grade",
    "certificate:issue",
    "certificate:verify",
    "certificate:revoke",
    "user:read",
    "user:update",
    "user:delete",
    "user:manage-roles",
    "analytics:view",
    "ai:use",
    "ai:configure",
    "discussion:create",
    "discussion:moderate",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function canAccessCourse(role: Role, userId: string, instructorId: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "INSTRUCTOR" && userId === instructorId) return true;
  return false;
}

export function canGradeSubmissions(role: Role): boolean {
  return hasAnyPermission(role, ["assignment:grade", "quiz:grade"]);
}

export function canManageCourse(role: Role): boolean {
  return hasAnyPermission(role, ["course:create", "course:update", "course:delete"]);
}
