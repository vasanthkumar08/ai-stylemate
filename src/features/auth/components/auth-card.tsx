import Link from "next/link";
import type { ReactNode } from "react";
import { Shirt } from "lucide-react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ children, description, footer, title }: AuthCardProps) {
  return (
    <main className="min-h-screen bg-[var(--background)] px-5 py-8 sm:px-6">
      <section className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-2 font-semibold">
            <span className="grid size-10 place-items-center rounded-lg bg-[var(--foreground)] text-white">
              <Shirt className="size-5" aria-hidden="true" />
            </span>
            StyleMate AI
          </Link>
          <h1 className="mt-10 max-w-xl text-5xl font-semibold leading-tight">
            Dress with confidence before the day even starts.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--muted)]">
            Secure access to wardrobe uploads, AI recommendations, saved outfits, and personal
            style intelligence.
          </p>
        </div>

        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-2 font-semibold lg:hidden">
            <span className="grid size-9 place-items-center rounded-lg bg-[var(--foreground)] text-white">
              <Shirt className="size-4" aria-hidden="true" />
            </span>
            StyleMate AI
          </Link>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-8">
            <div>
              <h2 className="text-2xl font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
            <div className="mt-8">{children}</div>
          </div>

          <div className="mt-6 text-center text-sm text-[var(--muted)]">{footer}</div>
        </div>
      </section>
    </main>
  );
}
