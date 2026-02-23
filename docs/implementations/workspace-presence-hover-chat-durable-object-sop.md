# Workspace Presence Hover Chat (Durable Object) - Technical SOP

## 1. Purpose

Implement workspace-member direct chat from the desktop active-agent presence avatars (top-right floating card) using a Cloudflare Durable Object backend.

When a user hovers an active agent avatar:
- A chat bubble opens
- Recent messages load
- User can send a short direct message
- Receiver gets a real-time notification (red dot on sender's avatar)

## 2. Scope

This SOP covers:
- Frontend desktop presence UI wiring
- Frontend API service integration
- Cloudflare Worker + Durable Object backend
- Auth and workspace membership validation
- Real-time notification system via Supabase Realtime broadcast
- 24-hour message self-destruct via DO alarm
- Deployment, verification, rollback

## 3. Architecture

### Frontend
- `CanvasPresenceBar` renders active collaborators with unread notification dots
- Each collaborator avatar mounts `PresenceChatPopover`
- Popover loads/sends messages via `workspacePresenceChatService`
- `useCanvasPresence` hook manages Supabase Realtime presence + broadcast notifications
- `MainContent` wires notification state (unread counts per sender)

### Backend (Cloudflare)
- Worker route:
  - `GET /api/workspaces/:workspaceId/presence-chat/users/:peerUserId/messages`
  - `POST /api/workspaces/:workspaceId/presence-chat/users/:peerUserId/messages`
  - `GET /health` — health check endpoint
- Worker authenticates caller via Supabase JWT (`/auth/v1/user`)
- Worker validates both users belong to workspace (fail-closed)
- Worker prevents self-chat (`user.id === peerUserId`)
- Worker delegates to Durable Object via RPC methods

### Durable Object
- Class: `WorkspacePresenceChatRoom` extends `DurableObject` from `cloudflare:workers`
- One DO per conversation key: `${workspaceId}:${sorted(userA, userB)}`
- SQLite table stores message history per conversation
- RPC methods: `getMessages(conversationId, limit)`, `postMessage({ ... })`
- Alarm-based 24-hour message self-destruct

### Real-Time Notifications
- Uses Supabase Realtime **broadcast** on existing `infinite-canvas:${workspaceId}` channel
- No extra WebSocket connections needed (piggybacks on cursor/presence tracking channel)
- Flow:
  1. Sender sends message → Worker stores in DO → 201 Created
  2. Sender's frontend broadcasts `presence_chat_message` event on Supabase channel
  3. Receiver's `useCanvasPresence` hook receives broadcast, filters by `recipientUserId`
  4. `MainContent` increments unread count for sender
  5. `CanvasPresenceBar` shows red dot on sender's avatar
  6. Receiver hovers avatar → popover opens → notification clears

## 4. Files Implemented

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/components/MainContent.js` | Notification state wiring (`chatNotifications`, `handleChatNotification`, `clearChatNotification`) |
| `frontend/src/components/canvas/CanvasPresenceBar.js` | Avatar bar with unread notification red dots |
| `frontend/src/components/canvas/PresenceChatPopover.js` | Chat popover UI (messages, input, send, broadcast on send, clear on open) |
| `frontend/src/components/canvas/useCanvasPresence.js` | Supabase Realtime presence + broadcast listener + `broadcastChatNotification` |
| `frontend/src/services/workspacePresenceChatService.js` | API service (fetch/send messages with JWT auth, AbortController support) |
| `.env.example` | Worker URL variable |

### Worker
| File | Purpose |
|------|---------|
| `cloudflare-workers/workspace-presence-chat/src/index.js` | Worker (auth, membership, routing) + Durable Object (SQLite, RPC, alarm) |
| `cloudflare-workers/workspace-presence-chat/wrangler.toml` | Worker config, DO binding, SQLite migration |
| `cloudflare-workers/workspace-presence-chat/package.json` | Dependencies |

## 5. Prerequisites

1. Cloudflare account + Wrangler access.
2. Supabase project with:
   - `workspace_members` table
   - JWT auth enabled
3. Frontend app can provide Supabase access token (`Authorization: Bearer ...`).

## 6. Configuration

### Frontend env

Set:

```bash
REACT_APP_WORKSPACE_PRESENCE_CHAT_WORKER_URL=https://workspace-presence-chat.benjiemalinao879557.workers.dev
```

### Worker secrets

From `cloudflare-workers/workspace-presence-chat`:

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

## 7. Deployment Procedure

1. Install worker dependencies:

```bash
cd cloudflare-workers/workspace-presence-chat
npm install
```

2. Deploy:

```bash
wrangler deploy
```

3. Set secrets (first deploy only):

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

4. Verify health:

```bash
curl https://workspace-presence-chat.benjiemalinao879557.workers.dev/health
```

5. Update frontend environment with deployed worker URL.
6. Deploy frontend.

## 8. API Contract

### GET messages

`GET /api/workspaces/:workspaceId/presence-chat/users/:peerUserId/messages?limit=20`

Response:

```json
{
  "messages": [
    {
      "id": "uuid",
      "senderUserId": "user_1",
      "recipientUserId": "user_2",
      "body": "hello",
      "createdAt": "2026-02-17T12:00:00.000Z"
    }
  ]
}
```

### POST message

`POST /api/workspaces/:workspaceId/presence-chat/users/:peerUserId/messages`

Body:

```json
{
  "message": "hello"
}
```

Response (201):

```json
{
  "message": {
    "id": "uuid",
    "senderUserId": "user_1",
    "recipientUserId": "user_2",
    "body": "hello",
    "createdAt": "2026-02-17T12:00:00.000Z"
  }
}
```

### Health check

`GET /health`

Response:

```json
{
  "status": "ok",
  "service": "workspace-presence-chat",
  "timestamp": "2026-02-18T00:00:00.000Z"
}
```

## 9. Security Rules

1. Require bearer token on all routes (except `/health` and `OPTIONS`).
2. Validate token against Supabase `/auth/v1/user` endpoint.
3. **Fail-closed**: If `SUPABASE_URL` or `SUPABASE_ANON_KEY` is missing, return 401 (no fallback).
4. Validate workspace membership for both sender and peer via `workspace_members` table.
5. **Fail-closed**: If `SUPABASE_SERVICE_ROLE_KEY` is missing, membership check returns `false`.
6. Reject self-chat (`user.id === peerUserId` → 400).
7. Enforce message length cap (`500` chars).

## 10. UI Behavior Specification

1. Presence card shows first 3 active collaborators and `+N` overflow.
2. Hover avatar opens popover (chat bubble).
3. Popover shows:
   - Avatar and name
   - Current activity label
   - Message list (auto-scrolls to latest)
   - Input + send button
4. Poll interval: `4s` while popover is open (with AbortController cleanup).
5. Hover close delay: `180ms` (anti-flicker, shared between trigger and popover content).
6. If worker URL is missing, show non-blocking configuration hint in popover.
7. Red dot appears on avatar when receiver gets a new message (via Supabase broadcast).
8. Red dot clears when receiver hovers the sender's avatar.
9. Fresh messages always load on popover open (stale ref reset on close).

## 11. Message Retention

Messages self-destruct 24 hours after creation:

1. Each `postMessage()` call schedules a cleanup alarm for 24 hours after message creation.
2. If an existing alarm is already scheduled sooner, it's kept (no unnecessary reschedule).
3. When the alarm fires, `alarm()` handler deletes all messages older than 24 hours.
4. If messages remain after cleanup, alarm reschedules for when the oldest message expires.
5. Minimum alarm interval: 60 seconds (prevents tight loops).

## 12. Testing Checklist

### Functional

1. Hover active agent avatar → popover opens.
2. Existing messages render in order (oldest to newest).
3. Send message → appears in popover.
4. Other user opens popover → can see message.
5. If no messages → "Start the conversation" state shown.
6. Send message → red dot appears on sender's avatar for receiver.
7. Receiver hovers avatar → red dot clears.
8. Close popover, wait, re-open → fresh messages load (not stale).

### Security

1. No token → `401`.
2. Token with no workspace membership → `403`.
3. Peer not in workspace → `400`.
4. Self-chat attempt → `400`.
5. Oversized message (>500 chars) → `400`.
6. Missing env vars → hard fail (401/403), no bypass.

### Reliability

1. Worker health endpoint returns `200`: `GET /health`
2. Rapid hover in/out should not leave orphan UI state.
3. Multiple sessions for same user should still allow chat per user pair.
4. Unmounting component while fetch in-flight → no state-setter-on-unmounted warnings (AbortController).
5. Messages disappear after 24 hours (DO alarm cleanup).

## 13. Observability

Track:
- Worker 4xx/5xx counts
- Latency for GET/POST routes
- Durable Object error rates
- Frontend popover error messages frequency
- Supabase Realtime broadcast delivery

Recommended structured log fields:
- `workspaceId`
- `senderUserId`
- `peerUserId`
- `conversationId`

## 14. Rollback Plan

1. Frontend rollback:
   - Remove `REACT_APP_WORKSPACE_PRESENCE_CHAT_WORKER_URL` or redeploy previous frontend build.
   - Presence avatars remain visible; chat bubble shows config hint / stays disabled.

2. Worker rollback:
   - Deploy previous worker version.
   - Durable Object data remains in namespace unless namespace/class changes.

## 15. Review Fixes Applied (2026-02-18)

### P0 — Security
- **Removed auth fallback**: Original code had `decodeJwtSubject()` that base64-decoded JWT without signature verification. Removed entirely — if Supabase config is missing, return 401.
- **Fail-closed membership**: `checkWorkspaceMembership()` now returns `false` when `SUPABASE_SERVICE_ROLE_KEY` is missing (was returning `true`).
- **Self-chat prevention**: Added `user.id === peerUserId` check → 400 error.

### P1 — Cloudflare Best Practices
- **DO base class**: Changed from plain class to `extends DurableObject` from `cloudflare:workers`, using `this.ctx` instead of `this.state`.
- **RPC pattern**: Replaced legacy `stub.fetch(new Request(...))` with direct RPC method calls (`stub.getMessages()`, `stub.postMessage()`).
- **24h self-destruct**: Added alarm-based retention policy — messages auto-delete after 24 hours.

### P2 — Frontend
- **AbortController**: Polling effect now uses `AbortController` — aborts in-flight requests on cleanup/unmount.
- **Auto-scroll**: Added `messagesEndRef` that scrolls to latest message on new messages.
- **Stale ref fix**: `hasLoadedOnceRef` resets to `false` when popover closes, ensuring fresh fetch on re-open.

### Added — Real-Time Notifications
- Supabase Realtime broadcast on existing `infinite-canvas:${workspaceId}` channel.
- Red dot indicator on avatars with unread messages.
- Notification clears when receiver hovers the sender's avatar.

## 16. Operational Notes

- Current implementation uses polling (4s) + broadcast notifications (instant for unread indicator).
- DO stores messages in per-conversation SQLite table with automatic 24h cleanup.
- For future scale:
  - Add rate limiting per user/workspace
  - Add typing indicators via broadcast
  - Consider WebSocket Hibernation for real-time message streaming (eliminates polling)
