# Sequence Message Performance Filter Fix

## Problem

The "Message Performance" dashboard was showing ALL sequence steps (messages, connectors, and flow triggers) as "messages", when it should only display actual message steps (SMS and Email).

**Issue**: The dashboard showed "13 MESSAGES ANALYZED" but the sequence contained:
- Message steps (SMS/Email)
- Connector steps
- Flow Trigger steps

All were being counted and displayed as "messages".

## Root Cause

The `fetchMessagePerformance()` method in `AnalyticsService.js` was querying the `flow_sequence_messages` table without filtering by `step_type`. Since sequences now support multiple step types:
- `step_type = 'message'` (SMS/Email)
- `step_type = 'connector'` (API connectors)
- `step_type = 'flow'` (Flow triggers)

The query was returning all step types instead of just messages.

## Solution

### 1. Filter Query by Step Type

Updated `fetchMessagePerformance()` to only fetch rows where `step_type = 'message'`:

```javascript
// Before
const { data: messages, error } = await this.supabase
  .from('flow_sequence_messages')
  .select('*')
  .eq('sequence_id', campaignId)
  .order('order_index', { ascending: true });

// After
const { data: messages, error } = await this.supabase
  .from('flow_sequence_messages')
  .select('*')
  .eq('sequence_id', campaignId)
  .eq('step_type', 'message')  // ✅ Only get message steps
  .order('order_index', { ascending: true });
```

### 2. Preserve Step Number Mapping

When filtering to only messages, we need to:
- Display as "Message 1", "Message 2", etc. (based on filtered position)
- Map responses correctly using the original `order_index` to match with `campaign_responses.step_number`

```javascript
const performance = messages.map((message, index) => {
  // Display number (1, 2, 3... for messages only)
  const stepNumber = index + 1;
  
  // Original sequence step number (for matching responses)
  const sequenceStepNumber = message.order_index + 1;
  const responsesForStep = responsesByStep[sequenceStepNumber] || 0;

  return {
    stepNumber,              // "Message 1", "Message 2"
    sequenceStepNumber,      // Original position in sequence
    messageType: message.message_type || 'sms',
    messagesSent: 0,
    responses: responsesForStep,
    responseRate: 0
  };
});
```

### 3. Enhanced UI Display

Updated the UI to show message type (SMS/Email) with appropriate icons:

```javascript
{step.messageType === 'email' ? (
  <Mail size={14} color="purple" />
) : (
  <MessageSquare size={14} color="blue" />
)}
<Text fontWeight="medium">
  Message {step.stepNumber}
  {step.messageType && (
    <Badge ml={2} size="sm" colorScheme={step.messageType === 'email' ? 'purple' : 'blue'}>
      {step.messageType.toUpperCase()}
    </Badge>
  )}
</Text>
```

## Files Changed

1. **`frontend/src/components/flow-builder/sequences/services/AnalyticsService.js`**
   - Added `.eq('step_type', 'message')` filter to query
   - Added `messageType` and `sequenceStepNumber` to performance data
   - Updated response mapping logic

2. **`frontend/src/components/flow-builder/sequences/enhanced/CampaignAnalyticsDashboard.js`**
   - Added `Mail` icon import
   - Updated message display to show type (SMS/Email) with badges
   - Added conditional icon rendering based on message type

## Result

✅ **Before**: Dashboard showed all 13 steps (messages + connectors + flows) as "messages"

✅ **After**: Dashboard now shows only actual message steps (e.g., if sequence has 8 messages, 3 connectors, 2 flows → shows "8 messages analyzed")

## Testing

1. **Create a sequence** with mixed step types:
   - Add 5 SMS messages
   - Add 2 Email messages
   - Add 3 Connector steps
   - Add 2 Flow Trigger steps

2. **View Analytics Dashboard**:
   - Should show "7 messages analyzed" (not 12)
   - Should only display the 7 message steps
   - Each message should show SMS or Email badge

3. **Verify Response Mapping**:
   - Responses should still map correctly to the right message step
   - Step numbers should be sequential (Message 1, Message 2, etc.)

## Related Documentation

- `docs/ENROLLMENT_HISTORY_STUDY.md` - Enrollment history feature
- `.cursor/plans/sequence_connector_integration_a479b8da.plan.md` - Sequence step types
