import { ImportShell } from "@/components/import/import-shell";

// Главная страница: принимает состояние OAuth из query-параметров и передает его в экран импорта.
type HomePageProps = {
  searchParams: Promise<{
    figma?: string;
    reason?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { figma, reason } = await searchParams;
  return <ImportShell figmaState={figma} figmaReason={reason} />;
}
