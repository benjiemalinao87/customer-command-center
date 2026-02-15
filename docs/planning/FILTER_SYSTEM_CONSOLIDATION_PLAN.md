# Filter System Consolidation Plan

## Status: ✅ COMPLETED (December 2024)

## Executive Summary

The filter system was duplicated across multiple locations, causing maintenance nightmares. A single bug fix required changes in 6+ files. This consolidation created a single source of truth for all filter logic.

---

## Architecture Overview

```
                           CURRENT STATE - SINGLE SOURCE OF TRUTH
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                         │
    │                      ┌─────────────────────────┐                        │
    │                      │    shared/filters/      │                        │
    │                      │                         │                        │
    │                      │  filterTypes.js         │ ◄── ONE definition    │
    │                      │  ActiveFilterTags.js    │                        │
    │                      │  FilterTypeList.js      │                        │
    │                      │  FilterValueSelector.js │                        │
    │                      │  UnifiedFilterPopover.js│                        │
    │                      └───────────┬─────────────┘                        │
    │                                  │                                      │
    │                                  ▼                                      │
    │                      ┌─────────────────────────┐                        │
    │                      │  utils/filterQuery      │                        │
    │                      │      Builder.js         │ ◄── ONE logic file    │
    │                      │                         │                        │
    │                      │  • applyDatabaseFilters │                        │
    │                      │  • applyTagFilter       │                        │
    │                      │  • getSequenceContactIds│                        │
    │                      │  • getAppointmentIds    │                        │
    │                      │  • hasActiveSharedFilters│                       │
    │                      └───────────┬─────────────┘                        │
    │                                  │                                      │
    │              ┌───────────────────┼───────────────────┐                  │
    │              │                   │                   │                  │
    │              ▼                   ▼                   ▼                  │
    │   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐          │
    │   │ contactV2State  │ │livechatContact  │ │useContactManager│          │
    │   │     .js         │ │   Store.js      │ │      .js        │          │
    │   │                 │ │                 │ │                 │          │
    │   │  import {       │ │  import {       │ │  import {       │          │
    │   │    applyFilters │ │    applyFilters │ │    applyFilters │          │
    │   │  } from utils   │ │  } from utils   │ │  } from utils   │          │
    │   │                 │ │                 │ │                 │          │
    │   │  // Just calls  │ │  // Just calls  │ │  // Just calls  │          │
    │   │  // the utility │ │  // the utility │ │  // the utility │          │
    │   └─────────────────┘ └─────────────────┘ └─────────────────┘          │
    │                                                                         │
    │   Contacts Page       LiveChat V1          LiveChat V2                  │
    │                                                                         │
    └─────────────────────────────────────────────────────────────────────────┘

    BENEFIT: Bug fix = Change in 1 file!
```

---

