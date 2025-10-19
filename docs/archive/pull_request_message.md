# Fix Dynamic Status Handling in Pipeline View

## Problem
Clicking on a status in the pipeline view was resulting in a database error: "Database error: new row for relation 'contacts' violates check constraint 'check_lead_status'". This was happening because the database had a constraint that limited the `lead_status` column to only specific predefined values, but our application is designed to allow admins to configure custom statuses.

## Solution
1. **Removed Database Constraint**: Created a migration to drop the `check_lead_status` constraint from the contacts table, allowing any status value to be stored.
```sql
ALTER TABLE contacts DROP CONSTRAINT check_lead_status;
```

2. **Enhanced Error Handling**: Added specific error handling in `ContactDetailView.js` to catch and display constraint violation errors with helpful user messages.

3. **Documentation**: Updated `lessons_learn.md` with a new section about dynamic status handling and database constraints.

## Testing
- Created new custom statuses in the Configure Pipeline UI
- Confirmed status updates now work properly without constraint errors
- Verified UI correctly displays custom status names and colors

## Key Lessons
- When implementing dynamic fields, check for database constraints that might limit values
- Store exact user-configured values in the database rather than mapping to predefined values
- Add specific error handling for database constraint violations
- Document constraint changes in migration files with detailed comments
