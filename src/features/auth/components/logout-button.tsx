"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function clearBrowserAuthCache() {
  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);

      if (key && (key.includes("supabase") || key.includes("sb-") || key.includes("auth"))) {
        storage.removeItem(key);
      }
    }
  }
}

type LogoutButtonVariant = "button" | "menu" | "bottom-nav";

function LogoutSubmitButton({ variant = "button" }: { variant?: LogoutButtonVariant }) {
  const { pending } = useFormStatus();

  if (variant === "bottom-nav") {
    return (
      <button
        className="relative grid min-h-12 w-full place-items-center rounded-xl px-1 text-[10px] font-semibold text-[#64748b] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        type="submit"
      >
        <LogOut className={cn("size-4", pending && "animate-pulse")} aria-hidden="true" />
        <span className="mt-0.5 truncate">{pending ? "Leaving" : "Logout"}</span>
      </button>
    );
  }

  return (
    <Button
      className={variant === "menu" ? "w-full justify-start" : undefined}
      disabled={pending}
      size="sm"
      type="submit"
      variant="ghost"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {pending ? "Signing out..." : "Logout"}
    </Button>
  );
}

export function LogoutButton({
  csrfToken,
  variant = "button"
}: {
  csrfToken: string;
  variant?: LogoutButtonVariant;
}) {
  return (
    <form
      action={logoutAction}
      onSubmit={() => {
        clearBrowserAuthCache();
      }}
    >
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <LogoutSubmitButton variant={variant} />
    </form>
  );
}
