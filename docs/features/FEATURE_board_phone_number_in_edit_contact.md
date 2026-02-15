# Board/Twilio Phone Number in Edit Contact Modal

## Overview
Added the ability to select and update the Board/Twilio phone number when editing an existing contact, matching the functionality already available when creating a new contact.

## Problem Statement
Previously, the "Board/Twilio Phone Number" field was only available in the "Add New Contact" modal (`AddContactModal.js`), but not in the "Edit Contact" modal (`ContactForm.js`). This created an inconsistency where users could set the board phone number when creating a contact, but couldn't update it later when editing the contact.

This field is critical for SMS workflows in the Flow Builder, as it determines which Twilio phone number will be used to send messages to the contact.

## Solution

### Files Modified
- `/frontend/src/components/board/components/ContactForm.js`

### Changes Made

#### 1. Added State Variables
```javascript
const [twilioPhoneOptions, setTwilioPhoneOptions] = useState([]);
const [isLoadingPhones, setIsLoadingPhones] = useState(true);
```

#### 2. Added Twilio Phone to Form Data
```javascript
const [formData, setFormData] = useState({
  name: '',
  phone_number: '',
  email: '',
  notes: '',
  tags: '',
  firstname: '',
  lastname: '',
  twilio_phone: '', // Board/Twilio phone number
});
```

#### 3. Fetch Twilio Phone Numbers
Added a `useEffect` hook to fetch available Twilio phone numbers from boards in the workspace:

```javascript
useEffect(() => {
  const fetchTwilioPhones = async () => {
    if (!currentWorkspace?.id) return;
    
    setIsLoadingPhones(true);
    try {
      // Fetch boards with phone numbers for this workspace
      const { data: boards, error } = await supabase
        .from('boards')
        .select('id, name, phone_number')
        .eq('workspace_id', currentWorkspace.id)
        .not('phone_number', 'is', null)
        .order('name', { ascending: true });
        
      if (error) throw error;
      
      // Format options for dropdown
      const phoneOptions = boards?.map(board => ({
        value: board.phone_number,
        label: `${board.name} - ${board.phone_number}`,
        boardId: board.id,
        boardName: board.name
      })) || [];
      
      setTwilioPhoneOptions(phoneOptions);
    } catch (error) {
      console.error('Error fetching Twilio phones:', error);
    } finally {
      setIsLoadingPhones(false);
    }
  };

  if (currentWorkspace?.id) {
    fetchTwilioPhones();
  }
}, [currentWorkspace?.id]);
```

#### 4. Load Existing Board Phone Number
Updated the initial data loading to extract the board phone number from contact metadata:

```javascript
// Extract board phone number from metadata
const boardPhoneNumber = initialData.metadata?.board_phone_number || '';

setFormData({
  // ... other fields
  twilio_phone: boardPhoneNumber,
});
```

#### 5. Save Board Phone Number in Metadata
Updated both create and update operations to save the board phone number in the contact's metadata:

**For Editing:**
```javascript
// Prepare metadata with board phone number
const metadata = {
  ...(initialData.metadata || {}),
  board_phone_number: formData.twilio_phone || null
};

// Update contact with metadata
await supabase
  .from('contacts')
  .update({
    // ... other fields
    metadata: metadata,
  })
  .eq('id', initialData.id);
```

**For Creating:**
```javascript
// Prepare metadata with board phone number
const metadata = {
  board_phone_number: formData.twilio_phone || null
};

// Insert contact with metadata
await supabase
  .from('contacts')
  .insert({
    // ... other fields
    metadata: metadata,
  });
```

#### 6. Added UI Field
Added a dropdown select field in the form UI:

```javascript
<FormControl>
  <FormLabel>Board/Twilio Phone Number</FormLabel>
  <Select
    name="twilio_phone"
    value={formData.twilio_phone}
    onChange={handleChange}
    placeholder={isLoadingPhones ? "Loading phone numbers..." : "Select Twilio phone"}
    isDisabled={isLoadingPhones}
  >
    {twilioPhoneOptions.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Select>
</FormControl>
```

