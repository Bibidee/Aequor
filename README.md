# Aequor

**Transparent moderation arbitration for communities and games, powered by GenLayer AI-validator consensus.**

Community moderators submit cases against a registered rulebook. GenLayer validators reach consensus on whether a rule was violated, recommend an action, and produce a structured ruling with full reasoning. The respondent can file an on-chain appeal — only their wallet can do so. The original complainant triggers the appeal review, which goes back through validator consensus. All rulings and appeal outcomes are stored on-chain and readable at any time.

No human arbitrator. No opaque decisions. Every ruling is appealable, every outcome is traceable, and every verdict includes the policy basis, facts considered, and proportionality reasoning.

Built for gaming guilds, DAOs, forums, and creator communities that need moderation they can defend.

---

## What Aequor Is Not

- Not a censorship bot or automated ban machine
- Not a single-AI classifier
- Not a centralized moderation service
- No backend, no database, no indexer — frontend + GenLayer contract only

---

## Why GenLayer

Moderation arbitration requires interpretation, context, proportionality, and consistency. A deterministic smart contract cannot decide whether a chat message is harassment, whether a gaming clip shows griefing, or whether a ban was disproportionate.

GenLayer validators independently evaluate each case packet against the community rulebook and reach consensus — not a single AI decision but a distributed consensus process.

---

## What the Contract Judges

The `AequorModeration` Intelligent Contract evaluates:

1. Did the reported content violate the selected rule?
2. Was the selected rule the most appropriate?
3. Was the enforcement action proportional?
4. Does the appeal introduce enough new context to reduce or reverse the ruling?
5. Is the report malicious or low-quality?

---

## What Is Stored On-Chain

- Community metadata and rulebook hash
- Case packet summary (not raw evidence)
- Evidence hashes
- Structured verdict — decision, severity, recommended action, confidence, reasoning
- Statement of Reasons — policy basis, facts considered, proportionality
- Respondent identity (Discord handle, wallet)
- Appeal submission and outcome
- Appeal verdict and reasoning summary

## What Is NOT Stored On-Chain

- Raw evidence (chat logs, screenshots, clips)
- Full private message content
- Personal identifying information

---

## Appeal Flow

1. Respondent wallet files appeal — reason, missing context, counter-evidence, requested outcome
2. Complainant wallet triggers `review_appeal()` on GenLayer
3. Validators re-evaluate with original verdict and appeal context
4. Outcome stored on-chain: UPHELD, REDUCED, or REVERSED
5. Case page shows appeal result immediately — refresh-safe, reads from contract getter

Appeals are wallet-gated. Only the respondent wallet recorded at case creation can file. Only the complainant wallet can trigger the appeal review.

---

## How to Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

Requires MetaMask or Rabby connected to GenLayer Studionet (chain ID 61999).

---

## Environment

```env
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x4EfDCd33E762cC178D7781613a7Abd7CeDbA8c26
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
```

---

## Contract

```
contract/AequorModeration.py
Network: GenLayer Studionet
Address: 0x4EfDCd33E762cC178D7781613a7Abd7CeDbA8c26
```

---

## Stack

- Next.js 16 App Router
- GenLayer JS SDK (`genlayer-js`)
- Tailwind CSS v4
- Injected wallet only (MetaMask / Rabby)
- No Privy, no WalletConnect, no backend, no database
