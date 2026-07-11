# Response to Review

> The moderation verdicts rely on party-supplied summaries and hashes, while rulebooks, cases, and repeat reviews lack protections against unauthorized mutation. For a stronger version, bind cases to immutable policies and authentic reviewable evidence, then enforce the stated owner and appeal lifecycle.

This document responds to each point directly, describes the fix, and shows the on-chain test evidence used to verify it.

## 1. Party-supplied summaries and hashes were trusted without verification

**Fix:** `submit_case` now accepts `evidenceItems` (URL + optional claimed hash). The contract independently fetches each URL with `gl.nondet.web.get()` and computes its hash on-chain. If a hash was claimed, it must match exactly; if not, the first successful fetch becomes the canonical, on-chain-recorded hash. Only content that passes this check is marked `VERIFIED` and passed into the LLM's review prompt as ground truth — unverified claims are explicitly flagged as unproven.

**Verified on-chain:**
- A case submitted with a real URL (`https://example.com/`) and no claimed hash: fetched successfully, `hashMatch: true`, and the real fetched HTML was stored as the verified excerpt.
- A second case submitted with the same URL but a deliberately wrong claimed hash: `hashMatch: false`, and its excerpt was withheld from the LLM prompt entirely.

## 2. Rulebooks, cases, and repeat reviews lacked protection against unauthorized mutation

**Fix — rulebook immutability:** `submit_case` now snapshots the full rulebook (content, hash, and version) into the case record at filing time. `review_case` and `review_appeal` always judge against that frozen snapshot, never the live rulebook. A later `register_rulebook` call can no longer retroactively change the policy a pending or resolved case is judged against.

**Verified on-chain:** A case was filed against rulebook v1. The rulebook was then republished as v2 with materially different wording. Re-reading the case afterward confirmed its snapshot was still v1, word-for-word, while `get_rulebook` correctly returned v2 as the live version.

**Fix — repeat/duplicate reviews:** `review_case`, `review_appeal`, `review_report_quality`, and `compare_case_consistency` now assert the case/appeal is still in its expected starting state before running, and lock it afterward. A second call on an already-resolved case or appeal is rejected instead of silently overwriting the prior verdict.

**Verified on-chain:** Re-invoking `review_case` on an already-`RULED` case, and `review_appeal` on an already-`REVIEWED` appeal, both left state unchanged (confirmed by re-reading the case/appeal after the second call).

**Fix — fabricated consistency data:** `compare_case_consistency` previously accepted caller-supplied "prior case" JSON directly. It now takes only case IDs and pulls the actual verdict from the contract's own storage, filtered to the same community and rule.

**Verified on-chain:** Consistency review for case A compared against case B by ID, using verdict data read from contract storage.

## 3. Enforce the stated owner

**Fix:** Every state-changing review action (`register_rulebook`, `review_case`, `review_appeal`, `review_report_quality`, `compare_case_consistency`) now requires the caller to be the community's registered owner. Appeals require the caller to be the case's respondent wallet.

**Verified on-chain (all confirmed via state, not just error handling — GenVM accepts the transaction but reverts the state change on a failed `assert`):**
- A non-owner wallet's attempt to publish a rulebook did not change the rulebook version.
- A non-owner wallet's attempt to review a case left it in `SUBMITTED` with no verdict.
- A non-respondent wallet's attempt to file an appeal was rejected; the actual respondent's appeal succeeded.
- A non-owner wallet's attempt to review that appeal left it unresolved.

## 4. Enforce the appeal lifecycle

**Fix:** Communities set an `appealWindowHours` value at registration. `submit_appeal` now checks elapsed time since the verdict was reviewed against that window and rejects late appeals. This field previously existed in storage but was never read anywhere.

## A note on the LLM verdict mechanism

We initially built all four verdict-issuing LLM calls (`review_case`, `review_appeal`, `review_report_quality`, `compare_case_consistency`) on the **Comparative Equivalence Principle** — leader and validators each independently re-run the same prompt and must agree exactly on the decision fields.

On-chain testing caught a real problem with this: `review_case` hung indefinitely. A direct query of the transaction showed it stuck `PENDING` with `result_name: NO_MAJORITY` — validators legitimately reached different subjective judgments (e.g. differing severity) on the same case text, so exact-field consensus never resolved.

We kept the Comparative Equivalence Principle where it fits — evidence hash verification, which is a derived boolean fact, not a subjective judgment — and reverted the four verdict-issuing calls to the **Non-Comparative Equivalence Principle**, where validators grade the leader's output against explicit criteria instead of requiring byte-identical independent outputs. This is the standard, documented pattern for qualitative LLM judgments in GenLayer contracts, and it resolved the hang.

## End-to-end test evidence

All fixes above were verified against a live deployment on GenLayer Studionet, using three freshly generated wallets (deployer/community owner, complainant, respondent) and real data — a real fetched webpage as evidence, real rule text, real case narratives, and real LLM-produced verdicts:

- Case A (evidence didn't corroborate the claim) → verdict: `INSUFFICIENT_CONTEXT`
- Case B (single non-repeated reply) → verdict: `NO_VIOLATION`
- Appeal on case A reviewed and resolved with a reasoned outcome
- Report-quality and cross-case consistency reviews both ran and returned coherent, non-placeholder assessments

18 of 18 state-based checks passed.

## Frontend: making the on-chain state actually visible

A correct contract is only as transparent as the interface reading it. The frontend previously read most of its data (communities, rulebooks, cases, appeals) from `localStorage`, populated only by whatever the current browser had itself submitted — so on-chain activity from other sessions, wallets, or scripts was invisible, and clearing the browser cache made real on-chain data disappear from the UI entirely.

**Fix:** Added an on-chain enumeration index to the contract (`list_communities`, `get_communities_by_owner`, since the underlying storage had no native iteration), and a full protocol sync in the frontend that pulls every community, rulebook, case, and appeal directly from the contract's public read methods on page load and on demand (a global "Sync" control), replacing `localStorage` as the source of truth.

**Verified:** loaded the app with no wallet connected — Overview, Rulebooks, Arbitration, Appeals, Consistency, and Transparency all correctly displayed real cases, verdicts, appeal outcomes, and rulebook rules from prior on-chain test runs, none of which were ever submitted through that browser.

**Current deployed contract:** `contract/AequorModeration.py`, GenLayer Studionet, address `0xe7B20f682d2f2872Af73DF0CD29281175c906afc`.
