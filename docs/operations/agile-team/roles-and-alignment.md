---
title: "Roles, Responsibilities, and Decision Rights"
description: "Defines PO/CTO/FE/BE/QA responsibilities, RACI, and how decisions are made without killing autonomy."
last_updated: "2026-01-06"
owner: "Benjie"
---

# Roles, Responsibilities, and Decision Rights

## Principle

If roles are unclear, you get thrash and politics. If roles are too rigid, you kill ownership. This document sets **clear accountability** with **healthy autonomy**.

## Team (current / planned)

- **CTO / Tech Lead / Project Owner**: Benjie (full stack)
- **Frontend Engineer**: TBA
- **Backend Engineer (intern)**: TBD
- **Internal Client / Product Owner (PO)**: TBD (home renovation industry rep)
- **QA**: TBD

## Role definitions (simple)

### Product Owner (Internal Client)

- Owns **what** and **why**
- Writes user stories (or reviews/refines them)
- Defines acceptance criteria
- Accepts/rejects stories in demo

### CTO / Tech Lead (Benjie)

- Owns **how** at the architecture level
- Sets the quality bar (DoD)
- Mentors and unblocks
- Makes final call on irreversible technical decisions

### Frontend Engineer (TBA)

- Owns UI implementation and UX consistency
- Works with PO to ensure UI matches workflows
- Coordinates API contracts with backend

### Backend Engineer (Intern)

- Owns API/data tasks under guidance
- Writes tests where practical
- Documents endpoints and assumptions in tickets

### QA

- Owns verification against acceptance criteria
- Maintains lightweight regression checklist
- Blocks releases when acceptance criteria isn’t met

## RACI (quick)

Legend: **A** = accountable, **R** = responsible, **C** = consulted.

| Area | PO | Benjie | Frontend | Backend | QA |
|------|----|--------|-------|---------|----|
| Backlog priority | A/R | C | C | C | C |
| User stories + acceptance criteria | A/R | C | C | C | C |
| Architecture decisions | C | A/R | C | C | C |
| Frontend delivery | C | C | A/R | C | C |
| Backend delivery | C | C | C | A/R | C |
| Verification (AC + regression) | C | C | C | C | A/R |
| Release readiness | C | A/R | C | C | A/R |

## Decision-making rules (fast + calm)

### Rule 1: Reversible decisions (“Type 1”)

If it’s easy to change later:
- Team decides quickly.
- Document the decision in the ticket/PR description.

### Rule 2: Hard-to-reverse decisions (“Type 2”)

If it impacts architecture, data model, or long-term complexity:
- Benjie makes the final call.
- You still solicit input (10 minutes, not 3 days).
- Document tradeoffs in the ticket.

### Rule 3: Priority disputes

If engineering thinks something is urgent but PO disagrees:
- Benjie + PO decide in a 10-minute call.
- Outcome is written in the backlog (no “hallway decisions”).

## The CTO anti-patterns (avoid these)

- Changing sprint scope mid-week without agreement
- Assigning tasks like a manager instead of setting a goal like a leader
- Shipping without a demo/acceptance loop

