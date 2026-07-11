import type { CasePacket } from "@/lib/genlayer/types";
import { hashEvidencePacket, hashString } from "./evidenceHasher";
import { nowIso } from "@/lib/utils/dates";

export interface CaseFormData {
  communityId: string;
  contentType: string;
  selectedRuleId: string;
  reportedContentExcerpt: string;
  contextSummary: string;
  priorActionSummary: string;
  requestedAction: string;
  localeContext: string;
  reporterHash: string;
  reportedUserHash: string;
  respondentDiscord: string;
  respondentWallet: string;
  respondentNote: string;
  rawEvidenceTexts: string[];
}

const URL_PATTERN = /^https?:\/\/\S+$/i;

export async function buildCasePacket(
  caseId: string,
  form: CaseFormData
): Promise<{ packet: CasePacket; evidenceHashes: string[]; evidenceHash: string }> {
  const evidenceHashes = await Promise.all(
    form.rawEvidenceTexts.map((e) => hashString(e))
  );

  // Evidence entries that are bare URLs get passed to the contract as
  // evidenceItems so GenLayer can independently fetch and hash-verify the
  // actual page content, instead of trusting the party's claimed summary.
  // We do not pre-compute a "claimed hash" for URLs — the contract's first
  // successful fetch becomes the canonical, on-chain-verified hash.
  const evidenceItems = form.rawEvidenceTexts
    .filter((e) => URL_PATTERN.test(e.trim()))
    .map((url) => ({ url: url.trim(), hash: "" }));

  const packet: CasePacket = {
    caseId,
    communityId: form.communityId,
    rulebookVersion: "v1.0.0",
    reportedUserHash: form.reportedUserHash || await hashString(`user_${Date.now()}_reported`),
    reporterHash: form.reporterHash || await hashString(`user_${Date.now()}_reporter`),
    contentType: form.contentType,
    selectedRuleId: form.selectedRuleId,
    reportedContentExcerpt: form.reportedContentExcerpt,
    contextSummary: form.contextSummary,
    priorActionSummary: form.priorActionSummary,
    evidenceHashes,
    evidenceItems,
    requestedAction: form.requestedAction,
    localeContext: form.localeContext || "English",
    respondentDiscord: form.respondentDiscord,
    respondentWallet: form.respondentWallet,
    respondentNote: form.respondentNote,
    submittedAt: nowIso(),
  };

  const evidenceHash = await hashEvidencePacket(packet as unknown as Record<string, unknown>);

  return { packet, evidenceHashes, evidenceHash };
}
