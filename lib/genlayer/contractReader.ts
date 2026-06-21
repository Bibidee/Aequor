"use client";

import { getClient } from "./client";
import { getContractAddress } from "./contract";

export async function readCaseFromContract(caseId: string): Promise<Record<string, unknown> | null> {
  try {
    const client = getClient();
    const contractAddr = getContractAddress();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (client as any).readContract({
      address: contractAddr,
      functionName: "get_case",
      args: [caseId],
    });
    if (!raw) return null;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.error) return null;
    return parsed;
  } catch (e) {
    console.warn("[Aequor] Failed to read case from contract:", e);
    return null;
  }
}
