# Workspace Custom Fields in Template Variables

## Overview
Workspace custom fields can now be used as template variables in emails, SMS, and Live Chat messages. These global values (like `{{domain}}`, `{{appointment_booking}}`) are shared across all contacts in a workspace.

## Feature Summary

### What Works Now ✅
1. **Flow Builder Emails/SMS** - Workspace fields like `{{domain}}` replaced via Trigger.dev workflow
2. **Live Chat Messages** - Workspace fields replaced in real-time before sending
3. **Variable Picker UI** - Shows workspace fields in green "WORKSPACE FIELDS (GLOBAL)" section
4. **Priority System** - Contact-specific fields override workspace globals if same name exists

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VARIABLE REPLACEMENT                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Priority Order (highest to lowest):                         │
│  1. Default Contact Fields ({{firstname}}, {{email}})        │
│  2. Contact Custom Fields ({{campaign_name}})                │
│  3. Workspace Custom Fields ({{domain}})                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### Backend (Trigger.dev Workflows)

**Location**: `trigger/unifiedWorkflows.js`

**Function**: `replaceTemplateVariables()`

```javascript
// Fetches BOTH contact and workspace custom fields
const [contactFieldsResult, workspaceFieldsResult] = await Promise.all([
  // Contact custom fields
  supabaseAdmin.rpc('get_contact_custom_fields_json', {
    p_contact_id: contactId,
    p_workspace_id: workspaceId
  }),
  // Workspace custom fields (global values)
  supabaseAdmin
    .from('workspace_custom_fields')
    .select(`
      value,
      field:custom_fields!inner(name, field_type)
    `)
    .eq('workspace_id', workspaceId)
]);

// Merge with priority: contact fields override workspace fields
const allCustomFields = {
  ...workspaceFieldValues,  // Workspace fields first (lower priority)
  ...contactFieldValues      // Contact fields second (higher priority)
};
```

**When Used**:
- Email node in Flow Builder
- SMS node in Flow Builder
- Any workflow action that processes template variables

### Frontend (Live Chat)

**Location**: `frontend/src/utils/variableReplacement.js`

**Function**: `replaceTemplateVariables()`

Similar logic to backend but runs in browser before sending message.

**Integration**: `frontend/src/services/messageStore.js`

```javascript
// Detect template variables
if (content && content.includes('{{')) {
  // Fetch full contact object
  const { data: fullContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  
  // Replace variables
  processedContent = await replaceTemplateVariables(
    content, 
    fullContact, 
    contact.workspace_id
  );
}

// Send processed content
const requestBody = {
  message: processedContent || '',
  // ...
};
```

**When Used**:
- Live Chat message input
- Manual SMS sending
- Any direct message from Live Chat UI

### Variable Picker UI

**Components**:
- `frontend/src/components/common/VariablePickerButton.js` - Reusable button
- `frontend/src/components/flow-builder/drawers/EmailConfigSidebar.js` - Flow Builder
- `frontend/src/components/flow-builder/drawers/SMSConfigDrawer.js` - Flow Builder
- `frontend/src/components/livechat/ChatArea.js` - Live Chat 1
- `frontend/src/components/livechat2/ChatArea/MessageInput/MessageInput.js` - Live Chat 2

**Fetching Logic**:
```javascript
// Fetch both contact and workspace fields in parallel
const [contactResponse, workspaceResponse] = await Promise.all([
  fetch(`${backendUrl}/api/custom-fields?workspace_id=${workspaceId}&object_type=contact`),
  fetch(`${backendUrl}/api/custom-fields?workspace_id=${workspaceId}&object_type=workspace`)
]);

// Categorize for UI display
const templateVariables = [
  ...defaultVariables.map(v => ({ ...v, category: 'default' })),
  ...customFields.map(field => ({
    name: field.name,
    description: field.label,
    category: field.object_type === 'workspace' ? 'workspace' : 'custom'
  }))
];
```

## Database Schema

### Custom Fields Definition
```sql
-- Table: custom_fields
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  object_type TEXT NOT NULL, -- 'contact', 'workspace', 'appointment'
  name TEXT NOT NULL,         -- Field name (snake_case)
  label TEXT NOT NULL,        -- Display name
  field_type TEXT NOT NULL,   -- 'text', 'number', 'boolean', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(workspace_id, name, object_type)
);
```

