"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isSupabaseAuthConfigured } from "@/config/env";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";
import { CSRF_COOKIE_NAME } from "@/lib/auth/constants";
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
import { normalizePostAuthRedirect } from "@/lib/auth/redirect";
import { sanitizeText } from "@/lib/security/sanitize";

function zodFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).map(([field, messages]) => [
      field,
      messages[0] ?? "Invalid value."
    ])
  );
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
  const nextPath = normalizePostAuthRedirect(
    typeof requestedNext === "string" ? requestedNext : null
  );

  redirect(nextPath as never);
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  let shouldRedirectToDashboard = false;

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
    const { data, error } = await supabase.auth.signUp({
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

    shouldRedirectToDashboard = Boolean(data.session);

    if (!shouldRedirectToDashboard) {
      return {
        status: "success",
        message: "Account created. Check your email to confirm your address."
      };
    }

    if (shouldRedirectToDashboard) {
      console.info("[stylemate-auth-signup]", {
        sessionCreated: true,
        redirectTarget: "/dashboard"
      });
    }
  } catch (error) {
    return { status: "error", message: getAuthErrorMessage(error) };
  }

  if (shouldRedirectToDashboard) {
    redirect("/dashboard" as never);
  }

  return {
    status: "success",
    message: "Account created. Check your email to confirm your address."
  };
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
      const requestOrigin = await getRequestOrigin();
      console.info("[stylemate-oauth-start]", {
        provider: "google",
        next: "/dashboard",
        origin: requestOrigin
      });
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
    const cookieStore = await cookies();
    cookieStore.delete(CSRF_COOKIE_NAME);
    revalidatePath("/", "layout");
  } catch {
    redirect("/" as never);
  }

  redirect("/" as never);
}
