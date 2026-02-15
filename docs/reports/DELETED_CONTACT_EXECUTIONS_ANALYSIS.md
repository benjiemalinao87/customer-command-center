# Deleted Contact Future Executions Analysis

## Problem Statement

When a contact is deleted from the database, what happens to future executions (scheduled messages, sequence executions, workflow runs) that are still pending?

## Current State Analysis

### 1. Foreign Key Constraints

**Tables with `NO ACTION` constraints (prevent deletion):**
- `scheduled_sms_jobs.contact_id` → `contacts.id` (NO ACTION)
- `scheduled_messages.contact_id` → `contacts.id` (NO ACTION)

**Tables without foreign key constraints (orphaned records possible):**
- `flow_sequence_executions` - No FK constraint found
- `flow_sequence_message_jobs` - No FK constraint found

### 2. Current Delete Behavior

**`backend/src/services/contactActionService.js` (`deleteContact`):**
- Deletes: `contact_activities`, `contact_tags`, `campaign_subscriptions`, `conversations`
- **DOES NOT** clean up:
  - `flow_sequence_executions` (active sequence executions)
  - `scheduled_messages` (scheduled SMS/email)
  - `scheduled_sms_jobs` (scheduled SMS jobs)
  - `flow_sequence_message_jobs` (sequence message jobs)

**`trigger/actionTasks.js` (`actionDeleteContactTask`):**
- Hard delete: Removes `contact_tags`, `contact_variables`, `livechat_messages`, `contacts`
- Soft delete: Sets `deleted_at` timestamp
- **DOES NOT** clean up sequence executions or scheduled messages

### 3. What Happens to Future Executions

#### Scenario A: Hard Delete (Contact Record Removed)

1. **Foreign Key Constraint Blocks Deletion:**
   - If `scheduled_messages` or `scheduled_sms_jobs` exist, deletion will **FAIL** with foreign key constraint error
   - Contact cannot be deleted until these are cleaned up first

2. **If Deletion Succeeds (after manual cleanup):**
   - `flow_sequence_executions` remain in database with invalid `contact_id`
   - When workers try to process:
     - `smsWorker.js`: Throws `Error("Contact not found: ...")`
     - `messageProcessor.js`: Throws `Error("Contact not found: ...")`
   - Scheduled messages get marked as `status: 'failed'`
   - Sequence executions remain `status: 'active'` but cannot complete

3. **Trigger.dev Workflows:**
   - When workflow tries to fetch contact: `Error("Contact not found")`
   - Workflow execution fails
   - Execution status marked as `'failed'`

#### Scenario B: Soft Delete (deleted_at set)

1. **Contact Still Exists:**
   - Contact record remains but marked as deleted
   - Foreign key constraints don't block

2. **Future Executions:**
   - Workers can still fetch contact (record exists)
   - **BUT**: Should we be sending to deleted contacts?
   - No filtering for `deleted_at IS NULL` in worker queries

3. **Workflows:**
   - Can still access contact data
   - No check for `deleted_at` status

## Issues Identified

### Critical Issues

1. **No Cleanup on Contact Deletion:**
   - Sequence executions remain "active" but cannot complete
   - Scheduled messages remain "scheduled" but will fail
   - Orphaned records in database

2. **Foreign Key Constraint Prevents Deletion:**
   - Cannot delete contact if scheduled messages exist
   - Must manually clean up first

3. **No Soft Delete Filtering:**
   - Workers don't check `deleted_at IS NULL`
   - Messages can still be sent to soft-deleted contacts

4. **Error Handling:**
   - Workers throw errors but don't clean up orphaned executions
   - Failed executions remain in database indefinitely

### Data Integrity Issues

1. **Orphaned Sequence Executions:**
   - `flow_sequence_executions` with invalid `contact_id`
   - Status remains "active" but cannot progress

2. **Failed Scheduled Messages:**
   - `scheduled_messages` with invalid `contact_id`
   - Status marked "failed" but never cleaned up

3. **Trigger.dev Runs:**
   - Workflow runs that fail due to missing contact
   - No automatic cancellation of pending runs

