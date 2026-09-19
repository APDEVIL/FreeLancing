"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const messageSchema = z.object({
  body:        z.string().min(1, "Message cannot be empty").max(5000),
  isImportant: z.boolean().default(false),
});

export type MessageFormValues = z.infer<typeof messageSchema>;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface MessageFormProps {
  conversationId: string;
  onSent?:        () => void;
  /** Auto-focus on mount */
  autoFocus?:     boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function MessageForm({ conversationId, onSent, autoFocus }: MessageFormProps) {
  const utils = api.useUtils();

  const form = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema) as any,
    defaultValues: { body: "", isImportant: false },
  });

  const isImportant = form.watch("isImportant");

  const mutation = api.message.send.useMutation({
    onSuccess: async () => {
      await utils.message.getMessages.invalidate({ conversationId });
      form.reset();
      onSent?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (v: MessageFormValues) => {
    mutation.mutate({ conversationId, ...v });
  };

  // Submit on Ctrl+Enter / Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void form.handleSubmit(onSubmit)();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{
            border:     "1px solid hsl(var(--border))",
            background: "hsl(var(--card))",
            boxShadow:  "var(--shadow-card)",
          }}
        >
          {/* Textarea */}
          <FormField control={form.control} name="body" render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Textarea
                  placeholder="Write a message… (Ctrl+Enter to send)"
                  rows={3}
                  className={cn(
                    "resize-none border-0 shadow-none rounded-none focus-visible:ring-0",
                    "text-sm px-4 pt-3 pb-2",
                  )}
                  autoFocus={autoFocus}
                  onKeyDown={handleKeyDown}
                  {...field}
                />
              </FormControl>
              <FormMessage className="px-4 pb-1 text-xs" />
            </FormItem>
          )} />

          {/* Toolbar row */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderTop: "1px solid hsl(var(--border))" }}
          >
            {/* Left — Important toggle */}
            <FormField control={form.control} name="isImportant" render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => field.onChange(!field.value)}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg",
                          "transition-colors duration-150",
                          isImportant
                            ? "text-amber-600 bg-amber-50"
                            : "text-muted-foreground hover:bg-[hsl(var(--secondary))]",
                        )}
                        aria-label="Mark as important"
                      >
                        <Star
                          className="w-3.5 h-3.5"
                          fill={isImportant ? "currentColor" : "none"}
                        />
                        Important
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {isImportant ? "Remove important flag" : "Flag as important"}
                    </TooltipContent>
                  </Tooltip>
                </FormControl>
              </FormItem>
            )} />

            {/* Right — Send button */}
            <Button
              type="submit"
              size="sm"
              disabled={mutation.isPending || !form.watch("body").trim()}
              className="gap-2"
            >
              {mutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Send className="w-3.5 h-3.5" />}
              Send
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}