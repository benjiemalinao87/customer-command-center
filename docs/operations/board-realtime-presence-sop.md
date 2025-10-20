# Real-Time User Presence & Cursor SOP

## Overview
This document details the technical design, database schema, user flow, and standard operating procedures for implementing real-time collaborative presence and cursor features using Supabase Realtime in the LiveChat Kanban board.

---

## 1. Database Design

### Table: `user_presence`
Tracks each user's presence, board context, and cursor.

| Column         | Type         | Description                                  |
| -------------- | ------------ | -------------------------------------------- |
| id             | uuid (PK)    | Unique row id                                |
| user_id        | uuid (FK)    | References `auth.users(id)`                  |
| board_id       | text         | Current board the user is viewing            |
| cursor_x       | float        | Cursor X position (optional)                 |
| cursor_y       | float        | Cursor Y position (optional)                 |
| display_name   | text         | User’s display name                          |
| avatar_url     | text         | User’s avatar                                |
| updated_at     | timestamptz  | Last updated (for presence timeout)          |

#### Indexes:
- `user_presence_board_id_idx` on `board_id`
- `user_presence_user_id_idx` on `user_id`

#### RLS Policies:
- Insert: Only authenticated user can insert their own presence
- Update/Delete: Only owner can update/delete
- Select: Any authenticated user can read presence data

---

## 2. Supabase Realtime Setup
- Enable Realtime for `user_presence` table via Supabase Dashboard → Database → Replication.
- No backend endpoints needed; all updates and subscriptions are via Supabase client SDK.

---

## 3. Frontend Integration

### Relevant Files
- `frontend/src/components/livechat2/boardView/BoardPresence.js` — Presence avatars in board header
- `frontend/src/components/livechat2/boardView/BoardCursors.js` — Real-time animated cursors on board
- `frontend/src/components/livechat2/boardView/BoardView.js` — Passes active board context, integrates presence/cursors

### Core Logic
- On board load or cursor move, upsert user’s presence (with `user_id`, `board_id`, `cursor_x`, `cursor_y`, etc)
- Subscribe to `user_presence` changes for instant UI updates
- Filter by `board_id` for board-specific cursors, show all for presence bar
- Remove/update presence on disconnect or board switch

---

## 4. User Flow Diagram

```
                    ┌──────────────────────────┐
                    │  User logs in /          │
                    │  opens board             │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Frontend upserts        │
                    │  user_presence row       │
                    │  - user_id               │
                    │  - board_id              │
                    │  - cursor_x, cursor_y    │
                    │  - display_name          │
                    │  - avatar_url            │
                    │  - updated_at            │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Supabase Realtime       │
                    │  broadcasts changes      │
                    │  to all subscribers      │
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Other clients receive   │
                    │  updates & update UI     │
                    │  - Presence avatars      │
                    │  - Cursor positions      │
                    └──────┬──────────┬────────┘
                           │          │
                           │          │
              ┌────────────▼──┐   ┌───▼──────────────────┐
              │  User moves   │   │  User closes tab or  │
              │  cursor or    │   │  logs out            │
              │  switches     │   └──────────┬───────────┘
              │  board        │              │
              └───────┬───────┘              ▼
                      │           ┌──────────────────────┐
                      │           │  Presence row        │
                      │           │  deleted or          │
                      │           │  timed out           │
                      │           └──────────────────────┘
                      │
                      └──────────┐
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  Frontend upserts        │
                    │  user_presence row       │
                    │  (Loop back)             │
                    └──────────────────────────┘
```

---

## 5. Frontend + Backend Flow (Sequence)

