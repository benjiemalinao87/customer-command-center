# Trigger.dev and Flow Builder Integration

## Overview

The Flow Builder's Enrollment History and Execution Logs tabs are now fully integrated with Trigger.dev workflow executions. This integration provides real-time tracking of workflow executions directly in the Flow Builder UI.

## Architecture

### Database Tables

1. **`flow_executions`** - Tracks overall flow execution instances
   - Created when a flow starts executing
   - Updated as the flow progresses
   - Contains execution metadata, status, results, and contact information

2. **`flow_execution_steps`** - Tracks individual steps within a flow execution
   - Created for each node/step in the workflow
   - Records step status, start/end times, and results
   - Links to parent `flow_executions` record

### Data Flow

```
┌─────────────────────┐
│   Trigger.dev       │
│   Workflow Engine   │
└──────────┬──────────┘
           │
           │ Creates execution records
           ↓
┌─────────────────────────────────────┐
│  Supabase Tables                    │
│  ├── flow_executions                │
│  │   ├── id (UUID)                 │
│  │   ├── flow_id (UUID)            │
│  │   ├── contact_id (UUID)         │
│  │   ├── workspace_id (TEXT)       │
│  │   ├── status (TEXT)             │
│  │   ├── started_at (TIMESTAMPTZ)  │
│  │   ├── completed_at (TIMESTAMPTZ)│
│  │   ├── result (JSONB)            │
│  │   └── metadata (JSONB)          │
│  │                                  │
│  └── flow_execution_steps          │
│      ├── id (UUID)                  │
│      ├── execution_id (UUID)       │
│      ├── node_id (TEXT)            │
│      ├── node_type (TEXT)          │
│      ├── status (TEXT)             │
│      ├── started_at (TIMESTAMPTZ)  │
│      ├── completed_at (TIMESTAMPTZ)│
│      └── result (JSONB)            │
└─────────────────────────────────────┘
           │
           │ Fetched by
           ↓
┌─────────────────────────────────────┐
│  FlowExecutionService               │
│  ├── getEnrollmentHistory()        │
│  └── getExecutionLogs()            │
└──────────┬──────────────────────────┘
           │
           │ Displays in
           ↓
┌─────────────────────────────────────┐
│  Flow Builder UI                    │
│  ├── Enrollment History Tab         │
│  └── Execution Logs Tab            │
└─────────────────────────────────────┘
```

## Implementation Details

### Trigger.dev Integration

The unified workflow (`trigger/unifiedWorkflows.js`) creates and updates execution records:

1. **Flow Start**:
   - Creates a `flow_executions` record with status `running`
   - Stores trigger metadata and contact information

2. **Step Execution**:
   - Creates a `flow_execution_steps` record for each node
   - Updates step status as it progresses (running → success/failed)
   - Stores step results and execution time

3. **Flow Completion**:
   - Updates `flow_executions` record with final status (completed/failed)
   - Stores complete results in the `result` JSONB field

### FlowExecutionService

Located at: `frontend/src/services/FlowExecutionService.js`

#### Methods

**`getEnrollmentHistory(flowId, workspaceId, filters)`**
- Fetches list of contacts who have entered the flow
- Returns formatted enrollment data with:
  - Contact information
  - Enrollment reason (manual, scheduled, webhook)
  - Date enrolled
  - Current action being executed
  - Current status (running, completed, failed)
  - Next execution time (for delays)

**`getExecutionLogs(flowId, workspaceId, filters)`**
- Fetches detailed step-by-step execution logs
- Returns formatted log data with:
  - Contact information
  - Action type (Send SMS, Send Email, Delay, etc.)
  - Step status (success, failed, running)
  - Execution timestamp
  - Result data

**`getExecutionDetails(executionId)`**
- Fetches complete details for a single execution
- Includes all steps and their results

**`getExecutionStats(flowId, workspaceId)`**
- Returns execution statistics:
  - Total executions
  - Running count
  - Completed count
  - Failed count

### Flow Builder Integration

Located at: `frontend/src/components/flow-builder/FlowBuilder.js`

#### State Management

```javascript
// Execution history and logs state
const [enrollmentHistory, setEnrollmentHistory] = useState([]);
const [executionLogs, setExecutionLogs] = useState([]);
const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
const [isLoadingLogs, setIsLoadingLogs] = useState(false);
```

#### Data Fetching

```javascript
// Fetch enrollment history when tab is opened (activeTab === 2)
useEffect(() => {
  if (activeTab === 2 && flow?.id && flow?.workspace_id) {
    // Fetch data via FlowExecutionService
  }
}, [activeTab, flow?.id, flow?.workspace_id]);

// Fetch execution logs when tab is opened (activeTab === 3)
useEffect(() => {
  if (activeTab === 3 && flow?.id && flow?.workspace_id) {
    // Fetch data via FlowExecutionService
  }
}, [activeTab, flow?.id, flow?.workspace_id]);
```

## UI Components

### Enrollment History Tab

