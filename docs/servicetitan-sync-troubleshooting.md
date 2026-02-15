# ServiceTitan Sync — Troubleshooting Guide

## Quick Diagnostic Commands

### Check Sync Status
```sql
SELECT sync_status, last_modified_cursor, last_sync_created, last_sync_updated,
       last_sync_errors, last_error, updated_at
FROM servicetitan_sync_state WHERE workspace_id = '45963';
```

### Check Recent Synced Contacts
```sql
SELECT firstname, lastname, crm_id, updated_at, created_at
FROM contacts
WHERE workspace_id = '45963' AND crm_id IS NOT NULL
ORDER BY updated_at DESC LIMIT 20;
```

### Count Contacts Synced Per Hour
```sql
SELECT date_trunc('hour', updated_at) AS hour, COUNT(*) AS count
FROM contacts
WHERE workspace_id = '45963' AND crm_id IS NOT NULL
  AND updated_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1 ORDER BY 1 DESC;
```

---

## Common Issues

### 1. Sync Stuck in "running" Status

**Symptom**: `sync_status = 'running'` and no new workflow instances starting.

**Cause**: A previous workflow crashed or timed out without updating status back to `idle`/`completed`.

**Fix**:
```sql
UPDATE servicetitan_sync_state
SET sync_status = 'idle', updated_at = NOW()
WHERE workspace_id = '45963';
```

**Prevention**: The `/trigger` endpoint guards against this (returns 409 if running). The cron also checks status before dispatching.

---

### 2. Sync Picks Up Too Many Customers

**Symptom**: Hundreds or thousands of contacts updated during a 15-minute window when no one is working.

**Diagnosis**:
```sql
-- How many were synced in the last run?
SELECT last_sync_created, last_sync_updated, last_sync_errors
FROM servicetitan_sync_state WHERE workspace_id = '45963';

-- Are they sequential CRM IDs? (indicates full-table walk)
SELECT MIN(crm_id::integer), MAX(crm_id::integer)
FROM contacts WHERE workspace_id = '45963'
  AND updated_at >= NOW() - INTERVAL '30 minutes';
```

**Root Cause History**: The ST Export API's `from` cursor ignores `modifiedOnOrAfter`. If the code accidentally uses the Export API for incremental sync, it walks through ALL customers.

**Verify Fix**: Check that `runIncrementalSync` in `index.ts` uses `getCustomersModifiedSince` (Transactional API), NOT `exportCustomers` (Export API).

---

### 3. Specific Customer Not Syncing

**Symptom**: A customer was modified in ST but didn't appear in contacts after sync.

**Diagnosis Steps**:

**Step 1**: Is the customer's `modifiedOn` after the cursor?
```bash
# Check what ST has for this customer
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/raw-customer?workspaceId=45963&tenantId=410387862&customerId=CUSTOMER_ID"
```
Compare the `modifiedOn` in the response with `last_modified_cursor` in the sync state.

**Step 2**: Does the customer have contacts (phone/email)?
The Edge Function needs at least one contact record to create a DB entry. If the customer has zero contacts in ST, they'll be skipped.

**Step 3**: Was there a unique constraint conflict?
```sql
-- Check if another contact has the same crm_id
SELECT id, crm_id, firstname, lastname
FROM contacts WHERE crm_id = 'CUSTOMER_CRM_ID';
```

**Step 4**: Manually bump the customer and re-sync:
```bash
# Add a note to bump modifiedOn
curl -s -X POST "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/add-note" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"45963","tenantId":"410387862","customerId":"CUSTOMER_ID","text":"Force sync"}'

# Trigger sync
curl -s -X POST "https://servicetitan-sync.benjiemalinao879557.workers.dev/trigger" \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"45963","tenantId":"410387862"}'
```

---

### 4. Sync Not Running at All

**Symptom**: No new workflow instances in the Cloudflare dashboard.

**Checklist**:

1. **Is sync enabled?**
   ```sql
   SELECT sync_enabled FROM servicetitan_sync_state WHERE workspace_id = '45963';
   ```

2. **Is it within business hours?** Cron only runs 6 AM - 8 PM workspace time.

3. **Is the worker deployed?**
   ```bash
   cd cloudflare-workers/servicetitan-sync && wrangler tail
   ```

