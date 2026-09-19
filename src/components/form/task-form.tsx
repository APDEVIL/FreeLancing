"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import { PRIORITY_OPTIONS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const taskSchema = z.object({
  title:       z.string().min(3, "At least 3 characters").max(200),
  description: z.string().optional(),
  assignedTo:  z.string().min(1, "Select a freelancer"),
  priority:    z.enum(["low", "medium", "high"]),
  deadline:    z.date({
    message: "Pick a deadline",
  }),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface TaskFormProps {
  projectId:   string;
  /** Pre-populated list of project members to assign from */
  members:     { id: string; name: string; image?: string | null }[];
  /** Pass existing task to edit */
  defaultValues?: Partial<TaskFormValues> & { id?: string };
  onSuccess?:  () => void;
  onCancel?:   () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function TaskForm({
  projectId,
  members,
  defaultValues,
  onSuccess,
  onCancel,
}: TaskFormProps) {
  const isEdit = !!defaultValues?.id;
  const utils  = api.useUtils();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema) as any,
    defaultValues: {
      title:       defaultValues?.title       ?? "",
      description: defaultValues?.description ?? "",
      assignedTo:  defaultValues?.assignedTo  ?? "",
      priority:    defaultValues?.priority    ?? "medium",
      deadline:    defaultValues?.deadline,
    },
  });

  // ── Create ───────────────────────────────────
  const createMutation = api.task.create.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate({ projectId });
      toast.success("Task assigned successfully.");
      form.reset();
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Update ───────────────────────────────────
  const updateMutation = api.task.update.useMutation({
    onSuccess: async () => {
      await utils.task.list.invalidate({ projectId });
      toast.success("Task updated.");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (v: TaskFormValues) => {
    if (isEdit) {
      updateMutation.mutate({ id: defaultValues!.id!, ...v });
    } else {
      createMutation.mutate({ projectId, ...v });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Title */}
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Task Title</FormLabel>
            <FormControl>
              <Input placeholder="e.g. Build landing page hero section" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Description */}
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>
              Description
              <span className="ml-1 text-xs font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>
                (optional)
              </span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add any notes or requirements for this task…"
                rows={3}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Assign to */}
        <FormField control={form.control} name="assignedTo" render={({ field }) => (
          <FormItem>
            <FormLabel>Assign To</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {members.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    No members in this project yet.
                  </p>
                ) : (
                  members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Priority + Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="priority" render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="deadline" render={({ field }) => (
            <FormItem>
              <FormLabel>Deadline</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {field.value ? format(field.value, "MMM d, yyyy") : "Pick a date"}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(d) => d < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Assign Task"}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}