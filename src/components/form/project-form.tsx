"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";
import {
  PROJECT_CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  PROJECT_STATUS_OPTIONS,
} from "@/lib/constants";

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

const projectSchema = z.object({
  title:       z.string().min(3, "At least 3 characters").max(200),
  description: z.string().min(10, "At least 10 characters"),
  category:    z.enum(["web", "design", "app", "marketing", "other"]),
  priority:    z.enum(["low", "medium", "high"]),
  // ✅ FIXED: removed redundant .refine() — .positive() already rejects NaN
  budget: z.coerce
    .number({ invalid_type_error: "Enter a valid number" })
    .positive("Must be a positive number"),
  deadline:    z.date({ message: "Pick a deadline" }),
  status:      z.enum(["pending", "ongoing", "completed", "cancelled"]).optional(),
});

// Explicitly infer so every FormField render prop is typed against this.
export type ProjectFormValues = z.infer<typeof projectSchema>;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues> & { id?: string };
  onSuccess?:     (id: string) => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ProjectForm({ defaultValues, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const isEdit = !!defaultValues?.id;

  // Explicitly pass the inferred type to useForm so the Control generic is
  // resolved to ProjectFormValues instead of the unresolved TFieldValues default.
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: {
      title:       defaultValues?.title       ?? "",
      description: defaultValues?.description ?? "",
      category:    defaultValues?.category    ?? "web",
      priority:    defaultValues?.priority    ?? "medium",
      budget:      defaultValues?.budget,
      deadline:    defaultValues?.deadline,
      status:      defaultValues?.status,
    },
  });

  // ✅ ADDED: shared error handler — parses ZodError field errors into a readable toast
  const handleError = (e: { data?: { zodError?: { fieldErrors?: Record<string, string[]> } }; message: string }) => {
    const shape = e.data?.zodError?.fieldErrors;
    if (shape) {
      const first = Object.entries(shape)[0];
      if (first) {
        toast.error(`${first[0]}: ${first[1]?.[0]}`);
        return;
      }
    }
    toast.error(e.message);
  };

  const createMutation = api.project.create.useMutation({
    onSuccess: (data) => {
      toast.success("Project created.");
      onSuccess ? onSuccess(data!.id) : router.push(`/dashboard/projects/${data!.id}`);
    },
    onError: handleError, // ✅ FIXED
  });

  const updateMutation = api.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated.");
      onSuccess
        ? onSuccess(defaultValues!.id!)
        : router.push(`/dashboard/projects/${defaultValues!.id}`);
    },
    onError: handleError, // ✅ FIXED
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // SubmitHandler<ProjectFormValues> is now correctly inferred from useForm<ProjectFormValues>
  const onSubmit = (v: ProjectFormValues) => {
    isEdit
      ? updateMutation.mutate({ id: defaultValues!.id!, ...v })
      : createMutation.mutate(v);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Title */}
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Project Title</FormLabel>
            <FormControl><Input placeholder="e.g. E-commerce Redesign" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Description */}
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Describe scope and requirements…"
                rows={4}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Category + Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="category" render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROJECT_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

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
        </div>

        {/* Budget + Deadline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="budget" render={({ field }) => (
            <FormItem>
              <FormLabel>Budget (USD)</FormLabel>
              <FormControl>
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                  >
                    $
                  </span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="5000"
                    className="pl-7"
                    {...field}
                    value={field.value ?? ""}
                    // ✅ FIXED: guard against NaN when input is cleared
                    onChange={(e) => {
                      const val = e.target.valueAsNumber;
                      field.onChange(isNaN(val) ? undefined : val);
                    }}
                  />
                </div>
              </FormControl>
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

        {/* Status — edit only */}
        {isEdit && (
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PROJECT_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Project"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}