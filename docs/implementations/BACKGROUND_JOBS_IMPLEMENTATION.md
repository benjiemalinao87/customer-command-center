# Background Jobs System - Implementation Guide

## Overview

This document explains the Background Jobs system for handling long-running operations like bulk contact subscriptions, exports, and other batch operations.

## Tech Stack

```
+------------------------------------------------------------------+
|                     CONFIRMED TECH STACK                          |
+------------------------------------------------------------------+
|                                                                   |
|  LAYER           TECHNOLOGY          NOTES                        |
|  ─────────────────────────────────────────────────────────────    |
|                                                                   |
|  DATABASE        Supabase            - background_jobs table      |
|                  PostgreSQL          - RLS policies enabled       |
|                                      - Realtime enabled           |
|                                                                   |
|  REALTIME        Supabase            - Already configured         |
|                  Realtime            - Subscribe to job updates   |
|                                      - Push updates to frontend   |
|                                                                   |
|  BACKEND API     Express.js          - cc.automate8.com           |
|                                      - POST /api/jobs             |
|                                      - GET /api/jobs              |
|                                      - GET /api/jobs/:id          |
|                                                                   |
|  WORKER          Trigger.dev         - ALREADY INTEGRATED!        |
|                  v3.3.17             - 20+ existing tasks         |
|                                      - Auto retries built-in      |
|                                      - Progress tracking          |
|                                      - Dashboard monitoring       |
|                                                                   |
|  FRONTEND        React 18            - Chakra UI components       |
|                  + Chakra UI         - JobStatusProvider context  |
|                                      - Toast notifications        |
|                                                                   |
+------------------------------------------------------------------+

Existing Trigger.dev Tasks (for reference):
┌─────────────────────────────────────────────────────────────────┐
│  trigger/                                                       │
│  ├── messageJobs.js          # SMS/message scheduling           │
│  ├── scheduleTasks.js        # Scheduled task execution         │
│  ├── appointmentReminders.js # Appointment notifications        │
│  ├── importContactsTasks.js  # Contact import processing        │
│  ├── actionTasks.js          # Action execution                 │
│  ├── unifiedWorkflows.js     # Workflow orchestration           │
│  ├── connectorExecutionTask.js                                  │
│  └── ... (20+ more tasks)                                       │
│                                                                 │
│  NEW: backgroundJobTasks.js  # <-- We will add this             │
└─────────────────────────────────────────────────────────────────┘
```

### Why Trigger.dev?

```
+------------------------------------------------------------------+
|  TRIGGER.DEV ADVANTAGES FOR THIS PROJECT                          |
+------------------------------------------------------------------+
|                                                                   |
|  1. Already Integrated                                            |
|     - Package installed: @trigger.dev/sdk v3.3.17                 |
|     - Config exists: trigger.config.ts                            |
|     - 20+ tasks already running in production                     |
|                                                                   |
|  2. Built-in Features We Need                                     |
|     ┌─────────────────┬────────────────────────────────────────┐ |
|     │ Feature         │ Benefit                                │ |
|     ├─────────────────┼────────────────────────────────────────┤ |
|     │ Auto Retries    │ Failed jobs retry automatically        │ |
|     │ Progress API    │ Real-time progress updates             │ |
|     │ Concurrency     │ Control parallel processing            │ |
|     │ Dashboard       │ Monitor jobs at trigger.dev            │ |
|     │ Logging         │ Built-in execution logs                │ |
|     │ Timeouts        │ Configurable per task                  │ |
|     └─────────────────┴────────────────────────────────────────┘ |
|                                                                   |
|  3. No Additional Infrastructure                                  |
|     - No separate worker process to manage                        |
|     - No Redis/queue setup needed                                 |
|     - Scales automatically                                        |
|                                                                   |
+------------------------------------------------------------------+
```

## Problem Statement

