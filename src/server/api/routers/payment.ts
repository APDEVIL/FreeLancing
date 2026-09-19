import { z } from "zod";
import { eq, and, desc, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { payment, invoice, user } from "@/server/db/schema";
import {
  requireClient,
  requireStaff,
  type UserRole,
} from "@/server/lib/permission";
import {
  generateInvoicePdf,
  generateReportPdf,
  type InvoiceData,
  type ReportData,
} from "@/server/lib/pdf";

// ─────────────────────────────────────────────
// Invoice number generator  INV-YYYY-NNNN
// ─────────────────────────────────────────────

async function nextInvoiceNumber(db: typeof import("@/server/db").db) {
  const year = new Date().getFullYear();
  const count = await db.$count(invoice);
  const seq = String(count + 1).padStart(4, "0");
  return `INV-${year}-${seq}`;
}

// ─────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────

export const paymentRouter = createTRPCRouter({
  // ── Client: initiate a payment ────────────────────────────────────────────

  create: protectedProcedure
    .input(
      z.object({
        projectId:   z.string().uuid(),
        toUserId:    z.string(),
        amount:      z.number().positive(),
        description: z.string().optional(),
        dueDate:     z.date(),
        taxPercent:  z.number().min(0).max(100).default(0),
        notes:       z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireClient(ctx.session.user.role as UserRole);

      const [created] = await ctx.db
        .insert(payment)
        .values({
          projectId:   input.projectId,
          fromUserId:  ctx.session.user.id,
          toUserId:    input.toUserId,
          amount:      String(input.amount),
          description: input.description,
        })
        .returning({ id: payment.id });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Auto-generate invoice
      const invNumber = await nextInvoiceNumber(ctx.db);
      await ctx.db.insert(invoice).values({
        paymentId:     created.id,
        invoiceNumber: invNumber,
        issuedTo:      input.toUserId,
        issuedBy:      ctx.session.user.id,
        dueDate:       input.dueDate,
        taxPercent:    String(input.taxPercent),
        notes:         input.notes,
      });

      return { paymentId: created.id, invoiceNumber: invNumber };
    }),

  // ── List payments (role-scoped) ───────────────────────────────────────────

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        status:    z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
        limit:     z.number().min(1).max(500).default(20), // ← bumped from 100 to 500
        offset:    z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const role   = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;

      const conditions = [];
      if (input.projectId) conditions.push(eq(payment.projectId, input.projectId));
      if (input.status)    conditions.push(eq(payment.status,    input.status));

      // Non-staff: only see payments they're involved in
      if (role === "client") {
        conditions.push(eq(payment.fromUserId, userId));
      } else if (role === "freelancer") {
        conditions.push(eq(payment.toUserId, userId));
      }

      return ctx.db.query.payment.findMany({
        where:   conditions.length ? and(...conditions) : undefined,
        with:    { project: true, payer: true, payee: true, invoice: true },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(payment.createdAt),
      });
    }),

  // ── Get single payment ────────────────────────────────────────────────────

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const found = await ctx.db.query.payment.findFirst({
        where: eq(payment.id, input.id),
        with:  { project: true, payer: true, payee: true, invoice: true },
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });

      const userId = ctx.session.user.id;
      const role   = ctx.session.user.role as UserRole;
      const isInvolved = found.fromUserId === userId || found.toUserId === userId;
      if (!isInvolved) requireStaff(role);

      return found;
    }),

  // ── Client: approve payment after work review ────────────────────────────

  approve: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.db.query.payment.findFirst({
        where: eq(payment.id, input.id),
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });
      if (found.fromUserId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      if (found.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment is not in pending state." });
      }

      await ctx.db
        .update(payment)
        .set({ status: "completed", paidAt: new Date(), updatedAt: new Date() })
        .where(eq(payment.id, input.id));

      return { success: true };
    }),

  // ── Admin: update payment status manually ────────────────────────────────

  updateStatus: protectedProcedure
    .input(
      z.object({
        id:     z.string().uuid(),
        status: z.enum(["pending", "processing", "completed", "failed", "refunded"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      requireStaff(ctx.session.user.role as UserRole);
      await ctx.db
        .update(payment)
        .set({
          status:    input.status,
          paidAt:    input.status === "completed" ? new Date() : undefined,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, input.id));
      return { success: true };
    }),

  // ── Download invoice PDF ──────────────────────────────────────────────────

  downloadInvoice: protectedProcedure
    .input(z.object({ paymentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.db.query.payment.findFirst({
        where: eq(payment.id, input.paymentId),
        with:  { project: true, payer: true, payee: true, invoice: true },
      });
      if (!found?.invoice) throw new TRPCError({ code: "NOT_FOUND" });

      const userId = ctx.session.user.id;
      const role   = ctx.session.user.role as UserRole;
      const isInvolved = found.fromUserId === userId || found.toUserId === userId;
      if (!isInvolved) requireStaff(role);

      const invoiceData: InvoiceData = {
        invoiceNumber: found.invoice.invoiceNumber,
        issuedDate:    found.invoice.createdAt,
        dueDate:       found.invoice.dueDate,
        issuedBy:      { name: found.payer.name, email: found.payer.email },
        issuedTo:      { name: found.payee.name, email: found.payee.email },
        projectTitle:  found.project.title,
        description:   found.description ?? "Project payment",
        amount:        parseFloat(found.amount),
        taxPercent:    parseFloat(found.invoice.taxPercent ?? "0"),
        notes:         found.invoice.notes ?? undefined,
      };

      const pdfBuffer = await generateInvoicePdf(invoiceData);
      return {
        pdf:      pdfBuffer.toString("base64"),
        filename: `${found.invoice.invoiceNumber}.pdf`,
      };
    }),

  // ── Download payment history report ──────────────────────────────────────

  downloadHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        status:    z.enum(["pending", "processing", "completed", "failed", "refunded"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role   = ctx.session.user.role as UserRole;
      const userId = ctx.session.user.id;

      const conditions = [];
      if (input.projectId) conditions.push(eq(payment.projectId, input.projectId));
      if (input.status)    conditions.push(eq(payment.status,    input.status));
      if (role === "client")     conditions.push(eq(payment.fromUserId, userId));
      if (role === "freelancer") conditions.push(eq(payment.toUserId,   userId));

      const payments = await ctx.db.query.payment.findMany({
        where:   conditions.length ? and(...conditions) : undefined,
        with:    { project: true, payer: true, payee: true },
        orderBy: desc(payment.createdAt),
      });

      const totalPaid = payments
        .filter((p) => p.status === "completed")
        .reduce((s, p) => s + parseFloat(p.amount), 0);

      const reportData: ReportData = {
        title:       "Payment History Report",
        generatedAt: new Date(),
        generatedBy: ctx.session.user.name,
        sections: [
          {
            heading: "Transactions",
            rows: payments.map((p) => ({
              label: `${p.project.title} — ${p.payer.name} → ${p.payee.name}`,
              value: `$${parseFloat(p.amount).toFixed(2)} · ${p.status.toUpperCase()}`,
            })),
          },
          {
            heading: "Summary",
            rows: [
              { label: "Total transactions", value: String(payments.length) },
              { label: "Total paid",         value: `$${totalPaid.toFixed(2)}` },
              { label: "Pending",            value: String(payments.filter((p) => p.status === "pending").length) },
            ],
          },
        ],
      };

      const pdfBuffer = await generateReportPdf(reportData);
      return { pdf: pdfBuffer.toString("base64"), filename: "payment-history.pdf" };
    }),
});