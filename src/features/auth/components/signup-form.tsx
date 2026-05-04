"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { signupAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-state";
import { SubmitButton } from "./submit-button";

export function SignupForm({ csrfToken }: { csrfToken: string }) {
  const [state, action] = useActionState(signupAction, initialAuthActionState);

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
        autoComplete="name"
        error={state.fieldErrors?.fullName}
        label="Full name"
        name="fullName"
        placeholder="Alex Morgan"
      />
      <TextField
        autoComplete="email"
        error={state.fieldErrors?.email}
        label="Email"
        name="email"
        placeholder="you@example.com"
        type="email"
      />
      <TextField
        autoComplete="new-password"
        error={state.fieldErrors?.password}
        label="Password"
        name="password"
        placeholder="At least 8 characters"
        type="password"
      />
      <TextField
        autoComplete="new-password"
        error={state.fieldErrors?.confirmPassword}
        label="Confirm password"
        name="confirmPassword"
        placeholder="Repeat your password"
        type="password"
      />
      <SubmitButton loadingLabel="Creating account...">Create account</SubmitButton>
    </form>
  );
}
