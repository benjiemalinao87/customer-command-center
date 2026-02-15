# Webhook Status Assignment - Quick Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing optional status assignment to webhooks.

## Files Created
1. `/WEBHOOK_STATUS_ASSIGNMENT_ARCHITECTURE.md` - Complete architectural analysis (200KB detailed specification)
2. `/supabase/migrations/20250113_add_webhook_status_assignments.sql` - Database migration
3. `/supabase/migrations/20250113_rollback_webhook_status_assignments.sql` - Rollback script

---

## Implementation Steps

### Phase 1: Database Migration (30 minutes)

#### 1.1 Review Migration
```bash
cat supabase/migrations/20250113_add_webhook_status_assignments.sql
```

#### 1.2 Test on Staging
```bash
# Connect to staging database
psql $STAGING_DATABASE_URL -f supabase/migrations/20250113_add_webhook_status_assignments.sql

# Verify columns created
psql $STAGING_DATABASE_URL -c "\d webhooks"
```

#### 1.3 Deploy to Production
```bash
# Backup database first
pg_dump $PRODUCTION_DATABASE_URL > webhook_status_backup_$(date +%Y%m%d).sql

# Run migration
psql $PRODUCTION_DATABASE_URL -f supabase/migrations/20250113_add_webhook_status_assignments.sql
```

---

### Phase 2: Cloudflare Worker Updates (2 hours)

#### 2.1 Update Webhook Authentication Query

**File**: `/cloudflare-workers/webhook-processor/src/services/auth.js`

**Change** (around line 20):
```javascript
// BEFORE
const { data: webhook, error } = await supabase
  .from('webhooks')
  .select('id, name, workspace_id, status, mappings')
  .eq('id', webhookId)
  .single();

// AFTER
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
  .single();
```

#### 2.2 Add Status Assignment Logic

**File**: `/cloudflare-workers/webhook-processor/src/handlers/webhook.js`

**Insert** after line 498 (after `update_contact_webhook` RPC call):

```javascript
// NEW: Step 4.75 - Apply default webhook status assignments (if configured)
if (webhook.default_lead_status_id || webhook.default_appointment_status_id || webhook.default_appointment_result_id) {
  try {
    console.log('Applying default webhook status assignments');
    const statusUpdateStart = Date.now();
    performanceMetrics.processing_steps.status_assignment_start = statusUpdateStart;

    // Only assign statuses for NEW contacts to preserve existing data
    if (contactResult.isNew) {
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
    } else {
      console.log('Skipping status assignment - contact already exists');
    }

    const statusUpdateEnd = Date.now();
    performanceMetrics.processing_steps.status_assignment_time = statusUpdateEnd - statusUpdateStart;

  } catch (statusAssignmentError) {
    console.error('Exception in webhook status assignment (non-blocking):', statusAssignmentError);
    // Don't fail the webhook for status assignment errors
  }
}
```

---

### Phase 3: Backend API Updates (3 hours)

#### 3.1 Update PATCH /api/webhooks/:id Endpoint

**File**: `/backend/src/routes/webhookRoutes.js`

**Modify** the PATCH endpoint (starting at line 566) to accept new fields:

```javascript
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      source,
      status,
      sample_payload,
      default_lead_status_id,           // NEW
      default_appointment_status_id,     // NEW
      default_appointment_result_id      // NEW
    } = req.body;

    const workspaceId = req.workspace?.id || req.headers['x-workspace-id'];

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // Validate status IDs if provided
    if (default_lead_status_id || default_appointment_status_id || default_appointment_result_id) {
      const statusIds = [
        default_lead_status_id,
        default_appointment_status_id,
        default_appointment_result_id
      ].filter(id => id !== null && id !== undefined);

      if (statusIds.length > 0) {
        // Verify all status IDs belong to this workspace
        const { data: validStatuses, error: validationError } = await supabase
          .from('status_options')
          .select('id, workspace_id')
          .in('id', statusIds)
          .eq('workspace_id', workspaceId);

        if (validationError) throw validationError;

        if (!validStatuses || validStatuses.length !== statusIds.length) {
          return res.status(400).json({
            error: 'Invalid status IDs - must belong to current workspace'
          });
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

    // Handle metadata (existing code)
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
      .select()
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

#### 3.2 Update GET /api/webhooks Endpoint

**Modify** the GET endpoint (starting at line 531) to include status information:

```javascript
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
        default_lead_status:status_options!webhooks_default_lead_status_id_fkey(id, name, color),
        default_appointment_status:status_options!webhooks_default_appointment_status_id_fkey(id, name, color),
        default_appointment_result:status_options!webhooks_default_appointment_result_id_fkey(id, name, color)
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

#### 3.3 Add New GET /api/webhooks/status-options Endpoint

**Add** after the GET /api/webhooks endpoint:

```javascript
/**
 * Get available status options for webhook assignment
 * GET /api/webhooks/status-options
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

### Phase 4: Frontend Updates (4 hours)

#### 4.1 Add Status Selection to Webhook Configuration

**File**: `/frontend/src/components/webhook/WebhookPanel.js` (or create new component)

**Add** status selection dropdowns:

```jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';

