import { TRPCError } from "@trpc/server";

export type UserRole = "admin" | "project_manager" | "client" | "freelancer";

// ─────────────────────────────────────────────
// Role hierarchy helpers
// ─────────────────────────────────────────────

export const isAdmin = (role: UserRole) => role === "admin";

export const isProjectManager = (role: UserRole) =>
  role === "project_manager" || role === "admin";

export const isClient = (role: UserRole) =>
  role === "client" || role === "admin";

export const isFreelancer = (role: UserRole) =>
  role === "freelancer" || role === "admin";

export const isStaff = (role: UserRole) =>
  role === "admin" || role === "project_manager";

// ─────────────────────────────────────────────
// Guard helpers — throw TRPC errors directly
// used inside router procedures
// ─────────────────────────────────────────────

export function requireAdmin(role: UserRole) {
  if (!isAdmin(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
}

export function requireStaff(role: UserRole) {
  if (!isStaff(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Staff access required.",
    });
  }
}

export function requireProjectManager(role: UserRole) {
  if (!isProjectManager(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Project manager access required.",
    });
  }
}

export function requireClient(role: UserRole) {
  if (!isClient(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Client access required.",
    });
  }
}

export function requireFreelancer(role: UserRole) {
  if (!isFreelancer(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Freelancer access required.",
    });
  }
}

/**
 * Ensures the caller is either the resource owner OR has staff privileges.
 * Use for endpoints where a user can access their own data but admins/PMs can see all.
 */
export function requireOwnerOrStaff(
  role: UserRole,
  ownerId: string,
  callerId: string,
) {
  if (!isStaff(role) && ownerId !== callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to access this resource.",
    });
  }
}

/**
 * Ensures the caller is either the resource owner OR an admin.
 */
export function requireOwnerOrAdmin(
  role: UserRole,
  ownerId: string,
  callerId: string,
) {
  if (!isAdmin(role) && ownerId !== callerId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify this resource.",
    });
  }
}

// ─────────────────────────────────────────────
// Role-based data filter helper
// Returns a where-clause fragment for listing
// resources scoped to the caller's role.
// ─────────────────────────────────────────────

export type RoleFilter =
  | { type: "all" }                     // admin / PM — see everything
  | { type: "client"; userId: string }  // client — their own projects
  | { type: "freelancer"; userId: string }; // freelancer — assigned projects

export function getRoleFilter(role: UserRole, userId: string): RoleFilter {
  if (isStaff(role)) return { type: "all" };
  if (role === "client") return { type: "client", userId };
  return { type: "freelancer", userId };
}