4. **Are ST credentials valid?**
   ```bash
   curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/debug/raw-customer?workspaceId=45963&tenantId=410387862" | jq '.customer.id'
   ```
   If this returns an error, the OAuth token may be expired.

5. **Manual trigger test**:
   ```bash
   curl -s -X POST "https://servicetitan-sync.benjiemalinao879557.workers.dev/trigger" \
     -H "Content-Type: application/json" \
     -d '{"workspaceId":"45963","tenantId":"410387862"}'
   ```

---

### 5. Workflow Errors / "Terminated" Status in Dashboard

**Symptom**: Workflow instances show "Terminated" or "Errored" in the Cloudflare Workflows dashboard.

**Diagnosis**:
```bash
# Check workflow status with error details
curl -s "https://servicetitan-sync.benjiemalinao879557.workers.dev/status?instanceId=INSTANCE_ID"
```

**Common Causes**:
- **OAuth token expired**: ST tokens expire; the worker auto-refreshes but may fail if refresh token is also expired
- **ST API rate limit**: 429 errors; the workflow has retry logic with backoff
- **Edge Function timeout**: Chunk too large; currently 25 per chunk which is safe
- **Supabase connection issue**: Check Supabase dashboard for outages

---

### 6. Duplicate Contacts After Sync

**Diagnosis**:
```sql
SELECT crm_id, COUNT(*) as count
FROM contacts WHERE workspace_id = '45963' AND crm_id IS NOT NULL
GROUP BY crm_id HAVING COUNT(*) > 1;
```

**Cause**: Should not happen — the Edge Function upserts on `crm_id`. If duplicates exist, check if some contacts were created manually without a `crm_id` and later the sync created another with the same person.

---

### 7. Cursor Too Far Behind (Large Catch-Up)

**Symptom**: After an outage or long period with sync disabled, the cursor is days/weeks old and the first sync back picks up thousands of customers.

**This is expected behavior** — the overnight gap handling works the same way. The Transactional API properly filters by `modifiedOnOrAfter`, so even a large catch-up only fetches actually-modified customers.

**If you need to skip the catch-up** and start fresh:
```sql
UPDATE servicetitan_sync_state
SET last_modified_cursor = NOW(), updated_at = NOW()
WHERE workspace_id = '45963';
```
**WARNING**: This skips any changes made between the old cursor and now.

---

## Important: Never Manually Reset Cursor in Production

```
  ┌─────────────────────────────────────────────────────────────────────┐
  │  The cursor is SELF-MANAGING. Each sync automatically advances     │
  │  it to the sync start time. Manual resets can cause:               │
  │                                                                     │
  │  • Missed changes (cursor moved past unsynced modifications)       │
  │  • Duplicate processing (cursor moved backward)                    │
  │                                                                     │
  │  Only reset the cursor if you INTENTIONALLY want to skip or        │
  │  re-process a time window. Document why you did it.                │
  └─────────────────────────────────────────────────────────────────────┘
```

---

## Historical Bugs & Fixes

### Export API modifiedOnOrAfter Bug (Feb 2026)

**Problem**: Incremental sync used the Export API which ignores `modifiedOnOrAfter` when `from` (continueFrom) pagination is active. This caused the sync to walk through ALL ~30,000 customers every 15 minutes.

**Impact**: 21,871 contacts updated in one night. 5,866 new legacy contacts created.

**Fix**: Switched incremental sync to the Transactional API (`GET /customers`) which properly respects `modifiedOnOrAfter` with standard page-based pagination.

**Verification test**: Added note to 1 customer → sync picked up exactly 1 contact in 5.9s. Added notes to 12 customers → sync picked up exactly 12 (10 created, 2 skipped due to no ST contacts).

| API | Pagination | modifiedOnOrAfter | Use For |
|-----|-----------|-------------------|---------|
| Export (`/export/customers`) | `from` cursor | **IGNORED with `from`** | Initial sync only |
| Transactional (`/customers`) | `page`/`pageSize` | **Works correctly** | Incremental sync |

---

## Deployment

```bash
# Deploy worker changes
cd cloudflare-workers/servicetitan-sync && wrangler deploy

# View live logs
cd cloudflare-workers/servicetitan-sync && wrangler tail

# Set a secret
cd cloudflare-workers/servicetitan-sync && wrangler secret put SECRET_NAME
```

Required secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `OAUTH_ENCRYPTION_KEY` (pre-derived 32-byte hex key for decrypting ST OAuth tokens)
