"use client";

import { getClient } from "./client";

const POLL_INTERVAL = 10_000;
const MAX_ATTEMPTS = 60;

function extractResult(receipt: unknown): unknown | null {
  if (!receipt || typeof receipt !== "object") return null;
  const r = receipt as Record<string, unknown>;

  const paths: unknown[] = [
    (r["consensus_data"] as Record<string, unknown> | undefined)
      ?.["leader_receipt"] &&
      (() => {
        const lr = (r["consensus_data"] as Record<string, unknown>)["leader_receipt"] as Record<string, unknown>;
        return lr["result"] ?? lr["execution_result"] ?? lr["return_value"];
      })(),
    r["result"],
    r["execution_result"],
    r["return_value"],
  ];

  for (const candidate of paths) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "string" && candidate.trim() === "") continue;
    if (typeof candidate === "string") {
      try { return JSON.parse(candidate); } catch { return candidate; }
    }
    return candidate;
  }

  return null;
}

const STATUS_MAP: Record<number, string> = {
  0: "pending",
  1: "proposing",
  2: "committing",
  3: "revealing",
  4: "accepted",
  5: "finalized",
  6: "undetermined",
  7: "cancelled",
};

function getStatus(receipt: unknown): string {
  if (!receipt || typeof receipt !== "object") return "";
  const raw = (receipt as Record<string, unknown>)["status"];
  if (typeof raw === "number") return STATUS_MAP[raw] ?? String(raw);
  return String(raw ?? "").toLowerCase();
}

export async function waitForTx(txHash: `0x${string}`): Promise<unknown> {
  const client = getClient();

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receipt = await (client as any).getTransaction({ hash: txHash });

      if (receipt) {
        const status = getStatus(receipt);
        const rawStatus = (receipt as Record<string, unknown>)["status"];
        console.log("[Aequor] TX poll rawStatus:", rawStatus, "→", status, "keys:", Object.keys(receipt as object));
        const isFinal = status === "accepted" || status === "finalized" || status === "accepted_with_errors";

        if (isFinal) {
          console.log("[Aequor] TX final receipt:", JSON.stringify(receipt).substring(0, 500));
          const result = extractResult(receipt);
          if (result !== null) {
            console.log("[Aequor] Extracted result:", JSON.stringify(result).substring(0, 500));
            return result;
          }
          // Final but no result yet — retry a couple times
          for (let j = 0; j < 3; j++) {
            await new Promise((r) => setTimeout(r, 3000));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const retry = await (client as any).getTransaction({ hash: txHash });
            const retryResult = extractResult(retry);
            if (retryResult !== null) return retryResult;
          }
          // Return raw receipt so caller can debug
          console.warn("[Aequor] No result extracted from final receipt, returning raw");
          return receipt;
        }
      }
    } catch {
      // RPC error — keep polling
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error("Transaction timed out waiting for GenLayer consensus.");
}
