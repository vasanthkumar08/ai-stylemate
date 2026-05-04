import { Shirt } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="grid min-h-80 place-items-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
      <div className="max-w-sm">
        <div className="mx-auto grid size-12 place-items-center rounded-lg bg-[var(--surface-subtle)]">
          <Shirt className="size-5 text-[var(--accent)]" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
    </div>
  );
}
