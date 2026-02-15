# Cascade Delete Enabled for Contacts

## Summary
All foreign key constraints referencing the `contacts` table have been updated from `ON DELETE RESTRICT` to `ON DELETE CASCADE`. This allows users to delete contacts without manually deleting related records first.

## What Changed

### Tables Updated
The following tables now have `ON DELETE CASCADE` constraints:

1. **campaign_responses** - Campaign response records are automatically deleted when a contact is deleted
2. **campaign_contact_status** - Campaign contact status records are automatically deleted
3. **campaign_executions** - Campaign execution records are automatically deleted

### Tables Already Using CASCADE
These tables already had CASCADE delete (no changes needed):
- `messages`
- `contact_pipeline_stages`
- `pipeline_deals`
- `appointments`
- `email_activities`

## Migration Applied
- **File**: `supabaseSchema/migrations/20251214_enable_cascade_delete_contacts.sql`
- **Status**: ✅ Applied successfully
- **Date**: December 14, 2025

## How It Works

### Before (RESTRICT)
```sql
-- This would fail with foreign key constraint error
DELETE FROM contacts WHERE id = 'contact-id';
-- Error: update or delete on table "contacts" violates foreign key constraint
```

### After (CASCADE)
```sql
-- This now works - all related records are automatically deleted
DELETE FROM contacts WHERE id = 'contact-id';
-- ✅ Success - campaign_responses, campaign_contact_status, 
--    campaign_executions, and other related records are automatically deleted
```

## What Gets Deleted Automatically

When you delete a contact, the following related records are automatically deleted:

1. **Campaign Data**:
   - `campaign_responses` - All campaign responses from this contact
   - `campaign_contact_status` - Campaign status records
   - `campaign_executions` - Campaign execution records

2. **Communication Data**:
   - `messages` - All messages (already had CASCADE)
   - `email_activities` - Email activity records (already had CASCADE)

3. **Pipeline Data**:
   - `contact_pipeline_stages` - Pipeline stage assignments (already had CASCADE)
   - `pipeline_deals` - Deal records (already had CASCADE)
   - `appointments` - Appointment records (already had CASCADE)

## Important Notes

⚠️ **Warning**: Deleting a contact is now a **permanent action** that cannot be undone. All related data will be permanently deleted, including:
- Campaign analytics and response data
- Message history
- Pipeline and deal information
- Appointment records

✅ **Benefit**: Users can now delete contacts directly from the UI without needing to:
- Manually delete related records first
- Contact support for assistance
- Run complex SQL scripts

## Testing

To verify cascade delete is working:

```sql
-- Check constraint status
SELECT 
  tc.table_name,
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE ccu.table_name = 'contacts'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- All delete_rule values should be 'CASCADE'
```

## Rollback (If Needed)

If you need to revert to RESTRICT behavior:

```sql
-- Revert campaign_responses
ALTER TABLE campaign_responses 
DROP CONSTRAINT IF EXISTS fk_contact;

ALTER TABLE campaign_responses
ADD CONSTRAINT fk_contact
    FOREIGN KEY (contact_id, workspace_id)
    REFERENCES contacts(id, workspace_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT;

-- Repeat for other tables as needed
```
