"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <AlertTriangle className="mb-4 size-6 text-red-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold">Something needs attention</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          StyleMate AI hit an unexpected error. Try again, and we will keep the
          workspace steady.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-xs text-[var(--muted)]">Digest: {error.digest}</p>
        ) : null}
        <Button className="mt-6" onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}