**Current Flow (Blocking UI):**
```
+------------------+         +------------------+         +------------------+
|                  |         |                  |         |                  |
|     Frontend     |-------->|     Backend      |-------->|    Database      |
|                  |         |                  |         |                  |
|  User clicks     |         |  Process ALL     |         |  Create 92       |
|  "Subscribe"     |  WAIT   |  92 contacts     |  WAIT   |  enrollments     |
|                  |<--------|  one by one      |<--------|                  |
|  Shows spinner   |         |                  |         |                  |
|  for 30+ seconds |         |  (30+ seconds)   |         |                  |
|                  |         |                  |         |                  |
|  USER BLOCKED!   |         |                  |         |                  |
+------------------+         +------------------+         +------------------+

Problems:
- User cannot do anything while waiting
- If page refreshes, user loses progress status
- Large batches may timeout
- Poor mobile experience
```

**New Flow (Background Jobs):**
```
+------------------+         +------------------+         +------------------+
|                  |         |                  |         |                  |
|     Frontend     |-------->|     Backend      |-------->|  background_jobs |
|                  |         |                  |         |                  |
|  User clicks     |         |  Create job      |         |  status: pending |
|  "Subscribe"     |  FAST   |  record          |  FAST   |                  |
|                  |<--------|  Return job_id   |<--------|                  |
|  Shows toast:    |         |                  |         |                  |
|  "Processing..." |         |                  |         |                  |
|                  |         |                  |         |                  |
|  USER CAN        |         +--------+---------+         |                  |
|  CONTINUE        |                  |                   |                  |
|  WORKING!        |                  v                   |                  |
|                  |         +------------------+         |                  |
|                  |         |  Background      |         |                  |
|                  |         |  Worker          |-------->|  status:         |
|                  |         |                  |         |  processing      |
|                  |         |  Process contacts|         |  processed: 45   |
|                  |<========|  one by one      |========>|  total: 92       |
|                  | REALTIME|                  | UPDATE  |                  |
|  Progress: 45/92 |         |                  |         |                  |
|                  |         |                  |         |                  |
|                  |<========|  Done!           |========>|  status:         |
|  "92 contacts    | REALTIME|                  | UPDATE  |  completed       |
|   subscribed!"   |         |                  |         |                  |
+------------------+         +------------------+         +------------------+
```

## Architecture

### System Components

```
+------------------------------------------------------------------+
|                           FRONTEND                                |
+------------------------------------------------------------------+
|                                                                   |
|  +---------------------+    +---------------------+               |
|  | SubscribeSequence   |    | JobStatusProvider   |               |
|  | Modal               |    | (React Context)     |               |
|  |                     |    |                     |               |
|  | - Select sequence   |    | - Track active jobs |               |
|  | - Click subscribe   |    | - Show notifications|               |
|  | - Close immediately |    | - Update UI         |               |
|  +----------+----------+    +----------+----------+               |
|             |                          ^                          |
|             | POST /api/jobs           | Supabase Realtime        |
|             v                          |                          |
+------------------------------------------------------------------+
              |                          |
              v                          |
+------------------------------------------------------------------+
|                           BACKEND                                 |
+------------------------------------------------------------------+
|                                                                   |
|  +---------------------+    +---------------------+               |
|  | POST /api/jobs      |    | Background Worker   |               |
|  |                     |    | (Async Processor)   |               |
|  | - Validate request  |    |                     |               |
|  | - Create job record |--->| - Pick up pending   |               |
|  | - Return job_id     |    |   jobs              |               |
|  |                     |    | - Process items     |               |
|  +---------------------+    | - Update progress   |               |
|                             | - Mark complete     |               |
|                             +----------+----------+               |
|                                        |                          |
+------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------+
|                         SUPABASE DATABASE                         |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------------+    +-------------------------+       |
|  | background_jobs         |    | flow_sequence_          |       |
|  |                         |    | enrollments             |       |
|  | id: uuid                |    |                         |       |
|  | workspace_id: uuid      |    | (created by worker)     |       |
|  | type: text              |    |                         |       |
|  | status: text            |    |                         |       |
|  | payload: jsonb          |    |                         |       |
|  | result: jsonb           |    |                         |       |
|  | processed_items: int    |    |                         |       |
|  | total_items: int        |    |                         |       |
|  +-------------------------+    +-------------------------+       |
|                                                                   |
|  REALTIME ENABLED - Frontend subscribes to job updates            |
+------------------------------------------------------------------+
```

### Job Lifecycle

