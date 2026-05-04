import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getCsrfToken } from "@/lib/auth/csrf-token";

export default async function ResetPasswordPage() {
  const csrfToken = await getCsrfToken();

  return (
    <AuthCard
      title="Choose a new password"
      description="Use a strong password you do not use anywhere else."
      footer={
        <Link className="font-medium text-[var(--accent)]" href={{ pathname: "/login" }}>
          Return to sign in
        </Link>
      }
    >
      <ResetPasswordForm csrfToken={csrfToken} />
    </AuthCard>
  );
}
