# Auto-Stop Feature Analysis Report

**Date:** December 15, 2025  
**Engine:** `trigger/unifiedWorkflows.js`  
**Scope:** Flow and Sequence auto-stop functionality

---

## Executive Summary

This report analyzes how auto-stop is currently implemented for both **Flows** and **Sequences** based on two user stories:
1. **User Response** - Stop all future messaging (email and SMS) when user responds
2. **DNC Status** - Stop all future messaging (email and SMS) when user is marked DNC

---

## User Story 1: Stop on User Response

### Current Implementation Status

#### ✅ **Sequences - FULLY IMPLEMENTED**

**Location:** `backend/src/services/autoStopService.js` → `checkAndStopSequencesOnResponse()`

**How it works:**
1. **Trigger Point:** When an inbound SMS message arrives via Twilio webhook
   - File: `backend/src/routes/twilio.js` (line 684-691)
   - Calls `checkAndStopSequencesOnResponse()` after saving message

2. **Detection Logic:**
   ```javascript
   // Checks three possible flags for backward compatibility:
   - settings.stopOnResponse === true
   - auto_stop_rules.stopOnResponse === true  
   - auto_stop_on_reply === true
   ```

3. **Stop Process:**
   - Finds all active sequence executions for the contact
   - Cancels all pending `flow_sequence_message_jobs` (status: 'pending' or 'scheduled')
   - Cancels associated `scheduled_sms_jobs` if they exist
   - Updates execution status to 'cancelled'
   - Sets `stopped_by_response = true` and stores `response_message_id`

4. **What Gets Stopped:**
   - ✅ All future SMS messages in the sequence
   - ✅ All future email messages in the sequence (via job cancellation)
   - ✅ All pending delay steps

**Code Reference:**
- `backend/src/services/autoStopService.js:117-210`
- `backend/src/routes/twilio.js:684-691`

---

#### ❌ **Flows - NOT IMPLEMENTED**

**Current State:**
- `stopOnResponse` setting exists in flow settings (`trigger/unifiedWorkflows.js:471`)
- Setting is stored in `workflowSettings.stopOnResponse`
- **BUT:** No code checks this setting when inbound messages arrive
- **BUT:** No service similar to `checkAndStopSequencesOnResponse()` exists for flows

**Missing Implementation:**
- No response detection hook for flows
- No cancellation of pending flow execution steps
- Flow executions continue even if user responds

**Code Reference:**
- `trigger/unifiedWorkflows.js:471` - Setting exists but unused
- `frontend/src/components/flow-builder/tabs/FlowSettingsTab.js:268-285` - UI exists

---

### Email Response Detection

#### ❌ **NOT IMPLEMENTED FOR EITHER FLOWS OR SEQUENCES**

**Current State:**
- Only SMS responses trigger auto-stop
- Email replies are not detected
- No webhook handler for email responses (SendGrid/Resend)
- No database trigger for email responses

**Impact:**
- If user replies via email, sequences/flows continue sending
- User story requirement: "when user response - stop all future messaging INCLUDING email and SMS" is **NOT MET**

---

## User Story 2: Stop on DNC Status

### Current Implementation Status

#### ✅ **Sequences - FULLY IMPLEMENTED**

**Location:** `trigger/unifiedWorkflows.js` → `sendSMSDirectly()` and delay steps

**How it works:**

1. **DNC Check Before SMS Send:**
   - File: `trigger/unifiedWorkflows.js:4068-4177`
   - Checks `contact.lead_status === 'DNC'` before sending SMS
   - Returns `shouldStopWorkflow: true` if DNC detected

2. **DNC Check After Delays:**
   - File: `trigger/unifiedWorkflows.js:3207-3706`
   - Re-checks DNC status after delay steps complete
   - Multiple delay types checked: `duration`, `until_time`, `smart_delay`
   - Returns `shouldStopWorkflow: true` if DNC detected

3. **Workflow Stop Logic:**
   - File: `trigger/unifiedWorkflows.js:607-653`
   - Checks `stepResult?.shouldStopWorkflow` after each step
   - Updates `flow_executions.status = 'stopped'`
   - Stops execution immediately, preventing future steps

4. **What Gets Stopped:**
   - ✅ All future SMS messages
   - ✅ All future email messages (workflow stops, so no more steps execute)
   - ✅ All pending delay steps

**Code Reference:**
- `trigger/unifiedWorkflows.js:4143-4177` - SMS DNC check
- `trigger/unifiedWorkflows.js:3675-3706` - Delay DNC check
- `trigger/unifiedWorkflows.js:607-653` - Workflow stop handler

---

#### ✅ **Flows - FULLY IMPLEMENTED**

**Same Implementation as Sequences:**
- Uses the same `sendSMSDirectly()` function
- Uses the same delay step DNC checks
- Uses the same workflow stop logic
- Both sequences and flows are executed via `triggerWorkflowTask`

**Code Reference:**
- Same as sequences above

---

### Email DNC Check

#### ❌ **NOT IMPLEMENTED**

**Current State:**
- File: `trigger/unifiedWorkflows.js:4662-4752` → `sendEmailDirectly()`
- **NO DNC check before sending email**
- **NO email opt-out check before sending**
- Email is sent regardless of DNC status or opt-out status

