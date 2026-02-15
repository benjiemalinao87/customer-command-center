# Custom Field Dynamic Assignment - Complete Guide

## Overview

Custom fields can be dynamically assigned values through two main methods:
1. **Webhook UI** - Map incoming webhook data to custom fields
2. **Flow Builder** - Set custom field values using the "Set Variable" action node

Both methods automatically persist custom field values to the database for long-term storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Custom Field Assignment Flow                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Webhook    │         │Flow Builder  │         │              │
│   Payload    │────────▶│  Set Var     │────────▶│   Database   │
│              │         │   Action     │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       ▼                        ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│Field Mapping │         │ Detect if    │         │contact_custom│
│   Service    │         │Custom Field  │         │   _fields    │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       ▼                        ▼                         ▼
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│Extract Values│         │Save to Table │         │  Persisted   │
│from Payload  │         │if Custom     │         │   Values     │
└──────────────┘         └──────────────┘         └──────────────┘
```

## Database Schema

### Tables Involved

1. **`custom_fields`** - Field definitions
   - `id` (UUID) - Primary key
   - `workspace_id` (UUID) - Workspace reference
   - `name` (VARCHAR) - Field name (snake_case)
   - `label` (VARCHAR) - Display label
   - `field_type` (VARCHAR) - Type: text, number, date, datetime, boolean, select, multi_select
   - `object_type` (VARCHAR) - Object type: contact, appointment, workspace
   - `is_active` (BOOLEAN) - Soft delete flag

2. **`contact_custom_fields`** - Contact field values
   - `id` (UUID) - Primary key
   - `contact_id` (UUID) - Contact reference
   - `field_id` (UUID) - Custom field definition reference
   - `value` (JSONB) - Field value (flexible type)
   - `created_at` (TIMESTAMPTZ)
   - `updated_at` (TIMESTAMPTZ)

3. **`appointment_custom_fields`** - Appointment field values (similar structure)

4. **`workspace_custom_fields`** - Workspace field values (global, one value per workspace)

## Method 1: Webhook UI Assignment

### How It Works

1. **Create Custom Field**
   - Navigate to Settings → Custom Objects
   - Create a new Contact field (e.g., `loyalty_points`)

2. **Configure Webhook Mapping**
   - Go to Webhooks panel
   - Select your webhook
   - In Field Mappings section, map incoming JSON path to your custom field
   - Example: `$.customer.points` → `loyalty_points`

3. **Automatic Persistence**
   - When webhook receives data, the backend:
     1. Extracts values using field mappings
     2. Stores custom fields in `contactData.metadata.custom_fields`
     3. Creates/updates contact
     4. Calls `saveContactCustomFields()` to persist to database

### Backend Flow

```javascript
// backend/src/routes/webhookRoutes.js

// 1. Extract custom field values during field mapping
if (customFieldsMap[contactField]) {
  contactData.metadata = contactData.metadata || {};
  contactData.metadata.custom_fields = contactData.metadata.custom_fields || {};
  contactData.metadata.custom_fields[contactField] = value;
}

// 2. After contact creation/update, save custom fields
if (contact && contactData.metadata?.custom_fields) {
  const customFieldResult = await saveContactCustomFields(
    contact.id,
    workspace_id,
    contactData.metadata.custom_fields
  );
}
```

### Custom Field Service

```javascript
// backend/src/services/customFieldService.js

