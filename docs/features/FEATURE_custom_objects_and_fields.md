# Custom Objects & Fields System - Complete Implementation Plan

## 📋 Overview

This document outlines the complete implementation of a **Salesforce-style Custom Objects & Fields** system that allows users to create custom data structures and use them in email/SMS templates.

**Last Updated:** November 17, 2025  
**Status:** Planning Phase  
**Target Audience:** Developers, Interns, Admins

---

## 🎯 Goals

1. **Allow users to define custom objects** (Contact, Appointment, Workspace-level)
2. **Enable custom fields** on each object type
3. **Use custom fields in email/SMS templates** with `{{custom_field_name}}` syntax
4. **Provide user-friendly UI** in Settings for managing objects and fields
5. **Support different field types** (text, number, date, boolean, select, multi-select)

---

## 📊 System Architecture

### Object Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     CUSTOM OBJECTS HIERARCHY                     │
└─────────────────────────────────────────────────────────────────┘

1. CONTACT OBJECT (Contact-Scoped)
   ├─ Associated to: Unique Contact
   ├─ Scope: Per Contact
   ├─ Example Fields:
   │  ├─ loyalty_points (number)
   │  ├─ referral_source (select)
   │  ├─ last_purchase_date (date)
   │  └─ premium_member (boolean)
   └─ Usage: {{loyalty_points}}, {{referral_source}}

2. APPOINTMENT OBJECT (Appointment-Scoped)
   ├─ Associated to: Unique Contact + Appointment
   ├─ Scope: Per Appointment
   ├─ Example Fields:
   │  ├─ appointment_type (select)
   │  ├─ estimated_duration (number)
   │  ├─ special_instructions (text)
   │  └─ confirmed (boolean)
   └─ Usage: {{appointment_type}}, {{estimated_duration}}

3. WORKSPACE OBJECT (Workspace-Scoped)
   ├─ Associated to: Entire Workspace
   ├─ Scope: Global (all contacts use same value)
   ├─ Example Fields:
   │  ├─ scheduler_link (text)
   │  ├─ company_address (text)
   │  ├─ support_hours (text)
   │  └─ cancellation_policy (text)
   └─ Usage: {{scheduler_link}}, {{company_address}}
```

---

## 🗄️ Database Schema

### Existing Tables (Already in Database)

#### 1. `custom_fields` (Existing)
```sql
CREATE TABLE custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    name VARCHAR NOT NULL,              -- Field name (e.g., "loyalty_points")
    label VARCHAR NOT NULL,             -- Display label (e.g., "Loyalty Points")
    field_type VARCHAR NOT NULL,        -- text, number, date, boolean, select, multi_select
    is_required BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);
```

**✅ Status:** Already exists  
**❌ Missing:** `object_type` column, `options` for select fields, `display_order`

#### 2. `contact_custom_fields` (Existing)
```sql
CREATE TABLE contact_custom_fields (
    id UUID PRIMARY KEY,
    contact_id UUID REFERENCES contacts(id),
    field_id UUID REFERENCES custom_fields(id),
    value JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**✅ Status:** Already exists

#### 3. `lead_custom_fields` (Existing)
```sql
CREATE TABLE lead_custom_fields (
    id UUID PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    field_id UUID REFERENCES custom_fields(id),
    value JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

**✅ Status:** Already exists

---

### Required Schema Changes

#### Migration 1: Enhance `custom_fields` table

```sql
-- Add missing columns to custom_fields
ALTER TABLE custom_fields 
ADD COLUMN IF NOT EXISTS object_type VARCHAR(50) DEFAULT 'contact' 
    CHECK (object_type IN ('contact', 'appointment', 'workspace')),
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_custom_fields_workspace_object 
    ON custom_fields(workspace_id, object_type, is_active);

-- Add unique constraint
ALTER TABLE custom_fields 
ADD CONSTRAINT custom_fields_workspace_name_object_unique 
    UNIQUE (workspace_id, name, object_type);
```

#### Migration 2: Create `workspace_custom_fields` table

```sql
-- Workspace-level custom field values (global for all contacts)
CREATE TABLE IF NOT EXISTS workspace_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(workspace_id, field_id)
);

CREATE INDEX idx_workspace_custom_fields_workspace 
    ON workspace_custom_fields(workspace_id);
