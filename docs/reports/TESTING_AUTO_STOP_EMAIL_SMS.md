# Testing Guide: Auto-Stop on Response for Both Email and SMS

This guide explains how to test the auto-stop feature for both email and SMS messages in sequences and flows.

## Overview

The auto-stop feature ensures that when a contact responds to a message, all pending SMS and email messages are cancelled for both Sequences and Flows. Additionally, emails are blocked if the contact is marked as DNC or has opted out of email.

## Test Script

A comprehensive test script is available at `scripts/test-auto-stop-email-sms.js` that covers all test scenarios.

### Prerequisites

1. Set environment variables:
   ```bash
   export WORKSPACE_ID="your-workspace-id"
   export CONTACT_ID="your-contact-id"
   export CONTACT_EMAIL="test@example.com"
   export CONTACT_PHONE="+1234567890"
   export SUPABASE_SERVICE_KEY="your-service-key"
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install @supabase/supabase-js node-fetch
   ```

### Running the Test Script

```bash
node scripts/test-auto-stop-email-sms.js
```

## Manual Testing Scenarios

### Test 1: Sequence Email Job Tracking

**Objective:** Verify that email steps in sequences create `flow_sequence_message_jobs` records and store `livechat_message_id`.

**Steps:**
1. Create a sequence with an email step
2. Enroll a contact in the sequence
3. Wait for the workflow to process (5-10 seconds)
4. Check the database:
   ```sql
   SELECT * FROM flow_sequence_message_jobs 
   WHERE execution_id = '<execution-id>' 
   AND message_type = 'email';
   ```
5. Verify:
   - Job record exists with `message_type='email'`
   - `status` is 'pending' initially, then 'completed' after email is sent
   - `livechat_message_id` is populated after email is sent

**Expected Result:** Email job record is created and linked to the sent email message.

---

### Test 2: Sequence Auto-Stop on Response

**Objective:** Verify that when a contact replies, all pending SMS and email jobs are cancelled.

**Steps:**
1. Create a sequence with:
   - "Stop on response" toggle enabled (`auto_stop_on_reply: true`)
   - At least one SMS step
   - At least one email step
2. Enroll a contact in the sequence
3. Wait for message jobs to be created (5-10 seconds)
4. Send an inbound SMS from the contact (simulate reply)
5. Check the database:
   ```sql
   -- Check execution status
   SELECT status, stopped_by_response FROM flow_sequence_executions 
   WHERE id = '<execution-id>';
   
   -- Check job statuses
   SELECT message_type, status FROM flow_sequence_message_jobs 
   WHERE execution_id = '<execution-id>';
   ```

**Expected Result:**
- Execution status is 'cancelled'
- `stopped_by_response` is `true`
- All pending SMS and email jobs have status 'cancelled'

---

### Test 3: Flow Auto-Stop on Response

**Objective:** Verify that flows respect the `stopOnResponse` setting.

**Steps:**
1. Create a flow with:
   - "Stop workflow when contact responds" enabled in settings
   - At least one SMS step
   - At least one email step
2. Trigger the flow for a contact
3. Send an inbound SMS from the contact (simulate reply)
4. Check the database:
   ```sql
   SELECT status, metadata FROM flow_executions 
   WHERE id = '<execution-id>';
   ```

**Expected Result:**
- Flow execution status is 'stopped'
- `metadata.stopped_by_response` is `true`
- `metadata.stop_reason` is 'response'

---

### Test 4: Email DNC Check

**Objective:** Verify that emails are blocked when contact is marked as DNC.

**Steps:**
1. Mark a contact as DNC:
   ```sql
   UPDATE contacts 
   SET lead_status = 'DNC' 
   WHERE id = '<contact-id>';
   ```
2. Create a sequence or flow with an email step
3. Trigger the sequence/flow for the DNC contact
4. Wait for workflow to process (5-10 seconds)
5. Check:
   - No email was sent (check `livechat_messages` table)
   - Workflow execution is stopped
   - Stop reason is 'DNC'

**Expected Result:** Email is blocked, workflow stops with reason='DNC'.

---

### Test 5: Email Opt-Out Check

**Objective:** Verify that emails are blocked when contact has opted out.

**Steps:**
1. Set contact opt-out status:
   ```sql
   UPDATE contacts 
   SET opted_in_email = false 
   WHERE id = '<contact-id>';
   ```
2. Create a sequence or flow with an email step
3. Trigger the sequence/flow for the opted-out contact
4. Wait for workflow to process (5-10 seconds)
5. Check:
   - No email was sent
   - Workflow execution is stopped
   - Stop reason is 'EMAIL_OPT_OUT'

**Expected Result:** Email is blocked, workflow stops with reason='EMAIL_OPT_OUT'.

---

## Database Queries for Verification

### Check Sequence Execution Status
```sql
SELECT 
  id,
  status,
  stopped_by_response,
  response_message_id,
  completed_at
FROM flow_sequence_executions
WHERE id = '<execution-id>';
```

### Check Message Jobs
```sql
SELECT 
  id,
  message_type,
  status,
  scheduled_time,
  sent_at,
  livechat_message_id
FROM flow_sequence_message_jobs
WHERE execution_id = '<execution-id>'
ORDER BY scheduled_time;
```

### Check Flow Execution Status
```sql
SELECT 
  id,
  status,
  completed_at,
  metadata->>'stopped_by_response' as stopped_by_response,
  metadata->>'stop_reason' as stop_reason
FROM flow_executions
WHERE id = '<execution-id>';
```

### Check Sent Emails
```sql
SELECT 
  id,
  subject,
  body,
  msg_type,
  direction,
  status,
  created_at
FROM livechat_messages
WHERE contact_id = '<contact-id>'
  AND msg_type = 'EMAIL'
  AND direction = 'outbound'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Troubleshooting

### Email Job Not Created
- Check if sequence execution exists and is 'active'
- Verify the email message step exists in `flow_sequence_messages`
- Check Trigger.dev logs for workflow execution errors

### Auto-Stop Not Working
- Verify `auto_stop_on_reply` is `true` for sequences
- Verify `workflowSettings.stopOnResponse` is `true` in flow metadata
- Check that inbound message was saved to `livechat_messages`
- Verify `checkAndStopSequencesOnResponse` or `checkAndStopFlowsOnResponse` was called

### Email Not Blocked by DNC/Opt-Out
- Verify contact `lead_status = 'DNC'` or `opted_in_email = false`
- Check workflow execution logs for DNC check results
- Verify `sendEmailDirectly` is checking DNC status before sending

---

## Expected Behavior Summary

| Scenario | SMS Behavior | Email Behavior | Execution Status |
|----------|-------------|----------------|------------------|
| Contact responds (Sequence) | All pending SMS cancelled | All pending emails cancelled | 'cancelled' |
| Contact responds (Flow) | Workflow stops | Workflow stops | 'stopped' |
| Contact is DNC | SMS blocked, workflow stops | Email blocked, workflow stops | 'stopped' |
| Contact opted out (email) | SMS sent normally | Email blocked, workflow stops | 'stopped' |
| Contact opted out (SMS) | SMS blocked, workflow stops | Email sent normally | 'stopped' |

---

## Notes

- Email jobs are created **after** DNC/opt-out checks pass
- Both SMS and email jobs are cancelled when auto-stop triggers
- Flow auto-stop checks `metadata.workflowSettings.stopOnResponse`
- Sequence auto-stop checks `auto_stop_on_reply`, `settings.stopOnResponse`, or `auto_stop_rules.stopOnResponse`
- DNC and opt-out checks happen in `sendEmailDirectly()` before the email API is called

