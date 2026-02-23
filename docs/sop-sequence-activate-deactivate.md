# SOP: Sequence Activate / Deactivate

## Overview

Sequences now have an **Activate / Deactivate** toggle in the `...` menu on each sequence card (Kanban view). This controls whether new contacts can be enrolled and whether in-progress workflows continue executing.

---

## State Machine

```
                    ┌─────────────────────────────┐
                    │                             │
    UI Create       │         ACTIVE              │
   ─────────────►   │                             │
                    │  ✅ New enrollments allowed  │
                    │  ✅ Workflows executing      │
                    │  ✅ SMS/Email sending         │
                    │                             │
                    └──────────┬──────────────────┘
                               │
                    Deactivate │  ▲  Activate
                    (... menu) │  │  (... menu)
                               │  │
                               ▼  │
                    ┌──────────┴──────────────────┐
                    │                             │
   API/Script       │          DRAFT              │
   (no status)      │                             │
   ─────────────►   │  🚫 Enrollments blocked     │
                    │  🚫 Running workflows stop   │
                    │  🚫 Pending SMS/Email cancel  │
                    │                             │
                    └─────────────────────────────┘

  NOTES:
  • UI-created sequences start as ACTIVE (default)
  • API/script-created sequences start as DRAFT (no status field → default)
  • Reactivating does NOT resume cancelled executions
  • Cancelled contacts must be re-enrolled manually
```

---

## UI Location

```
  Automation → Sequences → Kanban View

  ┌──────────────────────┐
  │ ● Nurture: Follow... │
  │   📱18  ✉6  👤0     │  ← Click "..." on any card
  │              [ ... ] ─┼──► ┌─────────────────┐
  └──────────────────────┘    │  📂 Move to    › │
                              │─────────────────│
                              │  ⏸ Deactivate    │  ← Orange (if active)
                              │  ▶ Activate      │  ← Green  (if draft)
                              │─────────────────│
                              │  🗑 Delete        │
                              └─────────────────┘
```

---

## Data Flow: ACTIVATE (draft → active)

```
  User clicks "Activate"
        │
        ▼
  ┌─────────────────────────────────────────┐
  │  Frontend (index.js)                    │
  │                                         │
  │  supabase.from('flow_sequences')        │
  │    .update({ status: 'active' })        │
  │    .eq('id', sequenceId)                │
  │    .eq('workspace_id', workspaceId)     │
  └─────────────────────────────────────────┘
        │
        ▼
  ✅ Done. Sequence visible in "Active" filter.
     New contacts can now be enrolled.
```

---

## Data Flow: DEACTIVATE (active → draft)

```
  User clicks "Deactivate"
        │
        ▼
  ┌─────────────────────────────────────────────────────────┐
  │  STEP 1: Block new enrollments                          │
  │                                                         │
  │  supabase.from('flow_sequences')                        │
  │    .update({ status: 'draft' })                         │
  │    .eq('id', sequenceId)                                │
  │                                                         │
  │  Backend already checks (sequenceRoutes.js:341):        │
  │    if (sequence.status !== 'active') → 400 error        │
  └────────────────────────┬────────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  STEP 2: Cancel running workflows in Trigger.dev        │
  │                                                         │
  │  supabase.from('flow_executions')                       │
  │    .update({ status: 'cancelled' })                     │
  │    .eq('source', 'sequence_enrollment')                 │
  │    .contains('metadata', { sequence_id: sequenceId })   │
  │    .in('status', ['running','pending','queued'])         │
  │                                                         │
  │  ┌───────────────────────────────────────────────────┐  │
  │  │ Trigger.dev Engine (unifiedWorkflows.js:878)      │  │
  │  │                                                   │  │
  │  │  Before each step:                                │  │
  │  │    SELECT status FROM flow_executions             │  │
  │  │    WHERE id = execution.id                        │  │
  │  │                                                   │  │
  │  │    if status === 'cancelled' → STOP workflow      │  │
  │  │    (no more SMS, email, delays, etc.)             │  │
  │  └───────────────────────────────────────────────────┘  │
  └────────────────────────┬────────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  STEP 3: Cancel analytics executions                    │
  │                                                         │
  │  supabase.from('flow_sequence_executions')              │
  │    .select('id')                                        │
  │    .eq('sequence_id', sequenceId)                       │
  │    .in('status', ['running','pending','queued'])         │
  └────────────────────────┬────────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  STEP 4: Cancel pending message jobs                    │
  │                                                         │
  │  supabase.from('flow_sequence_message_jobs')            │
  │    .update({ status: 'cancelled' })                     │
  │    .in('execution_id', executionIds)                    │
  │    .eq('status', 'pending')                             │
  │                                                         │
  │  → Prevents any scheduled SMS/email from firing          │
  └────────────────────────┬────────────────────────────────┘
                           │
                           ▼
  ┌─────────────────────────────────────────────────────────┐
  │  STEP 5: Mark sequence executions cancelled             │
  │                                                         │
  │  supabase.from('flow_sequence_executions')              │
  │    .update({ status: 'cancelled', completed_at: now })  │
  │    .in('id', executionIds)                              │
  └─────────────────────────────────────────────────────────┘
        │
        ▼
  ✅ Done. All workflows stopped. No more messages will send.
```

---

## Database Tables Affected

```
  ┌──────────────────────────┐     ┌──────────────────────────────┐
  │  flow_sequences          │     │  flow_executions             │
  │──────────────────────────│     │──────────────────────────────│
  │  status: active → draft  │     │  status: running → cancelled │
  │  (blocks enrollment)     │     │  (Trigger.dev checks this)   │
  └──────────────────────────┘     └──────────────────────────────┘

  ┌──────────────────────────────┐  ┌──────────────────────────────┐
  │  flow_sequence_executions    │  │  flow_sequence_message_jobs  │
  │──────────────────────────────│  │──────────────────────────────│
  │  status: running → cancelled │  │  status: pending → cancelled │
  │  (analytics tracking)        │  │  (prevents SMS/email send)   │
  └──────────────────────────────┘  └──────────────────────────────┘
```

---

## Files Modified

| File | Role |
|------|------|
| `frontend/.../kanban/SequenceKanbanCard.js` | Menu item (Activate/Deactivate) |
| `frontend/.../kanban/SequenceKanbanColumn.js` | Prop passthrough |
| `frontend/.../kanban/SequenceKanbanView.js` | Prop passthrough |
| `frontend/.../sequences/index.js` | `handleToggleStatus` handler + Supabase calls |

---

## Important Notes

1. **Frontend-only changes** — no backend (Express) or Trigger.dev deploy needed
2. **Enrollment guard already existed** — `sequenceRoutes.js:341` blocks enrollment when `status !== 'active'`
3. **Reactivating does NOT resume** cancelled workflows — contacts must be re-enrolled
4. **Trigger.dev engine** picks up the cancellation automatically via its existing status check at `unifiedWorkflows.js:878`
5. **All Supabase calls use the frontend client** — RLS applies, workspace-scoped

---

## FAQ

**Q: Can I undo a deactivation?**
A: You can reactivate the sequence, but cancelled workflows won't resume. Re-enroll contacts if needed.

**Q: What if a contact is mid-delay when I deactivate?**
A: The engine checks status before executing the next step. When the delay expires and the next step runs, it will see `cancelled` and stop.

**Q: Does this affect other workspaces?**
A: No. All queries are scoped by `workspace_id`.

**Q: Where do I see draft sequences?**
A: Change the filter dropdown from "Active" to "All" on the Sequences page.
