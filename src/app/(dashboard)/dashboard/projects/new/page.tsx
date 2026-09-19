import { PageHeader }  from "@/components/layout/page-header";
import { ProjectForm }  from "@/components/form/project-form";

export const metadata = { title: "New Project" };

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 stagger-children">
      <PageHeader
        title="New Project"
        subtitle="Fill in the details to create a new project."
      />
      <div className="fppts-card p-6">
        <ProjectForm />
      </div>
    </div>
  );
}