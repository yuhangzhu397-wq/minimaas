import type { DashboardOverview } from "@minimaas/contracts";
import { useEffect, useState } from "react";
import { fallbackOverview } from "../data/fallback";

const baseUrl =
  import.meta.env.VITE_CONTROL_PLANE_URL ?? "http://localhost:8081";

export function useOverview() {
  const [data, setData] = useState<DashboardOverview>(fallbackOverview);
  const [status, setStatus] = useState<"loading" | "live" | "offline">(
    "loading",
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${baseUrl}/admin/overview`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return (await response.json()) as DashboardOverview;
      })
      .then((overview) => {
        setData(overview);
        setStatus("live");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStatus("offline");
      });
    return () => controller.abort();
  }, []);

  return { data, status };
}
