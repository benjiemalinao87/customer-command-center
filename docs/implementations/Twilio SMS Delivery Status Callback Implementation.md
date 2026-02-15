# Twilio SMS Delivery Status Callback Implementation

## Status: ✅ COMPLETED (January 20, 2026)

**Deployed:**
- Git commit: `9555f73e`
- Trigger.dev: Version `20260120.1` (45 tasks)
- Changelog: Entry #1529

---

## Problem Statement

Previously, outbound SMS messages were saved with `status: 'sent'` immediately after Twilio accepted them, but the actual delivery status (`delivered`, `failed`, `undelivered`) was never received because:

1. No status callback endpoint existed to receive Twilio's delivery reports
2. No index existed on `twilio_sid` for fast lookups when updating status

**Historical status distribution (before fix):**
- `sent`: 211,578 (99.98% - most were actually unknown delivery status)
- `delivered`: 5,171 (only from inbound messages)
- `pending`: 3

---

## Implementation Summary

### Database Changes

**Index Created:** `idx_livechat_messages_twilio_sid`
- Created on parent table `livechat_messages`
- Auto-propagated to all 21 partitions (2025-04 through 2026-12)
- Partial index: `WHERE twilio_sid IS NOT NULL`

```sql
CREATE INDEX IF NOT EXISTS idx_livechat_messages_twilio_sid
ON livechat_messages (twilio_sid)
WHERE twilio_sid IS NOT NULL;
```

### Backend Changes

#### 1. Status Callback Endpoint
**File:** `backend/src/routes/twilio.js` (lines 926-1030)

New endpoint: `POST /:workspaceId/status`
- Receives Twilio delivery status callbacks
- Validates Twilio signature using workspace's `auth_token`
- Finds message by `twilio_sid` (fast lookup via new index)
- Updates message status in `livechat_messages` table
- Stores error codes in `metadata` field for failed messages
- Emits Socket.IO `message:status` event for real-time UI updates

#### 2. statusCallback URL Added to All SMS Senders

| File | Location |
|------|----------|
| `backend/src/routes/sms.js` | Line 208 |
| `backend/index.js` | Lines ~1064, ~2683, ~3032, ~3299 |
| `backend/src/workers/messageProcessor.js` | Line 160 |
| `backend/src/workers/smsWorker.js` | Line 207 |
| `backend/src/routes/preview.js` | Line 91 |
| `backend/messageJobs.js` | Line 94 |
| `trigger/messageJobs.js` | Line 97 |
| `trigger/unifiedWorkflows.js` | Line 5882 |

All use the same URL format:
```javascript
statusCallback: `https://cc.automate8.com/twilio/${workspaceId}/status`
```

### Frontend Changes

**File:** `frontend/src/components/settings/IntegrationsDashboard.js` (lines 1168-1182)

Added SMS Status Callback URL display in the webhook configuration section:
```jsx
<Box>
  <FormLabel fontWeight="medium" mb={2}>SMS Status Callback URL</FormLabel>
  <InputGroup>
    <InputLeftAddon>https://</InputLeftAddon>
    <Input
      value={`cc.automate8.com/twilio/${currentWorkspace?.id}/status`}
      isReadOnly
      bg="gray.50"
    />
  </InputGroup>
  <Text fontSize="xs" color="gray.500" mt={1}>
    Receives delivery status updates (delivered, failed, undelivered)
  </Text>
</Box>
```

---

## How It Works

```
1. User sends SMS via LiveChat/Workflow/API
   ↓
2. Backend includes statusCallback URL in Twilio API call
   ↓
3. Twilio sends message and returns SID
   ↓
4. Message saved to livechat_messages with status: 'sent'
   ↓
5. Twilio sends status updates to callback URL:
   - queued → sent → delivered (success)
   - queued → sent → failed/undelivered (failure)
   ↓
6. Callback endpoint:
   - Validates Twilio signature
   - Finds message by twilio_sid (indexed)
   - Updates status in database
   - Emits Socket.IO event
   ↓
7. Frontend receives real-time status update via Socket.IO
```

---

## Twilio Status Values

| Status | Meaning |
|--------|---------|
| `queued` | Message is queued to be sent |
| `sent` | Message has been sent to carrier |
| `delivered` | Carrier confirmed delivery |
| `failed` | Message could not be sent |
| `undelivered` | Carrier could not deliver (wrong number, blocked, etc.) |

---

## Socket.IO Event

The `message:status` event is emitted to the workspace room:

```javascript
io.to(`workspace:${workspaceId}`).emit('message:status', {
  messageSid: MessageSid,
  messageId: message.id,
  status: MessageStatus.toLowerCase(),
  contactId: message.contact_id,
  errorCode: ErrorCode || null,
  errorMessage: ErrorMessage || null
});
```

---

## Verification

### Check Index Exists
```sql
SELECT indexname, tablename FROM pg_indexes
WHERE indexdef LIKE '%twilio_sid%'
ORDER BY tablename;
```

### Check Recent Message Statuses
```sql
SELECT id, twilio_sid, status, created_at
FROM livechat_messages
WHERE workspace_id = '67621'
AND direction = 'outbound'
ORDER BY created_at DESC
LIMIT 10;
```

### Test Status Callback Manually
```bash
curl -X POST https://cc.automate8.com/twilio/67621/status \
  -d "MessageSid=SMtest123&MessageStatus=delivered"
```
Note: This will fail signature validation but confirms the endpoint is reachable.

---

## Notes

- The status callback URL is publicly accessible at `cc.automate8.com`
- Twilio signature validation prevents spoofed status updates
- Error codes are stored in the `metadata` JSONB field for debugging
- Only **new messages** sent after this deployment will receive status updates
- Existing messages with `status: 'sent'` will not be retroactively updated
