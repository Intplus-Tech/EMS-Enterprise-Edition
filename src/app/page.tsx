"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
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

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "rgb(15 23 42)", color: "#fff" }}>
      <div style={{ textAlign: "center" }}>
        <Icons.Loader className="animate-spin" size={48} style={{ color: "rgb(var(--color-primary))", margin: "0 auto 1rem" }} />
        <p>Loading your workspace...</p>
      </div>
    </div>
  );
}
