---
title: "Interview Process (Internal Hires for a Startup Team)"
description: "A practical interview + trial process for frontend, backend, and QA candidates joining an Agile startup team using GitHub → Railway and Cloudflare Workers."
last_updated: "2026-01-06"
owner: "Benjie"
---

# Interview Process (Internal Hires for a Startup Team)

## Why this process exists

Even if a candidate is already inside the company, your startup team needs people who can:

- ship **small, complete** stories (Ready → Done)
- work safely (no secrets in code, no risky deploys)
- communicate clearly and handle ambiguity

This process is designed to be fair, fast, and predictive.

## Roles you’re hiring for

- Frontend Engineer (TBA)
- Backend Engineer (Intern) (TBD)
- QA (TBD)

## The process (recommended)

### Stage 0 — Pre-brief (10–15 min)

Send them:

- The Agile playbook folder (`docs/operations/agile-team/`)
- A short “what we build” overview (LiveChat CRM + SMS/Voice + integrations)

Ask them to come prepared to explain:
- what “Done” means
- what they’d ship in week 1

### Stage 1 — Manager/fit screen (20–30 min)

Goal: confirm communication, ownership, and learning mindset.

Questions:
- Tell me about a time you shipped under tight constraints. What did you cut?
- What does “good enough” look like to you?
- When do you ask for help vs keep pushing?

Pass criteria:
- clear communication
- can describe tradeoffs without ego
- doesn’t hand-wave testing/verification

### Stage 2 — Technical practical (60–90 min)

Goal: see how they work in real constraints (small story, verification, quality).

Format options:
- **Live pairing** (preferred for interns)
- **Short take-home (2–3 hours)** if scheduling is hard

Important: The task must be *small* and *finishable*.

#### Frontend practical (example)

Give them a story like:

> “As a user, I want a small settings panel UI with two toggles and clear helper text so I can configure a feature safely.”

Evaluate:
- component structure (small files, readable)
- Chakra UI usage and macOS-like spacing
- error/empty states
- verification steps

#### Backend practical (example)

Give them a story like:

> “Add a small API endpoint that reads data with workspace scoping and returns a safe response shape, with clear error handling.”

Evaluate:
- input validation + error handling
- workspace isolation mindset
- safe database access patterns
- ability to explain how to verify

#### QA practical (example)

Give them a story + acceptance criteria and ask them to produce:

- a test plan
- edge cases
- reproduction steps for 1 injected bug

Evaluate:
- clarity and thoroughness
- ability to prioritize risks (P0/P1 vs P2/P3)

### Stage 3 — Team behaviors (30–45 min)

Goal: avoid hiring someone who is talented but destabilizes the team.

Questions:
- How do you handle code review disagreements?
- Describe your approach to debugging something you don’t understand.
- What’s your default communication style when blocked?

Pass criteria:
- collaborative tone
- fast escalation of blockers
- respects process without becoming bureaucratic

## Scoring rubric (simple)

Score 1–5 in each category:

- **Shipping mindset** (finishes small things)
- **Quality + verification** (doesn’t “just hope”)
- **Communication** (clear updates, asks good questions)
- **Reliability** (safe changes, respects production)
- **Learning speed** (uses feedback quickly)

Hiring rule of thumb:
- No “1” in reliability or communication.
- Interns can be weaker technically if learning speed is high.

## Trial period (recommended for new-to-startup)

Before giving full repo write access:

1. Give them **one real story** that fits in **≤ 1 dev-day**
2. They deliver:
   - code (or patch)
   - verification steps
   - short demo
3. Benjie merges/deploys

This is the safest real signal.

## Repo access plan (since only Benjie can push today)

Until trust is earned:

- Candidate submits changes as a **patch/diff** (or pairs live)
- Benjie opens the PR and merges

When ready:
- grant GitHub access
- require PRs (no direct `main` pushes)