export async function saveContactCustomFields(contactId, workspaceId, customFields) {
  // 1. Fetch field definitions
  const { data: fieldDefinitions } = await supabase
    .from('custom_fields')
    .select('id, name, field_type, object_type')
    .eq('workspace_id', workspaceId)
    .eq('object_type', 'contact')
    .eq('is_active', true);

  // 2. Map field names to IDs
  const fieldMap = {};
  fieldDefinitions.forEach(field => {
    fieldMap[field.name] = field.id;
  });

  // 3. Upsert each custom field value
  for (const [fieldName, fieldValue] of Object.entries(customFields)) {
    const fieldId = fieldMap[fieldName];
    
    // Check if exists
    const { data: existing } = await supabase
      .from('contact_custom_fields')
      .select('id')
      .eq('contact_id', contactId)
      .eq('field_id', fieldId)
      .maybeSingle();

    if (existing) {
      // Update
      await supabase
        .from('contact_custom_fields')
        .update({ value: fieldValue, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    } else {
      // Insert
      await supabase
        .from('contact_custom_fields')
        .insert({
          contact_id: contactId,
          field_id: fieldId,
          value: fieldValue
        });
    }
  }
}
```

## Method 2: Flow Builder Assignment

### How It Works

1. **Create Custom Field**
   - Navigate to Settings → Custom Objects
   - Create a new Contact field (e.g., `last_interaction`)

2. **Use Set Variable Action**
   - In Flow Builder, add a "Set Variable" action node
   - Set Variable Name to your custom field name (e.g., `last_interaction`)
   - Set Variable Value (e.g., `{{current_date}}` or static value)

3. **Automatic Detection & Persistence**
   - When workflow executes, Trigger.dev:
     1. Checks if variable name matches a custom field definition
     2. If yes, saves to `contact_custom_fields` table
     3. Also stores in execution metadata for workflow context

### Trigger.dev Flow

```javascript
// trigger/unifiedWorkflows.js

async function setVariableDirectly(payload) {
  // 1. Check if this is a custom field
  const { data: customField } = await supabaseAdmin
    .from('custom_fields')
    .select('id, object_type')
    .eq('workspace_id', payload.workspaceId)
    .eq('name', payload.variableName)
    .eq('object_type', 'contact')
    .eq('is_active', true)
    .maybeSingle();

  let isCustomField = false;
  let fieldId = null;
  
  if (customField) {
    isCustomField = true;
    fieldId = customField.id;
  }

  // 2. If custom field, save to contact_custom_fields
  if (isCustomField && fieldId && payload.contactId) {
    const { data: existing } = await supabaseAdmin
      .from('contact_custom_fields')
      .select('id')
      .eq('contact_id', payload.contactId)
      .eq('field_id', fieldId)
      .maybeSingle();

    if (existing) {
      // Update
      await supabaseAdmin
        .from('contact_custom_fields')
        .update({
          value: payload.variableValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else {
      // Insert
      await supabaseAdmin
        .from('contact_custom_fields')
        .insert({
          contact_id: payload.contactId,
          field_id: fieldId,
          value: payload.variableValue
        });
    }
  }

  // 3. Also store in execution metadata
  // ... (existing metadata storage code)
}
```

## Usage Examples

### Example 1: Webhook - Loyalty Points

**Webhook Payload:**
```json
{
  "customer": {
    "email": "john@example.com",
    "points": 1250,
    "tier": "gold"
  }
}
```

**Field Mapping:**
- `$.customer.email` → `email` (standard field)
- `$.customer.points` → `loyalty_points` (custom field)
- `$.customer.tier` → `customer_tier` (custom field)

**Result:**
- Contact created/updated with email
- `loyalty_points` = 1250 saved to `contact_custom_fields`
- `customer_tier` = "gold" saved to `contact_custom_fields`

### Example 2: Flow Builder - Last Interaction

**Flow:**
1. Trigger: Contact sends SMS
2. Action: Set Variable
   - Variable Name: `last_interaction`
   - Variable Value: `{{current_timestamp}}`
3. Action: Send Email

**Result:**
- `last_interaction` custom field updated with current timestamp
- Value persisted to database
- Can be used in future workflows or email templates with `{{last_interaction}}`

### Example 3: Combined - Lead Scoring

**Webhook Setup:**
- Map `$.lead_score` → `lead_score` (custom field)

**Flow Builder:**
- When contact opens email → Set Variable: `engagement_score` = `{{lead_score}} + 10`
- When contact clicks link → Set Variable: `engagement_score` = `{{engagement_score}} + 25`

**Result:**
- Initial score from webhook
- Dynamic updates via workflow
- All values persisted and queryable

## Using Custom Fields in Templates

Once custom fields are saved, they can be used in email/SMS templates:

```
Hey {{firstname}},

Your current loyalty points: {{loyalty_points}}
Your tier: {{customer_tier}}
Last interaction: {{last_interaction}}

Book your next appointment: {{scheduler_link}}
```

## Testing

### Test Webhook Assignment

1. Create a custom field: `test_field`
2. Configure webhook mapping: `$.test` → `test_field`
3. Send test webhook:
   ```bash
   curl -X POST https://your-webhook-url \
     -H "Content-Type: application/json" \
     -d '{"test": "Hello World", "email": "test@example.com"}'
   ```
4. Verify in database:
   ```sql
   SELECT cf.name, ccf.value
   FROM contact_custom_fields ccf
   JOIN custom_fields cf ON cf.id = ccf.field_id
   WHERE ccf.contact_id = '<contact_id>';
   ```

### Test Flow Builder Assignment

1. Create a custom field: `workflow_test`
2. Create a flow with Set Variable action:
   - Variable Name: `workflow_test`
   - Variable Value: `Test Value 123`
3. Execute flow for a contact
4. Check Trigger.dev logs for:
   - "📝 Detected custom field"
   - "✅ Inserted custom field value in database"
5. Verify in database (same query as above)

## Troubleshooting

### Custom Field Not Saving

**Symptoms:**
- Webhook or workflow executes successfully
- No error messages
- Custom field value not in database

**Checks:**
1. Verify field definition exists:
   ```sql
   SELECT * FROM custom_fields 
   WHERE name = 'your_field_name' 
   AND workspace_id = '<workspace_id>'
   AND is_active = true;
   ```

2. Check field mapping is correct (webhook)
3. Check variable name matches field name exactly (flow builder)
4. Check backend logs for errors

### Field Type Mismatch

**Symptoms:**
- Error saving custom field value
- Type validation errors

**Solution:**
- Ensure value matches field type:
  - `text`: String
  - `number`: Number
  - `boolean`: true/false
  - `date`: YYYY-MM-DD
  - `datetime`: ISO 8601 timestamp
  - `select`: One of the defined options
  - `multi_select`: Array of defined options

### Workspace vs Contact Fields

**Remember:**
- **Contact fields**: Unique per contact (e.g., `loyalty_points`)
- **Workspace fields**: Global, one value for all contacts (e.g., `scheduler_link`)
- Webhook and Flow Builder only work with **Contact** and **Appointment** fields
- Workspace fields are set in Settings → Custom Objects

## Performance Considerations

1. **Batch Operations**: Custom field saves are individual upserts. For bulk operations, consider batching.
2. **Indexing**: `contact_custom_fields` has indexes on `contact_id` and `field_id` for fast lookups.
3. **JSONB Storage**: Values are stored as JSONB, allowing flexible types and efficient querying.
4. **Caching**: Consider caching field definitions to reduce database queries.

## Security

1. **Workspace Isolation**: All queries filter by `workspace_id` to prevent cross-workspace access.
2. **Field Validation**: Only active, defined custom fields can be set.
3. **Type Safety**: JSONB storage allows validation at application level.
4. **Audit Trail**: `created_at` and `updated_at` timestamps track changes.

## Future Enhancements

1. **Bulk Import**: CSV import with custom field mapping
2. **Field History**: Track value changes over time
3. **Computed Fields**: Auto-calculate fields based on other values
4. **Field Dependencies**: Conditional field visibility/requirements
5. **API Endpoints**: Direct REST API for custom field CRUD

## Summary

✅ **Webhook UI**: Automatically maps and saves custom fields from incoming data
✅ **Flow Builder**: Intelligently detects and persists custom field variables
✅ **Database Persistence**: All custom field values stored in dedicated tables
✅ **Template Support**: Use custom fields in email/SMS with `{{field_name}}`
✅ **Type Safety**: JSONB storage with field type validation
✅ **Workspace Isolation**: Secure, multi-tenant architecture

Both methods ensure **persistent storage** of custom field values, making them available across the entire application for reporting, segmentation, and personalization.

