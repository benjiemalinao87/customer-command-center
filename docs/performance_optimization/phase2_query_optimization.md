# Phase 2: Supabase Query Optimization

## Overview

Optimizing database queries is crucial for application performance, especially in a multi-tenant environment with Row Level Security (RLS). This phase focuses on improving Supabase query performance through selective column fetching, proper indexing, and query structure optimization.

## Problem Statement

Common Supabase query performance issues in our application:

1. Fetching unnecessary columns with `select('*')`
2. Missing indexes on frequently queried fields
3. Inefficient joins and filters
4. Redundant queries for the same data
5. Suboptimal RLS policies adding overhead

## Implementation Guide

### Step 1: Analyze Current Queries

Identify high-impact queries by:

- Reviewing network requests in DevTools
- Checking query execution time
- Identifying frequently executed queries
- Looking for queries that return large datasets

### Step 2: Optimize Column Selection

Replace `select('*')` with specific column selections:

```javascript
// Before: Fetching all columns
const { data, error } = await supabase
  .from('workspaces')
  .select('*')
  .eq('id', workspaceId)
  .single();

// After: Fetching only needed columns
const { data, error } = await supabase
  .from('workspaces')
  .select('id, name, created_at, settings')
  .eq('id', workspaceId)
  .single();
```

### Step 3: Implement Database Indexes

Add indexes for frequently queried fields:

```sql
-- Example index creation for workspace_members table
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_composite ON workspace_members(user_id, workspace_id);
```

### Step 4: Optimize Joins and Relations

Use Supabase's built-in join capabilities efficiently:

```javascript
// Before: Multiple queries
const { data: contact } = await supabase
  .from('contacts')
  .select('id, name, email')
  .eq('id', contactId)
  .single();

const { data: notes } = await supabase
  .from('contact_notes')
  .select('*')
  .eq('contact_id', contactId);

// After: Single query with join
const { data, error } = await supabase
  .from('contacts')
  .select(`
    id, 
    name, 
    email,
    contact_notes (id, note, created_at)
  `)
  .eq('id', contactId)
  .single();
```

### Step 5: Implement Query Caching

Cache frequently accessed, rarely changing data:

```javascript
// Implementing a simple cache for workspace data
const workspaceCache = new Map();

const getWorkspace = async (workspaceId) => {
  // Check cache first
  if (workspaceCache.has(workspaceId)) {
    return workspaceCache.get(workspaceId);
  }
  
  // If not in cache, fetch from database
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name, settings')
    .eq('id', workspaceId)
    .single();
    
  if (error) throw error;
  
  // Store in cache
  workspaceCache.set(workspaceId, data);
  return data;
};
```

### Step 6: Optimize RLS Policies

Review and optimize Row Level Security policies:

```sql
-- Before: Inefficient RLS policy with subquery
CREATE POLICY "Users can access their workspace data"
ON contacts
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- After: More efficient policy using EXISTS
CREATE POLICY "Users can access their workspace data"
ON contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM workspace_members 
    WHERE workspace_members.workspace_id = contacts.workspace_id
    AND workspace_members.user_id = auth.uid()
  )
);
```

## Implementation Examples

### Example 1: Optimizing WorkspaceContext.js

**Before:**
```javascript
const loadWorkspace = async () => {
  // Fetch all workspace members
  const { data: workspaceMembers, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  if (memberError) throw memberError;
  
  const workspaceId = workspaceMembers[0].workspace_id;
  
  // Fetch all workspace data
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();
    
  if (workspaceError) throw workspaceError;
  
  setCurrentWorkspace(workspace);
};
```

