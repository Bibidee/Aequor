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
#
# Trust model:
#   - Cases are bound to an immutable snapshot of the rulebook that was in
#     effect at submission time, so a later rulebook edit can never change
#     the policy a case is judged against.
#   - Evidence URLs are independently fetched by leader + validators
#     (gl.nondet.web) and their hash is verified against the submitter's
#     claimed hash before the LLM ever sees the content as "verified".
#   - State-changing review/appeal actions are gated to the community owner
#     or the relevant case party, and can only run once per lifecycle stage.
#   - Evidence hash verification uses the Comparative Equivalence Principle
#     (leader + validators independently fetch and must agree on the derived
#     hash-match outcome). Subjective LLM verdicts (severity/decision/action)
#     use the Non-Comparative Equivalence Principle instead: validators grade
#     the leader's output against explicit criteria. Comparative consensus
#     was tried for verdicts first but real validators legitimately reach
#     different judgments on the same subjective text, so exact-field
#     consensus never reached majority in testing.
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

MAX_EVIDENCE_ITEMS = 5
EVIDENCE_EXCERPT_CHARS = 1200


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


def hours_between(start_iso: str, end_iso: str) -> float:
    try:
        start = datetime.fromisoformat(start_iso)
        end = datetime.fromisoformat(end_iso)
        return (end - start).total_seconds() / 3600.0
    except Exception:
        return 0.0


