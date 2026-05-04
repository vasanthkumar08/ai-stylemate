"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { forgotPasswordAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-state";
import { SubmitButton } from "./submit-button";

export function ForgotPasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, action] = useActionState(forgotPasswordAction, initialAuthActionState);

  return (
    <form action={action} className="grid gap-5">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      {state.message ? (
        <p
          className={
            state.status === "success"
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      ) : null}
      <TextField
        autoComplete="email"
        error={state.fieldErrors?.email}
        label="Email"
        name="email"
        placeholder="you@example.com"
        type="email"
      />
      <SubmitButton loadingLabel="Sending link...">Send reset link</SubmitButton>
    </form>
  );
}
