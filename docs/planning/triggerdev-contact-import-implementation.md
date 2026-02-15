# Trigger.dev Contact Import Task - Implementation Plan

## Overview

Replace browser-based CSV import with Trigger.dev background processing while keeping the existing import as a feature-flagged fallback.

**Key Decisions:**
- Feature flag to toggle between old/new import
- Import tracking via tags (e.g., `import:2024-12-24T10:30:00`) - no new DB table
- Use existing `livechat_media` Supabase Storage bucket for CSV uploads

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                                    │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  ImportContactsModal.js                                                 │ │
│  │  ┌──────────────┐   ┌───────────────────┐   ┌──────────────────────┐   │ │
│  │  │ 1. Select    │──▶│ 2. Upload CSV to  │──▶│ 3. POST /api/import  │   │ │
│  │  │    CSV file  │   │    Supabase       │   │    /trigger          │   │ │
│  │  │              │   │    Storage        │   │    {csvUrl, opts}    │   │ │
│  │  └──────────────┘   └───────────────────┘   └──────────┬───────────┘   │ │
│  │                                                         │               │ │
│  │  ┌──────────────────────────────────────────────────────▼─────────────┐│ │
│  │  │ 4. useRealtimeRun(runId, { accessToken })                          ││ │
│  │  │    ┌─────────────────────────────────────────────────────────────┐ ││ │
│  │  │    │  Progress UI (metadata updates)                             │ ││ │
│  │  │    │  • Status: initializing → processing → completed            │ ││ │
│  │  │    │  • Progress bar: processed/total                            │ ││ │
│  │  │    │  • Counts: ✅ 150 imported | ⚠️ 12 skipped | ❌ 3 failed    │ ││ │
│  │  │    │  • Current batch: 4/8                                       │ ││ │
│  │  │    └─────────────────────────────────────────────────────────────┘ ││ │
│  │  └────────────────────────────────────────────────────────────────────┘│ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Express)                                                           │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  POST /api/import/trigger                                               │ │
│  │  1. Validate request (csvUrl, workspaceId)                              │ │
│  │  2. Generate public access token: auth.createPublicToken({ scopes })    │ │
│  │  3. Trigger task: importContactsOrchestrator.trigger(payload)           │ │
│  │  4. Return { runId, publicAccessToken }                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRIGGER.DEV                                                                 │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  importContactsOrchestrator (Parent)                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │ 1. Fetch CSV from signed URL                                     │  │ │
│  │  │ 2. Parse with PapaParse                                          │  │ │
│  │  │ 3. Bulk fetch existing phones → Set for O(1) duplicate check     │  │ │
│  │  │ 4. Filter duplicates, split into batches of 50                   │  │ │
│  │  │ 5. metadata.set({ status, total, processed, ... })               │  │ │
│  │  │ 6. batchTriggerAndWait(importContactBatch, batches)              │  │ │
│  │  │ 7. Aggregate results, cleanup CSV, set final metadata            │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  │                              │                                          │ │
│  │           ┌──────────────────┼──────────────────┐                      │ │
│  │           ▼                  ▼                  ▼                      │ │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │ │
│  │  │ importContact  │ │ importContact  │ │ importContact  │              │ │
│  │  │ Batch #1       │ │ Batch #2       │ │ Batch #N       │              │ │
│  │  │ (50 contacts)  │ │ (50 contacts)  │ │ (50 contacts)  │              │ │
│  │  │                │ │                │ │                │              │ │
│  │  │ • Bulk insert  │ │ • Bulk insert  │ │ • Bulk insert  │              │ │
│  │  │ • metadata.    │ │ • metadata.    │ │ • metadata.    │              │ │
│  │  │   parent.set() │ │   parent.set() │ │   parent.set() │              │ │
│  │  └────────────────┘ └────────────────┘ └────────────────┘              │ │
│  │         queue: { concurrencyLimit: 5 }                                  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Contacts Table Schema (Existing)