class AequorModeration(gl.Contract):
    # --- Storage fields (class-level annotations, initialised in __init__) ---
    communities: TreeMap[str, str]
    rulebooks: TreeMap[str, str]
    cases: TreeMap[str, str]
    appeals: TreeMap[str, str]
    community_cases: TreeMap[str, str]
    # Enumeration indexes — the contract's dict-style storage (TreeMap) has no
    # native iteration/listing primitive, so we maintain explicit indexes
    # alongside it: a flat list of every community ID, and a per-owner list,
    # so the frontend can discover "what communities exist" / "what does
    # wallet X own" without already knowing IDs out of band (e.g. localStorage).
    all_community_ids: DynArray[str]
    owner_communities: TreeMap[str, str]
    stats: str

    def __init__(self) -> None:
        self.communities = TreeMap()
        self.rulebooks = TreeMap()
        self.cases = TreeMap()
        self.appeals = TreeMap()
        self.community_cases = TreeMap()
        self.owner_communities = TreeMap()
        # all_community_ids (DynArray[str]) is left at its zero-initialized
        # empty default — DynArray cannot be manually instantiated in __init__.
        self.stats = to_json({
            "totalCommunities": 0,
            "totalCases": 0,
            "totalAppeals": 0,
            "totalReversals": 0,
            "humanEscalations": 0,
        })

    # -----------------------------------------------------------------------
    # Internal helpers
    # -----------------------------------------------------------------------

    def _get_community(self, community_id: str) -> dict:
        comm = safe_loads(self.communities.get(community_id, ""), None)
        assert comm, "Community not found"
        return comm

    def _require_owner(self, community_id: str) -> dict:
        comm = self._get_community(community_id)
        caller = str(gl.message.sender_address)
        owner = comm.get("owner", "")
        assert owner and caller.lower() == owner.lower(), \
            "Only the community owner can perform this action"
        return comm

    def _verify_evidence_item(self, url: str, expected_hash: str) -> dict:
        """Fetch a party-supplied evidence URL and verify it against the claimed
        hash using the Comparative Equivalence Principle: leader and validators
        each fetch independently and must agree on the derived hash-match
        outcome, not the raw bytes (which may vary run to run)."""

        def leader_fn():
            try:
                response = gl.nondet.web.get(url)
                content = response.body.decode("utf-8", errors="ignore")
                fetch_ok = True
            except Exception:
                content = ""
                fetch_ok = False
            computed_hash = sha256_str(content) if fetch_ok else ""
            if not fetch_ok:
                verified = False
            elif expected_hash:
                # Party claimed a specific hash — content must match it exactly.
                verified = computed_hash == expected_hash
            else:
                # No claimed hash: the first successful fetch becomes the
                # canonical, on-chain-recorded hash for this evidence URL.
                verified = True
            return {
                "fetchOk": fetch_ok,
                "hashMatch": verified,
                "computedHash": computed_hash,
                "excerpt": content[:EVIDENCE_EXCERPT_CHARS],
            }

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            mine = leader_fn()
            theirs = leaders_res.calldata
            return (
                mine.get("fetchOk") == theirs.get("fetchOk")
                and mine.get("hashMatch") == theirs.get("hashMatch")
            )

        try:
            return gl.vm.run_nondet(leader_fn, validator_fn)
        except Exception:
            return {"fetchOk": False, "hashMatch": False, "computedHash": "", "excerpt": ""}

    def _run_verdict_prompt(self, prompt_text: str, task: str, criteria: str) -> dict:
        """Run a subjective LLM judgment (severity/decision/action classification)
        under the Non-Comparative Equivalence Principle: validators grade the
        leader's output against explicit criteria instead of requiring every
        validator's independent LLM call to produce byte-identical fields.

        We tried the Comparative Equivalence Principle here first (leader and
        validators independently re-running the prompt and requiring exact
        field agreement), but real validators legitimately reach different
        severity/action judgments on the same subjective text, so consensus
        never reaches majority (observed on-chain as an indefinitely PENDING
        transaction with result_name=NO_MAJORITY). Comparative consensus is
        reserved for quantifiable/derived-boolean outputs elsewhere in this
        contract (see _verify_evidence_item's hash-match check)."""

        def nondet_fn() -> str:
            return prompt_text

        result_raw = gl.eq_principle.prompt_non_comparative(
            nondet_fn,
            task=task,
            criteria=criteria,
        )
        parsed = safe_loads(result_raw.strip() if isinstance(result_raw, str) else str(result_raw), None)
        return parsed if isinstance(parsed, dict) else {}

    # -----------------------------------------------------------------------
    # Community & Rulebook
    # -----------------------------------------------------------------------

    @gl.public.write
    def register_community(self, community_id: str, profile_json: str, rulebook_hash: str) -> str:
        assert community_id, "community_id required"
        assert profile_json, "profile_json required"
        assert community_id not in self.communities, "Community already registered"
        profile = safe_loads(profile_json, {})
        record = {
            "id": community_id,
            "owner": str(gl.message.sender_address),
            "name": profile.get("name", community_id),
            "category": profile.get("category", "OTHER"),
            "moderationStyle": profile.get("moderationStyle", "BALANCED"),
            "rulebookHash": rulebook_hash or "",
            "rulebookVersion": 0,
            "appealWindowHours": int(profile.get("appealWindowHours", 72)),
            "createdAt": utcnow(),
        }
        self.communities[community_id] = to_json(record)
        self.all_community_ids.append(community_id)
        owner_key = record["owner"].lower()
        owner_ids = safe_loads(self.owner_communities.get(owner_key, "[]"), [])
        owner_ids.append(community_id)
        self.owner_communities[owner_key] = to_json(owner_ids)
        stats = safe_loads(self.stats, {})
        stats["totalCommunities"] = stats.get("totalCommunities", 0) + 1
        self.stats = to_json(stats)
        return to_json({"ok": True, "communityId": community_id})

    @gl.public.write
    def register_rulebook(self, community_id: str, rulebook_json: str, rulebook_hash: str) -> str:
        assert rulebook_json, "rulebook_json required"
        comm = self._require_owner(community_id)
        next_version = int(comm.get("rulebookVersion", 0)) + 1
        computed_hash = rulebook_hash or sha256_str(rulebook_json)
        record = {
            "communityId": community_id,
            "version": next_version,
            "rulebook": safe_loads(rulebook_json, {}),
            "rulebookHash": computed_hash,
            "registeredAt": utcnow(),
            "registeredBy": str(gl.message.sender_address),
        }
        # Publishing a new rulebook version never mutates rulebooks already
        # bound to a case: cases snapshot the version they were filed under
        # in submit_case, so this only affects cases filed after this point.
        self.rulebooks[community_id] = to_json(record)
        comm["rulebookHash"] = computed_hash
        comm["rulebookVersion"] = next_version
        self.communities[community_id] = to_json(comm)
        return to_json({"ok": True, "rulebookHash": computed_hash, "version": next_version})

    # -----------------------------------------------------------------------
    # Case Submission
    # -----------------------------------------------------------------------

    @gl.public.write
    def submit_case(self, case_id: str, case_packet_json: str, evidence_hash: str) -> str:
        assert case_id, "case_id required"
        assert case_id not in self.cases, "Case already exists"
        assert case_packet_json, "case_packet_json required"
        packet = safe_loads(case_packet_json, {})
        community_id = packet.get("communityId", "")
        assert community_id in self.communities, "Community not found"
        respondent_discord = packet.get("respondentDiscord", "")
        respondent_wallet = packet.get("respondentWallet", "")
        respondent_note = packet.get("respondentNote", "")
        assert respondent_discord, "respondent Discord handle is required"

        # Bind this case to an immutable snapshot of the rulebook as it
        # exists right now. Later register_rulebook calls cannot retroactively
        # change what this case is judged against.
        rulebook_raw = self.rulebooks.get(community_id, "")
        rulebook_record = safe_loads(rulebook_raw, {})
        rulebook_snapshot = rulebook_record.get("rulebook", {})
        rulebook_version = rulebook_record.get("version", 0)
        rulebook_hash_snapshot = rulebook_record.get("rulebookHash", "")

        # Verify party-supplied evidence: fetch each claimed URL and confirm
        # its hash matches what was submitted, instead of trusting the
        # claimed hash/summary outright.
        evidence_items = packet.get("evidenceItems", [])
        if not evidence_items:
            evidence_urls = packet.get("evidenceUrls", [])
            evidence_hashes = packet.get("evidenceHashes", [])
            evidence_items = [
                {"url": u, "hash": h}
                for u, h in zip(evidence_urls, evidence_hashes)
            ]
        evidence_items = evidence_items[:MAX_EVIDENCE_ITEMS]

        verified_evidence = []
        for item in evidence_items:
            url = (item or {}).get("url", "")
            claimed_hash = (item or {}).get("hash", "")
            if not url:
                continue
            verification = self._verify_evidence_item(url, claimed_hash)
            verified_evidence.append({
                "url": url,
                "claimedHash": claimed_hash,
                "fetchOk": verification.get("fetchOk", False),
                "hashMatch": verification.get("hashMatch", False),
                "verifiedExcerpt": verification.get("excerpt", "") if verification.get("hashMatch") else "",
            })

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
            "verifiedEvidence": verified_evidence,
            "requestedAction": packet.get("requestedAction", ""),
            "priorActionSummary": packet.get("priorActionSummary", ""),
            "localeContext": packet.get("localeContext", ""),
            "respondentDiscord": respondent_discord,
            "respondentWallet": respondent_wallet,
            "respondentNote": respondent_note,
            "complainantWallet": str(gl.message.sender_address),
            "status": "SUBMITTED",
            "reviewStatus": "NOT_STARTED",
            "appealStatus": "NO_APPEAL",
            "verdict": None,
            "rulebookVersion": rulebook_version,
            "rulebookHashSnapshot": rulebook_hash_snapshot,
            "rulebookSnapshot": rulebook_snapshot,
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

        case_raw = self.cases[case_id]
        case = safe_loads(case_raw, {})
        community_id = case.get("communityId", "")
        self._require_owner(community_id)
        assert case.get("status") == "SUBMITTED" and case.get("reviewStatus") == "NOT_STARTED", \
            "Case has already been reviewed"

        # Use the rulebook snapshot bound at submission time — never the
        # live (possibly since-mutated) rulebook.
        rulebook = case.get("rulebookSnapshot", {})

        packet = case.get("packet", {})
        selected_rule_id = case.get("selectedRuleId", "")
        content_type = case.get("contentType", "")
        context_summary = case.get("contextSummary", "")
        prior_action = case.get("priorActionSummary", "")
        requested_action = case.get("requestedAction", "")
        locale_context = case.get("localeContext", "")
        reported_excerpt = packet.get("reportedContentExcerpt", "")

        verified_evidence = case.get("verifiedEvidence", [])
        if verified_evidence:
            verified_lines = []
            for item in verified_evidence:
                if item.get("hashMatch"):
                    verified_lines.append(
                        "VERIFIED (hash matches fetched content): " + item.get("verifiedExcerpt", "")
                    )
                else:
                    verified_lines.append(
                        "UNVERIFIED (fetched content did not match the claimed evidence hash, "
                        "or the URL could not be retrieved) for URL: " + item.get("url", "")
                    )
            verified_evidence_text = "\n".join(verified_lines)
        else:
            verified_evidence_text = "No independently verifiable evidence URLs were submitted."

        rules_text = to_json(rulebook) if rulebook else "No formal rulebook registered."
        rule_obj = rulebook.get(selected_rule_id, {}) if isinstance(rulebook, dict) else {}
        rule_text = to_json(rule_obj) if rule_obj else rules_text

        prompt_text = (
            "You are a fair moderation arbitrator reviewing a case for a community or game platform.\n\n"
            "## Community Rulebook (immutable snapshot bound at case submission)\n" + rules_text + "\n\n"
            "## Selected Rule Being Applied\n"
            "Rule ID: " + selected_rule_id + "\n"
            "Rule Details: " + rule_text + "\n\n"
            "## Independently Verified Evidence\n"
            "The following evidence was fetched directly from the submitted URLs and hash-checked. "
            "Only treat evidence marked VERIFIED as ground truth; treat UNVERIFIED evidence with suspicion "
            "and weigh it no higher than an unproven claim.\n" + verified_evidence_text + "\n\n"
            "## Case Details (party-supplied claims — corroborate against verified evidence above)\n"
            "Content Type: " + content_type + "\n"
            "Reported Content Excerpt (claimed by submitter): " + reported_excerpt + "\n"
            "Context Summary (claimed by submitter): " + context_summary + "\n"
            "Prior Action Summary: " + prior_action + "\n"
            "Requested Action: " + requested_action + "\n"
            "Locale/Context: " + locale_context + "\n\n"
            "## Your Task\n"
            "Review whether the reported content violates the selected rule. Consider proportionality, "
            "context, prior history, and whether the report appears malicious or low-quality. "
            "If key claims are UNVERIFIED and no verified evidence corroborates them, lean toward "
            "INSUFFICIENT_CONTEXT rather than VIOLATION_FOUND.\n\n"
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
        verdict = self._run_verdict_prompt(prompt_text, task, criteria)

        if not verdict:
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
        case["reviewStatus"] = "RESOLVED"
        if case.get("respondentWallet"):
            case["appealStatus"] = "APPEAL_AVAILABLE"
        else:
            case["appealStatus"] = "APPEAL_NOT_ALLOWED"
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
        assert appeal_id not in self.appeals, "Appeal already exists"
        assert case_id in self.cases, "Case not found"
        assert appeal_packet_json, "appeal_packet_json required"
        case = safe_loads(self.cases[case_id], {})
        assert case.get("reviewStatus") == "RESOLVED" or case.get("status") == "RULED", \
            "Case must be resolved before appeal"
        assert case.get("appealStatus") == "APPEAL_AVAILABLE", \
            "Appeal is not available for this case"

        community_id = case.get("communityId", "")
        comm = self._get_community(community_id)
        window_hours = int(comm.get("appealWindowHours", 72))
        verdict = case.get("verdict") or {}
        reviewed_at = verdict.get("reviewedAt", "")
        if reviewed_at:
            elapsed = hours_between(reviewed_at, utcnow())
            assert elapsed <= window_hours, \
                f"Appeal window of {window_hours}h has closed"

        respondent_wallet = case.get("respondentWallet", "")
        caller = str(gl.message.sender_address)
        if respondent_wallet:
            assert caller.lower() == respondent_wallet.lower(), \
                "Only the respondent wallet can file an appeal"
        packet = safe_loads(appeal_packet_json, {})
        assert packet.get("reason", ""), "Appeal reason is required"
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
            "submittedBy": caller,
            "appellantDiscord": packet.get("appellantDiscord", ""),
            "packet": packet,
        }
        self.appeals[appeal_id] = to_json(record)
        case["status"] = "APPEALED"
        case["appealStatus"] = "APPEAL_PENDING"
        case["appealId"] = appeal_id
        case["appealSubmittedBy"] = caller
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

        appeal_raw = self.appeals[appeal_id]
        appeal = safe_loads(appeal_raw, {})
        assert appeal.get("status") == "SUBMITTED", "Appeal has already been reviewed"
        case_id = appeal.get("caseId", "")
        assert case_id in self.cases, "Original case not found"
        case = safe_loads(self.cases[case_id], {})
        community_id = case.get("communityId", "")
        self._require_owner(community_id)

        verdict = case.get("verdict", {})
        # Use the same immutable rulebook snapshot the original verdict was
        # judged against — an appeal must be evaluated against the same
        # policy version, not whatever the rulebook has since become.
        rulebook = case.get("rulebookSnapshot", {})

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
            "## Community Rulebook (immutable snapshot bound at case submission)\n" + rulebook_json + "\n\n"
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
        outcome = self._run_verdict_prompt(prompt_text, task, criteria)

        if not outcome:
            outcome = {
                "outcome": "REVIEW_AGAIN_WITH_MORE_CONTEXT",
                "reasoning": "Could not parse a valid appeal outcome. Requires further review.",
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

        case["appealStatus"] = "APPEAL_RESOLVED"
        case["appealVerdict"] = outcome.get("outcome", "")
        case["appealReasoningSummary"] = outcome.get("reasoning", "")
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
        community_id = case.get("communityId", "")
        self._require_owner(community_id)
        assert not case.get("reportQuality"), "Report quality has already been reviewed"
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
        quality = self._run_verdict_prompt(prompt_text, task, criteria)

        if not quality:
            quality = {"quality": "INSUFFICIENT_INFORMATION", "flags": [], "confidence": 0.0, "notes": ""}
        quality["reviewedAt"] = utcnow()

        case["reportQuality"] = quality
        self.cases[case_id] = to_json(case)
        return to_json({"ok": True, "caseId": case_id, "reportQuality": quality})

    # -----------------------------------------------------------------------
    # Consistency Comparison
    # -----------------------------------------------------------------------

    @gl.public.write
    def compare_case_consistency(self, case_id: str, comparison_case_ids_json: str) -> str:
        assert case_id in self.cases, "Case not found"

        case_raw = self.cases[case_id]
        case = safe_loads(case_raw, {})
        community_id = case.get("communityId", "")
        self._require_owner(community_id)
        assert not case.get("consistencyReview"), "Consistency has already been reviewed"

        verdict = case.get("verdict", {})
        selected_rule = case.get("selectedRuleId", "")

        # Comparison cases must be real, previously-ruled cases from this
        # contract's own storage — never caller-supplied JSON, which could
        # be fabricated to manufacture a "consistent" appearance.
        comparison_ids = safe_loads(comparison_case_ids_json, [])
        prior_cases = []
        for cid in comparison_ids:
            if cid == case_id or cid not in self.cases:
                continue
            other = safe_loads(self.cases[cid], {})
            if other.get("communityId") != community_id:
                continue
            if other.get("selectedRuleId") != selected_rule:
                continue
            other_verdict = other.get("verdict")
            if not other_verdict:
                continue
            prior_cases.append({"caseId": cid, "verdict": other_verdict})

        verdict_json = to_json(verdict)
        prior_cases_json = to_json(prior_cases)

        prompt_text = (
            "You are reviewing moderation consistency across cases.\n\n"
            "## Current Case Verdict\n" + verdict_json + "\n\n"
            "## Comparison Cases (verified prior rulings from this contract's own records)\n" + prior_cases_json + "\n\n"
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
        consistency = self._run_verdict_prompt(prompt_text, task, criteria)

        if not consistency:
            consistency = {
                "consistencyScore": 0.0,
                "assessment": "INSUFFICIENT_COMPARISON_DATA",
                "driftDetected": False,
                "notes": "Could not parse a valid consistency assessment.",
                "suggestedAdjustment": None,
            }
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
    def list_communities(self) -> str:
        """All registered community IDs, in registration order."""
        return to_json([cid for cid in self.all_community_ids])

    @gl.public.view
    def get_communities_by_owner(self, owner_address: str) -> str:
        """Community IDs owned by the given wallet, so the frontend can
        discover a wallet's communities without already knowing their IDs."""
        return self.owner_communities.get(owner_address.lower(), "[]")

    @gl.public.view
    def get_community_cases(self, community_id: str) -> str:
        return self.community_cases.get(community_id, "[]")

    @gl.public.view
    def get_protocol_stats(self) -> str:
        return self.stats
