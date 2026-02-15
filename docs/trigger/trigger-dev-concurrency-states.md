# Trigger.dev Concurrency State Diagram

This document explains how task runs move through different states and how concurrency limits work in Trigger.dev.

## State Diagram

```
                    ┌─────────────┐
                    │   [START]   │
                    └──────┬──────┘
                           │ Task Triggered
                           ▼
                    ┌─────────────┐
                    │   QUEUED    │◄─────┐
                    │             │      │
                    │ ⚠️ Does NOT │      │ Waiting for Slot
                    │   consume   │      │ (if no slot available)
                    │  concurrency│      │
                    │    slots    │      │
                    └──────┬──────┘      │
                           │             │
        Concurrency Slot   │             │
           Available       │             │
                           ▼             │
                    ┌─────────────┐      │
                    │   RUNNING   │      │
                    │             │      │
                    │ ✅ CONSUMES │      │
                    │  concurrency│      │
                    │    slot     │      │
                    │             │      │
                    │ Counts towards     │
                    │ limit (200/400)    │
                    └───┬─────┬───┬──────┘
                        │     │   │
        ┌───────────────┘     │   └──────────────┐
        │                     │                  │
        │ Reaches Waitpoint   │ Execution        │ Error
        │ (wait.for(), etc.)  │ Finished         │ Occurred
        │                     │                  │
        ▼                     ▼                  ▼
┌─────────────┐      ┌─────────────┐    ┌─────────────┐
│   WAITING   │      │  COMPLETED  │    │   FAILED    │
│             │      └──────┬──────┘    └───┬─────┬───┘
│ ✅ RELEASES │             │                │     │
│  concurrency│             │                │     │
│    slot     │             │ Max Retries    │     │ Retry Attempt
│             │             │ Exceeded       │     │ (if enabled)
│ Checkpointed│             │                │     │
│    state    │             ▼                │     │
│             │         ┌──────┐            │     │
│ Does NOT    │         │ END  │            │     │
│ count       │         └──────┘            │     │
│ towards     │                              │     │
│ limit       │                              │     │
│             │                              │     │
│ Can have    │                              │     │
│ many runs   │                              │     │
└──────┬──────┘                              │     │
       │                                      │     │
       │ Wait Condition Met                   │     │
       │ (delay complete,                     │     │
       │  subtask done)                       │     │
       │                                      │     │
       └──────────────────────────────────────┘     │
                                                    │
                                                    └───┐
                                                        │
                                                        │
                                                    ┌───┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │   QUEUED    │
                                            │  (Retry)    │
                                            └─────────────┘

Legend:
✅ = Consumes/Releases concurrency slot
⚠️ = Does NOT consume concurrency slot
```

