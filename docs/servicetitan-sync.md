# ServiceTitan Customer Sync

## Overview

Cloudflare Worker + Durable Workflow that syncs ServiceTitan (ST) customers to Supabase contacts every 15 minutes during business hours.

- **Worker**: `cloudflare-workers/servicetitan-sync/`
- **Base URL**: `https://servicetitan-sync.benjiemalinao879557.workers.dev`
- **Cron**: `*/15 * * * *` (every 15 min, but only runs 6 AM - 8 PM workspace local time)
- **Deploy**: `cd cloudflare-workers/servicetitan-sync && wrangler deploy`

---

## How It Works

### Two Sync Modes

| Mode | API Used | When |
|------|----------|------|
| **Initial Sync** | Export API (`/export/customers`) | First-ever sync for a workspace |
| **Incremental Sync** | Transactional API (`/customers`) | Every 15 min after initial sync |

### Incremental Sync Flow

```
EVERY 15 MINUTES:

  Cursor saved                    Sync starts                 Cursor saved
  from last run                   (cron fires)                for next run
      │                               │                           │
      ▼                               ▼                           ▼
──────●───────────────────────────────●───────────────────────────●──────────► time
      │◄─── This window is fetched ──►│                           │
      │     via modifiedOnOrAfter     │                           │
      │                               │                           │
  10:00 AM                        10:15 AM                    10:15 AM
  (last_modified_cursor)          (cron fires)                (new cursor)
```

### Step by Step

1. **Cron fires** every 15 minutes
2. **Business hours check**: 6 AM - 8 PM in workspace timezone. Skip if outside.
3. **Read cursor**: `last_modified_cursor` from `servicetitan_sync_state` table
4. **Fetch modified customers** via ST Transactional API:
   ```
   GET /crm/v2/tenant/{tenant}/customers?modifiedOnOrAfter={cursor}&page=1&pageSize=50
   ```
5. **Send to Edge Function** in chunks of 25 for DB upsert
6. **Save new cursor** = sync start time (not end time — prevents gaps)

### Why Cursor = Sync Start Time (Not End Time)

```
  Sync #1 starts at 10:15:00
  Customer X modified at 10:15:02 (during sync processing)
  Sync #1 finishes at 10:15:09
  Cursor saved = 10:15:00 (start time)

  Sync #2 starts at 10:30:00
  Fetches modifiedOnOrAfter = 10:15:00
  ✅ Customer X (modified at 10:15:02) IS included — no gap

  If we used END time:
  Cursor saved = 10:15:09
  ❌ Customer X (10:15:02) would be MISSED
```

### Overnight Gap Handling

```
  8:00 PM ──► Last sync of the day
              Cursor saved = 8:00 PM

  8:15 PM ──► Cron fires, business hours ❌, SKIPPED
  ...overnight, no syncs...

  6:00 AM ──► Cron fires, business hours ✅
              Cursor = 8:00 PM (yesterday)
              Fetches modifiedOnOrAfter = 8:00 PM
              ✅ ALL overnight changes picked up in one run
```

---

## Architecture

```
┌──────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Cron Trigger │────►│  Cloudflare Worker   │────►│  Durable Workflow    │
│  */15 * * * * │     │  (fetch handler)     │     │  (ServiceTitanSync)  │
└──────────────┘     └─────────────────────┘     └──────┬───────────────┘
                                                        │
                     ┌──────────────────────────────────┘
                     ▼
        ┌────────────────────────┐
        │  1. get-credentials    │ Read ST OAuth creds from Supabase
        │  2. update-status      │ Set sync_status = 'running'
        │  3. incremental-fetch  │ GET /customers?modifiedOnOrAfter=...
        │  4. incremental-sync   │ POST to Edge Function (upsert contacts)
        │  5. update-cursor      │ Save new cursor timestamp
        │  6. update-completed   │ Set sync_status = 'completed'
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐     ┌──────────────────┐
        │  Supabase Edge Function │────►│  Supabase DB      │
        │  servicetitan-contact-  │     │  contacts table   │
        │  sync                   │     │  (upsert on       │
        │                         │     │   crm_id)         │
        └────────────────────────┘     └──────────────────┘
```

---

## Database

