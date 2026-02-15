# Trigger.dev Queue Recommendations

## Analysis Summary

After studying `trigger/unifiedWorkflows.js` and all 41 tasks in the `trigger/` directory, I've identified operation patterns and resource requirements to recommend optimal queue groupings.

## Current State Analysis

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CURRENT STATE                                    │
│                                                                           │
│  Total Tasks: 41                                                         │
│  Tasks with Queue Config: 2                                             │
│  Tasks without Queue Config: 39                                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ONLY 2 TASKS HAVE CONCURRENCY LIMITS:                           │    │
│  │                                                                   │    │
│  │ 1. import-contact-batch     → concurrencyLimit: 5               │    │
│  │ 2. process-trigger-event    → concurrencyLimit: 10              │    │
│  │                                                                   │    │
│  │ ALL OTHER 39 TASKS: Unbounded (compete for 200 slots)           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                           │
│  Result: 497 queued, 200 running, hitting environment limit             │
└─────────────────────────────────────────────────────────────────────────┘
```

## Operation Types Identified in unifiedWorkflows.js

After studying the `executeWorkflowStep()` function, I identified these operation categories:

### Category 1: External Communication (Rate Limited)

| Operation | External Service | Rate Limit Concern |
|-----------|-----------------|-------------------|
| `send-message` | Twilio SMS | ~1 msg/sec per number |
| `send-email` | SendGrid | 100 emails/sec |
| `send_email_notification` | SendGrid | 100 emails/sec |

### Category 2: External API Calls

| Operation | External Service | Notes |
|-----------|-----------------|-------|
| `run_api_request` | Any HTTP endpoint | Variable latency |
| `connector` | 3rd party APIs | Variable latency |
| `tcpa-scrub` | TCPA Litigator API | External API |
| `enhance_data` | Audience Acuity | External API |
| `link-shortener` | Cloudflare Worker | Fast |
| `get_conversation` | Livechat Worker | Fast |

### Category 3: Team Notifications

| Operation | External Service | Notes |
|-----------|-----------------|-------|
| `send_teams_notification` | Microsoft Teams | Webhook |
| `send_slack_notification` | Slack | Webhook |

### Category 4: Database Operations (Fast)

| Operation | Type | Notes |
|-----------|------|-------|
| `add_tag` | Supabase | Fast DB ops |
| `remove_tag` | Supabase | Fast DB ops |
| `set_variable` | Supabase | Fast DB ops |
| `create_contact` | Supabase | Fast DB ops |
| `delete_contact` | Supabase | Fast DB ops |
| `assign_agent` | Supabase | Fast DB ops |
| `move_to_board` | Supabase | Fast DB ops |
| `mark_dnc` | Supabase | Fast DB ops |
| `set_email_opt_in/out` | Supabase | Fast DB ops |
| `set_sms_opt_in/out` | Supabase | Fast DB ops |
| `close_conversation` | Supabase | Fast DB ops |
| `add_internal_note` | Supabase | Fast DB ops |

### Category 5: Workflow Control

| Operation | Type | Notes |
|-----------|------|-------|
| `trigger-flow` | Nested workflow | Recursive, uses triggerAndWait |
| `subscribe_campaign` | Campaign enrollment | May trigger workflows |
| `run-javascript` | Code execution | CPU bound |

## All 41 Tasks Inventory

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          TASK INVENTORY                                   │
│                                                                           │
│  File: unifiedWorkflows.js                                               │
│  ├── trigger-workflow          [NO QUEUE] ← MAIN TASK (PROBLEM)         │
│                                                                           │
│  File: unifiedWorkflowsOptimized.js                                      │
│  ├── trigger-workflow-optimized [NO QUEUE]                               │
│                                                                           │
│  File: backgroundJobTasks.js                                             │
│  ├── process-sequence-subscription [NO QUEUE] ← Bulk                    │
│  ├── process-bulk-tag              [NO QUEUE] ← Bulk                    │
│  ├── process-bulk-delete           [NO QUEUE] ← Bulk                    │
│  ├── process-bulk-sms              [NO QUEUE] ← Bulk                    │
│  ├── process-bulk-export           [NO QUEUE] ← Bulk                    │
│  └── process-bulk-email            [NO QUEUE] ← Bulk                    │
│                                                                           │
│  File: importContactsTasks.js                                            │
│  ├── import-contacts-orchestrator  [NO QUEUE]                            │
│  └── import-contact-batch          [QUEUE: 5] ✓                          │
│                                                                           │
│  File: messageJobs.js                                                    │
│  └── send-sms-task                 [NO QUEUE] ← SMS                      │
│                                                                           │
│  File: scheduleTasks.js                                                  │
│  ├── delay-message-job             [NO QUEUE] ← Schedule                 │
│  ├── until-message-job             [NO QUEUE] ← Schedule                 │
│  └── scheduled-wait-task           [NO QUEUE] ← Schedule                 │
│                                                                           │
│  File: connectorExecutionTask.js                                         │
│  └── connector-execution           [NO QUEUE] ← External API             │
│                                                                           │
│  File: appointmentWebhookIntegrations.js                                 │
│  └── send-appointment-webhooks     [NO QUEUE] ← Webhook                  │
│                                                                           │
│  File: unifiedAppointmentReminders.js                                    │
│  ├── unified-appointment-reminders    [NO QUEUE] ← Reminder              │
│  └── cancel-unified-appointment-reminders [NO QUEUE]                     │
│                                                                           │
│  File: appointmentReminders.js                                           │
│  ├── schedule-appointment-reminders   [NO QUEUE] ← Reminder              │
│  ├── send-appointment-reminder        [NO QUEUE] ← Reminder              │
│  └── cancel-appointment-reminders     [NO QUEUE]                          │
│                                                                           │
│  File: actionTasks.js                                                    │
│  ├── action-add-tag                [NO QUEUE] ← DB Op                    │
│  ├── action-set-variable           [NO QUEUE] ← DB Op                    │
│  ├── action-assign-agent           [NO QUEUE] ← DB Op                    │
│  ├── action-subscribe-campaign     [NO QUEUE] ← DB Op                    │
│  ├── action-delete-contact         [NO QUEUE] ← DB Op                    │
│  ├── action-run-api-request        [NO QUEUE] ← External API             │
│  ├── action-run-javascript         [NO QUEUE] ← CPU                      │
│  ├── action-move-to-board          [NO QUEUE] ← DB Op                    │
│  ├── action-send-webhook           [NO QUEUE] ← External API             │
│  ├── action-email-integration      [NO QUEUE] ← Email                    │
│  └── action-crm-integration        [NO QUEUE] ← External API             │
│                                                                           │
│  File: trigger-event-processor.js                                        │
│  ├── process-trigger-event         [QUEUE: 10] ✓                         │
│  └── queue-trigger-event           [NO QUEUE]                             │
│                                                                           │
│  File: unifiedDelayTasks.js                                              │
│  ├── wait-delay                    [NO QUEUE] ← Wait                     │
│  └── smart-delay                   [NO QUEUE] ← Wait                     │
│                                                                           │
│  File: unifiedContactTasks.js                                            │
│  ├── create-contact                [NO QUEUE] ← DB Op                    │
│  ├── update-contact                [NO QUEUE] ← DB Op                    │
│  ├── add-tag                       [NO QUEUE] ← DB Op                    │
│  └── remove-tag                    [NO QUEUE] ← DB Op                    │
│                                                                           │
│  File: test-simple-task.js                                               │
│  └── simple-test-task              [NO QUEUE] ← Test                     │
└──────────────────────────────────────────────────────────────────────────┘
```