```
                    +-------------+
                    |   PENDING   |
                    |             |
                    | Job created |
                    | waiting for |
                    | worker      |
                    +------+------+
                           |
                           | Worker picks up job
                           v
                    +-------------+
                    | PROCESSING  |
                    |             |
                    | Worker is   |
                    | processing  |
                    | items       |
                    +------+------+
                           |
              +------------+------------+
              |                         |
              | Success                 | Error
              v                         v
       +-------------+           +-------------+
       |  COMPLETED  |           |   FAILED    |
       |             |           |             |
       | All items   |           | Error       |
       | processed   |           | occurred    |
       +-------------+           +------+------+
                                        |
                                        | retry_count < max_retries
                                        v
                                 +-------------+
                                 |   PENDING   |
                                 | (retry)     |
                                 +-------------+
```

### Data Flow for Sequence Subscription

```
Step 1: User Action
+------------------+
| User selects     |
| 92 contacts      |
| and sequence     |
| "STL and In Area"|
+--------+---------+
         |
         v
Step 2: API Request
+------------------+
| POST /api/jobs   |
| {                |
|   type: "seq_sub"|
|   payload: {     |
|     sequenceId,  |
|     contactIds,  |
|     sequenceName |
|   }              |
| }                |
+--------+---------+
         |
         v
Step 3: Job Created
+------------------+
| background_jobs  |
| {                |
|   id: "job_123"  |
|   status: pending|
|   total: 92      |
|   processed: 0   |
| }                |
+--------+---------+
         |
         v
Step 4: Response
+------------------+
| { jobId: "123" } |
| Frontend closes  |
| modal, shows     |
| toast            |
+--------+---------+
         |
         | (async)
         v
Step 5: Worker Processing
+------------------+
| For each contact:|
|                  |
| [=====>    ] 45% |
|                  |
| - Create enrollmt|
| - Schedule msg   |
| - Update progress|
+--------+---------+
         |
         | Realtime updates
         v
Step 6: Frontend Updates
+------------------+
| Toast updates:   |
| "Processing      |
|  45/92..."       |
+--------+---------+
         |
         v
Step 7: Completion
+------------------+
| status: completed|
| result: {        |
|   succeeded: 89  |
|   blocked: 3     |
|   failed: 0      |
| }                |
+--------+---------+
         |
         v
Step 8: Final Notification
+------------------+
| "89 contacts     |
|  subscribed to   |
|  STL and In Area"|
+------------------+
```

## Database Schema

### background_jobs Table

```sql
CREATE TABLE background_jobs (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Job identification
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',

  -- Job data
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,

  -- Progress tracking
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,

  -- Timing
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);
```

### Field Descriptions

```
+------------------+------------+------------------------------------------------+
| Field            | Type       | Description                                    |
+------------------+------------+------------------------------------------------+
| id               | UUID       | Unique job identifier                          |
| workspace_id     | UUID       | Which workspace owns this job                  |
| user_id          | UUID       | Who initiated the job                          |
| type             | TEXT       | Job type (see Job Types below)                 |
| status           | TEXT       | Current status (pending/processing/etc)        |
| payload          | JSONB      | Input data for the job                         |
| result           | JSONB      | Output data after completion                   |
| total_items      | INTEGER    | Total items to process                         |
| processed_items  | INTEGER    | Items processed so far                         |
| created_at       | TIMESTAMP  | When job was created                           |
| started_at       | TIMESTAMP  | When processing began                          |
| completed_at     | TIMESTAMP  | When job finished                              |
| error_message    | TEXT       | Error details if failed                        |
| retry_count      | INTEGER    | How many times job has been retried            |
| max_retries      | INTEGER    | Maximum retry attempts allowed                 |
+------------------+------------+------------------------------------------------+
```

### Job Types

```
+------------------------+--------------------------------------------------+
| Type                   | Description                                      |
+------------------------+--------------------------------------------------+
| sequence_subscription  | Subscribe contacts to a drip sequence            |
| bulk_export            | Export contacts to CSV/Excel                     |
| bulk_tag               | Add or remove tags from multiple contacts        |
| bulk_delete            | Delete multiple contacts                         |
| bulk_sms               | Send SMS to multiple contacts (broadcast)        |
| bulk_email             | Send email to multiple contacts                  |
| contact_import         | Import contacts from CSV/Excel                   |
+------------------------+--------------------------------------------------+
```

### Status Values

