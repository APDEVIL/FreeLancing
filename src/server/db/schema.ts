import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

export const roleEnum = pgEnum("role", [
  "admin",
  "project_manager",
  "client",
  "freelancer",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "pending",
  "ongoing",
  "completed",
  "cancelled",
]);

export const projectCategoryEnum = pgEnum("project_category", [
  "web",
  "design",
  "app",
  "marketing",
  "other",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high"]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "submitted",
  "approved",
  "rejected",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "completed",
  "failed",
  "refunded",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "manager",
  "freelancer",
  "observer",
]);

// ─────────────────────────────────────────────
// BETTER-AUTH REQUIRED TABLES
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// PATCH: replace your existing `user` table with this
// Adds the 3 columns required by better-auth admin() plugin
// ─────────────────────────────────────────────

export const user = pgTable("user", {
  id:            text("id").primaryKey(),
  name:          text("name").notNull(),
  email:         text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image:         text("image"),
  role:          roleEnum("role").notNull().default("freelancer"),

  // ── Required by better-auth admin() plugin ──
  banned:        boolean("banned").default(false),
  banReason:     text("ban_reason"),
  banExpires:    timestamp("ban_expires"),
  // ────────────────────────────────────────────

  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// USER PROFILES  (extends better-auth user)
// ─────────────────────────────────────────────

export const profile = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  bio: text("bio"),
  phone: text("phone"),
  location: text("location"),
  portfolioUrl: text("portfolio_url"),
  skills: text("skills").array(),          // freelancer skill tags
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  companyName: text("company_name"),        // client field
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  totalProjects: integer("total_projects").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PROJECTS
// ─────────────────────────────────────────────

export const project = pgTable(
  "project",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: projectCategoryEnum("category").notNull().default("other"),
    status: projectStatusEnum("status").notNull().default("pending"),
    priority: priorityEnum("priority").notNull().default("medium"),
    budget: decimal("budget", { precision: 12, scale: 2 }).notNull(),
    deadline: timestamp("deadline").notNull(),
    clientId: text("client_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    managerId: text("manager_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("project_client_idx").on(t.clientId),
    index("project_manager_idx").on(t.managerId),
    index("project_status_idx").on(t.status),
  ],
);

// Freelancers assigned to a project
export const projectMember = pgTable(
  "project_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    memberRole: memberRoleEnum("member_role").notNull().default("freelancer"),
    acceptedAt: timestamp("accepted_at"),   // null = offer pending
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("pm_project_idx").on(t.projectId),
    index("pm_user_idx").on(t.userId),
  ],
);

// ─────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────

export const task = pgTable(
  "task",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    assignedTo: text("assigned_to")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("pending"),
    priority: priorityEnum("priority").notNull().default("medium"),
    deadline: timestamp("deadline").notNull(),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("task_project_idx").on(t.projectId),
    index("task_assigned_idx").on(t.assignedTo),
    index("task_status_idx").on(t.status),
  ],
);

