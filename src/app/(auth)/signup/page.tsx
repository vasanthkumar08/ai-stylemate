import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { SignupForm } from "@/features/auth/components/signup-form";
import { normalizePostAuthRedirect } from "@/lib/auth/redirect";
import { getCsrfToken } from "@/lib/auth/csrf-token";
import { isSupabaseAuthConfigured } from "@/lib/env";

type SignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const csrfToken = await getCsrfToken();
  const params = await searchParams;
  const nextPath = normalizePostAuthRedirect(params.next);
  const isAuthConfigured = isSupabaseAuthConfigured();

  return (
    <AuthCard
      title="Create your account"
      description="Start with secure access, then build a wardrobe that gets smarter over time."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-[var(--accent)]" href={{ pathname: "/login" }}>
            Sign in
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        <GoogleAuthButton nextPath={nextPath} />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {isAuthConfigured ? (
          <SignupForm csrfToken={csrfToken} />
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Authentication temporarily unavailable.
          </p>
        )}
      </div>
    </AuthCard>
  );
}
