# Webhook Implementation Guide

## Latest Updates (March 10, 2025)

### Nested JSON Field Mapping Enhancement

We've improved the webhook field mapping system to better handle nested JSON payloads. The system now correctly maps fields from nested JSON structures to contact fields based on UI configuration.

#### How Nested JSON Field Mapping Works

1. **UI Configuration**:
   - In the webhook configuration UI, you can map fields from nested JSON structures to contact fields
   - For example, you can map `customer.personal.firstName` to `firstname` in the contacts table
   - The UI provides a visual JSON path finder to help select the correct paths

2. **Backend Processing**:
   - The system creates a clear mapping between source fields in the payload and contact fields in the database
   - It uses a `sourceToContactFieldMap` to track these mappings
   - When processing a webhook payload, it extracts values from the nested paths and saves them to the appropriate fields
   - Any fields not mapped in the UI are stored in the `metadata.unmapped_fields` JSON object

3. **Field Detection Logic**:
   - The system uses a simplified approach to determine if a field is mapped
   - It directly checks the `sourceToContactFieldMap` to see if a field has a mapping
   - This approach is more maintainable and less error-prone than complex conditional logic

#### Example Nested JSON Payload

```json
{
  "customer": {
    "contact": {
      "email": "john@example.com",
      "phone": "123-555-1234"
    },
    "personal": {
      "lastName": "Smith",
      "firstName": "John"
    }
  },
  "metadata": {
    "source": "Website",
    "campaign": "Spring2025"
  }
}
```

#### Example Field Mappings

| Source Field | Contact Field |
|--------------|---------------|
| customer.personal.firstName | firstname |
| customer.personal.lastName | lastname |
| customer.contact.email | email |
| customer.contact.phone | phone_number |
| metadata.source | lead_source |

#### Implementation Details

The key components of the nested JSON field mapping system are:

1. **Source-to-Contact Field Mapping**:
   ```javascript
   // Create a map of source fields to contact fields for easier lookup
   const sourceToContactFieldMap = {};
   Object.entries(fieldMappings).forEach(([contactField, mapping]) => {
     const sourcePath = typeof mapping === 'string' ? mapping : mapping.path.replace(/^\$\./, '');
     sourceToContactFieldMap[sourcePath] = contactField;
   });
   ```

2. **Field Mapping Detection**:
   ```javascript
   // Check if this field is mapped using the sourceToContactFieldMap
   const mappedContactField = sourceToContactFieldMap[key] || sourceToContactFieldMap[fieldPath];
   
   if (mappedContactField) {
     console.log(`Field ${fieldPath} is mapped to ${mappedContactField}`);
     return; // Skip adding to unmapped_fields
   }
   
   // If we get here, the field is not mapped
   console.log(`Field ${fieldPath} is NOT mapped and will be added to unmapped_fields`);
   contactData.metadata.unmapped_fields[fieldPath] = value;
   ```

3. **Nested Path Traversal**:
   ```javascript
   // Process each field mapping
   Object.entries(fieldMappings).forEach(([contactField, mapping]) => {
     let value;
     
     if (typeof mapping === 'string') {
       // Handle legacy direct mapping
       value = payload[mapping];
     } else if (mapping.type === 'jsonpath') {
       // Handle JSONPath mapping
       let currentValue = payload;
       const pathParts = mapping.path.replace(/^\$\./, '').split('.');
       
       for (const part of pathParts) {
         if (currentValue && typeof currentValue === 'object' && part in currentValue) {
           currentValue = currentValue[part];
         } else {
           currentValue = undefined;
           break;
         }
       }
       value = currentValue;
     }

     if (value !== undefined) {
       // If this is a custom field, store it in metadata
       if (customFieldsMap[contactField]) {
         contactData.metadata.custom_fields = contactData.metadata.custom_fields || {};
         contactData.metadata.custom_fields[contactField] = value;
       } else {
         // Standard field
         contactData[contactField] = value;
       }
     }
   });
   ```

#### Testing Nested JSON Field Mapping

You can test the nested JSON field mapping with the following script:

