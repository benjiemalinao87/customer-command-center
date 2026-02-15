# DNC Status Investigation Report
**Date:** January 2025  
**Issue:** Leads with DNC status are still receiving SMS messages  
**Status:** 🔴 **CRITICAL - DNC CHECKS MISSING IN ALL SMS SENDING PATHS**

---

## Executive Summary

**Root Cause:** None of the SMS sending endpoints or functions check for DNC (Do Not Call) status or `opted_in_sms` flag before sending messages. This affects all three sending mechanisms:
1. Manual agent texting via LiveChat UI (v1 and v2)
2. Flow Builder SMS action nodes
3. Sequence automation

**Impact:** Leads marked as DNC continue to receive promotional and automated messages, violating TCPA compliance and user opt-out requests.

---

## DNC Status Storage

The DNC status is properly stored in the `contacts` table with the following fields:
- `lead_status = 'DNC'` - Main DNC indicator
- `opted_in_sms = false` - SMS opt-out flag
- `opted_in_email = false` - Email opt-out flag
- `conversation_status = 'Closed'` - Conversation closed status

**Location:** `trigger/unifiedWorkflows.js` - `markLeadStatusDNCDirectly()` function (lines 5827-5887)

---

## Investigation Results by Sending Path

### 1. Manual SMS Sending (LiveChat UI v1 & v2) ❌ NO DNC CHECK

#### Endpoint: `backend/src/routes/sms.js` - `/send-sms`
- **File:** `backend/src/routes/sms.js` (lines 84-246)
- **Status:** ❌ **NO DNC CHECK**
- **Flow:**
  1. Validates required fields (to, workspaceId, contactId)
  2. Fetches Twilio config
  3. Processes merge fields
  4. **SENDS MESSAGE IMMEDIATELY** - No contact lookup for DNC status

#### Endpoint: `backend/index.js` - `/send-sms`
- **File:** `backend/index.js` (lines 1618-1911)
- **Status:** ❌ **NO DNC CHECK**
- **Flow:**
  1. Validates required fields
  2. Fetches Twilio config
  3. Gets contact metadata (only for board phone number)
  4. **SENDS MESSAGE IMMEDIATELY** - No DNC status check

#### Frontend Components:
- `frontend/src/services/livechatService.js` - `sendLivechatMessage()` (line 519)
- `frontend/src/components/livechat2/compose/ComposeModal.js` - `sendTextMessage()` (line 259)
- `frontend/src/services/messageStore.js` - `sendMessage()` (line 833)
- `frontend/src/components/livechat2/ChatArea.js` - `handleSendMessage()` (line 406)

**Frontend Status:** ❌ **NO CLIENT-SIDE DNC CHECK** - All components send directly to backend without validation

---

### 2. Flow Builder SMS Action Node ❌ NO DNC CHECK

#### Function: `sendSMSDirectly()`
- **File:** `trigger/unifiedWorkflows.js` (lines 3429-3952)
- **Status:** ❌ **NO DNC CHECK**
- **Flow:**
  1. Fetches Twilio config
  2. Gets contact (only for board phone number and timezone)
  3. Checks business hours (TCPA compliance for timing, not DNC)
  4. **SENDS MESSAGE IMMEDIATELY** - No DNC status check

#### Called From:
- `trigger/unifiedWorkflows.js` - `executeWorkflowStep()` (line 3315)
- Node type: `'send-message'` (line 3223)

**Note:** The function does fetch the contact record but only uses it for:
- `metadata.board_phone_number` - Phone number selection
- `metadata.timezone` - Timezone for business hours

It does NOT check:
- `lead_status`
- `opted_in_sms`
- `opted_in_email`

---

### 3. Sequence Automation ❌ NO DNC CHECK

#### Function: `applySequenceToContact()`
- **File:** `backend/src/services/sequenceService.js` (lines 1091-1345)
- **Status:** ❌ **NO DNC CHECK**
- **Flow:**
  1. Gets sequence and messages
  2. Checks re-enrollment rules
  3. Gets contact (validates phone/email presence only)
  4. Converts sequence to workflow
  5. Triggers unified workflow execution
  6. **NO DNC CHECK BEFORE ENROLLMENT**

#### Sequence Execution:
- Sequences are converted to workflows and use the same `sendSMSDirectly()` function
- Therefore, they inherit the same DNC check issue

**Note:** The contact is fetched (line 1145) but only used to validate:
- Phone number exists (for SMS messages)
- Email exists (for email messages)

It does NOT check:
- `lead_status`
- `opted_in_sms`
- `opted_in_email`

---

### 4. Other SMS Workers ❌ NO DNC CHECK

#### Worker: `backend/src/workers/smsWorker.js`
- **Function:** `sendSMS()` (lines 109-232)
- **Status:** ❌ **NO DNC CHECK**
- Only fetches contact to get phone number