Displays:
- Contact name and email
- Enrollment reason (e.g., "Manual Send (Contact Page)")
- Date enrolled
- Current action being executed
- Current status badge (In Progress, Completed, Failed)
- Next execution time (for workflows with delays)
- Actions (View button)

### Execution Logs Tab

Displays:
- Contact name and email
- Action performed (Send SMS, Send Email, Delay, etc.)
- Status badge (Success, Failed, Running)
- Execution timestamp
- Actions (View button)

## Status Values

### Flow Execution Status
- `running` - Flow is currently executing
- `completed` - Flow finished successfully
- `failed` - Flow encountered an error
- `cancelled` - Flow was manually cancelled
- `pending` - Flow is queued but not started

### Step Execution Status
- `success` - Step completed successfully
- `failed` - Step encountered an error
- `running` - Step is currently executing
- `pending` - Step is waiting to execute
- `skipped` - Step was bypassed (e.g., condition not met)

## Metadata Structure

### Flow Executions Metadata

```json
{
  "isTest": false,
  "contact": {
    "id": "uuid",
    "name": "Contact Name",
    "email": "contact@example.com",
    "tags": "[\"tag1\", \"tag2\"]"
  },
  "trigger": {
    "type": "manual",
    "source": "contact_execution",
    "workflow_id": "uuid",
    "initiated_by": "system"
  },
  "contactId": "uuid",
  "workspaceId": "15213",
  "workflowDefinition": {
    "id": "uuid",
    "name": "Workflow Name",
    "nodes": [],
    "edges": []
  }
}
```

### Step Results

```json
{
  "success": true,
  "to": "contact@example.com",
  "subject": "Email Subject",
  "messageId": "msg_id",
  "sentAt": "2025-11-17T04:48:26.795Z",
  "provider": "resend"
}
```

## Testing

### Manual Testing Steps

1. **Create a Flow**:
   - Build a flow with Email, Delay, and Email nodes
   - Save the flow

2. **Trigger the Flow**:
   - Go to Contacts page
   - Select a contact
   - Click "Send Flow"
   - Select your flow
   - Click "Send"

3. **View Enrollment History**:
   - Go back to Flow Builder
   - Click "Enrollment History" tab
   - Verify contact appears with status "In Progress"
   - Check enrollment reason, date, and current action

4. **View Execution Logs** (after flow completes or progresses):
   - Click "Execution Logs" tab
   - Verify steps appear with correct status
   - Check timestamps and action types

5. **Test with Delay**:
   - Create a flow with a Delay node
   - Trigger the flow
   - In Enrollment History, verify "Next Execution On" shows the delay time
   - After delay completes, verify subsequent steps appear in logs

### Expected Behavior

- **Real-time Updates**: Tabs should show current execution status
- **Accurate Status**: Status badges should match Trigger.dev execution state
- **Complete Data**: All contact info, timestamps, and results should display
- **Empty States**: Tabs show "No enrollments found" / "No logs found" when no data exists
- **Loading States**: "Loading..." appears while fetching data

## Troubleshooting

### No Data Showing

1. Check if flow has been executed:
   - Trigger.dev must have run the workflow
   - Execution records only created when workflow executes

2. Verify database records:
   ```sql
   SELECT * FROM flow_executions WHERE flow_id = 'your-flow-id';
   SELECT * FROM flow_execution_steps WHERE execution_id = 'your-execution-id';
   ```

3. Check browser console for errors:
   - FlowExecutionService errors
   - Supabase query errors

### Status Not Updating

1. Refresh the tab:
   - Switch tabs and back
   - This triggers a data refetch

2. Check Trigger.dev execution:
   - View run in Trigger.dev dashboard
   - Verify execution completed/failed

3. Verify database updates:
   - Check `updated_at` timestamp
   - Verify `status` field is updated

### Missing Steps in Logs

1. Check if steps were actually executed:
   - View Trigger.dev logs
   - Verify step completed

2. Check `flow_execution_steps` table:
   ```sql
   SELECT * FROM flow_execution_steps 
   WHERE execution_id = 'your-execution-id'
   ORDER BY started_at;
   ```

3. Verify node types are recognized:
   - Check `formatActionType()` in FlowExecutionService
   - Add missing node types if needed

## Future Enhancements

1. **Real-time Updates**:
   - Add Supabase Realtime subscriptions
   - Auto-refresh tabs when execution status changes

2. **Detailed View Modal**:
   - Click "View" button to see complete execution details
   - Show step-by-step timeline
   - Display full result data

3. **Filtering**:
   - Wire up date range filters
   - Add status filters
   - Add contact search

4. **Export**:
   - Export execution history to CSV
   - Generate execution reports

5. **Retry Failed Steps**:
   - Add "Retry" button for failed executions
   - Re-trigger specific steps

## Related Files

- `trigger/unifiedWorkflows.js` - Workflow execution engine
- `frontend/src/services/FlowExecutionService.js` - Data fetching service
- `frontend/src/components/flow-builder/FlowBuilder.js` - Flow Builder UI
- `backend/migrations/flow_executions.sql` - Database schema
- `backend/migrations/execution_steps.sql` - Database schema

