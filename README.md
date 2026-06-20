# Aequor

**Transparent moderation rulings, powered by GenLayer consensus.**

Aequor is a GenLayer-native moderation arbitration layer for communities and games. It uses AI-validator consensus to review disputed or high-impact moderation cases against a community rulebook, produce explainable decisions, support appeals, and track consistency over time.

---

## What Aequor Is

Aequor is a moderation arbitration layer for communities and games. It is **not** a censorship bot, AI classifier, or automated ban machine. It is a structured arbitration system where GenLayer validators interpret your community rulebook and submitted evidence to produce transparent, rulebook-linked, appealable decisions.

---

## What Problem It Solves

Moderation decisions are hard because they involve context, intent, culture, game-specific rules, history, and proportional enforcement. A normal smart contract cannot decide whether a chat message is harassment, whether a gaming clip shows griefing, or whether a ban was disproportionate.

GenLayer is valuable here because moderation arbitration is judgement-heavy.

---

## Why GenLayer Is Needed

Moderation arbitration requires interpretation, context, proportionality, and consistency. Aequor uses GenLayer Intelligent Contracts for these judgement-heavy decisions while keeping raw evidence and operational UI off-chain.

GenLayer validators independently evaluate the same case packet against the rulebook and reach consensus — not a single AI decision but a distributed consensus process.

---

## What the Contract Judges

The `AequorModeration` GenLayer Intelligent Contract evaluates:

1. Did the reported content violate the selected rule?
2. Was the selected rule the most appropriate?
3. Was the enforcement action proportional?
4. Does the user's appeal introduce enough context to reduce or reverse the action?
5. Is the report malicious or low-quality?
6. Is the ruling consistent with prior cases?

---

## What Is Stored On-Chain

- Community metadata
- Rulebook hash
- Case packet summary (not raw evidence)
- Evidence hashes
- Structured verdict (decision, severity, recommended action, confidence, reasoning)
- Statement of Reasons
- Appeal submission and outcome
- Protocol statistics

## What Is NOT Stored On-Chain

- Raw evidence (chat logs, screenshots, clips)
- Full private message content
- Personal identifying information

---

## How Appeals Work

1. Affected user files appeal: reason, missing context, counter-evidence summary, requested outcome.
2. Aequor calls `review_appeal(appeal_id)` on GenLayer.
3. Validators evaluate with original verdict.
4. Outcome: UPHELD, REDUCED, REVERSED, REVIEW_AGAIN_WITH_MORE_CONTEXT, or ESCALATED.

---

## How Transparency Works

The Transparency dashboard shows public aggregate metrics only — no private case details.

---

## How to Run Locally

```bash
cd aequor
npm install
npm run dev
```

Open http://localhost:3000

---

## How to Deploy Contract

```bash
genlayer deploy --contract contract/AequorModeration.py --network studionet
```

Set `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env.local`.

---

## How to Connect Injected Wallet

1. Install MetaMask or Rabby
2. Click "Connect Wallet"
3. Switch to GenLayer Studionet if prompted

No Privy. No email login. No WalletConnect.

---

## Safety and Abuse Boundaries

- Raw evidence never stored on-chain
- High-risk content: "High-risk evidence withheld. Manual/legal escalation required."
- Appeals always available
- AI automation disclosed in every ruling
- No user ranking or shame boards
- No external AI APIs — GenLayer only

---

## Demo Walkthrough

```
Landing page → Connect wallet → Create Community → Register Rulebook
→ Submit Case → View Evidence Hashes → Call review_case()
→ View Validator Trace + Verdict → Read Statement of Reasons
→ File Appeal → Call review_appeal() → View Transparency Dashboard
→ Open Playground
```

---

## Why This Is GenLayer-Native

Content moderation is not purely deterministic. It requires judgement, context, proportionality, appealability, and consistency — exactly where GenLayer Intelligent Contracts outperform deterministic smart contracts.

Aequor uses GenLayer only for judgement-heavy decisions. Everything operational stays off-chain.

**GenLayer-native moderation arbitration for communities and games — transparent, appealable, rulebook-linked, and consistency-aware.**
