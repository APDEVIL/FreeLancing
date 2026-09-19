"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";

import { api }         from "@/trpc/react";
import { useSession }  from "@/hooks/use-session";
import { formatRelative, cn } from "@/lib/utils";

import { PageHeader }  from "@/components/layout/page-header";
import { FilterTabs }  from "@/components/shared/filter-tabs";
import { UserAvatar }  from "@/components/shared/avatar";
import { MessageForm } from "@/components/form/message-form";
import { Button }      from "@/components/ui/button";
import { Skeleton }    from "@/components/ui/skeleton";

// ─────────────────────────────────────────────
// Message bubble
// ─────────────────────────────────────────────

function MessageBubble({
  body,
  senderName,
  senderImage,
  isImportant,
  isOwn,
  time,
  onToggleImportant,
}: {
  body:               string;
  senderName:         string;
  senderImage:        string | null;
  isImportant:        boolean;
  isOwn:              boolean;
  time:               Date | string;
  onToggleImportant?: () => void;
}) {
  return (
    <div className={cn("flex items-end gap-2.5 group", isOwn && "flex-row-reverse")}>
      {/* Avatar */}
      <UserAvatar name={senderName} image={senderImage} size="sm" className="shrink-0 mb-1" />

      <div className={cn("flex flex-col gap-1 max-w-[70%]", isOwn && "items-end")}>
        {/* Name + time */}
        <div className={cn("flex items-center gap-2 px-1", isOwn && "flex-row-reverse")}>
          <span
            className="text-[11px] font-semibold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {isOwn ? "You" : senderName}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {formatRelative(time)}
          </span>
        </div>

        {/* Bubble */}
        <div
          className={cn(
            "relative rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isOwn
              ? "rounded-br-sm"
              : "rounded-bl-sm",
          )}
          style={{
            background: isOwn
              ? "hsl(var(--primary))"
              : "hsl(var(--card))",
            color: isOwn
              ? "hsl(var(--primary-foreground))"
              : "hsl(var(--foreground))",
            border: isOwn ? "none" : "1px solid hsl(var(--border))",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {body}

          {/* Important star */}
          {isImportant && (
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: "hsl(43 96% 90%)" }}
            >
              <Star className="w-2.5 h-2.5" style={{ color: "hsl(32 95% 38%)" }} fill="currentColor" />
            </span>
          )}
        </div>

        {/* Toggle important — shown on hover */}
        {onToggleImportant && (
          <button
            type="button"
            onClick={onToggleImportant}
            className={cn(
              "opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1",
              isImportant
                ? "text-amber-600"
                : "text-muted-foreground",
            )}
            style={{
              background: isImportant ? "hsl(43 96% 90%)" : "hsl(var(--secondary))",
            }}
          >
            <Star className="w-2.5 h-2.5" fill={isImportant ? "currentColor" : "none"} />
            {isImportant ? "Unmark" : "Mark important"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

type FilterValue = "all" | "unread" | "important";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }      = use(params);
  const { user }    = useSession();
  const utils       = api.useUtils();
  const bottomRef   = useRef<HTMLDivElement>(null);

  const [filter, setFilter] = useState<FilterValue>("all");

  const query = api.message.getMessages.useQuery({
    conversationId: id,
    filter,
    limit:          100,
    offset:         0,
  });

  const messages = query.data ?? [];

  // Mark read on mount
  const markReadMutation = api.message.markRead.useMutation();

  // Toggle important
  const toggleMutation = api.message.toggleImportant.useMutation({
    onSuccess: () => void utils.message.getMessages.invalidate({ conversationId: id }),
    onError:   (e) => toast.error(e.message),
  });

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark all unread messages as read on mount
  useEffect(() => {
    messages
      .filter((m) => !m.readAt && m.senderId !== user?.id)
      .forEach((m) => markReadMutation.mutate({ messageId: m.id }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filterTabs = [
    { value: "all",       label: "All"       },
    { value: "unread",    label: "Unread"    },
    { value: "important", label: "Important" },
  ];

  return (
    <div
      className="flex flex-col stagger-children"
      style={{ height: "calc(100dvh - var(--topbar-height) - 48px)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard/messages">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <PageHeader
          title="Conversation"
          subtitle={`${messages.length} messages`}
          actions={
            <FilterTabs
              tabs={filterTabs}
              value={filter}
              onChange={(v) => setFilter(v as FilterValue)}
            />
          }
        />
      </div>

      {/* Message list */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin rounded-xl p-4 space-y-4"
        style={{
          background: "hsl(var(--secondary))",
          border:     "1px solid hsl(var(--border))",
        }}
      >
        {query.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={cn("flex items-end gap-2.5", i % 2 === 0 && "flex-row-reverse")}
            >
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              body={msg.body}
              senderName={msg.sender.name}
              senderImage={msg.sender.image ?? null}
              isImportant={msg.isImportant}
              isOwn={msg.senderId === user?.id}
              time={msg.createdAt}
              onToggleImportant={() =>
                toggleMutation.mutate({ messageId: msg.id, important: !msg.isImportant })
              }
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="mt-3 shrink-0">
        <MessageForm
          conversationId={id}
          autoFocus
          onSent={() => void utils.message.getMessages.invalidate({ conversationId: id })}
        />
      </div>
    </div>
  );
}