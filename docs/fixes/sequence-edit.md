# Sequence Edit Fix

## Problem Description

When editing sequences that contained email messages, the sequence builder was not displaying the saved message data correctly. Users would create sequences with both SMS and email messages, save them successfully, but when reopening for editing, the sequence appeared to lose the saved messages.

## Root Cause

The issue was in the data transformation logic in the `handleEdit` function located in `frontend/src/components/flow-builder/sequences/index.js`. When retrieving sequence data from the database for editing, the function was not transforming the backend field names properly.

### Missing Fields

The transformation was missing two critical fields:
- `messageType`: Distinguishes between 'sms' and 'email' messages
- `subject`: Contains the email subject line for email messages

### Field Mapping Issues

The database stores fields in snake_case:
- `message_type` (database) → `messageType` (frontend)
- `subject` (database) → `subject` (frontend)
- `time_value` (database) → `timeValue` (frontend)
- `time_unit` (database) → `timeUnit` (frontend)

## Solution

Updated the `handleEdit` function to include the missing field transformations:

```javascript
// Before (missing fields)
messages: result.sequence.messages.map(msg => ({
  id: msg.id,
  text: msg.text,
  timeValue: msg.time_value,
  timeUnit: msg.time_unit.charAt(0).toUpperCase() + msg.time_unit.slice(1),
  subflow: msg.subflow_id,
  order: msg.order_index
}))

// After (complete transformation)
messages: result.sequence.messages.map(msg => ({
  id: msg.id,
  text: msg.text,
  timeValue: msg.time_value,
  timeUnit: msg.time_unit.charAt(0).toUpperCase() + msg.time_unit.slice(1),
  subflow: msg.subflow_id,
  order: msg.order_index,
  messageType: msg.message_type || 'sms',
  subject: msg.subject || ''
}))
```

## Files Changed

- `frontend/src/components/flow-builder/sequences/index.js` - Fixed `handleEdit` function
- `scripts/test-sequence-edit-fix.js` - Created test script to verify fix

## Testing

Created a comprehensive test script that:
1. Creates a sequence with mixed SMS and email messages
2. Retrieves the sequence (simulating edit mode)
3. Verifies all fields are properly transformed
4. Confirms email subjects are preserved
5. Validates SMS messages have proper defaults

### Running the Test

```bash
cd scripts
node test-sequence-edit-fix.js
```

## Verification Steps

To verify the fix works:

1. **Create a test sequence** with both SMS and email messages
2. **Save the sequence** - should work as before
3. **Edit the sequence** - messages should now display correctly
4. **Verify email subjects** are shown in the email message editor
5. **Verify message types** are properly distinguished (SMS vs Email)

## Impact

This fix resolves:
- ✅ Email messages not displaying when editing sequences
- ✅ Message types not being preserved during edit operations
- ✅ Email subjects being lost during the edit workflow
- ✅ Sequence builder appearing empty when it should show saved messages

## Future Considerations

- Consider implementing automated tests for data transformation functions
- Add validation to ensure all required fields are present before rendering
- Consider creating a centralized data transformation utility for consistency

## Dependencies

No additional dependencies required. This is a data transformation fix using existing functionality.

## Rollback Plan

If issues arise, the fix can be easily rolled back by removing the two added lines:
```javascript
messageType: msg.message_type || 'sms',
subject: msg.subject || ''
```

However, this would restore the original bug where email sequences couldn't be edited properly. 