```javascript
// test/test_nested_json.js
const axios = require('axios');

// Webhook details
const webhookId = '871fe992-36b8-4204-81d3-572425f2c36f';
const workspaceId = '86509';
const webhookUrl = `https://cc.automate8.com/webhooks/${webhookId}`;

// Test payload with nested JSON structure
const payload = {
  "customer": {
    "contact": {
      "email": "john@example.com",
      "phone": "123-555-1234"
    },
    "personal": {
      "lastName": "Smith",
      "firstName": "John"
    }
  },
  "metadata": {
    "source": "Website",
    "campaign": "Spring2025"
  }
};

async function testNestedJsonPayload() {
  console.log('Testing webhook with nested JSON payload...');
  
  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': workspaceId
      }
    });
    
    console.log('Response:', response.data);
    
    if (response.data.contact_id) {
      console.log(`Success! Contact created with ID: ${response.data.contact_id}`);
    }
    
    return response.data;
  } catch (error) {
    console.error('Error testing webhook:', error);
    throw error;
  }
}

// Run the test
testNestedJsonPayload();
```

#### Best Practices for Nested JSON Field Mapping

1. **Use the UI to Configure Mappings**:
   - Always use the webhook configuration UI to set up field mappings
   - The UI provides a visual JSON path finder to help select the correct paths
   - This ensures that the mappings are correctly stored in the database

2. **Test with Sample Payloads**:
   - Always test your webhook with sample payloads before using it in production
   - Verify that fields are correctly mapped in the UI
   - Check that unmapped fields appear in the "Unmapped Fields" section

3. **Handle Required Fields**:
   - Ensure that required fields (firstname, lastname, phone_number) are mapped
   - The system will validate these fields and return an error if they're missing

4. **Monitor Webhook Logs**:
   - Use the webhook logs to monitor webhook execution
   - Check for errors and fix any issues with field mappings

#### Troubleshooting Nested JSON Field Mapping

1. **Field Not Mapped Correctly**:
   - Check the field path in the UI configuration
   - Verify that the field exists in the payload
   - Check for case sensitivity issues

2. **Field Appears in Unmapped Fields**:
   - Verify that the field is mapped in the UI
   - Check that the field path is correct
   - Check the webhook logs for any errors

3. **Required Fields Missing**:
   - Ensure that required fields (firstname, lastname, phone_number) are mapped
   - Check that the fields exist in the payload
   - Verify that the field paths are correct

## Latest Updates (March 9, 2025)

### Recently Implemented Features
1. **Field Mapping System**
   - JSONPath-based field mapping
   - Support for nested field access
   - Real-time mapping preview
   - Automatic field detection from sample payload

2. **Sample Payload Management**
   - JSON payload validation
   - Sample payload persistence
   - Load latest payload feature
   - Payload format standardization

3. **UI Improvements**
   - Visual mapping interface
   - Configuration status indicators
   - Copy webhook URL functionality
   - Active/Inactive status toggle

### API Endpoints Used

#### Webhook Management
```javascript
// Create webhook
POST /api/webhooks
Body: {
  name: string,
  source: string,
  workspace_id: string
}

// List webhooks
GET /api/webhooks
Headers: {
  x-workspace-id: string
}

// Update webhook
PATCH /api/webhooks/:id
Body: {
  name?: string,
  status?: 'active' | 'inactive'
}

// Delete webhook
DELETE /api/webhooks/:id
```

#### Field Mappings
```javascript
// Get field mappings
GET /api/webhooks/:id/mappings

// Update field mappings
PUT /api/webhooks/:id/mappings
Body: {
  mappings: {
    field_mappings: {
      [field: string]: {
        type: 'jsonpath',
        path: string
      }
    },
    sample_payload: object
  }
}
```

#### Webhook Execution
```javascript
// External webhook endpoint
POST /webhooks/:webhook_id
Headers: {
  x-workspace-id: string
}
Body: {
  // Dynamic JSON payload
}

