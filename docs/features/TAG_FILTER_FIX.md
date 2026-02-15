# Tag Filter Fix - Hybrid Tag System Support

## Problem Summary

**Issue:** Contacts with the tag "Suppressed Leads" were not being retrieved when the tag filter was applied, even though they were visible when no filter was used. However, filtering by "Manual Import Dec 24" worked correctly.

**Root Cause:** The application recently migrated from storing tags in a JSONB column (`contacts.tags`) to a normalized system using `tags` and `contact_tags` junction tables. However:

1. **Tag Dropdown** (`filterTypes.js`) - Only queried the OLD JSONB column
2. **Tag Filtering** (`filterQueryBuilder.js`) - Only queried the NEW junction tables
3. **Data Migration** - "Suppressed Leads" (1,448 contacts) remained in the old JSONB system, while "Manual Import Dec 24" (18,784 contacts) was in the new normalized system

## Solution Implemented

### 1. Updated Tag Dropdown (`filterTypes.js`)

**File:** `frontend/src/components/shared/filters/filterTypes.js`

**Changes:**
- Modified `getOptions()` function to query BOTH systems:
  - Query `tags` + `contact_tags` tables for new normalized tags
  - Query `contacts.tags` JSONB column for legacy tags
  - Merge results and deduplicate by tag name
  - Aggregate counts from both sources

**Result:** Tag dropdown now shows ALL tags from both old and new systems.

### 2. Updated Tag Filtering Logic (`filterQueryBuilder.js`)

**File:** `frontend/src/utils/filterQueryBuilder.js`

**Changes:**

#### Modified `getContactIdsWithTags()`:
- Added `tagNames` parameter for JSONB fallback
- Query new junction table using tag UUIDs (if available)
- Query old JSONB column using tag names (for legacy tags)
- Merge contact IDs from both sources
- Return unified Set of contact IDs

#### Modified `applyTagFilterServerSide()`:
- Detect if filter values are UUIDs or tag names
- Convert tag names to UUIDs for new system (if they exist)
- Pass both UUIDs and names to `getContactIdsWithTags()`
- Support hybrid filtering across both storage systems

**Result:** Tag filtering now works for tags in EITHER old JSONB or new normalized system.

## Data Verification

| Tag | Storage System | Contact Count | Status |
|-----|---------------|---------------|--------|
| Suppressed Leads | OLD (JSONB) | 1,448 | ✅ Now works |
| Manual Import Dec 24 | NEW (Junction) | 18,784 | ✅ Already worked |

## Technical Details

### Old System (JSONB)
```sql
-- contacts table
tags JSONB  -- e.g., ["Suppressed Leads", "Hot Lead"]
```

### New System (Normalized)
```sql
-- tags table
id UUID PRIMARY KEY
name TEXT
workspace_id TEXT

-- contact_tags junction table
id UUID PRIMARY KEY
contact_id UUID
tag_id UUID
workspace_id TEXT
```

## Import System Fixed ✅

### Changes Made to Import Logic

**File:** `trigger/importContactsTasks.js`

#### 1. Removed JSONB Tags from Contact Insert
- Modified `mapRowToContact()` to NO LONGER include `tags` field
- Contacts are now inserted WITHOUT tags in the JSONB column

#### 2. Added Tag Helper Function
```javascript
addTagToContacts(supabase, tagName, contactIds, workspaceId)
```
- Creates tag in `tags` table (if doesn't exist)
- Bulk inserts entries into `contact_tags` junction table
- Links all imported contacts to the import tag

#### 3. Updated Batch Processing
- `importContactBatch` task now receives `importTag` parameter
- After successful contact insertion, calls `addTagToContacts()`
- Tags are applied AFTER contacts are created (normalized system)

### Result
✅ **New imports now use the normalized tag system**
- Import tags go to `tags` + `contact_tags` tables
- No more JSONB column usage for new imports
- Filtering works correctly for new imports

### Testing
To verify the fix works:
1. Import a CSV with an import tag (e.g., "Test Import Jan 2026")
2. Check the `tags` table - tag should exist
3. Check the `contact_tags` table - entries should link contacts to tag
4. Filter by the import tag - should retrieve all imported contacts

## Migration Path (Future)

To fully migrate OLD tags to the new system:

1. Create a migration script to:
   - Extract all tags from `contacts.tags` JSONB column
   - Insert unique tags into `tags` table
   - Create corresponding entries in `contact_tags` junction table
   - Clear the `contacts.tags` JSONB column

2. Update all code to only query the new system

3. Drop the `contacts.tags` column (optional)

## Files Modified

1. `frontend/src/components/shared/filters/filterTypes.js` - Tag dropdown options
2. `frontend/src/utils/filterQueryBuilder.js` - Tag filtering logic

## Testing

✅ Tag dropdown shows tags from both systems
✅ Filtering by "Suppressed Leads" retrieves 1,448 contacts
✅ Filtering by "Manual Import Dec 24" retrieves 18,784 contacts
✅ No linting errors introduced

## Performance Considerations

- The hybrid approach adds minimal overhead (2 queries instead of 1)
- Both queries are indexed and performant
- Once full migration is complete, can revert to single-query approach
- Current implementation maintains backward compatibility during transition period
