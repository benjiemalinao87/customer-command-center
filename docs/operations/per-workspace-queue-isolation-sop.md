# Per-Workspace Queue Isolation & Tiered Queue Management — SOP

## Table of Contents
1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Architecture](#architecture)
4. [Queue Definitions & Tier System](#queue-definitions--tier-system)
5. [How concurrencyKey Works](#how-concurrencykey-works)
6. [Data Flow & State Machine](#data-flow--state-machine)
7. [Backend Integration Points](#backend-integration-points)
8. [Trigger.dev Task Integration Points](#triggerdev-task-integration-points)
9. [Workspace Tier Management](#workspace-tier-management)
10. [Command Center Queue Dashboard](#command-center-queue-dashboard)
11. [Deployment Procedure](#deployment-procedure)
12. [Verification & Testing](#verification--testing)
13. [Troubleshooting](#troubleshooting)
14. [Incident Response Runbook](#incident-response-runbook)
15. [Capacity Planning](#capacity-planning)
16. [Key Files Reference](#key-files-reference)

---

## Overview

### What Is Per-Workspace Queue Isolation?

A concurrency control system that prevents any single workspace from monopolizing shared workflow execution resources. Each workspace gets its own isolated sub-queue with a capped concurrency limit, determined by its assigned tier (standard or premium).

### Key Benefits

- **Zero cross-workspace interference** — one workspace's 5,000-contact broadcast cannot block another workspace's single workflow
- **Tiered resource allocation** — standard workspaces get 15 concurrent slots, premium get 30
- **No code changes to task definitions** — isolation is applied at trigger time via `concurrencyKey`
- **Full backward compatibility** — existing task definitions and queue references still work
- **Centralized control** — manage tiers and override limits from the Command Center dashboard

### System Components

1. **Tiered Queue Definitions** — `trigger/queues.js` (workflow-standard, workflow-premium)
2. **Queue Routing Helper** — `trigger/utils/workspaceQueueHelper.js`
3. **concurrencyKey on All Trigger Calls** — 50+ call sites across backend + trigger tasks
4. **Command Center Dashboard** — Queue status cards, workspace tier table, override controls
5. **Workspace Settings Storage** — `workspace_settings` table with `QUEUE_TIER` key

---

## Problem Statement

### The Incident (2026-02-25)

```
┌─────────────────────────────────────────────────────────────────┐
│                        BEFORE (Shared Pool)                      │
│                                                                  │
│  workflowQueue: concurrencyLimit = 80 (shared across ALL)       │
│                                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │  Workspace 45963 (broadcast 5,000 contacts)           │      │
│  │  ████████████████████████████████████████████████████  │ 72   │
│  │                                                       │      │
│  │  Workspace 12345 (single workflow)                    │      │
│  │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  0   │
│  │  ↑ BLOCKED — waiting for 45963's runs to finish       │      │
│  │                                                       │      │
│  │  Workspace 67890 (3 workflows)                        │      │
│  │  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  8   │
│  │                                                       │      │
│  │  Total: 80/80 — queue FULL, first-come-first-served   │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                  │
│  Result: Workspace 12345 locked out for hours                   │
│  Impact: Customer complaints, missed automations, SLA breach    │
└─────────────────────────────────────────────────────────────────┘
```

### Root Cause

- Single shared `workflowQueue` with 80-slot limit
- No per-workspace isolation — all workspaces compete for the same pool
- Large broadcasts consume all slots, starving other workspaces
- No visibility into per-workspace queue usage
- No way to adjust limits without code deploy

---

## Architecture

### High-Level Architecture (After Fix)

```
┌───────────────────────────────────────────────────────────────────────┐
│                         AFTER (Tiered Per-Workspace)                  │
│                                                                       │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐   │
│  │  workflow-standard (15/ws)  │  │  workflow-premium (30/ws)   │   │
│  │                             │  │                             │   │
│  │  ws:45963  ████████████████ │  │  ws:99999  ████████████░░░ │   │
│  │            15/15 (at cap)   │  │            12/30            │   │
│  │                             │  │                             │   │
│  │  ws:12345  ████░░░░░░░░░░░ │  │                             │   │
│  │            4/15 (running!)  │  │                             │   │
│  │                             │  │                             │   │
│  │  ws:67890  ██░░░░░░░░░░░░░ │  │                             │   │
│  │            2/15 (running!)  │  │                             │   │
│  └─────────────────────────────┘  └─────────────────────────────┘   │
│                                                                       │
│  Each workspace isolated by concurrencyKey.                          │
│  ws:45963 at cap does NOT block ws:12345 or ws:67890.               │
│  Environment total cap: 400 across ALL queues.                       │
└───────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Trigger Call Site                             │
│  (backend service, route handler, or trigger task)                   │
│                                                                      │
│  tasks.trigger("trigger-workflow", payload, {                       │
│    concurrencyKey: String(workspaceId),  ← Per-workspace isolation  │
│  });                                                                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Trigger.dev Platform                            │
│                                                                      │
│  1. Receives trigger request with concurrencyKey                    │
│  2. Looks up queue by task definition (workflow-standard)            │
│  3. Creates sub-queue: "workflow-standard:ws:45963"                 │
│  4. Checks sub-queue concurrency: running < 15?                     │
│     ├── YES → Execute immediately                                   │
│     └── NO  → Queue the run (waits for slot)                       │
│  5. Run completes → slot freed → next queued run starts             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Task Execution                                     │
│                                                                      │
│  triggerWorkflowTask runs with:                                     │
│    - workflowId, contactId, workspaceId                             │
│    - Queue: workflow-standard                                       │
│    - ConcurrencyKey: "45963"                                        │
│    - Isolated from all other workspaces                             │
└─────────────────────────────────────────────────────────────────────┘
```

### Tier Resolution Flow

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│  Trigger      │     │  workspaceQueue     │     │  workspace_      │
│  Call Site    │────▶│  Helper             │────▶│  settings        │
│              │     │                     │     │  (Supabase)      │
│  workspaceId │     │  getWorkflow        │     │                  │
│  = "45963"   │     │  TriggerOptions()   │     │  QUEUE_TIER:     │
└──────────────┘     └─────────┬───────────┘     │  {"tier":"std"}  │
                               │                  └──────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Check tier cache   │
                    │  (5-min TTL)        │
                    ├─────────────────────┤
                    │  Cache HIT?         │
                    │  ├── YES → return   │
                    │  └── NO → DB query  │
                    ├─────────────────────┤
                    │  Returns:           │
                    │  {                  │
                    │   concurrencyKey:   │
                    │     "45963",        │
                    │   queue:            │
                    │     "workflow-      │
                    │      standard"      │
                    │  }                  │
                    └─────────────────────┘
```

---

## Queue Definitions & Tier System

### All Queue Definitions

```
┌────────────────────────────────────────────────────────────────┐
│                    Queue Allocation Map                          │
│                                                                  │
│  Environment Limit: 400 concurrent (burst 800)                  │
│                                                                  │
│  WORKFLOW QUEUES (tiered, per-workspace isolation)               │
│  ├── workflow-standard    15/ws   Default tier                  │
│  └── workflow-premium     30/ws   High-volume tier              │
│                                                                  │
│  OPERATIONAL QUEUES (shared, no per-workspace isolation)        │
│  ├── sms-operations       40      Twilio rate-limited           │
│  ├── email-operations     30      SendGrid rate-limited         │
│  ├── external-api         30      HTTP/connector calls          │
│  ├── database-ops         50      Fast DB operations            │
│  ├── scheduled-waits      30      Delay/wait tasks              │
│  ├── bulk-operations      20      Import/bulk processing        │
│  ├── reminders            20      Appointment reminders         │
│  ├── time-based-triggers  20      Scheduled triggers            │
│  ├── date-distance-trig.  20      Date field triggers           │
│  ├── trigger-events       10      Field change monitoring       │
│  └── missed-call-trig.    10      Missed call triggers          │
│                                                                  │
│  Total allocated: ~325 (within 400 base limit)                  │
└────────────────────────────────────────────────────────────────┘
```

### Tier Comparison

```
┌─────────────────┬───────────────┬───────────────┐
│                 │   STANDARD    │   PREMIUM     │
├─────────────────┼───────────────┼───────────────┤
│ Queue Name      │ workflow-     │ workflow-     │
│                 │ standard      │ premium       │
├─────────────────┼───────────────┼───────────────┤
│ Per-WS Limit    │     15        │     30        │
├─────────────────┼───────────────┼───────────────┤
│ Use Case        │ Most          │ High-volume   │
│                 │ workspaces    │ broadcasters  │
├─────────────────┼───────────────┼───────────────┤
│ Default?        │ YES           │ NO            │
├─────────────────┼───────────────┼───────────────┤
│ DB Setting      │ (none needed) │ QUEUE_TIER:   │
│                 │               │ {"tier":      │
│                 │               │  "premium"}   │
├─────────────────┼───────────────┼───────────────┤
│ 5K broadcast    │ 15 at a time  │ 30 at a time  │
│ duration        │ ~333 batches  │ ~167 batches  │
└─────────────────┴───────────────┴───────────────┘
```

---

## How concurrencyKey Works

### Trigger.dev concurrencyKey Mechanics

```
                    tasks.trigger("trigger-workflow", payload, {
                      concurrencyKey: "45963"
                    })
                           │
                           ▼
            ┌─────────────────────────────┐
            │   Trigger.dev Queue Engine   │
            │                             │
            │   Queue: workflow-standard  │
            │   concurrencyLimit: 15      │
            │                             │
            │   Sub-queues by key:        │
            │   ┌─────────────────────┐   │
            │   │ key: "45963"        │   │
            │   │ running: 15/15 FULL │   │
            │   │ queued: 4,985       │   │
            │   └─────────────────────┘   │
            │   ┌─────────────────────┐   │
            │   │ key: "12345"        │   │
            │   │ running: 4/15       │   │
            │   │ queued: 0           │   │
            │   └─────────────────────┘   │
            │   ┌─────────────────────┐   │
            │   │ key: "67890"        │   │
            │   │ running: 2/15       │   │
            │   │ queued: 0           │   │
            │   └─────────────────────┘   │
            │                             │
            │   Each sub-queue isolated!  │
            │   key "45963" at cap does   │
            │   NOT block "12345"         │
            └─────────────────────────────┘
```

### Without concurrencyKey (Before)

```
tasks.trigger("trigger-workflow", payload)
  → No 3rd argument
  → All runs share one pool
  → First-come-first-served
  → One workspace CAN block others
```

### With concurrencyKey (After)

```
tasks.trigger("trigger-workflow", payload, {
  concurrencyKey: String(workspaceId)
})
  → 3rd argument: { concurrencyKey: "45963" }
  → Runs grouped by workspaceId
  → Each group has its own concurrency cap
  → Workspace 45963 at 15/15 → its runs queue
  → Workspace 12345 at 4/15 → runs immediately
```

---

## Data Flow & State Machine

### Workflow Trigger Lifecycle

```
                              ┌──────────────┐
                              │   TRIGGER     │
                              │   REQUEST     │
                              └──────┬───────┘
                                     │
                                     ▼
                           ┌─────────────────────┐
                           │  Extract workspaceId │
                           │  from payload        │
                           └─────────┬───────────┘
                                     │
                                     ▼
                           ┌─────────────────────┐
                           │  Build trigger opts: │
                           │  { concurrencyKey:   │
                           │    String(wsId) }    │
                           └─────────┬───────────┘
                                     │
                                     ▼
                           ┌─────────────────────┐
                           │  tasks.trigger(      │
                           │    taskId,           │
                           │    payload,          │
                           │    options           │
                           │  )                   │
                           └─────────┬───────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────────┐
                    │    Trigger.dev Queue Decision       │
                    │                                    │
                    │  Sub-queue for this workspaceId:   │
                    │  running < concurrencyLimit?       │
                    └───────────┬──────────┬─────────────┘
                       YES      │          │     NO
                                ▼          ▼
                    ┌───────────────┐  ┌───────────────┐
                    │   EXECUTING   │  │   QUEUED      │
                    │               │  │   (waiting    │
                    │   Task runs   │  │   for slot)   │
                    │   immediately │  │               │
                    └───────┬───────┘  └───────┬───────┘
                            │                  │
                            │          slot freed
                            │                  │
                            ▼                  ▼
                    ┌───────────────┐  ┌───────────────┐
                    │  COMPLETED /  │  │   EXECUTING   │
                    │  FAILED /     │  │   (dequeued)  │
                    │  CANCELLED    │  │               │
                    └───────────────┘  └───────┬───────┘
                                               │
                                               ▼
                                       ┌───────────────┐
                                       │  COMPLETED /  │
                                       │  FAILED /     │
                                       │  CANCELLED    │
                                       └───────────────┘
```

### Tier Resolution State Machine

```
     ┌────────────────────────────────────────────────────┐
     │              getWorkspaceTier(workspaceId)          │
     └────────────────────┬───────────────────────────────┘
                          │
                          ▼
                ┌───────────────────┐
                │  Check tier cache │
                │  (Map in memory)  │
                └────────┬──────────┘
                         │
                    ┌────┴────┐
                    │ Cached? │
                    └────┬────┘
                   YES   │   NO
                    │    │    │
                    ▼    │    ▼
          ┌──────────┐  │  ┌──────────────────┐
          │ Age < 5m?│  │  │ supabaseAdmin    │
          └────┬─────┘  │  │ provided?        │
          YES  │  NO    │  └────┬─────────────┘
           │   │   │    │  YES  │  NO
           ▼   │   ▼    │   │  │   │
    ┌──────┐   │ ┌────┐ │   ▼  │   ▼
    │Return│   │ │Stale│ │ ┌──────────┐ ┌──────────┐
    │cached│   │ │re-  │ │ │DB Query: │ │Return    │
    │tier  │   │ │fetch│ │ │workspace │ │"standard"│
    └──────┘   │ └──┬─┘ │ │_settings │ │(default) │
               │    │    │ │QUEUE_TIER│ └──────────┘
               │    ▼    │ └────┬─────┘
               │ ┌──────────┐  │
               │ │DB Query  │  │
               │ └────┬─────┘  │
               │      │        │
               │      ▼        ▼
               │ ┌─────────────────┐
               │ │ Cache result    │
               │ │ (tier + ts)     │
               │ └────────┬────────┘
               │          │
               ▼          ▼
          ┌───────────────────────┐
          │  Return tier:         │
          │  "standard" | "premium│
          └───────────────────────┘
```

### Full Request Path: Backend → Trigger.dev → Execution

```
┌──────────┐   ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐
│ Inbound  │   │   Backend    │   │   Trigger.dev    │   │  Task        │
│ Request  │   │   Service    │   │   Platform       │   │  Execution   │
└────┬─────┘   └──────┬───────┘   └────────┬─────────┘   └──────┬───────┘
     │                │                     │                     │
     │  API/webhook   │                     │                     │
     │───────────────▶│                     │                     │
     │                │                     │                     │
     │                │  tasks.trigger(     │                     │
     │                │    "trigger-wf",   │                     │
     │                │    payload,         │                     │
     │                │    {concurrencyKey: │                     │
     │                │     "45963"}        │                     │
     │                │  )                  │                     │
     │                │────────────────────▶│                     │
     │                │                     │                     │
     │                │  handle = {         │  Route to sub-queue │
     │                │    id: "run_xxx"    │  "workflow-standard │
     │                │  }                  │   :45963"           │
     │                │◀────────────────────│                     │
     │                │                     │                     │
     │  { success,    │                     │  Slot available?    │
     │    runId }     │                     │  ├── YES → execute  │
     │◀───────────────│                     │  └── NO → queue     │
     │                │                     │────────────────────▶│
     │                │                     │                     │
     │                │                     │                     │  Execute
     │                │                     │                     │  workflow
     │                │                     │                     │  steps
     │                │                     │                     │
     │                │                     │  Run complete       │
     │                │                     │◀────────────────────│
     │                │                     │                     │
     │                │                     │  Free slot →        │
     │                │                     │  dequeue next       │
     │                │                     │  run for "45963"    │
     │                │                     │                     │
```

---

## Backend Integration Points

### Pattern: Adding concurrencyKey

Every `tasks.trigger()` call in the backend must include `concurrencyKey` as a 3rd argument:

```javascript
// BEFORE (no isolation):
const handle = await tasks.trigger('trigger-workflow', payload);

// AFTER (per-workspace isolation):
const handle = await tasks.trigger('trigger-workflow', payload, {
  concurrencyKey: String(workspaceId),
});
```

### All Backend Call Sites

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Backend Trigger Call Sites (20+)                     │
│                                                                      │
│  SERVICES (deploy via git push → Railway)                           │
│  ├── unifiedWorkflowExecutionService.js:151  trigger-workflow       │
│  ├── flowService.js:138                      trigger-workflow       │
│  ├── aiAgentService.js:1011                  trigger-workflow       │
│  ├── sequenceService.js:2060                 trigger-workflow       │
│  ├── dateDistanceTriggerService.js:260       date-distance-eval    │
│  ├── missedCallTriggerService.js:160         missed-call-trigger   │
│  ├── timeBasedTriggerService.js:307          time-based-trigger    │
│  ├── actionExecutionService.js:151,183,216   process-*-action (3x) │
│  ├── emailEventsService.js:291               email-open-event      │
│  └── TriggerDevProvider.js:64,123,133        generic provider (3x) │
│                                                                      │
│  ROUTES (deploy via git push → Railway)                             │
│  ├── unifiedWorkflowRoutes.js:91,291,412     trigger-workflow (3x) │
│  ├── webhookRoutes.js:730                    trigger-workflow       │
│  ├── metaRoutes.js:217                       trigger-workflow       │
│  ├── importRoutes.js:98                      import-contacts       │
│  ├── triggerRoutes.js:71,240,970             SMS tasks (3x)        │
│  ├── appointmentRemindersRoutes.js:49,60,119 reminders (3x)        │
│  ├── pipeline.js:554,866                     opportunity (2x)      │
│  ├── customFieldsRoutes.js:27                process-trigger-event │
│  ├── triggers/webhooks.js:30,68              trigger-event (2x)    │
│  ├── twilio.js:1695                          swap-sender-number    │
│  ├── jobsRoutes.js:349                       generic job           │
│  └── index.js:1336                           trigger-workflow      │
│                                                                      │
│  CONTROLLERS                                                        │
│  └── triggersController.js:1426              trigger-workflow       │
└─────────────────────────────────────────────────────────────────────┘
```

### WorkspaceId Extraction Patterns

Different files extract `workspaceId` from different sources:

```
┌──────────────────────────┬──────────────────────────────────┐
│  Source                  │  Files Using This Pattern        │
├──────────────────────────┼──────────────────────────────────┤
│  payload.workspaceId     │  Most services                   │
│  req.workspaceId         │  Route handlers (middleware)     │
│  workspace_id (from DB)  │  pipeline.js, twilio.js          │
│  contact.workspace_id    │  timeBasedTriggerService.js      │
│  emailEvent.workspace_id │  emailEventsService.js           │
│  change.workspaceId      │  triggers/webhooks.js (batch)    │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Trigger.dev Task Integration Points

### Pattern: Adding concurrencyKey in Task Files

Tasks that trigger other tasks also need concurrencyKey:

```javascript
// Inside a running trigger task:
const handle = await tasks.trigger('trigger-workflow', nestedPayload, {
  concurrencyKey: String(workspaceId),
});
```

### All Trigger Task Call Sites

```
┌─────────────────────────────────────────────────────────────────────┐
│              Trigger.dev Task Call Sites (9 files)                    │
│                                                                      │
│  (deploy via npx trigger deploy)                                    │
│                                                                      │
│  ├── unifiedWorkflows.js:3937         connector-execution           │
│  ├── unifiedWorkflows.js:11308        trigger-workflow (subscribe)  │
│  ├── unifiedWorkflows.js:11441        trigger-workflow (go-to)      │
│  ├── trigger-event-processor.js:840   trigger-workflow              │
│  ├── dateDistanceEvaluationTask.js:300  trigger-workflow            │
│  ├── dateDistanceEvaluationTask.js:462  send-single-sequence-step  │
│  ├── dateDistanceEvaluationTask.js:674  trigger-workflow            │
│  ├── timeBasedTriggerTask.js:305      trigger-workflow              │
│  ├── missedCallTriggerTask.js:124     trigger-workflow              │
│  ├── email-open-processor.js:306      trigger-workflow              │
│  ├── email-open-processor.js:401      process-email-open-event     │
│  ├── opportunityTriggerProcessor.js:290 trigger-workflow            │
│  ├── unifiedWorkflowsOptimized.js:1671 trigger-workflow-optimized  │
│  ├── unifiedWorkflowsOptimized.js:1902 connector-execution         │
│  └── appointmentReminders.js:387      trigger-workflow              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Workspace Tier Management

### Tier Storage

Tiers are stored in the existing `workspace_settings` table:

```
┌─────────────────────────────────────────────────────────┐
│  Table: workspace_settings                               │
│                                                          │
│  workspace_id │ settings_key │ settings_value            │
│  ─────────────┼──────────────┼────────────────────       │
│  45963        │ QUEUE_TIER   │ {"tier": "premium"}       │
│  12345        │ QUEUE_TIER   │ {"tier": "standard"}      │
│  67890        │ (no row)     │ → defaults to standard    │
│                                                          │
│  No migration needed — uses existing table.              │
│  Default: all workspaces are "standard" unless set.      │
└─────────────────────────────────────────────────────────┘
```

### Setting a Workspace to Premium (SQL)

```sql
INSERT INTO workspace_settings (workspace_id, settings_key, settings_value)
VALUES ('45963', 'QUEUE_TIER', '{"tier": "premium"}')
ON CONFLICT (workspace_id, settings_key)
DO UPDATE SET settings_value = EXCLUDED.settings_value;
```

### Setting via Command Center

1. Navigate to **System → Queues** in the Command Center sidebar
2. Scroll to **Workspace Tier Assignments** table
3. Find the workspace row
4. Change the dropdown from **Standard** to **Premium**
5. Change takes effect within 5 minutes (tier cache TTL)

### Tier Cache Behavior

```
┌──────────────────────────────────────────────────────────┐
│                  Tier Cache Lifecycle                      │
│                                                           │
│  Time 0:00 — Workspace upgraded to premium via UI        │
│              DB updated: QUEUE_TIER = {"tier":"premium"}  │
│                                                           │
│  Time 0:00–5:00 — Cache still has "standard"             │
│              Triggers still use workflow-standard queue   │
│              (old runs are not affected)                  │
│                                                           │
│  Time 5:00 — Cache TTL expires                           │
│              Next trigger call refreshes from DB          │
│              Cache updated to "premium"                   │
│                                                           │
│  Time 5:01+ — All new triggers use workflow-premium      │
│              30 concurrent slots per workspace            │
│                                                           │
│  NOTE: Already-running and already-queued tasks are      │
│  NOT affected. Only NEW trigger calls use the new tier.  │
└──────────────────────────────────────────────────────────┘
```

---

## Command Center Queue Dashboard

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⬡ Queue Management                                       Refresh  │
│  Monitor and control per-workspace workflow queue isolation          │
│                                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────┐ │
│  │ Total Queues │ │ Total Running│ │ Total Queued │ │ Paused     │ │
│  │     14       │ │     47       │ │     312      │ │     0      │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────────────┘ │
│                                                                      │
│  Queue Status                                                        │
│  ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ workflow-standard  │ │ workflow-premium   │ │ sms-operations   │  │
│  │ Running: 12/15    │ │ Running: 8/30     │ │ Running: 5/40    │  │
│  │ Queued:  47       │ │ Queued:  0        │ │ Queued:  12      │  │
│  │ ████████████░░░░░ │ │ ████████░░░░░░░░░ │ │ ████░░░░░░░░░░░ │  │
│  │ [Override] [⏸]    │ │ [Override] [⏸]    │ │ [Override] [⏸]   │  │
│  └───────────────────┘ └───────────────────┘ └──────────────────┘  │
│                                                                      │
│  ┌───────────────────┐ ┌───────────────────┐ ┌──────────────────┐  │
│  │ email-operations   │ │ database-ops      │ │ external-api     │  │
│  │ Running: 3/30     │ │ Running: 15/50    │ │ Running: 7/30    │  │
│  │ Queued:  0        │ │ Queued:  5        │ │ Queued:  3       │  │
│  │ ██░░░░░░░░░░░░░░░ │ │ ██████░░░░░░░░░░░ │ │ █████░░░░░░░░░░ │  │
│  │ [Override] [⏸]    │ │ [Override] [⏸]    │ │ [Override] [⏸]   │  │
│  └───────────────────┘ └───────────────────┘ └──────────────────┘  │
│                                                                      │
│  Workspace Tier Assignments                                          │
│  Standard: 15 concurrent workflows/ws · Premium: 30 concurrent/ws  │
│  ┌──────────────┬──────────┬────────────┬────────┬────────┐        │
│  │ Workspace    │ ID       │ Tier       │ Active │ Status │        │
│  ├──────────────┼──────────┼────────────┼────────┼────────┤        │
│  │ ClientCo     │ 45963    │ Standard ▼ │  12    │   ●    │        │
│  │ BigClient    │ 99999    │ Premium  ▼ │   8    │   ●    │        │
│  │ SmallBiz     │ 12345    │ Standard ▼ │   4    │   ●    │        │
│  │ AgencyCorp   │ 67890    │ Standard ▼ │   2    │   ●    │        │
│  └──────────────┴──────────┴────────────┴────────┴────────┘        │
└─────────────────────────────────────────────────────────────────────┘
```

### Dashboard Features

```
┌──────────────────────────────────────────────────────────┐
│  Feature                  │  How It Works               │
├───────────────────────────┼─────────────────────────────┤
│  Queue Status Cards       │  GET /api/v1/queues         │
│  (running/queued/limit)   │  Auto-refresh every 15s     │
│                           │                             │
│  Override Concurrency     │  POST /api/v1/queues/{name} │
│                           │  /concurrency/override      │
│                           │  Changes limit for ENTIRE   │
│                           │  queue tier (all workspaces) │
│                           │                             │
│  Reset Concurrency        │  POST /api/v1/queues/{name} │
│                           │  /concurrency/reset         │
│                           │  Reverts to code-defined    │
│                           │                             │
│  Pause/Resume Queue       │  POST /api/v1/queues/{name} │
│                           │  /pause or /resume          │
│                           │  Stops new runs from        │
│                           │  executing (queued pile up)  │
│                           │                             │
│  Workspace Tier Table     │  Reads from Supabase:       │
│                           │  workspace_settings +       │
│                           │  flow_executions counts     │
│                           │  Auto-refresh every 30s     │
│                           │                             │
│  Change Workspace Tier    │  UPSERT workspace_settings  │
│                           │  QUEUE_TIER value            │
│                           │  Takes effect in ≤5 min     │
└──────────────────────────────────────────────────────────┘
```

### Important: Override vs Tier

```
                          ┌─────────────────────┐
                          │  Two Control Layers  │
                          └──────────┬──────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼                     │                     ▼
  ┌────────────────────┐             │       ┌────────────────────┐
  │  TIER ASSIGNMENT   │             │       │  QUEUE OVERRIDE    │
  │                    │             │       │                    │
  │  Per-workspace     │             │       │  Per-queue (global)│
  │  Controls which    │             │       │  Changes the limit │
  │  QUEUE a workspace │             │       │  for ALL workspaces│
  │  routes to         │             │       │  in that queue     │
  │                    │             │       │                    │
  │  standard → 15/ws  │             │       │  Override: 25      │
  │  premium → 30/ws   │             │       │  → ALL standard ws │
  │                    │             │       │  now get 25 slots  │
  │  Granularity:      │             │       │                    │
  │  per workspace     │             │       │  Granularity:      │
  │                    │             │       │  per queue (global) │
  └────────────────────┘             │       └────────────────────┘
                                     │
                              ┌──────┴──────┐
                              │ Use tiers   │
                              │ for per-ws  │
                              │ control.    │
                              │             │
                              │ Use override│
                              │ for         │
                              │ emergencies │
                              │ (affects    │
                              │ everyone).  │
                              └─────────────┘
```

---

## Deployment Procedure

### Two-Phase Deployment

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Deployment Sequence                               │
│                                                                      │
│  PHASE 1: Backend (Railway)                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │  $ git add -A                               │                    │
│  │  $ git commit -m "Per-workspace queue iso"  │                    │
│  │  $ git push origin main                     │                    │
│  │                                              │                    │
│  │  Railway auto-deploys from main branch.     │                    │
│  │  Wait for Railway build to complete (~3min). │                    │
│  │  Verify: Railway dashboard shows "Active".  │                    │
│  └─────────────────────────────────────────────┘                    │
│                       │                                              │
│                       ▼                                              │
│  PHASE 2: Trigger.dev Tasks                                         │
│  ┌─────────────────────────────────────────────┐                    │
│  │  $ npx trigger deploy                       │                    │
│  │                                              │                    │
│  │  Deploys trigger/ directory to Trigger.dev.  │                    │
│  │  Wait for deploy to complete (~2min).        │                    │
│  │  Verify: Trigger.dev dashboard shows new     │                    │
│  │  version with queue definitions.             │                    │
│  └─────────────────────────────────────────────┘                    │
│                       │                                              │
│                       ▼                                              │
│  PHASE 3: Command Center (if changed)                               │
│  ┌─────────────────────────────────────────────┐                    │
│  │  $ cd "Command Center/"                     │                    │
│  │  $ npm run build                            │                    │
│  │  $ # Deploy via your standard process       │                    │
│  └─────────────────────────────────────────────┘                    │
│                                                                      │
│  ⚠ IMPORTANT: Both Phase 1 AND Phase 2 must deploy!                │
│  Backend sends concurrencyKey → Trigger.dev must understand it.     │
│  If only one deploys, the system still works but without full       │
│  isolation on the un-deployed side.                                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Rollback Procedure

```
┌──────────────────────────────────────────────────────────┐
│  Rolling Back Queue Isolation                             │
│                                                           │
│  1. concurrencyKey is additive — removing it is safe     │
│     but NOT recommended (reverts to shared pool)         │
│                                                           │
│  2. To increase limits in emergency:                     │
│     Command Center → Queues → Override workflow-standard │
│     Set to higher value (e.g., 50)                       │
│     Takes effect immediately                             │
│                                                           │
│  3. To revert a specific workspace's tier:               │
│     DELETE FROM workspace_settings                       │
│     WHERE workspace_id = 'X'                             │
│     AND settings_key = 'QUEUE_TIER';                     │
│     → Falls back to standard (5-min cache delay)         │
│                                                           │
│  4. Full rollback (remove all isolation):                │
│     Revert git commits + redeploy both phases            │
│     NOT recommended — re-exposes the original problem    │
└──────────────────────────────────────────────────────────┘
```

---

## Verification & Testing

### Post-Deploy Verification Checklist

```
┌──────────────────────────────────────────────────────────────────┐
│  Step │ Action                              │ Expected Result    │
├───────┼─────────────────────────────────────┼────────────────────┤
│   1   │ Trigger a test workflow for ws A    │ Run starts, logs   │
│       │                                     │ show concurrency   │
│       │                                     │ Key in metadata    │
│       │                                     │                    │
│   2   │ Check Trigger.dev dashboard         │ Run shows queue:   │
│       │ Run → Metadata                      │ "workflow-standard"│
│       │                                     │ and concurrencyKey │
│       │                                     │ = workspaceId      │
│       │                                     │                    │
│   3   │ Trigger 20+ workflows for ws A      │ Only 15 run        │
│       │ (standard tier)                     │ concurrently, rest │
│       │                                     │ show as QUEUED     │
│       │                                     │                    │
│   4   │ While ws A is at 15/15,             │ ws B's workflow    │
│       │ trigger 1 workflow for ws B         │ runs IMMEDIATELY   │
│       │                                     │ (not blocked)      │
│       │                                     │                    │
│   5   │ Set ws A to premium tier            │ After 5 min,       │
│       │ via Command Center                  │ new triggers use   │
│       │                                     │ workflow-premium   │
│       │                                     │ (30 slots)         │
│       │                                     │                    │
│   6   │ Override workflow-standard to 25    │ All standard ws    │
│       │ via Command Center                  │ get 25 slots       │
│       │                                     │ immediately        │
│       │                                     │                    │
│   7   │ Reset override                      │ Reverts to 15      │
│       │                                     │ (code-defined)     │
│       │                                     │                    │
│   8   │ Pause workflow-standard             │ New runs queue     │
│       │                                     │ but don't execute  │
│       │                                     │                    │
│   9   │ Resume workflow-standard            │ Queued runs start  │
│       │                                     │ executing          │
└───────┴─────────────────────────────────────┴────────────────────┘
```

### Verifying concurrencyKey in Trigger.dev Dashboard

```
  Trigger.dev Dashboard → Runs → Select a run → Details

  ┌──────────────────────────────────────┐
  │  Run: run_abc123                     │
  │  Task: trigger-workflow              │
  │  Status: COMPLETED                   │
  │                                      │
  │  Queue: workflow-standard      ✓     │
  │  Concurrency Key: 45963       ✓     │
  │  Duration: 12.3s                     │
  └──────────────────────────────────────┘

  If "Concurrency Key" is missing → the trigger call
  site for this run was missed. Check the backend file
  that triggered it.
```

---

## Troubleshooting

### Common Issues & Fixes

```
┌──────────────────────────────────────────────────────────────────┐
│  ISSUE: Workspace still blocked after deploy                     │
│                                                                  │
│  CAUSE: Already-queued runs don't get retroactive concurrency   │
│         keys. They'll finish under the old shared pool.          │
│  FIX:   Wait for existing queue to drain. New triggers use     │
│         the new isolation. No action needed.                    │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: Tier change not taking effect                            │
│                                                                  │
│  CAUSE: 5-minute tier cache TTL                                 │
│  FIX:   Wait up to 5 minutes. Or restart the Trigger.dev       │
│         worker to clear the in-memory cache.                    │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: "workflow-standard" and "workflow-premium" not visible  │
│         in Trigger.dev dashboard                                 │
│                                                                  │
│  CAUSE: `npx trigger deploy` was not run after code change      │
│  FIX:   Run `npx trigger deploy` from project root              │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: Backend triggers not including concurrencyKey            │
│                                                                  │
│  CAUSE: `git push` not done, or Railway deploy still building  │
│  FIX:   Check Railway dashboard for deploy status               │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: Command Center shows 0 queues                            │
│                                                                  │
│  CAUSE: Trigger.dev API key missing or invalid                  │
│  FIX:   Check VITE_TRIGGER_DEV_API_KEY in .env                 │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: Override not taking effect                               │
│                                                                  │
│  CAUSE: Override uses wrong queue name                          │
│  FIX:   Queue names are exact: "workflow-standard", not         │
│         "workflow-queue" or "workflowQueue"                     │
├──────────────────────────────────────────────────────────────────┤
│  ISSUE: All workspaces stuck at 15 even after setting premium   │
│                                                                  │
│  CAUSE: Trigger call sites using getSimpleConcurrencyOptions    │
│         (concurrencyKey only, no queue routing)                 │
│  FIX:   Most backend call sites only add concurrencyKey.        │
│         The queue is determined by the task definition.          │
│         For tier routing, the task must use                     │
│         getWorkflowTriggerOptions with supabase access.         │
└──────────────────────────────────────────────────────────────────┘
```

---

## Incident Response Runbook

### Scenario: One Workspace Consuming Too Many Resources

```
┌──────────────────────────────────────────────────────────────────┐
│  INCIDENT: Workspace X running heavy broadcast, other workspaces │
│  experiencing slower-than-expected execution                     │
│                                                                  │
│  SEVERITY ASSESSMENT:                                            │
│  ┌────────────────────────────────────────┐                     │
│  │ Are other workspaces BLOCKED?          │                     │
│  │ ├── NO → Normal. Each ws has its cap. │                     │
│  │ │        15-slot cap means 15 at a     │                     │
│  │ │        time. Large broadcasts queue. │                     │
│  │ │        No action needed.             │                     │
│  │ │                                      │                     │
│  │ └── YES → Check if concurrencyKey is  │                     │
│  │           present on the trigger call. │                     │
│  │           If missing, this is a bug.   │                     │
│  │           Identify the call site.      │                     │
│  └────────────────────────────────────────┘                     │
│                                                                  │
│  IMMEDIATE ACTIONS:                                              │
│                                                                  │
│  1. Check Command Center → Queues                                │
│     See which queues are loaded                                 │
│                                                                  │
│  2. If a queue is at 100% and overloaded:                       │
│     → Override concurrency limit higher (temporary)             │
│     → e.g., Override workflow-standard from 15 → 25             │
│                                                                  │
│  3. If a specific workspace needs more:                          │
│     → Upgrade to premium tier (30 slots)                        │
│     → Takes effect in ≤5 minutes                                │
│                                                                  │
│  4. If environment total (400) is the bottleneck:                │
│     → This requires a Trigger.dev plan upgrade                  │
│     → Or reducing concurrency on lower-priority queues          │
│                                                                  │
│  RESOLUTION:                                                     │
│  After the broadcast completes:                                  │
│  → Reset any temporary overrides                                │
│  → Review if workspace should be permanently on premium         │
│  → Document incident in runbook                                 │
└──────────────────────────────────────────────────────────────────┘
```

### Scenario: Need to Urgently Pause a Workspace's Workflows

```
┌──────────────────────────────────────────────────────────────────┐
│  INCIDENT: Workspace is sending incorrect messages, need to      │
│  stop all their workflows NOW                                    │
│                                                                  │
│  OPTION A: Pause the entire queue                                │
│  Command Center → Queues → workflow-standard → Pause             │
│  ⚠ This pauses ALL workspaces in that queue, not just one.     │
│                                                                  │
│  OPTION B: Cancel specific runs via Trigger.dev dashboard        │
│  Dashboard → Runs → Filter by workspace → Cancel each run       │
│                                                                  │
│  OPTION C: Enable sandbox mode for the workspace                 │
│  Settings → Workspace → Enable Sandbox Mode                     │
│  This blocks all outbound SMS/email at the workflow level.       │
│  Workflows will skip send steps without failing.                 │
│                                                                  │
│  RECOMMENDED: Option C (sandbox mode) for per-workspace control │
│  without affecting other workspaces.                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Capacity Planning

### Current Capacity Model

```
┌──────────────────────────────────────────────────────────────────┐
│                    Capacity Calculator                            │
│                                                                  │
│  Environment total limit:     400 concurrent runs               │
│  Burst limit:                 800 concurrent runs               │
│                                                                  │
│  Queue Allocations:                                              │
│  workflow-standard:            15/ws × N workspaces             │
│  workflow-premium:             30/ws × N workspaces             │
│  sms-operations:               40 (shared)                      │
│  email-operations:             30 (shared)                      │
│  database-ops:                 50 (shared)                      │
│  external-api:                 30 (shared)                      │
│  scheduled-waits:              30 (shared)                      │
│  bulk-operations:              20 (shared)                      │
│  reminders:                    20 (shared)                      │
│  time-based-triggers:          20 (shared)                      │
│  date-distance-triggers:       20 (shared)                      │
│  trigger-events:               10 (shared)                      │
│  missed-call-triggers:         10 (shared)                      │
│                                                                  │
│  Shared queue total:          310                               │
│  Remaining for workflows:     400 - 310 = 90 concurrent        │
│                                                                  │
│  At standard tier (15/ws):                                      │
│  Max SIMULTANEOUS ws at cap: 90 / 15 = 6 workspaces            │
│                                                                  │
│  At premium tier (30/ws):                                       │
│  Max SIMULTANEOUS ws at cap: 90 / 30 = 3 workspaces            │
│                                                                  │
│  NOTE: Per-workspace limits are SOFT limits. The environment    │
│  total (400) is the HARD ceiling. If 6 standard workspaces     │
│  are each running 15, that's 90 concurrent + 310 shared =      │
│  400, hitting the environment limit.                            │
│                                                                  │
│  In practice, most workspaces run 0-5 concurrent workflows.    │
│  Only broadcast-heavy workspaces approach 15.                   │
└──────────────────────────────────────────────────────────────────┘
```

### When to Upgrade Tiers

```
  Monitor in Command Center:

  ┌──────────────────────────────────────────────┐
  │ Metric              │ Threshold │ Action     │
  ├─────────────────────┼───────────┼────────────┤
  │ WS runs frequently  │ >10/15    │ Consider   │
  │ hitting 15/15 cap   │ slots     │ premium    │
  │                     │ used      │ upgrade    │
  ├─────────────────────┼───────────┼────────────┤
  │ WS queued count     │ >100      │ Upgrade to │
  │ consistently high   │ queued    │ premium or │
  │                     │           │ override   │
  ├─────────────────────┼───────────┼────────────┤
  │ Environment total   │ >350/400  │ Reduce     │
  │ approaching limit   │           │ per-queue  │
  │                     │           │ limits or  │
  │                     │           │ upgrade    │
  │                     │           │ Trigger.dev│
  │                     │           │ plan       │
  └─────────────────────┴───────────┴────────────┘
```

---

## Key Files Reference

### Core Queue System

| File | Purpose | Deploy Method |
|------|---------|---------------|
| `trigger/queues.js` | Queue definitions (standard, premium, all others) | `npx trigger deploy` |
| `trigger/utils/workspaceQueueHelper.js` | Tier resolution + concurrency options helper | `npx trigger deploy` |

### Backend Call Sites (deploy via `git push`)

| File | Lines | Task |
|------|-------|------|
| `backend/src/services/unifiedWorkflowExecutionService.js` | 151 | `trigger-workflow` |
| `backend/src/services/flowService.js` | 138 | `trigger-workflow` |
| `backend/src/services/aiAgentService.js` | 1011 | `trigger-workflow` |
| `backend/src/services/sequenceService.js` | 2060 | `trigger-workflow` |
| `backend/src/services/dateDistanceTriggerService.js` | 260 | `date-distance-evaluation` |
| `backend/src/services/missedCallTriggerService.js` | 160 | `missed-call-trigger-task` |
| `backend/src/services/timeBasedTriggerService.js` | 307 | `time-based-trigger-execution` |
| `backend/src/services/actionExecutionService.js` | 151,183,216 | `process-*-action` |
| `backend/src/services/email/emailEventsService.js` | 291 | `email-open-event` |
| `backend/src/services/asyncProviders/TriggerDevProvider.js` | 64,123,133 | Generic provider |
| `backend/src/routes/unifiedWorkflowRoutes.js` | 91,291,412 | `trigger-workflow` |
| `backend/src/routes/webhookRoutes.js` | 730 | `trigger-workflow` |
| `backend/src/routes/metaRoutes.js` | 217 | `trigger-workflow` |
| `backend/src/routes/importRoutes.js` | 98 | `import-contacts` |
| `backend/src/routes/triggerRoutes.js` | 71,240,970 | SMS tasks |
| `backend/src/routes/appointmentRemindersRoutes.js` | 49,60,119 | Reminder tasks |
| `backend/src/routes/pipeline.js` | 554,866 | `process-opportunity-trigger-event` |
| `backend/src/routes/customFieldsRoutes.js` | 27 | `process-trigger-event` |
| `backend/src/routes/triggers/webhooks.js` | 30,68 | `process-trigger-event` |
| `backend/src/routes/twilio.js` | 1695 | `swap-sender-number` |
| `backend/src/routes/jobsRoutes.js` | 349 | Generic job |
| `backend/index.js` | 1336 | `trigger-workflow` |
| `backend/src/controllers/triggersController.js` | 1426 | `trigger-workflow` |

### Trigger.dev Task Call Sites (deploy via `npx trigger deploy`)

| File | Lines | Task |
|------|-------|------|
| `trigger/unifiedWorkflows.js` | 3937, 11308, 11441 | connector, subscribe, go-to |
| `trigger/trigger-event-processor.js` | 840 | `trigger-workflow` |
| `trigger/dateDistanceEvaluationTask.js` | 300, 462, 674 | workflow + sequence |
| `trigger/timeBasedTriggerTask.js` | 305 | `trigger-workflow` |
| `trigger/missedCallTriggerTask.js` | 124 | `trigger-workflow` |
| `trigger/email-open-processor.js` | 306, 401 | workflow + email |
| `trigger/opportunityTriggerProcessor.js` | 290 | `trigger-workflow` |
| `trigger/unifiedWorkflowsOptimized.js` | 1671, 1902 | optimized + connector |
| `trigger/appointmentReminders.js` | 387 | `trigger-workflow` |

### Command Center (Queue Dashboard)

| File | Purpose |
|------|---------|
| `src/features/queue-management/services/queueApi.ts` | Trigger.dev REST API wrapper |
| `src/features/queue-management/components/QueueManagementPage.tsx` | Main page component |
| `src/features/queue-management/components/QueueStatusCard.tsx` | Individual queue card |
| `src/features/queue-management/components/WorkspaceTierTable.tsx` | Workspace tier management |
| `src/features/queue-management/index.ts` | Barrel export |
| `src/components/Sidebar.tsx` | "Queues" menu item under System |
| `src/App.tsx` | View routing for queue-management |

### Database

| Table | Key | Purpose |
|-------|-----|---------|
| `workspace_settings` | `QUEUE_TIER` | Stores workspace tier (`{"tier": "premium"}`) |
| `flow_executions` | `status` in `running,pending,queued` | Active run counts for dashboard |

---

## Appendix: API Reference

### Trigger.dev Queue REST API

```
Base URL: https://api.trigger.dev/api/v1
Auth: Authorization: Bearer <TRIGGER_DEV_API_KEY>

GET /queues
  → List all queues with running/queued/limit/paused

GET /queues/{name}?type=custom
  → Single queue details with environment breakdown

POST /queues/{name}/concurrency/override
  Body: { "concurrencyLimit": 25 }
  → Override queue limit (affects ALL workspaces in queue)

POST /queues/{name}/concurrency/reset
  → Reset to code-defined limit

POST /queues/{name}/pause
  → Pause queue (new runs queue, don't execute)

POST /queues/{name}/resume
  → Resume queue (queued runs start executing)
```

### Workspace Tier SQL

```sql
-- Check current tier
SELECT settings_value->>'tier' as tier
FROM workspace_settings
WHERE workspace_id = '45963'
AND settings_key = 'QUEUE_TIER';

-- Set to premium
INSERT INTO workspace_settings (workspace_id, settings_key, settings_value)
VALUES ('45963', 'QUEUE_TIER', '{"tier": "premium"}')
ON CONFLICT (workspace_id, settings_key)
DO UPDATE SET settings_value = EXCLUDED.settings_value;

-- Reset to standard (delete the row)
DELETE FROM workspace_settings
WHERE workspace_id = '45963'
AND settings_key = 'QUEUE_TIER';

-- List all premium workspaces
SELECT ws.workspace_id, w.name, ws.settings_value
FROM workspace_settings ws
JOIN workspaces w ON w.id = ws.workspace_id
WHERE ws.settings_key = 'QUEUE_TIER'
AND ws.settings_value->>'tier' = 'premium';
```

---

## 17. Future Roadmap (6-Month Horizon)

### Phase Overview

```
Month 1-2              Month 3-4              Month 5-6
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ FOUNDATION       │   │ INTELLIGENCE     │   │ SCALE            │
│                  │   │                  │   │                  │
│ • SMS/Email      │   │ • Dynamic limits │   │ • Fair-share     │
│   queue isolation│   │   (auto-scale)   │   │   scheduling     │
│ • Auto-tier from │   │ • Priority       │   │ • Per-workspace   │
│   billing plan   │   │   queues         │   │   rate limiting  │
│ • Slack/webhook  │   │ • Queue analytic │   │ • Multi-region   │
│   queue alerts   │   │   dashboard      │   │   queue routing  │
│ • Bulk tier      │   │ • SLA tracking   │   │ • Self-service   │
│   assignment     │   │   per workspace  │   │   tier upgrades  │
└──────────────────┘   └──────────────────┘   └──────────────────┘
```

### Near-Term (Month 1-2): Foundation

#### 1. SMS/Email Queue Isolation

Currently only workflow queues are isolated. Extend to SMS and email queues so one workspace blasting 10K texts can't block another's transactional messages.

```
Before:                              After:
┌─────────────────────┐              ┌──────────────────────────┐
│ sms-queue (global)  │              │ sms-tier-standard (5/ws) │
│                     │              │  ├─ ws:45963  █████░░░░░ │
│ ws:45963 ██████████ │ 50 texts     │  └─ ws:12345  ██░░░░░░░ │
│ ws:12345 ░░░░░░░░░░ │ BLOCKED      │                          │
│                     │              │ sms-tier-premium (20/ws) │
│ First-come wins     │              │  └─ ws:99999  ████░░░░░░ │
└─────────────────────┘              └──────────────────────────┘
```

**Implementation**: Same `concurrencyKey` pattern — add to `send-sms-task`, `scheduled-message-task`, email tasks.

#### 2. Auto-Tier from Billing Plan

Map Stripe subscription plans to queue tiers automatically:

```
Stripe Webhook (plan change)
         │
         ▼
┌─────────────────────────┐
│ Check plan metadata     │
│ • starter → standard    │
│ • growth  → standard    │
│ • pro     → premium     │
│ • enterprise → premium  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ UPSERT workspace_settings│
│ QUEUE_TIER = { tier }   │
└─────────────────────────┘
```

No manual tier assignment needed — upgrade your Stripe plan, get more queue capacity instantly.

#### 3. Queue Alerts (Slack/Webhook)

Automated alerts when queue health degrades:

| Alert | Trigger | Channel |
|-------|---------|---------|
| Queue depth spike | Queued > 50 for any workspace | Slack #ops |
| Stalled queue | Running = 0 but Queued > 10 for 5+ min | Slack #ops + PagerDuty |
| Tier saturation | Workspace at 90%+ of their limit for 10+ min | Slack #ops |
| Pause alert | Any queue manually paused | Slack #ops |

#### 4. Bulk Tier Assignment

Command Center UI to select multiple workspaces and assign tiers in one action (for onboarding batches or plan migrations).

### Mid-Term (Month 3-4): Intelligence

#### 5. Dynamic Concurrency Limits (Auto-Scale)

Instead of fixed 15/30 per workspace, automatically adjust based on real-time load:

```
┌─────────────────────────────────────────────────┐
│            Dynamic Limit Algorithm               │
│                                                  │
│  base_limit = tier_limit (15 or 30)             │
│                                                  │
│  IF global_utilization < 50%:                   │
│    effective_limit = base_limit * 1.5  (burst)  │
│  ELIF global_utilization < 80%:                 │
│    effective_limit = base_limit        (normal) │
│  ELSE:                                          │
│    effective_limit = base_limit * 0.8  (shed)   │
│                                                  │
│  Cap: never exceed environment max (400)        │
└─────────────────────────────────────────────────┘
```

This lets workspaces burst during quiet hours and contracts during peak load — maximizing overall throughput.

#### 6. Priority Queues

Some workflows are time-sensitive (appointment reminders, payment confirmations). These should execute before bulk operations:

```
Priority Levels:
  P0 (Critical)  → Appointment reminders, payment flows
  P1 (Standard)  → Regular workflow triggers
  P2 (Bulk)      → Broadcasts, import processing

Queue Selection:
  ┌──────────────────┐
  │ P0: workflow-crit│  concurrencyLimit: 20 (reserved)
  │ P1: workflow-std │  concurrencyLimit: 15 (per workspace)
  │ P2: workflow-bulk│  concurrencyLimit: 5  (per workspace)
  └──────────────────┘
```

#### 7. Queue Analytics Dashboard

Historical charts in Command Center:

- Queue depth over time (24h, 7d, 30d)
- Per-workspace throughput (runs/hour)
- Average wait time in queue
- Tier utilization heat map
- Peak hour analysis

#### 8. SLA Tracking Per Workspace

Track and report on execution latency per workspace:

| Metric | Standard SLA | Premium SLA |
|--------|-------------|-------------|
| Queue wait time | < 5 min | < 1 min |
| Workflow completion | < 30 min | < 15 min |
| SMS delivery | < 2 min | < 30 sec |

### Longer-Term (Month 5-6): Scale

#### 9. Fair-Share Scheduling

Replace first-come-first-served with weighted fair-share:

```
┌─────────────────────────────────────────────┐
│          Fair-Share Scheduler                │
│                                             │
│  Each workspace gets a "share" based on:    │
│  • Tier (premium = 2x weight)               │
│  • Recent usage (less used = higher share)   │
│  • Queue age (older items get priority)      │
│                                             │
│  Result: No workspace can starve others     │
│  even without hard concurrency limits       │
└─────────────────────────────────────────────┘
```

#### 10. Per-Workspace Rate Limiting

Hard cap on total runs per hour/day per workspace (independent of concurrency):

```
Standard tier: 500 runs/hour,  5,000 runs/day
Premium tier:  2,000 runs/hour, 20,000 runs/day

Prevents: One workspace scheduling 50,000 workflows
          that slowly drain the system over hours
```

#### 11. Multi-Region Queue Routing

Route workflows to the nearest Trigger.dev region for lower latency:

```
Contact timezone → Region mapping:
  US East    → us-east-1
  US West    → us-west-2
  EU         → eu-west-1
  APAC       → ap-southeast-1
```

#### 12. Self-Service Tier Upgrades

Client-facing UI in workspace Settings to upgrade their queue tier (tied to billing):

```
Current Plan: Growth (Standard Queue — 15 concurrent)
[Upgrade to Pro] → Premium Queue — 30 concurrent
                   $49/mo additional
```

### Priority Matrix

```
┌─────────────────────────────────────────────────────────────┐
│                    IMPACT vs EFFORT                         │
│                                                             │
│  HIGH    │ Auto-Tier       │ Dynamic Limits  │ Fair-Share   │
│  IMPACT  │ from Billing    │ (Auto-Scale)    │ Scheduling   │
│          │ [Low Effort]    │ [Med Effort]    │ [High Effort]│
│          │ ★ DO FIRST      │                 │              │
│          │                 │                 │              │
│  MED     │ Queue Alerts    │ Priority Queues │ Multi-Region │
│  IMPACT  │ SMS/Email Isol. │ Analytics Dash  │ Rate Limiting│
│          │ [Low Effort]    │ [Med Effort]    │ [High Effort]│
│          │ ★ DO FIRST      │                 │              │
│          │                 │                 │              │
│  LOW     │ Bulk Tier UI    │ SLA Tracking    │ Self-Service │
│  IMPACT  │ [Low Effort]    │ [Med Effort]    │ Tier Upgrade │
│          │                 │                 │ [High Effort]│
│          │                 │                 │              │
│          └─────────────────┴─────────────────┴──────────────│
│            LOW EFFORT        MED EFFORT        HIGH EFFORT  │
└─────────────────────────────────────────────────────────────┘

Recommended order:
  1. Queue Alerts (Slack)         — low effort, immediate ops value
  2. SMS/Email Queue Isolation    — low effort, prevents next class of incidents
  3. Auto-Tier from Billing       — low effort, eliminates manual tier management
  4. Priority Queues              — med effort, improves time-sensitive workflows
  5. Queue Analytics Dashboard    — med effort, enables data-driven decisions
  6. Dynamic Limits               — med effort, maximizes throughput automatically
  7. Per-Workspace Rate Limiting  — high effort, safety net for abuse prevention
  8. Fair-Share Scheduling        — high effort, ultimate fairness guarantee
```

### Emergency Override Controls (Available Now)

If any issue arises with the current queue isolation system, these overrides are available **immediately** from the Command Center UI — no code deploys needed:

| Action | How | Effect | Reversible? |
|--------|-----|--------|-------------|
| Increase workspace capacity | Override queue limit (UI button) | Raises concurrency for ALL workspaces in that tier | Yes — Reset button |
| Give one workspace more capacity | Change tier to Premium (dropdown) | That workspace gets 30 instead of 15 slots | Yes — change back |
| Pause a runaway workspace | Pause queue (UI button) | New runs queue but don't execute | Yes — Resume button |
| Remove all limits | Override limit to 400 | Effectively removes per-workspace isolation | Yes — Reset button |
| Rollback entirely | Reset all overrides + delete QUEUE_TIER rows | Returns to pre-isolation behavior | Yes — re-apply tiers |

All overrides take effect within seconds via Trigger.dev REST API. No git push, no deploy, no restart needed.
