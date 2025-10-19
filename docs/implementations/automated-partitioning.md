# Automated Partitioning System for LiveChat Messages

## Overview

The `livechat_messages` table uses **monthly partitioning** to improve performance and manageability as the system scales. This document explains the automated partition management system implemented to prevent partition-related errors.

## Problem Solved

**Issue**: Messages would fail to insert when no partition existed for the current month, causing the error:
```
no partition of relation "livechat_messages" found for row
```

**Solution**: Automated partition creation that ensures partitions always exist for current and future months.

## Architecture

### 1. Database Functions

#### `create_monthly_partition(table_name, start_date)`
- Creates a single monthly partition for the specified date
- Checks if partition already exists before creating
- Uses proper naming convention: `livechat_messages_YYYY_MM`

#### `ensure_livechat_partitions()`
- Ensures partitions exist for current month + next 2 months
- Called by maintenance scripts and triggers
- Provides 3-month buffer to prevent partition gaps

#### `maintain_livechat_partitions()`
- Public-facing function for external maintenance calls
- Returns JSON status for monitoring
- Can be called via Supabase Edge Functions or cron jobs

### 2. Automatic Triggers

#### `ensure_partition_exists` Trigger
- Fires **BEFORE INSERT** on `livechat_messages`
- Creates missing partitions on-demand
- Prevents insert failures due to missing partitions
- Graceful error handling - insert continues even if partition creation fails

### 3. Maintenance Script

#### `scripts/maintain-partitions.js`
- Node.js script for scheduled partition maintenance
- Can be run via cron job or similar scheduler
- Provides logging and verification of partition creation

## Current Partitions

As of implementation, the following partitions exist:
- `livechat_messages_2025_04` (April 2025)
- `livechat_messages_2025_05` (May 2025) 
- `livechat_messages_2025_06` (June 2025)
- `livechat_messages_2025_07` (July 2025)
- `livechat_messages_2025_08` (August 2025)

## Benefits

### Performance
- **Faster Queries**: Only relevant partitions are scanned
- **Improved Inserts**: Better concurrency with smaller table chunks
- **Efficient Indexing**: Indexes are smaller and more efficient per partition

### Maintenance
- **Easy Archival**: Drop old partitions instead of large DELETE operations
- **Faster VACUUM**: Operations work on smaller chunks
- **Reduced Lock Contention**: Multiple partitions can be operated on simultaneously

### Scalability
- **Predictable Performance**: Query time doesn't degrade linearly with data growth
- **Storage Management**: Old data can be archived/compressed per partition
- **Backup Efficiency**: Backup only active partitions

## Monitoring

### Check Existing Partitions
```sql
SELECT tablename 
FROM pg_tables 
WHERE tablename LIKE 'livechat_messages_%' 
ORDER BY tablename;
```

### Manual Partition Creation
```sql
-- Create partition for specific month
SELECT create_monthly_partition('livechat_messages', '2025-09-01'::date);
```

### Run Maintenance
```sql
-- Ensure current + next 2 months exist
SELECT ensure_livechat_partitions();
```

## Automated Maintenance Options

### Option 1: Cron Job (Recommended)
```bash
# Run monthly on the 1st day at 2 AM
0 2 1 * * cd /path/to/project && node scripts/maintain-partitions.js
```

### Option 2: Supabase Edge Function
Create an Edge Function that calls `maintain_livechat_partitions()` and schedule it via external cron service.

### Option 3: Application-Level Maintenance
Call the maintenance function during application startup or via admin interface.

## Error Handling

### Insert Failures
- **Trigger Protection**: On-demand partition creation prevents most failures
- **Graceful Degradation**: System continues operating even if partition creation fails
- **Logging**: All partition operations are logged for debugging

### Maintenance Failures
- **Non-Blocking**: Maintenance failures don't affect ongoing operations
- **Retry Logic**: Can safely re-run maintenance functions
- **Monitoring**: Script provides clear success/failure status

## Future Enhancements

### Automatic Cleanup
- Implement automatic dropping of old partitions (e.g., older than 2 years)
- Archive old partitions to cold storage before dropping

### Dynamic Partitioning
- Consider switching to range partitioning for more flexible date ranges
- Implement weekly partitioning for extremely high-volume periods

### Monitoring Integration
- Add metrics for partition sizes and query performance
- Alert when partitions are approaching size limits

## Troubleshooting

### Common Issues

1. **"No partition found" Error**
   - Run: `SELECT ensure_livechat_partitions();`
   - Check system date/time is correct
   - Verify trigger is enabled

2. **Permission Errors**
   - Ensure database user has CREATE TABLE permissions
   - Check schema permissions for partition creation

3. **Performance Issues**
   - Monitor partition sizes - consider more frequent partitioning if partitions become too large
   - Check query plans to ensure partition pruning is working

## Best Practices

1. **Regular Maintenance**: Run partition maintenance monthly
2. **Monitor Growth**: Track partition sizes and query performance
3. **Test Procedures**: Regularly test partition creation in development
4. **Documentation**: Keep partition strategy documented as system evolves
5. **Backup Strategy**: Include partition structure in backup procedures 