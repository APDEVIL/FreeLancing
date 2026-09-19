import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { task, taskSubmission, projectMember } from "@/server/db/schema";
import {
  requireProjectManager,
  requireStaff,
  type UserRole,
} from "@/server/lib/permission";
import { generateReportPdf, type ReportData } from "@/server/lib/pdf";

export const taskRouter = createTRPCRouter({
  // ── PM: create and assign task ────────────────────────────────────────────

  create: protectedProcedure
    .input(
      z.object({
        projectId:   z.string().uuid(),
        assignedTo:  z.string(),
        title:       z.string().min(3).max(200),
        description: z.string().optional(),
        priority:    z.enum(["low", "medium", "high"]).default("medium"),
        deadline:    z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireProjectManager(ctx.session.user.role as UserRole);

      // Verify the assignee is a member of the project
      const membership = await ctx.db.query.projectMember.findFirst({
        where: and(
          eq(projectMember.projectId, input.projectId),
          eq(projectMember.userId, input.assignedTo),
        ),
      });
      if (!membership) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assignee is not a member of this project.",
        });
      }

      const [created] = await ctx.db
        .insert(task)
        .values({ ...input, createdBy: ctx.session.user.id })
        .returning({ id: task.id });

      return created;
    }),

  // ── List tasks (role-scoped) ──────────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        status:    z.enum(["pending", "in_progress", "submitted", "approved", "rejected"]).optional(),
        priority:  z.enum(["low", "medium", "high"]).optional(),
        limit:     z.number().min(1).max(100).default(20),
        offset:    z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const role   = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;

      const conditions = [];
      if (input.projectId) conditions.push(eq(task.projectId, input.projectId));
      if (input.status)    conditions.push(eq(task.status,    input.status));
      if (input.priority)  conditions.push(eq(task.priority,  input.priority));

      // Freelancer only sees their own tasks
      if (role === "freelancer") conditions.push(eq(task.assignedTo, userId));
      // Client sees tasks through their projects — handled at project level

      return ctx.db.query.task.findMany({
        where:   conditions.length ? and(...conditions) : undefined,
        with:    { project: true, assignee: true, submissions: true },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(task.deadline),
      });
    }),

  // ── Get single task ───────────────────────────────────────────────────────

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const found = await ctx.db.query.task.findFirst({
        where: eq(task.id, input.id),
        with:  { project: true, assignee: true, creator: true, submissions: { with: { submitter: true } } },
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      return found;
    }),

  // ── PM: update task ───────────────────────────────────────────────────────

  update: protectedProcedure
    .input(
      z.object({
        id:          z.string().uuid(),
        title:       z.string().min(3).max(200).optional(),
        description: z.string().optional(),
        priority:    z.enum(["low", "medium", "high"]).optional(),
        deadline:    z.date().optional(),
        assignedTo:  z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireProjectManager(ctx.session.user.role as UserRole);
      const { id, ...data } = input;
      await ctx.db
        .update(task)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(task.id, id));
      return { success: true };
    }),

  // ── Freelancer: update own task status ───────────────────────────────────

  updateStatus: protectedProcedure
    .input(
      z.object({
        id:     z.string().uuid(),
        status: z.enum(["in_progress", "submitted"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.db.query.task.findFirst({
        where: eq(task.id, input.id),
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.assignedTo !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await ctx.db
        .update(task)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(task.id, input.id));
      return { success: true };
    }),

  // ── Freelancer: submit completed work ────────────────────────────────────

  submit: protectedProcedure
    .input(
      z.object({
        taskId:   z.string().uuid(),
        notes:    z.string().optional(),
        fileUrls: z.array(z.string().url()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.db.query.task.findFirst({
        where: eq(task.id, input.taskId),
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.assignedTo !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await ctx.db.insert(taskSubmission).values({
        taskId:      input.taskId,
        submittedBy: ctx.session.user.id,
        notes:       input.notes,
        fileUrls:    input.fileUrls,
      });

      // Move task to submitted
      await ctx.db
        .update(task)
        .set({ status: "submitted", updatedAt: new Date() })
        .where(eq(task.id, input.taskId));

      return { success: true };
    }),

  // ── PM / Client: review submission ───────────────────────────────────────

  review: protectedProcedure
    .input(
      z.object({
        submissionId: z.string().uuid(),
        taskId:       z.string().uuid(),
        approve:      z.boolean(),
        reviewNotes:  z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireProjectManager(ctx.session.user.role as UserRole);

      await ctx.db
        .update(taskSubmission)
        .set({ reviewNotes: input.reviewNotes })
        .where(eq(taskSubmission.id, input.submissionId));

      const newStatus = input.approve ? "approved" : "rejected";
      await ctx.db
        .update(task)
        .set({
          status:      newStatus,
          completedAt: input.approve ? new Date() : null,
          updatedAt:   new Date(),
        })
        .where(eq(task.id, input.taskId));

      return { success: true };
    }),

  // ── Download task submission report (PM / Admin) ──────────────────────────

  downloadReport: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      requireStaff(ctx.session.user.role as UserRole);

      const tasks = await ctx.db.query.task.findMany({
        where: eq(task.projectId, input.projectId),
        with:  { assignee: true, submissions: true },
        orderBy: desc(task.deadline),
      });

      const reportData: ReportData = {
        title:       "Task Assignment Report",
        generatedAt: new Date(),
        generatedBy: ctx.session.user.name,
        sections: [
          {
            heading: "Tasks",
            rows: tasks.map((t) => ({
              label: t.title,
              value: `${t.status.toUpperCase()} · ${t.assignee.name}`,
            })),
          },
          {
            heading: "Summary",
            rows: [
              { label: "Total",     value: String(tasks.length) },
              { label: "Approved",  value: String(tasks.filter((t) => t.status === "approved").length) },
              { label: "Pending",   value: String(tasks.filter((t) => t.status === "pending").length) },
              { label: "Submitted", value: String(tasks.filter((t) => t.status === "submitted").length) },
            ],
          },
        ],
      };

      const pdfBuffer = await generateReportPdf(reportData);
      return { pdf: pdfBuffer.toString("base64"), filename: `tasks-${input.projectId}.pdf` };
    }),
});