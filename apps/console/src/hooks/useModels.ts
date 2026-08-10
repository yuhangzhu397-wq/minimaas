import type { ModelsResponse } from "@minimaas/contracts";
import { useCallback, useEffect, useState } from "react";

const gatewayUrl = import.meta.env.VITE_GATEWAY_URL ?? "http://localhost:8080";

export function useModels() {
  const [data, setData] = useState<ModelsResponse["data"]>([]);
  const [status, setStatus] = useState<"loading" | "live" | "error">("loading");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    try {
      const response = await fetch(`${gatewayUrl}/v1/models`, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as ModelsResponse;
      setData(payload.data);
      setStatus("live");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  return { data, status, refresh: () => void refresh() };
}