## Recommended Solutions

### Solution 1: Cleanup on Contact Deletion (IMMEDIATE)

**Add cleanup logic to `deleteContact` function:**

```javascript
// Before deleting contact, cancel/cleanup all future executions:

// 1. Cancel all active sequence executions
await supabase
  .from('flow_sequence_executions')
  .update({
    status: 'cancelled',
    completed_at: new Date().toISOString(),
    stopped_reason: 'contact_deleted'
  })
  .eq('contact_id', contactId)
  .eq('workspace_id', workspaceId)
  .eq('status', 'active');

// 2. Cancel all scheduled messages
await supabase
  .from('scheduled_messages')
  .update({
    status: 'cancelled',
    updated_at: new Date().toISOString(),
    metadata: { reason: 'contact_deleted' }
  })
  .eq('contact_id', contactId)
  .eq('workspace_id', workspaceId)
  .in('status', ['scheduled', 'pending']);

// 3. Cancel scheduled SMS jobs
await supabase
  .from('scheduled_sms_jobs')
  .update({
    status: 'cancelled',
    updated_at: new Date().toISOString()
  })
  .eq('contact_id', contactId)
  .eq('workspace_id', workspaceId)
  .in('status', ['scheduled', 'pending']);

// 4. Cancel sequence message jobs
await supabase
  .from('flow_sequence_message_jobs')
  .update({
    status: 'cancelled',
    updated_at: new Date().toISOString()
  })
  .eq('contact_id', contactId)
  .in('status', ['pending', 'scheduled']);
```

### Solution 2: Add Soft Delete Filtering (RECOMMENDED)

**Update workers to check for deleted contacts:**

```javascript
// In smsWorker.js and messageProcessor.js:
const { data: contact, error: contactError } = await supabase
  .from('contacts')
  .select('phone_number, lead_status, opted_in_sms')
  .eq('id', contactId)
  .is('deleted_at', null) // Only get non-deleted contacts
  .single();

if (contactError || !contact) {
  // Mark scheduled message as cancelled
  if (scheduledMessageId) {
    await supabase
      .from('scheduled_messages')
      .update({
        status: 'cancelled',
        reason: 'contact_deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', scheduledMessageId);
  }
  throw new Error('Contact not found or has been deleted');
}
```

### Solution 3: Database-Level Cleanup (OPTIONAL)

**Add database triggers or change foreign key constraints:**

```sql
-- Option A: CASCADE delete (not recommended - loses execution history)
ALTER TABLE scheduled_messages
  DROP CONSTRAINT scheduled_messages_contact_id_fkey,
  ADD CONSTRAINT scheduled_messages_contact_id_fkey
    FOREIGN KEY (contact_id)
    REFERENCES contacts(id)
    ON DELETE CASCADE;

-- Option B: SET NULL (better - preserves history)
ALTER TABLE scheduled_messages
  DROP CONSTRAINT scheduled_messages_contact_id_fkey,
  ADD CONSTRAINT scheduled_messages_contact_id_fkey
    FOREIGN KEY (contact_id)
    REFERENCES contacts(id)
    ON DELETE SET NULL;
```

### Solution 4: Trigger.dev Run Cancellation (FUTURE)

**Cancel pending Trigger.dev runs when contact is deleted:**
- Use Trigger.dev SDK `runs.cancel()` to cancel pending workflow runs
- Requires tracking run IDs in database

## Implementation Priority

1. **HIGH**: Add cleanup logic to `deleteContact` function
2. **HIGH**: Add soft delete filtering to workers
3. **MEDIUM**: Update Trigger.dev workflows to handle deleted contacts gracefully
4. **LOW**: Database-level cascade/SET NULL (requires migration)

## Testing Checklist

- [ ] Delete contact with active sequence execution → execution cancelled
- [ ] Delete contact with scheduled messages → messages cancelled
- [ ] Delete contact with pending Trigger.dev run → run fails gracefully
- [ ] Soft delete contact → workers skip deleted contacts
- [ ] Hard delete contact → foreign key constraints handled
- [ ] Verify no orphaned records remain after cleanup
