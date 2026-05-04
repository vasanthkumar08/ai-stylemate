import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { getCsrfToken } from "@/lib/auth/csrf-token";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; reason?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const csrfToken = await getCsrfToken();
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/dashboard";
  const authErrorMessage =
    params.error === "missing-supabase"
      ? "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local."
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
        <LoginForm csrfToken={csrfToken} nextPath={nextPath} />
      </div>
    </AuthCard>
  );
}