### Sync State Table

```sql
SELECT * FROM servicetitan_sync_state WHERE workspace_id = '45963';
```

| Column | Purpose |
|--------|---------|
| `sync_status` | `idle`, `running`, `completed`, `failed` |
| `last_modified_cursor` | Timestamp for next sync's `modifiedOnOrAfter` |
| `last_continue_from` | Export API pagination cursor (initial sync only) |
| `initial_sync_completed` | Whether full sync has been done |
| `total_customers_synced` | Running total |
| `last_sync_created` | Contacts created in last run |
| `last_sync_updated` | Contacts updated in last run |
| `last_sync_errors` | Errors in last run |
| `last_error` | Error message if failed |

### Contacts Table

Synced customers are upserted into `contacts` with:
- `crm_id` = ST customer ID (unique constraint prevents duplicates)
- `workspace_id` = workspace that owns the ST connection
- `metadata.custom_fields` = ST-specific fields (customer_type, balance, etc.)

---

## HTTP Endpoints

### Manual Sync Trigger

```bash
curl -s -X POST "https://servicetitan-sync.benjiemalinao879557.workers.dev/trigger" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"45963","tenantId":"410387862"}'
```

**Response**: `{ "success": true, "instanceId": "sync-45963-..." }`

Bypasses business hours check. Guards against duplicate runs (409 if already running).

### Check Workflow Status

```bash
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/status?instanceId=sync-45963-1770520988299"
```

### Debug: Add Note to Customer

Bumps a customer's `modifiedOn` in ServiceTitan. Useful for testing sync pickup.

```bash
curl -s -X POST "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/add-note" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "45963",
    "tenantId": "410387862",
    "customerId": "229472825",
    "text": "Test note"
  }'
```

### Debug: Fetch Raw Customer from ST

Returns raw ST customer data + tag types + jobs + leads.

```bash
# Specific customer
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/raw-customer?workspaceId=45963&tenantId=410387862&customerId=229472825"

# Sample customers (no customerId)
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/raw-customer?workspaceId=45963&tenantId=410387862"
```

### Debug: Test Export API Pagination

```bash
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/pagination?workspaceId=45963&tenantId=410387862"

# With pagination cursor
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/pagination?workspaceId=45963&tenantId=410387862&continueFrom=<token>"
```

---

## ServiceTitan APIs Used

### Transactional API (Incremental Sync)

```
GET /crm/v2/tenant/{tenant}/customers
  ?modifiedOnOrAfter=2026-02-08T10:00:00Z
  &page=1
  &pageSize=50
  &includeTotal=true
```

- Max 50 per page
- Properly respects `modifiedOnOrAfter` on every page
- Standard page-based pagination

### Export API (Initial Sync Only)

```
GET /crm/v2/tenant/{tenant}/export/customers
  ?pageSize=5000
  &from=<continueFrom>
```

- Up to 5000 per page
- Uses `from`/`continueFrom` cursor pagination
- **WARNING**: `from` cursor ignores `modifiedOnOrAfter` — do NOT use for incremental sync

### Customer Contacts Export (Initial Sync)

```
GET /crm/v2/tenant/{tenant}/export/customers/contacts
  ?pageSize=5000
```

- Bulk export of phone/email for all customers
- Used in Phase 1 of initial sync to avoid per-customer API calls

---

## Current Configuration

| Setting | Value |
|---------|-------|
| Workspace ID | `45963` |
| Tenant ID | `410387862` |
| Cron Schedule | `*/15 * * * *` |
| Business Hours | 6 AM - 8 PM (workspace timezone) |
| Incremental Page Size | 50 (Transactional API max) |
| Edge Function Chunk Size | 25 customers per request |
| Max Pages per Sync | 100 |

---

## Key Files

| File | Purpose |
|------|---------|
| `cloudflare-workers/servicetitan-sync/src/index.ts` | Main worker + workflow logic |
| `cloudflare-workers/servicetitan-sync/src/serviceTitanApi.ts` | ST API client (auth, export, transactional) |
| `cloudflare-workers/servicetitan-sync/wrangler.toml` | Worker config (cron, bindings) |
| `supabase/functions/servicetitan-contact-sync/` | Edge Function for DB upsert |