// Test webhook
POST /api/webhooks/:id/test
Body: {
  payload: object
}
```

### Testing Instructions

#### 1. Setup Test Environment
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your test credentials

# Start development server
npm run dev
```

#### 2. Testing Scripts
```javascript
// test/webhook.test.js
const testWebhook = async () => {
  // 1. Create webhook
  const webhook = await createTestWebhook({
    name: 'Test Webhook',
    workspace_id: YOUR_WORKSPACE_ID
  });

  // 2. Configure field mappings
  await updateFieldMappings(webhook.id, {
    firstname: { type: 'jsonpath', path: '$.firstname' },
    lastname: { type: 'jsonpath', path: '$.lastname' },
    email: { type: 'jsonpath', path: '$.email' }
  });

  // 3. Send test payload
  const result = await testWebhookExecution(webhook.id, {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john@example.com'
  });

  // 4. Verify results
  console.assert(result.success, 'Webhook execution failed');
  console.assert(result.contact_id, 'No contact created');
};
```

### System Architecture

```
┌─────────────────┐
│ External System │
└────────┬────────┘
         │ POST
         ▼
┌─────────────────────┐
│ Webhook Endpoint    │
└────────┬────────────┘
         │ Process Payload
         ▼
┌─────────────────────────┐
│ Field Mapping Processor │
└────────┬────────────────┘
         │ Extract Fields
         ▼
┌─────────────────────┐
│ Contact Creation    │◄──────┐
└────────┬────────────┘       │
         │ Save               │
         ▼                    │
    ┌─────────┐              │
    │Database │              │
    └─────────┘              │
         │                    │
         │ Notify             │
         ▼                    │
┌─────────────────────┐       │
│ Real-time Updates   │       │
└────────┬────────────┘       │
         │ Socket.IO          │
         ▼                    │
┌─────────────────┐           │
│   UI Update     │───────────┘
└─────────────────┘
```

### File Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── webhook/
│   │       ├── WebhookPanel.js         # Main webhook management UI
│   │       ├── FieldMapping.js         # Field mapping component
│   │       ├── JsonPathFinder.js       # JSON path selection tool
│   │       ├── SimulationTool.js       # Webhook testing interface
│   │       └── WebhookLogs.js          # Execution logs viewer
│   ├── services/
│   │   └── webhookService.js           # Webhook API integration
│   └── contexts/
│       └── WebhookContext.js           # Webhook state management
├── test/
│   └── webhook.test.js                 # Testing scripts
└── docs/
    └── webhook_implementation.md        # This documentation
```

### Files Involved

1. **Core Components**
   - `WebhookPanel.js`: Main webhook management interface
   - `FieldMapping.js`: Field mapping configuration
   - `JsonPathFinder.js`: JSON path selection tool
   - `SimulationTool.js`: Webhook testing interface
   - `WebhookLogs.js`: Execution history viewer

2. **Services and Utilities**
   - `webhookService.js`: API integration and data handling
   - `WebhookContext.js`: State management and business logic

3. **Database Tables**
   - `webhooks`: Webhook configuration
   - `field_mappings`: Field mapping settings
   - `webhook_logs`: Execution history
   - `contacts`: Created/updated contacts

4. **Testing and Documentation**
   - `webhook.test.js`: Testing scripts
   - `webhook_implementation.md`: Implementation guide

### Next Steps
1. ✅ Implement webhook status toggle
2. ✅ Add field validation in SimulationTool
3. ✅ Create comprehensive logging system
4. ⏳ Add webhook templates for common services
5. ⏳ Implement webhook analytics dashboard
6. ⏳ Add batch testing capabilities
7. ⏳ Support for webhook authentication methods
8. ⏳ Implement retry mechanism for failed webhook calls
9. ⏳ Add support for webhook payload transformation

### Database Schema
```sql
Table: webhooks
- id (uuid, primary key)
- name (varchar, required)
- source (varchar, required)
- workspace_id (text, required)
- created_by_email (text, required)
- status (varchar, required) - 'active' or 'inactive'
- created_at (timestamptz, required)
- last_used (timestamptz, nullable)
- call_count (integer, nullable)
- mappings (jsonb, nullable) - Stores the high-level mapping configuration

