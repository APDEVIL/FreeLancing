"use client";

import { use } from "react";
import { api }          from "@/trpc/react";
import { PageHeader }   from "@/components/layout/page-header";
import { ProjectForm }  from "@/components/form/project-form";
import { Skeleton }     from "@/components/ui/skeleton";

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }  = use(params);
  const query   = api.project.byId.useQuery({ id });
  const project = query.data;

  if (query.isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48 rounded" />
        <div className="fppts-card p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
        </div>
      </div>
    );
  }

  if (!project) return (
    <p className="text-center py-20" style={{ color: "hsl(var(--muted-foreground))" }}>Project not found.</p>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      <PageHeader title="Edit Project" subtitle={project.title} />
      <div className="fppts-card p-6">
        <ProjectForm
          defaultValues={{
            id:          project.id,
            title:       project.title,
            description: project.description,
            category:    project.category as "web" | "design" | "app" | "marketing" | "other",
            priority:    project.priority as "low" | "medium" | "high",
            budget:      parseFloat(project.budget),
            deadline:    new Date(project.deadline),
            status:      project.status as "pending" | "ongoing" | "completed" | "cancelled",
          }}
        />
      </div>
    </div>
  );
}