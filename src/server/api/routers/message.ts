import { z } from "zod";
import { eq, and, desc, inArray, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  conversation,
  conversationParticipant,
  message,
} from "@/server/db/schema";

export const messageRouter = createTRPCRouter({
  // ── Create a conversation (project thread or direct) ──────────────────────

  createConversation: protectedProcedure
    .input(
      z.object({
        title:          z.string().max(100).optional(),
        projectId:      z.string().uuid().optional(),
        participantIds: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(conversation)
        .values({ title: input.title, projectId: input.projectId })
        .returning({ id: conversation.id });

      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Add creator + all provided participants
      const allParticipants = Array.from(
        new Set([ctx.session.user.id, ...input.participantIds]),
      );

      await ctx.db.insert(conversationParticipant).values(
        allParticipants.map((userId) => ({
          conversationId: created.id,
          userId,
        })),
      );

      return { conversationId: created.id };
    }),

  // ── List conversations the caller is part of ──────────────────────────────

  listConversations: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid().optional(),
        limit:     z.number().min(1).max(50).default(20),
        offset:    z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Get conversation IDs the user participates in
      const memberships = await ctx.db.query.conversationParticipant.findMany({
        where: eq(conversationParticipant.userId, userId),
        columns: { conversationId: true },
      });

      const convIds = memberships.map((m) => m.conversationId);
      if (convIds.length === 0) return [];

      const conditions = [inArray(conversation.id, convIds)];
      if (input.projectId) conditions.push(eq(conversation.projectId, input.projectId));

      return ctx.db.query.conversation.findMany({
        where:   and(...conditions),
        with:    { participants: { with: { user: true } }, messages: { limit: 1, orderBy: desc(message.createdAt) } },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(conversation.createdAt),
      });
    }),

  // ── Get messages in a conversation ───────────────────────────────────────

  getMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        filter:         z.enum(["all", "unread", "important"]).default("all"),
        limit:          z.number().min(1).max(100).default(50),
        offset:         z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify caller is a participant
      const membership = await ctx.db.query.conversationParticipant.findFirst({
        where: and(
          eq(conversationParticipant.conversationId, input.conversationId),
          eq(conversationParticipant.userId, ctx.session.user.id),
        ),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const conditions = [eq(message.conversationId, input.conversationId)];
      if (input.filter === "unread")    conditions.push(isNull(message.readAt));
      if (input.filter === "important") conditions.push(eq(message.isImportant, true));

      return ctx.db.query.message.findMany({
        where:   and(...conditions),
        with:    { sender: true },
        limit:   input.limit,
        offset:  input.offset,
        orderBy: desc(message.createdAt),
      });
    }),

  // ── Send a message ────────────────────────────────────────────────────────

  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        body:           z.string().min(1).max(5000),
        isImportant:    z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify caller is a participant
      const membership = await ctx.db.query.conversationParticipant.findFirst({
        where: and(
          eq(conversationParticipant.conversationId, input.conversationId),
          eq(conversationParticipant.userId, ctx.session.user.id),
        ),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      const [sent] = await ctx.db
        .insert(message)
        .values({
          conversationId: input.conversationId,
          senderId:       ctx.session.user.id,
          body:           input.body,
          isImportant:    input.isImportant,
        })
        .returning({ id: message.id });

      return sent;
    }),

  // ── Mark message as read ──────────────────────────────────────────────────

  markRead: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(message)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(message.id, input.messageId),
            // Only the receiver marks as read — not the sender
          ),
        );
      return { success: true };
    }),

  // ── Toggle important flag ─────────────────────────────────────────────────

  toggleImportant: protectedProcedure
    .input(z.object({ messageId: z.string().uuid(), important: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const found = await ctx.db.query.message.findFirst({
        where: eq(message.id, input.messageId),
      });
      if (!found) throw new TRPCError({ code: "NOT_FOUND" });

      // Verify participant access
      const membership = await ctx.db.query.conversationParticipant.findFirst({
        where: and(
          eq(conversationParticipant.conversationId, found.conversationId),
          eq(conversationParticipant.userId, ctx.session.user.id),
        ),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db
        .update(message)
        .set({ isImportant: input.important })
        .where(eq(message.id, input.messageId));

      return { success: true };
    }),

  // ── Add participant to existing conversation ──────────────────────────────

  addParticipant: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        userId:         z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Caller must be a participant
      const membership = await ctx.db.query.conversationParticipant.findFirst({
        where: and(
          eq(conversationParticipant.conversationId, input.conversationId),
          eq(conversationParticipant.userId, ctx.session.user.id),
        ),
      });
      if (!membership) throw new TRPCError({ code: "FORBIDDEN" });

      await ctx.db
        .insert(conversationParticipant)
        .values({ conversationId: input.conversationId, userId: input.userId })
        .onConflictDoNothing();

      return { success: true };
    }),
});