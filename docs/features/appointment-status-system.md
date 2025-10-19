# Appointment Status System Documentation

## Overview

This document explains how appointment statuses and results are managed in our application. Understanding this system is crucial for working with appointments, contacts, and the overall pipeline management.

## Database Structure

Our application uses a flexible, category-based status system that allows for dynamic definition of statuses across different categories (like lead statuses, appointment statuses, and appointment results). This document focuses specifically on how appointment statuses and results are implemented.

### Key Tables

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   contacts      │     │  appointments   │     │ status_options  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id              │◄────┤ contact_id      │     │ id              │◄─┐
│ first_name      │     │ appointment_date│     │ name            │  │
│ last_name       │     │ notes           │     │ color           │  │
│ email           │     │ status_id       │────►│ category_id     │  │
│ phone           │     │ result_id       │────┘│ is_default      │  │
│ workspace_id    │     │ workspace_id    │     │ workspace_id    │  │
└─────────────────┘     └─────────────────┘     └─────────────────┘  │
                                                                      │
                                                 ┌─────────────────┐  │
                                                 │status_categories│  │
                                                 ├─────────────────┤  │
                                                 │ id              │──┘
                                                 │ name            │
                                                 │ description     │
                                                 │ workspace_id    │
                                                 └─────────────────┘
```

### Table Relationships

The database uses a relational model with the following key relationships:

1. **appointments → contacts**: Each appointment belongs to a specific contact
   - Foreign Key: `appointments.contact_id` references `contacts.id`

2. **appointments → status_options (for status)**: Each appointment has a status
   - Foreign Key: `appointments.status_id` references `status_options.id`
   - These are filtered to only include options from the "Appointment Status" category

3. **appointments → status_options (for result)**: Each appointment may have a result
   - Foreign Key: `appointments.result_id` references `status_options.id`
   - These are filtered to only include options from the "Appointment Result" category

4. **status_options → status_categories**: Each status option belongs to a category
   - Foreign Key: `status_options.category_id` references `status_categories.id`
   - Categories include "Appointment Status" and "Appointment Result"

5. **Multi-tenant Design**: All tables include `workspace_id` to ensure proper data isolation between different workspaces

## How It Works

### Appointment Status Flow

1. When a new appointment is created:
   - It is assigned a default status (typically "Scheduled")
   - The status_id references an entry in status_options with category "Appointment Status"

2. As the appointment progresses:
   - The status can be updated (e.g., "Confirmed", "Completed", "Canceled")
   - Each status change can be tracked in the appointment_status_history table

3. When an appointment is completed:
   - A result can be assigned (e.g., "Successful", "No Show", "Needs Follow-up")
   - The result_id references an entry in status_options with category "Appointment Result"

### Status Options Management

Status options are dynamically defined and can be customized per workspace:

1. **Default Options**: The system comes with default status options for both appointment statuses and results
2. **Custom Options**: Workspace administrators can add, edit, or remove status options
3. **Color Coding**: Each status option has an associated color for visual identification

## Working with Appointment Statuses

### Frontend Implementation

When working with appointments in the frontend:

```javascript
// Example: Fetching appointment statuses
const fetchAppointmentStatuses = async (workspaceId) => {
  const { data, error } = await supabase
    .from('status_options')
    .select('id, name, color')
    .eq('category_id', appointmentStatusCategoryId)
    .eq('workspace_id', workspaceId);
  
  if (error) throw error;
  return data;
};

// Example: Updating an appointment status
const updateAppointmentStatus = async (appointmentId, statusId) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status_id: statusId })
    .eq('id', appointmentId)
    .eq('workspace_id', currentWorkspace.id);
  
  if (error) throw error;
  return data;
};
```

### Backend Implementation

On the backend, appointment status changes are processed and may trigger additional actions:

```javascript
// Example: Processing a status change
const processStatusChange = async (appointment, newStatusId, userId) => {
  // Update the appointment
  const { data, error } = await supabase
    .from('appointments')
    .update({ 
      status_id: newStatusId,
      updated_by: userId,
      updated_at: new Date()
    })
    .eq('id', appointment.id)
    .eq('workspace_id', appointment.workspace_id);
  
  if (error) throw error;
  
  // Record in history table
  await supabase
    .from('appointment_status_history')
    .insert({
      appointment_id: appointment.id,
      status_id: newStatusId,
      created_by: userId,
      workspace_id: appointment.workspace_id
    });
    
  // Additional business logic based on status change
  // ...
};
```

## Best Practices

1. **Always Include Workspace Context**: Every query should include workspace_id to maintain proper multi-tenant isolation

2. **Use Transactions for Status Changes**: When updating statuses and recording history, use transactions to ensure data consistency

3. **Validate Status Category**: Always verify that a status_id belongs to the correct category before assigning it

4. **Cache Status Options**: Status options change infrequently, so they can be cached on the frontend for better performance

5. **Handle Null Results**: Not all appointments will have a result, especially those not yet completed

## Common Queries

### Getting a Contact's Latest Appointment Status

```sql
SELECT 
  c.id AS contact_id,
  c.first_name,
  c.last_name,
  a.id AS appointment_id,
  so_status.name AS appointment_status,
  so_result.name AS appointment_result
