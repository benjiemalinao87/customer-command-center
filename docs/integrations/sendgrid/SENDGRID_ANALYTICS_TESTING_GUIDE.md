# SendGrid Email Analytics Testing Guide

This guide provides step-by-step instructions for testing the SendGrid Email Analytics integration.

## Prerequisites

- Active SendGrid account with API key
- Workspace ID with SendGrid configured (e.g., workspace 22836)
- Access to SendGrid dashboard
- Test email address for receiving emails
- Verified sender domain in SendGrid

## Testing Overview

The testing process covers 5 main areas:

1. **Send Test Emails** - Generate email events via SendGrid API
2. **Configure Event Webhook** - Set up SendGrid to send events to our backend
3. **Verify Database Events** - Confirm events are stored in `sendgrid_events` table
4. **Test Analytics Endpoints** - Verify API endpoints return correct metrics
5. **Test Inbound Email** - Verify email reception and threading

---

## Quick Start: Using the Test Script

We've created an automated test script to streamline the testing process.

### Run the Test Script

```bash
cd /Users/benjiemalinao/Documents/deepseek-test-livechat
node scripts/test-sendgrid-analytics.js
```

The script will prompt you for:
- Workspace ID
- SendGrid API Key
- Test email address

You can then choose to:
- Run all tests automatically
- Run tests individually via interactive menu

---

## Manual Testing Instructions

### Test 1: Send Test Emails via SendGrid

#### Option A: Via Test Script
```bash
node scripts/test-sendgrid-analytics.js
# Select option 1
```

#### Option B: Via cURL
```bash
curl --request POST \
  --url https://api.sendgrid.com/v3/mail/send \
  --header 'Authorization: Bearer YOUR_SENDGRID_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "personalizations": [
      {
        "to": [{"email": "test@example.com"}],
        "subject": "SendGrid Analytics Test"
      }
    ],
    "from": {
      "email": "noreply@automate8.com",
      "name": "Automate8 Test"
    },
    "content": [
      {
        "type": "text/html",
        "value": "<p>Test email with <a href=\"https://automate8.com\">tracking link</a></p>"
      }
    ],
    "tracking_settings": {
      "click_tracking": {"enable": true},
      "open_tracking": {"enable": true}
    },
    "custom_args": {
      "workspace_id": "22836"
    }
  }'
```

#### Option C: Via Frontend UI
1. Log into workspace 22836
2. Navigate to LiveChat
3. Send an email to a contact
4. Open the email and click any links

#### Expected Results
- ✅ Email sent successfully (202 status)
- ✅ Receive Message-ID in response headers
- ✅ Email delivered to recipient within 1-2 minutes

---

### Test 2: Configure Event Webhook in SendGrid Dashboard

#### Step-by-Step Configuration

1. **Access SendGrid Dashboard**
   - Go to: https://app.sendgrid.com/settings/mail_settings
   - Find "Event Webhook" section

2. **Configure Webhook URL**
   ```
   HTTP Post URL: https://cc.automate8.com/api/sendgrid/webhook/events/22836
   ```
   Replace `22836` with your actual workspace ID.

3. **Enable Event Types**
   Select ALL of the following events:
   - ✅ Delivered
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced
   - ✅ Dropped
   - ✅ Spam Report
   - ✅ Unsubscribe

4. **Configure Signature Verification (Recommended)**
   - Enable "Signature Verification"
   - Copy the generated signing key
   - Store it in `sendgrid_event_webhook_config` table:
   
   ```sql
   INSERT INTO sendgrid_event_webhook_config (workspace_id, signing_key, is_enabled)
   VALUES (22836, 'YOUR_SIGNING_KEY', true)
   ON CONFLICT (workspace_id) 
   DO UPDATE SET signing_key = EXCLUDED.signing_key, is_enabled = true;
   ```

5. **Test the Webhook**
   - Click "Test Your Integration" button in SendGrid
   - Check backend logs for incoming webhook request
   - Verify test event appears in `sendgrid_events` table

6. **Save Configuration**
   - Click "Save" button
   - Ensure "Enabled" toggle is ON

#### Verify Configuration via API

```bash
curl --request GET \
  --url https://api.sendgrid.com/v3/user/webhooks/event/settings \
  --header 'Authorization: Bearer YOUR_SENDGRID_API_KEY'
```

Or use the test script:
```bash
node scripts/test-sendgrid-analytics.js
# Select option 2
```

#### Expected Results
- ✅ Webhook URL matches: `https://cc.automate8.com/api/sendgrid/webhook/events/{workspaceId}`
- ✅ Webhook is enabled
- ✅ All required event types are enabled
- ✅ Test event received successfully

---

### Test 3: Verify Events Populate in sendgrid_events Table

#### Check via Supabase SQL Editor

