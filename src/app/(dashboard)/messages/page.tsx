"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { api }          from "@/trpc/react";
import { useSession }   from "@/hooks/use-session";
import { formatRelative, cn } from "@/lib/utils";

import { PageHeader }   from "@/components/layout/page-header";
import { SearchInput }  from "@/components/shared/search-input";
import { UserAvatar }   from "@/components/shared/avatar";
import { EmptyState }   from "@/components/shared/empty-state";
import { Button }       from "@/components/ui/button";
import { Skeleton }     from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────
// Conversation card
// ─────────────────────────────────────────────

function ConvCard({
  id,
  title,
  participants,
  lastMessage,
  lastTime,
  unread,
  currentUserId,
}: {
  id:            string;
  title?:        string | null;
  participants:  { userId: string; user: { name: string; image: string | null } }[];
  lastMessage?:  string;
  lastTime?:     Date | string;
  unread:        boolean;
  currentUserId: string;
}) {
  // Show other participants' avatars (not current user)
  const others = participants.filter((p) => p.userId !== currentUserId).slice(0, 3);
  const displayTitle =
    title ?? others.map((p) => p.user.name).join(", ") ?? "Conversation";

  return (
    <Link
      href={`/dashboard/messages/${id}`}
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl transition-all duration-150",
        "hover:bg-[hsl(var(--secondary))]",
        unread && "bg-[hsl(var(--accent)/0.4)]",
      )}
    >
      {/* Stacked avatars */}
      <div className="relative flex shrink-0">
        {others.slice(0, 2).map((p, i) => (
          <div
            key={p.userId}
            className="relative"
            style={{ marginLeft: i > 0 ? "-10px" : 0, zIndex: 2 - i }}
          >
            <UserAvatar name={p.user.name} image={p.user.image} size="sm" />
          </div>
        ))}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn("text-sm truncate", unread ? "font-bold" : "font-semibold")}
            style={{ color: "hsl(var(--foreground))" }}
          >
            {displayTitle}
          </p>
          {lastTime && (
            <span
              className="text-[11px] shrink-0"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {formatRelative(lastTime)}
            </span>
          )}
        </div>
        {lastMessage && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            {lastMessage}
          </p>
        )}
      </div>

      {/* Unread dot */}
      {unread && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: "hsl(var(--primary))" }}
        />
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────
// New conversation dialog
// ─────────────────────────────────────────────

function NewConvDialog({ onCreated }: { onCreated: () => void }) {
  const [open,    setOpen]    = useState(false);
  const [title,   setTitle]   = useState("");
  const utils = api.useUtils();

  // Load all users to pick participants
  const usersQuery = api.user.listFreelancers.useQuery({ limit: 50, offset: 0 });

  const [selected, setSelected] = useState<string[]>([]);

  const mutation = api.message.createConversation.useMutation({
    onSuccess: () => {
      toast.success("Conversation created.");
      setOpen(false);
      setTitle("");
      setSelected([]);
      void utils.message.listConversations.invalidate();
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleUser = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          New Conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              className="text-sm font-medium"
              style={{ color: "hsl(var(--foreground))" }}
            >
              Title (optional)
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)]"
              style={{
                border:     "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color:      "hsl(var(--foreground))",
              }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project kickoff discussion"
            />
          </div>

          {/* Participant picker */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "hsl(var(--foreground))" }}>
              Add Participants
            </label>
            <div
              className="max-h-52 overflow-y-auto rounded-lg scrollbar-thin divide-y"
              style={{
                border:   "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
            >
              {usersQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-32 rounded" />
                  </div>
                ))
              ) : (usersQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "hsl(var(--muted-foreground))" }}>
                  No users found.
                </p>
              ) : (
                (usersQuery.data ?? []).map((u) => {
                  const isSelected = selected.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleUser(u.id)}
                      className={cn(
                        "flex items-center gap-3 w-full p-3 text-left transition-colors",
                        isSelected && "bg-[hsl(var(--accent))]",
                      )}
                    >
                      <UserAvatar name={u.name} image={u.image ?? null} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "hsl(var(--foreground))" }}>
                          {u.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>
                          {u.email}
                        </p>
                      </div>
                      {isSelected && (
                        <span
                          className="text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                          style={{ background: "hsl(var(--primary))", color: "white" }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={selected.length === 0 || mutation.isPending}
            onClick={() =>
              mutation.mutate({
                title:          title || undefined,
                participantIds: selected,
              })
            }
          >
            {mutation.isPending ? "Creating…" : `Start Conversation (${selected.length} selected)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function MessagesPage() {
  const { user }    = useSession();
  const utils       = api.useUtils();
  const [search, setSearch] = useState("");

  const query = api.message.listConversations.useQuery({ limit: 50, offset: 0 });
  const convs = query.data ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return convs;
    return convs.filter((c) => {
      const titleMatch = (c.title ?? "").toLowerCase().includes(q);
      const partMatch  = c.participants.some((p) =>
        p.user.name.toLowerCase().includes(q),
      );
      return titleMatch || partMatch;
    });
  }, [convs, search]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      <PageHeader
        title="Messages"
        subtitle="Your conversations"
        actions={
          <NewConvDialog onCreated={() => void utils.message.listConversations.invalidate()} />
        }
      />

      {/* Search */}
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search conversations…"
        width="w-full"
      />

      {/* List */}
      <div className="fppts-card overflow-hidden p-2">
        {query.isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-60 rounded" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No conversations yet"
            description="Start a new conversation to collaborate with your team."
          />
        ) : (
          filtered.map((c) => {
            const lastMsg = c.messages?.[0];
            return (
              <ConvCard
                key={c.id}
                id={c.id}
                title={c.title}
                participants={c.participants}
                lastMessage={lastMsg?.body}
                lastTime={lastMsg?.createdAt}
                unread={!!lastMsg && !lastMsg.readAt && lastMsg.senderId !== user?.id}
                currentUserId={user?.id ?? ""}
              />
            );
          })
        )}
      </div>
    </div>
  );
}