Table: webhook_logs
- id (uuid, primary key)
- webhook_id (uuid, required) - Reference to the webhook
- workspace_id (text, required)
- timestamp (timestamptz, required)
- status (varchar, required) - 'success', 'error', 'processing'
- payload (jsonb, nullable) - The raw payload received
- result (jsonb, nullable) - The processed result
- error_message (text, nullable)
- processed_contact_id (uuid, nullable) - Reference to the created/updated contact

Table: field_mappings
- id (uuid, primary key)
- webhook_id (uuid, required) - Reference to the webhook
- workspace_id (text, required)
- mappings (jsonb, required) - Stores the detailed field mappings
- created_at (timestamptz, nullable)
- updated_at (timestamptz, nullable)

Table: custom_fields
- id (uuid, primary key)
- workspace_id (text, required)
- name (varchar, required)
- label (varchar, required)
- field_type (enum, required)
- is_required (boolean, nullable)
- description (text, nullable)
- created_at (timestamptz, nullable)
- updated_at (timestamptz, nullable)
- created_by (uuid, nullable)

Table: contacts
- id (uuid, primary key)
- phone_number (text, required)
- workspace_id (text, required)
- name (text, nullable)
- email (text, nullable)
- firstname (varchar, required)
- lastname (varchar, required)
- lead_source (varchar, nullable)
- market (varchar, nullable)
- product (varchar, nullable)
- lead_status (varchar, nullable)
- st_address (varchar, nullable)
- city (varchar, nullable)
- state (varchar, nullable)
- zip (varchar, nullable)
- metadata (jsonb, nullable) - Stores custom field values and webhook metadata
- opt_in_through (varchar, required)
- ... (other fields)
```

### Security Policies
```sql
-- Webhook Logs Access
CREATE POLICY "Enable read access for workspace members" ON webhook_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = webhook_logs.workspace_id 
        AND workspace_members.user_id = auth.uid()
    )
);

-- Field Mappings Access
CREATE POLICY "Enable read access for workspace members" ON field_mappings...
CREATE POLICY "Enable insert for workspace members" ON field_mappings...
CREATE POLICY "Enable update for workspace members" ON field_mappings...
CREATE POLICY "Enable delete for workspace members" ON field_mappings...
```

## Payload Preprocessing Enhancement (March 14, 2025)

We've added a preprocessing layer to transform incoming webhook data before field mapping occurs. This allows for data normalization, field combination, and format standardization.

#### Preprocessing Features

1. **Custom JavaScript Transformations**:
   - Each webhook can have a custom JavaScript preprocessing function
   - The function receives the raw payload and must return the transformed payload
   - Runs before field mapping to ensure data is in the correct format

2. **Common Use Cases**:
   - Phone number standardization (e.g., "222-234-3456" → "+12222343456")
   - Name field combinations (e.g., firstname + lastname → username)
   - Date format standardization
   - Address normalization
   - Custom field calculations

#### Implementation Example

```javascript
// Example preprocessing function
function preprocessPayload(payload) {
  // Clone payload to avoid mutations
  const processed = { ...payload };

  // Phone number standardization
  if (processed.phone_number) {
    processed.phone_number = standardizePhoneNumber(processed.phone_number);
  }

  // Combine name fields
  if (processed.firstname && processed.lastname) {
    processed.username = `${processed.firstname} ${processed.lastname}`;
  }

  // Format address
  if (processed.street1) {
    processed.formatted_address = formatAddress({
      street1: processed.street1,
      street2: processed.street2,
      city: processed.city,
      state: processed.state,
      zip: processed.zip
    });
  }

  return processed;
}

// Example helper functions
function standardizePhoneNumber(phone) {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Add country code if missing
  return cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
}

