---
title: "User Story System (Internal Client → Shipped Feature)"
description: "How your internal client produces high-quality user stories, with templates, acceptance criteria, DoR/DoD, and examples."
last_updated: "2026-01-06"
owner: "Benjie"
---

# User Story System (Internal Client → Shipped Feature)

## Why this matters

Your biggest advantage is having **industry-native input** (home renovation ops). This system converts that input into clear, testable work.

## Pipeline (ASCII)

```
INTERNAL CLIENT (industry reality)
   |
   v
User Story + Acceptance Criteria
   |
   v
Backlog (Ready) -> Sprint -> Dev -> QA -> Demo -> Accepted -> Done
```

## Story template (copy/paste)

```
Title:
As a <user/persona>
I want <capability>
So that <outcome>

Acceptance Criteria:
- Given <context>, when <action>, then <expected result>
- Given <context>, when <action>, then <expected result>

Out of Scope:
- ...

Notes / Screens / Links:
- ...
```

## Acceptance criteria patterns

Use “Given/When/Then” so QA and PO can validate without interpretation.

Examples:

- **Given** a contact is opted out, **when** we attempt to send SMS, **then** the message is blocked and the UI shows a friendly reason.
- **Given** a lead has no phone number, **when** an automation tries to send SMS, **then** the step is skipped and logged as “skipped”.

## Definition of Ready (DoR)

A story is Ready when:

- Persona + outcome is clear
- Acceptance criteria is present
- Scope is small (target: **≤ 1 dev-day**; hard max: **≤ 1–2 dev days**)
- Dependencies are noted (API, DB, designs)

## Definition of Done (DoD)

A story is Done when:

- Acceptance criteria met
- Verified (QA or dev verification)
- Demo-ready and accepted by PO
- No debug logging left behind

## “Story splitting” cheat sheet

If a story is too big, split by:

- **Happy path vs edge cases** (ship happy path first)
- **Read vs write** (view first, then editing)
- **One persona at a time** (admin first, then agent)
- **UI vs integrations** (stub provider selection, then add providers)

## Weekly commitment note (8 stories/week)

The team commits to **8 stories/week**. That only works if stories are small.

If you can’t explain a story in 2–3 sentences and validate it with 2–5 acceptance criteria, it’s probably too big—split it.

## First backlog seed (suggested categories)

Use your internal client to write stories in these buckets:

- **Messaging**: inbound/outbound, opt-out compliance, templates, attachments
- **CRM basics**: contacts, tags, notes, assignments, pipelines/boards
- **Integrations**: Twilio now, provider abstraction later (pluggable SMS)
- **Livechat embed**: widget basics, auth model, iframe/white-label constraints

