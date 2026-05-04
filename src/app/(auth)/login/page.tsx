import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCsrfToken } from "@/lib/auth/csrf-token";
import { isSupabaseAuthConfigured } from "@/lib/env";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const csrfToken = await getCsrfToken();
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  const isAuthConfigured = isSupabaseAuthConfigured();
  const authErrorMessage =
    !isAuthConfigured || params.error === "missing-supabase"
      ? "Authentication temporarily unavailable."
      : params.error === "oauth"
        ? `Google sign in could not be completed.${params.reason ? ` ${params.reason}` : " Check Supabase Google provider and redirect URL settings."}`
        : null;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to continue building your wardrobe intelligence."
      footer={
        <>
          New to StyleMate?{" "}
          <Link className="font-medium text-[var(--accent)]" href={{ pathname: "/signup" }}>
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid gap-5">
        {authErrorMessage ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {authErrorMessage}
          </p>
        ) : null}
        <GoogleAuthButton />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        {isAuthConfigured ? (
          <LoginForm csrfToken={csrfToken} nextPath={nextPath} />
        ) : (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sign in is disabled until authentication is configured.
          </p>
        )}
      </div>
    </AuthCard>
  );
}