```sql
-- View recent events for workspace
SELECT 
  event_type,
  email,
  timestamp,
  sg_message_id,
  sg_event_id,
  url,
  user_agent,
  created_at
FROM sendgrid_events
WHERE workspace_id = 22836
ORDER BY timestamp DESC
LIMIT 20;
```

#### Check Event Summary

```sql
-- Get event type summary
SELECT 
  event_type,
  COUNT(*) as count,
  MIN(timestamp) as first_event,
  MAX(timestamp) as last_event
FROM sendgrid_events
WHERE workspace_id = 22836
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

#### Check via Test Script

```bash
node scripts/test-sendgrid-analytics.js
# Select option 3
```

#### Expected Results
- ✅ Events appear within 2-5 minutes of email being sent
- ✅ `processed` event appears first
- ✅ `delivered` event appears after delivery
- ✅ `open` event appears when email is opened
- ✅ `click` event appears when links are clicked
- ✅ All events have correct `workspace_id`
- ✅ Events include `sg_message_id` and `sg_event_id`

#### Troubleshooting

**No events appearing?**
1. Check webhook is enabled in SendGrid dashboard
2. Verify webhook URL is correct
3. Check backend logs for webhook requests:
   ```bash
   # If using PM2
   pm2 logs backend --lines 100
   ```
4. Verify firewall allows SendGrid IPs
5. Test webhook endpoint manually:
   ```bash
   curl -X POST https://cc.automate8.com/api/sendgrid/webhook/events/22836 \
     -H "Content-Type: application/json" \
     -d '[{"event":"delivered","email":"test@example.com","timestamp":1234567890}]'
   ```

---

### Test 4: Confirm Metrics Display in Analytics Dashboard

#### Test via Frontend UI

1. **Access Analytics Dashboard**
   - Log into workspace 22836
   - Navigate to: Settings → Analytics
   - Or direct URL: `https://your-frontend-url/analytics`

2. **Add Email Performance Widgets**
   - Click "Add Widget" button
   - Select "Email Performance" category
   - Add these widgets:
     - Email Overview
     - Delivery Rates
     - Email Activity
     - Open/Click Rates

3. **Or Use Predefined Dashboard**
   - Click "Templates" button
   - Select "Email Analytics" template
   - Click "Apply Template"

4. **Verify Data Display**
   - Check "Email Overview" shows:
     - Total Sent
     - Delivered
     - Opened
     - Bounced
   - Check "Delivery Rates" pie chart shows:
     - Delivered %
     - Bounced %
     - Dropped %
   - Check "Email Activity" trend chart shows:
     - Daily sent/delivered/opened trends
   - Check "Open/Click Rates" bar chart shows:
     - Open Rate %
     - Click Rate %

#### Test via API Endpoints

```bash
# Test Email Metrics Overview
curl "https://cc.automate8.com/api/analytics/email-metrics/overview?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Test Delivery Rates
curl "https://cc.automate8.com/api/analytics/email-metrics/delivery-rates?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Test Engagement Rates
curl "https://cc.automate8.com/api/analytics/email-metrics/engagement-rates?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Test Trend Data
curl "https://cc.automate8.com/api/analytics/email-metrics/trend?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Test Unsubscribe & Spam
curl "https://cc.automate8.com/api/analytics/email-metrics/unsubscribe-spam?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"
```

#### Test via Test Script

```bash
node scripts/test-sendgrid-analytics.js
# Select option 4
```

#### Expected Results

**Email Overview Response:**
```json
{
  "totalSent": 150,
  "totalDelivered": 145,
  "totalOpened": 89,
  "totalClicked": 34,
  "totalBounced": 5,
  "totalSpamReports": 1,
  "totalUnsubscribes": 2
}
```

**Delivery Rates Response:**
```json
{
  "deliveryRate": 96.67,
  "bounceRate": 3.33,
  "droppedRate": 0
}
```

**Engagement Rates Response:**
```json
{
  "openRate": 61.38,
  "clickRate": 23.45
}
```

**Trend Data Response:**
```json
[
  {
    "date": "2026-01-15",
    "sent": 25,
    "delivered": 24,
    "opened": 15
  },
  ...
]
```

#### Troubleshooting

**No data showing in dashboard?**
1. Verify events exist in `sendgrid_events` table (Test 3)
2. Check browser console for API errors
3. Verify date range includes events
4. Check backend logs for errors
5. Verify workspace ID is correct

**Metrics seem incorrect?**
1. Check event aggregation logic in `backend/src/services/analytics/emailAnalytics.js`
2. Verify events have correct `event_type` values
3. Check for duplicate events (same `sg_event_id`)
4. Verify `timestamp` field is populated correctly

---

### Test 5: Test Inbound Email Reception and Threading

#### Configure Inbound Parse

1. **Access SendGrid Inbound Parse Settings**
   - Go to: https://app.sendgrid.com/settings/parse
   - Click "Add Host & URL"

