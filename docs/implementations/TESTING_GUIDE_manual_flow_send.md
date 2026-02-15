# Testing Guide: Manual Flow Send Feature

## Overview
This guide helps you test the new "Send Flow" feature that allows manually triggering flows for specific contacts from the Contact Page.

---

## Prerequisites

### 1. Ensure Backend is Running
```bash
# Backend should be running on:
# - https://cc.automate8.com (production)
# - or your local backend URL
```

### 2. Ensure You Have Test Data

**Required:**
- ✅ At least one workspace
- ✅ At least one contact in the workspace
- ✅ At least one flow created in Flow Builder with nodes

**To Create a Test Flow:**
1. Go to Flow Builder
2. Create a new flow (e.g., "Test Welcome Flow")
3. Add at least one node (e.g., Send Message node)
4. Save the flow

---

## Test Scenarios

### Test 1: Single Contact - Send Flow

**Steps:**
1. Navigate to Contacts page
2. Find a contact in the list
3. Click the 3-dot menu (⋮) on the right side of the contact row
4. Click "Send Flow"
5. In the modal:
   - Verify the contact name appears in the badge
   - Select a flow from the dropdown
   - Verify the flow preview shows the flow name and step count
6. Click "Send Flow" button
7. Wait for success toast notification

**Expected Results:**
- ✅ Modal opens with contact name displayed
- ✅ Flows dropdown populates with available flows
- ✅ Flow preview shows selected flow details
- ✅ Success toast: "Flow sent successfully" appears
- ✅ Modal closes automatically

**Verify in Database:**
```sql
-- Check flow execution was created
SELECT 
  fe.id,
  fe.flow_id,
  fe.contact_id,
  fe.status,
  fe.source,
  fe.started_at,
  f.name as flow_name,
  c.firstname || ' ' || c.lastname as contact_name
FROM flow_executions fe
JOIN flows f ON fe.flow_id = f.id
JOIN contacts c ON fe.contact_id = c.id
WHERE fe.workspace_id = 'YOUR_WORKSPACE_ID'
ORDER BY fe.created_at DESC
LIMIT 5;
```

**Expected Database Result:**
- New record in `flow_executions` table
- `source` = 'trigger_workflow_task' or 'manual'
- `status` = 'pending' or 'running'
- `contact_id` matches the selected contact
- `flow_id` matches the selected flow

---

### Test 2: Multiple Contacts - Bulk Send Flow

**Steps:**
1. Navigate to Contacts page
2. Select multiple contacts using checkboxes (2-3 contacts)
3. Verify the bulk actions bar appears at the bottom
4. Click "Bulk Actions" dropdown
5. Click "Send Flow"
6. In the modal:
   - Verify all selected contact names appear (or "+X more")
   - Select a flow from the dropdown
   - Verify the preview shows "This flow will be executed for X contacts"
7. Click "Send Flow" button
8. Watch the progress indicator
9. Wait for success toast

**Expected Results:**
- ✅ Modal shows all selected contacts
- ✅ Progress bar shows: "Sending 1/3", "Sending 2/3", etc.
- ✅ Success toast: "Flow sent to X contacts"
- ✅ Modal closes after completion

**Verify in Database:**
```sql
-- Check multiple flow executions were created
SELECT 
  fe.id,
  fe.contact_id,
  c.firstname || ' ' || c.lastname as contact_name,
  fe.status,
  fe.created_at
FROM flow_executions fe
JOIN contacts c ON fe.contact_id = c.id
WHERE fe.flow_id = 'YOUR_FLOW_ID'
  AND fe.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY fe.created_at DESC;
```

**Expected Database Result:**
- Multiple new records in `flow_executions` table
- One record per selected contact
- All have the same `flow_id`
- All created within seconds of each other

---

### Test 3: No Flows Available

**Steps:**
1. Create a new workspace with no flows
2. Add a contact to the workspace
3. Try to send a flow to the contact
4. Open the Send Flow modal

**Expected Results:**
- ✅ Modal opens
- ✅ Info alert: "No flows available. Create a flow in the Flow Builder first."
- ✅ Send Flow button is disabled
- ✅ No errors in console

---

### Test 4: Flow Execution in Flow Builder

**Steps:**
1. Send a flow to a contact (Test 1 or Test 2)
2. Navigate to Flow Builder
3. Open the flow you just sent
4. Click on "Enrollment History" tab
5. Look for the contact you sent the flow to

**Expected Results:**
- ✅ Contact appears in enrollment history
- ✅ Shows enrollment date/time
- ✅ Shows current status (Running, Completed, etc.)
- ✅ Shows which node they're currently on (if still running)

---

### Test 5: Error Handling - Invalid Contact

**Steps:**
1. Open browser console (F12)
2. Send a flow to a contact
3. Watch the console for any errors

