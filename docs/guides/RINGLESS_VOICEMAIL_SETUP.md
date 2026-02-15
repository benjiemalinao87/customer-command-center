# Ringless Voicemail Setup Guide

This guide walks you through activating the Ringless Voicemail feature in the Flow Builder.

## Prerequisites

- Slybroadcast account (sign up at [slybroadcast.com](https://www.slybroadcast.com))
- Access to Railway/Trigger.dev environment variables
- Access to Supabase database

---

## Step 1: Sign Up for Slybroadcast

1. Go to [slybroadcast.com](https://www.slybroadcast.com)
2. Create an account (pay-as-you-go at $0.10/delivery or monthly subscription)
3. Note your login credentials (email and password)

---

## Step 2: Apply Database Migration

Run the migration to create the required tables.

### Option A: Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of:
   ```
   supabase/migrations/20260128_create_ringless_voicemail_tables.sql
   ```
3. Click "Run"

### Option B: Supabase CLI
```bash
supabase db push
```

### Tables Created:
| Table | Purpose |
|-------|---------|
| `workspace_audio_recordings` | Store uploaded/recorded audio files |
| `rvm_delivery_logs` | Track delivery status and history |
| `workspace_rvm_usage` | Monthly usage tracking per workspace |

---

## Step 3: Set Environment Variables

Add these to your **Trigger.dev** environment in Railway:

### Required Variables
```bash
# Slybroadcast credentials
SLYBROADCAST_EMAIL=your-slybroadcast-email@example.com
SLYBROADCAST_PASSWORD=your-slybroadcast-password
```

### Feature Flag (choose one)

**Option A: Enable for specific workspaces (for testing)**
```bash
RVM_ALLOWED_WORKSPACE_IDS=workspace-id-1,workspace-id-2
```

**Option B: Enable globally (for production)**
```bash
FEATURE_RVM_ENABLED=true
```

### Optional Variables
```bash
# Monthly limit per workspace (default: 1000)
RVM_MONTHLY_LIMIT_PER_WORKSPACE=1000
```

---

## Step 4: Deploy Trigger.dev

Deploy the new task to Trigger.dev:

```bash
cd /path/to/project
npx trigger deploy
```

Verify deployment:
1. Go to [cloud.trigger.dev](https://cloud.trigger.dev)
2. Navigate to your project
3. Confirm `send-ringless-voicemail` task appears in the task list

---

## Step 5: Deploy Backend

Push your changes to deploy the webhook route:

```bash
git add .
git commit -m "Add Ringless Voicemail webhook route"
git push
```

The webhook endpoint will be:
```
POST https://cc.automate8.com/webhooks/rvm/slybroadcast/:workspaceId
```

---

## Step 6: Test the Feature

### 6.1 Open Flow Builder
1. Navigate to Automation → Flows
2. Create or edit a flow

### 6.2 Add Ringless Voicemail Action
1. Add an **Action** node
2. Go to **Advanced Actions** category
3. Select **Ringless Voicemail**

### 6.3 Configure the Action
1. **Audio Source Tab:**
   - Record audio directly in browser, OR
   - Upload an audio file (WAV, MP3, M4A)

2. **Settings Tab:**
   - Select Caller ID (optional)
   - Enable "Mobile Only" filter (optional)

3. **Test Tab:**
   - Enter a test phone number
   - Click "Send Test Voicemail"

### 6.4 Verify Delivery
1. Check Trigger.dev dashboard for task execution
2. Check `rvm_delivery_logs` table for delivery status
3. Verify voicemail received on test phone

---

## Step 7: Remove "Coming Soon" Badge (Optional)

Once testing is complete, remove the badge:

**File:** `frontend/src/components/flow-builder/actions/ActionSidebar.js`

Change:
```javascript
{ type: 'ringless_voicemail', name: 'Ringless Voicemail', description: 'Deliver voicemail without ringing', icon: Voicemail, color: '#8b5cf6', badge: 'Coming Soon' }
```

To:
```javascript
{ type: 'ringless_voicemail', name: 'Ringless Voicemail', description: 'Deliver voicemail without ringing', icon: Voicemail, color: '#8b5cf6' }
```

---

## Troubleshooting

### Feature not enabled error
- Verify `FEATURE_RVM_ENABLED=true` OR your workspace ID is in `RVM_ALLOWED_WORKSPACE_IDS`

### Audio upload fails
- Check Supabase storage bucket permissions
- Verify file type is WAV, MP3, or M4A

### Voicemail not delivered
- Check Slybroadcast credentials are correct
- Verify phone number format (E.164: +1XXXXXXXXXX)
- Check `rvm_delivery_logs` table for error details
- Review Trigger.dev dashboard for task failures

### Webhook not updating status
- Verify backend is deployed with webhook route
- Check Slybroadcast is configured with correct callback URL

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SLYBROADCAST_EMAIL` | Yes | Slybroadcast account email |
| `SLYBROADCAST_PASSWORD` | Yes | Slybroadcast account password |
| `FEATURE_RVM_ENABLED` | No* | Set to `true` to enable globally |
| `RVM_ALLOWED_WORKSPACE_IDS` | No* | Comma-separated workspace IDs for testing |
| `RVM_MONTHLY_LIMIT_PER_WORKSPACE` | No | Monthly limit per workspace (default: 1000) |

*At least one of `FEATURE_RVM_ENABLED` or `RVM_ALLOWED_WORKSPACE_IDS` must be set.

---

## Files Reference

| File | Purpose |
|------|---------|
| `trigger/ringlessVoicemailTask.js` | Trigger.dev task for sending voicemails |
| `trigger/unifiedWorkflows.js` | Case handler that calls the task |
| `frontend/.../RinglessVoicemailAction.js` | Action configuration UI |
| `frontend/.../AudioRecordingsLibrary.js` | Audio recording/upload component |
| `backend/index.js` | Webhook route for delivery status |
| `supabase/migrations/20260128_*.sql` | Database schema |