## Recommended Queue Structure

Based on operation patterns and resource requirements:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     RECOMMENDED QUEUE STRUCTURE                              │
│                                                                               │
│  Environment Base Limit: 200    Environment Burst Limit: 400                │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 1: workflow-execution (Main Workflows)                        │    │
│  │ Limit: 80                                                            │    │
│  │ Tasks: trigger-workflow, trigger-workflow-optimized                 │    │
│  │ Reason: Main entry point, orchestrates all other operations         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 2: bulk-operations (Heavy Long-Running)                       │    │
│  │ Limit: 20                                                            │    │
│  │ Tasks: process-sequence-subscription, process-bulk-tag,             │    │
│  │        process-bulk-delete, process-bulk-sms, process-bulk-export,  │    │
│  │        process-bulk-email, import-contacts-orchestrator             │    │
│  │ Reason: Resource intensive, long running, should not block others   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 3: sms-operations (Twilio Rate Limited)                       │    │
│  │ Limit: 40                                                            │    │
│  │ Tasks: send-sms-task, delay-message-job, until-message-job         │    │
│  │ Reason: Match Twilio rate limits (~1 msg/sec per number)            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 4: external-api (HTTP/Connector Calls)                        │    │
│  │ Limit: 30                                                            │    │
│  │ Tasks: connector-execution, action-run-api-request,                 │    │
│  │        action-send-webhook, action-crm-integration,                 │    │
│  │        send-appointment-webhooks                                     │    │
│  │ Reason: External API latency varies, prevent overwhelming          │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 5: reminders (Appointment Notifications)                      │    │
│  │ Limit: 20                                                            │    │
│  │ Tasks: unified-appointment-reminders, schedule-appointment-reminders│    │
│  │        send-appointment-reminder, cancel-* tasks                    │    │
│  │ Reason: Time-sensitive but lower priority than workflows            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 6: database-ops (Fast DB Operations)                          │    │
│  │ Limit: 50                                                            │    │
│  │ Tasks: action-add-tag, action-set-variable, action-assign-agent,   │    │
│  │        action-delete-contact, action-move-to-board, create-contact, │    │
│  │        update-contact, add-tag, remove-tag, action-subscribe-campaign│
│  │ Reason: Fast operations, high throughput, database bound            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 7: trigger-events (Already Configured)                        │    │
│  │ Limit: 10 (keep existing)                                           │    │
│  │ Tasks: process-trigger-event, queue-trigger-event                   │    │
│  │ Reason: Already configured, handles field change monitoring         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 8: scheduled-waits (Delay/Wait Tasks)                         │    │
│  │ Limit: 30                                                            │    │
│  │ Tasks: scheduled-wait-task, wait-delay, smart-delay                 │    │
│  │ Reason: These use wait.for() so release slots while waiting         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ QUEUE 9: email-operations (SendGrid Rate Limited)                   │    │
│  │ Limit: 30                                                            │    │
│  │ Tasks: action-email-integration                                     │    │
│  │ Reason: SendGrid rate limits, separate from other operations        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Total Configured: 80+20+40+30+20+50+10+30+30 = 310 (theoretical max)       │
│  In practice: Bounded by Environment Base (200) and Burst (400)             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Code

