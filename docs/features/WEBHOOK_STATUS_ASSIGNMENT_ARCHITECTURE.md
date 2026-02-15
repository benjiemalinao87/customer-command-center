# Webhook Optional Status Assignment - Complete Architecture Analysis

## Executive Summary

This document provides a comprehensive backend architecture analysis for implementing **optional status assignment to webhooks**. The feature will allow users to configure webhooks to automatically assign specific statuses (from status categories like "Lead Status", "Appointment Status", "Appointment Result") to contacts when they are created or updated via webhook.

---

## 1. Current Architecture Analysis

### 1.1 Database Schema Overview

#### Core Tables

**webhooks**
- Primary Key: `id` (UUID)
- Fields: `name`, `source`, `workspace_id`, `status`, `webhook_url`, `call_count`, `last_used`, `created_by`, `created_at`, `metadata`
- Purpose: Stores webhook configurations
- Location: Referenced in `/backend/src/routes/webhookRoutes.js` and `/cloudflare-workers/webhook-processor/src/handlers/webhook.js`

**status_categories**
```sql
CREATE TABLE public.status_categories (
  id SERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(workspace_id, name)
);
```
- Common categories: "Lead Status", "Appointment Status", "Appointment Result"
- Workspace-scoped with RLS policies

**status_options**
```sql
CREATE TABLE public.status_options (
  id SERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES public.status_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(category_id, name)
);
```
- Each status belongs to a category
- Can be marked as default
- Has display ordering

**contacts**
- Fields include: `lead_status_id`, `appointment_status_id`, `appointment_result_id` (all reference `status_options.id`)
- Already has foreign key relationships to status_options
- Workspace-scoped with RLS

