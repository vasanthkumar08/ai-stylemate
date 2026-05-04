type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="premium-card flex items-center gap-3 rounded-2xl px-5 py-4">
        <span className="size-3 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_18px_rgba(59,130,246,0.7)]" aria-hidden="true" />
        <p className="text-sm text-[var(--muted)]">{label}</p>
      </div>
    </main>
  );
}