```sql
-- Key columns for import (from Supabase MCP query)
contacts:
  id              UUID PRIMARY KEY
  workspace_id    TEXT NOT NULL
  phone_number    TEXT           -- E.164 format, used for dedup
  firstname       VARCHAR NOT NULL
  lastname        VARCHAR NOT NULL
  email           TEXT
  lead_source     VARCHAR
  market          VARCHAR
  product         VARCHAR
  lead_status     VARCHAR
  st_address      VARCHAR
  city            VARCHAR
  state           VARCHAR
  zip             VARCHAR
  conversation_status TEXT DEFAULT 'New'
  tags            JSONB DEFAULT '[]'   -- Import tracking via tags
  metadata        JSONB DEFAULT '{}'   -- board_phone_number stored here
  opt_in_through  VARCHAR DEFAULT 'manual'
  created_at      TIMESTAMPTZ DEFAULT NOW()
  updated_at      TIMESTAMPTZ DEFAULT NOW()
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `trigger/importContactsTasks.js` | Orchestrator + batch child tasks |
| `backend/src/routes/importRoutes.js` | API endpoint `/api/import/trigger` |
| `frontend/src/hooks/useContactImportRealtime.js` | React hook wrapping `useRealtimeRun` |

## Files to Modify

| File | Changes |
|------|---------|
| `frontend/src/components/contactV2/ImportContactsModal.js` | Add feature flag, new import flow |
| `trigger/index.js` | Export new tasks |
| `backend/index.js` | Register import routes |

---

## Implementation Details

### 1. Trigger Tasks (`trigger/importContactsTasks.js`)

```javascript
import { task, metadata, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";

// Parent orchestrator task
export const importContactsOrchestrator = task({
  id: "import-contacts-orchestrator",
  maxDuration: 3600, // 1 hour
  run: async (payload) => {
    const { csvUrl, workspaceId, importTag, boardPhoneNumber, userId } = payload;

    // Initialize Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Set initial metadata
    metadata.set("status", "initializing");
    metadata.set("total", 0);
    metadata.set("processed", 0);

    // 1. Fetch and parse CSV
    const response = await fetch(csvUrl);
    const csvText = await response.text();
    const { data: rows } = Papa.parse(csvText, { header: true });

    // 2. Bulk fetch existing phones for deduplication
    const { data: existingContacts } = await supabase
      .from("contacts")
      .select("phone_number")
      .eq("workspace_id", workspaceId);

    const existingPhones = new Set(existingContacts?.map(c => c.phone_number) || []);

    // 3. Filter duplicates and prepare contacts
    const contacts = [];
    const skipped = [];

    for (const row of rows) {
      const phone = normalizePhone(row['Phone Number'] || row['phone_number']);
      if (existingPhones.has(phone)) {
        skipped.push({ phone, reason: 'duplicate' });
      } else {
        existingPhones.add(phone); // Prevent duplicates within batch
        contacts.push(mapRowToContact(row, workspaceId, importTag, boardPhoneNumber));
      }
    }

    // 4. Split into batches of 50
    const batches = chunkArray(contacts, 50);

    metadata.set("status", "processing");
    metadata.set("total", contacts.length);
    metadata.set("skippedCount", skipped.length);
    metadata.set("totalBatches", batches.length);

    // 5. Process batches with batchTriggerAndWait
    const results = await importContactBatch.batchTriggerAndWait(
      batches.map((batch, index) => ({
        payload: {
          contacts: batch,
          workspaceId,
          batchIndex: index,
          totalBatches: batches.length,
          totalContacts: contacts.length
        }
      }))
    );

    // 6. Aggregate results
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const result of results) {
      if (result.ok) {
        successCount += result.output.successCount;
        errorCount += result.output.errorCount;
        errors.push(...(result.output.errors || []));
      } else {
        errorCount += 50; // Assume batch failed
      }
    }

    // 7. Cleanup CSV from storage (optional)
    // await supabase.storage.from('livechat_media').remove([csvPath]);

    // 8. Set final metadata
    metadata.set("status", "completed");
    metadata.set("successCount", successCount);
    metadata.set("errorCount", errorCount);
    metadata.set("errors", errors.slice(0, 10)); // First 10 errors

    return { successCount, skippedCount: skipped.length, errorCount };
  }
});

// Child batch task
export const importContactBatch = task({
  id: "import-contact-batch",
  queue: { concurrencyLimit: 5 }, // Max 5 concurrent batches
  maxDuration: 300,
  run: async (payload) => {
    const { contacts, workspaceId, batchIndex, totalBatches, totalContacts } = payload;

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Bulk insert
    const { data, error } = await supabase
      .from("contacts")
      .insert(contacts)
      .select();

    const successCount = data?.length || 0;
    const errorCount = contacts.length - successCount;

    // Update parent metadata for realtime progress
    const processed = (batchIndex + 1) * 50;
    metadata.parent.set("processed", Math.min(processed, totalContacts));
    metadata.parent.set("currentBatch", batchIndex + 1);
    metadata.parent.set("successCount", prev => (prev || 0) + successCount);

    return { successCount, errorCount, errors: error ? [error.message] : [] };
  }
});
```

### 2. Backend API (`backend/src/routes/importRoutes.js`)

```javascript
import express from 'express';
import { auth, tasks } from '@trigger.dev/sdk/v3';
import { importContactsOrchestrator } from '../../trigger/importContactsTasks.js';

const router = express.Router();