```
+-------------+----------------------------------------------------------------+
| Status      | Description                                                    |
+-------------+----------------------------------------------------------------+
| pending     | Job created, waiting for worker to pick up                     |
| processing  | Worker is actively processing items                            |
| completed   | All items processed successfully                               |
| failed      | Job failed (check error_message)                               |
| cancelled   | User cancelled the job                                         |
+-------------+----------------------------------------------------------------+
```

### Example Records

**Pending Job:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "ws_123",
  "user_id": "user_456",
  "type": "sequence_subscription",
  "status": "pending",
  "payload": {
    "sequenceId": "seq_789",
    "sequenceName": "STL and In Area",
    "contactIds": ["c1", "c2", "c3", "...92 total"]
  },
  "result": null,
  "total_items": 92,
  "processed_items": 0,
  "created_at": "2025-01-15T10:30:00Z",
  "started_at": null,
  "completed_at": null
}
```

**Completed Job:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "workspace_id": "ws_123",
  "user_id": "user_456",
  "type": "sequence_subscription",
  "status": "completed",
  "payload": {
    "sequenceId": "seq_789",
    "sequenceName": "STL and In Area",
    "contactIds": ["c1", "c2", "c3", "...92 total"]
  },
  "result": {
    "succeeded": 89,
    "blocked": 3,
    "failed": 0,
    "blockedReasons": [
      { "contactId": "c45", "reason": "Already enrolled" },
      { "contactId": "c67", "reason": "Opted out of SMS" },
      { "contactId": "c89", "reason": "DNC list" }
    ]
  },
  "total_items": 92,
  "processed_items": 92,
  "created_at": "2025-01-15T10:30:00Z",
  "started_at": "2025-01-15T10:30:01Z",
  "completed_at": "2025-01-15T10:30:45Z"
}
```

## Frontend Implementation

### 1. JobStatusProvider (React Context)

```
+------------------------------------------------------------------+
|                      JobStatusProvider                            |
+------------------------------------------------------------------+
|                                                                   |
|  State:                                                           |
|  +-----------------------------------------------------------+   |
|  | activeJobs: Map<jobId, jobData>                           |   |
|  | - Tracks all jobs for current user                        |   |
|  | - Updates via Supabase Realtime                           |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
|  Methods:                                                         |
|  +-----------------------------------------------------------+   |
|  | createJob(type, payload) -> jobId                         |   |
|  | - POST to /api/jobs                                       |   |
|  | - Add to activeJobs                                       |   |
|  +-----------------------------------------------------------+   |
|  | cancelJob(jobId)                                          |   |
|  | - POST to /api/jobs/:id/cancel                            |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
|  Realtime Subscription:                                           |
|  +-----------------------------------------------------------+   |
|  | supabase                                                  |   |
|  |   .channel('background_jobs')                             |   |
|  |   .on('postgres_changes', { table: 'background_jobs' })   |   |
|  |   .subscribe()                                            |   |
|  +-----------------------------------------------------------+   |
|                                                                   |
+------------------------------------------------------------------+
```

### 2. Updated Modal Flow

```
BEFORE (Blocking):
+------------------+     +------------------+     +------------------+
|  Click Subscribe |---->|  Show Spinner    |---->|  Wait 30 sec     |
|                  |     |  "0/92"          |     |  USER BLOCKED    |
+------------------+     +------------------+     +------------------+

AFTER (Non-blocking):
+------------------+     +------------------+     +------------------+
|  Click Subscribe |---->|  Create Job      |---->|  Close Modal     |
|                  |     |  (instant)       |     |  Show Toast      |
+------------------+     +------------------+     +------------------+
                                                          |
                                                          v
                                            +------------------+
                                            |  User continues  |
                                            |  working...      |
                                            +------------------+
                                                          |
                              Realtime updates            |
                         +--------------------------------+
                         |
                         v
+------------------+     +------------------+     +------------------+
|  Toast: 45/92    |---->|  Toast: 92/92    |---->|  Toast: Done!    |
|  Processing...   |     |  Almost done...  |     |  89 subscribed   |
+------------------+     +------------------+     +------------------+
```

### 3. Toast Notification States

