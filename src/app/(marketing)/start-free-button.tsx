"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type StartFreeButtonProps = {
  label?: string;
  size?: "sm" | "lg";
};

export function StartFreeButton({ label = "Start Free", size = "lg" }: StartFreeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  function handleStartFree() {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    router.push("/signup");
  }

  return (
    <Button disabled={isLoading} size={size} type="button" onClick={handleStartFree}>
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {isLoading ? "Starting..." : label}
      {!isLoading ? <ArrowRight className="size-4" aria-hidden="true" /> : null}
    </Button>
  );
}

