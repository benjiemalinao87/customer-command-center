# Workspace Company Name Feature

## Overview
Added company name field to the workspace settings UI that allows users to view and edit their company information. This feature integrates with the existing onboarding data stored in the `onboarding_responses` table.

## Implementation Details

### Data Source
- **Table**: `onboarding_responses`
- **Fields**: 
  - `company_name` (direct column)
  - `response->company_name` (JSON field as fallback)

### Frontend Changes
- **File**: `frontend/src/components/settings/ProfileSettingsWindow.js`
- **Approach**: Direct Supabase integration (no backend API needed)

### Features
- ✅ Fetch company name from onboarding responses
- ✅ Display in workspace settings section
- ✅ Allow editing (but not deletion)
- ✅ Auto-create onboarding record if none exists
- ✅ Consistent with macOS design philosophy
- ✅ Proper error handling and user feedback

## Technical Implementation

### Data Fetching
```javascript
// Get company name from onboarding_responses
const { data: onboardingData, error: onboardingError } = await supabase
  .from('onboarding_responses')
  .select('response, company_name')
  .eq('user_id', userId)
  .eq('workspace_id', workspaceId)
  .single();

let companyName = '';
if (onboardingData) {
  // Try direct column first, then JSON response
  companyName = onboardingData.company_name || 
               (onboardingData.response && onboardingData.response.company_name) || '';
}
```

### Data Saving
```javascript
// Update company name in onboarding_responses
const { error: companyError } = await supabase
  .from('onboarding_responses')
  .update({ company_name: formValues.company_name })
  .eq('user_id', userId)
  .eq('workspace_id', workspaceId);

// Create record if user doesn't have onboarding data
if (companyError && companyError.code === 'PGRST116') {
  const { error: insertError } = await supabase
    .from('onboarding_responses')
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      company_name: formValues.company_name,
      response: { company_name: formValues.company_name },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
}
```

## UI Placement
The company name field is positioned in the **Workspace Settings** section, between:
- Workspace Name
- Your Role

## Database Schema
```sql
-- onboarding_responses table structure
CREATE TABLE onboarding_responses (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  workspace_id text,
  company_name text, -- Direct column for company name
  response jsonb,    -- JSON containing company_name and other onboarding data
  created_at timestamptz,
  updated_at timestamptz
);
```

## Design Philosophy
Following the established macOS-inspired design:
- Clean, focused form controls
- Consistent spacing (8px multipliers)
- Proper color theming (light/dark mode)
- Intuitive user experience
- Minimal yet complete functionality

## Error Handling
- Graceful handling of missing onboarding records
- Toast notifications for success/error states
- Fallback behavior when data is unavailable
- Non-blocking approach (app continues to work if company name fails)

## Future Enhancements
- [ ] Add company logo upload capability
- [ ] Company-wide settings management
- [ ] Integration with team member profiles
- [ ] Company size and industry fields 