**Expected Results:**
- ✅ No JavaScript errors in console
- ✅ If backend returns error, shows error toast
- ✅ Modal remains open on error (doesn't close)
- ✅ Error message is user-friendly

---

### Test 6: Cancel Flow Send

**Steps:**
1. Open Send Flow modal
2. Select a flow
3. Click "Cancel" button

**Expected Results:**
- ✅ Modal closes
- ✅ No flow is sent
- ✅ No API calls made (check Network tab)
- ✅ No database records created

---

### Test 7: Modal UI/UX

**Steps:**
1. Open Send Flow modal
2. Test the following:
   - Click outside modal (should NOT close)
   - Press ESC key (should close)
   - Click X button (should close)
   - Try to close while sending (should be disabled)

**Expected Results:**
- ✅ Modal behaves correctly for all interactions
- ✅ Loading states show during API calls
- ✅ Buttons are disabled appropriately
- ✅ Progress bar animates smoothly

---

## Performance Testing

### Test 8: Bulk Send Performance

**Steps:**
1. Select 10+ contacts
2. Send a flow to all of them
3. Monitor:
   - Time to complete
   - Browser responsiveness
   - Memory usage

**Expected Results:**
- ✅ UI remains responsive during bulk send
- ✅ Progress bar updates smoothly
- ✅ No browser freezing or crashes
- ✅ Completes within reasonable time (< 30 seconds for 10 contacts)

---

## Integration Testing

### Test 9: Trigger.dev Integration

**Steps:**
1. Send a flow to a contact
2. Check Trigger.dev dashboard
3. Look for the workflow execution

**Expected Results:**
- ✅ Workflow task appears in Trigger.dev
- ✅ Task ID matches the one returned by API
- ✅ Workflow executes successfully
- ✅ All nodes in the flow execute in order

**Trigger.dev Dashboard:**
- URL: https://cloud.trigger.dev
- Look for task: `trigger-workflow`
- Check execution logs

---

### Test 10: Real Flow Execution

**Steps:**
1. Create a flow with a Send Message node
2. Configure the message (e.g., "Hello {{contact.firstname}}!")
3. Send the flow to a test contact
4. Check if the contact receives the message

**Expected Results:**
- ✅ Contact receives the SMS message
- ✅ Message variables are replaced correctly
- ✅ Message appears in conversation history
- ✅ Flow execution status updates to "completed"

---

## Edge Cases

### Test 11: Empty Flow (No Nodes)

**Steps:**
1. Create a flow with no nodes
2. Try to send it to a contact

**Expected Results:**
- ✅ Flow should not appear in the dropdown (filtered out)
- OR
- ✅ Shows warning: "This flow has no steps"

---

### Test 12: Contact Without Phone Number

**Steps:**
1. Create a contact without a phone number
2. Send a flow with SMS node to this contact

**Expected Results:**
- ✅ Flow sends successfully (backend handles validation)
- ✅ SMS node fails gracefully
- ✅ Flow execution status shows error for SMS step
- ✅ Other nodes continue executing

---

### Test 13: Rapid Clicks

**Steps:**
1. Open Send Flow modal
2. Rapidly click "Send Flow" button multiple times

**Expected Results:**
- ✅ Button disables after first click
- ✅ Only one API call is made
- ✅ No duplicate flow executions created
- ✅ Loading state prevents multiple submissions

---

## Browser Compatibility

### Test 14: Cross-Browser Testing

**Browsers to Test:**
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

**Expected Results:**
- ✅ Modal displays correctly in all browsers
- ✅ Dropdown works in all browsers
- ✅ Progress bar animates in all browsers
- ✅ No console errors in any browser

---

## Accessibility Testing

### Test 15: Keyboard Navigation

**Steps:**
1. Open Send Flow modal
2. Use only keyboard:
   - Tab through elements
   - Select flow with arrow keys
   - Press Enter to send
   - Press ESC to close

**Expected Results:**
- ✅ All elements are keyboard accessible
- ✅ Focus indicators are visible
- ✅ Tab order is logical
- ✅ ESC closes modal

---

### Test 16: Screen Reader

**Steps:**
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Navigate through the modal
3. Listen to announcements

**Expected Results:**
- ✅ Modal title is announced
- ✅ Form labels are read correctly
- ✅ Button states are announced (disabled, loading)
- ✅ Success/error messages are announced

---

## Troubleshooting

### Issue: Modal doesn't open
**Check:**
- Console for JavaScript errors
- Verify `SendFlowModal` is imported correctly
- Verify state management (`isSendFlowModalOpen`)

### Issue: No flows in dropdown
**Check:**
- Flows exist in the workspace (check database)
- Flows have nodes (empty flows are filtered out)
- Workspace ID is correct

### Issue: API call fails
**Check:**
- Backend URL is correct (`REACT_APP_BACKEND_URL`)
- Backend is running
- CORS is configured correctly
- Network tab for error details

### Issue: Flow doesn't execute
**Check:**
- Trigger.dev is configured
- Workflow task is registered
- Flow definition is valid
- Contact exists in workspace

---

## Success Criteria

✅ **All tests pass**
✅ **No console errors**
✅ **Database records created correctly**
✅ **Trigger.dev workflows execute**
✅ **UI is responsive and user-friendly**
✅ **Error handling works correctly**
✅ **Performance is acceptable**

---

## Reporting Issues

If you find any issues, please report with:
1. **Test scenario** (which test failed)
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Screenshots** (if applicable)
5. **Console errors** (if any)
6. **Browser and OS**

---

**Document Created**: 2025-01-17
**Last Updated**: 2025-01-17
**Status**: Ready for Testing

