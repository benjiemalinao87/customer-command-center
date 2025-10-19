# User Onboarding Workflow Fix Implementation Plan

## Problem Statement
The current user registration process isn't reliably creating entries in the following tables:
- `workspaces`
- `workspace_members`
- `onboarding_status`

This prevents newly registered users from properly going through the onboarding process.

## Root Causes Identified
1. Multiple triggers and functions with overlapping responsibilities
2. Race conditions between client-side operations and database triggers
3. Inconsistent error handling leading to partial completions
4. "enforce_single_workspace_membership" trigger may block some workspace membership creations

## Implementation Plan

### Step 1: Backup and Drop Problematic Triggers
We've already created backup scripts:
- `backup_auth_triggers.sql` - Contains all existing triggers and functions
- `drop_auth_triggers.sql` - Script to remove problematic triggers

Run the drop script in Supabase SQL editor:
```sql
-- Execute drop_auth_triggers.sql
DROP TRIGGER IF EXISTS create_default_workspace_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_onboarding_completed ON onboarding_responses;
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON user_profiles;
```

### Step 2: Implement New User Registration Function
We've created a comprehensive registration function that handles the entire process atomically:
- `create_user_onboarding_function.sql`

Run this script in Supabase SQL editor to create the new function and trigger.

### Step 3: Update AuthContext.js
1. Rename `AuthContextUpdated.js` to `AuthContext.js` (after backing up the original)
2. The new implementation provides:
   - Improved error handling and logging
   - Systematic verification of workspace membership
   - Reliable creation of all required database entries
   - Atomic operations to prevent partial states

### Step 4: Test the Implementation
1. Create a new test user account
2. Verify entries are created in the following tables:
   - `workspaces`
   - `workspace_members`
   - `onboarding_status`
3. Verify user is correctly redirected to onboarding flow
4. Verify onboarding can be completed successfully

## Cleanup
After confirming the fix works:
1. Remove debugging logs from `AuthContext.js`
2. Delete backup files if no longer needed

## Fallback Plan
If issues persist:
1. Restore original triggers using `backup_auth_triggers.sql`
2. Revert to original `AuthContext.js`
3. Further investigate potential conflicts with RLS policies
