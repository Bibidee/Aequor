# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import hashlib
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# AequorModeration — GenLayer Intelligent Contract
# Fair moderation arbitration for communities and games.
#
# GenLayer validators interpret rulebooks and evidence to produce structured
# moderation rulings, appeal outcomes, and consistency reviews.
# ---------------------------------------------------------------------------


ALLOWED_DECISIONS = {
    "NO_VIOLATION",
    "VIOLATION_FOUND",
    "INSUFFICIENT_CONTEXT",
    "MALICIOUS_REPORT_SUSPECTED",
    "NEEDS_HUMAN_ESCALATION",
    "POLICY_AMBIGUOUS",
}

ALLOWED_SEVERITY = {"NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"}

ALLOWED_ACTIONS = {
    "NO_ACTION",
    "EDUCATIONAL_NOTICE",
    "WARNING",
    "CONTENT_HIDE",
    "CONTENT_REMOVE",
    "TEMP_MUTE_1H",
    "TEMP_MUTE_24H",
    "TEMP_SUSPEND_7D",
    "PERMANENT_BAN_REVIEW",
    "ESCALATE_TO_HUMAN",
    "RESTORE_CONTENT",
    "REDUCE_ACTION",
    "UPHOLD_ACTION",
}

ALLOWED_APPEAL_OUTCOMES = {
    "UPHELD",
    "REDUCED",
    "REVERSED",
    "REVIEW_AGAIN_WITH_MORE_CONTEXT",
    "ESCALATED",
}