## Concurrency Slot Lifecycle

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Task Run    │    │ Queue System │    │ Environment │    │  Waitpoint   │
└──────┬──────┘    └──────┬───────┘    └──────┬──────┘    └──────┬───────┘
       │                  │                    │                   │
       │ Request execution│                    │                   │
       ├─────────────────>│                    │                   │
       │                  │                    │                   │
       │                  │ Check available    │                   │
       │                  │      slots         │                   │
       │                  ├───────────────────>│                   │
       │                  │                    │                   │
       │                  │ Slot available?    │                   │
       │                  │<───────────────────┤                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │ ┌─────────────────────────────────────┐│
       │                  │ │   IF SLOT AVAILABLE:                ││
       │                  │ └─────────────────────────────────────┘│
       │                  │                    │                   │
       │                  │ Allocate slot      │                   │
       │<─────────────────┤                    │                   │
       │                  │                    │                   │
       │ Acquire          │                    │                   │
       │ concurrency slot │                    │                   │
       ├──────────────────────────────────────>│                   │
       │                  │                    │                   │
       │                  │                    │ Decrement         │
       │                  │                    │ available slots   │
       │                  │                    │ (e.g., 199/200)   │
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │ Execute code     │                    │                   │
       │<─────────────────┤                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │ ┌───────────────┐ │
       │                  │                    │ │ IF REACHES    │ │
       │                  │                    │ │ WAITPOINT:    │ │
       │                  │                    │ └───────────────┘ │
       │                  │                    │                   │
       │ Checkpoint       │                    │                   │
       │ (wait.for(), etc)│                    │                   │
       ├──────────────────────────────────────────────────────────>│
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │ Release           │
       │                  │                    │ concurrency slot  │
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │                  │                    │ Increment         │
       │                  │                    │ available slots   │
       │                  │                    │ (e.g., 200/200)   │
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │ ╔═══════════════╗ │
       │                  │                    │ ║ Run in WAITING║ │
       │                  │                    │ ║ state - Slot  ║ │
       │                  │                    │ ║ is FREE for   ║ │
       │                  │                    │ ║ others        ║ │
       │                  │                    │ ╚═══════════════╝ │
       │                  │                    │                   │
       │ Wait condition   │                    │                   │
       │    pending       │                    │                   │
       │<──────────────────────────────────────────────────────────┤
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │ Wait condition met│
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │                  │                    │                   │
       │ Request          │                    │                   │
       │  resumption      │                    │                   │
       │<──────────────────────────────────────────────────────────┤
       │                  │                    │                   │
       │                  │ Request resumption │                   │
       ├─────────────────>│                    │                   │
       │                  │                    │                   │
       │                  │ Check available    │                   │
       │                  │      slots         │                   │
       │                  ├───────────────────>│                   │
       │                  │                    │                   │
       │                  │ Slot available     │                   │
       │                  │<───────────────────┤                   │
       │                  │                    │                   │
       │ Resume execution │                    │                   │
       │<─────────────────┤                    │                   │
       │                  │                    │                   │
       │ Re-acquire       │                    │                   │
       │ concurrency slot │                    │                   │
       ├──────────────────────────────────────>│                   │
       │                  │                    │                   │
       │                  │                    │ Decrement         │
       │                  │                    │ available slots   │
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │ Continue         │                    │                   │
       │ execution        │                    │                   │
       │<─────────────────┤                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │ Release slot     │                    │                   │
       │ (finished)       │                    │                   │
       ├──────────────────────────────────────>│                   │
       │                  │                    │                   │
       │                  │                    │ Increment         │
       │                  │                    │ available slots   │
       │                  │                    │<──────────────────┤
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │                    │                   │
       │                  │ ┌─────────────────────────────────────┐│
       │                  │ │   IF NO SLOT AVAILABLE:             ││
       │                  │ └─────────────────────────────────────┘│
       │                  │                    │                   │
       │ Keep in          │                    │                   │
       │ QUEUED state     │                    │                   │
       │<─────────────────┤                    │                   │
       │                  │                    │                   │
       │ ╔═══════════════╗│                    │                   │
       │ ║ Waits until   ║│                    │                   │
       │ ║ slot available║│                    │                   │
       │ ╚═══════════════╝│                    │                   │
       │                  │                    │                   │
```

## Queue Concurrency Limits

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT CONCURRENCY                        │
│                                                                    │
│  ┌─────────────────────────┐      ┌─────────────────────────┐   │
│  │   Base Limit: 200       │      │  Burst Limit: 400       │   │
│  │   (Per Queue Max)       │      │  (Environment Total)    │   │
│  └───────────┬─────────────┘      └───────────┬─────────────┘   │
│              │                                 │                  │
└──────────────┼─────────────────────────────────┼──────────────────┘
               │                                 │
               │                                 │
┌──────────────┼─────────────────────────────────┼──────────────────┐
│              │                                 │                  │
│     ┌────────▼─────────────────────────────────▼────────┐        │
│     │            TASK QUEUES                            │        │
│     │                                                    │        │
│     │  ┌──────────────┐  ┌──────────────┐              │        │
│     │  │  Queue 1     │  │  Queue 2     │              │        │
│     │  │  Limit: 200  │  │  Limit: 50   │              │        │
│     │  └──────┬───────┘  └──────┬───────┘              │        │
│     │         │                  │                       │        │
│     │  ┌──────▼───────┐  ┌──────▼───────┐              │        │
│     │  │  Queue 3     │  │ Default Queue│              │        │
│     │  │  Limit: 30   │  │ No Limit     │              │        │
│     │  │              │  │ (Bounded by  │              │        │
│     │  │              │  │  Base: 200)  │              │        │
│     │  └──────┬───────┘  └──────┬───────┘              │        │
│     └─────────┼──────────────────┼──────────────────────┘        │
│               │                  │                                │
└───────────────┼──────────────────┼────────────────────────────────┘
                │                  │
                │                  │
┌───────────────┼──────────────────┼────────────────────────────────┐
│               │                  │                                │
│      ┌────────▼────────┐  ┌──────▼────────┐                      │
│      │  Queue 1 Runs   │  │  Queue 2 Runs │                      │
│      │  Running: 150   │  │  Running: 30  │                      │
│      └────────┬────────┘  └──────┬────────┘                      │
│               │                  │                                │
│      ┌────────▼────────┐  ┌──────▼────────┐                      │
│      │  Queue 3 Runs   │  │ Default Queue │                      │
│      │  Running: 20    │  │  Runs: 50     │                      │
│      └────────┬────────┘  │ (Burst cap)   │                      │
│               │           └──────┬────────┘                      │
│               │                  │                                │
│               └──────────┬───────┘                                │
│                          │                                        │
│                          │ All queues contribute to               │
│                          │ environment burst limit                │
│                          │                                        │
│                          ▼                                        │
│              ┌───────────────────────┐                            │
│              │  Total Running: 250   │                            │
│              │  (150+30+20+50)       │                            │
│              │                       │                            │
│              │  Base Limit: 200      │                            │
│              │  Burst Limit: 400 ✓   │                            │
│              └───────────────────────┘                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Key Points:
• Each queue is bounded by Base Limit (200) individually
• All queues combined cannot exceed Burst Limit (400)
• Default queue (no explicit limit) is still bounded by Base Limit
• Queue 1 can have up to 200 concurrent runs
• Queue 2 can have up to 50 concurrent runs
• Queue 3 can have up to 30 concurrent runs
• Default queue can use remaining burst capacity
```

