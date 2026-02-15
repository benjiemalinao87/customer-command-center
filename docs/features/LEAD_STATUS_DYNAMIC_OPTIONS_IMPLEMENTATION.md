# Lead Status Dynamic Options Implementation

## Overview

Implemented intelligent Lead Status options in the Flow Builder Condition node that adapts based on workspace configuration.

## Implementation Date
January 19, 2026

## Problem Solved

Previously, the Condition node's Lead Status dropdown showed hardcoded values:
```javascript
options: ['New', 'Qualified', 'Contacted', 'Opportunity', 'Customer', 'Closed']
```

This didn't reflect:
1. Custom pipeline stages configured by the workspace
2. Actual lead statuses used in the contacts table
3. Whether the workspace uses pipeline feature or simple text statuses

## Solution

### Intelligent Data Source Selection

The system now checks the **Lead Pipeline Visibility** setting to determine where to fetch options:

#### When Pipeline Visibility is ON ✅
- **Source**: `status_options` table
- **Query Path**: `status_categories` → `status_options` where `category.name = 'Lead Status'`
- **Ordering**: By `display_order` field
- **Use Case**: Workspace uses visual pipeline with configured stages

#### When Pipeline Visibility is OFF ❌
- **Source**: `contacts.lead_status` column
- **Query**: `SELECT DISTINCT lead_status FROM contacts WHERE workspace_id = ?`
- **Ordering**: By frequency (most common first)
- **Use Case**: Workspace uses simple text-based statuses

## Files Created

### 1. `frontend/src/hooks/useContactFields.js`
Main hook that fetches dynamic options based on pipeline visibility setting.

**Key Functions:**
- Checks `getShowLeadPipeline()` to determine data source
- Fetches from `status_options` OR `contacts.lead_status`
- Updates `CONTACT_FIELDS` with dynamic options
- Handles errors with fallback to defaults

### 2. `frontend/src/hooks/README_useContactFields.md`
Comprehensive documentation for the hook including:
- Usage examples
- Integration points
- Database schema
- Testing checklist

## Files Modified

### 1. `frontend/src/components/flow-builder/condition/conditionConfig.js`
Added dynamic field management:

```javascript
let dynamicContactFields = CONTACT_FIELDS;

export const setContactFields = (fields) => {
  dynamicContactFields = fields || CONTACT_FIELDS;
};

export const getContactFields = () => {
  return dynamicContactFields;
};

export const getFieldByValue = (value) => {
  return dynamicContactFields.find(field => field.value === value);
};
```

### 2. `frontend/src/components/flow-builder/drawers/ConditionConfigSidebar.js`
Integrated the hook:

```javascript
import { useContactFields } from '../../../hooks/useContactFields';
import { setContactFields } from '../condition/conditionConfig';

const { contactFields, isLoading } = useContactFields();

useEffect(() => {
  if (!isLoading && contactFields) {
    setContactFields(contactFields);
  }
}, [contactFields, isLoading]);
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Opens Condition Node Config                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ConditionConfigSidebar Component                            │
│ - Calls useContactFields() hook                             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ useContactFields Hook                                        │
│ 1. Get currentWorkspace.id                                  │
│ 2. Check getShowLeadPipeline(workspaceId)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────────────┐
│ Pipeline ON     │    │ Pipeline OFF         │
│ (TRUE)          │    │ (FALSE)              │
└────────┬────────┘    └──────────┬───────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│ Query:          │    │ Query:               │
│ status_options  │    │ contacts.lead_status │
│ table           │    │ (DISTINCT)           │
│                 │    │                      │
│ ORDER BY        │    │ ORDER BY             │
│ display_order   │    │ count DESC           │
└────────┬────────┘    └──────────┬───────────┘
         │                        │
         └───────────┬────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Extract Status Names                                         │
│ ['New', 'Lead', 'Qualified', ...]                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Update CONTACT_FIELDS                                        │
│ field.value === 'lead_status' → inject dynamic options      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ setContactFields(updatedFields)                             │
│ - Updates dynamicContactFields variable                     │
│ - Used by getFieldByValue() in ConditionRow                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ ValueInput Component                                         │
│ - Renders dropdown with dynamic options                     │
│ - User sees actual workspace statuses                       │
└─────────────────────────────────────────────────────────────┘
```

## Database Tables Used

### status_categories
```sql
CREATE TABLE status_categories (
  id SERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### status_options
```sql
CREATE TABLE status_options (
  id SERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  category_id INTEGER REFERENCES status_categories(id),
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7),
  display_order INTEGER,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### workspace_settings
