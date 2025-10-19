# Voice Calling – Backend ↔ Frontend General Setup

> This guide abstracts the **inbound / outbound voice-calling** implementation that was previously built under
> `backend/inbound-outbound-calling` and the related React components in
> `frontend/src/components/livechat2/*`.  
> Use it as a boiler-plate **check-list** when starting a **new project** where file names,
> database tables or framework choices might differ.

---

## 1. High-level Architecture

1. **Multi-tenant aware backend** (Node 18 +, Express ESM) running on a server platform
   (Railway / Docker / Fly.io) – each *workspace* (tenant) stores its own Twilio
   Voice credentials in the primary database (e.g. Supabase).
2. **REST/HTTP endpoints** provide:
   • *Token generation* (Client Capability / Access Token)
   • *Outbound call initiation* (optional direct-connect server → PSTN)
   • *Call status webhooks* (Twilio → backend)  
   All endpoints are protected by workspace auth (JWT / Supabase service-key).
3. **Web-Socket layer** (e.g. Socket.IO, Supabase Realtime) relays call-state
   events from backend to the React client so the UI updates instantly.
4. **React front-end** initialises a `Twilio.Device` once it receives a fresh
   token, handles microphone permissions, and reacts to incoming `device.on("incoming")` events.

```
Browser ──(HTTPS)──▶ /api/workspaces/:id/token ──▶ Twilio SDK
             ▲                                 ▲
             │                                 │
     Call banner / modal            Twilio Voice REST API
```

---

## 2. Database Sketch (generic)

| Table            | Important columns                                    |
| ---------------- | ---------------------------------------------------- |
| `workspaces`     | `id` PK, `name`, `current_period_starts_at`, `…`     |
| `voice_credentials` | `workspace_id` FK, `account_sid`, `auth_token`, `api_key`, `api_secret`, `twiml_app_sid` |
| `calls`          | `id`, `workspace_id`, `call_sid`, `direction`, `from`, `to`, `status`, `duration_sec`, `created_at` |

> Store *only* non-secret metadata in `calls`. Secrets like API-Keys live in
> `voice_credentials` (and preferably injected as Vault / KMS env vars).

---

## 3. Environment Variables (per deployment)

```
SUPABASE_URL              = …
SUPABASE_SERVICE_KEY      = …
JWT_SECRET                = …  # If you roll your own auth guard
TWILIO_ACCOUNT_SID        = …  # Optional default workspace
TWILIO_AUTH_TOKEN         = …
TWILIO_API_KEY            = …
TWILIO_API_SECRET         = …
TWILIO_TWIML_APP_SID      = …
BASE_CLIENT_URL           = https://app.example.com   # for callback URLs
```

> Each workspace *overrides* these via DB values; env vars act as a fallback or
> for single-tenant staging deployments.

---

## 4. Sample **Token Generation** Endpoint (Backend – ES Modules)

```js
// file: routes/voice/token.js
import express from 'express';
import { jwt as twilioJwt } from 'twilio';
import supabase from '../../lib/supabaseClient.js';

const router = express.Router();

router.get('/:workspaceId/token', async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const identity = req.query.identity || 'anonymous';

    // 1. Load workspace-specific voice credentials
    const { data: creds, error } = await supabase
      .from('voice_credentials')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !creds) {
      return res.status(404).json({ error: 'Voice credentials not configured' });
    }

    // 2. Build Access Token
    const AccessToken = twilioJwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;

    const token = new AccessToken(
      creds.account_sid,
      creds.api_key,
      creds.api_secret,
      { identity, ttl: 60 * 60 }   // 1 h
    );

    token.addGrant(
      new VoiceGrant({ outgoingApplicationSid: creds.twiml_app_sid, incomingAllow: true })
    );

    res.json({ token: token.toJwt(), expires_in: 3600 });
  } catch (err) {
    next(err);
  }
});

export default router;
```

> ✅ **Notes**  
> • Always set a short TTL (e.g. 1 h) and rotate API Keys regularly.  
> • Wrap the route in an auth middleware that validates the caller belongs to
>   `workspaceId`.

---

### Example API Calls via cURL

#### Generate Client Token
```bash
curl -X GET "https://<backend-domain>/api/workspaces/<WORKSPACE_ID>/token?identity=<USER_ID>" \
     -H "Authorization: Bearer <JWT_FROM_FRONTEND>"
```

Returns
```json
{ "token": "<twilio_jwt>", "expires_in": 3600 }
```

#### Initiate Outbound Call (server-side connect)
```bash
curl -X POST "https://<backend-domain>/api/workspaces/<WORKSPACE_ID>/make-direct-call" \
     -H "Authorization: Bearer <JWT_FROM_FRONTEND>" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "+15551234567",
       "identity": "<USER_ID>",
       "contactId": "<OPTIONAL_CONTACT_UUID>"
     }'
```

Successful response:
```json
{
  "success": true,
  "message": "Call initiated successfully",
  "callSid": "CAxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "initiated"
}
```

---

## 5. Front-end: Minimal **useVoiceDevice** React Hook