## Per-Tenant Queue Isolation (concurrencyKey)

```
┌─────────────────────────────────────────────────────────────────────────┐
│          workflow-execution Queue (concurrencyLimit: 100)                │
│                                                                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Workspace 1      │  │ Workspace 2      │  │ Workspace 3      │      │
│  │ Queue Instance   │  │ Queue Instance   │  │ Queue Instance   │      │
│  │ Limit: 100       │  │ Limit: 100       │  │ Limit: 100       │      │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘      │
│           │                     │                     │                 │
└───────────┼─────────────────────┼─────────────────────┼─────────────────┘
            │                     │                     │
            │                     │                     │
  ┌─────────▼─────────┐  ┌───────▼─────────┐  ┌───────▼─────────┐
  │ Workspace 1       │  │ Workspace 2     │  │ Workspace 3     │
  │ Triggers          │  │ Triggers        │  │ Triggers        │
  └─────────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
            │                     │                     │
            │ concurrencyKey:     │ concurrencyKey:     │ concurrencyKey:
            │ workspaceId: "ws1"  │ workspaceId: "ws2"  │ workspaceId: "ws3"
            │                     │                     │
            ▼                     ▼                     ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ Runs: 50/100     │  │ Runs: 100/100    │  │ Runs: 20/100     │
  │                  │  │                  │  │                  │
  │ ✅ Available: 50 │  │ ⚠️  At Limit     │  │ ✅ Available: 80 │
  │    slots         │  │    (Blocked)     │  │    slots         │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
            │                     │                     │
            │                     │                     │
            └─────────────────────┴─────────────────────┘
                                  │
                                  │
                    ┌─────────────▼─────────────┐
                    │ Key Benefit:              │
                    │                           │
                    │ Workspace 2 at limit      │
                    │ does NOT block            │
                    │ Workspace 1 or 3          │
                    │                           │
                    │ Each workspace gets       │
                    │ isolated queue instance   │
                    │ with its own limit        │
                    └───────────────────────────┘

Example Usage:
┌─────────────────────────────────────────────────────────────────┐
│ // When triggering tasks:                                        │
│                                                                   │
│ await triggerWorkflowTask.trigger(payload, {                     │
│   queue: "workflow-execution",                                   │
│   concurrencyKey: workspaceId,  // ← Creates isolated queue      │
│ });                                                              │
│                                                                   │
│ // Result:                                                        │
│ // - workspace1 → Queue instance 1 (Limit: 100)                  │
│ // - workspace2 → Queue instance 2 (Limit: 100)                  │
│ // - workspace3 → Queue instance 3 (Limit: 100)                  │
│ // Each workspace isolated, fair resource distribution           │
└─────────────────────────────────────────────────────────────────┘
```

## Key Takeaways

### States and Concurrency

1. **QUEUED State**
   - Runs waiting to start execution
   - Does NOT consume concurrency slots
   - Unlimited queued runs possible

2. **RUNNING State**
   - Actively executing code
   - CONSUMES concurrency slot
   - Counts towards queue/environment limits
   - Limited by `concurrencyLimit`

3. **WAITING State**
   - Checkpointed at waitpoint (delay, subtask, etc.)
   - RELEASES concurrency slot back to pool
   - Does NOT count towards limits
   - Can have many waiting runs simultaneously
   - Re-acquires slot when resuming

