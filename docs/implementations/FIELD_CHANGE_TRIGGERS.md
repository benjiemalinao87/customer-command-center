# Field Change Triggers - Complete Guide

## Table of Contents
1. [Overview](#overview)
2. [How It Works](#how-it-works)
3. [Frontend: Configuring Triggers](#frontend-configuring-triggers)
4. [Backend: Trigger Execution Flow](#backend-trigger-execution-flow)
5. [Database Architecture](#database-architecture)
6. [Complete Data Flow](#complete-data-flow)
7. [Key Components](#key-components)
8. [Examples](#examples)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Field Change Triggers allow you to automatically execute workflows when a contact's field value changes. This system is **cost-optimized** - it only processes triggers when a field is actually being monitored, saving money and resources.

### Key Features

- ✅ **Universal Support**: Works with ANY custom field or standard field
- ✅ **Cost-Efficient**: Only processes monitored fields (pre-filtered at database level)
- ✅ **Full Variable Replacement**: All contact data available for workflow actions
- ✅ **Real-time Execution**: Triggers fire immediately when fields change
- ✅ **Activity Timeline**: All changes logged for audit trail

### What Can Trigger Workflows?

- **Custom Fields**: Any custom field you create (e.g., `adate`, `atime`, `lead_type`)
- **Standard Fields**: Built-in contact fields (e.g., `appointment_date`, `lead_status`, `name`)
- **Any Condition**: Field changed to any value, specific value, or value range

---

## How It Works

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  ANY Custom Field Change (adate, atime, lead_status, etc.)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Database Trigger: is_field_monitored(field, workspace)?        │
│  - Checks if ANY active trigger watches this field              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ YES
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  process-trigger-event → Finds matching trigger → Gets flow_id  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  executeFlow() - Fetches FULL contact data                      │
│  - name, phone, email, tags, metadata, custom_fields            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  trigger-workflow → Executes ANY attached flow                  │
│  - Send SMS, Send Email, Update Contact, API Request, etc.      │
│  - ALL variables replaced correctly                             │
└─────────────────────────────────────────────────────────────────┘
```

### Cost Optimization

The system uses **pre-filtering** at the database level to avoid unnecessary processing:

**Before Optimization:**
- Every field change → Webhook called → Trigger.dev task runs
- Even if no trigger watches that field
- **Cost**: $4.32/month for 100 changes/hour (wasted!)

**After Optimization:**
- Field change → Check if monitored → Only then call webhook
- Non-monitored fields: Log only (Activity Timeline)
- Monitored fields: Full workflow execution
- **Cost**: $0 for non-monitored fields, $0.00006 per monitored change

---

## Frontend: Configuring Triggers

### User Interface Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND: TRIGGER CONFIGURATION                                │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐
  │ User opens      │
  │ Flow Builder    │
  │ → Triggers Tab  │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Click "+ Add    │
  │ Trigger"        │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────────────────────────────────────────────────┐
  │ TriggerModal Component                                       │
  │                                                              │
  │ 1. Select Event Type: "Field Value Changed"                  │
  │ 2. FieldSelectionEditor Component:                           │
  │    - Fetches REAL custom fields from /api/custom-fields     │
  │    - Merges with standard fields                            │
  │    - User selects field (e.g., "adate")                      │
  │ 3. Select Condition:                                         │
  │    - "Changed to any value"                                  │
  │    - "Changed to specific value"                             │
  │    - "Changed to value range"                                │
  │ 4. Select Flow to Execute                                    │
  │ 5. Save Trigger                                              │
  └────────┬─────────────────────────────────────────────────────┘
           │
           ▼
  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
  │ POST /api/      │────▶│ Backend        │────▶│ Database     │
  │ triggers        │     │ Controller      │     │ triggers     │
  │                 │     │                 │     │ table        │
  │ Payload:        │     │ Validates &     │     │              │
  │ {               │     │ saves trigger   │     │ {            │
  │   name: "...",  │     │ configuration   │     │   id: uuid,  │
  │   event_type:   │     │                 │     │   workspace_ │
  │     "user_field│     │                 │     │     id: ..., │
  │     _value_     │     │                 │     │   event_type:│
  │     changed",   │     │                 │     │     "user_   │
  │   conditions: { │     │                 │     │     field_   │
  │     watched     │     │                 │     │     value_   │
  │     Fields: [{  │     │                 │     │     changed",│
  │       field:    │     │                 │     │   conditions:│
  │       "adate",  │     │                 │     │     {...}    │
  │       condition:│     │                 │     │ }            │
  │       "has_     │     │                 │     └──────────────┘
  │       changed_  │     │                 │
  │       to_any_   │     │                 │
  │       value"    │     │                 │
  │     }]         │     │                 │
  │   },           │     │                 │
  │   flow_id: ... │     │                 │
  │ }              │     │                 │
  └─────────────────┘     └─────────────────┘     └──────────────┘
```

### Key Frontend Components

1. **TriggerModal** (`frontend/src/components/flow-builder/triggers/components/TriggerModal.js`)
   - Main UI for creating/editing triggers
   - Handles form validation and submission

2. **FieldSelectionEditor** (`frontend/src/components/flow-builder/triggers/components/FieldSelectionEditor.js`)
   - Fetches custom fields from API: `GET /api/custom-fields`
   - Merges with standard contact fields
   - Provides dropdown for field selection

3. **TriggersList** (`frontend/src/components/flow-builder/triggers/components/TriggersList.js`)
   - Displays all configured triggers
   - Shows trigger status, watched fields, and attached flows

### Example: Creating a Trigger

**User Action:**
1. Navigate to Flow Builder → Triggers
2. Click "+ Add Trigger"
3. Select "Field Value Changed"
4. Choose field: "Appointment Date (adate)"
5. Select condition: "Changed to any value"
6. Choose flow: "Send Email Notification"
7. Click "Save"

**Result:**
- Trigger saved to database
- Active and ready to fire when `adate` changes

---

## Backend: Trigger Execution Flow

### Complete Execution Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND: TRIGGER EXECUTION FLOW                                │
└─────────────────────────────────────────────────────────────────┘

  STEP 1: Field Change Detected
  ──────────────────────────────
  ┌─────────────────┐     ┌─────────────────┐     ┌──────────────┐
  │ API/Webhook     │     │ Supabase        │     │ PostgreSQL   │
  │ Updates Contact │────▶│ Updates         │────▶│ Trigger      │
  │                 │     │ contact_custom_ │     │ Fires        │
  │ PUT /api/       │     │ fields table    │     │              │
  │ custom-fields/  │     │                 │     │ log_contact_│
  │ contact/:id/    │     │                 │     │ custom_field_│
  │ values          │     │                 │     │ changes()    │
  └─────────────────┘     └─────────────────┘     └──────┬───────┘
                                                           │
                                                           ▼
  STEP 2: Pre-Filter Check (Cost Optimization)
  ────────────────────────────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ PostgreSQL Function: is_field_monitored()                   │
  │                                                              │
  │ SELECT EXISTS (                                             │
  │   SELECT 1 FROM triggers                                    │
  │   WHERE workspace_id = '67621'                              │
  │   AND event_type = 'user_field_value_changed'               │
  │   AND is_active = true                                      │
  │   AND conditions->'watchedFields' @>                        │
  │     jsonb_build_array(                                      │
  │       jsonb_build_object('field', 'adate')                  │
  │     )                                                       │
  │ )                                                           │
  └───────────────────────────┬─────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐   ┌──────────────┐
            │   YES         │   │   NO         │
            │ Monitored     │   │ Not Monitored│
            └───────┬───────┘   └───────┬──────┘
                    │                   │
                    │                   ▼
                    │           ┌──────────────┐
                    │           │ Log to       │
                    │           │ Activity     │
                    │           │ Timeline     │
                    │           │ ONLY         │
                    │           │ (No cost)    │
                    │           └──────────────┘
                    │
                    ▼
  STEP 3: Webhook Call
  ────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ PostgreSQL Function: call_trigger_webhook()                │
  │                                                              │
  │ POST https://cc.automate8.com/api/webhooks/triggers/       │
  │   contact-field-changed                                     │
  │                                                              │
  │ Payload:                                                    │
  │ {                                                           │
  │   contactId: "d83faf2f-c556-4de5-a09c-dddf6f47e6d2",        │
  │   workspaceId: "67621",                                     │
  │   fieldName: "adate",                                       │
  │   oldValue: "12/12/2025",                                   │
  │   newValue: "12/22/2025",                                   │
  │   changedAt: "2025-12-10T17:46:02.510Z"                     │
  │ }                                                           │
  └───────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
  STEP 4: Trigger.dev Task Queue
  ───────────────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ Backend Route: /api/webhooks/triggers/contact-field-changed │
  │                                                              │
  │ import { tasks } from '@trigger.dev/sdk/v3';               │
  │                                                              │
  │ await tasks.trigger("process-trigger-event", {               │
  │   contactId,                                                │
  │   workspaceId,                                              │
  │   fieldName,                                                │
  │   oldValue,                                                 │
  │   newValue,                                                  │
  │   changedAt                                                 │
  │ });                                                         │
  └───────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
  STEP 5: Process Trigger Event
  ──────────────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ Trigger.dev Task: process-trigger-event                     │
  │                                                              │
  │ 1. Create trigger_event record                               │
  │ 2. Resolve field name (custom:uuid vs label)                │
  │ 3. Query triggers table for workspace                        │
  │ 4. Find matching triggers (field + condition)               │
  │ 5. For each match: executeFlow(flowId, contactId, ...)      │
  └───────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
  STEP 6: Execute Flow
  ────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ Function: executeFlow(flowId, contactId, workspaceId)       │
  │                                                              │
  │ 1. Fetch FULL contact data from database:                   │
  │    - name, phone, email, tags, metadata, custom_fields      │
  │                                                              │
  │ 2. Trigger workflow task:                                   │
  │    await tasks.trigger("trigger-workflow", {                │
  │      workflowId: flowId,                                    │
  │      workspaceId,                                           │
  │      input: {                                               │
  │        trigger: {                                           │
  │          type: 'field_change',                              │
  │          source: 'trigger_system'                           │
  │        },                                                   │
  │        contact: { /* FULL contact data */ },                │
  │        contactId,                                           │
  │        isTest: false                                        │
  │      }                                                      │
  │    });                                                      │
  └───────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
  STEP 7: Workflow Execution
  ───────────────────────────
  ┌─────────────────────────────────────────────────────────────┐
  │ Trigger.dev Task: trigger-workflow                          │
  │                                                              │
  │ 1. Load workflow definition                                  │
  │ 2. Execute each step in sequence:                           │
  │    - Start node                                             │
  │    - Action nodes (Get Conversation, Send Email, etc.)      │
  │ 3. Replace variables:                                       │
  │    {{contact.name}} → "Benjie malinao"                      │
  │    {{contact.phone_number}} → "+16263133690"                │
  │    {{contact.custom.adate}} → "12/22/2025"                  │
  │    {{conversation_result}} → [messages...]                  │
  │ 4. Execute actions with replaced variables                  │
  │ 5. Log execution results                                    │
  └─────────────────────────────────────────────────────────────┘
```

### Key Backend Files

1. **Webhook Endpoint** (`backend/src/routes/triggers/webhooks.js`)
   - Receives field change notifications
   - Queues `process-trigger-event` task

2. **Trigger Event Processor** (`trigger/trigger-event-processor.js`)
   - Processes field change events
   - Finds matching triggers
   - Executes attached flows

3. **Unified Workflows** (`trigger/unifiedWorkflows.js`)
   - Executes workflow steps
   - Handles variable replacement
   - Manages action execution

---

## Database Architecture

### Core Tables

```
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE SCHEMA                                                 │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────────────────┐
  │ triggers             │
  │──────────────────────│
  │ id (uuid)            │
  │ workspace_id (text)  │
  │ name (text)          │
  │ event_type (text)    │ ← "user_field_value_changed"
  │ conditions (jsonb)   │ ← { watchedFields: [{ field, condition }] }
  │ flow_id (uuid)       │
  │ is_active (boolean)  │
  └──────────────────────┘
           │
           │ references
           ▼
  ┌──────────────────────┐
  │ flows                │
  │──────────────────────│
  │ id (uuid)            │
  │ name (text)          │
  │ nodes (jsonb)        │ ← Workflow definition
  │ workspace_id (text)  │
  └──────────────────────┘

  ┌──────────────────────┐
  │ contact_custom_fields│
  │──────────────────────│
  │ contact_id (uuid)     │
  │ field_id (uuid)      │
  │ value (jsonb)        │
  │ updated_at (timestamp)│
  └──────────────────────┘
           │
           │ triggers
           ▼
  ┌──────────────────────┐
  │ PostgreSQL Trigger   │
  │ log_contact_custom_  │
  │ field_changes()      │
  │──────────────────────│
  │ 1. Log to            │
  │    contact_field_    │
  │    changes           │
  │ 2. Check             │
  │    is_field_         │
  │    monitored()       │
  │ 3. If yes, call      │
  │    call_trigger_     │
  │    webhook()         │
  └──────────────────────┘

  ┌──────────────────────┐
  │ trigger_events       │
  │──────────────────────│
  │ id (uuid)            │
  │ event_type (text)    │
  │ event_data (jsonb)   │
  │ workspace_id (text)  │
  │ created_at (timestamp)│
  └──────────────────────┘

  ┌──────────────────────┐
  │ trigger_executions   │
  │──────────────────────│
  │ id (uuid)            │
  │ trigger_id (uuid)    │
  │ event_id (uuid)      │
  │ flow_execution_id    │
  │ status (text)        │ ← "triggered", "completed", "failed"
  │ execution_data (jsonb)│
  │ executed_at (timestamp)│
  └──────────────────────┘
```

### Database Functions

1. **`is_field_monitored(field_name, workspace_id)`**
   - Checks if any active trigger watches the field
   - Returns `BOOLEAN`
   - Used for pre-filtering (cost optimization)

2. **`log_contact_custom_field_changes()`**
   - PostgreSQL trigger function
   - Fires on INSERT/UPDATE/DELETE of `contact_custom_fields`
   - Logs to Activity Timeline
   - Calls webhook if field is monitored

3. **`call_trigger_webhook(contact_id, workspace_id, field_name, old_value, new_value)`**
   - Makes HTTP POST to backend webhook endpoint
   - Includes authentication (service role key)
   - Handles errors gracefully (doesn't fail transaction)

---

## Complete Data Flow

### End-to-End Example: Appointment Date Changed

```
┌─────────────────────────────────────────────────────────────────┐
│  COMPLETE DATA FLOW: "adate" Field Changed                      │
└─────────────────────────────────────────────────────────────────┘

  FRONTEND                          BACKEND                         DATABASE
  ────────                          ───────                         ────────

  ┌─────────────────┐
  │ User configures │
  │ trigger in UI   │
  │                 │
  │ Field: adate    │
  │ Condition: any  │
  │ Flow: Send Email│
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
  │ POST /api/      │     │ triggers        │     │ triggers table              │
  │ triggers        │────▶│ Controller      │────▶│                             │
  │                 │     │                 │     │ id: ef050b2e-...            │
  │ {               │     │ Saves trigger   │     │ workspace_id: 67621         │
  │   name: "Appt   │     │ config          │     │ event_type: user_field_     │
  │    Booked",     │     │                 │     │   value_changed             │
  │   conditions: { │     │                 │     │ conditions: {               │
  │     watched     │     │                 │     │   watchedFields: [{         │
  │     Fields: [{ │     │                 │     │     field: "custom:4fa...", │
  │       field:    │     │                 │     │     label: "adate",          │
  │       "custom:  │     │                 │     │     condition: "has_        │
  │       4fa...",  │     │                 │     │       changed_to_any_value" │
  │       label:    │     │                 │     │   }]                        │
  │       "adate"   │     │                 │     │ }                           │
  │     }]         │     │                 │     │ flow_id: 2bfac32d-...       │
  │   }            │     │                 │     │ is_active: true             │
  │ }              │     │                 │     └─────────────────────────────┘
  └─────────────────┘     └─────────────────┘


  LATER: Contact's appointment date is updated...

  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
  │ API Call        │     │ Supabase        │     │ PostgreSQL Trigger          │
  │                 │     │ Updates         │     │ log_contact_custom_field_   │
  │ PUT /api/       │────▶│ contact_custom_ │────▶│ changes()                  │
  │ custom-fields/  │     │ fields table    │     │                             │
  │ contact/:id/    │     │                 │     │ 1. Log change to            │
  │ values          │     │ {               │     │    contact_field_changes    │
  │                 │     │   contact_id:   │     │    (Activity Timeline)      │
  │ {               │     │     "d83f...",  │     │                             │
  │   field_id:     │     │   field_id:     │     │ 2. Check: is_field_         │
  │     "4fa...",   │     │     "4fa...",    │     │    monitored('adate',       │
  │   value:        │     │   value:         │     │    '67621')?                │
  │     "12/22/2025"│     │     "12/22/2025" │     │                             │
  │ }               │     │ }               │     │    Query: YES - found!      │
  └─────────────────┘     └─────────────────┘     │                             │
                                                    │ 3. Call webhook             │
                                                    └──────────────┬──────────────┘
                                                                   │
                                                                   ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  WEBHOOK + TRIGGER.DEV FLOW                                                  │
  └─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────────┐
  │ POST /api/      │     │ Trigger.dev     │     │ process-trigger-event       │
  │ triggers/       │────▶│ Queue           │────▶│ Task                        │
  │ webhooks/       │     │                 │     │                             │
  │ contact-field-  │     │ Task queued:    │     │ 1. Query triggers for       │
  │ changed         │     │ process-trigger │     │    workspace 67621           │
  │                 │     │ -event          │     │                             │
  │ Payload:        │     │                 │     │ 2. Find matching trigger    │
  │ {               │     │                 │     │    (adate field)            │
  │   contactId:    │     │                 │     │                             │
  │     "d83f...",  │     │                 │     │ 3. Evaluate condition:      │
  │   workspaceId:  │     │                 │     │    has_changed_to_any_value │
  │     "67621",    │     │                 │     │    + newValue exists        │
  │   fieldName:    │     │                 │     │    = MATCH!                 │
  │     "adate",    │     │                 │     │                             │
  │   oldValue:     │     │                 │     │ 4. executeFlow()            │
  │     "12/12/2025"│     │                 │     │    - Fetch contact data     │
  │   newValue:     │     │                 │     │    - Trigger workflow       │
  │     "12/22/2025"│     │                 │     │                             │
  │ }               │     │                 │     │ 5. Execute workflow         │
  └─────────────────┘     └─────────────────┘     │    - Get Conversation       │
                                                    │    - Send Email             │
                                                    │    - ALL variables replaced │
                                                    └─────────────────────────────┘
```

---

## Key Components

### Frontend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `TriggerModal` | `frontend/src/components/flow-builder/triggers/components/TriggerModal.js` | Main UI for creating/editing triggers |
| `FieldSelectionEditor` | `frontend/src/components/flow-builder/triggers/components/FieldSelectionEditor.js` | Field selection dropdown with real custom fields |
| `TriggersList` | `frontend/src/components/flow-builder/triggers/components/TriggersList.js` | Display all configured triggers |
| `TriggerContext` | `frontend/src/components/flow-builder/triggers/context/TriggerContext.js` | React context for trigger state management |

### Backend Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `webhooks.js` | `backend/src/routes/triggers/webhooks.js` | Webhook endpoint for field changes |
| `triggersController.js` | `backend/src/controllers/triggersController.js` | API controller for trigger CRUD |
| `processTriggerEvent` | `trigger/trigger-event-processor.js` | Trigger.dev task to process events |
| `executeFlow` | `trigger/trigger-event-processor.js` | Function to trigger workflow execution |
| `trigger-workflow` | `trigger/unifiedWorkflows.js` | Trigger.dev task to execute workflows |

### Database Components

| Component | Type | Purpose |
|-----------|------|---------|
| `is_field_monitored()` | Function | Pre-filter check (cost optimization) |
| `log_contact_custom_field_changes()` | Trigger Function | Fires on custom field changes |
| `call_trigger_webhook()` | Function | Calls backend webhook endpoint |
| `triggers` table | Table | Stores trigger configurations |
| `trigger_events` table | Table | Logs all trigger events |
| `trigger_executions` table | Table | Tracks trigger execution results |

---

## Examples

### Example 1: Appointment Date Trigger

**Scenario:** Send email notification when appointment date is set.

**Configuration:**
- **Trigger Name**: "Appointment Booked"
- **Field**: `adate` (custom field)
- **Condition**: Changed to any value
- **Flow**: "Send Email Notification"

**Flow Steps:**
1. Get Conversation (fetch chat history)
2. Send Email Notification (with appointment details)

**When Triggered:**
```
Contact: Benjie malinao
Old Value: (empty)
New Value: "12/22/2025"

→ Trigger fires
→ Flow executes
→ Email sent with:
   - Contact name: "Benjie malinao"
   - Appointment date: "12/22/2025"
   - Conversation history included
```

### Example 2: Lead Status Change

**Scenario:** Update tags when lead status changes to "Qualified".

**Configuration:**
- **Trigger Name**: "Lead Qualified"
- **Field**: `lead_status` (standard field)
- **Condition**: Changed to "Qualified"
- **Flow**: "Update Contact Tags"

**Flow Steps:**
1. Add Tag: "Qualified Lead"
2. Send SMS: "Thank you for your interest!"

**When Triggered:**
```
Contact: John Doe
Old Value: "New"
New Value: "Qualified"

→ Trigger fires
→ Flow executes
→ Tag "Qualified Lead" added
→ SMS sent to contact
```

### Example 3: Custom Field Value Range

**Scenario:** Send notification when contract value exceeds $10,000.

**Configuration:**
- **Trigger Name**: "High Value Contract"
- **Field**: `contract_value` (custom field, number type)
- **Condition**: Changed to value > 10000
- **Flow**: "Notify Sales Team"

**Flow Steps:**
1. Send Email to sales@company.com
2. Add Tag: "High Value"
3. Assign to Agent: "Sales Manager"

---

## Troubleshooting

### Trigger Not Firing

**Check 1: Is the field being saved to `contact_custom_fields` table?**
```sql
SELECT * FROM contact_custom_fields 
WHERE contact_id = 'YOUR_CONTACT_ID'
AND field_id = 'YOUR_FIELD_ID';
```

**Check 2: Is the trigger active?**
```sql
SELECT * FROM triggers 
WHERE workspace_id = 'YOUR_WORKSPACE_ID'
AND event_type = 'user_field_value_changed'
AND is_active = true;
```

**Check 3: Is the field monitored?**
```sql
SELECT is_field_monitored('YOUR_FIELD_NAME', 'YOUR_WORKSPACE_ID');
```

**Check 4: Check Trigger.dev runs**
- Go to Trigger.dev dashboard
- Look for `process-trigger-event` runs
- Check for errors in run logs

### Variables Not Replacing

**Issue:** `{{contact.name}}` shows as literal text instead of actual name.

**Solution:**
- Ensure `executeFlow()` is fetching full contact data
- Check that contact data is passed in `input.contact` object
- Verify workflow receives contact data in payload

**Debug:**
```javascript
// In trigger-event-processor.js executeFlow()
console.log('Contact data fetched:', contactData);
```

### Webhook Not Called

**Check 1: Database trigger exists?**
```sql
SELECT * FROM information_schema.triggers 
WHERE trigger_name = 'log_contact_custom_fields_changes_trigger';
```

**Check 2: Function exists?**
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'call_trigger_webhook';
```

**Check 3: Webhook URL correct?**
- Check `call_trigger_webhook()` function
- Verify URL: `https://cc.automate8.com/api/webhooks/triggers/contact-field-changed`
- Check authentication (service role key)

### Cost Issues

**If seeing high Trigger.dev costs:**
1. Check how many triggers are active
2. Verify `is_field_monitored()` is working (should return false for non-monitored fields)
3. Check `contact_field_changes` table - all changes should be logged, but webhook only called for monitored fields

**Monitor:**
```sql
-- Count webhook calls vs total field changes
SELECT 
  COUNT(*) as total_changes,
  COUNT(CASE WHEN field_name = 'YOUR_FIELD' THEN 1 END) as monitored_field_changes
FROM contact_field_changes
WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

## Best Practices

1. **Use Specific Conditions**: Instead of "any value", use specific values when possible to reduce false triggers
2. **Test Triggers**: Use test mode or create test contacts to verify trigger behavior
3. **Monitor Costs**: Regularly check Trigger.dev usage to ensure cost optimization is working
4. **Log Everything**: All field changes are logged to Activity Timeline for audit trail
5. **Error Handling**: Workflows should handle missing data gracefully
6. **Variable Validation**: Always test variable replacement in workflow actions

---

## Summary

The Field Change Trigger system provides a **cost-efficient**, **scalable** solution for automating workflows based on contact field changes. Key benefits:

- ✅ **Universal**: Works with any field (custom or standard)
- ✅ **Efficient**: Only processes monitored fields (pre-filtered)
- ✅ **Complete**: Full contact data available for all workflow actions
- ✅ **Reliable**: Database-level triggers ensure immediate execution
- ✅ **Observable**: All events logged for debugging and audit

For questions or issues, refer to the troubleshooting section or check the Trigger.dev dashboard for execution logs.