### Workspace Field Values
```sql
-- Table: workspace_custom_fields
CREATE TABLE workspace_custom_fields (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  field_id UUID REFERENCES custom_fields(id),
  value JSONB,              -- Global value for all contacts
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(workspace_id, field_id)
);
```

### Contact Field Values
```sql
-- Table: contact_custom_fields
CREATE TABLE contact_custom_fields (
  id UUID PRIMARY KEY,
  contact_id UUID REFERENCES contacts(id),
  field_id UUID REFERENCES custom_fields(id),
  value JSONB,              -- Contact-specific value
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(contact_id, field_id)
);
```

## Use Cases

### 1. Global Booking Link
```
Field Setup:
- Object Type: Workspace
- Field Name: scheduler_link
- Value: https://calendly.com/your-company

Usage in Email:
"Book your appointment: {{scheduler_link}}"

Result:
"Book your appointment: https://calendly.com/your-company"
```

### 2. Company Domain
```
Field Setup:
- Object Type: Workspace
- Field Name: domain
- Value: example.com

Usage in SMS:
"Visit our site: {{domain}}"

Result:
"Visit our site: example.com"
```

### 3. Contact-Specific Campaign with Fallback
```
Field Setup:
- Workspace Field: default_campaign = "General Promo"
- Contact Field (John): campaign_name = "VIP Offer"
- Contact Field (Jane): campaign_name = (not set)

Usage:
"Hi {{firstname}}, check out {{campaign_name}}"

Results:
- John: "Hi John, check out VIP Offer"
- Jane: "Hi Jane, check out General Promo" (falls back to workspace default)
```

## Testing

### Test Workspace Field in Flow Builder
1. Go to Settings > Custom Objects
2. Create workspace field "domain" with value "testcompany.com"
3. Create Flow Builder email with subject: "About {{domain}}"
4. Trigger flow for a contact
5. Check email - should show "About testcompany.com"

### Test Workspace Field in Live Chat
1. Open Live Chat with a contact
2. Click Variable picker button ({}x icon)
3. Verify "WORKSPACE FIELDS (GLOBAL)" section appears
4. Type: "Visit {{domain}}"
5. Send message
6. Verify sent message shows "Visit testcompany.com"

### Test Priority System
1. Create workspace field "company" = "Acme Corp"
2. Create contact field "company" = "Beta Inc" for specific contact
3. Send message: "Welcome to {{company}}"
4. Contact with custom field sees: "Welcome to Beta Inc"
5. Contact without custom field sees: "Welcome to Acme Corp"

## Troubleshooting

### Variables Not Replacing

**Check 1**: Verify field exists in Settings > Custom Objects
**Check 2**: Verify field has a value set (for workspace fields)
**Check 3**: Check browser console for errors
**Check 4**: Verify workspace_id matches

### Wrong Value Showing

**Issue**: Contact field overriding workspace field unexpectedly
**Solution**: Check if contact has a custom field with same name
**Fix**: Either rename one field or delete contact's custom value

### Variable Picker Not Showing Workspace Fields

**Issue**: Only seeing contact fields
**Solution**: 
1. Hard refresh browser (Cmd+Shift+R)
2. Check if workspace fields exist in Settings
3. Verify API endpoint: `/api/custom-fields?workspace_id=X&object_type=workspace`

## Performance Considerations

1. **Caching**: Custom field definitions are fetched on-demand
2. **Parallel Fetching**: Contact and workspace fields fetched simultaneously via `Promise.all`
3. **Lazy Loading**: Variables only processed if `{{` detected in message
4. **RPC Optimization**: Uses `get_contact_custom_fields_json` RPC for efficient contact field retrieval

## Future Enhancements

- [ ] Cache workspace field values in localStorage
- [ ] Add variable preview tooltip on hover
- [ ] Support nested variables: `{{contact.{{field_name}}}}`
- [ ] Add variable validation in UI before sending
- [ ] Bulk variable replacement in broadcast messages
- [ ] Variable usage analytics

## Related Documentation

- [Custom Objects & Fields System](./FEATURE_custom_objects_and_fields.md)
- [Flow Builder Integration](./TRIGGER_FLOW_BUILDER_INTEGRATION.md)
- [Email/SMS Dynamic Variables](./FEATURE_email_sms_dynamic_variables.md)

