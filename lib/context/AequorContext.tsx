"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ModerationCase, Community, Rulebook, Rule, AppealRecord } from "@/lib/genlayer/types";
import { useWallet } from "@/lib/context/WalletContext";
import { getClient } from "@/lib/genlayer/client";
import { getContractAddress } from "@/lib/genlayer/contract";

const EMPTY_RULE_ARRAYS: Pick<Rule, "allowedExamples" | "violationExamples" | "severityRange" | "defaultActions" | "escalationTriggers"> = {
  allowedExamples: [],
  violationExamples: [],
  severityRange: [],
  defaultActions: [],
  escalationTriggers: [],
};

// Rules registered on-chain may only carry a subset of the full Rule shape
// (e.g. just title/description/severity from a script or a minimal form).
// Normalize so components that assume array fields exist (.map, .filter)
// never crash on chain-sourced rulebooks.
function normalizeRule(id: string, raw: Record<string, unknown>): Rule {
  const severity = typeof raw.severity === "string" ? raw.severity : undefined;
  return {
    id,
    title: typeof raw.title === "string" ? raw.title : id,
    description: typeof raw.description === "string" ? raw.description : "",
    allowedExamples: Array.isArray(raw.allowedExamples) ? raw.allowedExamples : EMPTY_RULE_ARRAYS.allowedExamples,
    violationExamples: Array.isArray(raw.violationExamples) ? raw.violationExamples : EMPTY_RULE_ARRAYS.violationExamples,
    severityRange: Array.isArray(raw.severityRange) ? raw.severityRange : severity ? [severity] : EMPTY_RULE_ARRAYS.severityRange,
    defaultActions: Array.isArray(raw.defaultActions) ? raw.defaultActions : EMPTY_RULE_ARRAYS.defaultActions,
    escalationTriggers: Array.isArray(raw.escalationTriggers) ? raw.escalationTriggers : EMPTY_RULE_ARRAYS.escalationTriggers,
    contextNotes: typeof raw.contextNotes === "string" ? raw.contextNotes : "",
  };
}

const LS = {
  cases: "aequor:cases",
  communities: "aequor:communities",
  rulebooks: "aequor:rulebooks",
  appeals: "aequor:appeals",
  activeId: "aequor:activeId",
};

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

interface AequorState {
  cases: ModerationCase[];
  communities: Community[];
  rulebooks: Record<string, Rulebook>;
  appeals: AppealRecord[];
  activeCommunityId: string | null;
  setActiveCommunityId: (id: string) => void;
  addCase: (c: ModerationCase) => void;
  updateCase: (id: string, updates: Partial<ModerationCase>) => void;
  addCommunity: (c: Community) => void;
  addRulebook: (communityId: string, rb: Rulebook) => void;
  addAppeal: (a: AppealRecord) => void;
  updateAppeal: (id: string, updates: Partial<AppealRecord>) => void;
  getCaseById: (id: string) => ModerationCase | undefined;
  getAppealById: (id: string) => AppealRecord | undefined;
  getCommunityById: (id: string) => Community | undefined;
  getRulebookByCommunity: (id: string) => Rulebook | undefined;
  syncingCommunities: boolean;
  syncCommunitiesFromChain: () => Promise<void>;
}

const AequorContext = createContext<AequorState>({} as AequorState);

