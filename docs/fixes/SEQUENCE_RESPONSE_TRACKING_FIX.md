# Sequence Response & Message Tracking Fix

## Problem
The Message Performance analytics in Sequence/Campaign Analytics was showing:
1. **Messages Sent: 0** - Not tracking actual message sends
2. **Response Rate: 0%** - Can't calculate without sent count
3. **Responses all at step 0** - Not tracking which message step triggered the response

## Phase 1: Response Tracking Fix (Completed)
Fixed the database trigger to properly track which step a contact responded to.

## Phase 2: Message Job Creation Fix (This Update)

## Root Cause Analysis

### 1. Messages Sent Not Tracked
The `fetchMessagePerformance()` in `AnalyticsService.js` was hardcoded:
```javascript
messagesSent: 0, // Would need message sending logs to populate this
```

But the data exists in `flow_sequence_message_jobs` table:
- `status: 'completed'` indicates successfully sent
- `sent_at` timestamp records when sent
- `message_id` links to the message definition

### 2. Response Step Not Tracked
The database trigger `handle_enhanced_campaign_response()` was using:
```sql
COALESCE(execution_record.stopped_at_step, 0)
```

But `stopped_at_step` was never populated, resulting in all responses being recorded with `step_number = 0`.

## Solution

### 1. Updated AnalyticsService.fetchMessagePerformance()
Now properly queries `flow_sequence_message_jobs` to get:
- **Messages Sent**: Count of completed jobs
- **Messages Pending**: Count of pending jobs  
- **Messages Failed**: Count of failed jobs
- **Response Rate**: Calculated as `(responses / messagesSent) * 100`

### 2. Fixed Database Trigger
Updated `handle_enhanced_campaign_response()` to:
1. Look up the last completed message job for the execution
2. Get the `order_index` from `flow_sequence_messages`
3. Use `order_index + 1` as the step number

```sql
SELECT COALESCE(MAX(fsm.order_index) + 1, 0) INTO last_sent_step
FROM flow_sequence_message_jobs fsmj
JOIN flow_sequence_messages fsm ON fsmj.message_id = fsm.id
WHERE fsmj.execution_id = execution_record.id
  AND fsmj.status = 'completed'
  AND fsmj.sent_at IS NOT NULL;
```

### 3. Backfilled Existing Data
Migration updated all existing `campaign_responses` with `step_number = 0` to their correct step numbers.

## Updated UI
The Message Performance table now shows:
- **Step**: Message number with type badge (SMS/Email)
- **Sent**: Count of successfully sent messages (with failed count badge)
- **Pending**: Count of messages scheduled but not yet sent
- **Responses**: Count of responses received
- **Response Rate**: Percentage with color coding
- **Performance**: Visual progress bar

## Data Flow

```
1. Contact enrolled in sequence
   └── flow_sequence_executions created (status: 'active')

2. Message scheduled
   └── flow_sequence_message_jobs created (status: 'pending')

3. Message sent (Trigger.dev task completes)
   └── flow_sequence_message_jobs updated (status: 'completed', sent_at: timestamp)

4. Contact responds (inbound SMS/Email)
   └── livechat_messages INSERT
   └── trigger_campaign_response fires
   └── campaign_responses INSERT with:
       - step_number = last sent message's order_index + 1
       - auto_stop_triggered = true (if auto-stop enabled)
   └── flow_sequence_executions updated (status: 'stopped')
```

## Phase 2: Message Job Creation in Unified Workflows

### Problem
Even though sequences were running via Trigger.dev workflows, `flow_sequence_message_jobs` records were never created. This meant:
- Analytics couldn't track "Messages Sent" because no job records existed
- Response tracking worked but had no sent count to calculate response rate

### Root Cause
When sequences are enrolled:
1. `flow_sequence_executions` record is created ✅
2. Unified workflow runs in Trigger.dev ✅
3. SMS waits for business hours (TCPA) ✅
4. SMS is sent via Twilio ✅
5. **NO `flow_sequence_message_jobs` record created** ❌

### Solution

#### 1. Pass Sequence Context to Workflow
Updated `sequenceService.js` to pass `sequenceExecutionId` and `sequenceId` in the workflow payload:
```javascript
// In payload to trigger-workflow
sequenceExecutionId: execution.id,
sequenceId: sequenceId,
triggerData: {
  sequence_execution_id: execution.id
}
```

#### 2. Extract Sequence Context in Workflow
Updated `unifiedWorkflows.js` to extract and propagate sequence IDs:
```javascript
const sequenceExecutionId = actualPayload.input?.sequenceExecutionId;
const sequenceId = actualPayload.input?.sequenceId;
const isSequenceWorkflow = triggerData?.source === 'sequence' || !!sequenceExecutionId;
```

#### 3. Create Message Job Records
Added code in `sendSMSDirectly()` to create `flow_sequence_message_jobs` records:
- Creates record with status 'pending' before sending
- Updates to 'completed' with sent_at after successful send
- Updates to 'failed' if send fails

#### 4. Pass Message ID to Workflow
Updated `convertSequenceToWorkflow()` to include `messageId` (the `flow_sequence_messages.id`) in node data for tracking.

## Files Modified (Phase 2)
- `backend/src/services/sequenceService.js`
  - Added sequenceExecutionId to workflow payload
  - Added messageId to send-message nodes
- `trigger/unifiedWorkflows.js`
  - Extract sequence context from payload
  - Pass to executeWorkflowStep context
  - Create flow_sequence_message_jobs in sendSMSDirectly()
  - Update job status on success/failure

## Complete Data Flow (After Fix)

```
1. Contact enrolled in sequence (via webhook/manual)
   └── flow_sequence_executions created (status: 'active')
   └── Workflow triggered with sequenceExecutionId

2. Workflow executes send-message step
   └── flow_sequence_message_jobs created (status: 'pending')
   └── Business hours check (TCPA compliance)
   └── wait.until() if outside hours

3. SMS sent via Twilio
   └── flow_sequence_message_jobs updated (status: 'completed', sent_at: timestamp)
   └── livechat_messages created

4. Contact responds (inbound SMS/Email)
   └── livechat_messages INSERT
   └── trigger_campaign_response fires
   └── campaign_responses INSERT with correct step_number
   └── flow_sequence_executions updated (status: 'stopped')
```

## Testing
1. **Enroll a contact in a sequence** (via webhook or manual)
2. **Check Trigger.dev dashboard** - should see workflow executing
3. **Wait for message to be sent** (respects business hours)
4. **Check Analytics dashboard**:
   - Messages Sent should show actual count
   - Pending should show scheduled messages
   - Response Rate should be calculated correctly
5. **Reply to the sequence**
   - Response should appear at correct step

## Metrics Now Available
- **Messages Sent**: From `flow_sequence_message_jobs` WHERE status = 'completed'
- **Messages Pending**: From `flow_sequence_message_jobs` WHERE status = 'pending'
- **Messages Failed**: From `flow_sequence_message_jobs` WHERE status = 'failed'
- **Responses by Step**: From `campaign_responses` GROUP BY step_number
- **Response Rate**: (responses / sent) * 100