function formatAddress({ street1, street2, city, state, zip }) {
  return [
    street1,
    street2,
    [city, state, zip].filter(Boolean).join(', ')
  ].filter(Boolean).join('\n');
}
```

#### UI Configuration

The preprocessing function can be configured in the webhook settings:

1. **JavaScript Editor**:
   - Monaco editor for writing preprocessing code
   - Syntax highlighting and error checking
   - Auto-completion for common operations
   - Built-in helper functions library

2. **Testing Panel**:
   - Test preprocessing with sample payloads
   - View transformed data before and after
   - Validate phone numbers and other formats
   - Debug preprocessing issues

#### Processing Flow

```
Incoming Webhook Request
↓
Preprocessing (JavaScript transformation)
↓
Field Mapping
↓
Contact Data Storage
```

#### Security Considerations

1. **Code Validation**:
   - Preprocessing code is validated before saving
   - Restricted access to system objects
   - Timeout limits for processing
   - Memory usage limits

2. **Error Handling**:
   - Graceful fallback if preprocessing fails
   - Detailed error logging
   - Original payload preservation
   - Retry mechanisms for temporary failures

#### Best Practices

1. **Keep It Simple**:
   - Write clear, focused preprocessing functions
   - Use helper functions for common operations
   - Document transformations in code comments
   - Test with various input formats

2. **Performance**:
   - Minimize complex operations
   - Use efficient data structures
   - Cache repeated calculations
   - Handle large payloads gracefully

3. **Maintenance**:
   - Version control preprocessing functions
   - Log significant transformations
   - Document edge cases
   - Regular code review and updates

## Backend Implementation Plan

### Architecture Overview

```
┌──────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│    External      │      │    Webhook      │      │    Database      │
│   Application    │─────>│    Endpoint     │─────>│   (Supabase)     │
└──────────────────┘      └─────────────────┘      └──────────────────┘
        │                         │                         ▲
        │                         │                         │
        ▼                         ▼                         │
┌──────────────────┐      ┌─────────────────┐      ┌──────────────────┐
│   Sample JSON    │      │      Field      │      │     Contact      │
│     Payload      │      │     Mapping     │      │     Creation     │
└──────────────────┘      └─────────────────┘      └──────────────────┘
```

### 1. API Routes Structure

```javascript
// CRUD Operations for Webhooks
POST /api/webhooks                // Create webhook
GET /api/webhooks                 // List webhooks
GET /api/webhooks/:id             // Get webhook details
PATCH /api/webhooks/:id           // Update webhook
DELETE /api/webhooks/:id          // Delete webhook

// Field Mappings
GET /api/webhooks/:id/mappings    // Get field mappings
PUT /api/webhooks/:id/mappings    // Update field mappings

// Webhook Logs
GET /api/webhooks/:id/logs        // Get webhook execution logs

// Webhook Execution
POST /webhooks/:webhook_id        // External webhook endpoint
POST /api/webhooks/:id/test       // Test webhook with sample payload
```

### 2. Core Backend Components

#### 2.1 Webhook Processing Flow

```
1. Receive JSON payload at webhook endpoint
2. Create initial log entry with 'processing' status
3. Validate webhook exists and is active
4. Process payload against field mappings
5. Validate required fields
6. Create/update contact record
7. Update log entry with final status and result
8. Return appropriate response
```

#### 2.2 Field Mapping Processor

The field mapping processor will:
1. Extract values from the JSON payload using the configured paths
2. Map these values to the appropriate contact fields
3. Handle custom fields by storing them in the contact's metadata
4. Validate required fields
5. Apply type conversions as needed

#### 2.3 Error Handling Strategy

1. Create log entries for all webhook calls, regardless of success/failure
2. Capture detailed error information in log entries
3. Return appropriate HTTP status codes and error messages
4. Implement proper validation to prevent common errors

### 3. Implementation Details

#### 3.1 Enhanced Webhook Routes Implementation

```javascript
/**
 * Helper function to process field mappings
 * @param {Object} payload - The incoming JSON payload
 * @param {Object} mappings - Field mappings configuration
 * @param {Object} webhook - Webhook configuration
 * @returns {Object} Mapped contact data
 */
