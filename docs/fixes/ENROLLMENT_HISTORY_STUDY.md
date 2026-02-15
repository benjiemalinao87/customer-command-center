# Enrollment History Feature - Comprehensive Study

## Overview

The Enrollment History feature is a tab within the Flow Builder that displays a comprehensive history of all contacts who have entered a specific workflow. It provides visibility into workflow executions, tracking enrollment reasons, execution status, and scheduled next execution times.

## Architecture

### Component Structure

```
FlowBuilder.js (Parent)
  └── EnrollmentHistoryTab.js (UI Component)
      └── FlowExecutionService.js (Data Service)
          └── Supabase (flow_executions table)
```

### Key Files

1. **Frontend Component**: `frontend/src/components/flow-builder/tabs/EnrollmentHistoryTab.js`
2. **Data Service**: `frontend/src/services/FlowExecutionService.js`
3. **Parent Integration**: `frontend/src/components/flow-builder/FlowBuilder.js`
4. **Database Schema**: `backend/migrations/flow_executions.sql`

## Database Schema

### `flow_executions` Table

```sql
CREATE TABLE flow_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  workspace_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_time INTEGER, -- in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT, -- 'manual', 'scheduled', 'webhook', etc.
  metadata JSONB,
  next_execution_at TIMESTAMP WITH TIME ZONE, -- For waiting/delay states
  
  CONSTRAINT check_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'partial_failure', 'waiting')
  )
);
```

**Note**: The `next_execution_at` column is used in the code but may need to be added via migration if missing.

### Key Columns Explained

- **`status`**: Current execution status
  - `pending`: Queued but not started
  - `running`: Currently executing
  - `waiting`: Waiting for business hours or delay
  - `completed`: Finished successfully
  - `failed`: Encountered an error
  - `cancelled`: Manually cancelled
  - `partial_failure`: Some steps failed

- **`source`**: How the flow was triggered
  - `manual`: Manual trigger from UI
  - `trigger_workflow_task`: Triggered via Trigger.dev task
  - `scheduled`: Scheduled trigger
  - `webhook`: Webhook trigger

- **`metadata`**: JSONB field containing:
  - Contact information
  - Trigger details
  - Workflow definition
  - Step execution results
  - Business hours information

- **`next_execution_at`**: Timestamp for when execution will resume (for delays/business hours)

## Data Flow

### 1. Flow Execution Trigger

When a flow is triggered (via Trigger.dev workflow):

```
Trigger.dev Workflow
  ↓
Creates flow_executions record (status: 'running')
  ↓
Updates status as workflow progresses
  ↓
Stores results in metadata JSONB
```

### 2. Data Fetching

When user opens Enrollment History tab:

```
FlowBuilder.js (activeTab === 2)
  ↓
useEffect triggers
  ↓
flowExecutionService.getEnrollmentHistory()
  ↓
Supabase query: flow_executions + contacts join
  ↓
Data transformation and formatting
  ↓
EnrollmentHistoryTab displays data
```

## UI Component Details

### EnrollmentHistoryTab Component

**Location**: `frontend/src/components/flow-builder/tabs/EnrollmentHistoryTab.js`

**Props**:
- `enrollmentHistory`: Array of enrollment objects
- `isLoading`: Boolean loading state
- `onViewExecution`: Callback function for viewing execution details

**Features**:

1. **Header Section**
   - Title: "Enrollment History"
   - Subtitle: "View a history of all the Contacts that have entered this Workflow"

2. **Filter Section** (Currently UI-only, not wired up)
   - Start Date input
   - End Date input
   - "All Events" dropdown (Enrolled, Completed, Failed)
   - "Select Contact" dropdown
   - Refresh button

3. **Data Table Columns**:
   - **Contact**: Name and email
   - **Enrollment Reason**: How contact was enrolled
   - **Date Enrolled**: Timestamp with timezone
   - **Current Action**: What's currently happening
   - **Current Status**: Badge with color coding
   - **Next Execution On**: Scheduled time (or N/A)
   - **Actions**: "View" button