4. **COMPLETED/FAILED States**
   - Run finished
   - Slot permanently released
   - No concurrency impact

### Concurrency Limits

- **Base Limit (200):** Maximum concurrent runs per queue
- **Burst Limit (400):** Maximum concurrent runs across entire environment (2x base by default)
- **Queue Limit:** Each queue is bounded by base limit, not burst limit
- **Per-Queue Isolation:** Each queue maintains its own limit independently

### Best Practices

1. **Set appropriate `concurrencyLimit`** for each queue based on:
   - Resource requirements (API rate limits, DB connections)
   - Task priority (high priority = higher limit)
   - Task type (bulk operations = lower limit)

2. **Use `concurrencyKey`** for multi-tenant applications:
   - Prevents one tenant from monopolizing resources
   - Creates isolated queue instance per key value
   - Ensures fair resource distribution

3. **Leverage waiting states:**
   - Waits don't consume slots, so use `wait.for()` liberally
   - Parent tasks checkpoint when waiting for subtasks
   - This prevents deadlocks and maximizes throughput

4. **Monitor queue depths:**
   - High queue depth = need higher limits or more efficient tasks
   - Low queue depth = resources underutilized (can increase limits)

## Multiple Queues - Yes, You Can Have Many!

**Yes, you can have multiple queues in Trigger.dev!** This is one of the most powerful features for organizing and controlling concurrency.

### Two Ways to Define Queues

#### 1. Inline Queue Configuration (Per Task)

Each task can define its own queue inline. You already have examples in your codebase:

**Example from `trigger/importContactsTasks.js`:**
```javascript
export const importContactBatch = task({
  id: "import-contact-batch",
  queue: {
    concurrencyLimit: 5 // Max 5 parallel batches
  },
  maxDuration: 300,
  run: async (payload) => {
    // ...
  },
});
```

**Example from `trigger/trigger-event-processor.js`:**
```javascript
export const processTriggerEvent = task({
  id: "process-trigger-event",
  queue: {
    concurrencyLimit: 10, // Process up to 10 triggers simultaneously
  },
  run: async (payload) => {
    // ...
  },
});
```

#### 2. Shared Queue Objects (Reusable Across Tasks)

You can define a queue once and reuse it across multiple tasks. This is perfect for grouping related tasks that should share a concurrency limit:

```javascript
import { task, queue } from "@trigger.dev/sdk/v3";

// Define shared queues
export const workflowQueue = queue({
  name: "workflow-execution",
  concurrencyLimit: 100,
});

export const bulkOperationsQueue = queue({
  name: "bulk-operations",
  concurrencyLimit: 30,
});

export const smsQueue = queue({
  name: "sms-operations",
  concurrencyLimit: 50,
});

export const highPriorityQueue = queue({
  name: "high-priority",
  concurrencyLimit: 20,
});

// Use shared queues in tasks
export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  queue: workflowQueue, // ← Reuse the queue
  run: async (payload) => {
    // ...
  },
});

export const processBulkSms = task({
  id: "process-bulk-sms",
  queue: bulkOperationsQueue, // ← Different queue
  run: async (payload) => {
    // ...
  },
});

export const sendSmsTask = task({
  id: "send-sms-task",
  queue: smsQueue, // ← Shared SMS queue
  run: async (payload) => {
    // ...
  },
});
```

### Benefits of Multiple Queues

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multiple Queue Benefits                       │
│                                                                   │
│  1. ✅ Resource Isolation                                        │
│     - Heavy bulk operations don't block urgent workflows        │
│     - Each queue has its own concurrency limit                  │
│                                                                   │
│  2. ✅ Priority Management                                       │
│     - High priority tasks get dedicated queue with higher limit │
│     - Low priority tasks can use lower limits                   │
│                                                                   │
│  3. ✅ Rate Limit Protection                                     │
│     - Limit SMS sending to match Twilio rate limits             │
│     - Control API calls to external services                    │
│                                                                   │
│  4. ✅ Fair Resource Distribution                                │
│     - Different task types get appropriate resources            │
│     - Prevents one task type from monopolizing capacity         │
│                                                                   │
│  5. ✅ Better Monitoring & Debugging                            │
│     - See queue depths per queue type                          │
│     - Identify bottlenecks more easily                          │
└─────────────────────────────────────────────────────────────────┘
```

### Example: Recommended Queue Structure for Your App

Based on your codebase (workflows, sequences, bulk operations, reminders), here's a suggested structure:

```javascript
import { task, queue } from "@trigger.dev/sdk/v3";

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