### Step 1: Create Queue Definitions File

Create a new file `trigger/queues.js`:

```javascript
import { queue } from "@trigger.dev/sdk/v3";

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================
// These queues provide concurrency control and resource isolation.
// Each queue has its own limit, preventing one task type from
// monopolizing all environment concurrency slots.
// ============================================================================

/**
 * Main workflow execution queue
 * Used by: trigger-workflow, trigger-workflow-optimized
 */
export const workflowQueue = queue({
  name: "workflow-execution",
  concurrencyLimit: 80,
});

/**
 * Bulk operations queue (heavy, long-running)
 * Used by: process-bulk-*, import-contacts-*, process-sequence-*
 */
export const bulkOperationsQueue = queue({
  name: "bulk-operations",
  concurrencyLimit: 20,
});

/**
 * SMS operations queue (Twilio rate limited)
 * Used by: send-sms-task, delay-message-job, until-message-job
 */
export const smsQueue = queue({
  name: "sms-operations",
  concurrencyLimit: 40,
});

/**
 * External API queue (HTTP requests, connectors)
 * Used by: connector-execution, action-run-api-request, action-send-webhook
 */
export const externalApiQueue = queue({
  name: "external-api",
  concurrencyLimit: 30,
});

/**
 * Appointment reminders queue
 * Used by: unified-appointment-reminders, send-appointment-reminder
 */
export const remindersQueue = queue({
  name: "reminders",
  concurrencyLimit: 20,
});

/**
 * Database operations queue (fast operations)
 * Used by: action-add-tag, action-set-variable, create-contact, etc.
 */
export const databaseOpsQueue = queue({
  name: "database-ops",
  concurrencyLimit: 50,
});

/**
 * Trigger events queue (field change monitoring)
 * Used by: process-trigger-event, queue-trigger-event
 */
export const triggerEventsQueue = queue({
  name: "trigger-events",
  concurrencyLimit: 10,
});

/**
 * Scheduled waits queue (delay tasks)
 * Used by: scheduled-wait-task, wait-delay, smart-delay
 */
export const scheduledWaitsQueue = queue({
  name: "scheduled-waits",
  concurrencyLimit: 30,
});

/**
 * Email operations queue (SendGrid rate limited)
 * Used by: action-email-integration
 */
export const emailQueue = queue({
  name: "email-operations",
  concurrencyLimit: 30,
});
```

### Step 2: Update Main Workflow Task

Update `trigger/unifiedWorkflows.js`:

```javascript
import { task, logger, tasks, wait } from "@trigger.dev/sdk/v3";
import { workflowQueue } from "./queues.js";  // Add this import

// Update task definition
export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  maxDuration: 3600,
  machine: "micro",
  queue: workflowQueue,  // ADD THIS LINE
  run: async (payload, { ctx }) => {
    // ... existing code
  },
});
```

### Step 3: Update Bulk Operations Tasks

Update `trigger/backgroundJobTasks.js`:

```javascript
import { bulkOperationsQueue } from "./queues.js";

export const processSequenceSubscription = task({
  id: "process-sequence-subscription",
  maxDuration: 10800,
  queue: bulkOperationsQueue,  // ADD THIS
  // ...
});

export const processBulkTag = task({
  id: "process-bulk-tag",
  maxDuration: 300,
  queue: bulkOperationsQueue,  // ADD THIS
  // ...
});

// ... same for all bulk tasks
```

### Step 4: Update SMS Tasks

Update `trigger/messageJobs.js`:

```javascript
import { smsQueue } from "./queues.js";

export const sendSmsTask = task({
  id: "send-sms-task",
  maxDuration: 300,
  queue: smsQueue,  // ADD THIS
  // ...
});
```

### Step 5: Update All Other Tasks (Similar Pattern)

Apply the same pattern to all task files:

| File | Tasks | Queue |
|------|-------|-------|
| `scheduleTasks.js` | delay-message-job, until-message-job | smsQueue |
| `scheduleTasks.js` | scheduled-wait-task | scheduledWaitsQueue |
| `connectorExecutionTask.js` | connector-execution | externalApiQueue |
| `unifiedAppointmentReminders.js` | all reminder tasks | remindersQueue |
| `actionTasks.js` | action-add-tag, action-set-variable, etc. | databaseOpsQueue |
| `actionTasks.js` | action-run-api-request, action-send-webhook | externalApiQueue |
| `actionTasks.js` | action-email-integration | emailQueue |
| `trigger-event-processor.js` | all trigger tasks | triggerEventsQueue |
| `unifiedDelayTasks.js` | wait-delay, smart-delay | scheduledWaitsQueue |
| `unifiedContactTasks.js` | create-contact, update-contact, etc. | databaseOpsQueue |

## Priority-Based Override (Optional)

For premium/paid users, override queue at trigger time:

```javascript
// Create high-priority queue
export const highPriorityQueue = queue({
  name: "high-priority",
  concurrencyLimit: 50,
});

// When triggering for paid users:
await triggerWorkflowTask.trigger(payload, {
  queue: "high-priority",  // Override default queue
});
```

## Per-Workspace Isolation (Recommended)

Add `concurrencyKey` when triggering to prevent one workspace from monopolizing:

```javascript
// When triggering from backend:
await triggerWorkflowTask.trigger(payload, {
  concurrencyKey: workspaceId,  // Each workspace gets isolated queue
});
```

This creates isolated queue instances per workspace:
- Workspace A: 80 concurrent workflows (isolated)
- Workspace B: 80 concurrent workflows (isolated)
- Workspace C: 80 concurrent workflows (isolated)

## Expected Impact

```
Before (Current):
┌─────────────────────────────────────────────────────────────┐
│ All 41 tasks competing for 200 slots                        │
│ Result: 497 queued, 200 running, congestion                │
└─────────────────────────────────────────────────────────────┘

After (With Queues):
┌─────────────────────────────────────────────────────────────┐
│ Workflow Queue:     80 slots │ Bulk Ops:    20 slots       │
│ SMS Queue:          40 slots │ External:    30 slots       │
│ Reminders:          20 slots │ DB Ops:      50 slots       │
│ Triggers:           10 slots │ Waits:       30 slots       │
│ Email:              30 slots │                              │
│                                                              │
│ Benefits:                                                    │
│ ✓ Bulk ops don't block workflows                           │
│ ✓ SMS respects Twilio rate limits                          │
│ ✓ External APIs don't overwhelm                            │
│ ✓ Fast DB ops get dedicated capacity                       │
│ ✓ Reminders always have slots available                    │
│ ✓ Fair resource distribution                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start (Minimum Changes)

If you want the quickest fix, just update the main workflow task:

```javascript
// trigger/unifiedWorkflows.js
export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  maxDuration: 3600,
  machine: "micro",
  queue: {
    concurrencyLimit: 80,  // ADD THIS - limits to 80 concurrent workflows
  },
  run: async (payload, { ctx }) => {
    // ... existing code
  },
});
```

This single change will immediately:
- Limit workflow executions to 80 concurrent
- Leave 120 slots for other task types
- Reduce queue congestion significantly