### Status Badge Colors

- **In Progress** (blue): `status === 'running'`
- **Waiting for Business Hours** (orange): `status === 'waiting'`
- **Completed** (green): `status === 'completed'`
- **Failed** (red): `status === 'failed'`
- **Cancelled** (gray): `status === 'cancelled'`
- **Pending** (yellow): `status === 'pending'`

## Service Layer

### FlowExecutionService

**Location**: `frontend/src/services/FlowExecutionService.js`

#### `getEnrollmentHistory(flowId, workspaceId, filters)`

**Purpose**: Fetches enrollment history for a specific flow

**Parameters**:
- `flowId`: UUID of the flow
- `workspaceId`: Workspace identifier
- `filters`: Optional filter object
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
  - `contactId`: Filter by specific contact
  - `status`: Filter by execution status

**Returns**: Array of enrollment objects with structure:
```javascript
{
  id: "execution-uuid",
  contact: {
    id: "contact-uuid",
    name: "Contact Name",
    email: "contact@example.com",
    phone: "+1234567890"
  },
  enrollmentReason: "Manual Trigger",
  dateEnrolled: "2025-11-12T23:21:17.000Z",
  currentAction: "Completed",
  currentStatus: { text: "Completed", color: "green" },
  nextExecutionOn: null, // or ISO timestamp
  rawData: { /* full execution object */ }
}
```

**Query Logic**:
1. Queries `flow_executions` table
2. Joins with `contacts` table for contact info
3. Filters by `flow_id` and `workspace_id`
4. Orders by `started_at` descending (newest first)
5. Applies optional filters
6. Transforms data for display

#### Helper Methods

**`getEnrollmentReason(source, metadata)`**
- Maps execution source to human-readable reason
- Examples:
  - `'manual'` → "Manual Trigger"
  - `'scheduled'` → "Scheduled Trigger"
  - `'webhook'` → "Webhook Trigger"
  - `metadata?.trigger?.source === 'contact_execution'` → "Manual Send (Contact Page)"

**`getCurrentAction(status, metadata)`**
- Determines what action is currently executing
- Checks metadata for step information
- Returns: "Completed", "Failed", "In Progress", "Waiting for Business Hours", "Pending"

**`getNextExecutionTime(status, metadata, nextExecutionAt)`**
- Calculates when execution will resume
- Checks `next_execution_at` column first
- Falls back to delay step information in metadata
- Returns ISO timestamp or null

**`formatStatus(status)`**
- Maps status codes to display objects
- Returns: `{ text: "Status Text", color: "colorScheme" }`

## Integration Points

### FlowBuilder Integration

**Location**: `frontend/src/components/flow-builder/FlowBuilder.js`

**State Management**:
```javascript
const [enrollmentHistory, setEnrollmentHistory] = useState([]);
const [isLoadingEnrollments, setIsLoadingEnrollments] = useState(false);
const [enrollmentFilters, setEnrollmentFilters] = useState({});
```

**Data Fetching**:
```javascript
useEffect(() => {
  const fetchEnrollmentHistory = async () => {
    if (activeTab === 2 && flow?.id && flow?.workspace_id) {
      setIsLoadingEnrollments(true);
      try {
        const data = await flowExecutionService.getEnrollmentHistory(
          flow.id,
          flow.workspace_id,
          enrollmentFilters
        );
        setEnrollmentHistory(data);
      } catch (error) {
        console.error('Error fetching enrollment history:', error);
      } finally {
        setIsLoadingEnrollments(false);
      }
    }
  };
  fetchEnrollmentHistory();
}, [activeTab, flow?.id, flow?.workspace_id, enrollmentFilters]);
```

**Rendering**:
```javascript
{activeTab === 2 && (
  <EnrollmentHistoryTab
    enrollmentHistory={enrollmentHistory}
    isLoading={isLoadingEnrollments}
    onViewExecution={handleViewExecution}
  />
)}
```

