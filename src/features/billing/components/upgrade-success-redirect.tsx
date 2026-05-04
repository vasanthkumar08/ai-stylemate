"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function UpgradeSuccessRedirect() {
  const router = useRouter();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      router.push("/dashboard");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [router]);

  return null;
}
