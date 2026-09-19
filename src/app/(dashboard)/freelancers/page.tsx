"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Star, MapPin, DollarSign, ExternalLink, SlidersHorizontal } from "lucide-react";

import { api } from "@/trpc/react";
import { useRole } from "@/hooks/use-role";
import { formatCurrency } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";

import { PageHeader } from "@/components/layout/page-header";
import { UserAvatar } from "@/components/shared/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─────────────────────────────────────────────
// Rating stars
// ─────────────────────────────────────────────

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-3 h-3"
          style={{
            color: i < Math.round(rating) ? "#F59E0B" : "hsl(var(--border))",
            fill:  i < Math.round(rating) ? "#F59E0B" : "hsl(var(--border))",
          }}
        />
      ))}
      <span className="ml-1 text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>
        {rating > 0 ? rating.toFixed(1) : "New"}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Freelancer card
// ─────────────────────────────────────────────

type FreelancerRow = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  profile?: {
    bio?: string | null;
    location?: string | null;
    hourlyRate?: string | null;
    skills?: string[] | null;
    rating?: string | null;
    portfolioUrl?: string | null;
  } | null;
};

function FreelancerCard({ freelancer }: { freelancer: FreelancerRow }) {
  const router  = useRouter();
  const rating  = parseFloat(freelancer.profile?.rating ?? "0");
  const rate    = freelancer.profile?.hourlyRate
    ? parseFloat(freelancer.profile.hourlyRate)
    : null;
  const skills  = freelancer.profile?.skills ?? [];

  return (
    <div
      className="fppts-card p-5 flex flex-col gap-4 cursor-pointer group transition-shadow duration-200 hover:shadow-md"
      onClick={() => router.push(`/dashboard/freelancers/${freelancer.id}`)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <UserAvatar name={freelancer.name} image={freelancer.image} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate group-hover:text-[hsl(var(--primary))] transition-colors">
            {freelancer.name}
          </p>
          <p className="text-xs truncate mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {freelancer.email}
          </p>
          <div className="mt-1.5">
            <RatingStars rating={rating} />
          </div>
        </div>
        {freelancer.profile?.portfolioUrl && (
          <a
            href={freelancer.profile.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[hsl(var(--accent))]"
            style={{ color: "hsl(var(--muted-foreground))" }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Bio */}
      {freelancer.profile?.bio && (
        <p
          className="text-xs leading-relaxed truncate-2"
          style={{ color: "hsl(var(--muted-foreground))" }}
        >
          {freelancer.profile.bio}
        </p>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.slice(0, 5).map((skill) => (
            <span
              key={skill}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "hsl(var(--accent))",
                color:      "hsl(var(--primary))",
              }}
            >
              {skill}
            </span>
          ))}
          {skills.length > 5 && (
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                background: "hsl(var(--muted))",
                color:      "hsl(var(--muted-foreground))",
              }}
            >
              +{skills.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid hsl(var(--border))" }}
      >
        {freelancer.profile?.location ? (
          <div className="flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="text-xs truncate">{freelancer.profile.location}</span>
          </div>
        ) : (
          <span />
        )}
        {rate ? (
          <div className="flex items-center gap-0.5" style={{ color: "hsl(var(--primary))" }}>
            <DollarSign className="w-3 h-3" />
            <span className="text-sm font-bold">{rate}</span>
            <span className="text-xs font-normal" style={{ color: "hsl(var(--muted-foreground))" }}>/hr</span>
          </div>
        ) : (
          <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Rate not set</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Skeleton card
// ─────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="fppts-card p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
      <div className="flex gap-1.5">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
      <div className="flex justify-between pt-3 border-t border-border">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

const MIN_RATING_OPTIONS = [
  { value: "0",   label: "Any rating" },
  { value: "3",   label: "3+ stars"   },
  { value: "4",   label: "4+ stars"   },
  { value: "4.5", label: "4.5+ stars" },
];

export default function FreelancersPage() {
  const { isAdmin, isStaff } = useRole();
  const [search,    setSearch]    = useState("");
  const [minRating, setMinRating] = useState("0");
  const [page,      setPage]      = useState(0);

  const limit = 12;

  const { data: freelancers, isLoading } = api.user.listFreelancers.useQuery({
    search:    search || undefined,
    minRating: Number(minRating) || undefined,
    limit,
    offset:    page * limit,
  });

  const hasMore = (freelancers?.length ?? 0) === limit;

  return (
    <div className="page-enter">
      <PageHeader
        title="Freelancers"
        subtitle="Browse and discover available freelancers"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: "hsl(var(--muted-foreground))" }}
          />
          <Input
            placeholder="Search freelancers…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>
        <Select
          value={minRating}
          onValueChange={(v) => { setMinRating(v); setPage(0); }}
        >
          <SelectTrigger className="w-36 gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MIN_RATING_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !freelancers?.length ? (
        <div
          className="fppts-card flex flex-col items-center justify-center py-20 text-center"
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "hsl(var(--accent))" }}
          >
            <Search className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
          </div>
          <p className="font-semibold text-sm">No freelancers found</p>
          <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
            Try adjusting your search or rating filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {freelancers.map((f) => (
            <FreelancerCard key={f.id} freelancer={f} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || isLoading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasMore || isLoading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}