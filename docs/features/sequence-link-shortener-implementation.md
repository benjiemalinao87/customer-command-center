# Sequence Link Shortener Implementation

**Date:** January 19, 2026  
**Status:** ✅ Completed

## Overview

Implemented a new "Link Shortener" step type in the Sequence Builder that allows users to generate shortened calendar booking links directly within sequences, eliminating the need to create a separate flow for link generation.

## What Was Implemented

### 1. Database Changes ✅

**File:** `supabase/migrations/20260119_add_link_shortener_to_sequences.sql`

- Added `link_shortener_config` JSONB column to `flow_sequence_messages` table
- Added index on `step_type` for better query performance
- Added check constraint to ensure link_shortener steps have configuration
- Column stores: `urlMode`, `selectedEventId`, `originalUrl`, `customFieldName`, `linkName`

### 2. Frontend UI ✅

**File:** `frontend/src/components/flow-builder/sequences/TwoColumnSequenceBuilder.js`

**Added:**
- New `link_shortener` step type alongside existing `message`, `connector`, `flow` types
- "Add Link Shortener" button in timeline sidebar (cyan color scheme)
- Calendar events and workspace subdomain fetching
- Link shortener configuration handlers:
  - `handleAddLinkShortener()` - Creates new link shortener step
  - `handleLinkShortenerConfigChange()` - Updates configuration
  - `handleLinkShortenerEventSelect()` - Handles calendar event selection

**UI Components:**
- Timeline node with Link2 icon and cyan color (cyan.500/cyan.600)
- Configuration panel with:
  - URL Mode toggle (Calendar Event / Custom URL)
  - Calendar event dropdown (loads active events)
  - Custom URL input with merge field support
  - Custom field name input (default: `short_link`)
  - Link name input (optional, for reference)
  - URL preview with PII protection indicator
  - Info box explaining usage with merge fields

**Validation:**
- Ensures link shortener steps have configuration
- Validates calendar mode has event selected
- Validates custom mode has URL provided

### 3. Frontend Service ✅

**File:** `frontend/src/components/flow-builder/sequences/SequenceService.js`

- Updated `createSequence()` to include `linkShortenerConfig` in message formatting
- Updated `updateSequence()` to include `linkShortenerConfig` in message formatting
- Handles null text for link_shortener steps (like connector and flow steps)

### 4. Backend Service ✅

**File:** `backend/src/services/sequenceService.js`

- Updated `createSequence()` to handle `link_shortener_config` field
- Updated `updateSequence()` to handle `link_shortener_config` in:
  - New message creation
  - Existing message updates
  - Database update operations
- Maps `linkShortenerConfig` (camelCase) to `link_shortener_config` (snake_case)

### 5. Workflow Conversion ✅

**Files:**
- `trigger/unifiedWorkflows.js` - Main workflow engine
- `trigger/unifiedWorkflowsOptimized.js` - Optimized version

**Added:**
- Handling for `step_type === 'link_shortener'` in `convertSequenceToWorkflow()`
- Converts link shortener steps to action nodes with:
  - `type: 'action'`
  - `actionType: 'link-shortener'`
  - Configuration passed from `link_shortener_config`
  - Message ID for analytics tracking

**Execution Flow:**
1. Sequence message with `step_type: 'link_shortener'` is converted to workflow node
2. Node has `actionType: 'link-shortener'` which triggers existing link shortener handler
3. Handler interpolates variables, calls URL shortener worker
4. Short URL is stored in contact's custom field
5. Subsequent messages can use `{{contact.custom.short_link}}` merge field

## Backward Compatibility

✅ **Fully backward compatible:**
- New column is nullable with default NULL
- Existing sequences continue to work unchanged
- No breaking changes to APIs
- Users can still use the old flow-based approach if preferred
- All existing step types (`message`, `connector`, `flow`) unchanged

## Usage Example

### Creating a Sequence with Link Shortener

1. Click "Add Link Shortener" button
2. Select "Calendar Event" mode
3. Choose event: "Free In-Home Consultation (30 min)"
4. Custom field name: `short_link` (default)
5. Link name: "Free Consultation" (optional)
6. Click "Add Message"
7. Message text: "Book your appointment here: {{contact.custom.short_link}}"
8. Save sequence

### What Happens When Contact is Enrolled

1. Link shortener step executes immediately
2. Generates URL: `https://workspace.appointments.today/free-in-home-consultation?name={{contact.firstname}}%20{{contact.lastname}}&email={{contact.email}}...`
3. Calls URL shortener worker to create short link
4. Stores short URL in `contact.metadata.custom.short_link`
5. Waits configured delay (e.g., 5 minutes)
6. Sends SMS with resolved merge field: "Book your appointment here: https://schedules.today/abc123"

## Technical Details

### Data Flow

```
Frontend UI → SequenceService.js → Backend API → sequenceService.js → Database
                                                                           ↓
Contact Enrolled → Trigger.dev → convertSequenceToWorkflow → executeWorkflowStep
                                                                           ↓
                                                              link-shortener action handler
                                                                           ↓
                                                              URL Shortener Worker
                                                                           ↓
                                                              Store in custom field
```

### Database Schema

```sql
-- flow_sequence_messages table
link_shortener_config JSONB DEFAULT NULL

-- Example value:
{
  "urlMode": "calendar",
  "selectedEventId": "uuid-here",
  "originalUrl": "https://workspace.appointments.today/event?params...",
  "customFieldName": "short_link",
  "linkName": "Free Consultation"
}
```

### Node Structure in Workflow

```javascript
{
  id: "node_abc123",
  type: "action",
  data: {
    label: "Generate Short Link",
    actionType: "link-shortener",
    config: {
      originalUrl: "https://...",
      customFieldName: "short_link",
      linkName: "Free Consultation",
      urlMode: "calendar",
      selectedEventId: "uuid"
    },
    messageId: "message-uuid"
  }
}
```

## Files Modified

| File | Purpose |
|------|---------|
| `supabase/migrations/20260119_add_link_shortener_to_sequences.sql` | Database migration |
| `frontend/src/components/flow-builder/sequences/TwoColumnSequenceBuilder.js` | UI implementation |
| `frontend/src/components/flow-builder/sequences/SequenceService.js` | Frontend service |
| `backend/src/services/sequenceService.js` | Backend service |
| `trigger/unifiedWorkflows.js` | Workflow conversion |
| `trigger/unifiedWorkflowsOptimized.js` | Optimized workflow conversion |

## Testing Checklist

- [ ] Create new sequence with link shortener step (calendar mode)
- [ ] Create new sequence with link shortener step (custom URL mode)
- [ ] Edit existing sequence to add link shortener step
- [ ] Enroll contact in sequence with link shortener
- [ ] Verify short link is generated and stored in custom field
- [ ] Verify subsequent SMS contains resolved short link
- [ ] Test with multiple calendar events
- [ ] Test with custom URLs containing merge fields
- [ ] Verify existing sequences without link shortener still work
- [ ] Test sequence duplication with link shortener steps

## Benefits

1. **Improved UX:** No need to create separate flows for link generation
2. **Simplified Workflow:** All sequence logic in one place
3. **Faster Setup:** Reduce steps from 2 (flow + sequence) to 1 (sequence only)
4. **Better Discoverability:** Link shortener feature is now visible in sequence builder
5. **Consistent Interface:** Uses same UI patterns as connector and flow steps

## Future Enhancements

- [ ] Add link click tracking integration
- [ ] Support multiple link shortener steps in same sequence
- [ ] Add link expiration options
- [ ] Support custom domains for short links
- [ ] Add link analytics dashboard