FROM contacts c
LEFT JOIN (
  SELECT DISTINCT ON (contact_id) *
  FROM appointments
  ORDER BY contact_id, appointment_date DESC
) a ON c.id = a.contact_id AND c.workspace_id = a.workspace_id
LEFT JOIN status_options so_status ON a.status_id = so_status.id
LEFT JOIN status_options so_result ON a.result_id = so_result.id
WHERE c.workspace_id = 'your_workspace_id'
ORDER BY c.last_name, c.first_name;
```

### Getting Appointment Status History

```sql
SELECT 
  ash.created_at AS changed_at,
  so.name AS status_name,
  so.color AS status_color,
  u.email AS changed_by
FROM appointment_status_history ash
JOIN status_options so ON ash.status_id = so.id
JOIN users u ON ash.created_by = u.id
WHERE ash.appointment_id = 'appointment_id'
ORDER BY ash.created_at DESC;
```

## Troubleshooting

### Common Issues

1. **Missing Appointment Status/Result in UI**: 
   - Check that the contact has an associated appointment in the appointments table
   - Verify that the appointment has valid status_id and result_id values
   - Ensure the status_options table contains entries for these IDs

2. **Status Changes Not Reflecting in UI**:
   - The UI may be caching old status data
   - Check that both the appointment record AND contact record are updated
   - Verify the activity history is recording status changes correctly

3. **"Column activity_type does not exist" Error**:
   - This occurs because the activities table uses "type" instead of "activity_type"
   - Update all queries to use the correct column name "type"
   - Check ContactActivitiesService.js for any remaining references to "activity_type"

4. **Appointment Status History Not Showing**:
   - Verify the appointment_status_history table has entries for the appointment
   - Check that the status_id and result_id values reference valid entries in status_options
   - Ensure the workspace_id is correct for multi-tenant isolation

### Database Integrity Checks

Run these queries to identify potential data integrity issues:

```sql
-- Find appointments with invalid status_id values
SELECT a.id, a.contact_id, a.status_id
FROM appointments a
LEFT JOIN status_options so ON a.status_id = so.id
WHERE so.id IS NULL AND a.status_id IS NOT NULL;

-- Find appointments with invalid result_id values
SELECT a.id, a.contact_id, a.result_id
FROM appointments a
LEFT JOIN status_options so ON a.result_id = so.id
WHERE so.id IS NULL AND a.result_id IS NOT NULL;

-- Check for contacts with appointment_status_id but no matching appointment
SELECT c.id, c.firstname, c.lastname, c.appointment_status_id
FROM contacts c
LEFT JOIN appointments a ON c.id = a.contact_id
WHERE c.appointment_status_id IS NOT NULL AND a.id IS NULL;
```

### Fixing Data Inconsistencies

If you find data inconsistencies, you can fix them with these queries:

```sql
-- Reset invalid appointment status_id values to the default
UPDATE appointments
SET status_id = (
  SELECT id FROM status_options 
  WHERE category_id = (SELECT id FROM status_categories WHERE name = 'Appointment Status' LIMIT 1)
  AND is_default = true
  LIMIT 1
)
WHERE status_id NOT IN (SELECT id FROM status_options);

-- Clear invalid result_id values
UPDATE appointments
SET result_id = NULL
WHERE result_id NOT IN (SELECT id FROM status_options);

-- Sync contact appointment status with latest appointment
UPDATE contacts c
SET appointment_status_id = a.status_id,
    appointment_result_id = a.result_id
FROM (
  SELECT DISTINCT ON (contact_id) contact_id, status_id, result_id
  FROM appointments
  ORDER BY contact_id, appointment_date DESC
) a
WHERE c.id = a.contact_id;
```

## Implementation Details

### Key Components

1. **AppointmentService.js**: Handles all appointment-related database operations
   - `getAppointmentStatusOptions()`: Fetches available status options
   - `getAppointmentResultOptions()`: Fetches available result options
   - `updateAppointmentStatus()`: Updates status and records history
   - `updateAppointmentResult()`: Updates result and records history

2. **ContactActivitiesService.js**: Tracks activity history including status changes
   - Uses `type` column (not `activity_type`) to identify activity types
   - Records status changes with metadata about old and new values

3. **ContactDetailView.js**: UI component for viewing/editing appointment details
   - `AppointmentStatusManager` component displays current status and result
   - `handleAppointmentStatusChange()` and `handleAppointmentResultChange()` update values

4. **ActivityHistory.js**: Displays history of status changes
   - Renders status changes based on activity metadata
   - Uses status map to convert IDs to human-readable names

### Recent Fixes

1. Updated `ContactActivitiesService.js` to use `type` instead of `activity_type` in all queries
2. Fixed `ActivityHistory.js` to correctly reference the `type` field
3. Ensured proper status and result mapping in the UI components

## Conclusion

The appointment status system provides a flexible way to track the progression of appointments through various states. By understanding the database structure and relationships, you can effectively work with appointment statuses and results, troubleshoot issues, and maintain data integrity.

Remember that all operations must respect the multi-tenant architecture by including the appropriate workspace_id in queries and updates. This ensures proper data isolation between different workspaces.