#### Worker: `backend/src/workers/messageProcessor.js`
- **Function:** `sendSMS()` (lines 66-189)
- **Status:** ❌ **NO DNC CHECK**
- Only fetches contact to get phone number

---

## Code Locations Requiring DNC Checks

### Critical Files to Update:

1. **`backend/src/routes/sms.js`** (line 84)
   - Add DNC check after line 102 (after input validation)
   - Before fetching Twilio config

2. **`backend/index.js`** (line 1618)
   - Add DNC check after line 1654 (after extracting contactId)
   - Before fetching Twilio config

3. **`trigger/unifiedWorkflows.js`** - `sendSMSDirectly()` (line 3429)
   - Add DNC check after line 3528 (after fetching contact)
   - Before business hours check

4. **`backend/src/services/sequenceService.js`** - `applySequenceToContact()` (line 1091)
   - Add DNC check after line 1156 (after fetching contact)
   - Before sequence enrollment

5. **`backend/src/workers/smsWorker.js`** - `sendSMS()` (line 109)
   - Add DNC check after line 131 (after fetching contact)

6. **`backend/src/workers/messageProcessor.js`** - `sendSMS()` (line 66)
   - Add DNC check after line 88 (after fetching contact)

---

## Recommended DNC Check Implementation

### Check Logic:
```javascript
// Check if contact is DNC or opted out
const { data: contact, error: contactError } = await supabase
  .from('contacts')
  .select('lead_status, opted_in_sms, opted_in_email')
  .eq('id', contactId)
  .eq('workspace_id', workspaceId)
  .single();

if (contactError || !contact) {
  throw new Error('Contact not found');
}

// Check DNC status
if (contact.lead_status === 'DNC') {
  return res.status(403).json({
    success: false,
    error: 'Contact is marked as DNC (Do Not Call)',
    blocked: true,
    reason: 'DNC'
  });
}

// Check SMS opt-out
if (contact.opted_in_sms === false) {
  return res.status(403).json({
    success: false,
    error: 'Contact has opted out of SMS',
    blocked: true,
    reason: 'SMS_OPT_OUT'
  });
}
```

### For Flow Builder and Sequences:
- Should log the block to execution timeline
- Should NOT throw error (to avoid breaking workflow)
- Should return early with success: false and reason

---

## Additional Considerations

### 1. Frontend UI Prevention
- Add client-side DNC check before allowing send
- Disable send button for DNC contacts
- Show warning message: "This contact is marked as DNC"

### 2. Sequence Enrollment Prevention
- Check DNC status before enrolling contact
- Return clear error message
- Log to sequence execution

### 3. Flow Builder Prevention
- Check DNC status before executing send-message node
- Log to execution timeline
- Continue workflow but skip message

### 4. Audit Trail
- Log all blocked attempts
- Track which sending path was blocked
- Include timestamp and reason

---

## Testing Checklist

After implementing fixes, test:

- [ ] Manual SMS from LiveChat v1 - DNC contact blocked
- [ ] Manual SMS from LiveChat v2 - DNC contact blocked
- [ ] Flow Builder SMS action - DNC contact blocked
- [ ] Sequence enrollment - DNC contact blocked
- [ ] Sequence message sending - DNC contact blocked
- [ ] Opted-out SMS (`opted_in_sms = false`) - blocked
- [ ] Non-DNC contact - messages sent successfully
- [ ] Error messages are clear and actionable
- [ ] Frontend UI shows DNC status correctly
- [ ] Execution logs show DNC blocks

---

## Priority

**🔴 CRITICAL** - This is a compliance issue that could result in:
- TCPA violations
- Legal liability
- User trust issues
- Regulatory fines

**Recommended Fix Timeline:** Immediate

---

## Files Summary

| File | Function/Endpoint | Status | Priority |
|------|------------------|--------|----------|
| `backend/src/routes/sms.js` | `/send-sms` | ❌ No check | HIGH |
| `backend/index.js` | `/send-sms` | ❌ No check | HIGH |
| `trigger/unifiedWorkflows.js` | `sendSMSDirectly()` | ❌ No check | HIGH |
| `backend/src/services/sequenceService.js` | `applySequenceToContact()` | ❌ No check | HIGH |
| `backend/src/workers/smsWorker.js` | `sendSMS()` | ❌ No check | MEDIUM |
| `backend/src/workers/messageProcessor.js` | `sendSMS()` | ❌ No check | MEDIUM |
| Frontend components | All send functions | ❌ No check | MEDIUM (UX) |

---

## Next Steps

1. ✅ **Investigation Complete** - This report
2. ⏳ **Implementation** - Add DNC checks to all identified locations
3. ⏳ **Frontend Updates** - Add UI prevention for DNC contacts
4. ⏳ **Testing** - Comprehensive testing of all sending paths
5. ⏳ **Documentation** - Update API docs with DNC error responses
6. ⏳ **Monitoring** - Add logging for blocked attempts

---

**Report Generated:** January 2025  
**Investigator:** AI Assistant  
**Status:** Ready for Implementation
