import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getCsrfToken } from "@/lib/auth/csrf-token";

export default async function ForgotPasswordPage() {
  const csrfToken = await getCsrfToken();

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we will send a secure reset link."
      footer={
        <Link className="font-medium text-[var(--accent)]" href={{ pathname: "/login" }}>
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm csrfToken={csrfToken} />
    </AuthCard>
  );
}
