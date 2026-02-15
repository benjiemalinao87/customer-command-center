---
title: "Code Push Rules (GitHub → Railway + Cloudflare Workers)"
description: "Rules for branches, PRs, reviews, deployments, and safe releases when GitHub pushes trigger Railway deploys and some services run on Cloudflare Workers."
last_updated: "2026-01-06"
owner: "Benjie"
---

# Code Push Rules (GitHub → Railway + Cloudflare Workers)

## Purpose

This document protects speed *and* stability. It defines how code moves from local → GitHub → production when:

- GitHub merges can trigger **Railway** deployments
- Some microservices are **Cloudflare Workers**
- Benjie is currently the only person with write access to the repo

## The deployment reality (keep it simple)

```
DEV WORK (branches)
  |
  v
Pull Request (review)
  |
  v
Merge to main  --->  Railway auto-deploy (core app)
  |
  v
Manual deploy (when needed) for Cloudflare Workers via Wrangler
```

## Rules (non-negotiable)

### 1) No direct commits to `main`

- `main` is production.
- All changes must land via a Pull Request.

### 2) One PR = one story (small + reviewable)

- Each PR should map to **one user story** or **one bugfix**.
- If the PR touches many unrelated areas, split it.

### 3) Every PR must include:

- **What changed** (1–3 bullets)
- **Why** (the user story / bug)
- **How to verify** (steps a QA/non-author can follow)
- Screenshots if UI changed

### 4) Quality gates

- Must not break build
- Must not introduce debug logging
- Must respect workspace isolation / security boundaries
- Must not commit secrets (keys, tokens, credentials)

## Access model (current + future)

### While Benjie is the only repo admin

**Everyone else develops without pushing to the main repo.** Options:

- **Option A (preferred): patch-based review**
  - Candidate/dev shares a Git diff (or `git format-patch`) + screenshots
  - Benjie applies it on a branch and opens a PR
- **Option B: shared branch workflow**
  - Benjie creates a branch and pushes on behalf of the dev (dev pairs via screen-share)

Once someone proves reliability, you can grant GitHub access and switch to standard PR flow.

### After you grant access (standard PR flow)

- Developers push to feature branches and open PRs
- Benjie reviews/merges until you’re comfortable expanding ownership

## Branch naming

- `feature/<short-story-name>`
- `bugfix/<short-bug-name>`
- `chore/<short-maintenance-name>`

Examples:
- `feature/livechat-search-debounce`
- `bugfix/twilio-webhook-400`
- `chore/docs-agile-playbook`

## PR review rule (fast but safe)

- Default: **Benjie approves + merges**
- If the change is in a high-risk area, require a second reviewer (once available)

High-risk areas (examples):
- auth + permissions
- Twilio webhooks
- message sending
- database writes/migrations
- Cloudflare Workers production routes

## Deploy rules by area

### A) Railway (core app)

- **Merging to `main` can deploy automatically**.
- Treat “merge to main” as “release to production”.

Release checklist (quick):
- PR includes verification steps
- Smoke test the primary flow (login → open livechat → send/receive message)
- If DB schema changes exist, ensure migration/SQL is documented and applied safely

### B) Cloudflare Workers (microservices)

Workers are in `cloudflare-workers/`.

Rule:
- A worker change is not “done” until it’s deployed (staging/production) and verified.

Minimum deployment verification:
- hit the worker health endpoint (or the main route)
- check logs (tail) for errors after deploy

> Note: Deploy commands vary per worker. Each worker directory typically includes its own README/DEPLOYMENT guide.

## Rollback rules (don’t panic)

- If Railway deploy breaks production, revert the PR on GitHub (fastest rollback).
- For Workers, redeploy the last known good version (or revert and redeploy).