const processFieldMappings = async (payload, mappings, webhook) => {
  // Get custom fields for this workspace
  const { data: customFields } = await supabase
    .from('custom_fields')
    .select('name, field_type')
    .eq('workspace_id', webhook.workspace_id);
  
  // Create map of custom fields
  const customFieldsMap = customFields.reduce((acc, field) => {
    acc[field.name] = field.field_type;
    return acc;
  }, {});
  
  const contactData = {
    workspace_id: webhook.workspace_id,
    opt_in_through: 'webhook',
    metadata: {
      webhook: {
        id: webhook.id,
        name: webhook.name,
        source: webhook.source,
        timestamp: new Date().toISOString()
      }
    }
  };

  // Process standard fields and custom fields separately
  Object.entries(mappings).forEach(([contactField, jsonPath]) => {
    let value = payload;
    const path = jsonPath.split('.');
    
    // Traverse the path to get the value
    for (const key of path) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        value = undefined;
        break;
      }
    }

    if (value !== undefined) {
      // If this is a custom field, store it in metadata
      if (customFieldsMap[contactField]) {
        contactData.metadata = contactData.metadata || {};
        contactData.metadata.custom_fields = contactData.metadata.custom_fields || {};
        contactData.metadata.custom_fields[contactField] = value;
      } else {
        // Standard field
        contactData[contactField] = value;
      }
    }
  });

  return contactData;
};

/**
 * Validate payload against required fields
 * @param {Object} contactData - Mapped contact data
 * @returns {Object} Validation result
 */
