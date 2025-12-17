# A deeper look into the design of the Grandfathering security model

## Table of Contents

- [A deeper look into the design of the Grandfathering security model](#a-deeper-look-into-the-design-of-the-grandfathering-security-model)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Vocabulary](#vocabulary)
  - [Clarifications for individuals](#clarifications-for-individuals)
    - [Culture of voting](#culture-of-voting)
  - [Clarifications for small groups](#clarifications-for-small-groups)
  - [Voting lifecycle](#voting-lifecycle)
  - [State machine](#state-machine)
  - [Algorithm](#algorithm)
  - [Storage model (PostgreSQL reference)](#storage-model-postgresql-reference)
  - [Use scenarios](#use-scenarios)
    - [Five-person isolated group](#five-person-isolated-group)
    - [Five-person group with a bridge](#five-person-group-with-a-bridge)
  - [How the system bootstraps](#how-the-system-bootstraps)
    - [Seed users](#seed-users)
    - [Vote cap enforcement](#vote-cap-enforcement)
    - [Balanced control for externality propagation](#balanced-control-for-externality-propagation)
    - [Deterministic clique detection metrics](#deterministic-clique-detection-metrics)
  - [Corollary](#corollary)

## Introduction

Access to the cluster is granted by peer trust. Two independent votes are required for full participation. Independent votes mean votes originating from distinct users. Each participant has a limited number of votes to prevent gatekeeping and encourage broad networks.

Votes are revocable at any time and always auditable. This is expected system behavior, not punitive. Closed voting circles cannot grant universal access by design to everyone. Trust loss is handled gracefully to avoid cascading failures, but persistent isolation or manipulation leads to disconnection.

This is a liquidity model with a built-in safety valve, without any form of privilege escalation.

## Vocabulary

| Term | Meaning |
| --- | --- |
| Anchor quota | Limit on how many people an anchored user can help satisfy externality for (default 3). |
| Close trust neighborhood | The people tightly connected to you (your immediate circle and their connections). |
| Clique | A tight group with many internal links and too few links outward. |
| Conductance (simplified) | Measure of how many links a close circle has to the wider network; needs roughly 20% outward links to avoid being treated as isolated. |
| Contingency vote | The third vote you get after using your first two; meant for recovery cases. |
| Effective votes | Distinct inbound votes that currently count. |
| External vote | A vote coming from outside your close trust neighborhood. |
| Externality requirement | You need at least one external or externally anchored inbound vote for eligibility. |
| Externally anchored user | Someone with an external inbound vote (or a seed) whose vote can satisfy externality for others. |
| Grace window | Time (about one month) to recover to S1 after dropping below 2 effective votes. |
| Inbound votes | Who vouches for you. |
| Isolation | Being in a group with too few links to the wider network; internal votes don’t count as external. |
| Outbound cap | How many people you can vouch for (2 to start, 3 after you’ve used both). |
| Outbound votes | Who you vouch for. |
| Seed users | Pre-selected starters whose votes count as external from day 0 to bootstrap the network. |
| States S0–S3 | S0 observer (read-only), S1 normal, S2 degraded (grace), S3 suspended (cooldown). |
| Vote | One person vouching for another. |

---

## Clarifications for individuals

Worth stating correct interpretation since the beginning: _everyone, first, should vote for the benefit of others_.

Once voting for others has been done, then the system will credit the user an additional 3rd vote. The third vote is not intended for routine use. The third vote is a **contingency outbound vote slot** to help the network recover in situations involving isolated individuals, borderline cases, and/or replacements after retirements. This avoids vote hoarding and panic revocations.

The model, using votes, is capped to prevent power concentration: _no bridges, no brokers, no gatekeepers_.

Self-votes are allowed but only count as one inbound vote and never satisfy the externality requirement; you still need an external or externally anchored inbound vote to reach S1.

The model has been designed on purpose so no individual can onboard many people, extract loyalty, and become a social choke point. Explicitly, this model avoids PGP-style “web of trust oligarchs”, Discord/Telegram/WhatsApp admin dynamics, forum dynamics, or “Ask X to vouch for you” cultures. What is being built is a flat, wide graph, not a tall one.

### Culture of voting

As an individual, when you plan to vote for anyone, think on this first:

- People must be chosen carefully; votes are expected to go to:
  - active contributors
  - visible participants
  - people encountered outside tight circles

- Closed groups need outside edges to grow, so they are incentivized to:
  - interact
  - behave well publicly
  - build reputation beyond their club

- Because votes are revocable:
  - trust is ongoing, not permanent
  - bad behavior has cost; people prefer to vote for those who:
    - won’t embarrass them
    - won’t force them to revoke later

---

## Clarifications for small groups

Small groups are self-limited by math, not rules. The design does not punish small groups _per se_, but if they do not expand, they will quickly hit a hard combinatorial ceiling.

To prevent isolated clique onboarding, eligibility requires at least one vote originating from outside the user’s close trust neighborhood, or votes inside detected isolated circles will be discounted.

For full clarification on attempts to game the system: detection is objective (graph isolation, lack of external edges). Intent becomes evident over time, and corrective actions are rare and self-explainable under these circumstances.

---

## Voting lifecycle

- Cast check: before a vote is accepted, verify `can_cast_vote(voter)` (outbound cap: 2 base votes, 3 after both are spent). Reject if over cap.
- Create: if allowed, add the edge `(voter -> target)`. If the voter is external to the target (or externally anchored, including seeds) and has quota, mark that usage (`MARK_EXTERNALITY_USAGE`) to consume one of the voter’s `ANCHOR_EXTERNALITY_QUOTA` slots (default 3) for that target.
- Eligibility reads: `passes_externality` only reads state; it does not change counters. It checks inbound voters, whether at least one is “outside” the target’s close circle, and whether that voter has remaining quota.
- State updates: `compute_state` uses eligibility to move between S0/S1/S2; S3 stays until eligibility is regained.
- Revoke/retire: when a vote is withdrawn, remove the edge and `UNMARK_EXTERNALITY_USAGE` for that pair to return the quota credit.
- Seeds: seed users begin externally anchored so they can bootstrap external votes on day 0.
- Isolation guard: a vote counts as external only if the target’s close circle has enough links to the rest of the network. Isolated cliques cannot self-satisfy externality.

---

## State machine

States

- **S0: Observer (read-only)** → effective votes: 0–1  
- **S1: Normal** → effective votes: ≥2  
- **S2: Degraded (grace)** → dropped below 2 due to revocation; time-limited (1 month)  
- **S3: Suspended (cooldown)** → grace expired without recovery or flagged clique abuse  

Transitions

- S0 → S1: user reaches 2 effective votes  
- S1 → S2: user loses a vote and drops below 2  
- S2 → S1: user recovers 2 votes within grace window  
- S2 → S0: grace window expires with <2 votes (no suspension)  
- Any → S3: explicit suspension (e.g., governance vote or confirmed manipulation)

S3 is an indefinite cooldown state. Entry is explicit (not automatic timeout); the only exit path is regaining normal eligibility (2 effective votes that satisfy externality).

Entry to S3 should be the result of an explicit community/governance action (for example, a suspension vote) rather than an automatic calculation; grace expiry alone sends users back to S0.

---

## Algorithm

The following pseudocode defines how votes are evaluated, how eligibility is computed, and how state transitions occur. It is governance-level pseudocode, not implementation-specific.

```text
CONSTANTS
---------
REQUIRED_EFFECTIVE_VOTES = 2
DEFAULT_OUTBOUND_CAP     = 2
CONTINGENCY_OUTBOUND_CAP = 3
GRACE_WINDOW_DAYS        = 30
ANCHOR_EXTERNALITY_QUOTA = 3      # balanced-control cap per anchored voter
CONDUCTANCE_THRESHOLD    = 0.2    # minimum outward link ratio to count externality

SEED_USERS = {pre-selected bootstrap users}

DEFINITIONS
-----------
ActiveVotes = set of (voter -> target) edges not retired
Inbound(U)  = set of voters V where (V -> U) in ActiveVotes
Outbound(U) = set of targets T where (U -> T) in ActiveVotes
ExternalityUsage(V) = count of distinct users that used V to satisfy externality
MARK_EXTERNALITY_USAGE(V, U): idempotently records (V, U) and bumps ExternalityUsage(V) once
UNMARK_EXTERNALITY_USAGE(V, U): removes recorded (V, U) and decrements ExternalityUsage(V) once

FUNCTION can_cast_vote(U):
    return |Outbound(U)| < outbound_cap(U)

FUNCTION outbound_cap(U):
    if |Outbound(U)| >= 2:
        return CONTINGENCY_OUTBOUND_CAP
    else:
        return DEFAULT_OUTBOUND_CAP

FUNCTION close_trust_neighborhood(U, G):
    # Conceptual definition:
    # a strongly or densely connected local trust cluster
    # Implemented via conductance on U's 2-hop ego network
    return DETECT_NEIGHBORHOOD(G, U)

FUNCTION compute_conductance(U, G):
    # Build 2-hop ego network for U
    N = {U} ∪ neighbors(U) ∪ neighbors(neighbors(U))
    # Crossing edges: exactly one endpoint in N
    crossing = count_edges_with_one_endpoint_in(N)
    # Touching edges: all edges with at least one endpoint in N (internal + crossing)
    touching = count_edges_with_endpoint_in(N)
    if touching == 0:
        return 0
    return crossing / touching

FUNCTION is_external_vote(V, U, G):
    N = close_trust_neighborhood(U, G)
    return V not in N

FUNCTION is_externally_anchored(V, G):
    # A voter is externally anchored if they themselves
    # have at least one external inbound vote, or are a seed user
    if V in SEED_USERS:
        return true
    for each X in Inbound(V):
        if is_external_vote(X, V, G):
            return true
    return false

FUNCTION effective_inbound_voters(U, G):
    return Inbound(U)   # distinct voters by definition

FUNCTION anchor_quota_remaining(V):
    return ExternalityUsage(V) < ANCHOR_EXTERNALITY_QUOTA

FUNCTION passes_externality(U, G):
    # Isolation guard: if U's neighborhood is too closed, externality fails
    if compute_conductance(U, G) < CONDUCTANCE_THRESHOLD:
        return false
    for each V in Inbound(U):
        if not anchor_quota_remaining(V):
            continue
        if is_external_vote(V, U, G) or is_externally_anchored(V, G):
            return true
    return false

FUNCTION accept_vote(voter, target, G):
    # Enforce outbound cap before creating the edge
    if not can_cast_vote(voter):
        REJECT_VOTE()
    CREATE_EDGE(voter, target)
    # If the vote will be used to satisfy externality for target, mark usage
    if is_external_vote(voter, target, G) or is_externally_anchored(voter, G):
        if anchor_quota_remaining(voter):
            MARK_EXTERNALITY_USAGE(voter, target)

FUNCTION retire_vote(voter, target):
    DELETE_EDGE(voter, target)
    # Return quota credit if it was consumed for this pair
    UNMARK_EXTERNALITY_USAGE(voter, target)

FUNCTION eligible_for_normal(U, G):
    if |Inbound(U)| < REQUIRED_EFFECTIVE_VOTES:
        return false
    if not passes_externality(U, G):
        return false
    return true

FUNCTION compute_state(U, previous_state, grace_deadline, now, G, suspended_flag):
    # suspended_flag is set by explicit governance/abuse decision, not by timeouts
    if suspended_flag:
        return (S3_SUSPENDED, null)

    if eligible_for_normal(U, G):
        return (S1_NORMAL, null)

    if previous_state == S3_SUSPENDED:
        return (S3_SUSPENDED, null)   # indefinite cooldown; recovery only by votes

    if previous_state == S1_NORMAL:
        return (S2_DEGRADED, now + GRACE_WINDOW_DAYS)

    if previous_state == S2_DEGRADED:
        if now <= grace_deadline:
            return (S2_DEGRADED, grace_deadline)
        else:
            return (S0_OBSERVER, null)  # grace expired without votes; no automatic suspension

    return (S0_OBSERVER, null)
```

Note: `passes_externality` and `eligible_for_normal` are read-only queries and should be evaluated transactionally during vote processing or login validation; quota updates happen only in the vote accept/retire paths.

---

## Storage model (PostgreSQL reference)

Reference DDL for implementing the model in PostgreSQL:

```sql
-- Users: seeds and suspension flag
CREATE TABLE users (
    user_id     SERIAL PRIMARY KEY,
    handle      TEXT UNIQUE NOT NULL,
    is_seed     BOOLEAN NOT NULL DEFAULT FALSE,   -- externally anchored from day 0
    suspended   BOOLEAN NOT NULL DEFAULT FALSE,   -- drives suspended_flag in compute_state
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Preload seeds (example handles)
-- INSERT INTO users (handle, is_seed) VALUES
--   ('seed-emea-1', TRUE), ('seed-emea-2', TRUE), ... up to 9 per region,
--   ('seed-amer-1', TRUE) ...,
--   ('seed-apac-1', TRUE) ...;

-- Votes: active edges; one row per voter->target
CREATE TABLE votes (
    voter_id    INT NOT NULL REFERENCES users(user_id),
    target_id   INT NOT NULL REFERENCES users(user_id),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retired_at  TIMESTAMPTZ,
    CONSTRAINT votes_pk PRIMARY KEY (voter_id, target_id)
);

-- Indexes to support cap checks and inbound lookups
CREATE INDEX votes_voter_active_idx ON votes(voter_id) WHERE active;
CREATE INDEX votes_target_active_idx ON votes(target_id) WHERE active;

-- Outbound cap enforcement (application or trigger):
-- Before inserting/updating to active=true, run:
--   SELECT count(*) FROM votes WHERE voter_id = $1 AND active = TRUE;
-- Reject if count >= outbound_cap($1) (2 base, 3 after both used).

-- Externality usage: tracks which targets consumed an anchored voter's quota
CREATE TABLE externality_usage (
    voter_id    INT NOT NULL REFERENCES users(user_id),
    target_id   INT NOT NULL REFERENCES users(user_id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT externality_usage_pk PRIMARY KEY (voter_id, target_id)
);
CREATE INDEX externality_usage_voter_idx ON externality_usage(voter_id);

-- State tracking (optional if computed on the fly)
CREATE TABLE user_state (
    user_id         INT PRIMARY KEY REFERENCES users(user_id),
    state           TEXT NOT NULL CHECK (state IN ('S0','S1','S2','S3')),
    grace_deadline  TIMESTAMPTZ
);
```

---

## Use scenarios

### Five-person isolated group

Users: A, B, C, D, E  
All votes occur inside the group; no external inbound votes exist.

- Each user can arrange two inbound votes internally.
- However, all inbound voters belong to the same close trust neighborhood.
- passes_externality() fails for every user.

Result:

No user reaches S1 (Normal). The group is mathematically self-limited and remains read-only unless an external connection is established.

### Five-person group with a bridge

Users: A, B, C, D, E, plus external user X.

- X → A (external inbound vote)
- A already has internal inbound votes

Now:

- A satisfies the externality requirement and reaches S1.
- A becomes externally anchored.
- A may use their contingency vote to support D (A → D).

Because A is externally anchored:

- A → D counts as satisfying D’s externality requirement.
- D can reach S1 if they have ≥2 inbound votes.

This external influence can propagate gradually, allowing the group to join the broader network without creating a gatekeeper.

---

## How the system bootstraps

### Seed users

Seed users are externally anchored by definition and they can emit the first external votes into an empty graph.

**They are going to be pre-selected by the Core development team and they will be nine per continent (9 in EMEA, 9 in AMER, 9 in APAC) for an initial global total of 27.**

Choosing 9 per region is a good starting point; it is large enough to avoid a single point of failure, distributes trust across time zones and communities, and remains small enough to audit manually. A 3x3 regional grid keeps combinatorial explosion in check. Seed status should be rare and transparent.

If `is_seed` is set to true for someone after they have already been voting, their future votes will count as externally anchored; past votes remain as recorded. It'll be considered whether to backfill `externality_usage` or require re-voting if this flag is changed _post hoc_.

### Vote cap enforcement

A new vote is rejected if `can_cast_vote(U)` is false, so users cannot emit more than 2 votes initially or 3 once they have used both base votes. This prevents clients from bypassing the stated cap and enforce the outbound cap in the vote-creation path.

### Balanced control for externality propagation

To limit gatekeeper influence, each externally anchored voter can satisfy the externality requirement for at most `ANCHOR_EXTERNALITY_QUOTA` distinct users, by default 3. `ExternalityUsage` is adjusted only on vote acceptance/retirement (write path) via `MARK/UNMARK` so eligibility checks remain read-only. This still lets a bridge help several users but prevents unlimited propagation from a single anchor and returns quota when a vote is retired.

### Deterministic clique detection metrics

Conductance is the metric to detect cliques. Define a user’s close trust neighborhood as their 2-hop ego network. If fewer than about 20% of the links from that neighborhood connect outward, it is treated as too closed; votes inside it do not count as external. This keeps the rule simple: groups need some real links to the wider network.

---

## Corollary

Unlike other ham radio community services, many of which claim to be universally accessible but are effectively restricted for various reasons, **RCLDX will always remain accessible in read-only mode**, even without grandfather support. This ensures operators can continue to use and benefit from the cluster during radio sessions without disruption.
