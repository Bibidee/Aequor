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
  rawEvidenceTexts: string[];
}

export async function buildCasePacket(
  caseId: string,
  form: CaseFormData
): Promise<{ packet: CasePacket; evidenceHashes: string[]; evidenceHash: string }> {
  const evidenceHashes = await Promise.all(
    form.rawEvidenceTexts.map((e) => hashString(e))
  );

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
    requestedAction: form.requestedAction,
    localeContext: form.localeContext || "English",
    submittedAt: nowIso(),
  };

  const evidenceHash = await hashEvidencePacket(packet as unknown as Record<string, unknown>);

  return { packet, evidenceHashes, evidenceHash };
}