def to_json(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def safe_loads(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except Exception:
        return fallback


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_str(value: str) -> str:
    return "0x" + hashlib.sha256(value.encode("utf-8")).hexdigest()


class AequorModeration(gl.Contract):
    # --- Storage fields (class-level annotations, initialised in __init__) ---
    communities: TreeMap[str, str]
    rulebooks: TreeMap[str, str]
    cases: TreeMap[str, str]
    appeals: TreeMap[str, str]
    community_cases: TreeMap[str, str]
    stats: str

    def __init__(self) -> None:
        self.communities = TreeMap()
        self.rulebooks = TreeMap()
        self.cases = TreeMap()
        self.appeals = TreeMap()
        self.community_cases = TreeMap()
        self.stats = to_json({
            "totalCommunities": 0,
            "totalCases": 0,
            "totalAppeals": 0,
            "totalReversals": 0,
            "humanEscalations": 0,
        })

    # -----------------------------------------------------------------------
    # Community & Rulebook
    # -----------------------------------------------------------------------

    @gl.public.write
    def register_community(self, community_id: str, profile_json: str, rulebook_hash: str) -> str:
        assert community_id, "community_id required"
        assert profile_json, "profile_json required"
        profile = safe_loads(profile_json, {})
        record = {
            "id": community_id,
            "owner": str(gl.message.sender_address),
            "name": profile.get("name", community_id),
            "category": profile.get("category", "OTHER"),
            "moderationStyle": profile.get("moderationStyle", "BALANCED"),
            "rulebookHash": rulebook_hash or "",
            "appealWindowHours": int(profile.get("appealWindowHours", 72)),
            "createdAt": utcnow(),
        }
        self.communities[community_id] = to_json(record)
        stats = safe_loads(self.stats, {})
        stats["totalCommunities"] = stats.get("totalCommunities", 0) + 1
        self.stats = to_json(stats)
        return to_json({"ok": True, "communityId": community_id})

    @gl.public.write
    def register_rulebook(self, community_id: str, rulebook_json: str, rulebook_hash: str) -> str:
        assert community_id in self.communities, "Community not found"
        assert rulebook_json, "rulebook_json required"
        record = {
            "communityId": community_id,
            "rulebook": safe_loads(rulebook_json, {}),
            "rulebookHash": rulebook_hash or sha256_str(rulebook_json),
            "registeredAt": utcnow(),
            "registeredBy": str(gl.message.sender_address),
        }
        self.rulebooks[community_id] = to_json(record)
        comm = safe_loads(self.communities[community_id], {})
        comm["rulebookHash"] = record["rulebookHash"]
        self.communities[community_id] = to_json(comm)
        return to_json({"ok": True, "rulebookHash": record["rulebookHash"]})

    # -----------------------------------------------------------------------
    # Case Submission
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_case(self, case_id: str, case_packet_json: str, evidence_hash: str) -> str:
        assert case_id, "case_id required"
        assert case_packet_json, "case_packet_json required"
        packet = safe_loads(case_packet_json, {})
        community_id = packet.get("communityId", "")
        record = {
            "id": case_id,
            "communityId": community_id,
            "reporterHash": packet.get("reporterHash", ""),
            "reportedUserHash": packet.get("reportedUserHash", ""),
            "contentType": packet.get("contentType", ""),
            "selectedRuleId": packet.get("selectedRuleId", ""),
            "contextSummary": packet.get("contextSummary", ""),
            "evidenceHashes": packet.get("evidenceHashes", []),
            "evidenceHash": evidence_hash or "",
            "requestedAction": packet.get("requestedAction", ""),
            "priorActionSummary": packet.get("priorActionSummary", ""),
            "localeContext": packet.get("localeContext", ""),
            "status": "SUBMITTED",
            "verdict": None,
            "submittedAt": utcnow(),
            "submittedBy": str(gl.message.sender_address),
            "packet": packet,
        }
        self.cases[case_id] = to_json(record)
        existing_raw = self.community_cases.get(community_id, "[]")
        existing = safe_loads(existing_raw, [])
        if case_id not in existing:
            existing.append(case_id)
        self.community_cases[community_id] = to_json(existing)
        stats = safe_loads(self.stats, {})
        stats["totalCases"] = stats.get("totalCases", 0) + 1
        self.stats = to_json(stats)
        return to_json({"ok": True, "caseId": case_id, "status": "SUBMITTED"})

    # -----------------------------------------------------------------------
    # GenLayer Intelligent Review — review_case
    # -----------------------------------------------------------------------

    @gl.public.write
    def review_case(self, case_id: str) -> str:
        assert case_id in self.cases, "Case not found"

        # Read all needed data from storage before entering nondet
        case_raw = self.cases[case_id]
        case = safe_loads(case_raw, {})
        community_id = case.get("communityId", "")
        rulebook_raw = self.rulebooks.get(community_id, "")
        rulebook_record = safe_loads(rulebook_raw, {})
        rulebook = rulebook_record.get("rulebook", {})

        packet = case.get("packet", {})
        selected_rule_id = case.get("selectedRuleId", "")
        content_type = case.get("contentType", "")
        context_summary = case.get("contextSummary", "")
        prior_action = case.get("priorActionSummary", "")
        requested_action = case.get("requestedAction", "")
        locale_context = case.get("localeContext", "")
        reported_excerpt = packet.get("reportedContentExcerpt", "")

        rules_text = to_json(rulebook) if rulebook else "No formal rulebook registered."
        rule_obj = rulebook.get(selected_rule_id, {}) if isinstance(rulebook, dict) else {}
        rule_text = to_json(rule_obj) if rule_obj else rules_text

        prompt_text = (
            "You are a fair moderation arbitrator reviewing a case for a community or game platform.\n\n"
            "## Community Rulebook\n" + rules_text + "\n\n"
            "## Selected Rule Being Applied\n"
            "Rule ID: " + selected_rule_id + "\n"
            "Rule Details: " + rule_text + "\n\n"
            "## Case Details\n"
            "Content Type: " + content_type + "\n"
            "Reported Content Excerpt: " + reported_excerpt + "\n"
            "Context Summary: " + context_summary + "\n"
            "Prior Action Summary: " + prior_action + "\n"
            "Requested Action: " + requested_action + "\n"
            "Locale/Context: " + locale_context + "\n\n"
            "## Your Task\n"
            "Review whether the reported content violates the selected rule. Consider proportionality, "
            "context, prior history, and whether the report appears malicious or low-quality.\n\n"
            "Return ONLY a valid JSON object:\n"
            '{"decision":"VIOLATION_FOUND","ruleMatched":"' + selected_rule_id + '",'
            '"severity":"MEDIUM","recommendedAction":"WARNING","confidence":0.80,'
            '"reasoning":"Concise non-inflammatory explanation.",'
            '"statementOfReasons":{"policyBasis":"Rule title and ID",'
            '"factsConsidered":["fact 1","fact 2"],'
            '"whyActionIsProportional":"Explanation of proportionality.",'
            '"appealAvailable":true},'
            '"safetyFlags":[],"consistencyNotes":"How this compares to similar cases."}\n\n'
            "decision must be one of: NO_VIOLATION, VIOLATION_FOUND, INSUFFICIENT_CONTEXT, "
            "MALICIOUS_REPORT_SUSPECTED, NEEDS_HUMAN_ESCALATION, POLICY_AMBIGUOUS\n"
            "severity must be one of: NONE, LOW, MEDIUM, HIGH, CRITICAL\n"
            "recommendedAction must be one of: NO_ACTION, EDUCATIONAL_NOTICE, WARNING, "
            "CONTENT_HIDE, CONTENT_REMOVE, TEMP_MUTE_1H, TEMP_MUTE_24H, TEMP_SUSPEND_7D, "
            "PERMANENT_BAN_REVIEW, ESCALATE_TO_HUMAN, RESTORE_CONTENT, REDUCE_ACTION, UPHOLD_ACTION\n"
            "Return ONLY the JSON object, no markdown fences, no extra text."
        )

        task = (
            "Review this moderation case against the community rulebook and return a structured JSON verdict. "
            "You must decide: was the rule violated, was the action proportional, and what is recommended?"
        )

        criteria = (
            "The output must be a valid JSON object with keys: decision, ruleMatched, severity, "
            "recommendedAction, confidence, reasoning, statementOfReasons, safetyFlags, consistencyNotes. "
            "decision must be one of NO_VIOLATION, VIOLATION_FOUND, INSUFFICIENT_CONTEXT, "
            "MALICIOUS_REPORT_SUSPECTED, NEEDS_HUMAN_ESCALATION, POLICY_AMBIGUOUS. "
            "severity must be one of NONE, LOW, MEDIUM, HIGH, CRITICAL. "
            "confidence must be a float between 0.0 and 1.0. "
            "statementOfReasons must include policyBasis (string), factsConsidered (array of strings), "
            "whyActionIsProportional (string), and appealAvailable (boolean). "
            "The reasoning must be concise and non-inflammatory."
        )

        def nondet_review() -> str:
            return prompt_text

        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_review,
            task=task,
            criteria=criteria,
        )

        verdict = safe_loads(result_raw.strip() if isinstance(result_raw, str) else str(result_raw), None)

        if not verdict or not isinstance(verdict, dict):
            verdict = {
                "decision": "INSUFFICIENT_CONTEXT",
                "ruleMatched": selected_rule_id,
                "severity": "NONE",
                "recommendedAction": "ESCALATE_TO_HUMAN",
                "confidence": 0.0,
                "reasoning": "Could not parse a valid verdict. Escalating to human review.",
                "statementOfReasons": {
                    "policyBasis": selected_rule_id,
                    "factsConsidered": [],
                    "whyActionIsProportional": "Unable to determine proportionality.",
                    "appealAvailable": True,
                },
                "safetyFlags": ["PARSE_ERROR"],
                "consistencyNotes": "",
            }

        if verdict.get("decision") not in ALLOWED_DECISIONS:
            verdict["decision"] = "INSUFFICIENT_CONTEXT"
        if verdict.get("severity") not in ALLOWED_SEVERITY:
            verdict["severity"] = "NONE"
        if verdict.get("recommendedAction") not in ALLOWED_ACTIONS:
            verdict["recommendedAction"] = "ESCALATE_TO_HUMAN"

        verdict["reviewedAt"] = utcnow()
        case["verdict"] = verdict
        case["status"] = "RULED"
        self.cases[case_id] = to_json(case)

        if verdict.get("decision") == "NEEDS_HUMAN_ESCALATION":
            stats = safe_loads(self.stats, {})
            stats["humanEscalations"] = stats.get("humanEscalations", 0) + 1
            self.stats = to_json(stats)

        return to_json({"ok": True, "caseId": case_id, "verdict": verdict})

    # -----------------------------------------------------------------------
    # Appeal Submission
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_appeal(self, appeal_id: str, case_id: str, appeal_packet_json: str) -> str:
        assert appeal_id, "appeal_id required"
        assert case_id in self.cases, "Case not found"
        assert appeal_packet_json, "appeal_packet_json required"
        packet = safe_loads(appeal_packet_json, {})
        record = {
            "id": appeal_id,
            "caseId": case_id,
            "reason": packet.get("reason", ""),
            "missingContext": packet.get("missingContext", ""),
            "counterEvidenceSummary": packet.get("counterEvidenceSummary", ""),
            "requestedOutcome": packet.get("requestedOutcome", "REVERSED"),
            "status": "SUBMITTED",
            "outcome": None,
            "submittedAt": utcnow(),
            "submittedBy": str(gl.message.sender_address),
            "packet": packet,
        }
        self.appeals[appeal_id] = to_json(record)
        case = safe_loads(self.cases[case_id], {})
        case["status"] = "APPEALED"
        case["appealId"] = appeal_id
        self.cases[case_id] = to_json(case)
        stats = safe_loads(self.stats, {})
        stats["totalAppeals"] = stats.get("totalAppeals", 0) + 1
        self.stats = to_json(stats)
        return to_json({"ok": True, "appealId": appeal_id})

    # -----------------------------------------------------------------------
    # GenLayer Intelligent Review — review_appeal
    # -----------------------------------------------------------------------

    @gl.public.write
    def review_appeal(self, appeal_id: str) -> str:
        assert appeal_id in self.appeals, "Appeal not found"

        # Read all storage before nondet
        appeal_raw = self.appeals[appeal_id]
        appeal = safe_loads(appeal_raw, {})
        case_id = appeal.get("caseId", "")
        assert case_id in self.cases, "Original case not found"
        case = safe_loads(self.cases[case_id], {})
        verdict = case.get("verdict", {})
        community_id = case.get("communityId", "")
        rulebook_raw = self.rulebooks.get(community_id, "")
        rulebook = safe_loads(rulebook_raw, {}).get("rulebook", {})

        appeal_reason = appeal.get("reason", "")
        missing_context = appeal.get("missingContext", "")
        counter_evidence = appeal.get("counterEvidenceSummary", "")
        requested_outcome = appeal.get("requestedOutcome", "")
        content_type = case.get("contentType", "")
        context_summary = case.get("contextSummary", "")
        prior_action = case.get("priorActionSummary", "")
        verdict_json = to_json(verdict)
        rulebook_json = to_json(rulebook) if rulebook else "No formal rulebook registered."

        prompt_text = (
            "You are a fair appeal reviewer for a community or game moderation system.\n\n"
            "## Original Verdict\n" + verdict_json + "\n\n"
            "## Appeal Submission\n"
            "Reason: " + appeal_reason + "\n"
            "Missing Context: " + missing_context + "\n"
            "Counter Evidence Summary: " + counter_evidence + "\n"
            "Requested Outcome: " + requested_outcome + "\n\n"
            "## Original Case Summary\n"
            "Content Type: " + content_type + "\n"
            "Context Summary: " + context_summary + "\n"
            "Prior Action Summary: " + prior_action + "\n\n"
            "## Community Rulebook\n" + rulebook_json + "\n\n"
            "## Your Task\n"
            "Review the appeal against the original verdict. Does the appeal introduce genuinely new context? "
            "Was the original decision clearly wrong? Was the action disproportionate? "
            "Is the appeal credible or deflection?\n\n"
            "Return ONLY a valid JSON object:\n"
            '{"outcome":"UPHELD","reasoning":"Concise explanation.",'
            '"originalDecision":"VIOLATION_FOUND","revisedAction":"WARNING",'
            '"confidence":0.80,"notes":"Additional notes."}\n\n'
            "outcome must be one of: UPHELD, REDUCED, REVERSED, REVIEW_AGAIN_WITH_MORE_CONTEXT, ESCALATED\n"
            "Return ONLY the JSON object, no markdown fences, no extra text."
        )

        task = (
            "Review this moderation appeal against the original verdict and rulebook. "
            "Determine whether the appeal should be upheld, reduced, reversed, needs more context, or escalated."
        )

        criteria = (
            "The output must be a valid JSON object with keys: outcome, reasoning, originalDecision, "
            "revisedAction, confidence, notes. "
            "outcome must be one of UPHELD, REDUCED, REVERSED, REVIEW_AGAIN_WITH_MORE_CONTEXT, ESCALATED. "
            "confidence must be a float between 0.0 and 1.0. "
            "reasoning must be concise and non-inflammatory."
        )

        def nondet_appeal() -> str:
            return prompt_text

        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_appeal,
            task=task,
            criteria=criteria,
        )

        outcome = safe_loads(result_raw.strip() if isinstance(result_raw, str) else str(result_raw), None)

        if not outcome or not isinstance(outcome, dict):
            outcome = {
                "outcome": "REVIEW_AGAIN_WITH_MORE_CONTEXT",
                "reasoning": "Could not parse appeal outcome. Requires further review.",
                "originalDecision": verdict.get("decision", ""),
                "revisedAction": verdict.get("recommendedAction", "ESCALATE_TO_HUMAN"),
                "confidence": 0.0,
                "notes": "Parse error — escalating.",
            }

        if outcome.get("outcome") not in ALLOWED_APPEAL_OUTCOMES:
            outcome["outcome"] = "REVIEW_AGAIN_WITH_MORE_CONTEXT"

        outcome["reviewedAt"] = utcnow()
        appeal["outcome"] = outcome
        appeal["status"] = "REVIEWED"
        self.appeals[appeal_id] = to_json(appeal)

        if outcome.get("outcome") in ("REVERSED", "REDUCED"):
            stats = safe_loads(self.stats, {})
            stats["totalReversals"] = stats.get("totalReversals", 0) + 1
            self.stats = to_json(stats)
            new_status = "APPEAL_REVERSED" if outcome["outcome"] == "REVERSED" else "APPEAL_REDUCED"
            case["status"] = new_status
            self.cases[case_id] = to_json(case)

        return to_json({"ok": True, "appealId": appeal_id, "outcome": outcome})

    # -----------------------------------------------------------------------
    # Report Quality Review
    # -----------------------------------------------------------------------

    @gl.public.write
    def review_report_quality(self, case_id: str) -> str:
        assert case_id in self.cases, "Case not found"

        case_raw = self.cases[case_id]
        case = safe_loads(case_raw, {})
        packet = case.get("packet", {})

        content_type = case.get("contentType", "")
        selected_rule = case.get("selectedRuleId", "")
        context_summary = case.get("contextSummary", "")
        reported_excerpt = packet.get("reportedContentExcerpt", "")
        prior_action = case.get("priorActionSummary", "")
        requested_action = case.get("requestedAction", "")

        prompt_text = (
            "You are reviewing a moderation report to determine whether it is legitimate, malicious, or low quality.\n\n"
            "## Report Details\n"
            "Content Type: " + content_type + "\n"
            "Selected Rule: " + selected_rule + "\n"
            "Context Summary: " + context_summary + "\n"
            "Reported Content Excerpt: " + reported_excerpt + "\n"
            "Prior Action Summary: " + prior_action + "\n"
            "Requested Action: " + requested_action + "\n\n"
            "Return ONLY a valid JSON object:\n"
            '{"quality":"LEGITIMATE","flags":[],"confidence":0.85,"notes":"Brief assessment."}\n\n'
            "quality must be one of: LEGITIMATE, LOW_QUALITY, POTENTIALLY_MALICIOUS, MALICIOUS, INSUFFICIENT_INFORMATION\n"
            "flags may include: INCOMPLETE_EVIDENCE, APPEARS_RETALIATORY, VAGUE_CONTEXT, RULE_MISMATCH, REPEAT_REPORTER\n"
            "Return ONLY the JSON object, no markdown fences."
        )

        task = "Assess whether this moderation report is legitimate, low-quality, or potentially malicious."

        criteria = (
            "The output must be a valid JSON object with keys: quality, flags, confidence, notes. "
            "quality must be one of LEGITIMATE, LOW_QUALITY, POTENTIALLY_MALICIOUS, MALICIOUS, INSUFFICIENT_INFORMATION. "
            "flags must be an array (may be empty). confidence must be a float between 0.0 and 1.0."
        )

        def nondet_quality() -> str:
            return prompt_text

        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_quality,
            task=task,
            criteria=criteria,
        )

        quality = safe_loads(
            result_raw.strip() if isinstance(result_raw, str) else str(result_raw),
            {"quality": "INSUFFICIENT_INFORMATION", "flags": [], "confidence": 0.0, "notes": ""}
        )
        quality["reviewedAt"] = utcnow()

        case["reportQuality"] = quality
        self.cases[case_id] = to_json(case)
        return to_json({"ok": True, "caseId": case_id, "reportQuality": quality})

    # -----------------------------------------------------------------------
    # Consistency Comparison
    # -----------------------------------------------------------------------

    @gl.public.write
    def compare_case_consistency(self, case_id: str, comparison_packet_json: str) -> str:
        assert case_id in self.cases, "Case not found"

        case_raw = self.cases[case_id]
        case = safe_loads(case_raw, {})
        verdict = case.get("verdict", {})
        comparison = safe_loads(comparison_packet_json, {})
        selected_rule = case.get("selectedRuleId", "")
        prior_cases = comparison.get("priorCases", [])

        verdict_json = to_json(verdict)
        prior_cases_json = to_json(prior_cases)

        prompt_text = (
            "You are reviewing moderation consistency across cases.\n\n"
            "## Current Case Verdict\n" + verdict_json + "\n\n"
            "## Comparison Cases\n" + prior_cases_json + "\n\n"
            "## Rule Being Applied\n" + selected_rule + "\n\n"
            "Assess whether the current verdict is consistent with the comparison cases under the same rule.\n\n"
            "Return ONLY a valid JSON object:\n"
            '{"consistencyScore":0.85,"assessment":"CONSISTENT","driftDetected":false,'
            '"notes":"Explanation of consistency or inconsistency.","suggestedAdjustment":null}\n\n'
            "assessment must be one of: CONSISTENT, MINOR_DRIFT, SIGNIFICANT_DRIFT, INCONSISTENT, INSUFFICIENT_COMPARISON_DATA\n"
            "Return ONLY the JSON object, no markdown fences."
        )

        task = "Compare this moderation verdict against prior cases under the same rule and assess consistency."

        criteria = (
            "The output must be a valid JSON object with keys: consistencyScore, assessment, driftDetected, notes, suggestedAdjustment. "
            "assessment must be one of CONSISTENT, MINOR_DRIFT, SIGNIFICANT_DRIFT, INCONSISTENT, INSUFFICIENT_COMPARISON_DATA. "
            "consistencyScore must be a float between 0.0 and 1.0. driftDetected must be a boolean."
        )

        def nondet_consistency() -> str:
            return prompt_text

        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_consistency,
            task=task,
            criteria=criteria,
        )

        consistency = safe_loads(
            result_raw.strip() if isinstance(result_raw, str) else str(result_raw),
            {
                "consistencyScore": 0.0,
                "assessment": "INSUFFICIENT_COMPARISON_DATA",
                "driftDetected": False,
                "notes": "Could not assess consistency.",
                "suggestedAdjustment": None,
            }
        )
        consistency["reviewedAt"] = utcnow()

        case["consistencyReview"] = consistency
        self.cases[case_id] = to_json(case)
        return to_json({"ok": True, "caseId": case_id, "consistency": consistency})

    # -----------------------------------------------------------------------
    # Read Methods
    # -----------------------------------------------------------------------

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases.get(case_id, to_json({"error": "not found"}))

    @gl.public.view
    def get_appeal(self, appeal_id: str) -> str:
        return self.appeals.get(appeal_id, to_json({"error": "not found"}))

    @gl.public.view
    def get_rulebook(self, community_id: str) -> str:
        return self.rulebooks.get(community_id, to_json({"error": "not found"}))

    @gl.public.view
    def get_community(self, community_id: str) -> str:
        return self.communities.get(community_id, to_json({"error": "not found"}))

    @gl.public.view
    def get_community_cases(self, community_id: str) -> str:
        return self.community_cases.get(community_id, "[]")

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return self.stats