```
┌──────┐          ┌────────────────────┐          ┌──────────┐
│ User │          │ Frontend (React)   │          │ Supabase │
└──┬───┘          └─────────┬──────────┘          └────┬─────┘
   │                        │                          │
   │ Move cursor /          │                          │
   │ switch board           │                          │
   ├───────────────────────►│                          │
   │                        │                          │
   │                        │ Upsert user_presence     │
   │                        │ {                        │
   │                        │   user_id,               │
   │                        │   board_id,              │
   │                        │   cursor_x,              │
   │                        │   cursor_y,              │
   │                        │   display_name,          │
   │                        │   avatar_url,            │
   │                        │   updated_at             │
   │                        │ }                        │
   │                        ├─────────────────────────►│
   │                        │                          │
   │                        │ Upsert confirmed         │
   │                        │◄─────────────────────────┤
   │                        │                          │
   │                        │                          │ Realtime
   │                        │                          │ broadcast
   │                        │                          │ to all
   │                        │                          │ subscribers
   │                        │                          │
   │                        │ Realtime update          │
   │                        │ for all clients          │
   │                        │◄─────────────────────────┤
   │                        │                          │
   │                        │ Process update:          │
   │                        │ - Update avatars         │
   │                        │ - Update cursors         │
   │                        │ - Update presence list   │
   │                        │                          │
   │ Update UI              │                          │
   │ (avatars, cursors)     │                          │
   │◄───────────────────────┤                          │
   │                        │                          │
```

---

## 6. SOP: Adding/Debugging Presence Features
1. **Check Supabase Table:** Confirm `user_presence` exists and Realtime is enabled.
2. **RLS Policy:** Ensure only authenticated users can write/update their own presence.
3. **Frontend:** Use Supabase client SDK to upsert and subscribe to `user_presence`.
4. **Testing:**
    - Open multiple tabs/incognito sessions to verify real-time updates
    - Move cursor or switch board — all sessions should reflect changes instantly
5. **Cleanup:**
    - Periodically update `updated_at` from client
    - Remove rows if `updated_at` is too old (optional: scheduled job)

---

## 7. Reference: Minimal Upsert/Subscribe (JS)
```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Upsert presence
await supabase.from('user_presence').upsert({
  user_id: user.id,
  board_id: activeBoardId,
  cursor_x: x,
  cursor_y: y,
  display_name: user.name,
  avatar_url: user.avatar,
  updated_at: new Date().toISOString(),
});

// Subscribe to presence
supabase
  .channel('presence-changes')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, payload => {
    // Update UI with payload.new
  })
  .subscribe();
```

---

## 8. Troubleshooting
- If updates aren’t real-time, check Realtime config and RLS policies
- Use Supabase logs to debug failed upserts or subscriptions
- Ensure frontend passes correct auth token

---

## 9. Board Replying Status (Active Reply Indicator)

### Current State
- The BoardReplyingStatus component currently uses only frontend mock logic.
- There is **no backend support** for tracking which user is actively replying to which lead in real time.
- The UI randomly assigns a mock user to a random lead every 5 seconds for demo purposes.

### To Enable Real-Time Backend Support

#### A. Database Table: `lead_replying_status`
| Column       | Type        | Description                                     |
| ------------ | ----------- | ----------------------------------------------- |
| id           | uuid (PK)   | Unique row id                                   |
| lead_id      | text/uuid   | References the lead being replied to            |
| user_id      | uuid        | References `auth.users(id)`                     |
| workspace_id | text        | Workspace context                               |
| board_id     | text        | Board context                                   |
| updated_at   | timestamptz | When the user started/stopped replying          |

#### B. Realtime Logic
- When a user begins replying to a lead, insert or upsert a row into `lead_replying_status`.
- When a user stops, delete or mark the row as inactive (or use a TTL/timeout).
- Subscribe to this table using Supabase Realtime to update the UI for all users.

#### C. Frontend Integration
- On focus/typing in a lead reply input, upsert the user's status for that lead.
- On blur/stop, remove or update the status.
- Subscribe to `lead_replying_status` and display avatars/indicators for users currently replying to each lead.

#### D. Example Table Creation SQL
```sql
CREATE TABLE lead_replying_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  user_id uuid NOT NULL,
  workspace_id text NOT NULL,
  board_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON lead_replying_status (lead_id);
CREATE INDEX ON lead_replying_status (user_id);
```

#### E. RLS Policy Example
```sql
-- Allow users to upsert their own replying status
CREATE POLICY "Allow upsert own replying status" ON lead_replying_status
  FOR INSERT WITH CHECK (auth.uid() = user_id)
  USING (auth.uid() = user_id);
-- Allow select for workspace members
CREATE POLICY "Allow select for workspace members" ON lead_replying_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.user_id = auth.uid()
        AND workspace_members.workspace_id = lead_replying_status.workspace_id
    )
  );
```

---

## 10. Contact
For further help, contact the lead engineer or check the README for escalation procedures.
