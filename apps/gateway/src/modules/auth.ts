import { createHash } from "node:crypto";
import type { GatewayAuthSnapshot } from "@minimaas/contracts";

export interface Principal {
  tenantId: string;
  apiKeyId: string;
  environment: "development" | "production";
  allowedModels: string[];
  rpmLimit: number;
  tpmLimit: number;
  dailyTokenQuota: number;
  monthlyBudgetCny: number;
}

export interface AuthService {
  authenticate(authorization?: string): Promise<Principal>;
}

export class AuthenticationError extends Error {
  constructor(message = "Invalid or missing API key") {
    super(message);
  }
}

export class AuthenticationServiceUnavailableError extends Error {
  constructor() {
    super("Authentication service unavailable");
  }
}

export class ModelAccessDeniedError extends Error {
  constructor(readonly model: string) {
    super(`Tenant is not allowed to use model '${model}'`);
  }
}

/** Phase 0: 明确的本地匿名主体。Phase 2 将替换为哈希 API Key 校验。 */
export class DevelopmentAuthService implements AuthService {
  async authenticate(): Promise<Principal> {
    return {
      tenantId: "local-development",
      apiKeyId: "anonymous",
      environment: "development",
      allowedModels: ["*"],
      rpmLimit: 60,
      tpmLimit: 100_000,
      dailyTokenQuota: 10_000_000,
      monthlyBudgetCny: 10_000,
    };
  }
}

export class SnapshotAuthService implements AuthService {
  private principalsByHash = new Map<string, Principal>();
  private loadedAt = 0;
  private refreshPromise: Promise<void> | undefined;

  constructor(
    private readonly snapshotUrl: string,
    private readonly ttlMs: number,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async refresh(): Promise<void> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = (async () => {
      const response = await this.fetchImpl(this.snapshotUrl, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new AuthenticationServiceUnavailableError();
      const snapshot = (await response.json()) as GatewayAuthSnapshot;
      this.principalsByHash = new Map(
        snapshot.keys.map((entry) => [
          entry.keyHash,
          {
            tenantId: entry.tenantId,
            apiKeyId: entry.keyId,
            environment: entry.environment,
            allowedModels: entry.allowedModels,
            rpmLimit: entry.rpmLimit,
            tpmLimit: entry.tpmLimit,
            dailyTokenQuota: entry.dailyTokenQuota,
            monthlyBudgetCny: entry.monthlyBudgetCny,
          },
        ]),
      );
      this.loadedAt = Date.now();
    })().finally(() => {
      this.refreshPromise = undefined;
    });
    return this.refreshPromise;
  }

  private parseBearer(authorization?: string): string {
    const match = authorization?.match(/^Bearer\s+(.+)$/iu);
    if (!match?.[1]) throw new AuthenticationError();
    return match[1];
  }

  async authenticate(authorization?: string): Promise<Principal> {
    const secret = this.parseBearer(authorization);
    const keyHash = createHash("sha256").update(secret).digest("hex");
    if (Date.now() - this.loadedAt >= this.ttlMs) await this.refresh();
    let principal = this.principalsByHash.get(keyHash);
    if (!principal) {
      await this.refresh();
      principal = this.principalsByHash.get(keyHash);
    }
    if (!principal) throw new AuthenticationError();
    return principal;
  }
}
