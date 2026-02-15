---
title: "Agile Operating Model (Startup)"
description: "A lightweight Agile system: cadence, ceremonies, workflow, and guardrails to ship weekly with quality."
last_updated: "2026-01-06"
owner: "Benjie"
---

# Agile Operating Model (Startup)

## Goal

Ship weekly improvements to the LiveChat CRM with **real industry feedback** (home renovation) while keeping quality high and the team autonomous.

## Default cadence (startup-friendly)

We run **1-week sprints** by default. If you prefer 2-week sprints, keep the same structure but merge weeks (planning Monday week 1, review/retro Friday week 2).

```
WEEKLY SPRINT RHYTHM (DEFAULT)

Mon: Sprint Planning (45m) + Kickoff (15m)
Tue: Build (async update)
Wed: Build + Backlog Refinement (30m)
Thu: Build (async update) + QA focus
Fri: Demo/Review (30m) + Retro (30m)
```

## Weekly commitment (our default)

This team will use a simple, startup-friendly commitment model:

- **Commit to 8 user stories per week**
- Only commit stories that are **small** (target: **≤ 1 dev-day** each)
- Reserve **20–30%** of capacity for:
  - PR review, coordination, and QA verification
  - support and interruptions
  - production issues

### What this actually means (plain English)

Think of the sprint as two buckets:

```
WEEKLY CAPACITY
├─ 70–80%: planned stories (target: 8)
└─ 20–30%: “unplanned work” (reviews, QA, support, bugs)
```

So:
- **We plan to finish 8 stories** *when the week is normal*.
- If the week has a lot of unplanned work, we still protect quality and production, and the number of stories completed may drop (example **8 → 6**).

### What counts as “1 dev-day”

If one person can’t take it from “Ready” → “Done” within about a day (including review/verification), it’s too big. Split it.

Examples of good 1‑day stories:
- Add a small UI control + one API field + acceptance criteria
- Add one filter with clear behavior + empty state + basic validation

Examples that are too big (must be split):
- “Build new onboarding”
- “Refactor messaging”
- “Add provider abstraction for all SMS providers”

## Bug policy (keep predictability + protect production)

Bugs do not get a “free pass” by default. We use **severity-based rules**:

- **P0 / P1 bugs**: unlimited (they interrupt the sprint)
  - **P0**: production down, messages not sending, data loss, security issue
  - **P1**: revenue-impacting, major user flow blocked, widespread errors
- **P2 / P3 bugs**: go to the backlog and compete with stories
  - **P2**: important but has a workaround / not widespread
  - **P3**: minor polish / edge-case / low impact

### What happens when P0/P1 bug load is heavy

The sprint stays honest:

- You still fix P0/P1 immediately.
- You reduce the story commitment for the week (for example **8 → 6**).

## Source of truth (non-negotiable)

- **Backlog tool**: One place where stories live (Linear/Jira/Trello/GitHub Projects).
- **Code changes**: PRs only (no direct-to-main).
- **Acceptance**: The internal client/PO accepts based on written acceptance criteria.

## The workflow (end-to-end)

```
INDUSTRY REALITY (Home Reno)
  |
  v
Internal Client/PO -> writes User Story + Acceptance Criteria
  |
  v
Backlog (Ready) -> Sprint Planning -> In Progress -> QA Verify -> Demo -> Accepted -> Done
  ^                                                                     |
  |----------------------------- feedback ------------------------------|
```

## Definition of Ready (DoR)

A story can enter a sprint only if:

- **User + outcome** is clear (who/what/why).
- **Acceptance criteria** exists (Given/When/Then).
- **Scope fits 1–2 days** (otherwise split).
- **Dependencies** are listed (API, design, data).

## Definition of Done (DoD)

A story is “Done” only when:

- Meets acceptance criteria
- Verified (QA checklist or dev verification if QA is unavailable)
- Demo-ready (PO can accept it)
- No debug logging left behind

## Meetings (minimal set)

- **Sprint Planning (Mon, 45m)**: choose the smallest set of stories to hit the sprint goal.
- **Kickoff (Mon, 15m)**: confirm roles, clarify “Done,” and start execution.
- **Backlog Refinement (Wed, 30m)**: PO + Benjie + at least 1 dev clarify next week’s stories.
- **Demo/Review (Fri, 30m)**: show only Done work; PO accepts/rejects.
- **Retro (Fri, 30m)**: pick 1–3 improvements max.

## Communication rules (avoid meeting overload)

- Default to **async** updates (Slack):
  - Yesterday / Today / Blockers
- Escalate to a call only for:
  - blockers > 1 day
  - unclear acceptance criteria
  - architectural decisions (non-reversible)

## CTO leadership model (guardrails + freedom)

You (Benjie) provide guardrails; the team owns execution.

**Guardrails (non-negotiable):**
- DoR + DoD
- One prioritized backlog
- Weekly demo

**Freedom (team-owned):**
- How tasks are split
- How work is implemented (within architecture constraints)
- Estimates (or “t-shirt sizes” if you want lighter planning)

