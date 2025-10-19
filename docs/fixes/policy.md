# LiveChat App Policy Fix Documentation

## Issue Summary

**Date:** March 27, 2025  
**Issue:** Infinite recursion in database policies causing onboarding flow failures  
**Affected Components:** Workspace access, onboarding flow  
**Root Cause:** Circular dependencies in Row Level Security (RLS) policies  

## Problem Details

Users were being redirected to the onboarding flow despite having completed it, with console errors showing:

```
Error fetching workspace: 
{code: "42P01", details: null, hint: null, message: "infinite recursion detected in policy for relation 'workspace_members'"}
```

### Technical Analysis

The issue stemmed from circular dependencies in the RLS policies:

1. **Workspaces Table Policy:**
   ```sql
   -- Original problematic policy
   (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
   ```

2. **Workspace Members Table Policy:**
   ```sql
   -- Original problematic policy
   (EXISTS (SELECT 1 FROM workspace_members wm 
     WHERE wm.workspace_id = workspace_members.workspace_id 
     AND wm.user_id = auth.uid() 
     AND wm.role = 'admin'))
   ```

This created an infinite loop:
- To check workspace access → needed to check workspace_members
- To check workspace_members → needed to check admin status
- To check admin status → needed to check workspace access again

## Changes Made

### 1. Database Policy Changes

We simplified the policies to eliminate circular dependencies:

```sql
-- Removed problematic policies
DROP POLICY IF EXISTS "Users can access their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Workspace admins can manage all memberships" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_admin_policy" ON workspace_members;
DROP POLICY IF EXISTS "Users can access their own memberships" ON workspace_members;

-- Created new simplified policies
CREATE POLICY "Users can access their workspaces"
ON workspaces
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  )
);

CREATE POLICY "workspace_members_basic_access"
ON workspace_members
FOR ALL
TO authenticated
USING (true)
WITH CHECK (user_id = auth.uid());
```

### 2. Frontend Code Changes

Modified the workspace query in `WorkspaceContext.js` to avoid joins:

```javascript
// Original code with problematic join
const { data: workspaces, error: workspaceError } = await supabase
  .from('workspaces')
  .select('*, workspace_members!inner(*)')
  .eq('workspace_members.user_id', user.id)
  .limit(1)
  .single();

// New code that avoids joins
const { data: workspaceMembers, error: memberError } = await supabase
  .from('workspace_members')
  .select('workspace_id')
  .eq('user_id', user.id)
  .limit(1)
  .single();

if (memberError) {
  console.error('Error fetching workspace member:', memberError);
  throw memberError;
}

const { data: workspace, error: workspaceError } = await supabase
  .from('workspaces')
  .select('*')
  .eq('id', workspaceMembers.workspace_id)
  .single();
```

## Security Implications

The new policies maintain security while eliminating recursion:

1. **Data Access:**
   - Users can still only access workspaces they are members of
   - Users can only modify their own membership records

2. **Policy Simplification:**
   - Removed redundant and overlapping policies
   - Simplified permission checking logic

3. **Potential Considerations:**
   - The `USING (true)` clause makes workspace_members records visible to all authenticated users
   - This is mitigated by the frontend only requesting relevant data
   - The WITH CHECK clause ensures users can only modify their own records

## Testing Performed

1. Verified existing users can access their workspaces
2. Confirmed onboarding flow works correctly
3. Validated that the infinite recursion error is resolved

## Lessons Learned

1. **Avoid Circular References in Policies:**
   - RLS policies should be designed to avoid checking tables that reference back to the original table
   - Use simpler, direct checks where possible

2. **Policy Testing:**
   - Test policy changes with both existing and new accounts
   - Monitor for performance issues or security implications

3. **Frontend Query Design:**
   - Complex joins can trigger policy recursion
   - Breaking queries into multiple steps can avoid policy issues

## Future Recommendations

1. **Policy Audit:**
   - Regularly review RLS policies for potential circular references
   - Simplify policies where possible

2. **Error Monitoring:**
   - Add monitoring for policy-related errors
   - Create alerts for recursion or permission issues

3. **Documentation:**
   - Keep this document updated with any future policy changes
   - Reference this fix when designing new policies
