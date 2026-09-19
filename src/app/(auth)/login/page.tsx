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
import { cn } from "@/lib/utils";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const loginSchema = z.object({
  email:      z.string().email("Enter a valid email"),
  password:   z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginValues = z.infer<typeof loginSchema>;

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function LoginPage() {
  const router          = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema) as any,
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  // ── Email login ──────────────────────────────
  const onSubmit = async (v: LoginValues) => {
    const { error } = await authClient.signIn.email({
      email:    v.email,
      password: v.password,
    });
    if (error) {
      toast.error(error.message ?? "Invalid credentials.");
      return;
    }
    toast.success("Welcome back!");
    router.push("/dashboard");
  };

  // ── GitHub OAuth ─────────────────────────────
  const handleGithub = async () => {
    setOauthLoading(true);
    await authClient.signIn.social({ provider: "github" });
    setOauthLoading(false);
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="space-y-1">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Sign in to FPPTS
        </h1>
        <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
          Manage your freelance projects and payments.
        </p>
      </div>

      {/* GitHub OAuth */}
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

      {/* Divider */}
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs shrink-0" style={{ color: "hsl(var(--muted-foreground))" }}>
          or continue with email
        </span>
        <Separator className="flex-1" />
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Email */}
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Password */}
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="#"
                  className="text-xs font-medium hover:underline"
                  style={{ color: "hsl(var(--primary))" }}
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                    style={{ color: "hsl(var(--muted-foreground))" }}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Remember me */}
          <FormField control={form.control} name="rememberMe" render={({ field }) => (
            <FormItem className="flex items-center gap-2.5 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="remember"
                />
              </FormControl>
              <FormLabel
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                Remember me
              </FormLabel>
            </FormItem>
          )} />

          <Button type="submit" className="w-full gap-2 mt-2" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </Button>
        </form>
      </Form>

      {/* Register link */}
      <p className="text-center text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-semibold hover:underline"
          style={{ color: "hsl(var(--primary))" }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}