```

#### Migration 3: Create `appointment_custom_fields` table (if appointments exist)

```sql
-- Appointment-level custom field values
CREATE TABLE IF NOT EXISTS appointment_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL, -- References appointments table
    field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    UNIQUE(appointment_id, field_id)
);

CREATE INDEX idx_appointment_custom_fields_appointment 
    ON appointment_custom_fields(appointment_id);
```

---

## 🎨 UI Design - Settings Page

### Navigation Structure

```
Settings
├─ General
├─ Integrations
├─ Team
├─ Billing
└─ Custom Objects & Fields  ← NEW
   ├─ Contact Fields
   ├─ Appointment Fields
   └─ Workspace Fields
```

### Page Layout (ASCII Mockup)

```
┌────────────────────────────────────────────────────────────────────┐
│  Settings > Custom Objects & Fields                    [+ New Field]│
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Object Type Tabs                                            │ │
│  │  [Contact Fields] [Appointment Fields] [Workspace Fields]    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📋 Contact Fields (5)                                       │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │ Field Name          Type      Required   Actions       │ │ │
│  │  ├────────────────────────────────────────────────────────┤ │ │
│  │  │ loyalty_points      Number    No         [Edit][Delete]│ │ │
│  │  │ referral_source     Select    Yes        [Edit][Delete]│ │ │
│  │  │ last_purchase_date  Date      No         [Edit][Delete]│ │ │
│  │  │ premium_member      Boolean   No         [Edit][Delete]│ │ │
│  │  │ notes               Text      No         [Edit][Delete]│ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  │                                                              │ │
│  │  💡 Tip: Use these fields in emails with {{field_name}}    │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  📌 Workspace Fields (2)                                     │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │ Field Name          Type      Value         Actions    │ │ │
│  │  ├────────────────────────────────────────────────────────┤ │ │
│  │  │ scheduler_link      Text      https://...  [Edit]      │ │ │
│  │  │ company_address     Text      123 Main St  [Edit]      │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

### Create/Edit Field Modal

```
┌─────────────────────────────────────────────────────┐
│  Create Custom Field                          [×]   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Object Type:                                       │
│  ○ Contact Field  ○ Appointment  ○ Workspace       │
│                                                     │
│  Field Name: *                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ loyalty_points                              │   │
│  └─────────────────────────────────────────────┘   │
│  (Used in templates as {{loyalty_points}})         │
│                                                     │
│  Display Label: *                                   │
│  ┌─────────────────────────────────────────────┐   │
│  │ Loyalty Points                              │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Field Type: *                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Number                              ▼       │   │
│  └─────────────────────────────────────────────┘   │
│  Options: Text, Number, Date, Boolean, Select      │
│                                                     │
│  Description:                                       │
│  ┌─────────────────────────────────────────────┐   │
│  │ Customer loyalty points balance             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ☐ Required field                                  │
│                                                     │
│  [Cancel]                    [Create Field]        │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow - Variable Replacement

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VARIABLE REPLACEMENT FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

1. USER CREATES EMAIL/SMS
   │
   ├─> Subject: "Hi {{firstname}}, you have {{loyalty_points}} points!"
   └─> Body: "Visit {{scheduler_link}} to book"

2. WORKFLOW EXECUTION STARTS
   │
   ├─> Fetch Contact Data
   │   └─> {id, firstname, lastname, email, phone, ...}
   │
   ├─> Fetch Contact Custom Fields
   │   └─> SELECT * FROM contact_custom_fields WHERE contact_id = ?
   │       Result: [{field_name: "loyalty_points", value: 1250}]
   │
   └─> Fetch Workspace Custom Fields
       └─> SELECT * FROM workspace_custom_fields WHERE workspace_id = ?
           Result: [{field_name: "scheduler_link", value: "https://..."}]

3. MERGE ALL DATA
   │
   └─> Combined Object:
       {
         firstname: "John",
         lastname: "Doe",
         email: "john@example.com",
         loyalty_points: 1250,        ← Custom field
         scheduler_link: "https://..." ← Workspace field
       }

4. REPLACE VARIABLES
   │
   ├─> "Hi {{firstname}}" → "Hi John"
   ├─> "{{loyalty_points}} points" → "1250 points"
   └─> "Visit {{scheduler_link}}" → "Visit https://..."

5. SEND EMAIL/SMS
   └─> Final message sent with all variables replaced
```