## Business Hours Integration

The Enrollment History feature integrates with business hours checking for TCPA compliance:

**Location**: `trigger/unifiedWorkflows.js`

**How it works**:
1. When sending SMS outside business hours, workflow pauses
2. Updates `flow_executions` table:
   - Sets `status` to `'waiting'`
   - Sets `next_execution_at` to next business hour
3. Enrollment History displays:
   - Status: "Waiting for Business Hours" (orange badge)
   - Next Execution On: Shows scheduled time

**Code Reference**:
```javascript
// Update flow_executions with next_execution_at for UI display
await supabaseAdmin
  .from('flow_executions')
  .update({
    next_execution_at: businessHoursCheck.nextBusinessHour,
    status: 'waiting'
  })
  .eq('id', execLogger.executionId);
```

## Data Transformation Examples

### Example 1: Completed Execution

**Database Record**:
```json
{
  "id": "exec-123",
  "flow_id": "flow-456",
  "contact_id": "contact-789",
  "status": "completed",
  "started_at": "2025-11-12T23:21:17Z",
  "completed_at": "2025-11-12T23:25:30Z",
  "source": "manual",
  "metadata": {
    "trigger": {
      "source": "contact_execution"
    }
  }
}
```

**Transformed Display Object**:
```javascript
{
  id: "exec-123",
  contact: {
    name: "Jon Rolon",
    email: "jrolon1978@gmail.com"
  },
  enrollmentReason: "Manual Send (Contact Page)",
  dateEnrolled: "2025-11-12T23:21:17Z",
  currentAction: "Completed",
  currentStatus: { text: "Completed", color: "green" },
  nextExecutionOn: null
}
```

### Example 2: Waiting for Business Hours

**Database Record**:
```json
{
  "id": "exec-124",
  "status": "waiting",
  "next_execution_at": "2025-11-13T08:00:00-05:00",
  "metadata": {
    "reason": "Before business hours"
  }
}
```

**Transformed Display Object**:
```javascript
{
  currentAction: "Waiting for Business Hours",
  currentStatus: { text: "Waiting for Business Hours", color: "orange" },
  nextExecutionOn: "2025-11-13T08:00:00-05:00"
}
```

## Current Limitations

1. **Filters Not Wired Up**: The filter UI (date range, event type, contact) is present but not functional
2. **No Real-time Updates**: Data only refreshes when tab is opened
3. **Limited Detail View**: "View" button exists but may not have full implementation
4. **Missing Column**: `next_execution_at` may need to be added to database schema

## Future Enhancements

Based on the codebase analysis, potential improvements:

1. **Wire Up Filters**: Implement date range, status, and contact filtering
2. **Real-time Updates**: Add Supabase Realtime subscriptions for live updates
3. **Enhanced Detail Modal**: Full execution timeline view
4. **Export Functionality**: CSV export of enrollment history
5. **Pagination**: Handle large datasets efficiently
6. **Search**: Contact name/email search functionality

## Testing Checklist

- [ ] Verify enrollment appears after triggering flow
- [ ] Check status updates correctly (running → completed)
- [ ] Test business hours waiting state
- [ ] Verify contact information displays correctly
- [ ] Check enrollment reason mapping
- [ ] Test empty state (no enrollments)
- [ ] Verify loading state
- [ ] Test "View" button functionality
- [ ] Check timezone display (CDT -05:00)
- [ ] Verify next execution time for delays

## Related Documentation

- `docs/TRIGGER_FLOW_BUILDER_INTEGRATION.md` - Full integration documentation
- `backend/migrations/flow_executions.sql` - Database schema
- `frontend/src/services/FlowExecutionService.js` - Service implementation
- `trigger/unifiedWorkflows.js` - Workflow execution engine

## Summary

The Enrollment History feature provides a comprehensive view of workflow executions, tracking contacts through their journey in a flow. It integrates with Trigger.dev workflows, business hours compliance, and provides real-time status updates. The architecture is clean with clear separation between UI, service, and data layers.
