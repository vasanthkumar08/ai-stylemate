"use server";

import { redirect } from "next/navigation";
import { env, isSupabaseAuthConfigured } from "@/config/env";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import {
  type AuthActionState,
  getAuthErrorMessage,
  getRequestOrigin,
  validateAuthAction
} from "@/lib/auth/security";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema
} from "./schemas";
import { sanitizeText } from "@/lib/security/sanitize";

function zodFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
      field,
      messages[0] ?? "Invalid value."
    ])
  );
}

function getOAuthRedirectOrigin() {
  return new URL(env.NEXT_PUBLIC_APP_URL).origin;
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await validateAuthAction("login", formData);
    const parsed = loginSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error)
      };
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    });

    if (error) {
      return { status: "error", message: "Email or password is incorrect." };
    }
  } catch (error) {
    return { status: "error", message: getAuthErrorMessage(error) };
  }

  const requestedNext = formData.get("next");
  const nextPath =
    typeof requestedNext === "string" &&
    requestedNext.startsWith("/") &&
    !requestedNext.startsWith("//")
      ? requestedNext
      : "/dashboard";

  redirect(nextPath as never);
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await validateAuthAction("signup", formData);
    const parsed = signupSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error)
      };
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const requestOrigin = await getRequestOrigin();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${requestOrigin}/auth/callback?next=/dashboard`,
        data: {
          full_name: sanitizeText(parsed.data.fullName, 120),
          display_name: sanitizeText(parsed.data.fullName, 120)
        }
      }
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message: "Account created. Check your email to confirm your address."
    };
  } catch (error) {
    return { status: "error", message: getAuthErrorMessage(error) };
  }
}

export async function forgotPasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await validateAuthAction("forgot-password", formData);
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error)
      };
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const requestOrigin = await getRequestOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${requestOrigin}/auth/callback?next=/reset-password`
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message: "If an account exists for that email, a reset link is on its way."
    };
  } catch (error) {
    return { status: "error", message: getAuthErrorMessage(error) };
  }
}

export async function resetPasswordAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await validateAuthAction("reset-password", formData);
    const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));

    if (!parsed.success) {
      return {
        status: "error",
        message: "Check the highlighted fields.",
        fieldErrors: zodFieldErrors(parsed.error)
      };
    }

    const supabase = await createSupabaseRouteHandlerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        status: "error",
        message: "Your reset session expired. Open the latest reset email and try again."
      };
    }

    const { error } = await supabase.auth.updateUser({
      password: parsed.data.password
    });

    if (error) {
      return { status: "error", message: error.message };
    }
  } catch (error) {
    return { status: "error", message: getAuthErrorMessage(error) };
  }

  redirect("/dashboard");
}

export async function signInWithGoogleAction(formData: FormData) {
  let url: string | null = null;

  try {
    await validateAuthAction("google", formData);

    if (!isSupabaseAuthConfigured()) {
      url = "/login?error=missing-supabase";
    } else {
      const supabase = await createSupabaseRouteHandlerClient();
      const requestOrigin = getOAuthRedirectOrigin();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${requestOrigin}/auth/callback?next=/dashboard`,
          queryParams: {
            prompt: "select_account"
          }
        }
      });

      if (!error && data.url) {
        url = data.url;
      }
    }
  } catch {
    redirect("/login?error=oauth" as never);
  }

  redirect((url ?? "/login?error=oauth") as never);
}

export async function logoutAction(formData: FormData) {
  try {
    await validateAuthAction("logout", formData);
    const supabase = await createSupabaseRouteHandlerClient();
    await supabase.auth.signOut();
  } catch {
    redirect("/login" as never);
  }

  redirect("/login" as never);
}