## Data Storage

### Database Schema
The board phone number is stored in the `contacts` table's `metadata` JSONB column:

```json
{
  "board_phone_number": "+16266353026",
  "webhook": { ... },
  "unmapped_fields": { ... }
}
```

### Why Metadata?
- **Flexibility**: The `metadata` column is a JSONB field that can store arbitrary key-value pairs
- **No Schema Changes**: Doesn't require altering the database schema
- **Backward Compatibility**: Existing contacts without this field continue to work
- **Extensibility**: Easy to add more metadata fields in the future

## Usage

### For Users

1. **Edit an Existing Contact**:
   - Open contact details
   - Click "Edit" button
   - Select a Board/Twilio phone number from the dropdown
   - Click "Update"

2. **Create a New Contact**:
   - Click "Add Contact"
   - Fill in contact details
   - Select a Board/Twilio phone number from the dropdown
   - Click "Create"

### For Developers

To access the board phone number in code:

```javascript
// Read from contact
const boardPhoneNumber = contact.metadata?.board_phone_number;

// Update contact metadata
const updatedMetadata = {
  ...contact.metadata,
  board_phone_number: '+16266353026'
};

await supabase
  .from('contacts')
  .update({ metadata: updatedMetadata })
  .eq('id', contactId);
```

## Integration with Flow Builder

The board phone number is used by the Flow Builder's SMS node to determine which Twilio number to use when sending messages:

1. **Flow Execution**: When a flow is triggered for a contact
2. **SMS Node**: The send-message node checks for `contact.metadata.board_phone_number`
3. **Twilio API**: Uses this number as the "from" number when sending SMS
4. **Fallback**: If not set, the flow will fail with "No board phone number configured"

## Benefits

1. **Consistency**: Edit and Create modals now have the same fields
2. **User Experience**: Users can update board phone numbers without recreating contacts
3. **Flow Reliability**: Ensures SMS flows have the correct sending number configured
4. **Flexibility**: Users can change which Twilio number is associated with a contact

## Testing

### Manual Test Steps

1. **Test Editing Existing Contact**:
   - Open a contact that doesn't have a board phone number
   - Click "Edit"
   - Verify the dropdown shows available Twilio numbers
   - Select a phone number
   - Click "Update"
   - Verify the contact was updated successfully
   - Re-open the contact and verify the phone number is saved

2. **Test Flow Execution**:
   - Edit a contact and set a board phone number
   - Create a flow with an SMS node
   - Send the flow to the contact
   - Verify the SMS is sent successfully without "No board phone number" error

3. **Test Creating New Contact**:
   - Create a new contact with a board phone number selected
   - Verify it saves correctly
   - Edit the contact and verify the phone number is shown

### Expected Behavior

- ✅ Dropdown loads available Twilio numbers from boards
- ✅ Existing board phone number is pre-selected when editing
- ✅ Board phone number is saved in `metadata.board_phone_number`
- ✅ SMS flows use the correct board phone number
- ✅ No errors when board phone number is not set (optional field)

## Related Files

- `/frontend/src/components/board/components/ContactForm.js` - Edit Contact modal
- `/frontend/src/components/contactV2/AddContactModal.js` - Add Contact modal (reference)
- `/backend/trigger/workflows/trigger-workflow.js` - Flow execution logic
- `/docs/IMPLEMENTATION_manual_flow_send.md` - Flow sending documentation

## Future Enhancements

1. **Default Phone Number**: Set a workspace-level default Twilio number
2. **Phone Number Validation**: Validate that the selected phone number is still active
3. **Multiple Phone Numbers**: Allow contacts to have multiple board phone numbers
4. **Phone Number History**: Track which phone numbers were used for each contact
5. **Auto-Assignment**: Automatically assign board phone number based on contact source

---

**Created**: November 17, 2025  
**Author**: AI Assistant  
**Status**: ✅ Implemented and Ready for Testing

