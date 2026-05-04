import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { SignupForm } from "@/features/auth/components/signup-form";
import { getCsrfToken } from "@/lib/auth/csrf-token";

export default async function SignupPage() {
  const csrfToken = await getCsrfToken();

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
        <GoogleAuthButton />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-[var(--muted)]">
          <span className="h-px flex-1 bg-[var(--border)]" />
          or
          <span className="h-px flex-1 bg-[var(--border)]" />
        </div>
        <SignupForm csrfToken={csrfToken} />
      </div>
    </AuthCard>
  );
}
