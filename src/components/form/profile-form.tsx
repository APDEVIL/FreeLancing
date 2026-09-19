"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";

import { api } from "@/trpc/react";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const profileSchema = z.object({
  bio:          z.string().max(500).optional(),
  phone:        z.string().max(20).optional(),
  location:     z.string().max(100).optional(),
  portfolioUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  skills:       z.array(z.string().min(1)).max(20).optional(),
  hourlyRate:   z.coerce.number().positive("Must be positive").optional(),
  companyName:  z.string().max(100).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

// ─────────────────────────────────────────────
// Skills tag input
// ─────────────────────────────────────────────

function SkillsInput({
  value,
  onChange,
}: {
  value:    string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput]   = useState("");
  const inputRef            = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= 20) return;
    onChange([...value, trimmed]);
    setInput("");
    inputRef.current?.focus();
  };

  const remove = (skill: string) => {
    onChange(value.filter((s) => s !== skill));
  };

  return (
    <div className="space-y-2">
      {/* Tag list */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{
                background: "hsl(var(--accent))",
                color:      "hsl(var(--primary))",
              }}
            >
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="hover:opacity-70 transition-opacity"
                aria-label={`Remove ${skill}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. React, Node.js, Figma…"
          className="flex-1"
          maxLength={40}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={!input.trim() || value.length >= 20}
          className="gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>
      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
        Press Enter or comma to add. Up to 20 skills.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

interface ProfileFormProps {
  defaultValues?: ProfileFormValues;
  onSuccess?:     () => void;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function ProfileForm({ defaultValues, onSuccess }: ProfileFormProps) {
  const { role }  = useSession();
  const utils     = api.useUtils();
  const isFreelancer = role === "freelancer";
  const isClient     = role === "client";

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      bio:          defaultValues?.bio          ?? "",
      phone:        defaultValues?.phone        ?? "",
      location:     defaultValues?.location     ?? "",
      portfolioUrl: defaultValues?.portfolioUrl ?? "",
      skills:       defaultValues?.skills       ?? [],
      hourlyRate:   defaultValues?.hourlyRate,
      companyName:  defaultValues?.companyName  ?? "",
    },
  });

  const mutation = api.user.upsertProfile.useMutation({
    onSuccess: async () => {
      await utils.user.me.invalidate();
      toast.success("Profile updated successfully.");
      onSuccess?.();
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (v: ProfileFormValues) => {
    mutation.mutate({
      ...v,
      portfolioUrl: v.portfolioUrl || undefined,
      skills:       v.skills?.length ? v.skills : undefined,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

        {/* Bio */}
        <FormField control={form.control} name="bio" render={({ field }) => (
          <FormItem>
            <FormLabel>Bio</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Write a short professional summary…"
                rows={3}
                className="resize-none"
                {...field}
              />
            </FormControl>
            <FormDescription className="text-xs">
              {(field.value?.length ?? 0)}/500 characters
            </FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        {/* Phone + Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+1 555 000 0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="location" render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Bengaluru, India" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        {/* Freelancer-specific fields */}
        {isFreelancer && (
          <>
            {/* Portfolio URL */}
            <FormField control={form.control} name="portfolioUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourportfolio.com" type="url" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Hourly Rate */}
            <FormField control={form.control} name="hourlyRate" render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate (USD)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
                      style={{ color: "hsl(var(--muted-foreground))" }}
                    >$</span>
                    <Input
                      type="number" min={0} placeholder="50"
                      className="pl-7"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    />
                  </div>
                </FormControl>
                <FormDescription className="text-xs">
                  Shown to clients when they browse your profile.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )} />

            {/* Skills */}
            <FormField control={form.control} name="skills" render={({ field }) => (
              <FormItem>
                <FormLabel>Skills</FormLabel>
                <FormControl>
                  <SkillsInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}

        {/* Client-specific fields */}
        {isClient && (
          <FormField control={form.control} name="companyName" render={({ field }) => (
            <FormItem>
              <FormLabel>Company / Business Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <div className="pt-1">
          <Button type="submit" disabled={mutation.isPending} className="gap-2">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Profile
          </Button>
        </div>
      </form>
    </Form>
  );
}