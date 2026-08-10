import type { Usage } from "@minimaas/contracts";
import type { Principal } from "./auth.js";
import type { RoutedModel } from "./adapter.js";

export interface UsageRecord {
  requestId: string;
  principal: Principal;
  routedModel: RoutedModel;
  usage: Usage;
  latencyMs: number;
  status: "success" | "error";
}

export interface MeteringService {
  record(record: UsageRecord): Promise<void>;
}

export class InMemoryMeteringService implements MeteringService {
  readonly records: UsageRecord[] = [];

  async record(record: UsageRecord): Promise<void> {
    this.records.push(record);
  }
}
