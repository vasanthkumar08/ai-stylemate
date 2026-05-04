import { LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton({ csrfToken }: { csrfToken: string }) {
  return (
    <form action={logoutAction}>
      <input name="csrfToken" type="hidden" value={csrfToken} />
      <Button size="sm" type="submit" variant="ghost">
        <LogOut className="size-4" aria-hidden="true" />
        Logout
      </Button>
    </form>
  );
}
