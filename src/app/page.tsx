"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoader } from "../components/ui/PageLoader";
import { getDefaultRouteForRole } from "./(dashboard)/roleRoutes";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.status === 401) {
          if (!cancelled) router.replace("/login");
          return;
        }
        const data = await res.json();
        if (data.success) {
          if (!cancelled) router.replace(getDefaultRouteForRole(data.user.role));
        } else {
          if (!cancelled) router.replace("/login");
        }
      } catch {
        if (!cancelled) router.replace("/login");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // This route only resolves the session and redirects, so the loader *is* the
  // screen — it stays up until `router.replace` lands.
  return <PageLoader fullScreen message="Loading your workspace" hint="Checking your session…" />;
}
