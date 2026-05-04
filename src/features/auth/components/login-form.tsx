"use client";

import Link from "next/link";
import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { loginAction } from "@/features/auth/actions";
import { initialAuthActionState } from "@/lib/auth/action-state";
import { SubmitButton } from "./submit-button";

export function LoginForm({ csrfToken, nextPath }: { csrfToken: string; nextPath: string }) {
  const [state, action] = useActionState(loginAction, initialAuthActionState);

  return (
    <form action={action} className="grid gap-5">
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <input name="next" type="hidden" value={nextPath} />
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
      <div className="grid gap-2">
        <TextField
          autoComplete="current-password"
          error={state.fieldErrors?.password}
          label="Password"
          name="password"
          placeholder="Enter your password"
          type="password"
        />
        <Link
          className="justify-self-end text-sm font-medium text-[var(--accent)]"
          href={{ pathname: "/forgot-password" }}
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton loadingLabel="Signing in...">Sign in</SubmitButton>
    </form>
  );
}