export function AequorProvider({ children }: { children: React.ReactNode }) {
  const { address } = useWallet();
  const [hydrated, setHydrated] = useState(false);
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [rulebooks, setRulebooks] = useState<Record<string, Rulebook>>({});
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [activeCommunityId, setActiveCommunityIdRaw] = useState<string | null>(null);
  const [syncingCommunities, setSyncingCommunities] = useState(false);

  // Load from localStorage once on client mount
  useEffect(() => {
    setCases(lsGet(LS.cases, []));
    setCommunities(lsGet(LS.communities, []));
    setRulebooks(lsGet(LS.rulebooks, {}));
    setAppeals(lsGet(LS.appeals, []));
    setActiveCommunityIdRaw(lsGet(LS.activeId, null));
    setHydrated(true);
  }, []);

  // Persist to localStorage whenever state changes (only after hydration)
  useEffect(() => { if (hydrated) lsSet(LS.cases, cases); }, [cases, hydrated]);
  useEffect(() => { if (hydrated) lsSet(LS.communities, communities); }, [communities, hydrated]);
  useEffect(() => { if (hydrated) lsSet(LS.rulebooks, rulebooks); }, [rulebooks, hydrated]);
  useEffect(() => { if (hydrated) lsSet(LS.appeals, appeals); }, [appeals, hydrated]);
  useEffect(() => { if (hydrated) lsSet(LS.activeId, activeCommunityId); }, [activeCommunityId, hydrated]);

  const setActiveCommunityId = useCallback((id: string) => setActiveCommunityIdRaw(id), []);
  const addCase = useCallback((c: ModerationCase) => setCases((p) => [c, ...p]), []);
  const updateCase = useCallback((id: string, u: Partial<ModerationCase>) =>
    setCases((p) => p.map((c) => (c.id === id ? { ...c, ...u } : c))), []);
  const addCommunity = useCallback((c: Community) => setCommunities((p) => [c, ...p]), []);
  const addRulebook = useCallback((communityId: string, rb: Rulebook) =>
    setRulebooks((p) => ({ ...p, [communityId]: rb })), []);
  const addAppeal = useCallback((a: AppealRecord) => setAppeals((p) => [a, ...p]), []);
  const updateAppeal = useCallback((id: string, u: Partial<AppealRecord>) =>
    setAppeals((p) => p.map((a) => (a.id === id ? { ...a, ...u } : a))), []);

  // The contract, not localStorage, is the source of truth for on-chain
  // state. localStorage is only an optimistic cache for instant UI after a
  // local write — every entity here is reconciled against the chain
  // whenever the connected wallet changes (or on manual refresh), so a
  // fresh browser (or state written by a script/another session) still
  // shows what's actually on-chain, across every page — not just Communities.
  const syncCommunitiesFromChain = useCallback(async () => {
    setSyncingCommunities(true);
    try {
      const client = getClient();
      const contractAddr = getContractAddress();
      const read = (functionName: string, args: unknown[]) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (client as any).readContract({ address: contractAddr, functionName, args }) as Promise<unknown>;
      const parseJson = <T,>(raw: unknown, fallback: T): T => {
        try {
          return typeof raw === "string" ? (JSON.parse(raw) as T) : (raw as T) ?? fallback;
        } catch {
          return fallback;
        }
      };

      // Reads are public on-chain regardless of who is connected — pull the
      // full protocol directory, not just communities the current wallet owns,
      // so Arbitration/Appeals/Consistency/Rulebooks reflect all real activity.
      const allIdsRaw = await read("list_communities", []);
      const ownerIdsRaw = address ? await read("get_communities_by_owner", [address]) : null;
      const allIds = parseJson<string[]>(allIdsRaw, []);
      const ownerIds = ownerIdsRaw ? parseJson<string[]>(ownerIdsRaw, []) : [];
      const communityIds = Array.from(new Set([...allIds, ...ownerIds]));
      if (communityIds.length === 0) return;

      const nextCommunities: Community[] = [];
      const nextRulebooks: Record<string, Rulebook> = {};
      const nextCases: ModerationCase[] = [];
      const nextAppeals: AppealRecord[] = [];

      await Promise.all(
        communityIds.map(async (communityId) => {
          try {
            const commRaw = await read("get_community", [communityId]);
            const comm = parseJson<Record<string, unknown> | null>(commRaw, null);
            if (comm && !comm.error) nextCommunities.push(comm as unknown as Community);
          } catch { /* skip */ }

          try {
            const rbRaw = await read("get_rulebook", [communityId]);
            const rb = parseJson<Record<string, unknown> | null>(rbRaw, null);
            if (rb && !rb.error && rb.rulebook && typeof rb.rulebook === "object") {
              const normalizedRules: Record<string, Rule> = {};
              for (const [ruleId, ruleRaw] of Object.entries(rb.rulebook as Record<string, unknown>)) {
                normalizedRules[ruleId] = normalizeRule(ruleId, ruleRaw as Record<string, unknown>);
              }
              nextRulebooks[communityId] = {
                communityId,
                rulebook: normalizedRules,
                rulebookHash: (rb.rulebookHash as string) ?? "",
                registeredAt: (rb.registeredAt as string) ?? "",
              };
            }
          } catch { /* skip */ }

          try {
            const caseIdsRaw = await read("get_community_cases", [communityId]);
            const caseIds = parseJson<string[]>(caseIdsRaw, []);
            await Promise.all(
              caseIds.map(async (caseId) => {
                try {
                  const caseRaw = await read("get_case", [caseId]);
                  const c = parseJson<Record<string, unknown> | null>(caseRaw, null);
                  if (!c || c.error) return;
                  nextCases.push(c as unknown as ModerationCase);

                  const appealId = c.appealId as string | undefined;
                  if (appealId) {
                    try {
                      const appealRaw = await read("get_appeal", [appealId]);
                      const a = parseJson<Record<string, unknown> | null>(appealRaw, null);
                      if (a && !a.error) nextAppeals.push(a as unknown as AppealRecord);
                    } catch { /* skip */ }
                  }
                } catch { /* skip */ }
              })
            );
          } catch { /* skip */ }
        })
      );

      if (nextCommunities.length) {
        setCommunities((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of nextCommunities) byId.set(c.id, c);
          return Array.from(byId.values());
        });
      }
      if (Object.keys(nextRulebooks).length) {
        setRulebooks((prev) => ({ ...prev, ...nextRulebooks }));
      }
      if (nextCases.length) {
        setCases((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of nextCases) byId.set(c.id, c);
          return Array.from(byId.values());
        });
      }
      if (nextAppeals.length) {
        setAppeals((prev) => {
          const byId = new Map(prev.map((a) => [a.id, a]));
          for (const a of nextAppeals) byId.set(a.id, a);
          return Array.from(byId.values());
        });
      }
    } catch (e) {
      console.warn("[Aequor] Failed to sync from chain:", e);
    } finally {
      setSyncingCommunities(false);
    }
  }, [address]);

  useEffect(() => {
    if (hydrated) syncCommunitiesFromChain();
  }, [hydrated, address, syncCommunitiesFromChain]);

  const getCaseById = useCallback((id: string) => cases.find((c) => c.id === id), [cases]);
  const getAppealById = useCallback((id: string) => appeals.find((a) => a.id === id), [appeals]);
  const getCommunityById = useCallback((id: string) => communities.find((c) => c.id === id), [communities]);
  const getRulebookByCommunity = useCallback((id: string) => rulebooks[id], [rulebooks]);

  return (
    <AequorContext.Provider value={{
      cases, communities, rulebooks, appeals, activeCommunityId,
      setActiveCommunityId,
      addCase, updateCase, addCommunity, addRulebook, addAppeal, updateAppeal,
      getCaseById, getAppealById, getCommunityById, getRulebookByCommunity,
      syncingCommunities, syncCommunitiesFromChain,
    }}>
      {children}
    </AequorContext.Provider>
  );
}

export const useAequor = () => useContext(AequorContext);
