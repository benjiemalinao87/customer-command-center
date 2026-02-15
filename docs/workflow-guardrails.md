# Workflow Guardrails & Safety Architecture

> **Audience**: New developers and interns working on the workflow engine
> **Last updated**: February 2026
> **Primary file**: `trigger/unifiedWorkflows.js` (~13,000 lines)

This document explains how the system prevents accidental SMS/email sending through multiple layers of safety checks. The philosophy is **defense in depth** — even if one check is bypassed, the next one catches it.

---

## Table of Contents

0. [Sandbox Mode](#0-sandbox-mode)
1. [Full Guardrail Pipeline](#1-full-guardrail-pipeline)
2. [Where Each Filter Is Checked (And Where It's Not)](#2-where-each-filter-is-checked-and-where-its-not)
3. [Stop On Response Mechanism](#3-stop-on-response-mechanism)
4. [Opt-In / Opt-Out Write Paths](#4-opt-in--opt-out-write-paths)
5. [Summary Matrix](#5-summary-matrix)
6. [Key Takeaways](#6-key-takeaways)

---

## 0. Sandbox Mode

Sandbox Mode is a **workspace-level kill switch** that blocks ALL outbound SMS and email unless the contact is explicitly whitelisted. It is the **first check** in the entire pipeline — before test mode, DNC, opt-out, or any other guardrail.

**Purpose**: Prevent accidental sends when onboarding new clients, testing workflows, or during development.

```
┌─────────────────────────────────────────────────────────────┐
│                    SANDBOX MODE CHECK                        │
│                                                              │
│  workspace.is_sandbox_mode === true ?                        │
│                                                              │
│    YES → Is contact in sandbox_whitelist?                     │
│           YES → ALLOW (continue to next checks)              │
│           NO  → 🛑 BLOCK (reason: SANDBOX_NOT_WHITELISTED)   │
│                                                              │
│    NO  → ALLOW (sandbox disabled, all contacts pass)         │
│                                                              │
│  DB ERROR → 🛑 BLOCK (fail-safe: block if status unknown)    │
└─────────────────────────────────────────────────────────────┘
```

**Key properties:**
- Checked in ALL send paths: Trigger.dev, Backend, Cloudflare Workers
- Fail-safe: blocks if DB query fails (same principle as DNC)
- Whitelist uses `sandbox_whitelist` table (lookup by contact_id, phone, or email)
- Toggle: Settings > Workspace > Sandbox Mode
- Visual: Fixed orange banner at top of app when active

**Files:**
| File | Purpose |
|------|---------|
| `trigger/sandboxCheck.js` | Shared check utility for Trigger.dev tasks |
| `backend/src/services/sandboxCheck.js` | Shared check utility for backend routes |
| `cloudflare-workers/sms-service/src/index.js` | Inline check (Workers can't import shared modules) |

---

## 1. Full Guardrail Pipeline

This is the complete flow from workflow start to actual SMS/email delivery:

```
╔══════════════════════════════════════════════════════════════════════╗
║                    WORKFLOW EXECUTION STARTS                        ║
║                  triggerWorkflowTask() called                       ║
╚══════════════════════════════════╦═══════════════════════════════════╝
                                   ║
                                   ▼
                    ┌──────────────────────────┐
                    │  0. SANDBOX MODE CHECK   │
                    │  is_sandbox_mode ?        │
                    │  → whitelisted? → ALLOW   │
                    │  → not whitelisted → STOP │
                    └────────────┬─────────────┘
                                 │ Allowed
                                 ▼
                    ┌──────────────────────────┐
                    │   1. TEST MODE CHECK     │
                    │   isTest === true ?       │
                    └────────────┬─────────────┘
                                 │
                    ┌────YES─────┴─────NO──────┐
                    ▼                          ▼
          ┌──────────────────┐    ┌──────────────────────┐
          │ MOCK EVERYTHING  │    │  2. ENROLLMENT CHECK │
          │ No SMS sent      │    │  can_enroll_contact   │
          │ No email sent    │    │  _in_flow() RPC       │
          │ No DB writes     │    └──────────┬───────────┘
          │                  │               │
          │ Return fake SIDs │    ┌──YES─────┴────NO─────┐
          └──────────────────┘    ▼                      ▼
                         ┌──────────────┐    ┌───────────────────┐
                         │ Continue to  │    │ BLOCKED           │
                         │ workflow     │    │ "Already enrolled"│
                         │ execution    │    │ Prevents dupes    │
                         └──────┬───────┘    └───────────────────┘
                                │
           ╔════════════════════╩════════════════════╗
           ║     WORKFLOW NODE LOOP (step by step)   ║
           ╚════════════════════╦════════════════════╝
                                │
                                ▼
                ┌───────────────────────────────┐
                │  What type of node is this?   │
                └───────┬───────────┬───────────┘
                        │           │
              ┌─────────┘           └──────────┐
              ▼                                ▼
     ┌─────────────────┐             ┌──────────────────┐
     │   DELAY NODE    │             │  SEND-MESSAGE    │
     │   (wait step)   │             │  or SEND-EMAIL   │
     └────────┬────────┘             │  (comms step)    │
              │                      └────────┬─────────┘
              ▼                               │
   ┌─────────────────────┐                    │
   │ 3. PRE-DELAY        │                    │
   │    DNC CHECK        │                    │
   │                     │                    │
   │ SELECT lead_status, │                    │
   │   opted_in_sms      │                    │
   │ FROM contacts       │                    │
   └────────┬────────────┘                    │
            │                                 │
            ▼                                 │
   ┌─────────────────────┐                    │
   │ DB query failed?    │                    │
   │                     │                    │
   │  YES → BLOCK        │                    │
   │  "Cannot verify     │                    │
   │   DNC status"       │                    │
   │  ══════════════     │                    │
   │  FAIL SAFE:         │                    │
   │  Block if unknown   │                    │
   └────────┬────────────┘                    │
            │ Query OK                        │
            ▼                                 │
   ┌─────────────────────┐                    │
   │ lead_status = DNC?  │                    │
   │                     │                    │
   │  YES → 🛑 STOP      │                    │
   │  shouldStopWorkflow │                    │
   │  = true             │                    │
   └────────┬────────────┘                    │
            │ Not DNC                         │
            ▼                                 │
   ┌─────────────────────┐                    │
   │ opted_in_sms=false? │                    │
   │                     │                    │
   │  YES → 🛑 STOP      │                    │
   │  reason: SMS_OPT_OUT│                    │
   └────────┬────────────┘                    │
            │ Opted in                        │
            ▼                                 │
   ┌─────────────────────┐                    │
   │                     │                    │
   │   ⏳ WAIT/DELAY     │                    │
   │   (minutes, hours,  │                    │
   │    days, until_time) │                    │
   │                     │                    │
   │  Contact might get  │                    │
   │  marked DNC or      │                    │
   │  reply during this  │                    │
   │  window...          │                    │
   │                     │                    │
   └────────┬────────────┘                    │
            │ Delay complete                  │
            ▼                                 │
   ┌─────────────────────┐                    │
   │ 4. POST-DELAY       │                    │
   │    DNC RE-CHECK     │                    │
   │                     │                    │
   │ Same checks again:  │                    │
   │ • DB error → BLOCK  │                    │
   │ • DNC → STOP        │                    │
   │ • opted_out → STOP  │                    │
   │                     │                    │
   │ (Contact may have   │                    │
   │  replied "STOP"     │                    │
   │  during the delay)  │                    │
   └────────┬────────────┘                    │
            │ Still OK                        │
            ▼                                 │
            └──────────────┬──────────────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │ 5. LEAD STATUS CHECK       │
              │    (comms after delay only) │
              │                            │
              │ Is current lead_status     │
              │ still in allowedStatuses?  │
              │                            │
              │ e.g. Was "New Lead" but    │
              │ now "Responded" after      │
              │ contact replied            │
              └─────────────┬──────────────┘
                            │
               ┌───YES──────┴──────NO──────┐
               ▼                           ▼
      ┌──────────────┐          ┌─────────────────────┐
      │ Continue to  │          │ 🛑 STOP             │
      │ send logic   │          │ "lead_status_changed"│
      └──────┬───────┘          │ Status no longer in  │
             │                  │ allowed list         │
             │                  └─────────────────────┘
             │
             ▼
  ┌──────────────────────────────────────────────┐
  │         IS THIS SMS OR EMAIL?                │
  └──────────┬──────────────────────┬────────────┘
             │                      │
     ┌───────┘                      └───────┐
     ▼                                      ▼
┌──────────────┐                   ┌──────────────┐
│  SMS PATH    │                   │  EMAIL PATH  │
│  sendSMS     │                   │  sendEmail   │
│  Directly()  │                   │  Directly()  │
└──────┬───────┘                   └──────┬───────┘
       │                                  │
       ▼                                  ▼
┌────────────────────┐          ┌────────────────────┐
│ 6a. FINAL DNC      │          │ 6b. FINAL DNC      │
│     CHECK (SMS)    │          │     CHECK (EMAIL)  │
│                    │          │                    │
│ SELECT lead_status,│          │ SELECT lead_status,│
│  opted_in_sms,     │          │  opted_in_email,   │
│  name, phone       │          │  name, email       │
│ FROM contacts      │          │ FROM contacts      │
└────────┬───────────┘          └────────┬───────────┘
         │                               │
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│ DB error?          │          │ DB error?          │
│ → BLOCK SMS        │          │ → BLOCK EMAIL      │
│ "Cannot verify"    │          │ "Cannot verify"    │
│                    │          │                    │
│ Contact not found? │          │ Contact not found? │
│ → BLOCK SMS        │          │ → BLOCK EMAIL      │
│                    │          │                    │
│ lead_status = DNC? │          │ lead_status = DNC? │
│ → BLOCK SMS        │          │ → BLOCK EMAIL      │
│                    │          │                    │
│ opted_in_sms       │          │ opted_in_email     │
│   === false?       │          │   === false?       │
│ → BLOCK SMS        │          │ → BLOCK EMAIL      │
└────────┬───────────┘          └────────┬───────────┘
         │ ALL PASSED                    │ ALL PASSED
         ▼                               ▼
┌────────────────────┐          ┌────────────────────┐
│ ✅ SEND via Twilio │          │ ✅ SEND via Resend │
│                    │          │                    │
│ twilioClient       │          │ resend.emails      │
│  .messages.create  │          │  .send()           │
│                    │          │                    │
│ + statusCallback   │          │ + {{unsubscribe    │
│   for delivery     │          │     _link}} in     │
│   tracking         │          │   email footer     │
└────────────────────┘          └────────────────────┘


═══════════════════════════════════════════════════════════
  AFTER EVERY STEP — STOP PROPAGATION CHECK (line ~980)
═══════════════════════════════════════════════════════════

  ┌─────────────────────────────────┐
  │ stepResult.shouldStopWorkflow?  │──YES──▶ 🛑 CANCEL
  │ stepResult.blocked?             │         entire
  │ stepResult.stopped?             │         remaining
  │                                 │         workflow
  │ Reasons:                        │
  │  • DNC detected                 │
  │  • SMS/Email opt-out            │
  │  • Lead status changed          │
  │  • DNC check failed (fail-safe) │
  │  • Condition otherwise:stop     │
  └─────────────┬───────────────────┘
                │ NO
                ▼
        ┌───────────────┐
        │ Next node...  │ ← loop continues
        └───────────────┘


═══════════════════════════════════════════════════════════
  OPT-OUT SOURCES (what sets these flags to false)
═══════════════════════════════════════════════════════════

  Contact replies "STOP"    ──▶ Twilio webhook ──▶ opted_in_sms=false
                                                   opted_in_email=false
                                                   lead_status='DNC'

  Clicks unsubscribe link  ──▶ email-optout    ──▶ opted_in_email=false
                               worker

  Agent clicks "Mark DNC"  ──▶ LiveChat UI     ──▶ opted_in_sms=false
                                                   opted_in_email=false
                                                   lead_status='DNC'

  Keyword rule matches     ──▶ messageProcessor──▶ opted_in_sms=false
                                                   and/or
                                                   opted_in_email=false

  Workflow action node     ──▶ unifiedWorkflows──▶ Individual or
   (set-sms-opt-out,                                combined flags
    set-email-opt-out,
    mark-dnc)
```

---

## 2. Where Each Filter Is Checked (And Where It's Not)

Understanding what gets re-checked after delays is critical for knowing where the safety net is tight vs. where it relies on the initial enrollment gate.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                    AT ENROLLMENT TIME                           │
  │                    (checked ONCE at start)                      │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ✅ Duplicate enrollment     (line ~336, can_enroll_contact)    │
  │  ✅ Lead status filter       (line ~660, allowedStatuses)       │
  │  ✅ Advanced conditions      (line ~10482, advancedFilter)      │
  │     e.g. "lead_status = Appointment Set"                        │
  │     e.g. "custom.branch = Hansons"                              │
  │  ✅ DNC / opted_in check     (in delay pre-check)              │
  │                                                                 │
  └──────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │                    POST-DELAY RE-CHECKS                        │
  │         (after every delay/wait step completes)                │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ✅ lead_status = 'DNC'       → stop workflow                  │
  │  ✅ opted_in_sms === false    → stop workflow                  │
  │  ✅ contact not found         → stop workflow                  │
  │  ✅ DB query failed           → stop workflow (fail-safe)      │
  │                                                                 │
  │  ❌ Lead status filter        NOT RE-CHECKED                   │
  │     (allowedStatuses like                                       │
  │      "New Lead", "Appointment Set")                             │
  │                                                                 │
  │  ❌ Advanced conditions       NOT RE-CHECKED                   │
  │     (custom field filters from                                  │
  │      Enrollment Rules UI)                                       │
  │                                                                 │
  └──────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │              PER-STEP CHECK (before send-message / send-email) │
  │              (only when previous step was a delay)              │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ✅ Lead status filter        RE-CHECKED HERE (line ~2140)     │
  │     Uses: step-specific leadStatusCheck OR                      │
  │           enrollment leadStatusFilter as fallback               │
  │     → Blocks if lead_status not in allowedStatuses              │
  │                                                                 │
  │  ❌ Advanced conditions       NOT RE-CHECKED                   │
  │     (custom field conditions from                               │
  │      Enrollment Rules UI are never                              │
  │      re-evaluated mid-workflow)                                 │
  │                                                                 │
  └──────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │              FINAL SEND CHECK (sendSMSDirectly/sendEmailDir.)  │
  ├─────────────────────────────────────────────────────────────────┤
  │                                                                 │
  │  ✅ DNC check                                                   │
  │  ✅ opted_in_sms / opted_in_email                               │
  │  ❌ Lead status filter       NOT CHECKED                       │
  │  ❌ Advanced conditions      NOT CHECKED                       │
  │                                                                 │
  └─────────────────────────────────────────────────────────────────┘
```

**Why is this OK?**

The lead status filter IS re-checked at the per-step level before every communication step that follows a delay. That's exactly when it matters — after time has passed and the status could have changed.

Advanced conditions (custom field filters) are "gate at the door" checks — they decide who enters the workflow. Custom field values like branch/company rarely change mid-workflow. The real danger is status changes (DNC, opt-out, lead status), and those ARE re-checked.

---

## 3. Stop On Response Mechanism

"Stop sequence when contact responds" and "Stop on Lead Response" are **opt-in per sequence/flow**. When toggled OFF, the workflow does NOT care if the contact replied — it keeps sending. This is by design for multi-campaign scenarios.

```
  WHEN CONTACT REPLIES (inbound message arrives)
           │
           ▼
    autoStopService.js (backend)
    "Is stopOnResponse enabled for this execution?"
           │
      ┌────┴────┐
      │         │
    ON (true)  OFF (false)
      │         │
      ▼         ▼
    Sets:      Does NOTHING ← skips entirely
    execution  "Skipping execution - stopOnResponse is disabled"
    .status =
    'cancelled'
    .stopped_by_response = true
      │
      ▼
    Next time workflow checks (line ~776 or ~6606):
    "Is execution cancelled?" → YES → 🛑 Stop
```

**Multi-campaign scenario (both toggles OFF):**
- Contact replies to Campaign A → `autoStopService` skips (disabled)
- Campaign B is still running → `autoStopService` skips (disabled)
- Both campaigns keep sending as designed

**Important distinction:**
- "Stop on response" is a **business logic feature** (configurable)
- DNC / opt-out checks are **hard safety guardrails** (always enforced)
- A contact texting "STOP" triggers Twilio opt-out → `opted_in_sms: false` → blocked at send time regardless of toggle state
- A normal reply like "thanks" with stop-on-response OFF → messages keep flowing

---

## 4. Opt-In / Opt-Out Write Paths

These are all the places in the codebase where `opted_in_sms` and `opted_in_email` are SET or UPDATED:

### Workflow Engine Actions (`trigger/unifiedWorkflows.js`)

Flow Builder action nodes that can be dragged into workflows:

| Function | Line | Sets |
|----------|------|------|
| `setSmsOptInDirectly()` | ~11635 | `opted_in_sms: true` |
| `setSmsOptOutDirectly()` | ~11691 | `opted_in_sms: false` |
| `setEmailOptInDirectly()` | ~11523 | `opted_in_email: true` |
| `setEmailOptOutDirectly()` | ~11579 | `opted_in_email: false` |
| `markLeadStatusDNCDirectly()` | ~11462 | `opted_in_sms: false`, `opted_in_email: false`, `lead_status: 'DNC'` |

### Keyword Rule Automation (`backend/src/services/messageProcessor.js`)

When inbound messages match keyword rules:

| Function | Line | Sets |
|----------|------|------|
| `executeDNCAction()` | ~28 | `opted_in_sms: false`, `opted_in_email: false`, `lead_status: 'DNC'` |
| `executeSmsOptOutAction()` | ~55 | `opted_in_sms: false` |
| `executeEmailOptOutAction()` | ~79 | `opted_in_email: false` |

### Twilio STOP Keyword (`backend/src/routes/twilio.js` ~line 730)

When Twilio detects opt-out keywords (STOP, UNSUBSCRIBE, etc.):
```
opted_in_sms: false, opted_in_email: false, lead_status: 'DNC'
```

### Email Unsubscribe Link (`cloudflare-workers/email-optout/src/index.js` ~line 409)

One-click unsubscribe from email footer: `opted_in_email: false`

### LiveChat UI - Manual DNC Toggle

**Mark DNC** (sets both to `false`):
- `frontend/src/components/livechat/UserDetails.js` ~line 884
- `frontend/src/components/livechat2/ChatArea.js` ~line 764

**Unmark DNC** (sets both back to `true`):
- `frontend/src/components/livechat/UserDetails.js` ~line 957
- `frontend/src/components/livechat2/ChatArea.js` ~line 824

### New Contact Defaults (always opt-in)

| Source | File | Defaults |
|--------|------|----------|
| Add Contact modal | `frontend/src/components/contactV2/AddContactModal.js` ~line 227 | `true` / `true` |
| Board contact form | `frontend/src/components/board/components/ContactForm.js` | `true` / `true` |
| CSV import | `trigger/importContactsTasks.js` ~line 99 | `true` / `true` |
| Booking page | `cloudflare-workers/booking-pages-worker/src/index.ts` ~line 777 | `true` / `true` |

### ServiceTitan Sync (`cloudflare-workers/servicetitan-sync/src/contactSync.ts`)

**Preserves** existing opt-in values during sync — does not overwrite them.

---

## 5. Summary Matrix

```
  Check                        │Sandbox │ Enroll │ Post-Delay │ Per-Step │ Send
  ─────────────────────────────┼────────┼────────┼────────────┼──────────┼─────
  Sandbox whitelist             │   ✅   │   -    │     -      │    -     │  ✅
  Duplicate enrollment         │   -    │   ✅   │     -      │    -     │  -
  Lead status filter           │   -    │   ✅   │     ❌     │    ✅    │  ❌
   (allowedStatuses)           │        │        │            │(after    │
                               │        │        │            │ delay)   │
  Advanced conditions          │   -    │   ✅   │     ❌     │    ❌    │  ❌
   (custom field filters)      │        │        │            │          │
  DNC (lead_status='DNC')      │   -    │   ✅*  │     ✅     │    -     │  ✅
  opted_in_sms === false       │   -    │   ✅*  │     ✅     │    -     │  ✅
  opted_in_email === false     │   -    │   -    │     ❌**   │    -     │  ✅
  Contact not found            │   -    │   -    │     ✅     │    -     │  ✅
  DB query fail-safe           │   ✅   │   -    │     ✅     │    -     │  ✅

  * DNC/opt-out at enrollment is checked via pre-delay DNC check
  ** Post-delay only checks opted_in_sms, NOT opted_in_email.
     However, sendEmailDirectly() checks opted_in_email at send time.
```

---

## 6. Key Takeaways

0. **Sandbox Mode**: Workspace-level kill switch — blocks ALL outbound SMS/email unless contact is whitelisted. First check in pipeline. Toggle in Settings > Workspace.
1. **Defense in depth**: Multiple redundant checks ensure no single failure leads to accidental sends
2. **Fail-safe principle**: If the system can't verify a contact's DNC/sandbox status (DB error, contact not found), it **blocks by default**
3. **Hard vs. soft guardrails**:
   - **Hard** (always enforced): Sandbox, DNC, `opted_in_sms`, `opted_in_email` — cannot be bypassed
   - **Soft** (configurable): Stop on response, lead status filter, advanced conditions — controlled by sequence/flow settings
4. **Test mode**: When `isTest: true`, absolutely nothing is sent — all external calls return mock results
5. **Stop propagation**: After ANY step returns `shouldStopWorkflow: true`, the entire remaining workflow is cancelled
6. **Multi-campaign safety**: Stop-on-response is per-execution, so a reply on one campaign doesn't kill other campaigns (when toggle is OFF)

### The one scenario that matters most:

```
  Contact enrolled as "New Lead"
       ↓
  ⏳ 2 day delay
       ↓
  Contact replies → status changes to "Responded"
       ↓
  Per-step check: "Responded" not in allowedStatuses → 🛑 BLOCKED ✅
```

### Key files to know:

| File | Purpose |
|------|---------|
| `trigger/sandboxCheck.js` | Sandbox mode check utility (Trigger.dev) |
| `backend/src/services/sandboxCheck.js` | Sandbox mode check utility (Backend) |
| `trigger/unifiedWorkflows.js` | Main workflow engine — all checks live here |
| `backend/src/services/autoStopService.js` | Stop-on-response logic (external cancellation) |
| `backend/src/services/messageProcessor.js` | Keyword-based opt-out automation |
| `backend/src/routes/twilio.js` | Twilio STOP keyword handling |
| `cloudflare-workers/email-optout/src/index.js` | Email unsubscribe link handler |
| `frontend/src/components/livechat/UserDetails.js` | Manual DNC toggle in LiveChat UI |
| `frontend/src/components/settings/SandboxWhitelistManager.js` | Sandbox whitelist management UI |
