"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Star, MapPin, DollarSign, Globe, Mail,
  Phone, Calendar, Briefcase, CheckCircle2,
} from "lucide-react";

import { api } from "@/trpc/react";
import { useRole } from "@/hooks/use-role";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";

import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/shared/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

// ─────────────────────────────────────────────
// Rating stars
// ─────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4"
          style={{
            color: i < Math.round(rating) ? "#F59E0B" : "hsl(var(--border))",
            fill:  i < Math.round(rating) ? "#F59E0B" : "hsl(var(--border))",
          }}
        />
      ))}
      <span className="ml-1 text-sm font-semibold" style={{ color: "hsl(var(--foreground))" }}>
        {rating > 0 ? rating.toFixed(1) : "No rating yet"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Info row
// ─────────────────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: "hsl(var(--accent))" }}
      >
        <Icon className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium truncate hover:underline"
            style={{ color: "hsl(var(--primary))" }}
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium truncate">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isAdmin } = useRole();

  const { data: freelancer, isLoading } = api.user.byId.useQuery({ id });

  if (isLoading) {
    return (
      <div className="page-enter space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="fppts-card p-6 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-20 h-20 rounded-full" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="lg:col-span-2 fppts-card p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-5 w-24" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!freelancer) {
    return (
      <div className="page-enter fppts-card p-16 text-center">
        <p className="font-semibold">Freelancer not found</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const profile  = freelancer.profile;
  const rating   = parseFloat(profile?.rating ?? "0");
  const rate     = profile?.hourlyRate ? parseFloat(profile.hourlyRate) : null;
  const skills   = profile?.skills ?? [];

  return (
    <div className="page-enter">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-2 -ml-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Freelancers
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — profile card */}
        <div className="space-y-4">
          <div className="fppts-card p-6 flex flex-col items-center text-center gap-3">
            <UserAvatar name={freelancer.name} image={freelancer.image} size="xl" />
            <div>
              <h2 className="text-lg font-bold">{freelancer.name}</h2>
              <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
                {ROLE_LABELS[freelancer.role as keyof typeof ROLE_LABELS] ?? "Freelancer"}
              </p>
            </div>
            <RatingStars rating={rating} />
            {rate && (
              <div
                className="flex items-center gap-1 px-4 py-2 rounded-xl"
                style={{ background: "hsl(var(--accent))" }}
              >
                <DollarSign className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-lg font-bold" style={{ color: "hsl(var(--primary))" }}>
                  {rate}
                </span>
                <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>/hr</span>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="fppts-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
              Contact Info
            </p>
            <div className="space-y-0">
              <InfoRow icon={Mail}     label="Email"    value={freelancer.email} href={`mailto:${freelancer.email}`} />
              {profile?.phone    && <InfoRow icon={Phone}    label="Phone"    value={profile.phone} />}
              {profile?.location && <InfoRow icon={MapPin}   label="Location" value={profile.location} />}
              {profile?.portfolioUrl && (
                <InfoRow
                  icon={Globe}
                  label="Portfolio"
                  value={profile.portfolioUrl}
                  href={profile.portfolioUrl}
                />
              )}
              <InfoRow icon={Calendar} label="Joined"   value={formatDate(freelancer.createdAt)} />
            </div>
          </div>
        </div>

        {/* Right — details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Bio */}
          {profile?.bio && (
            <div className="fppts-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                About
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(var(--foreground))" }}>
                {profile.bio}
              </p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="fppts-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{
                      background: "hsl(var(--accent))",
                      color:      "hsl(var(--primary))",
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Admin actions */}
          {isAdmin && (
            <div className="fppts-card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>
                Admin Actions
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/dashboard/users/${freelancer.id}`)}
                >
                  Manage User
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}