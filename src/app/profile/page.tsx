import { Crown, Mail, ShieldCheck, UserCircle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireAuthenticatedPage } from "@/lib/guards/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { appUser } = await requireAuthenticatedPage();
  const accountDetails = [
    { label: "Email", value: appUser.email, Icon: Mail },
    { label: "Role", value: appUser.role, Icon: ShieldCheck },
    { label: "Plan", value: appUser.plan, Icon: Crown }
  ] as const;

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl">
        <div className="mb-6">
          <p className="text-sm font-medium text-[var(--accent)]">Account</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">Profile</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Your StyleMate AI account, role, and plan details.
          </p>
        </div>

        <div className="premium-card rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#363b6c] text-white shadow-lg shadow-[#363b6c]/20">
              <UserCircle className="size-7" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold">StyleMate member</h2>
              <p className="mt-1 break-all text-sm text-[var(--muted)]">{appUser.email}</p>
            </div>
          </div>

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {accountDetails.map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl border border-[#c6c9e7]/70 bg-white/70 p-4">
                <Icon className="size-4 text-[#363b6c]" aria-hidden="true" />
                <dt className="mt-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
                <dd className="mt-1 truncate text-sm font-semibold capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </AppShell>
  );
}