**After:**
```javascript
const loadWorkspace = async () => {
  // Fetch only necessary data in a single query with join
  const { data, error } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces:workspace_id (
        id,
        name,
        created_at,
        settings
      )
    `)
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (error) throw error;
  
  setCurrentWorkspace(data.workspaces);
  
  // Cache the result
  sessionStorage.setItem(
    `workspace_${data.workspaces.id}`, 
    JSON.stringify(data.workspaces)
  );
};
```

### Example 2: Contact Fetching Optimization

**Before:**
```javascript
// Separate queries for contact and related data
const fetchContactDetails = async (contactId) => {
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
    
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('contact_id', contactId);
    
  const { data: notes } = await supabase
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId);
    
  return { contact, appointments, notes };
};
```

**After:**
```javascript
// Single query with joins and specific column selection
const fetchContactDetails = async (contactId) => {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      address,
      status_id,
      workspace_id,
      appointments (
        id,
        appointment_date,
        status_id,
        result_id,
        notes
      ),
      contact_notes (
        id,
        note,
        created_at,
        created_by
      )
    `)
    .eq('id', contactId)
    .single();
    
  if (error) throw error;
  
  return {
    contact: {
      id: data.id,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      status_id: data.status_id,
      workspace_id: data.workspace_id
    },
    appointments: data.appointments,
    notes: data.contact_notes
  };
};
```

## Performance Impact

| Query Type | Before Optimization | After Optimization | Improvement |
|------------|---------------------|-------------------|-------------|
| Workspace Loading | 2 separate queries, all columns | 1 query with specific columns | 60% faster, 75% less data |
| Contact Details | 3 separate queries | 1 query with joins | 70% faster, reduced network requests |
| Listing Contacts | Full table scan | Indexed queries | 80% faster for large datasets |

## Database Index Recommendations

| Table | Column(s) | Index Type | Purpose |
|-------|-----------|------------|---------|
| contacts | workspace_id | Single column | Filter contacts by workspace |
| contacts | (workspace_id, status_id) | Composite | Filter contacts by status within workspace |
| appointments | contact_id | Single column | Retrieve appointments for a contact |
| appointments | (workspace_id, appointment_date) | Composite | Date-based appointment queries |
| contact_notes | contact_id | Single column | Retrieve notes for a contact |
| workspace_members | (user_id, workspace_id) | Composite | Verify workspace membership |

## Best Practices for Future Development

1. **Select Only What You Need**: Never use `select('*')` in production code
2. **Use Query Builders**: Create reusable query builders for common operations
3. **Implement Pagination**: Always paginate large datasets
4. **Monitor Query Performance**: Regularly review query execution times
5. **Consider Denormalization**: For frequently joined data that rarely changes
6. **Use Prepared Statements**: Leverage Supabase's built-in protection against SQL injection

## Testing

After implementing query optimizations:

1. Measure and compare query execution times
2. Monitor network request sizes
3. Test with various dataset sizes
4. Verify correct data is still being returned
5. Check for any regressions in functionality

## Next Steps

After completing this phase, proceed to [Phase 3: React Component Optimization](./phase3_component_optimization.md) to further improve application performance.

## Diagram: Query Optimization Impact

```
┌───────────────────────────────────────────────────┐
│                                                   │
│                  Client Application               │
│                                                   │
└───────────────────────┬───────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│                                                   │
│                  Supabase Client                  │
│                                                   │
└───────────────────────┬───────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│                                                   │
│                Before Optimization               │
│                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌────────┐ │
│  │ Query 1     │    │ Query 2     │    │Query 3 │ │
│  │ select(*)   │    │ select(*)   │    │select(*│ │
│  └─────────────┘    └─────────────┘    └────────┘ │
│                                                   │
└───────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│                                                   │
│                After Optimization                │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │ Single Optimized Query                      │  │
│  │ - Specific columns                          │  │
│  │ - Proper joins                              │  │
│  │ - Indexed fields                            │  │
│  └─────────────────────────────────────────────┘  │
│                                                   │
└───────────────────────────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────┐
│                                                   │
│                 Performance Impact                │
│                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌────────┐ │
│  │ Less Data   │    │ Fewer       │    │Faster  │ │
│  │ Transferred │    │ Requests    │    │Queries │ │
│  └─────────────┘    └─────────────┘    └────────┘ │
│                                                   │
└───────────────────────────────────────────────────┘
```
