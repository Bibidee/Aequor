"use client";

import { getClient } from "./client";

const POLL_INTERVAL = 10_000; // 10 seconds as requested
const MAX_ATTEMPTS = 60;      // 10 minutes max

function extractResult(receipt: unknown): unknown | null {
  if (!receipt || typeof receipt !== "object") return null;
  const r = receipt as Record<string, unknown>;

  // Walk every possible path GenLayer SDK returns the leader result
  const paths: unknown[] = [
    // consensus_data.leader_receipt.*
    (r["consensus_data"] as Record<string, unknown> | undefined)
      ?.["leader_receipt"] &&
      (() => {
        const lr = (r["consensus_data"] as Record<string, unknown>)["leader_receipt"] as Record<string, unknown>;
        return lr["result"] ?? lr["execution_result"] ?? lr["return_value"];
      })(),
    // flat fields
    r["result"],
    r["execution_result"],
    r["return_value"],
  ];

  for (const candidate of paths) {
    if (candidate === undefined || candidate === null) continue;
    if (typeof candidate === "string" && candidate.trim() === "") continue;
    // Parse if it's a JSON string
    if (typeof candidate === "string") {
      try { return JSON.parse(candidate); } catch { return candidate; }
    }
    return candidate;
  }

  return null;
}

function isActuallyFinalized(receipt: unknown): boolean {
  if (!receipt || typeof receipt !== "object") return false;
  const r = receipt as Record<string, unknown>;
  const s = String(r["status"] ?? "").toLowerCase();
  // Must be a final status AND have consensus_data with a leader receipt
  const hasFinalStatus = s === "finalized" || s === "accepted" || s === "accepted_with_errors";
  const hasLeaderReceipt = !!(
    (r["consensus_data"] as Record<string, unknown> | undefined)?.["leader_receipt"]
  );
  return hasFinalStatus && hasLeaderReceipt;
}

export async function waitForTx(txHash: `0x${string}`): Promise<unknown> {
  const client = getClient();

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const receipt = await (client as any).getTransaction({ hash: txHash });

      if (receipt) {
        // Only resolve when we have actual result data — never on bare finalized status
        const result = extractResult(receipt);
        if (result !== null) {
          return result;
        }

        // If finalized but no result extracted yet, keep polling —
        // leader_receipt may be populated in a subsequent poll
        if (isActuallyFinalized(receipt)) {
          // Give it one more cycle to populate the result
          await new Promise((r) => setTimeout(r, 2000));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const receipt2 = await (client as any).getTransaction({ hash: txHash });
          const result2 = extractResult(receipt2);
          if (result2 !== null) return result2;
          // Still nothing — return receipt so caller can handle it
          return receipt2 ?? receipt;
        }
      }
    } catch {
      // still pending — keep polling
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  throw new Error("Transaction timed out waiting for GenLayer consensus.");
}
