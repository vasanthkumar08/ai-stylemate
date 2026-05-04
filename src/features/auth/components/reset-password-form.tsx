"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { resetPasswordAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-state";
import { SubmitButton } from "./submit-button";

export function ResetPasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialAuthActionState);

  return (
    <form action={action} className="grid gap-5">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      {state.message ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <TextField
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        label="New password"
        name="password"
        placeholder="At least 8 characters"
        type="password"
      />
      <TextField
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
        label="Confirm new password"
        name="confirmPassword"
        placeholder="Repeat your new password"
        type="password"
      />
      <SubmitButton loadingLabel="Updating password...">Update password</SubmitButton>
    </form>
  );
}
