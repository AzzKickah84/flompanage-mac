import type { AdminUser, AdminUserProfile, AdminUserRow, Role } from "../api/types";

export function canManageUser(me: AdminUser | null, targetRole: Role): boolean {
  if (!me) return false;
  if (me.role === "SUPER_ADMIN") return targetRole !== "SUPER_ADMIN";
  if (me.role === "ADMIN" || me.role === "MODERATOR") {
    return targetRole !== "SUPER_ADMIN" && targetRole !== "ADMIN";
  }
  return false;
}

export function canDeleteUser(me: AdminUser | null, targetId: string, targetRole: Role): boolean {
  if (!me || me.id === targetId) return false;
  if (me.role === "SUPER_ADMIN") return targetRole !== "SUPER_ADMIN";
  if (me.role === "ADMIN") return targetRole !== "SUPER_ADMIN" && targetRole !== "ADMIN";
  return false;
}

export function canChangeRole(me: AdminUser | null, target: Pick<AdminUserRow, "id" | "role">): boolean {
  if (!me || target.id === me.id) return false;
  if (target.role === "SUPER_ADMIN") return false;
  if (target.role === "ADMIN") return me.role === "SUPER_ADMIN" || me.role === "ADMIN";
  return me.role === "ADMIN" || me.role === "SUPER_ADMIN" || me.role === "MODERATOR";
}

export function canViewSensitiveProfile(user: AdminUserProfile): boolean {
  return !user.limitedProfile;
}

export function roleOptionsFor(me: AdminUser | null, targetRole: Role): Role[] {
  if (me?.role === "SUPER_ADMIN") {
    if (targetRole === "SUPER_ADMIN") return ["SUPER_ADMIN"];
    return ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"];
  }
  if (me?.role === "ADMIN" || me?.role === "MODERATOR") return ["USER", "MODERATOR"];
  return [];
}

export function roleColor(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "var(--accent)";
    case "ADMIN":
      return "var(--warning)";
    case "MODERATOR":
      return "var(--success)";
    default:
      return "var(--muted)";
  }
}
