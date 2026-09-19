import { z } from "zod";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { project, projectMember, user } from "@/server/db/schema";
import {
  requireClient,
  requireStaff,
  requireProjectManager,
  getRoleFilter,
  type UserRole,
} from "@/server/lib/permission";
import { generateReportPdf, type ReportData } from "@/server/lib/pdf";

// ─────────────────────────────────────────────
// Input schemas
// ─────────────────────────────────────────────

const createProjectInput = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().min(10),
  category:    z.enum(["web", "design", "app", "marketing", "other"]),
  priority:    z.enum(["low", "medium", "high"]).default("medium"),
  budget:      z.number().positive(),
  deadline:    z.date(),
});

const updateProjectInput = z.object({
  id:          z.string().uuid(),
  title:       z.string().min(3).max(200).optional(),
  description: z.string().min(10).optional(),
  category:    z.enum(["web", "design", "app", "marketing", "other"]).optional(),
  priority:    z.enum(["low", "medium", "high"]).optional(),
  budget:      z.number().positive().optional(),
  deadline:    z.date().optional(),
  status:      z.enum(["pending", "ongoing", "completed", "cancelled"]).optional(),
  managerId:   z.string().optional(),
});

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

export const projectRouter = createTRPCRouter({
  // ── Client: create a project ──────────────────────────────────────────────

  create: protectedProcedure
    .input(createProjectInput)
    .mutation(async ({ ctx, input }) => {
      requireClient(ctx.session.user.role as UserRole);
      const [created] = await ctx.db
        .insert(project)
        .values({ ...input, clientId: ctx.session.user.id, budget: String(input.budget) })
        .returning({ id: project.id });
      return created;
    }),

  // ── List projects scoped to caller's role ──────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        status:   z.enum(["pending", "ongoing", "completed", "cancelled"]).optional(),
        category: z.enum(["web", "design", "app", "marketing", "other"]).optional(),
        limit:    z.number().min(1).max(100).default(20),
        offset:   z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const role   = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;
      const filter = getRoleFilter(role, userId);

      const conditions = [];
      if (input.status)   conditions.push(eq(project.status,   input.status));
      if (input.category) conditions.push(eq(project.category, input.category));

      // Role-based scoping
      if (filter.type === "client") {
        conditions.push(eq(project.clientId, filter.userId));
      } else if (filter.type === "freelancer") {
        // Freelancer only sees projects they're a member of
        const memberships = await ctx.db.query.projectMember.findMany({
          where: eq(projectMember.userId, userId),
          columns: { projectId: true },
        });
        const projectIds = memberships.map((m) => m.projectId);
        if (projectIds.length === 0) return [];
        conditions.push(inArray(project.id, projectIds));
      }

      return ctx.db.query.project.findMany({
        where:   conditions.length ? and(...conditions) : undefined,
        with:    { client: true, manager: true, members: { with: { user: true } } },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(project.createdAt),
      });
    }),

  // ── Get single project ────────────────────────────────────────────────────

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const found = await ctx.db.query.project.findFirst({
        where: eq(project.id, input.id),
        with: {
          client:  true,
          manager: true,
          members: { with: { user: { with: { profile: true } } } },
          tasks:   true,
          payments: true,
        },
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      return found;
    }),

  // ── Staff / client: update project ───────────────────────────────────────

  update: protectedProcedure
    .input(updateProjectInput)
    .mutation(async ({ ctx, input }) => {
      const role = ctx.session.user.role as UserRole;
      const { id, ...data } = input;

      const existing = await ctx.db.query.project.findFirst({
        where: eq(project.id, id),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      // Client can only update their own; staff can update any
      const isOwner = existing.clientId === ctx.session.user.id;
      if (!isOwner) requireStaff(role);

      await ctx.db
        .update(project)
        .set({
          ...data,
          budget: data.budget !== undefined ? String(data.budget) : undefined,
          updatedAt: new Date(),
        })
        .where(eq(project.id, id));

      return { success: true };
    }),

  // ── PM: assign manager to project ────────────────────────────────────────

  assignManager: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), managerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      requireStaff(ctx.session.user.role as UserRole);
      await ctx.db
        .update(project)
        .set({ managerId: input.managerId, updatedAt: new Date() })
        .where(eq(project.id, input.projectId));
      return { success: true };
    }),

  // ── Client: invite a freelancer to project ────────────────────────────────

  inviteFreelancer: protectedProcedure
    .input(
      z.object({
        projectId:    z.string().uuid(),
        freelancerId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireClient(ctx.session.user.role as UserRole);

      const existing = await ctx.db.query.project.findFirst({
        where: eq(project.id, input.projectId),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      if (existing.clientId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.insert(projectMember).values({
        projectId:  input.projectId,
        userId:     input.freelancerId,
        memberRole: "freelancer",
      });
      return { success: true };
    }),

  // ── Freelancer: accept or reject project offer ────────────────────────────

  respondToOffer: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        accept:    z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const membership = await ctx.db.query.projectMember.findFirst({
        where: and(
          eq(projectMember.projectId, input.projectId),
          eq(projectMember.userId, userId),
        ),
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });

      if (input.accept) {
        await ctx.db
          .update(projectMember)
          .set({ acceptedAt: new Date() })
          .where(eq(projectMember.id, membership.id));
        // Mark project ongoing if first acceptance
        await ctx.db
          .update(project)
          .set({ status: "ongoing", updatedAt: new Date() })
          .where(and(eq(project.id, input.projectId), eq(project.status, "pending")));
      } else {
        await ctx.db
          .delete(projectMember)
          .where(eq(projectMember.id, membership.id));
      }
      return { success: true };
    }),

  // ── PM / Admin: remove member ──────────────────────────────────────────────

  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireProjectManager(ctx.session.user.role as UserRole);
      await ctx.db
        .delete(projectMember)
        .where(eq(projectMember.id, input.memberId));
      return { success: true };
    }),

  // ── PM / Admin: generate project summary PDF ─────────────────────────────

  downloadSummary: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireStaff(ctx.session.user.role as UserRole);

      const found = await ctx.db.query.project.findFirst({
        where: eq(project.id, input.projectId),
        with:  { client: true, manager: true, tasks: true, payments: true },
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });

      const completedTasks = found.tasks.filter((t) => t.status === "approved").length;
      const totalPaid = found.payments
        .filter((p) => p.status === "completed")
        .reduce((s, p) => s + parseFloat(p.amount), 0);

      const reportData: ReportData = {
        title:       "Project Summary Report",
        subtitle:    found.title,
        generatedAt: new Date(),
        generatedBy: ctx.session.user.name,
        sections: [
          {
            heading: "Project Details",
            rows: [
              { label: "Title",    value: found.title },
              { label: "Category", value: found.category },
              { label: "Status",   value: found.status },
              { label: "Priority", value: found.priority },
              { label: "Budget",   value: `$${found.budget}` },
              { label: "Deadline", value: found.deadline.toLocaleDateString() },
              { label: "Client",   value: found.client.name },
              { label: "Manager",  value: found.manager?.name ?? "Unassigned" },
            ],
          },
          {
            heading: "Progress",
            rows: [
              { label: "Total Tasks",     value: String(found.tasks.length) },
              { label: "Completed Tasks", value: String(completedTasks) },
              { label: "Total Paid",      value: `$${totalPaid.toFixed(2)}` },
            ],
          },
        ],
      };

      const pdfBuffer = await generateReportPdf(reportData);
      return { pdf: pdfBuffer.toString("base64"), filename: `project-${found.id}-summary.pdf` };
    }),
});