```
+------------------------------------------------------------------+
|  Job Started                                                      |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | [Icon: Clock]                                              |  |
|  |                                                            |  |
|  | Subscribing contacts to sequence...                        |  |
|  | 92 contacts | STL and In Area                              |  |
|  |                                                            |  |
|  | [===>                                        ] 0%          |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  Job Processing                                                   |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | [Icon: Spinner]                                            |  |
|  |                                                            |  |
|  | Processing sequence subscription...                        |  |
|  | 45 of 92 contacts                                          |  |
|  |                                                            |  |
|  | [===================>                       ] 49%          |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  Job Completed                                                    |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | [Icon: Checkmark]                                          |  |
|  |                                                            |  |
|  | Contacts subscribed successfully!                          |  |
|  | 89 subscribed | 3 skipped (already enrolled)               |  |
|  |                                                            |  |
|  | [View Details]                              [Dismiss]      |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  Job Failed                                                       |
+------------------------------------------------------------------+
|  +------------------------------------------------------------+  |
|  | [Icon: Error]                                              |  |
|  |                                                            |  |
|  | Subscription failed                                        |  |
|  | Error: Database connection timeout                         |  |
|  |                                                            |  |
|  | [Retry]                                     [Dismiss]      |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

## Backend Implementation

### 1. API Endpoints

```
+------------------------------------------------------------------+
|  POST /api/workspaces/:workspaceId/jobs                          |
+------------------------------------------------------------------+
|                                                                   |
|  Request:                                                         |
|  {                                                                |
|    "type": "sequence_subscription",                               |
|    "payload": {                                                   |
|      "sequenceId": "seq_789",                                     |
|      "sequenceName": "STL and In Area",                           |
|      "contactIds": ["c1", "c2", "c3"]                             |
|    }                                                              |
|  }                                                                |
|                                                                   |
|  Response:                                                        |
|  {                                                                |
|    "success": true,                                               |
|    "jobId": "550e8400-e29b-41d4-a716-446655440000",               |
|    "status": "pending",                                           |
|    "message": "Job created, processing will begin shortly"        |
|  }                                                                |
|                                                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  GET /api/workspaces/:workspaceId/jobs/:jobId                    |
+------------------------------------------------------------------+
|                                                                   |
|  Response:                                                        |
|  {                                                                |
|    "id": "550e8400-e29b-41d4-a716-446655440000",                  |
|    "type": "sequence_subscription",                               |
|    "status": "processing",                                        |
|    "totalItems": 92,                                              |
|    "processedItems": 45,                                          |
|    "createdAt": "2025-01-15T10:30:00Z",                           |
|    "startedAt": "2025-01-15T10:30:01Z"                            |
|  }                                                                |
|                                                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  POST /api/workspaces/:workspaceId/jobs/:jobId/cancel            |
+------------------------------------------------------------------+
|                                                                   |
|  Response:                                                        |
|  {                                                                |
|    "success": true,                                               |
|    "message": "Job cancelled"                                     |
|  }                                                                |
|                                                                   |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  GET /api/workspaces/:workspaceId/jobs                           |
+------------------------------------------------------------------+
|                                                                   |
|  Query Params:                                                    |
|  - status: filter by status (optional)                            |
|  - type: filter by job type (optional)                            |
|  - limit: pagination limit (default: 20)                          |
|  - offset: pagination offset (default: 0)                         |
|                                                                   |
|  Response:                                                        |
|  {                                                                |
|    "jobs": [...],                                                 |
|    "total": 45,                                                   |
|    "hasMore": true                                                |
|  }                                                                |
|                                                                   |
+------------------------------------------------------------------+
```

### 2. Background Worker Flow

```
+------------------------------------------------------------------+
|                     BACKGROUND WORKER                             |
+------------------------------------------------------------------+
|                                                                   |
|  1. Poll for pending jobs (every 5 seconds)                       |
|     +----------------------------------------------------------+ |
|     | SELECT * FROM background_jobs                            | |
|     | WHERE status = 'pending'                                 | |
|     | ORDER BY created_at ASC                                  | |
|     | LIMIT 1                                                  | |
|     | FOR UPDATE SKIP LOCKED                                   | |
|     +----------------------------------------------------------+ |
|                              |                                    |
|                              v                                    |
|  2. Mark job as processing                                        |
|     +----------------------------------------------------------+ |
|     | UPDATE background_jobs                                   | |
|     | SET status = 'processing',                               | |
|     |     started_at = NOW()                                   | |
|     | WHERE id = :jobId                                        | |
|     +----------------------------------------------------------+ |
|                              |                                    |
|                              v                                    |
|  3. Process items in batches                                      |
|     +----------------------------------------------------------+ |
|     | for (batch of contactIds, size=10) {                     | |
|     |   - Process batch                                        | |
|     |   - Update processed_items                               | |
|     |   - Sleep 100ms (rate limiting)                          | |
|     | }                                                        | |
|     +----------------------------------------------------------+ |
|                              |                                    |
|                              v                                    |
|  4. Mark job as completed                                         |
|     +----------------------------------------------------------+ |
|     | UPDATE background_jobs                                   | |
|     | SET status = 'completed',                                | |
|     |     completed_at = NOW(),                                | |
|     |     result = { succeeded, blocked, failed }              | |
|     | WHERE id = :jobId                                        | |
|     +----------------------------------------------------------+ |
|                                                                   |
+------------------------------------------------------------------+
```

### 3. Worker Implementation: Trigger.dev (CHOSEN)

```
+------------------------------------------------------------------+
|              TRIGGER.DEV ARCHITECTURE (IMPLEMENTED)               |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------+         +------------------+                 |
|  | Express Server   |         | Trigger.dev      |                 |
|  | cc.automate8.com |         | Cloud Workers    |                 |
|  |                  |         |                  |                 |
|  | +-------------+  |         | +-------------+  |                 |
|  | | POST /jobs  |  |         | | background  |  |                 |
|  | |             |  |         | | JobTasks.js |  |                 |
|  | | 1. Validate |  |         | |             |  |                 |
|  | | 2. Create   |  | trigger | | - sequence  |  |                 |
|  | |    job in DB|----------->|   Subscription|  |                 |
|  | | 3. Trigger  |  |         | | - bulk      |  |                 |
|  | |    task     |  |         | |   Export    |  |                 |
|  | +-------------+  |         | | - bulk      |  |                 |
|  |                  |         | |   Tag       |  |                 |
|  +------------------+         | +------+------+  |                 |
|                               |        |         |                 |
|                               +------------------+                 |
|                                        |                          |
|                                        | Updates                  |
|                                        v                          |
|                               +------------------+                 |
|                               | Supabase         |                 |
|                               | background_jobs  |                 |
|                               |                  |                 |
|                               | - status         |                 |
|                               | - processed_items|                 |
|                               | - result         |                 |
|                               +------------------+                 |
|                                        |                          |
|                                        | Realtime                 |
|                                        v                          |
|                               +------------------+                 |
|                               | Frontend         |                 |
|                               | React App        |                 |
|                               |                  |                 |
|                               | Shows progress   |                 |
|                               | toast updates    |                 |
|                               +------------------+                 |
|                                                                   |
+------------------------------------------------------------------+
```

### Trigger.dev Task Structure (with Batch + Delay for Rate Limiting)

**IMPORTANT:** The background job task only handles **enrollment orchestration**.
The actual sequence execution (SMS, VAPI calls, emails) is handled by `unifiedWorkflows.js` which remains **UNCHANGED**.

```
+------------------------------------------------------------------+
|              SEPARATION OF CONCERNS                               |
+------------------------------------------------------------------+
|                                                                   |
|  backgroundJobTasks.js          unifiedWorkflows.js               |
|  (NEW - Orchestrator)           (UNCHANGED - Engine)              |
|  ─────────────────────          ─────────────────────             |
|                                                                   |
|  - Batch contacts               - Execute sequence steps          |
|  - Add delays between batches   - Send SMS via Twilio             |
|  - Update progress to DB        - Make VAPI calls                 |
|  - Track succeeded/failed       - Send emails                     |
|                                 - Handle business hours           |
|         │                                  ▲                      |
|         │     enrollContact()              │                      |
|         └──────────────────────────────────┘                      |
|                                                                   |
+------------------------------------------------------------------+
```

**Batch + Delay Strategy (Avoids Rate Limits):**

```
Subscribe 92 contacts to sequence:

Batch 1: contacts[0-14]   → enrollContact() × 15  (t=0)
         Each enrollment triggers unifiedWorkflows.js
         └─→ Update progress: 15/92
         └─→ sleep(5000ms)

Batch 2: contacts[15-29]  → enrollContact() × 15  (t=5s)
         └─→ Update progress: 30/92
         └─→ sleep(5000ms)

Batch 3: contacts[30-44]  → enrollContact() × 15  (t=10s)
         └─→ Update progress: 45/92
         └─→ sleep(5000ms)

... continues ...

Batch 7: contacts[90-91]  → enrollContact() × 2   (t=30s)
         └─→ Update progress: 92/92
         └─→ Mark job completed

Total time: ~30 seconds for 92 contacts
VAPI/Twilio rate limits respected ✓
```

```javascript
// trigger/backgroundJobTasks.js

import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

// Batch configuration
const BATCH_SIZE = 15;                    // Process 15 contacts per batch
const DELAY_BETWEEN_BATCHES_MS = 5000;    // 5 seconds between batches

// Helper: Split array into chunks
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Helper: Sleep function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const processSequenceSubscription = task({
  id: "process-sequence-subscription",
  maxDuration: 600, // 10 minutes max
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload) => {
    const { jobId, workspaceId, sequenceId, contactIds } = payload;

    logger.info(`Starting sequence subscription job`, {
      jobId,
      totalContacts: contactIds.length,
      batchSize: BATCH_SIZE
    });

    // 1. Mark job as processing
    await updateJobStatus(jobId, 'processing');

    // 2. Process contacts in batches with delays
    const results = { succeeded: [], blocked: [], failed: [] };
    const batches = chunkArray(contactIds, BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      logger.info(`Processing batch ${batchIndex + 1}/${batches.length}`, {
        batchSize: batch.length
      });

      // Process each contact in the batch
      for (const contactId of batch) {
        try {
          // This triggers unifiedWorkflows.js (unchanged)
          await enrollContact(contactId, sequenceId, workspaceId);
          results.succeeded.push(contactId);
        } catch (error) {
          if (error.message.includes('already enrolled') ||
              error.message.includes('opted out')) {
            results.blocked.push({ id: contactId, reason: error.message });
          } else {
            results.failed.push({ id: contactId, error: error.message });
          }
        }
      }

      // Update progress after each batch (triggers Realtime update)
      const processedCount = Math.min(
        (batchIndex + 1) * BATCH_SIZE,
        contactIds.length
      );
      await updateJobProgress(jobId, processedCount, contactIds.length);

      // Delay before next batch (except for last batch)
      if (batchIndex < batches.length - 1) {
        logger.info(`Waiting ${DELAY_BETWEEN_BATCHES_MS}ms before next batch`);
        await sleep(DELAY_BETWEEN_BATCHES_MS);
      }
    }

    // 3. Mark job as completed with results
    await updateJobStatus(jobId, 'completed', results);

    logger.info(`Job completed`, {
      jobId,
      succeeded: results.succeeded.length,
      blocked: results.blocked.length,
      failed: results.failed.length
    });

    return results;
  },
});
```

### Alternative Options (NOT CHOSEN - For Reference Only)

```
+------------------------------------------------------------------+
|  Option A: In-Process Worker                                      |
|  Status: NOT CHOSEN                                               |
|  Reason: Would affect API performance                             |
+------------------------------------------------------------------+

