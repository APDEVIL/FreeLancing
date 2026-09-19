"use client";

import { api }          from "@/trpc/react";
import { useSession }   from "@/hooks/use-session";
import { getInitials, getAvatarColor, formatDate } from "@/lib/utils";
import { ROLE_LABELS }  from "@/lib/constants";
import type { UserRole } from "@/lib/constants";

import { PageHeader }   from "@/components/layout/page-header";
import { ProfileForm }  from "@/components/form/profile-form";
import { Skeleton }     from "@/components/ui/skeleton";
import { Separator }    from "@/components/ui/separator";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Stat pill
// ─────────────────────────────────────────────

function ProfileStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center px-4">
      <p
        className="text-xl font-bold"
        style={{ color: "hsl(var(--foreground))" }}
      >
        {value}
      </p>
      <p
        className="text-xs mt-0.5"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {label}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useSession();
  const query    = api.user.me.useQuery();
  const me       = query.data;
  const profile  = me?.profile;

  if (query.isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40 rounded" />
        <div className="fppts-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 stagger-children">
      <PageHeader title="My Profile" subtitle="Manage your personal information" />

      {/* Profile hero card */}
      <div className="fppts-card overflow-hidden">
        {/* Top banner */}
        <div
          className="h-24"
          style={{
            background: `linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(262 83% 70%) 100%)`,
          }}
        />

        <div className="px-6 pb-6">
          {/* Avatar — overlaps banner */}
          <div className="-mt-10 mb-4 flex items-end justify-between gap-4">
            <Avatar className="w-20 h-20 ring-4 ring-white shadow-lg">
              <AvatarImage src={me?.image ?? undefined} alt={me?.name ?? ""} />
              <AvatarFallback
                className={cn("text-xl font-bold", getAvatarColor(me?.name))}
              >
                {getInitials(me?.name)}
              </AvatarFallback>
            </Avatar>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full mb-1"
              style={{
                background: "hsl(var(--accent))",
                color:      "hsl(var(--primary))",
              }}
            >
              {ROLE_LABELS[(me?.role as UserRole) ?? "freelancer"]}
            </span>
          </div>

          {/* Name + email */}
          <h2
            className="text-xl font-bold"
            style={{ color: "hsl(var(--foreground))" }}
          >
            {me?.name ?? "—"}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>
            {me?.email ?? "—"}
          </p>

          {/* Bio */}
          {profile?.bio && (
            <p
              className="text-sm mt-3 leading-relaxed"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              {profile.bio}
            </p>
          )}

          <Separator className="my-5" />

          {/* Stats row */}
          <div className="flex items-center justify-center divide-x divide-[hsl(var(--border))]">
            <ProfileStat label="Projects"    value={profile?.totalProjects ?? 0} />
            <ProfileStat label="Rating"      value={profile?.rating ? `${parseFloat(profile.rating).toFixed(1)} ★` : "—"} />
            {profile?.hourlyRate && (
              <ProfileStat label="Hourly Rate" value={`$${parseFloat(profile.hourlyRate).toFixed(0)}/hr`} />
            )}
            <ProfileStat label="Member Since" value={me?.createdAt ? formatDate(me.createdAt) : "—"} />
          </div>

          {/* Skills */}
          {(profile?.skills?.length ?? 0) > 0 && (
            <>
              <Separator className="my-5" />
              <div>
                <p
                  className="text-xs font-semibold mb-3"
                  style={{ color: "hsl(var(--muted-foreground))" }}
                >
                  SKILLS
                </p>
                <div className="flex flex-wrap gap-2">
                  {profile!.skills!.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        background: "hsl(var(--accent))",
                        color:      "hsl(var(--primary))",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Extra meta */}
          {(profile?.location ?? profile?.phone ?? profile?.portfolioUrl ?? profile?.companyName) && (
            <>
              <Separator className="my-5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {profile?.location && (
                  <div>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>Location: </span>
                    <span style={{ color: "hsl(var(--foreground))" }}>{profile.location}</span>
                  </div>
                )}
                {profile?.phone && (
                  <div>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>Phone: </span>
                    <span style={{ color: "hsl(var(--foreground))" }}>{profile.phone}</span>
                  </div>
                )}
                {profile?.companyName && (
                  <div>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>Company: </span>
                    <span style={{ color: "hsl(var(--foreground))" }}>{profile.companyName}</span>
                  </div>
                )}
                {profile?.portfolioUrl && (
                  <div>
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>Portfolio: </span>
                    <a
                      href={profile.portfolioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: "hsl(var(--primary))" }}
                    >
                      {profile.portfolioUrl.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="fppts-card p-6">
        <h2
          className="text-sm font-bold mb-5"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Edit Profile
        </h2>
        <ProfileForm
          defaultValues={{
            bio:          profile?.bio          ?? "",
            phone:        profile?.phone        ?? "",
            location:     profile?.location     ?? "",
            portfolioUrl: profile?.portfolioUrl ?? "",
            skills:       profile?.skills       ?? [],
            hourlyRate:   profile?.hourlyRate
                            ? parseFloat(profile.hourlyRate)
                            : undefined,
            companyName:  profile?.companyName  ?? "",
          }}
        />
      </div>
    </div>
  );
}