## Filter Types

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           FILTER TYPES EXPLAINED                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  Lead Status Filter                                        │
│  │ 🟢 leadStatus│  ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Database level (fast!)                             │
│                   QUERY: .eq('lead_status_id', statusId)                    │
│                   UI: Dropdown with status options                          │
│                                                                              │
│  ┌─────────────┐  Date Created Filter                                       │
│  │ 🟣 dateCreated│ ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Database level                                     │
│                   QUERY: .gte('created_at', startDate)                      │
│                   UI: Preset options (Today, Last 7 days, etc.)             │
│                                                                              │
│  ┌─────────────┐  Webhook Source Filter                                     │
│  │ 🟠 webhookSource│ ───────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Database level                                     │
│                   QUERY: .eq('webhook_name', name)                          │
│                   UI: Dropdown with webhook names                           │
│                                                                              │
│  ┌─────────────┐  Sequence Filter                                           │
│  │ 🔵 sequence │  ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Query-level (uses IN/NOT IN with IDs)              │
│                   MODES: "In sequence" / "Not in sequence"                  │
│                   LOGIC: Checks ALL statuses (active, pending, completed,   │
│                          failed, cancelled, paused)                         │
│                                                                              │
│  ┌─────────────┐  Field Filter                                              │
│  │ 🔷 field    │  ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Database level                                     │
│                   OPERATORS: equals, contains, starts_with, is_empty, etc.  │
│                   UI: Field picker + operator + value input                 │
│                                                                              │
│  ┌─────────────┐  Has Appointment Filter                                    │
│  │ 🟤 hasAppt  │  ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Query-level (uses IN/NOT IN with IDs)              │
│                   MODES: "Has appointment" / "No appointment"               │
│                                                                              │
│  ┌─────────────┐  Tag Filter                                                │
│  │ 🩷 tag      │  ─────────────────────────────────────────────────────────│
│  └─────────────┘  WHERE: Client-side (tags stored as JSON string)           │
│                   MODES: "Has any of" / "Not in"                            │
│                   LOGIC: Parse JSON, check if tag exists in array           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Filter Application Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        HOW FILTERS ARE APPLIED                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   User clicks "Add Filter" → Selects filter type → Enters value → Apply     │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 1: DATABASE FILTERS (Applied to Supabase query)               │   │
│   │  ═══════════════════════════════════════════════════════════════    │   │
│   │                                                                     │   │
│   │   let query = supabase.from('contacts').select('*')                 │   │
│   │                                                                     │   │
│   │   // applyDatabaseFilters(query, filters)                           │   │
│   │   if (leadStatusId)     → query.eq('lead_status_id', id)           │   │
│   │   if (createdDateStart) → query.gte('created_at', date)            │   │
│   │   if (webhookName)      → query.eq('webhook_name', name)           │   │
│   │   if (fieldFilter)      → query.eq/ilike/etc(field, value)         │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 2: QUERY-LEVEL FILTERS (Applied using IN/NOT IN)              │   │
│   │  ═══════════════════════════════════════════════════════════════    │   │
│   │                                                                     │   │
│   │   // applySequenceFilterToQuery(query, sequenceFilter, ...)         │   │
│   │   if (sequenceFilter) {                                             │   │
│   │     const enrolledIds = await getSequenceContactIds(...)            │   │
│   │     query = query.in('id', enrolledIds)  // or .not('id', 'in', ...)│   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   │   // applyAppointmentFilterToQuery(query, hasAppointment, ...)      │   │
│   │   if (hasAppointment) {                                             │   │
│   │     const apptIds = await getAppointmentContactIds(...)             │   │
│   │     query = query.in('id', apptIds)  // or .not('id', 'in', ...)    │   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   │   const { data: contacts } = await query                            │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  STEP 3: CLIENT-SIDE FILTERS (Applied to fetched data)              │   │
│   │  ═══════════════════════════════════════════════════════════════    │   │
│   │                                                                     │   │
│   │   // applyTagFilterClientSide(contacts, tagFilter)                  │   │
│   │   if (tagFilter) {                                                  │   │
│   │     contacts = contacts.filter(c => {                               │   │
│   │       const tags = parseContactTags(c.tags)                         │   │
│   │       return tagFilter.tagIds.some(t => tags.includes(t))           │   │
│   │     })                                                              │   │
│   │   }                                                                 │   │
│   │                                                                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│                         Return filtered contacts                             │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Shared Utility: filterQueryBuilder.js

**Location:** `frontend/src/utils/filterQueryBuilder.js`

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  filterQueryBuilder.js - The Single Source of Truth for Filter Logic         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  EXPORTS:                                                                    │
│  ────────                                                                    │
│                                                                              │
│  1. applyDatabaseFilters(query, filters)                                     │
│     └─ Applies leadStatus, dateCreated, webhookName, fieldFilter             │
│     └─ Returns modified Supabase query                                       │
│                                                                              │
│  2. getSequenceContactIds(sequenceId, workspaceId, supabase)                 │
│     └─ Fetches contact IDs enrolled in a sequence (ALL statuses)             │
│     └─ Returns Set<contactId>                                                │
│                                                                              │
│  3. applySequenceFilterToQuery(query, sequenceFilter, workspaceId, supabase) │
│     └─ Applies sequence filter using IN/NOT IN                               │
│     └─ Returns { query, isEmpty: boolean }                                   │
│                                                                              │
│  4. getAppointmentContactIds(workspaceId, supabase)                          │
│     └─ Fetches contact IDs that have appointments                            │
│     └─ Returns Set<contactId>                                                │
│                                                                              │
│  5. applyAppointmentFilterToQuery(query, hasAppointment, workspaceId, ...)   │
│     └─ Applies appointment filter using IN/NOT IN                            │
│     └─ Returns { query, isEmpty: boolean }                                   │
│                                                                              │
│  6. applyTagFilterClientSide(contacts, tagFilter)                            │
│     └─ Filters contacts by tags (client-side)                                │
│     └─ Returns filtered contacts array                                       │
│                                                                              │
│  7. applySequenceFilterClientSide(contacts, enrolledIds, mode)               │
│     └─ Filters contacts by sequence enrollment (client-side)                 │
│     └─ Returns filtered contacts array                                       │
│                                                                              │
│  8. parseContactTags(tags)                                                   │
│     └─ Parses tags from JSON string or array                                 │
│     └─ Returns string[] of tag labels                                        │
│                                                                              │
│  9. hasActiveSharedFilters(filters)                                          │
│     └─ Checks if any shared filters are active                               │
│     └─ Returns boolean                                                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Files Changed

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FILES SUMMARY                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ✅ DELETED (5 files) - Duplicate UI components removed                     │
│  ─────────────────────                                                       │
│  ✓ frontend/src/components/contactV2/filters/filterTypes.js                  │
│  ✓ frontend/src/components/contactV2/filters/ActiveFilterTags.js             │
│  ✓ frontend/src/components/contactV2/filters/FilterTypeList.js               │
│  ✓ frontend/src/components/contactV2/filters/FilterValueSelector.js          │
│  ✓ frontend/src/components/contactV2/filters/UnifiedFilterPopover.js         │
│                                                                              │
│  ✅ CREATED (1 file) - Shared filter logic utility                          │
│  ─────────────────────                                                       │
│  ✓ frontend/src/utils/filterQueryBuilder.js                                  │
│                                                                              │
│  ✅ UPDATED (4 files) - Now use shared utilities                            │
│  ─────────────────────                                                       │
│  ✓ frontend/src/components/contactV2/filters/index.js                        │
│    └─ Re-exports from shared/filters/ for backwards compatibility            │
│                                                                              │
│  ✓ frontend/src/services/contactV2State.js                                   │
│    └─ Uses: applyTagFilterClientSide, applySequenceFilterClientSide,         │
│             getSequenceContactIds                                            │
│                                                                              │
│  ✓ frontend/src/services/livechatContactStore.js                             │
│    └─ Uses: applyDatabaseFilters, applySequenceFilterToQuery,                │
│             applyAppointmentFilterToQuery, applyTagFilterClientSide          │
│                                                                              │
│  ✓ frontend/src/components/livechat2/hooks/useContactManager.js              │
│    └─ Uses: applyDatabaseFilters, applySequenceFilterToQuery,                │
│             applyAppointmentFilterToQuery, applyTagFilterClientSide,         │
│             hasActiveSharedFilters                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Usage by View

| View | State File | Shared Utilities Used |
|------|------------|----------------------|
| **Contacts Page** | contactV2State.js | applyTagFilterClientSide, applySequenceFilterClientSide, getSequenceContactIds |
| **LiveChat V1** | livechatContactStore.js | applyDatabaseFilters, applySequenceFilterToQuery, applyAppointmentFilterToQuery, applyTagFilterClientSide |
| **LiveChat V2** | useContactManager.js | applyDatabaseFilters, applySequenceFilterToQuery, applyAppointmentFilterToQuery, applyTagFilterClientSide, hasActiveSharedFilters |

---

## Benefits Achieved

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              BENEFITS                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  BEFORE                               AFTER                                  │
│  ──────                               ─────                                  │
│                                                                              │
│  Bug fix = 6+ files                   Bug fix = 1 file ✅                    │
│                                                                              │
│  New filter = Add in 6 places         New filter = Add in 1 place ✅         │
│                                                                              │
│  "Which filterTypes.js is right?"     One clear source of truth ✅           │
│                                                                              │
│  Copy-paste drift between files       Consistent behavior everywhere ✅      │
│                                                                              │
│  Hard to onboard new devs             Clear, documented structure ✅         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Adding a New Filter

To add a new filter type:

1. **Add to filterQueryBuilder.js:**
   - If database-level: Add to `applyDatabaseFilters()`
   - If query-level (needs ID lookup): Create `applyNewFilterToQuery()` function
   - If client-side: Create `applyNewFilterClientSide()` function

2. **Update UI components in shared/filters/:**
   - Add filter definition to `presets/contactFilters.js`
   - Add to `filterTypes.js` if needed

3. **That's it!** All three views will automatically pick up the new filter.

---

## Testing Checklist

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           TESTING CHECKLIST                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Test each filter type in each view:                                         │
│                                                                              │
│  CONTACTS PAGE (ContactV2)                                                   │
│  ✓ Lead Status filter works                                                  │
│  ✓ Date Created filter works                                                 │
│  ✓ Webhook Source filter works                                               │
│  ✓ Sequence filter (In/Not in) works                                         │
│  ✓ Field filter works                                                        │
│  ✓ Has Appointment filter works                                              │
│  ✓ Tag filter works                                                          │
│  ✓ Multiple filters combined work correctly                                  │
│  ✓ Saved filters work                                                        │
│                                                                              │
│  LIVECHAT V1 (livechatContactStore.js)                                       │
│  ✓ All filter types work                                                     │
│  ✓ Filter pills display correctly                                            │
│  ✓ Clearing filters works                                                    │
│                                                                              │
│  LIVECHAT V2 (useContactManager.js)                                          │
│  ✓ All filter types work                                                     │
│  ✓ Filter pills display correctly                                            │
│  ✓ Clearing filters works                                                    │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```