---

## 💻 Implementation Steps

### Phase 1: Database Setup (Week 1)

**Task 1.1: Run Database Migrations**
```bash
# Create migration file
cd supabaseSchema/migrations
touch 20251117_custom_objects_enhancement.sql
```

**Task 1.2: Test Migrations**
- Run migrations on staging environment
- Verify all tables and indexes created
- Test constraints and foreign keys

---

### Phase 2: Backend API (Week 1-2)

**Task 2.1: Create Custom Fields API** (`backend/src/routes/customFieldsRoutes.js`)

```javascript
// GET /api/custom-fields?workspace_id=xxx&object_type=contact
router.get('/custom-fields', async (req, res) => {
  // Fetch all custom fields for workspace
});

// POST /api/custom-fields
router.post('/custom-fields', async (req, res) => {
  // Create new custom field
});

// PUT /api/custom-fields/:id
router.put('/custom-fields/:id', async (req, res) => {
  // Update custom field definition
});

// DELETE /api/custom-fields/:id
router.delete('/custom-fields/:id', async (req, res) => {
  // Delete custom field (soft delete)
});

// GET /api/custom-fields/:contact_id/values
router.get('/custom-fields/:contact_id/values', async (req, res) => {
  // Get all custom field values for a contact
});

// PUT /api/custom-fields/:contact_id/values
router.put('/custom-fields/:contact_id/values', async (req, res) => {
  // Update custom field values for a contact
});
```

**Task 2.2: Update Workflow Variable Replacement** (`trigger/unifiedWorkflows.js`)

```javascript
// Enhanced variable replacement function
async function replaceVariablesInTemplate(template, context) {
  const { contact, workspaceId, supabaseAdmin } = context;
  
  // 1. Start with standard contact fields
  let data = {
    firstname: contact.firstname,
    lastname: contact.lastname,
    email: contact.email,
    phone: contact.phone,
    // ... other standard fields
  };
  
  // 2. Fetch contact-level custom fields
  const { data: contactFields } = await supabaseAdmin
    .from('contact_custom_fields')
    .select(`
      custom_fields!inner(name),
      value
    `)
    .eq('contact_id', contact.id);
  
  contactFields.forEach(field => {
    data[field.custom_fields.name] = field.value;
  });
  
  // 3. Fetch workspace-level custom fields
  const { data: workspaceFields } = await supabaseAdmin
    .from('workspace_custom_fields')
    .select(`
      custom_fields!inner(name),
      value
    `)
    .eq('workspace_id', workspaceId);
  
  workspaceFields.forEach(field => {
    data[field.custom_fields.name] = field.value;
  });
  
  // 4. Replace all variables
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match; // Keep {{var}} if not found
  });
}
```

---

### Phase 3: Frontend UI (Week 2-3)

**Task 3.1: Create Settings Page** (`frontend/src/components/settings/CustomObjectsSettings.js`)

```javascript
import React, { useState, useEffect } from 'react';
import {
  Box, Tabs, TabList, TabPanels, Tab, TabPanel,
  Button, Table, Thead, Tbody, Tr, Th, Td,
  IconButton, Badge, useDisclosure
} from '@chakra-ui/react';
import { Plus, Edit, Trash2 } from 'lucide-react';

const CustomObjectsSettings = () => {
  const [fields, setFields] = useState([]);
  const [selectedObjectType, setSelectedObjectType] = useState('contact');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Fetch fields on mount
  useEffect(() => {
    fetchCustomFields(selectedObjectType);
  }, [selectedObjectType]);
  
  const fetchCustomFields = async (objectType) => {
    // API call to get fields
  };
  
  return (
    <Box>
      <Tabs onChange={(index) => {
        const types = ['contact', 'appointment', 'workspace'];
        setSelectedObjectType(types[index]);
      }}>
        <TabList>
          <Tab>Contact Fields</Tab>
          <Tab>Appointment Fields</Tab>
          <Tab>Workspace Fields</Tab>
        </TabList>
        
        <TabPanels>
          {/* Render fields table */}
        </TabPanels>
      </Tabs>
      
      <CreateFieldModal isOpen={isOpen} onClose={onClose} />
    </Box>
  );
};
```