```sql
CREATE TABLE workspace_settings (
  workspace_id TEXT NOT NULL,
  setting_key VARCHAR(255) NOT NULL,
  setting_value JSONB,
  PRIMARY KEY (workspace_id, setting_key)
);

-- Example row:
-- workspace_id: '12345'
-- setting_key: 'show_lead_pipeline'
-- setting_value: { "enabled": true, "updatedAt": "2026-01-19T..." }
```

### contacts
```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_status VARCHAR(50),
  firstname VARCHAR(255),
  lastname VARCHAR(255),
  -- ... other fields
);
```

## API Functions Used

### From `statusService.js`
- `getStatusCategories(workspaceId)` - Fetches all status categories
- `getStatusOptionsByCategory(categoryId, workspaceId)` - Fetches options for a category

### From `workspaceSettingsService.js`
- `getShowLeadPipeline(workspaceId)` - Checks if pipeline visibility is enabled
- `getDistinctLeadStatuses(workspaceId)` - Gets distinct lead_status values from contacts

## Performance Optimizations

1. **Caching**: `getStatusOptionsByCategory` uses 5-minute cache
2. **Single Fetch**: Data fetched once on component mount
3. **Re-fetch Only on Workspace Change**: `useEffect` dependency on `currentWorkspace.id`
4. **Graceful Fallback**: Returns default options on error

## Error Handling

```javascript
try {
  // Fetch dynamic options
} catch (err) {
  logger.error('Error fetching dynamic contact field options:', err);
  setError(err);
  setContactFields(CONTACT_FIELDS); // Fallback to defaults
} finally {
  setIsLoading(false);
}
```

## Testing Scenarios

### Scenario 1: Pipeline Enabled with Custom Stages
```
Setup:
- Lead Pipeline Visibility: ON
- status_options has: ['New', 'Lead', 'Qualified', 'Demo', 'Closed Won']

Expected Result:
- Dropdown shows these 5 options in display_order
```

### Scenario 2: Pipeline Disabled, Text-Based Statuses
```
Setup:
- Lead Pipeline Visibility: OFF
- contacts.lead_status has: ['Hot Lead', 'Cold Lead', 'Qualified', 'Lost']

Expected Result:
- Dropdown shows these 4 options sorted by frequency
```

### Scenario 3: New Workspace (No Data)
```
Setup:
- Lead Pipeline Visibility: ON
- status_options table: empty

Expected Result:
- Falls back to default ['New', 'Qualified', 'Contacted', 'Opportunity', 'Customer', 'Closed']
```

### Scenario 4: Network Error
```
Setup:
- Database connection fails

Expected Result:
- Error logged
- Falls back to default options
- User can still use the condition node
```

## Benefits

1. ✅ **Workspace-Specific**: Each workspace sees their own statuses
2. ✅ **No Code Changes**: Add/modify statuses without deploying code
3. ✅ **Intelligent**: Adapts to pipeline visibility setting
4. ✅ **Performance**: Cached queries with 5-minute TTL
5. ✅ **Resilient**: Graceful fallback on errors
6. ✅ **Real Data**: Pipeline OFF mode shows actual statuses in use
7. ✅ **Ordered**: Pipeline ON respects display_order, Pipeline OFF sorts by frequency

## Future Enhancements

1. **Other Status Fields**: Apply same logic to `appointment_status`, `appointment_result`
2. **Real-Time Updates**: Invalidate cache when status_options are modified
3. **Custom Fields**: Extend to support custom field dropdowns
4. **Analytics**: Track which statuses are most commonly used in conditions

## Related Documentation

- `frontend/src/hooks/README_useContactFields.md` - Hook documentation
- `frontend/src/components/flow-builder/condition/README_condition_node.md` - Condition node docs
- `docs/implementations/pipeline-status-config.md` - Pipeline configuration

## Commit Message

```
feat: Dynamic Lead Status options in Condition node based on pipeline visibility

- Created useContactFields hook to fetch dynamic options
- Pipeline ON: Pull from status_options table
- Pipeline OFF: Pull distinct values from contacts.lead_status
- Updated conditionConfig.js with dynamic field injection
- Integrated hook in ConditionConfigSidebar
- Added comprehensive documentation

Resolves: Lead Status dropdown now reflects workspace configuration
```

## Testing Checklist

- [ ] Pipeline ON: Dropdown shows status_options values
- [ ] Pipeline OFF: Dropdown shows distinct contacts.lead_status values
- [ ] Empty status_options: Falls back to defaults
- [ ] No contacts: Falls back to defaults
- [ ] Network error: Falls back to defaults
- [ ] Workspace switch: Re-fetches data correctly
- [ ] Loading state: Shows spinner during fetch
- [ ] Multiple condition nodes: All show same dynamic options
- [ ] Save/load workflow: Options persist correctly
- [ ] Workflow execution: Conditions evaluate against correct values