+------------------------------------------------------------------+
|  Option C: Separate Worker Process                                |
|  Status: NOT CHOSEN                                               |
|  Reason: More infrastructure to manage, already have Trigger.dev  |
+------------------------------------------------------------------+
```

## Implementation Steps

### Phase 1: Database Setup
```
Files to create/modify:
- Supabase Migration (via MCP tool)

Tasks:
[ ] 1. Create migration for background_jobs table
[ ] 2. Add RLS policies
[ ] 3. Enable Supabase Realtime for the table
[ ] 4. Test with manual inserts
```

### Phase 2: Backend API
```
Files to create/modify:
- backend/routes/jobsRoutes.js (NEW)
- backend/index.js (add route)

Tasks:
[ ] 1. Create POST /api/workspaces/:id/jobs endpoint
[ ] 2. Create GET /api/workspaces/:id/jobs/:jobId endpoint
[ ] 3. Create GET /api/workspaces/:id/jobs endpoint (list)
[ ] 4. Create POST /api/workspaces/:id/jobs/:jobId/cancel endpoint
[ ] 5. Add validation and error handling
```

### Phase 3: Trigger.dev Task
```
Files to create/modify:
- trigger/backgroundJobTasks.js (NEW)
- trigger/index.js (export new task)

Tasks:
[ ] 1. Create processSequenceSubscription task
[ ] 2. Implement progress updates to Supabase
[ ] 3. Configure retry settings
[ ] 4. Add logging with logger
[ ] 5. Deploy to Trigger.dev (npx trigger.dev@latest deploy)
```

### Phase 4: Frontend Updates
```
Files to create/modify:
- frontend/src/contexts/JobStatusContext.js (NEW)
- frontend/src/components/shared/JobNotificationToast.js (NEW)
- frontend/src/components/contactV2/SubscribeSequenceModal.js (MODIFY)
- frontend/src/App.js (add context provider)