**webhook_conditional_rules**
```sql
-- Inferred from code at frontend/src/components/webhook/EnhancedWebhookRulesPanel.js
CREATE TABLE webhook_conditional_rules (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_column_id UUID REFERENCES board_columns(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**webhook_rule_conditions**
```sql
-- Inferred from code
CREATE TABLE webhook_rule_conditions (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES webhook_conditional_rules(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  operator TEXT NOT NULL, -- equals, contains, in, etc.
  field_value TEXT,
  json_path TEXT
);
```

### 1.2 Webhook Processing Flow

#### Current Contact Creation Flow (Cloudflare Worker)

**Location**: `/cloudflare-workers/webhook-processor/src/handlers/webhook.js`

```javascript
// Step 1: Authenticate webhook (lines 370-380)
const webhook = await authenticateWebhook(webhookId, workspaceId, env);

// Step 2: Process field mappings (line 393)
const contactData = await processFieldMappings(payload, webhook.mappings, webhook, env);

// Step 3: Validate required fields (line 396)
const validation = validateContactData(contactData);

// Step 4: Create/update contact with advanced deduplication (lines 406-416)
const contactResult = await createOrUpdateContactAdvanced(contactData, webhook.workspace_id, {
  allowUpdate: true,
  updateFields: [],
  crmIdField: 'crm_id'
}, env);

// Step 4.5: Smart lead handling - Update existing or create new (lines 433-477)
// Uses lead_status, product, etc. from payload

// Step 5: Update webhook fields using stored procedure (lines 480-498)
await supabase.rpc('update_contact_webhook', {...});

// Step 6: Process webhook conditional rules (lines 501-514)
const ruleApplied = await assignContactByWebhookRule(contactWithWebhook, webhook.workspace_id, env);

// Step 7: Complete logging and notifications (lines 517-518)
await updateLogStatus(logId, 'success', null, env, contact.id, contactData);
```

#### Conditional Rules Processing

**Location**: `/cloudflare-workers/webhook-processor/src/handlers/webhookRules.js`

```javascript
export async function assignContactByWebhookRule(contact, workspaceId, env) {
  // Get webhook conditional rules for this webhook
  const { data: conditionalRules } = await supabase
    .from('webhook_conditional_rules')
    .select(`
      id, name, board_id, target_column_id, priority, is_active,
      webhook_rule_conditions!inner (id, field_name, operator, field_value, json_path)
    `)
    .eq('webhook_id', contact.webhook_id)
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  // Check each rule to find a match
  for (const rule of conditionalRules) {
    let ruleMatches = true;

    for (const condition of rule.webhook_rule_conditions) {
      const fieldValue = getFieldValue(contact, condition.field_name, condition.json_path);
      const conditionMatches = checkCondition(fieldValue, condition.operator, condition.field_value);

      if (!conditionMatches) {
        ruleMatches = false;
        break;
      }
    }

    if (ruleMatches) {
      // Assign contact to board column
      await assignContactToBoardColumn(contact, rule, supabase);
      return true; // Stop after first matching rule
    }
  }

  return false;
}
```

### 1.3 Backend API Routes

**Location**: `/backend/src/routes/webhookRoutes.js`

#### Key Endpoints:
- `POST /api/webhooks` - Create new webhook (lines 475-525)
- `GET /api/webhooks` - List webhooks for workspace (lines 531-560)
- `PATCH /api/webhooks/:id` - Update webhook (lines 566-622)
- `DELETE /api/webhooks/:id` - Delete webhook (lines 628-654)
- `POST /webhooks/:webhook_id` - Process webhook execution (lines 660-1117)
- `PUT /api/webhooks/:id/mappings` - Update field mappings (lines 1176-1236)

#### Current Webhook Update Logic (PATCH endpoint):
```javascript
router.patch('/:id', async (req, res) => {
  const { name, source, status, sample_payload } = req.body;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (source !== undefined) updateData.source = source;
  if (status !== undefined) updateData.status = status;

  // Store sample_payload in metadata
  if (sample_payload !== undefined) {
    const metadata = currentWebhook?.metadata || {};
    metadata.sample_payload = sample_payload;
    updateData.metadata = metadata;
  }

  await supabase
    .from('webhooks')
    .update(updateData)
    .eq('id', id)
    .eq('workspace_id', workspaceId);
});
```

---

## 2. Recommended Implementation Approach

### 2.1 Database Schema Changes

I recommend adding **direct foreign key fields** to the `webhooks` table for maximum simplicity and performance:

#### Option A: Direct Status Fields (RECOMMENDED)

**Advantages:**
- Simple and performant (no joins required)
- Easy to understand and maintain
- Direct relationship modeling
- Faster query performance
- Aligns with existing `contacts` table pattern

**Implementation:**

```sql
-- Migration: add_webhook_status_fields.sql

-- Add status assignment fields to webhooks table
ALTER TABLE public.webhooks
ADD COLUMN default_lead_status_id INTEGER REFERENCES public.status_options(id) ON DELETE SET NULL,
ADD COLUMN default_appointment_status_id INTEGER REFERENCES public.status_options(id) ON DELETE SET NULL,
ADD COLUMN default_appointment_result_id INTEGER REFERENCES public.status_options(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_webhooks_lead_status ON public.webhooks(default_lead_status_id) WHERE default_lead_status_id IS NOT NULL;
CREATE INDEX idx_webhooks_appointment_status ON public.webhooks(default_appointment_status_id) WHERE default_appointment_status_id IS NOT NULL;
CREATE INDEX idx_webhooks_appointment_result ON public.webhooks(default_appointment_result_id) WHERE default_appointment_result_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.webhooks.default_lead_status_id IS 'Optional default lead status to assign when contact is created/updated via this webhook';
COMMENT ON COLUMN public.webhooks.default_appointment_status_id IS 'Optional default appointment status to assign when contact is created/updated via this webhook';
COMMENT ON COLUMN public.webhooks.default_appointment_result_id IS 'Optional default appointment result to assign when contact is created/updated via this webhook';
```

#### Option B: Junction Table (Alternative - More Flexible)

**Advantages:**
- More flexible for future expansion
- Can add metadata per status assignment
- Can support multiple statuses per category
- Better for audit trails

**Disadvantages:**
- More complex queries (requires joins)
- Slower performance
- Over-engineered for current requirements

**Implementation:**

```sql
-- Migration: create_webhook_status_assignments.sql

CREATE TABLE public.webhook_status_assignments (
  id SERIAL PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status_option_id INTEGER NOT NULL REFERENCES public.status_options(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.status_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(webhook_id, category_id) -- Only one status per category per webhook
);

-- RLS policies
ALTER TABLE public.webhook_status_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow workspace members to read webhook_status_assignments"
  ON public.webhook_status_assignments FOR SELECT TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Allow workspace admins to manage webhook_status_assignments"
  ON public.webhook_status_assignments FOR ALL TO authenticated
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX idx_webhook_status_assignments_webhook ON public.webhook_status_assignments(webhook_id);
CREATE INDEX idx_webhook_status_assignments_workspace ON public.webhook_status_assignments(workspace_id);
```

**RECOMMENDATION: Use Option A (Direct Status Fields)** for the following reasons:
1. Simpler implementation
2. Better performance (no joins)
3. Easier to maintain
4. Matches existing `contacts` table pattern
5. Sufficient for current requirements
6. Can always migrate to junction table later if needed

---

### 2.2 Backend Processing Logic Changes

#### 2.2.1 Cloudflare Worker Enhancement

**Location**: `/cloudflare-workers/webhook-processor/src/handlers/webhook.js`

**Injection Point**: After Step 4 (contact creation) and before Step 6 (conditional rules)

```javascript
// NEW Step 4.75: Apply default webhook status assignments (if configured)
// Location: After line 498, before line 500
if (webhook.default_lead_status_id || webhook.default_appointment_status_id || webhook.default_appointment_result_id) {
  try {
    console.log('Applying default webhook status assignments');
    const statusUpdateStart = Date.now();
    performanceMetrics.processing_steps.status_assignment_start = statusUpdateStart;

    const statusUpdates = {};

    if (webhook.default_lead_status_id) {
      statusUpdates.lead_status_id = webhook.default_lead_status_id;
    }
    if (webhook.default_appointment_status_id) {
      statusUpdates.appointment_status_id = webhook.default_appointment_status_id;
    }
    if (webhook.default_appointment_result_id) {
      statusUpdates.appointment_result_id = webhook.default_appointment_result_id;
    }

    if (Object.keys(statusUpdates).length > 0) {
      const { error: statusError } = await supabase
        .from('contacts')
        .update(statusUpdates)
        .eq('id', contact.id);

      if (statusError) {
        console.error('Error applying webhook status assignments:', statusError);
        // Non-blocking error - continue processing
      } else {
        console.log(`Applied webhook status assignments to contact ${contact.id}:`, statusUpdates);

        // Update contact object for subsequent processing
        Object.assign(contact, statusUpdates);
      }
    }

    const statusUpdateEnd = Date.now();
    performanceMetrics.processing_steps.status_assignment_time = statusUpdateEnd - statusUpdateStart;

  } catch (statusAssignmentError) {
    console.error('Exception in webhook status assignment (non-blocking):', statusAssignmentError);
    // Don't fail the webhook for status assignment errors
  }
}
```

#### 2.2.2 Authentication Handler Enhancement

**Location**: `/cloudflare-workers/webhook-processor/src/services/auth.js`

Update the webhook authentication query to include status fields:

```javascript
// Current query (needs enhancement)
const { data: webhook, error } = await supabase
  .from('webhooks')
  .select('id, name, workspace_id, status, mappings')
  .eq('id', webhookId)
  .eq('workspace_id', workspaceId)
  .eq('status', 'active')
  .single();

// Enhanced query with status fields
const { data: webhook, error } = await supabase
  .from('webhooks')
  .select(`
    id,
    name,
    workspace_id,
    status,
    mappings,
    default_lead_status_id,
    default_appointment_status_id,
    default_appointment_result_id
  `)
  .eq('id', webhookId)
  .eq('workspace_id', workspaceId)
  .eq('status', 'active')
  .single();
```

#### 2.2.3 Processing Order and Priority

**Critical Decision: When should status assignment happen?**

**Recommended Order:**
1. **Field Mapping** (Step 2)
2. **Validation** (Step 3)
3. **Contact Creation/Update** (Step 4)
4. **Lead Processing** (Step 4.5)
5. **Webhook Fields Update** (Step 5)
6. **⭐ DEFAULT STATUS ASSIGNMENT** (NEW Step 4.75) ← **BEFORE** conditional rules
7. **Conditional Rules Processing** (Step 6)
8. **Logging** (Step 7)

**Rationale:**
- Status assignment happens **AFTER** contact creation so we have a contact ID
- Status assignment happens **BEFORE** conditional rules so:
  - Conditional rules can use the assigned status in their conditions
  - Conditional rules can override the default status if needed (higher specificity)
  - Maintains backward compatibility with existing rules

**Example Scenario:**
```
Webhook 1: Default Status = "New Lead"
Conditional Rule: If lead_source = "Facebook" → Move to "Facebook Leads" column

Flow:
1. Contact created
2. Default status "New Lead" applied
3. Conditional rule checks lead_source
4. If matched, contact moved to board AND can override status if needed
```

---

### 2.3 API Endpoint Specifications

#### 2.3.1 Update Webhook Endpoint Enhancement

**Location**: `/backend/src/routes/webhookRoutes.js` (line 566)

```javascript
/**
 * Update a webhook
 * PATCH /api/webhooks/:id
 *
 * NEW: Supports optional status assignments
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      source,
      status,
      sample_payload,
      default_lead_status_id,
      default_appointment_status_id,
      default_appointment_result_id
    } = req.body;

    const workspaceId = req.workspace?.id || req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    if (!id) {
      return res.status(400).json({ error: 'Webhook ID is required' });
    }

    // Validate status IDs if provided
    if (default_lead_status_id || default_appointment_status_id || default_appointment_result_id) {
      const statusIds = [
        default_lead_status_id,
        default_appointment_status_id,
        default_appointment_result_id
      ].filter(Boolean);

      if (statusIds.length > 0) {
        // Verify all status IDs belong to this workspace
        const { data: validStatuses, error: validationError } = await supabase
          .from('status_options')
          .select('id, category_id, status_categories!inner(name)')
          .in('id', statusIds)
          .eq('workspace_id', workspaceId);

        if (validationError) {
          throw validationError;
        }

        if (!validStatuses || validStatuses.length !== statusIds.length) {
          return res.status(400).json({
            error: 'Invalid status IDs - must belong to current workspace'
          });
        }

        // Additional validation: Ensure status belongs to correct category
        const categoryValidation = {
          'Lead Status': default_lead_status_id,
          'Appointment Status': default_appointment_status_id,
          'Appointment Result': default_appointment_result_id
        };

        for (const status of validStatuses) {
          const categoryName = status.status_categories.name;
          const expectedStatusId = categoryValidation[categoryName];

          if (expectedStatusId && status.id !== expectedStatusId) {
            return res.status(400).json({
              error: `Status ID ${status.id} does not belong to category "${categoryName}"`
            });
          }
        }
      }
    }

    // Create update object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (source !== undefined) updateData.source = source;
    if (status !== undefined) updateData.status = status;

    // Handle status assignments (NULL allowed for clearing)
    if (default_lead_status_id !== undefined) {
      updateData.default_lead_status_id = default_lead_status_id || null;
    }
    if (default_appointment_status_id !== undefined) {
      updateData.default_appointment_status_id = default_appointment_status_id || null;
    }
    if (default_appointment_result_id !== undefined) {
      updateData.default_appointment_result_id = default_appointment_result_id || null;
    }

    // Handle metadata
    if (sample_payload !== undefined) {
      const { data: currentWebhook } = await supabase
        .from('webhooks')
        .select('metadata')
        .eq('id', id)
        .eq('workspace_id', workspaceId)
        .single();

      const metadata = currentWebhook?.metadata || {};
      metadata.sample_payload = sample_payload;
      updateData.metadata = metadata;
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select(`
        *,
        default_lead_status:status_options!webhooks_default_lead_status_id_fkey(id, name, color),
        default_appointment_status:status_options!webhooks_default_appointment_status_id_fkey(id, name, color),
        default_appointment_result:status_options!webhooks_default_appointment_result_id_fkey(id, name, color)
      `)
      .single();

    if (error) throw error;

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    res.json(webhook);

  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({
      error: 'Failed to update webhook',
      details: error.message
    });
  }
});
```

#### 2.3.2 Get Webhooks Endpoint Enhancement

**Location**: `/backend/src/routes/webhookRoutes.js` (line 531)

```javascript
/**
 * Get all webhooks for a workspace
 * GET /api/webhooks
 *
 * ENHANCED: Returns status assignments with webhook data
 */
router.get('/', async (req, res) => {
  try {
    const workspaceId = req.workspace?.id;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select(`
        *,
        field_mappings (mappings),
        webhook_logs (count),
        default_lead_status:status_options!webhooks_default_lead_status_id_fkey(
          id,
          name,
          color,
          status_categories(name)
        ),
        default_appointment_status:status_options!webhooks_default_appointment_status_id_fkey(
          id,
          name,
          color,
          status_categories(name)
        ),
        default_appointment_result:status_options!webhooks_default_appointment_result_id_fkey(
          id,
          name,
          color,
          status_categories(name)
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(webhooks || []);

  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});
```

#### 2.3.3 New Helper Endpoint: Get Available Statuses

```javascript
/**
 * Get available status options for webhook assignment
 * GET /api/webhooks/status-options
 *
 * Returns status options grouped by category for the current workspace
 */
router.get('/status-options', async (req, res) => {
  try {
    const workspaceId = req.workspace?.id;

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // Get all status categories and their options for this workspace
    const { data: categories, error: categoriesError } = await supabase
      .from('status_categories')
      .select(`
        id,
        name,
        description,
        status_options (
          id,
          name,
          color,
          is_default,
          display_order
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('name');

    if (categoriesError) throw categoriesError;

    // Format for easy consumption
    const statusOptions = categories.reduce((acc, category) => {
      acc[category.name] = {
        category_id: category.id,
        description: category.description,
        options: (category.status_options || []).sort((a, b) =>
          (a.display_order || 999) - (b.display_order || 999)
        )
      };
      return acc;
    }, {});

    res.json(statusOptions);

  } catch (error) {
    console.error('Error fetching status options:', error);
    res.status(500).json({ error: 'Failed to fetch status options' });
  }
});
```

---

## 3. Edge Cases and Error Handling

### 3.1 Critical Edge Cases

#### Case 1: Status Option Deleted
**Scenario**: User deletes a status option that's assigned as default in a webhook

**Solution**: Foreign key with `ON DELETE SET NULL`
```sql
ALTER TABLE public.webhooks
ADD COLUMN default_lead_status_id INTEGER REFERENCES public.status_options(id) ON DELETE SET NULL;
```

**Behavior**:
- Webhook continues to work
- Status field becomes NULL (no assignment)
- No webhook processing failures
- Graceful degradation

#### Case 2: Status Option Changed to Different Category
**Scenario**: Admin changes a status option from "Lead Status" to "Appointment Status" category

**Prevention**: Database constraint
```sql
-- Add check constraint to prevent category mismatch
ALTER TABLE public.webhooks
ADD CONSTRAINT check_lead_status_category
CHECK (
  default_lead_status_id IS NULL OR
  default_lead_status_id IN (
    SELECT so.id
    FROM status_options so
    JOIN status_categories sc ON so.category_id = sc.id
    WHERE sc.name = 'Lead Status'
  )
);
```

**Alternative**: Validate in application layer (more flexible)

#### Case 3: Webhook Has No Default Status Set
**Scenario**: Webhook has NULL for all status fields

**Behavior**:
- Processing continues normally
- No status assignment occurs
- Maintains backward compatibility
- Conditional rules still work

**Code**:
```javascript
// Graceful handling - no action if no statuses configured
if (webhook.default_lead_status_id || webhook.default_appointment_status_id || webhook.default_appointment_result_id) {
  // Only process if at least one status is configured
  applyStatusAssignments();
}
```

#### Case 4: Conditional Rule Conflicts with Default Status
**Scenario**:
- Webhook has default status "New Lead"
- Conditional rule also tries to set status to "Qualified"

**Recommended Behavior**: Last write wins (conditional rules override default)

**Processing Order**:
1. Default status applied → Contact has "New Lead"
2. Conditional rule executes → Contact updated to "Qualified"
3. Final state: "Qualified"

**Rationale**: Conditional rules are more specific than defaults

**Alternative**: Add priority flag to control override behavior

#### Case 5: Contact Already Has Status
**Scenario**: Updating existing contact that already has a status set

**Recommended Behavior**:
- **For NEW contacts**: Always apply webhook default status
- **For EXISTING contacts**: Skip status assignment (preserve existing)

**Code**:
```javascript
// Only apply default status for NEW contacts
if (contactResult.isNew) {
  if (webhook.default_lead_status_id) {
    statusUpdates.lead_status_id = webhook.default_lead_status_id;
  }
  // ... other status fields
}
```

**Alternative**: Add webhook configuration option:
```javascript
// Future enhancement
{
  "status_assignment_mode": "new_contacts_only" | "always" | "if_empty"
}
```

### 3.2 Error Handling Strategy

#### Non-Blocking Errors
Status assignment should NEVER fail the webhook:

```javascript
try {
  await applyWebhookStatusAssignments(contact, webhook);
} catch (error) {
  console.error('Status assignment failed (non-blocking):', error);
  // Log error but continue processing
  // Webhook still succeeds
}
```

#### Validation Errors
Prevent invalid configurations before they cause issues:

```javascript
// Backend validation
const validateStatusAssignment = async (webhookId, statusId, categoryName) => {
  const { data: status, error } = await supabase
    .from('status_options')
    .select('id, category_id, status_categories!inner(name)')
    .eq('id', statusId)
    .single();

  if (error || !status) {
    throw new Error('Invalid status ID');
  }

  if (status.status_categories.name !== categoryName) {
    throw new Error(`Status must belong to ${categoryName} category`);
  }

  return true;
};
```

#### Logging and Monitoring

```javascript
// Enhanced logging for status assignments
console.log('Webhook Status Assignment:', {
  webhook_id: webhook.id,
  contact_id: contact.id,
  assignments: {
    lead_status: webhook.default_lead_status_id,
    appointment_status: webhook.default_appointment_status_id,
    appointment_result: webhook.default_appointment_result_id
  },
  is_new_contact: contactResult.isNew,
  timestamp: new Date().toISOString()
});
```

---

## 4. Performance Implications

### 4.1 Query Performance

#### Current Query (Before)
```javascript
const { data: webhook } = await supabase
  .from('webhooks')
  .select('id, name, workspace_id, status, mappings')
  .eq('id', webhookId)
  .single();
```

#### Enhanced Query (After)
```javascript
const { data: webhook } = await supabase
  .from('webhooks')
  .select(`
    id, name, workspace_id, status, mappings,
    default_lead_status_id,
    default_appointment_status_id,
    default_appointment_result_id
  `)
  .eq('id', webhookId)
  .single();
```

**Performance Impact**:
- ✅ **Negligible** - Adding 3 INTEGER fields to SELECT
- No joins required (direct foreign keys)
- Same number of database roundtrips
- Column indexes already exist on primary keys

### 4.2 Status Assignment Performance

#### Additional Database Operation
```javascript
// New UPDATE query
const { error } = await supabase
  .from('contacts')
  .update({
    lead_status_id: webhook.default_lead_status_id,
    appointment_status_id: webhook.default_appointment_status_id,
    appointment_result_id: webhook.default_appointment_result_id
  })
  .eq('id', contact.id);
```

**Performance Impact**:
- Single UPDATE query (1 roundtrip)
- Indexed on primary key (`contact.id`)
- Estimated: +5-10ms per webhook execution
- Still well within sub-50ms target

**Optimization**: Combine with webhook field update
```javascript
// BEFORE: Two separate updates
await supabase.rpc('update_contact_webhook', {...}); // Update 1
await supabase.from('contacts').update(statusUpdates).eq('id', contact.id); // Update 2

// OPTIMIZED: Single stored procedure
await supabase.rpc('update_contact_webhook_with_status', {
  p_contact_id: contact.id,
  p_webhook_id: webhook.id,
  p_webhook_name: webhook.name,
  p_lead_status_id: webhook.default_lead_status_id,
  p_appointment_status_id: webhook.default_appointment_status_id,
  p_appointment_result_id: webhook.default_appointment_result_id
});
```

### 4.3 Caching Considerations

#### Webhook Cache Enhancement
```javascript
// Cache webhook configuration including status assignments
const cacheKey = `webhook:${webhookId}`;
const cachedWebhook = await env.WEBHOOK_CACHE.get(cacheKey);

if (!cachedWebhook) {
  const webhook = await fetchWebhookWithStatuses(webhookId);
  await env.WEBHOOK_CACHE.put(cacheKey, JSON.stringify(webhook), {
    expirationTtl: 300 // 5 minutes
  });
}
```

**Cache Invalidation**: When webhook is updated
```javascript
// Backend: After webhook update
await invalidateWebhookCache(webhookId);
```

### 4.4 Performance Benchmarks (Estimated)

| Operation | Before | After | Impact |
|-----------|--------|-------|--------|
| Webhook Auth Query | 15ms | 15ms | 0ms |
| Contact Creation | 45ms | 45ms | 0ms |
| Status Assignment | 0ms | 8ms | +8ms |
| Conditional Rules | 25ms | 25ms | 0ms |
| **Total Processing** | **120ms** | **128ms** | **+8ms** |

**Conclusion**: Performance impact is minimal and acceptable

---

## 5. Migration Strategy

### 5.1 Database Migration SQL

```sql
-- Migration: 20250113_add_webhook_status_assignments.sql

-- Step 1: Add status assignment columns to webhooks table
ALTER TABLE public.webhooks
ADD COLUMN IF NOT EXISTS default_lead_status_id INTEGER,
ADD COLUMN IF NOT EXISTS default_appointment_status_id INTEGER,
ADD COLUMN IF NOT EXISTS default_appointment_result_id INTEGER;

-- Step 2: Add foreign key constraints
ALTER TABLE public.webhooks
ADD CONSTRAINT fk_webhooks_lead_status
  FOREIGN KEY (default_lead_status_id)
  REFERENCES public.status_options(id)
  ON DELETE SET NULL,
ADD CONSTRAINT fk_webhooks_appointment_status
  FOREIGN KEY (default_appointment_status_id)
  REFERENCES public.status_options(id)
  ON DELETE SET NULL,
ADD CONSTRAINT fk_webhooks_appointment_result
  FOREIGN KEY (default_appointment_result_id)
  REFERENCES public.status_options(id)
  ON DELETE SET NULL;

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhooks_lead_status
  ON public.webhooks(default_lead_status_id)
  WHERE default_lead_status_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhooks_appointment_status
  ON public.webhooks(default_appointment_status_id)
  WHERE default_appointment_status_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhooks_appointment_result
  ON public.webhooks(default_appointment_result_id)
  WHERE default_appointment_result_id IS NOT NULL;

-- Step 4: Add column comments for documentation
COMMENT ON COLUMN public.webhooks.default_lead_status_id IS
  'Optional default lead status to assign when contact is created/updated via this webhook. References status_options.id from Lead Status category.';

COMMENT ON COLUMN public.webhooks.default_appointment_status_id IS
  'Optional default appointment status to assign when contact is created/updated via this webhook. References status_options.id from Appointment Status category.';

COMMENT ON COLUMN public.webhooks.default_appointment_result_id IS
  'Optional default appointment result to assign when contact is created/updated via this webhook. References status_options.id from Appointment Result category.';

-- Step 5: Verify no data corruption
DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  -- Check for any invalid status assignments (shouldn't happen, but verify)
  SELECT COUNT(*) INTO invalid_count
  FROM public.webhooks w
  WHERE (
    (w.default_lead_status_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.status_options WHERE id = w.default_lead_status_id
    ))
    OR
    (w.default_appointment_status_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.status_options WHERE id = w.default_appointment_status_id
    ))
    OR
    (w.default_appointment_result_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.status_options WHERE id = w.default_appointment_result_id
    ))
  );

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Found % webhooks with invalid status assignments', invalid_count;
  END IF;

  RAISE NOTICE 'Migration completed successfully. All webhooks validated.';
END $$;
```

### 5.2 Rollback Plan

```sql
-- Rollback: 20250113_rollback_webhook_status_assignments.sql

-- Remove indexes
DROP INDEX IF EXISTS public.idx_webhooks_lead_status;
DROP INDEX IF EXISTS public.idx_webhooks_appointment_status;
DROP INDEX IF EXISTS public.idx_webhooks_appointment_result;

-- Remove foreign key constraints
ALTER TABLE public.webhooks
DROP CONSTRAINT IF EXISTS fk_webhooks_lead_status,
DROP CONSTRAINT IF EXISTS fk_webhooks_appointment_status,
DROP CONSTRAINT IF EXISTS fk_webhooks_appointment_result;

-- Remove columns
ALTER TABLE public.webhooks
DROP COLUMN IF EXISTS default_lead_status_id,
DROP COLUMN IF EXISTS default_appointment_status_id,
DROP COLUMN IF EXISTS default_appointment_result_id;

RAISE NOTICE 'Webhook status assignments rolled back successfully';
```

### 5.3 Zero-Downtime Migration Steps

1. **Pre-Migration Verification**
   ```sql
   -- Check webhook count
   SELECT COUNT(*) FROM webhooks;

   -- Check status_options integrity
   SELECT category_id, COUNT(*)
   FROM status_options
   GROUP BY category_id;
   ```

2. **Deploy Database Changes**
   - Run migration during low-traffic period
   - All columns are NULLABLE - no data changes required
   - Indexes created with `IF NOT EXISTS` - idempotent

3. **Deploy Backend Code**
   - Update Cloudflare Worker first (handles webhook processing)
   - Update Node.js backend second (handles webhook management)
   - Both are backward compatible (NULL values work)

4. **Deploy Frontend Code**
   - Add UI for status assignment selection
   - No breaking changes - feature is optional

5. **Post-Migration Verification**
   ```sql
   -- Verify columns exist
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'webhooks'
   AND column_name LIKE 'default_%_status_id';

   -- Verify constraints
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'webhooks'
   AND constraint_name LIKE 'fk_webhooks_%';
   ```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```javascript
// Test: Status assignment for new contact
describe('Webhook Status Assignment', () => {
  it('should assign default lead status to new contact', async () => {
    const webhook = {
      id: 'webhook-123',
      workspace_id: 'workspace-456',
      default_lead_status_id: 5, // "New Lead" status
      default_appointment_status_id: null,
      default_appointment_result_id: null
    };

    const contact = await createOrUpdateContactAdvanced(contactData, webhook.workspace_id);

    // Apply status assignments
    await applyWebhookStatusAssignments(contact, webhook);

    // Verify
    const { data: updatedContact } = await supabase
      .from('contacts')
      .select('lead_status_id')
      .eq('id', contact.id)
      .single();

    expect(updatedContact.lead_status_id).toBe(5);
  });

  it('should not assign status to existing contact', async () => {
    // Test preserving existing status
  });

  it('should handle NULL status gracefully', async () => {
    // Test webhook with no status configured
  });

  it('should handle invalid status ID gracefully', async () => {
    // Test deleted status (foreign key NULL)
  });
});
```

### 6.2 Integration Tests

```javascript
// Test: End-to-end webhook processing with status assignment
describe('Webhook Processing Integration', () => {
  it('should process webhook with status assignment', async () => {
    // 1. Create status option
    const { data: statusOption } = await supabase
      .from('status_options')
      .insert({
        workspace_id: 'workspace-123',
        category_id: leadStatusCategoryId,
        name: 'Test Status',
        color: '#FF0000'
      })
      .select()
      .single();

    // 2. Create webhook with status assignment
    const { data: webhook } = await supabase
      .from('webhooks')
      .insert({
        workspace_id: 'workspace-123',
        name: 'Test Webhook',
        default_lead_status_id: statusOption.id
      })
      .select()
      .single();

    // 3. Send test payload
    const response = await fetch(`/webhooks/${webhook.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': 'workspace-123'
      },
      body: JSON.stringify({
        firstname: 'John',
        lastname: 'Doe',
        phone_number: '+1234567890',
        email: 'john@example.com'
      })
    });

    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result.success).toBe(true);

    // 4. Verify contact has status assigned
    const { data: contact } = await supabase
      .from('contacts')
      .select('lead_status_id')
      .eq('id', result.contact_id)
      .single();

    expect(contact.lead_status_id).toBe(statusOption.id);
  });
});
```

### 6.3 Load Testing

```javascript
// Test: Performance under load with status assignments
describe('Performance Testing', () => {
  it('should handle 1000 webhooks/sec with status assignment', async () => {
    const webhookUrl = `/webhooks/${webhookId}`;
    const concurrency = 100;
    const totalRequests = 1000;

    const startTime = Date.now();

    const results = await Promise.all(
      Array(totalRequests).fill().map(() =>
        fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(testPayload)
        })
      )
    );

    const endTime = Date.now();
    const duration = endTime - startTime;
    const requestsPerSecond = (totalRequests / duration) * 1000;

    console.log(`Processed ${totalRequests} requests in ${duration}ms`);
    console.log(`Throughput: ${requestsPerSecond} req/sec`);

    // Verify all succeeded
    const successCount = results.filter(r => r.ok).length;
    expect(successCount).toBe(totalRequests);

    // Verify average response time
    const avgResponseTime = duration / totalRequests;
    expect(avgResponseTime).toBeLessThan(50); // Sub-50ms requirement
  });
});
```

---

## 7. Security Considerations

### 7.1 Workspace Isolation

**Critical**: Status assignments must respect workspace boundaries

```javascript
// Validation: Ensure status belongs to webhook's workspace
const validateStatusAssignment = async (webhookId, statusId) => {
  const { data: result, error } = await supabase
    .from('webhooks')
    .select(`
      workspace_id,
      status_options!inner(workspace_id)
    `)
    .eq('webhooks.id', webhookId)
    .eq('status_options.id', statusId)
    .single();

  if (error || !result) {
    throw new Error('Invalid status assignment');
  }

  if (result.workspace_id !== result.status_options.workspace_id) {
    throw new Error('Status does not belong to webhook workspace');
  }

  return true;
};
```

### 7.2 RLS Policies

Existing RLS policies on `webhooks` and `status_options` tables already handle:
- Users can only see webhooks in their workspace
- Users can only assign statuses from their workspace
- Admin-level permissions for webhook management

**No additional RLS changes needed** - existing policies cover new fields

### 7.3 Input Validation

```javascript
// Backend validation for status assignment
const validateWebhookStatusUpdate = (statusIds, workspaceId) => {
  // Ensure status IDs are integers
  const validIds = statusIds.every(id =>
    id === null || (Number.isInteger(id) && id > 0)
  );

  if (!validIds) {
    throw new Error('Invalid status ID format');
  }

  // Verify workspace ownership (via database query)
  // ...
};
```

### 7.4 Audit Trail

```javascript
// Log status assignments for audit
const auditStatusAssignment = async (webhookId, contactId, statusAssignments) => {
  await supabase
    .from('audit_logs')
    .insert({
      event_type: 'webhook_status_assigned',
      webhook_id: webhookId,
      contact_id: contactId,
      metadata: {
        assignments: statusAssignments,
        timestamp: new Date().toISOString()
      }
    });
};
```

---

## 8. Documentation Updates Required

### 8.1 API Documentation

Update `/backend/src/docs/webhooks.js`:
```javascript
/**
 * @swagger
 * components:
 *   schemas:
 *     Webhook:
 *       properties:
 *         default_lead_status_id:
 *           type: integer
 *           nullable: true
 *           description: Optional default lead status to assign to contacts
 *         default_appointment_status_id:
 *           type: integer
 *           nullable: true
 *           description: Optional default appointment status to assign
 *         default_appointment_result_id:
 *           type: integer
 *           nullable: true
 *           description: Optional default appointment result to assign
 */
```

### 8.2 User Documentation

Create `/docs/webhook-status-assignment.md`:
```markdown
# Webhook Status Assignment

## Overview
Configure webhooks to automatically assign statuses to contacts when they are created.

## Setup
1. Navigate to Webhooks configuration
2. Select a webhook to edit
3. Choose optional default statuses from dropdowns:
   - Lead Status (e.g., "New", "Qualified")
   - Appointment Status (e.g., "Scheduled", "Confirmed")
   - Appointment Result (e.g., "Completed", "No Show")
4. Save webhook configuration

## Behavior
- Status is assigned **only for NEW contacts**
- Existing contacts preserve their current status
- Status assignment happens **before** conditional rules
- If webhook has no status configured, no assignment occurs
- If assigned status is deleted, webhook continues to work without assignment

## Examples
[Include screenshots and use cases]
```

### 8.3 Developer Documentation

Update `CLAUDE.md`:
```markdown
## Webhook Status Assignment Feature

### Database Schema
- `webhooks.default_lead_status_id` - Optional lead status
- `webhooks.default_appointment_status_id` - Optional appointment status
- `webhooks.default_appointment_result_id` - Optional appointment result

### Processing Flow
1. Contact created/updated
2. Default webhook status applied (if configured)
3. Conditional rules processed
4. Final status determined by last write

### API Endpoints
- PATCH /api/webhooks/:id - Update webhook with status assignments
- GET /api/webhooks/status-options - Get available statuses

### Code References
- Cloudflare Worker: `/cloudflare-workers/webhook-processor/src/handlers/webhook.js`
- Backend API: `/backend/src/routes/webhookRoutes.js`
```

---

## 9. Implementation Checklist

### Phase 1: Database (Week 1)
- [ ] Create migration SQL script
- [ ] Test migration on staging environment
- [ ] Verify foreign key constraints
- [ ] Create rollback script
- [ ] Run migration on production
- [ ] Verify no data corruption

### Phase 2: Backend API (Week 1-2)
- [ ] Update webhook PATCH endpoint
- [ ] Update webhook GET endpoint (include status fields)
- [ ] Create status-options GET endpoint
- [ ] Add validation logic
- [ ] Write unit tests
- [ ] Update API documentation

### Phase 3: Cloudflare Worker (Week 2)
- [ ] Update webhook authentication query
- [ ] Implement status assignment logic
- [ ] Add performance tracking
- [ ] Handle error cases gracefully
- [ ] Add logging
- [ ] Write integration tests

### Phase 4: Frontend (Week 2-3)
- [ ] Add status dropdowns to webhook configuration UI
- [ ] Fetch available status options
- [ ] Handle NULL values (no selection)
- [ ] Add validation
- [ ] Update webhook list view to show assigned statuses
- [ ] Add tooltips/help text

### Phase 5: Testing (Week 3)
- [ ] Unit tests (backend and worker)
- [ ] Integration tests (end-to-end)
- [ ] Load tests (performance validation)
- [ ] Security tests (workspace isolation)
- [ ] Edge case testing

### Phase 6: Documentation (Week 3-4)
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Update developer documentation
- [ ] Create migration notes
- [ ] Record demo video

### Phase 7: Deployment (Week 4)
- [ ] Deploy database migration
- [ ] Deploy Cloudflare Worker updates
- [ ] Deploy backend API updates
- [ ] Deploy frontend updates
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback

---

## 10. Recommended Next Steps

### Immediate Actions
1. **Review and Approve**: Have team review this architecture document
2. **Create Database Migration**: Write and test the SQL migration script
3. **Prototype Backend Changes**: Implement PATCH endpoint enhancement
4. **Prototype Worker Changes**: Add status assignment logic to webhook handler

### Short-term Goals
1. Complete Phase 1-3 (Backend and Worker implementation)
2. Test on staging environment with real webhooks
3. Measure performance impact
4. Iterate based on findings

### Long-term Enhancements
1. **Conditional Status Assignment**: Allow status override based on field values
2. **Status Assignment History**: Track when and why status was assigned
3. **Bulk Status Assignment**: Update existing contacts retroactively
4. **Status Assignment Analytics**: Report on webhook status assignment patterns

---

## 11. Conclusion

### Summary of Recommendations

1. **Database Schema**: Use direct foreign key fields on `webhooks` table (Option A)
   - Simple, performant, maintainable
   - Three new columns: `default_lead_status_id`, `default_appointment_status_id`, `default_appointment_result_id`

2. **Processing Order**: Apply status BEFORE conditional rules
   - Allows conditional rules to override defaults
   - Maintains backward compatibility

3. **Contact Targeting**: Apply status ONLY to NEW contacts
   - Preserves existing contact statuses
   - Prevents unwanted overrides

4. **Error Handling**: Non-blocking, graceful degradation
   - Webhook succeeds even if status assignment fails
   - Comprehensive logging for debugging

5. **Performance**: Minimal impact (+8ms estimated)
   - Single UPDATE query
   - Indexed foreign keys
   - Well within sub-50ms target

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Performance degradation | Low | Medium | Load testing before production |
| Data corruption | Low | High | Foreign key constraints + validation |
| Workspace isolation breach | Low | Critical | Existing RLS policies + validation |
| Status assignment errors | Medium | Low | Non-blocking error handling |
| User confusion | Medium | Low | Clear UI and documentation |

### Success Criteria

- ✅ Sub-50ms webhook processing time maintained
- ✅ Zero webhook failures due to status assignment
- ✅ 100% workspace isolation enforced
- ✅ Backward compatible with existing webhooks
- ✅ Conditional rules continue to work as expected
- ✅ Easy to configure and understand for users

---

**Document Version**: 1.0
**Last Updated**: January 13, 2025
**Author**: Backend Architecture Analysis
**Status**: Ready for Implementation Review