router.post('/trigger', async (req, res) => {
  try {
    const { csvUrl, workspaceId, importTag, boardPhoneNumber, userId } = req.body;

    // Validate
    if (!csvUrl || !workspaceId) {
      return res.status(400).json({ error: 'csvUrl and workspaceId required' });
    }

    // Generate public access token for frontend realtime
    const publicAccessToken = await auth.createPublicToken({
      scopes: {
        read: { runs: true }
      },
      expirationTime: '1h'
    });

    // Trigger the orchestrator task
    const handle = await importContactsOrchestrator.trigger({
      csvUrl,
      workspaceId,
      importTag: importTag || `import:${new Date().toISOString()}`,
      boardPhoneNumber,
      userId
    });

    res.json({
      runId: handle.id,
      publicAccessToken
    });
  } catch (error) {
    console.error('Import trigger error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 3. Frontend Hook (`frontend/src/hooks/useContactImportRealtime.js`)

```javascript
import { useRealtimeRun } from '@trigger.dev/react-hooks';

export const useContactImportRealtime = (runId, accessToken, options = {}) => {
  const { run, error } = useRealtimeRun(runId, {
    accessToken,
    enabled: !!runId && !!accessToken,
    ...options
  });

  // Parse metadata for typed progress
  const progress = run?.metadata ? {
    status: run.metadata.status || 'pending',
    total: run.metadata.total || 0,
    processed: run.metadata.processed || 0,
    successCount: run.metadata.successCount || 0,
    skippedCount: run.metadata.skippedCount || 0,
    errorCount: run.metadata.errorCount || 0,
    currentBatch: run.metadata.currentBatch || 0,
    totalBatches: run.metadata.totalBatches || 0,
    errors: run.metadata.errors || [],
    percentage: run.metadata.total > 0
      ? Math.round((run.metadata.processed / run.metadata.total) * 100)
      : 0
  } : null;

  return {
    run,
    error,
    progress,
    isCompleted: run?.status === 'COMPLETED',
    isFailed: run?.status === 'FAILED',
    isRunning: ['QUEUED', 'EXECUTING'].includes(run?.status)
  };
};
```

### 4. Updated Modal Flow (`ImportContactsModal.js`)

```javascript
// Add feature flag
const USE_TRIGGER_IMPORT = process.env.REACT_APP_USE_TRIGGER_IMPORT === 'true';

// New state for trigger import
const [runId, setRunId] = useState(null);
const [accessToken, setAccessToken] = useState(null);

// Use realtime hook
const { progress, isCompleted, isFailed } = useContactImportRealtime(runId, accessToken);

// Modified onDrop for trigger flow
const onDropTrigger = async (acceptedFiles) => {
  const file = acceptedFiles[0];

  // 1. Upload CSV to Supabase Storage
  const filePath = `${currentWorkspace.id}/imports/${Date.now()}.csv`;
  const { error: uploadError } = await supabase.storage
    .from('livechat_media')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Get signed URL (1 hour expiry)
  const { data: { signedUrl } } = await supabase.storage
    .from('livechat_media')
    .createSignedUrl(filePath, 3600);

  // 3. Call backend to trigger task
  const response = await fetch('/api/import/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvUrl: signedUrl,
      workspaceId: currentWorkspace.id,
      importTag: importTag || undefined,
      boardPhoneNumber: selectedPhoneNumber || undefined
    })
  });

  const { runId, publicAccessToken } = await response.json();

  // 4. Set state to enable realtime subscription
  setRunId(runId);
  setAccessToken(publicAccessToken);
};

// Render based on flag
const onDrop = USE_TRIGGER_IMPORT ? onDropTrigger : onDropLegacy;
```

---

## Metadata Schema (Realtime Updates)

```typescript
interface ImportProgress {
  status: 'initializing' | 'processing' | 'completed' | 'failed';
  total: number;           // Total contacts to import
  processed: number;       // Contacts processed so far
  successCount: number;    // Successfully imported
  skippedCount: number;    // Skipped (duplicates)
  errorCount: number;      // Failed to import
  currentBatch: number;    // Current batch number
  totalBatches: number;    // Total number of batches
  errors?: Array<string>;  // First 10 error messages
}
```

---

## Import Tracking via Tags

Instead of a separate database table, imports are tracked via the `tags` column:

```javascript
// Tag format: import:<timestamp>
// Example: import:2024-12-24T10:30:00Z

// Query contacts by import batch:
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('workspace_id', workspaceId)
  .contains('tags', ['import:2024-12-24T10:30:00Z']);
```

---

## Feature Flag

```bash
# .env
REACT_APP_USE_TRIGGER_IMPORT=true  # Enable new import
REACT_APP_USE_TRIGGER_IMPORT=false # Use legacy import (default)
```

---

## Testing Checklist

- [ ] Upload small CSV (10 contacts) - verify realtime progress
- [ ] Upload medium CSV (500 contacts) - verify batching
- [ ] Upload large CSV (5000 contacts) - verify performance
- [ ] Test duplicate handling (re-import same CSV)
- [ ] Test with import tag - verify contacts are tagged
- [ ] Test with board phone number - verify metadata set
- [ ] Close browser during import - verify task completes
- [ ] Test error scenarios (invalid CSV, network issues)
- [ ] Toggle feature flag - verify fallback works