// Work submitted by freelancer for a task
export const taskSubmission = pgTable("task_submission", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskId: uuid("task_id")
    .notNull()
    .references(() => task.id, { onDelete: "cascade" }),
  submittedBy: text("submitted_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  notes: text("notes"),
  fileUrls: text("file_urls").array(),     // uploadthing URLs if added later
  reviewNotes: text("review_notes"),       // manager feedback on review
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────

export const payment = pgTable(
  "payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "restrict" }),
    fromUserId: text("from_user_id")        // client paying
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    toUserId: text("to_user_id")            // freelancer receiving
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    description: text("description"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("payment_project_idx").on(t.projectId),
    index("payment_from_idx").on(t.fromUserId),
    index("payment_to_idx").on(t.toUserId),
    index("payment_status_idx").on(t.status),
  ],
);

export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id")
    .notNull()
    .unique()
    .references(() => payment.id, { onDelete: "cascade" }),
  invoiceNumber: text("invoice_number").notNull().unique(),  // e.g. INV-2024-0001
  issuedTo: text("issued_to")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  issuedBy: text("issued_by")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  dueDate: timestamp("due_date").notNull(),
  taxPercent: decimal("tax_percent", { precision: 5, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────

export const conversation = pgTable(
  "conversation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    title: text("title"),                  // optional thread title
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("conv_project_idx").on(t.projectId)],
);

export const conversationParticipant = pgTable("conversation_participant", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const message = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    isImportant: boolean("is_important").notNull().default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("msg_conv_idx").on(t.conversationId),
    index("msg_sender_idx").on(t.senderId),
  ],
);

// ─────────────────────────────────────────────
// RELATIONS
// ─────────────────────────────────────────────

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profile, { fields: [user.id], references: [profile.userId] }),
  sessions: many(session),
  accounts: many(account),
  clientProjects: many(project, { relationName: "clientProjects" }),
  managedProjects: many(project, { relationName: "managedProjects" }),
  projectMemberships: many(projectMember),
  assignedTasks: many(task, { relationName: "assignedTasks" }),
  createdTasks: many(task, { relationName: "createdTasks" }),
  taskSubmissions: many(taskSubmission),
  outgoingPayments: many(payment, { relationName: "outgoingPayments" }),
  incomingPayments: many(payment, { relationName: "incomingPayments" }),
  sentMessages: many(message),
  conversationParticipants: many(conversationParticipant),
}));

export const profileRelations = relations(profile, ({ one }) => ({
  user: one(user, { fields: [profile.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  client: one(user, {
    fields: [project.clientId],
    references: [user.id],
    relationName: "clientProjects",
  }),
  manager: one(user, {
    fields: [project.managerId],
    references: [user.id],
    relationName: "managedProjects",
  }),
  members: many(projectMember),
  tasks: many(task),
  payments: many(payment),
  conversations: many(conversation),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
  user: one(user, { fields: [projectMember.userId], references: [user.id] }),
}));

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, { fields: [task.projectId], references: [project.id] }),
  assignee: one(user, {
    fields: [task.assignedTo],
    references: [user.id],
    relationName: "assignedTasks",
  }),
  creator: one(user, {
    fields: [task.createdBy],
    references: [user.id],
    relationName: "createdTasks",
  }),
  submissions: many(taskSubmission),
}));

export const taskSubmissionRelations = relations(taskSubmission, ({ one }) => ({
  task: one(task, { fields: [taskSubmission.taskId], references: [task.id] }),
  submitter: one(user, {
    fields: [taskSubmission.submittedBy],
    references: [user.id],
  }),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  project: one(project, {
    fields: [payment.projectId],
    references: [project.id],
  }),
  payer: one(user, {
    fields: [payment.fromUserId],
    references: [user.id],
    relationName: "outgoingPayments",
  }),
  payee: one(user, {
    fields: [payment.toUserId],
    references: [user.id],
    relationName: "incomingPayments",
  }),
  invoice: one(invoice, {
    fields: [payment.id],
    references: [invoice.paymentId],
  }),
}));

export const invoiceRelations = relations(invoice, ({ one }) => ({
  payment: one(payment, {
    fields: [invoice.paymentId],
    references: [payment.id],
  }),
  issuedToUser: one(user, {
    fields: [invoice.issuedTo],
    references: [user.id],
  }),
  issuedByUser: one(user, {
    fields: [invoice.issuedBy],
    references: [user.id],
  }),
}));

export const conversationRelations = relations(
  conversation,
  ({ one, many }) => ({
    project: one(project, {
      fields: [conversation.projectId],
      references: [project.id],
    }),
    participants: many(conversationParticipant),
    messages: many(message),
  }),
);

export const conversationParticipantRelations = relations(
  conversationParticipant,
  ({ one }) => ({
    conversation: one(conversation, {
      fields: [conversationParticipant.conversationId],
      references: [conversation.id],
    }),
    user: one(user, {
      fields: [conversationParticipant.userId],
      references: [user.id],
    }),
  }),
);

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
}));