import { Navbar } from "@/components/site/navbar";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  containerClassName,
}: {
  children: React.ReactNode;
  containerClassName?: string;
}) {
  const containerClasses = containerClassName
    ? cn("mx-auto w-full min-w-0", containerClassName)
    : "mx-auto w-full min-w-0 max-w-6xl px-4 py-8";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="w-full">
        <div className={containerClasses}>{children}</div>
      </main>
    </div>
  );
}