```jsx
// libs/hooks/useVoiceDevice.js
import { useEffect, useRef, useState } from 'react';
import * as TwilioVoice from '@twilio/voice-sdk';
import axios from 'axios';

export function useVoiceDevice(workspaceId, identity) {
  const deviceRef = useRef(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | ringing | oncall

  useEffect(() => {
    const initialise = async () => {
      try {
        // 1. Ask for microphone permission early
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // 2. Fetch fresh token
        const { data } = await axios.get(`/api/workspaces/${workspaceId}/token`, {
          params: { identity }
        });

        // 3. Create / update device
        deviceRef.current?.destroy();
        deviceRef.current = await TwilioVoice.Device.setup(data.token, {
          codecPreferences: ['opus', 'pcmu'],
          edge: 'roaming'
        });

        deviceRef.current.on('incoming', call => {
          setIncomingCall(call);
          setStatus('ringing');
        });

        deviceRef.current.on('disconnect', () => setStatus('idle'));
        deviceRef.current.on('connect',   () => setStatus('oncall'));
      } catch (err) {
        console.error('Voice device init failed', err);
      }
    };

    initialise();
    return () => deviceRef.current?.destroy();
  }, [workspaceId, identity]);

  // Public helpers
  const accept = () => incomingCall?.accept();
  const reject = () => incomingCall?.reject();

  return { status, accept, reject, device: deviceRef.current };
}
```

> **Why a hook?**  
> • Encapsulates token fetching, media permission, event wiring.  
> • Caller components (`IncomingCallModal`, `CallBanner`) only worry about UI.

---

## 6. Incoming Call UI Flow (pseudo)

```txt
┌──────────────────────────────┐
│  Twilio sends SIP/Voice TwiML │
└──────────────┬───────────────┘
               │ webhook
               ▼
   /api/voice/incoming  →  emits "incoming" via Socket.IO
               ▼
     React `useVoiceDevice` gets the event and opens `IncomingCallModal`
```

1. **Server** emits a socket message `{ type: 'incoming-call', callSid, from }` .
2. **useVoiceDevice** (or dedicated `TwilioInboundListener`) listens and calls
   `deviceRef.current.connect()` automatically – or shows modal for user action.
3. **UI component** (`IncomingCallModal.js`) asks the user **Accept / Decline**.
4. On accept → `call.accept()`, UI switches to `CallDialog.js`.

---

## Voice Settings UI (Configuration Card)

The *Phone › Voice Settings* screen offers a **self-service** way for users to switch on voice calling without ever visiting the Twilio Console.

### Key UX behaviours

| Step | What the UI does | API call |
| ---- | --------------- | -------- |
| 1. Credentials entered | User submits **Account SID** & **Auth Token** | `POST /api/workspaces/:id/configure-twilio` |
| 2. Progress 25 % | Shows “Validating credentials…” while waiting for 200 OK | – |
| 3. Progress 50 % | Backend starts auto-creating API-Key + stores in DB | (same request) |
| 4. Progress 75 % | When request resolves, UI calls status check | `GET /api/workspaces/:id/twilio-status` |
| 5. Progress 100 % | `configured:true` & `has_twiml_app:true` → green banner | – |

`VoiceConfigurationCard.js` maps the booleans returned by `twilio-status` into live badges:

```json
{
  "configured": true,
  "has_twiml_app": true,
  "account_sid": "AC…",
  "setup_method": "auto" | "manual"
}
```

A **Test Connection** button simply performs a token request:
`GET /api/workspaces/:id/token` and shows success / error toasts.

### Component hierarchy
```
VoiceSettings.js
 └─ VoiceConfigurationCard.js  ← this file
     ├─ Progress <Chakra UI>
     ├─ Status <Alert/Badge>
     └─ Form <Input Account SID / Auth Token>
```

The card uses Chakra UI, Lucide icons and follows the macOS aesthetic (light/dark, 8 px grid, purple accent).

### Auto-configuration magic (backend recap)
* Checks / creates Twilio **API Key/Secret** and **TwiML App** on the fly.
* Persists them in `workspace_twilio_config` table.
* Webhooks are pre-filled to
  `POST /api/workspaces/:id/voice` (call), `/voice/status`, `/voice/fallback`.
* Because of this the user only enters **2 fields** – everything else is hands-off.

---

## 7. Permissions Matrix

| Capability           | Browser Prompt              | When to request                      |
| -------------------- | --------------------------- | ------------------------------------ |
| Microphone access    | getUserMedia({ audio })      | *Before* calling / when app loads    |
| Notifications (opt.) | Notification.requestPermit()| To show background ringing alerts    |

> Always fail gracefully: if the user denies microphone access, disable the
> *Call* buttons and surface a clear tooltip.

---

## 8. Security & Monitoring Checklist

- **JWT** between front-end and backend (supabase / clerk) → prevents cross-tenant token leaks.  
- **CORS** locked to your front-end origins.
- Verify **X-Twilio-Signature** headers on *all* webhooks.
- Log `callSid`, `from`, `to`, `status` transitions for auditing.
- Auto-revoke tokens when user logs out or changes workspace.

---

## 9. Next Steps / Future Improvements

1. Push tokens into Redis and reuse until TTL instead of generating every page
   load (reduces Twilio JWT bandwidth).
2. Implement **call recording** & **transcription** pipelines.
3. Add **automatic reconnection** logic with exponential back-off in the hook.
4. Build an *admin* dashboard for aggregated call metrics per workspace.

---

© 2025 Automate8 – Crafted following the Mac OS design and clean architecture ethos.