**Impact:**
- DNC contacts still receive emails
- Email opt-out status is ignored
- User story requirement: "when DNC - stop all future messaging INCLUDING email and SMS" is **PARTIALLY MET** (SMS stops, but email doesn't)

**Code Reference:**
- `trigger/unifiedWorkflows.js:4662-4752` - No DNC/opt-out checks

---

## Detailed Code Flow Analysis

### Sequence Auto-Stop on Response

```
Inbound SMS → Twilio Webhook
    ↓
backend/src/routes/twilio.js:570
    ↓
Save to livechat_messages
    ↓
checkAndStopSequencesOnResponse(contactId, workspaceId, messageId)
    ↓
Query active flow_sequence_executions WHERE status='active'
    ↓
For each execution:
    - Check stopOnResponse flag (3 possible locations)
    - If enabled → stopSequenceExecution()
        ↓
        Cancel all pending flow_sequence_message_jobs
        Cancel all scheduled_sms_jobs
        Update execution status = 'cancelled'
```

### Sequence/Flow Auto-Stop on DNC

```
Workflow Step Execution
    ↓
sendSMSDirectly() OR delay step
    ↓
Check contact.lead_status === 'DNC'
    ↓
If DNC → Return { shouldStopWorkflow: true }
    ↓
triggerWorkflowTask checks stepResult?.shouldStopWorkflow
    ↓
Update flow_executions.status = 'stopped'
    ↓
Exit workflow loop (no more steps execute)
```

---

## Gap Analysis

### Critical Gaps

1. **❌ Flow Response Auto-Stop Missing**
   - Setting exists but not enforced
   - Need: `checkAndStopFlowsOnResponse()` service
   - Need: Hook in Twilio webhook handler

2. **❌ Email Response Detection Missing**
   - No email webhook handler
   - No email response detection logic
   - Need: Email provider webhook integration (SendGrid/Resend)

3. **❌ Email DNC/Opt-Out Check Missing**
   - `sendEmailDirectly()` doesn't check DNC
   - `sendEmailDirectly()` doesn't check `opted_in_email`
   - Need: Add DNC/opt-out checks before email send

### Medium Priority Gaps

4. **⚠️ Email Job Cancellation**
   - Sequences cancel SMS jobs but email jobs may not be tracked
   - Need: Verify email jobs are properly cancelled when sequence stops

5. **⚠️ Flow Execution Cancellation**
   - When flow stops, pending Trigger.dev tasks may continue
   - Need: Verify all pending workflow steps are cancelled

---

## Recommendations

### Priority 1: Email DNC/Opt-Out Check

**Action:** Add DNC and email opt-out checks to `sendEmailDirectly()`

**Location:** `trigger/unifiedWorkflows.js:4662`

**Implementation:**
```javascript
// Before sending email, check:
1. contact.lead_status !== 'DNC'
2. contact.opted_in_email === true

// If either fails, return:
{
  success: false,
  blocked: true,
  shouldStopWorkflow: true,
  reason: 'DNC' or 'EMAIL_OPT_OUT'
}
```

### Priority 2: Flow Response Auto-Stop

**Action:** Implement `checkAndStopFlowsOnResponse()` service

**Files to Create/Modify:**
- `backend/src/services/autoStopService.js` - Add new function
- `backend/src/routes/twilio.js` - Call function after SMS save
- Query `flow_executions` WHERE `status='running'` AND `stopOnResponse=true`

### Priority 3: Email Response Detection

**Action:** Add email webhook handler and response detection

**Implementation:**
- Add webhook endpoint for SendGrid/Resend email replies
- Call `checkAndStopSequencesOnResponse()` and `checkAndStopFlowsOnResponse()`
- Store email replies in `livechat_messages` with `direction='inbound'`

---

## Summary Table

| Feature | Sequences | Flows | Email Support |
|---------|-----------|-------|---------------|
| **Stop on SMS Response** | ✅ Implemented | ❌ Missing | N/A |
| **Stop on Email Response** | ❌ Missing | ❌ Missing | ❌ Not Detected |
| **Stop on DNC (SMS)** | ✅ Implemented | ✅ Implemented | N/A |
| **Stop on DNC (Email)** | ❌ Missing | ❌ Missing | ❌ Not Checked |
| **Stop on Email Opt-Out** | ❌ Missing | ❌ Missing | ❌ Not Checked |

---

## Conclusion

**Current State:**
- ✅ SMS DNC auto-stop works for both Sequences and Flows
- ✅ SMS response auto-stop works for Sequences only
- ❌ Email auto-stop is completely missing (both DNC and response)
- ❌ Flow response auto-stop is missing

**User Story Compliance:**
- **User Story 1 (Response):** ❌ **NOT MET** - Email responses not detected, Flows don't stop
- **User Story 2 (DNC):** ⚠️ **PARTIALLY MET** - SMS stops, but emails still sent to DNC contacts

**Next Steps:**
1. Add email DNC/opt-out checks to `sendEmailDirectly()`
2. Implement flow response auto-stop
3. Add email response detection via webhook