// Main workflow execution queue
export const workflowQueue = queue({
  name: "workflow-execution",
  concurrencyLimit: 100, // 50% of base limit
});

// Bulk operations (imports, bulk SMS, bulk tags)
export const bulkOperationsQueue = queue({
  name: "bulk-operations",
  concurrencyLimit: 30, // Lower - these are resource intensive
});

// SMS sending operations
export const smsQueue = queue({
  name: "sms-operations",
  concurrencyLimit: 50, // Match Twilio rate limits
});

// Appointment reminders
export const remindersQueue = queue({
  name: "reminders",
  concurrencyLimit: 20, // Lower priority, time-sensitive
});

// Trigger event processing
export const triggersQueue = queue({
  name: "triggers",
  concurrencyLimit: 10, // Already configured in your code
});

// High priority operations (paid customers, urgent workflows)
export const highPriorityQueue = queue({
  name: "high-priority",
  concurrencyLimit: 50,
});

// ============================================================================
// TASK CONFIGURATIONS
// ============================================================================

export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  queue: workflowQueue, // Use shared queue
  maxDuration: 3600,
  machine: "micro",
  run: async (payload, { ctx }) => {
    // ... your existing code
  },
});

export const processBulkSms = task({
  id: "process-bulk-sms",
  queue: bulkOperationsQueue, // Shared bulk queue
  maxDuration: 10800,
  run: async (payload) => {
    // ... existing code
  },
});

export const processBulkTag = task({
  id: "process-bulk-tag",
  queue: bulkOperationsQueue, // Same queue - shares limit
  maxDuration: 300,
  run: async (payload) => {
    // ... existing code
  },
});

export const sendSmsTask = task({
  id: "send-sms-task",
  queue: smsQueue, // SMS-specific queue
  maxDuration: 300,
  run: async (payload) => {
    // ... existing code
  },
});

export const unifiedAppointmentReminders = task({
  id: "unified-appointment-reminders",
  queue: remindersQueue, // Reminders queue
  maxDuration: 86400 * 14,
  run: async (payload) => {
    // ... existing code
  },
});
```

### Queue Limit Distribution Example

```
Environment Base Limit: 200
Environment Burst Limit: 400
─────────────────────────────────────────────────

Queue Configuration:
┌─────────────────────┬──────────────┬──────────────┐
│ Queue Name          │ Limit        │ Current Runs │
├─────────────────────┼──────────────┼──────────────┤
│ workflow-execution  │ 100          │ 85           │
│ bulk-operations     │ 30           │ 25           │
│ sms-operations      │ 50           │ 40           │
│ reminders           │ 20           │ 10           │
│ triggers            │ 10           │ 5            │
│ high-priority       │ 50           │ 35           │
├─────────────────────┼──────────────┼──────────────┤
│ Total (Theoretical) │ 260          │ 200          │
│ Actual Running      │              │ 200          │
│ (Bounded by Base)   │              │              │
└─────────────────────┴──────────────┴──────────────┘

Key Points:
• Each queue can have up to its configured limit
• All queues combined cannot exceed Burst Limit (400)
• Individual queues are capped at Base Limit (200) each
• In practice, queues compete for the 200 base slots
• Burst capacity (up to 400) is shared across all queues
```

### Override Queue When Triggering

You can also override the default queue when triggering a task:

```javascript
// Default queue (workflowQueue with limit 100)
await triggerWorkflowTask.trigger(payload);

// Override to high priority queue
await triggerWorkflowTask.trigger(payload, {
  queue: "high-priority", // Uses highPriorityQueue (limit 50)
});

// Override with concurrencyKey for per-workspace isolation
await triggerWorkflowTask.trigger(payload, {
  queue: "workflow-execution",
  concurrencyKey: workspaceId, // Isolated queue per workspace
});
```

## Current Configuration Analysis

Based on analysis of `trigger/unifiedWorkflows.js`:

**Current State:**
- `triggerWorkflowTask` has NO queue configuration
- Defaults to unbounded concurrency (limited only by environment)
- All 497 queued runs competing for 200 slots

**Recommended Configuration:**
```javascript
export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  queue: {
    concurrencyLimit: 100, // 50% of base limit
  },
  // ... rest of config
});
```

**With Per-Workspace Isolation:**
```javascript
// When triggering:
await triggerWorkflowTask.trigger(payload, {
  concurrencyKey: workspaceId, // Isolated queue per workspace
});
```
