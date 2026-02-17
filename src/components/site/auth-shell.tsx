export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-b from-background to-muted/30 p-6 md:p-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 size-80 rounded-full bg-muted/50 blur-3xl" />
            <div className="absolute -right-24 -bottom-24 size-80 rounded-full bg-muted/50 blur-3xl" />
          </div>
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}