const validateContactData = (contactData) => {
  const requiredFields = ['firstname', 'lastname', 'phone_number'];
  const missingFields = requiredFields.filter(field => !contactData[field]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

/**
 * Helper function to update log status
 */
async function updateLogStatus(logId, status, errorMessage = null, contactId = null, result = null) {
  const updateData = { 
    status, 
    error_message: errorMessage,
    processed_contact_id: contactId,
    result
  };
  
  await supabase
    .from('webhook_logs')
    .update(updateData)
    .eq('id', logId);
}
```

#### 3.2 Webhook Execution Endpoint

   ```javascript
/**
 * Enhanced webhook execution endpoint
 * POST /webhooks/:webhook_id
 */
router.post('/:webhook_id', async (req, res) => {
  try {
    const { webhook_id } = req.params;
    const workspace_id = req.headers['x-workspace-id'];
    const payload = req.body;
    
    // Create log entry immediately
    const logEntry = {
      id: uuidv4(),
      webhook_id,
      workspace_id,
      timestamp: new Date().toISOString(),
      payload,
      status: 'processing'
    };

    const { data: log, error: logError } = await supabase
      .from('webhook_logs')
      .insert(logEntry)
      .select()
      .single();

    if (logError) throw new Error(`Failed to create log entry: ${logError.message}`);

    // Get webhook configuration and field mappings
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select(`
        *,
        field_mappings (
          mappings
        )
      `)
      .eq('id', webhook_id)
      .eq('workspace_id', workspace_id)
      .eq('status', 'active');

    if (webhookError || !webhooks || webhooks.length === 0) {
      await updateLogStatus(log.id, 'error', 'Webhook not found or inactive');
      return res.status(404).json({ 
        error: 'Webhook not found or inactive',
        webhook_id,
        workspace_id
      });
    }

    const webhook = webhooks[0];
    const mappings = webhook.field_mappings?.[0]?.mappings || {};
    
    // Process mappings
    const contactData = await processFieldMappings(payload, mappings, webhook);
    
    // Validate required fields
    const validation = validateContactData(contactData);
    
    if (!validation.isValid) {
      const errorMessage = `Missing required fields: ${validation.missingFields.join(', ')}`;
      await updateLogStatus(log.id, 'error', errorMessage);
      return res.status(400).json({ 
        error: errorMessage,
        webhook_id
      });
    }

    // Update webhook usage stats
    await supabase
      .from('webhooks')
      .update({ 
        last_used: new Date().toISOString(),
        call_count: webhook.call_count ? webhook.call_count + 1 : 1
      })
      .eq('id', webhook_id);

    // Create or update contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .upsert(contactData)
      .select()
      .single();

    if (contactError) {
      await updateLogStatus(log.id, 'error', contactError.message);
      throw contactError;
    }

    // Update log with success status and processed contact ID
    await updateLogStatus(log.id, 'success', null, contact.id, contactData);

    // Return success response
    res.status(200).json({
      message: 'Webhook processed successfully',
      contact_id: contact.id
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    // Ensure error is logged if not already done
    if (req.params.webhook_id && req.headers['x-workspace-id']) {
      await supabase
        .from('webhook_logs')
        .upsert({
          webhook_id: req.params.webhook_id,
          workspace_id: req.headers['x-workspace-id'],
          payload: req.body,
          error_message: error.message,
          status: 'error',
          timestamp: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
    }

    res.status(500).json({ 
      error: 'Failed to process webhook',
      details: error.message
    });
  }
});
```

#### 3.3 Webhook Testing Endpoint

```javascript
/**
 * Test endpoint to simulate webhook execution
 * POST /api/webhooks/:id/test
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { payload } = req.body;
    const workspaceId = req.workspace.id;
    
    // Get webhook configuration and field mappings
    const { data: webhooks, error: webhookError } = await supabase
      .from('webhooks')
      .select(`
        *,
        field_mappings (
          mappings
        )
      `)
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (webhookError || !webhooks || webhooks.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const webhook = webhooks[0];
    const mappings = webhook.field_mappings?.[0]?.mappings || {};
    
    // Process mappings without saving to database
    const contactData = await processFieldMappings(payload, mappings, webhook);
    
    // Validate required fields
    const validation = validateContactData(contactData);
    
    // Return results for test
    res.json({
      isValid: validation.isValid,
      missingFields: validation.missingFields,
      mappedFields: contactData,
      webhook: {
        id: webhook.id,
        name: webhook.name
      }
    });
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ 
      error: 'Failed to test webhook',
      details: error.message
    });
  }
});
```

### 4. Integration with Frontend Components

The backend implementation will integrate with the existing frontend components:

1. **WebhookPanel.js**: Will use the CRUD endpoints to manage webhooks
2. **FieldMapping.js**: Will use the field mapping endpoints to configure mappings
3. **SimulationTool.js**: Will use the test endpoint to validate payloads
4. **WebhookLogs.js**: Will use the logs endpoint to display execution history
5. **JsonPathFinder.js**: Will help users select the correct JSON paths for mapping

### 5. Testing Strategy

1. **Unit Tests**: Test individual functions like `processFieldMappings` and `validateContactData`
2. **Integration Tests**: Test the API endpoints with various payloads
3. **End-to-End Tests**: Test the complete flow from webhook creation to execution
4. **Edge Cases**: Test with missing fields, invalid JSON, etc.

### 6. Deployment Considerations

1. **Environment Variables**: Ensure all necessary environment variables are set
2. **Database Migrations**: Apply any necessary database schema changes
3. **API Documentation**: Document the API endpoints for external users
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Monitoring**: Set up monitoring for webhook execution

### 7. Next Steps and Future Enhancements

1. ✅ Implement webhook status toggle
2. ✅ Add field validation in SimulationTool
3. ✅ Create comprehensive logging system
4. ⏳ Add webhook templates for common services
5. ⏳ Implement webhook analytics dashboard
6. ⏳ Add batch testing capabilities
7. ⏳ Support for webhook authentication methods (Basic Auth, API Keys)
8. ⏳ Implement retry mechanism for failed webhook calls
9. ⏳ Add support for webhook payload transformation using custom scripts

### 8. Troubleshooting

1. **Webhook Not Receiving Data**
   - Check webhook status (active/inactive)
   - Verify webhook URL
   - Check network connectivity
   - Review logs for errors

2. **Field Mapping Issues**
   - Verify source field names
   - Check required field validation
   - Review mapping configuration

3. **Authorization Failures**
   - Confirm workspace membership
   - Check RLS policies
   - Verify user permissions

4. **Performance Issues**
   - Check database query performance
   - Monitor webhook execution time
   - Implement caching if necessary