**Task 3.2: Update Email/SMS Variable Picker** (`frontend/src/components/flow-builder/drawers/EmailConfigSidebar.js`)

```javascript
// Enhanced template variables to include custom fields
const [templateVariables, setTemplateVariables] = useState([]);

useEffect(() => {
  const fetchVariables = async () => {
    // Fetch standard variables
    const standard = [
      { name: 'firstname', description: 'Contact\'s first name' },
      { name: 'lastname', description: 'Contact\'s last name' },
      // ...
    ];
    
    // Fetch custom fields
    const { data: customFields } = await supabase
      .from('custom_fields')
      .select('name, label, object_type')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);
    
    const custom = customFields.map(field => ({
      name: field.name,
      description: `${field.label} (${field.object_type})`,
      isCustom: true
    }));
    
    setTemplateVariables([...standard, ...custom]);
  };
  
  fetchVariables();
}, [workspaceId]);
```

---

### Phase 4: Contact Form Integration (Week 3)

**Task 4.1: Update Contact Form** (`frontend/src/components/contactV2/ContactForm.js`)

```javascript
// Add custom fields section to contact form
const [customFieldValues, setCustomFieldValues] = useState({});

// Fetch custom field definitions
useEffect(() => {
  const fetchCustomFields = async () => {
    const { data } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('object_type', 'contact')
      .eq('is_active', true)
      .order('display_order');
    
    setCustomFields(data);
  };
  
  fetchCustomFields();
}, [workspaceId]);

// Render custom fields dynamically
{customFields.map(field => (
  <FormControl key={field.id}>
    <FormLabel>{field.label}</FormLabel>
    {renderFieldInput(field)}
  </FormControl>
))}
```

---

## 🧪 Testing Plan

### Unit Tests

```javascript
describe('Custom Fields API', () => {
  test('Create custom field', async () => {
    const field = {
      name: 'loyalty_points',
      label: 'Loyalty Points',
      field_type: 'number',
      object_type: 'contact'
    };
    
    const response = await request(app)
      .post('/api/custom-fields')
      .send(field);
    
    expect(response.status).toBe(201);
    expect(response.body.name).toBe('loyalty_points');
  });
  
  test('Variable replacement with custom fields', () => {
    const template = 'Hi {{firstname}}, you have {{loyalty_points}} points!';
    const data = {
      firstname: 'John',
      loyalty_points: 1250
    };
    
    const result = replaceVariables(template, data);
    expect(result).toBe('Hi John, you have 1250 points!');
  });
});
```

### Integration Tests

1. **Create custom field via UI**
2. **Add value to contact**
3. **Use in email template**
4. **Send email and verify variable replacement**

---

## 📚 Documentation for Users

### User Guide: Creating Custom Fields

```markdown
# How to Create Custom Fields

## Step 1: Navigate to Settings
1. Click **Settings** in the sidebar
2. Select **Custom Objects & Fields**

## Step 2: Choose Object Type
- **Contact Fields**: Unique per contact (e.g., loyalty points)
- **Appointment Fields**: Per appointment (e.g., appointment type)
- **Workspace Fields**: Global for all contacts (e.g., company address)

## Step 3: Create Field
1. Click **+ New Field**
2. Enter field name (e.g., `loyalty_points`)
3. Choose field type (Text, Number, Date, etc.)
4. Click **Create**

## Step 4: Use in Templates
In your email/SMS templates, use:
```
Hi {{firstname}}, you have {{loyalty_points}} points!
```

The system will automatically replace `{{loyalty_points}}` with the actual value.
```

---

## 🚀 Deployment Checklist

- [ ] Run database migrations
- [ ] Deploy backend API changes
- [ ] Deploy frontend UI changes
- [ ] Update documentation
- [ ] Train support team
- [ ] Announce feature to users

---

## 📊 Success Metrics

- Number of custom fields created per workspace
- Usage rate in email/SMS templates
- User satisfaction score
- Support tickets related to custom fields

---

## 🔮 Future Enhancements

### Phase 2 Features
- [ ] Formula fields (calculated fields)
- [ ] Lookup fields (reference other objects)
- [ ] Validation rules
- [ ] Field dependencies
- [ ] Import/export custom fields
- [ ] Field usage analytics

---

**Status:** Ready for Implementation  
**Next Step:** Database migrations (Phase 1)

