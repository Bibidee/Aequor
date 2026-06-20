"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ModerationCase, Community, Rulebook, AppealRecord } from "@/lib/genlayer/types";

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
}

const AequorContext = createContext<AequorState>({} as AequorState);

export function AequorProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [cases, setCases] = useState<ModerationCase[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [rulebooks, setRulebooks] = useState<Record<string, Rulebook>>({});
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [activeCommunityId, setActiveCommunityIdRaw] = useState<string | null>(null);

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
    }}>
      {children}
    </AequorContext.Provider>
  );
}

export const useAequor = () => useContext(AequorContext);
