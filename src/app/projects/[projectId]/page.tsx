import { WorkspaceShell } from "@/components/workspace/workspace-shell";

// Страница рабочей области конкретного проекта после завершения генерации.
type ProjectPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  return <WorkspaceShell projectId={projectId} />;
}