2. **Configure Subdomain**
   - Choose a subdomain (e.g., `inbound`)
   - Choose your verified domain (e.g., `automate8.com`)
   - Full address will be: `inbound.automate8.com`

3. **Set Destination URL**
   ```
   https://cc.automate8.com/api/sendgrid/webhook/inbound/22836
   ```
   Replace `22836` with your workspace ID.

4. **Check Spam Check** (Optional)
   - Enable "Check incoming emails for spam"

5. **Save Configuration**

#### Test Inbound Email Reception

1. **Send Test Email**
   - From your personal email client
   - To: `anything@inbound.automate8.com`
   - Subject: "Test Inbound Email"
   - Body: "This is a test inbound email"

2. **Verify in Database**
   ```sql
   SELECT 
     id,
     from_email,
     from_name,
     subject,
     direction,
     message_id,
     in_reply_to_message_id,
     created_at
   FROM email_messages
   WHERE workspace_id = 22836
     AND direction = 'inbound'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check LiveChat UI**
   - Navigate to LiveChat
   - Find the contact matching the sender email
   - Verify inbound email appears as a message bubble
   - Check message metadata shows it's from email

#### Test Email Threading (Reply Detection)

1. **Send Outbound Email First**
   - Via LiveChat UI, send an email to a contact
   - Note the Message-ID from `email_messages` table:
   ```sql
   SELECT id, message_id, subject
   FROM email_messages
   WHERE workspace_id = 22836
     AND direction = 'outbound'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

2. **Reply to the Email**
   - Open the email in your email client
   - Click "Reply"
   - Send a response

3. **Verify Threading in Database**
   ```sql
   SELECT 
     id,
     subject,
     direction,
     message_id,
     in_reply_to_message_id,
     references,
     created_at
   FROM email_messages
   WHERE workspace_id = 22836
     AND direction = 'inbound'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

4. **Expected Results**
   - ✅ Inbound email has `in_reply_to_message_id` populated
   - ✅ `in_reply_to_message_id` matches the outbound email's `message_id`
   - ✅ `references` header includes the original message ID
   - ✅ In LiveChat UI, reply appears under the original message thread

#### Test via Test Script

```bash
node scripts/test-sendgrid-analytics.js
# Select option 5
```

#### Expected Results

**Inbound Email Record:**
```sql
{
  "id": 12345,
  "workspace_id": 22836,
  "from_email": "user@example.com",
  "from_name": "John Doe",
  "subject": "Re: Your inquiry",
  "direction": "inbound",
  "message_id": "<abc123@mail.example.com>",
  "in_reply_to_message_id": "<xyz789@sendgrid.net>",
  "references": "<xyz789@sendgrid.net> <abc123@mail.example.com>",
  "created_at": "2026-01-15T10:30:00Z"
}
```

**LiveChat Display:**
- Original outbound message shows at timestamp T1
- Reply inbound message shows at timestamp T2
- Reply is visually connected/threaded to original message
- Message metadata indicates it came via email

#### Troubleshooting

**Inbound emails not appearing?**
1. Verify Inbound Parse is configured correctly in SendGrid
2. Check subdomain DNS records are set up (SendGrid provides MX records)
3. Verify webhook URL is correct
4. Check backend logs for inbound webhook requests
5. Test webhook endpoint manually:
   ```bash
   curl -X POST https://cc.automate8.com/api/sendgrid/webhook/inbound/22836 \
     -F "from=Test User <test@example.com>" \
     -F "to=anything@inbound.automate8.com" \
     -F "subject=Test" \
     -F "text=Test body"
   ```

**Threading not working?**
1. Verify outbound emails include proper `Message-ID` header
2. Check email client preserves `In-Reply-To` header when replying
3. Verify `in_reply_to_message_id` is being extracted in webhook handler
4. Check `email_messages` table has both original and reply records
5. Review `backend/src/routes/sendgrid.js` inbound webhook logic

---

## Complete Test Checklist

Use this checklist to ensure all aspects are tested:

### Setup
- [ ] SendGrid API key is valid and has full access
- [ ] Workspace has SendGrid configured in `workspace_sendgrid_config`
- [ ] At least one verified sender domain exists
- [ ] Test email address is accessible

### Test 1: Send Test Emails
- [ ] Email sent successfully via API (202 status)
- [ ] Email received in inbox within 2 minutes
- [ ] Email includes tracking pixel (open tracking)
- [ ] Email includes tracked links (click tracking)

### Test 2: Event Webhook Configuration
- [ ] Webhook URL is correctly configured
- [ ] Webhook is enabled
- [ ] All event types are enabled (delivered, opened, clicked, bounced, dropped, spam, unsubscribe)
- [ ] Signature verification is configured (optional but recommended)
- [ ] Test webhook sends successfully

### Test 3: Database Events
- [ ] `processed` event appears first
- [ ] `delivered` event appears after delivery
- [ ] `open` event appears when email opened
- [ ] `click` event appears when link clicked
- [ ] All events have correct `workspace_id`
- [ ] Events include `sg_message_id` and `sg_event_id`
- [ ] Event timestamps are accurate

### Test 4: Analytics Dashboard
- [ ] Email Overview widget shows correct counts
- [ ] Delivery Rates pie chart displays properly
- [ ] Email Activity trend chart shows daily data
- [ ] Open/Click Rates bar chart displays percentages
- [ ] Date range filter works correctly
- [ ] Data refreshes when date range changes
- [ ] All API endpoints return 200 status
- [ ] No console errors in browser

### Test 5: Inbound Email
- [ ] Inbound Parse is configured in SendGrid
- [ ] DNS records are set up for subdomain
- [ ] Inbound email received and stored in database
- [ ] Inbound email appears in LiveChat UI
- [ ] Email threading works (replies linked to originals)
- [ ] `Message-ID` header is captured
- [ ] `In-Reply-To` header is parsed correctly
- [ ] `References` header is stored

---

## Performance Testing

### Load Testing Email Events

Test with high volume of events to ensure system handles load:

```bash
# Send 100 test emails
for i in {1..100}; do
  curl --request POST \
    --url https://api.sendgrid.com/v3/mail/send \
    --header "Authorization: Bearer YOUR_API_KEY" \
    --header "Content-Type: application/json" \
    --data "{...}"
  sleep 1