Tasks:
[ ] 1. Create JobStatusProvider context
[ ] 2. Set up Supabase Realtime subscription
[ ] 3. Update SubscribeSequenceModal to use jobs API
[ ] 4. Create JobNotificationToast component
[ ] 5. Add job status to user menu or notification area
```

### Phase 5: Testing & Polish
```
[ ] 1. Test with small batches (5 contacts)
[ ] 2. Test with medium batches (50 contacts)
[ ] 3. Test with large batches (500+ contacts)
[ ] 4. Test error scenarios (network failure, timeout)
[ ] 5. Test page refresh during processing
[ ] 6. Test cancellation
```

## Security Considerations

```
+------------------------------------------------------------------+
|                      SECURITY CHECKLIST                           |
+------------------------------------------------------------------+
|                                                                   |
|  [x] RLS Policies                                                 |
|      - Users can only view/create jobs in their workspace         |
|      - Backend service role for updates                           |
|                                                                   |
|  [x] Input Validation                                             |
|      - Validate job type is allowed                               |
|      - Validate payload structure                                 |
|      - Limit contactIds array size (max 1000)                     |
|                                                                   |
|  [x] Rate Limiting                                                |
|      - Max 5 concurrent jobs per workspace                        |
|      - Max 10 jobs per hour per user                              |
|                                                                   |
|  [x] Audit Trail                                                  |
|      - All jobs are logged with user_id                           |
|      - Results stored for review                                  |
|                                                                   |
+------------------------------------------------------------------+
```

## Monitoring & Debugging

### Useful Queries

```sql
-- Find stuck jobs (processing for more than 10 minutes)
SELECT * FROM background_jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '10 minutes';

-- Job statistics by type
SELECT
  type,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
FROM background_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY type, status;

-- Recent failed jobs
SELECT * FROM background_jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Jobs by user
SELECT
  user_id,
  COUNT(*) as total_jobs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM background_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id;
```

## Future Enhancements

```
+------------------------------------------------------------------+
|                    FUTURE FEATURES                                |
+------------------------------------------------------------------+
|                                                                   |
|  [ ] Job Priority                                                 |
|      - High priority jobs processed first                         |
|      - Useful for time-sensitive operations                       |
|                                                                   |
|  [ ] Scheduled Jobs                                               |
|      - Run job at specific time                                   |
|      - Useful for scheduled broadcasts                            |
|                                                                   |
|  [ ] Job Dependencies                                             |
|      - Job B waits for Job A to complete                          |
|      - Useful for complex workflows                               |
|                                                                   |
|  [ ] Webhook Notifications                                        |
|      - Notify external systems when job completes                 |
|      - Useful for integrations                                    |
|                                                                   |
|  [ ] Job Templates                                                |
|      - Save common job configurations                             |
|      - Quick re-run of previous jobs                              |
|                                                                   |
+------------------------------------------------------------------+
```

## Summary

The Background Jobs system transforms blocking operations into non-blocking background tasks, improving user experience significantly:

| Aspect | Before | After |
|--------|--------|-------|
| User Experience | Blocked for 30+ seconds | Instant response |
| Progress | Fake progress bar | Real-time updates |
| Page Refresh | Loses status | Status preserved |
| Large Batches | May timeout | Handles 1000+ |
| Error Recovery | Manual retry | Automatic retries |
| Audit Trail | None | Full history |

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: Development Team*