const WebhookStatusConfiguration = ({ webhookId, currentStatuses, onUpdate }) => {
  const [statusOptions, setStatusOptions] = useState({});
  const [selectedStatuses, setSelectedStatuses] = useState({
    default_lead_status_id: currentStatuses?.default_lead_status_id || null,
    default_appointment_status_id: currentStatuses?.default_appointment_status_id || null,
    default_appointment_result_id: currentStatuses?.default_appointment_result_id || null
  });

  useEffect(() => {
    fetchStatusOptions();
  }, []);

  const fetchStatusOptions = async () => {
    try {
      const { data, error } = await supabase
        .from('status_categories')
        .select(`
          id,
          name,
          status_options (id, name, color, display_order)
        `)
        .order('name');

      if (error) throw error;

      const formatted = {};
      data.forEach(category => {
        formatted[category.name] = category.status_options.sort(
          (a, b) => (a.display_order || 999) - (b.display_order || 999)
        );
      });

      setStatusOptions(formatted);
    } catch (error) {
      console.error('Error fetching status options:', error);
    }
  };

  const handleStatusChange = async (field, value) => {
    const updated = { ...selectedStatuses, [field]: value || null };
    setSelectedStatuses(updated);

    // Update webhook
    if (onUpdate) {
      onUpdate(updated);
    }
  };

  return (
    <Box>
      <Text fontSize="md" fontWeight="semibold" mb={2}>
        Optional Status Assignments
      </Text>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Automatically assign statuses to new contacts created via this webhook
      </Text>

      <VStack spacing={4} align="stretch">
        {/* Lead Status */}
        <FormControl>
          <FormLabel>Default Lead Status</FormLabel>
          <Select
            value={selectedStatuses.default_lead_status_id || ''}
            onChange={(e) => handleStatusChange('default_lead_status_id', e.target.value)}
            placeholder="None (no auto-assignment)"
          >
            {statusOptions['Lead Status']?.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Appointment Status */}
        <FormControl>
          <FormLabel>Default Appointment Status</FormLabel>
          <Select
            value={selectedStatuses.default_appointment_status_id || ''}
            onChange={(e) => handleStatusChange('default_appointment_status_id', e.target.value)}
            placeholder="None (no auto-assignment)"
          >
            {statusOptions['Appointment Status']?.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormControl>

        {/* Appointment Result */}
        <FormControl>
          <FormLabel>Default Appointment Result</FormLabel>
          <Select
            value={selectedStatuses.default_appointment_result_id || ''}
            onChange={(e) => handleStatusChange('default_appointment_result_id', e.target.value)}
            placeholder="None (no auto-assignment)"
          >
            {statusOptions['Appointment Result']?.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </Select>
        </FormControl>
      </VStack>
    </Box>
  );
};

export default WebhookStatusConfiguration;
```

---

## Testing Checklist

### Unit Tests
- [ ] Database migration runs without errors
- [ ] Foreign key constraints work correctly
- [ ] NULL values handled gracefully
- [ ] Status validation works on backend
- [ ] Cloudflare Worker status assignment logic executes

### Integration Tests
- [ ] Create webhook with status assignment via API
- [ ] Update webhook status assignment via API
- [ ] POST to webhook creates contact with assigned status
- [ ] Existing contacts preserve their status
- [ ] Conditional rules can override default status
- [ ] Deleted status doesn't break webhook

### End-to-End Tests
- [ ] Full webhook flow with status assignment
- [ ] Frontend UI displays status options correctly
- [ ] Status selection saves and persists
- [ ] Webhook list shows assigned statuses
- [ ] Performance stays under 50ms

---

## Deployment Checklist

### Pre-Deployment
- [ ] Review architecture document
- [ ] Test migration on staging
- [ ] Verify rollback script works
- [ ] Code review completed
- [ ] Load testing completed

### Deployment
- [ ] Backup production database
- [ ] Run database migration
- [ ] Deploy Cloudflare Worker updates
- [ ] Deploy backend API updates
- [ ] Deploy frontend updates
- [ ] Monitor error rates for 1 hour

### Post-Deployment
- [ ] Verify webhooks still processing correctly
- [ ] Check performance metrics
- [ ] Test creating webhook with status
- [ ] Test updating existing webhook
- [ ] Verify status assignment in logs

---

## Key Files Reference

| File | Purpose | Changes |
|------|---------|---------|
| `/WEBHOOK_STATUS_ASSIGNMENT_ARCHITECTURE.md` | Complete architecture analysis | Documentation |
| `/supabase/migrations/20250113_add_webhook_status_assignments.sql` | Database migration | Run in production |
| `/cloudflare-workers/webhook-processor/src/services/auth.js` | Webhook auth | Update SELECT query |
| `/cloudflare-workers/webhook-processor/src/handlers/webhook.js` | Webhook processing | Add status assignment logic |
| `/backend/src/routes/webhookRoutes.js` | Webhook API | Update PATCH, GET, add status-options endpoint |
| `/frontend/src/components/webhook/WebhookPanel.js` | Webhook UI | Add status selection component |

---

## Performance Targets

- Webhook processing: < 50ms total (currently ~120ms)
- Status assignment overhead: < 10ms
- Database query: < 5ms (indexed foreign keys)
- No regression on existing webhooks

---

## Support and Troubleshooting

### Common Issues

**Issue**: Webhook fails after migration
**Solution**: Check if status IDs are valid and belong to workspace

**Issue**: Status not being assigned
**Solution**: Verify webhook has status configured and contact is NEW

**Issue**: Performance degradation
**Solution**: Check database indexes, review query plans

---

## Questions or Issues?

Refer to:
- Full architecture document: `WEBHOOK_STATUS_ASSIGNMENT_ARCHITECTURE.md`
- Migration script: `supabase/migrations/20250113_add_webhook_status_assignments.sql`
- Code examples above

**Status**: Ready for implementation
**Estimated Time**: 2-3 days for full implementation
**Risk Level**: Low (backward compatible, non-blocking)