done
```

### Monitor Database Performance

```sql
-- Check event insertion rate
SELECT 
  DATE_TRUNC('minute', created_at) as minute,
  COUNT(*) as events_per_minute
FROM sendgrid_events
WHERE workspace_id = 22836
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY minute
ORDER BY minute DESC;

-- Check for duplicate events
SELECT 
  sg_event_id,
  COUNT(*) as count
FROM sendgrid_events
WHERE workspace_id = 22836
GROUP BY sg_event_id
HAVING COUNT(*) > 1;
```

### Monitor API Response Times

```bash
# Test analytics endpoint performance
time curl "https://cc.automate8.com/api/analytics/email-metrics/overview?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"
```

Expected response time: < 500ms

---

## Troubleshooting Common Issues

### Issue: Events not appearing in database

**Possible Causes:**
1. Webhook not configured in SendGrid
2. Webhook URL incorrect
3. Webhook disabled
4. Backend not receiving requests
5. Database connection issue

**Solutions:**
1. Verify webhook configuration in SendGrid dashboard
2. Check backend logs for incoming webhook requests
3. Test webhook endpoint manually with cURL
4. Verify database credentials and connection
5. Check firewall rules allow SendGrid IPs

### Issue: Metrics showing zero or incorrect values

**Possible Causes:**
1. No events in database
2. Date range doesn't include events
3. Aggregation query error
4. Wrong workspace ID

**Solutions:**
1. Run Test 3 to verify events exist
2. Expand date range to include more data
3. Check backend logs for SQL errors
4. Verify workspace ID in API requests

### Issue: Inbound emails not received

**Possible Causes:**
1. Inbound Parse not configured
2. DNS records not set up
3. Webhook URL incorrect
4. Email sent to wrong address

**Solutions:**
1. Verify Inbound Parse configuration in SendGrid
2. Check DNS MX records for subdomain
3. Verify webhook URL includes correct workspace ID
4. Confirm email sent to correct subdomain address

### Issue: Email threading not working

**Possible Causes:**
1. Original email missing Message-ID
2. Reply missing In-Reply-To header
3. Webhook not parsing headers correctly
4. Email client not preserving headers

**Solutions:**
1. Verify outbound emails include Message-ID
2. Check inbound webhook logs for header parsing
3. Test with different email clients
4. Review `backend/src/routes/sendgrid.js` header extraction logic

---

## Next Steps After Testing

Once all tests pass:

1. **Monitor Production**
   - Set up alerts for webhook failures
   - Monitor event insertion rates
   - Track API response times

2. **Optimize Performance**
   - Add database indexes if queries are slow
   - Implement caching for frequently accessed metrics
   - Consider archiving old events

3. **Enhance Features**
   - Add more analytics widgets
   - Implement email campaign tracking
   - Build Email Builder (Phase 2)

4. **Documentation**
   - Document any issues encountered
   - Update team on new analytics features
   - Create user guide for analytics dashboard

---

## Support

If you encounter issues during testing:

1. Check backend logs: `pm2 logs backend`
2. Check Supabase logs in dashboard
3. Review SendGrid activity feed
4. Consult this guide's troubleshooting section
5. Review implementation documentation: `SENDGRID_INTEGRATION_IMPLEMENTATION_PLAN.md`
