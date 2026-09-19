"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { authClient } from "@/server/better-auth/client";
import { api } from "@/trpc/react"; // ✅ ADDED
import { Button }    from "@/components/ui/button";
import { Input }     from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const registerSchema = z
  .object({
    name:            z.string().min(2, "At least 2 characters"),
    email:           z.string().email("Enter a valid email"),
    role:            z.enum(["freelancer", "client"], {
                       message: "Select a role",
                     }),
    password:        z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path:    ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router              = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // ✅ ADDED: server-side role setter — no admin privilege required
  const setOwnRole = api.user.setOwnRole.useMutation();

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema) as any,
    defaultValues: {
      name:            "",
      email:           "",
      role:            "freelancer",
      password:        "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (v: RegisterValues) => {
    // Step 1: create the account
    const { error } = await authClient.signUp.email({
      name:     v.name,
      email:    v.email,
      password: v.password,
    });

    if (error) {
      toast.error(error.message ?? "Registration failed.");
      return;
    }

    // ✅ CHANGED: set role via tRPC (server-side DB write, no admin needed)
    // signUp.email creates the session automatically so ctx.session is available
    try {
      await setOwnRole.mutateAsync({ role: v.role });
    } catch (err) {
      console.error("[register] failed to set role:", err);
      toast.warning("Account created but role could not be set. Please contact support.");
    }

    toast.success("Account created! Welcome to FPPTS.");
    router.push("/dashboard");
  };

  const handleGithub = async () => {
    setOauthLoading(true);
    await authClient.signIn.social({ provider: "github" });
    setOauthLoading(false);
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Create your account
        </h1>
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Start managing your projects and payments today.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={handleGithub}
        disabled={oauthLoading || isPending}
      >
        {oauthLoading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          )}
        Continue with GitHub
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
          or register with email
        </span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Dalton Estrada" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@company.com" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="role" render={({ field }) => (
            <FormItem>
              <FormLabel>I am a…</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="freelancer">Freelancer / Professional</SelectItem>
                  <SelectItem value="client">Client / Business Owner</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                    aria-label={showPw ? "Hide" : "Show"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" className="w-full gap-2 mt-2" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Account
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline"
          style={{ color: "hsl(var(--primary))" }}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}