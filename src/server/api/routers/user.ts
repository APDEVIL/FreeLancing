import { z } from "zod";
import { eq, ilike, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { user, profile } from "@/server/db/schema";
import {
  requireAdmin,
  requireOwnerOrAdmin,
  type UserRole,
} from "@/server/lib/permission";

export const userRouter = createTRPCRouter({
  // ── Own profile ───────────────────────────────────────────────────────────

  /** Get the currently authenticated user's full profile. */
  me: protectedProcedure.query(async ({ ctx }) => {
    const found = await ctx.db.query.user.findFirst({
      where: eq(user.id, ctx.session.user.id),
      with: { profile: true },
    });
    if (!found) throw new TRPCError({ code: "NOT_FOUND" });
    return found;
  }),

  /** Create or update own profile (upsert). */
  upsertProfile: protectedProcedure
    .input(
      z.object({
        bio:          z.string().max(500).optional(),
        phone:        z.string().max(20).optional(),
        location:     z.string().max(100).optional(),
        portfolioUrl: z.string().url().optional(),
        skills:       z.array(z.string()).max(20).optional(),
        hourlyRate:   z.number().positive().optional(),
        companyName:  z.string().max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const data = {
        ...input,
        hourlyRate: input.hourlyRate !== undefined
          ? String(input.hourlyRate)
          : undefined,
      };

      const existing = await ctx.db.query.profile.findFirst({
        where: eq(profile.userId, userId),
      });

      if (existing) {
        await ctx.db
          .update(profile)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(profile.userId, userId));
      } else {
        await ctx.db.insert(profile).values({ userId, ...data });
      }

      return { success: true };
    }),

  // ✅ ADDED: Set own role immediately after signup — no admin privilege needed.
  // Called from register/page.tsx right after authClient.signUp.email() succeeds.
  setOwnRole: protectedProcedure
    .input(z.object({ role: z.enum(["freelancer", "client"]) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(user)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
      return { success: true };
    }),

  // ── Admin: user management ────────────────────────────────────────────────

  /** List all users with optional search + role filter (admin only). */
  list: protectedProcedure
    .input(
      z.object({
        role:   z.enum(["admin", "project_manager", "client", "freelancer"]).optional(),
        search: z.string().optional(),
        limit:  z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role as UserRole);

      const conditions = [];
      if (input.role)   conditions.push(eq(user.role, input.role));
      if (input.search) conditions.push(ilike(user.name, `%${input.search}%`));

      const rows = await ctx.db.query.user.findMany({
        where:   conditions.length ? and(...conditions) : undefined,
        with:    { profile: true },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(user.createdAt),
      });

      return rows;
    }),

  /** Get any user by id (admin) or own id. */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      requireOwnerOrAdmin(
        ctx.session.user.role as UserRole,
        input.id,
        ctx.session.user.id,
      );
      const found = await ctx.db.query.user.findFirst({
        where: eq(user.id, input.id),
        with:  { profile: true },
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      return found;
    }),

  /** Change a user's role (admin only). */
  setRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role:   z.enum(["admin", "project_manager", "client", "freelancer"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role as UserRole);
      await ctx.db
        .update(user)
        .set({ role: input.role, updatedAt: new Date() })
        .where(eq(user.id, input.userId));
      return { success: true };
    }),

  /** Soft-delete: disable user (admin only). */
  remove: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.session.user.role as UserRole);
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account.",
        });
      }
      await ctx.db.delete(user).where(eq(user.id, input.userId));
      return { success: true };
    }),

  /** Browse freelancers for client's freelancer-selection screen. */
  listFreelancers: protectedProcedure
    .input(
      z.object({
        search:    z.string().optional(),
        minRating: z.number().min(0).max(5).optional(),
        limit:     z.number().min(1).max(50).default(12),
        offset:    z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(user.role, "freelancer")];
      if (input.search) conditions.push(ilike(user.name, `%${input.search}%`));

      const rows = await ctx.db.query.user.findMany({
        where:   and(...conditions),
        with:    { profile: true },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(user.createdAt),
      });

      if (input.minRating !== undefined) {
        return rows.filter(
          (r) => r.profile && parseFloat(r.profile.rating ?? "0") >= input.minRating!,
        );
      }
      return rows;
    }),
});