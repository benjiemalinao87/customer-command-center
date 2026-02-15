# SendGrid Email Setup - Standard Operating Procedure (SOP)

> **For:** New developers, team members, and SaaS customers  
> **Last Updated:** January 15, 2026  
> **Version:** 1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Part 1: Basic SendGrid Configuration](#part-1-basic-sendgrid-configuration)
4. [Part 2: Domain Authentication (Sending)](#part-2-domain-authentication-sending)
5. [Part 3: Inbound Email Setup (Receiving)](#part-3-inbound-email-setup-receiving)
6. [Part 4: Event Webhook Setup (Metrics)](#part-4-event-webhook-setup-metrics)
7. [Testing Your Setup](#testing-your-setup)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Overview

This SOP covers the complete setup for SendGrid email integration with our platform, enabling:

| Feature | Description |
|---------|-------------|
| ✉️ **Send Emails** | Send emails to leads/contacts from LiveChat and workflows |
| 📥 **Receive Replies** | Lead replies appear as messages in LiveChat |
| 📊 **Track Metrics** | Open rates, click rates, bounces, deliverability |
| 🔄 **Threading** | Email conversations stay threaded |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR SENDGRID ACCOUNT                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐        │
│  │   SENDING    │   │  RECEIVING   │   │   METRICS    │        │
│  │              │   │              │   │              │        │
│  │ Domain Auth  │   │ Inbound Parse│   │Event Webhook │        │
│  │ (CNAME)      │   │ (Uses OUR    │   │(Auto-config) │        │
│  │              │   │  domain)     │   │              │        │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘        │
│         │                  │                  │                 │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                     OUR PLATFORM                                 │
│                                                                  │
│  Outbound emails     Inbound replies      Opens, clicks,        │
│  via your domain     routed via           bounces tracked       │
│                      reply+{id}@          in Analytics          │
│                      inbound.automate8.com                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:

- [ ] A SendGrid account (Free tier works for testing)
- [ ] Admin access to your DNS provider (GoDaddy, Cloudflare, Namecheap, etc.)
- [ ] Access to our platform's Settings → Integrations page
- [ ] Your workspace ID (found in Settings → General)

---

## Part 1: Basic SendGrid Configuration

### Step 1.1: Get Your SendGrid API Key

1. Log in to [SendGrid Dashboard](https://app.sendgrid.com)
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Select **Full Access** (or at minimum: Mail Send, Tracking)
5. Copy the API key (you won't see it again!)

### Step 1.2: Add API Key to Our Platform

1. Go to **Settings** → **Integrations** → **SendGrid**
2. Enter your API key
3. Enter default sender email (e.g., `hello@yourdomain.com`)
4. Enter default sender name (e.g., `Your Company`)
5. Click **Save Configuration**
6. Click **Test Connection** to verify

✅ **Expected Result:** "Connection successful" message

---

## Part 2: Domain Authentication (Sending)

### Why Domain Authentication?

- Improves email deliverability
- Prevents emails going to spam
- Shows your domain in "mailed-by" field
- Required for production use

### Step 2.1: Create Domain Authentication in SendGrid

1. Go to **Settings** → **Sender Authentication**
2. Click **Authenticate Your Domain**
3. Select your DNS provider (or "I'm not sure")
4. Enter your domain (e.g., `yourdomain.com`)
5. Click **Next**

### Step 2.2: Add DNS Records

SendGrid will provide 3-5 CNAME records. Add them to your DNS:

| Type | Host/Name | Value |
|------|-----------|-------|
| CNAME | `em1234.yourdomain.com` | `u12345.wl.sendgrid.net` |
| CNAME | `s1._domainkey.yourdomain.com` | `s1.domainkey.u12345.wl.sendgrid.net` |
| CNAME | `s2._domainkey.yourdomain.com` | `s2.domainkey.u12345.wl.sendgrid.net` |

> ⚠️ **Note:** Actual values will differ. Copy exactly from SendGrid dashboard.

### Step 2.3: Verify Domain

1. Wait 5-10 minutes for DNS propagation
2. Return to SendGrid → **Sender Authentication**
3. Click **Verify** on your domain
4. Should show ✅ green checkmark

✅ **Expected Result:** Domain shows "Verified" status

---

## Part 3: Inbound Email Setup (Receiving)

### How Inbound Email Works

```
Lead receives your email with Reply-To:
reply+22836-abc123@inbound.automate8.com
       ↓
Lead clicks Reply and sends response
       ↓
Email routes to inbound.automate8.com
       ↓
Our webhook parses workspace (22836) and contact (abc123)
       ↓
Reply appears in YOUR LiveChat conversation!
```

### Good News: No DNS Setup Required! 🎉

Our platform handles inbound email routing automatically using our domain (`inbound.automate8.com`). 

**You don't need to:**
- Add MX records to your domain
- Configure Inbound Parse yourself
- Worry about conflicting with your existing email

**What happens automatically:**
- Every outbound email includes a dynamic Reply-To address
- Replies route to our central webhook
- We parse the workspace/contact and display in LiveChat

### Step 3.1: Verify Inbound is Working

1. Send an email from LiveChat to a test contact (yourself)
2. Check the email headers - you should see:
   ```
   Reply-To: reply+{workspaceId}-{contactId}@inbound.automate8.com
   ```
3. Reply to that email
4. Check LiveChat - the reply should appear!

✅ **Expected Result:** Reply appears in LiveChat within 30 seconds

---

## Part 4: Event Webhook Setup (Metrics)

### What Metrics Are Tracked?

| Event | Description |
|-------|-------------|
| `delivered` | Email reached recipient's mail server |
| `open` | Recipient opened the email |
| `click` | Recipient clicked a link |
| `bounce` | Email bounced (hard/soft) |
| `dropped` | SendGrid dropped the email |
| `spam_report` | Recipient marked as spam |
| `unsubscribe` | Recipient unsubscribed |

### Step 4.1: Auto-Configure Webhooks (Recommended)

1. Go to **Settings** → **Integrations** → **SendGrid**
2. Scroll to **Event Tracking** section
3. Click **Auto-Configure Webhooks**
4. Wait for confirmation message

✅ **Expected Result:** Shows "Webhooks configured" with list of enabled events

### Step 4.2: Manual Configuration (Alternative)

If auto-configure doesn't work:

1. Go to SendGrid → **Settings** → **Mail Settings** → **Event Webhook**
2. Enable the webhook
3. Set HTTP POST URL:
   ```
   https://cc.automate8.com/api/sendgrid/webhook/events/{YOUR_WORKSPACE_ID}
   ```
4. Enable these events:
   - ✅ Delivered
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced
   - ✅ Dropped
   - ✅ Spam Reports
   - ✅ Unsubscribes
5. Click **Save**

### Step 4.3: Verify Metrics Are Working

1. Send a test email from LiveChat
2. Open the email (creates "open" event)
3. Click a link in the email (creates "click" event)
4. Go to **Analytics** → **Email Performance**
5. Verify events appear in the dashboard

✅ **Expected Result:** Open/click events show in Analytics within 5 minutes

---

## Testing Your Setup

### Complete Test Checklist

| Test | How to Verify | Expected Result |
|------|---------------|-----------------|
| **Send Email** | Send email from LiveChat | Email received in inbox |
| **Domain Shows** | Check email headers | "mailed-by: yourdomain.com" |
| **Reply Works** | Reply to test email | Reply appears in LiveChat |
| **Opens Tracked** | Open email, check Analytics | Open count increases |
| **Clicks Tracked** | Click link, check Analytics | Click count increases |
| **Threading** | Send reply from LiveChat | Shows in same email thread |

### Quick Test Script

```bash
# 1. Send test email
# Go to LiveChat → Select a contact → Click email icon → Send

# 2. Check inbound webhook logs (internal)
# Railway logs should show: "📨 Central inbound webhook received"

# 3. Check event webhook logs (internal)
# Railway logs should show: "📊 SendGrid event webhook received"
```

---

## Troubleshooting

### Issue: Emails Going to Spam

**Causes & Solutions:**

1. **Domain not authenticated**
   - Complete Part 2 (Domain Authentication)
   - Verify all CNAME records are correct

2. **Low sender reputation**
   - Warm up your domain gradually
   - Start with engaged contacts
   - Avoid spammy subject lines

3. **Missing SPF/DKIM**
   - Verify domain authentication in SendGrid
   - Check DNS records propagated

### Issue: Replies Not Appearing in LiveChat

**Causes & Solutions:**

1. **Wrong Reply-To address**
   - Check email headers for `reply+{id}@inbound.automate8.com`
   - If missing, contact support

2. **Webhook not receiving**
   - Check Railway logs for webhook calls
   - Verify SendGrid Inbound Parse is configured (internal)

3. **Contact ID mismatch**
   - Verify the contact exists in your workspace
   - Check logs for "Contact not found" errors

### Issue: Metrics Not Showing

**Causes & Solutions:**

1. **Event webhook not configured**
   - Go to Settings → SendGrid → Click "Auto-Configure Webhooks"
   - Or manually configure in SendGrid dashboard

2. **Wrong webhook URL**
   - Verify URL includes your workspace ID
   - Format: `https://cc.automate8.com/api/sendgrid/webhook/events/{workspaceId}`

3. **Events disabled**
   - Check SendGrid Event Webhook settings
   - Ensure all event types are enabled

### Issue: "API Key Invalid" Error

**Causes & Solutions:**

1. **Wrong API key**
   - Generate a new API key in SendGrid
   - Ensure "Full Access" permissions

2. **Key expired or revoked**
   - Check SendGrid → Settings → API Keys
   - Create new key if needed

---

## FAQ

### Q: Do I need to add MX records to my domain?

**A:** No! Our platform uses a centralized inbound system (`inbound.automate8.com`). Your domain's MX records remain unchanged, so your existing email (Gmail, Outlook, etc.) continues working normally.

### Q: Can leads reply to my email address directly?

**A:** The Reply-To address is automatically set to our routing address. When leads reply, it routes to our system and appears in LiveChat. The lead sees your "From" address but replies go through our system for tracking.

### Q: What happens if I have multiple workspaces?

**A:** Each workspace gets its own unique Reply-To encoding. Replies automatically route to the correct workspace based on the ID in the address.

### Q: Is there a limit on emails I can send?

**A:** Limits depend on your SendGrid plan:
- Free: 100 emails/day
- Essentials: 40,000-100,000 emails/month
- Pro: Higher limits with dedicated IP

### Q: How long do metrics take to appear?

**A:** 
- Delivered: Immediate to 5 minutes
- Opens: When recipient opens (usually within hours)
- Clicks: When recipient clicks (real-time)
- Bounces: Immediate to 24 hours

### Q: Can I use my own domain for Reply-To?

**A:** Currently, we use our centralized domain for reliability. Custom Reply-To domains may be available in future enterprise plans.

---

## Support

If you encounter issues not covered in this guide:

1. **Check Logs:** Railway dashboard for webhook logs
2. **Contact Support:** support@automate8.com
3. **Documentation:** [Full SendGrid Integration Docs](./SENDGRID_INTEGRATION_IMPLEMENTATION_PLAN.md)

---

## Appendix: Technical Reference

### Webhook Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/sendgrid/webhook/events/{workspaceId}` | Event tracking (opens, clicks, etc.) |
| `POST /api/sendgrid/webhook/inbound-central` | Centralized inbound email handler |

### Reply-To Address Format

```
reply+{workspaceId}-{contactId}@inbound.automate8.com
reply+{workspaceId}-{contactId}-{messageId}@inbound.automate8.com
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `workspace_sendgrid_config` | API keys, sender settings |
| `sendgrid_events` | Event tracking data |
| `email_messages` | Email content and metadata |
| `livechat_messages` | Messages displayed in chat UI |

---

*Document maintained by the Engineering Team*
