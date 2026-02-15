# SendGrid Analytics Testing - Quick Reference

## 🚀 Quick Start

```bash
# Run automated test suite
node scripts/test-sendgrid-analytics.js
```

## 📋 Test Checklist

### 1. Send Test Email ✉️
```bash
# Via test script
node scripts/test-sendgrid-analytics.js
# Select option 1

# Or via cURL
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],...}'
```

### 2. Configure Event Webhook 🔧
**URL:** https://app.sendgrid.com/settings/mail_settings

**Webhook URL:**
```
https://cc.automate8.com/api/sendgrid/webhook/events/{workspaceId}
```

**Enable Events:**
- ✅ Delivered, Opened, Clicked
- ✅ Bounced, Dropped, Spam Report, Unsubscribe

### 3. Verify Database Events 🗄️
```sql
-- Check recent events
SELECT event_type, COUNT(*) 
FROM sendgrid_events 
WHERE workspace_id = 22836 
  AND timestamp >= NOW() - INTERVAL '1 day'
GROUP BY event_type;
```

### 4. Test Analytics Endpoints 📊
```bash
# Email Overview
curl "https://cc.automate8.com/api/analytics/email-metrics/overview?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Delivery Rates
curl "https://cc.automate8.com/api/analytics/email-metrics/delivery-rates?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Engagement Rates
curl "https://cc.automate8.com/api/analytics/email-metrics/engagement-rates?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"

# Trend Data
curl "https://cc.automate8.com/api/analytics/email-metrics/trend?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"
```

### 5. Test Inbound Email 📨
**Configure Inbound Parse:** https://app.sendgrid.com/settings/parse

**Webhook URL:**
```
https://cc.automate8.com/api/sendgrid/webhook/inbound/{workspaceId}
```

**Test:**
1. Send email to: `anything@inbound.yourdomain.com`
2. Check database:
```sql
SELECT * FROM email_messages 
WHERE workspace_id = 22836 
  AND direction = 'inbound' 
ORDER BY created_at DESC 
LIMIT 5;
```

## 🔍 Quick Diagnostics

### Check if webhook is working
```bash
# Check backend logs
pm2 logs backend --lines 50 | grep sendgrid

# Test webhook manually
curl -X POST https://cc.automate8.com/api/sendgrid/webhook/events/22836 \
  -H "Content-Type: application/json" \
  -d '[{"event":"delivered","email":"test@example.com","timestamp":1234567890}]'
```

### Check event counts
```sql
-- Events by type (last 7 days)
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(timestamp) as last_event
FROM sendgrid_events
WHERE workspace_id = 22836
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY event_type
ORDER BY count DESC;
```

### Check analytics API health
```bash
# Quick health check all endpoints
for endpoint in overview delivery-rates engagement-rates trend unsubscribe-spam; do
  echo "Testing $endpoint..."
  curl -s -o /dev/null -w "%{http_code}" \
    "https://cc.automate8.com/api/analytics/email-metrics/$endpoint?workspaceId=22836&startDate=2026-01-01&endDate=2026-01-31"
  echo ""
done
```

## ⚠️ Common Issues

| Issue | Quick Fix |
|-------|-----------|
| No events in DB | Check webhook is enabled in SendGrid dashboard |
| Metrics show zero | Verify date range includes events |
| Inbound not working | Check DNS MX records for subdomain |
| Threading broken | Verify Message-ID in outbound emails |

## 📚 Full Documentation

See `docs/SENDGRID_ANALYTICS_TESTING_GUIDE.md` for detailed instructions.

## 🆘 Support Commands

```bash
# Check backend logs
pm2 logs backend

# Check database connection
psql -h ycwttshvizkotcwwyjpt.supabase.co -U postgres -d postgres

# Restart backend
pm2 restart backend

# Check SendGrid API status
curl https://status.sendgrid.com/api/v2/status.json
```

## 📞 SendGrid Dashboard Links

- **Event Webhook:** https://app.sendgrid.com/settings/mail_settings
- **Inbound Parse:** https://app.sendgrid.com/settings/parse
- **Activity Feed:** https://app.sendgrid.com/email_activity
- **API Keys:** https://app.sendgrid.com/settings/api_keys
- **Verified Senders:** https://app.sendgrid.com/settings/sender_auth

## ✅ Success Criteria

- [ ] Test email sent and received
- [ ] Events appear in database within 5 minutes
- [ ] All 5 analytics endpoints return 200
- [ ] Dashboard displays metrics correctly
- [ ] Inbound email received and threaded

## 🎯 Expected Metrics

After sending 10 test emails:
- **Sent:** 10
- **Delivered:** 9-10 (90-100%)
- **Opened:** 5-8 (50-80%)
- **Clicked:** 2-4 (20-40%)
- **Bounced:** 0-1 (0-10%)

## 🔐 Security Notes

- Never commit API keys to git
- Use environment variables for credentials
- Enable webhook signature verification
- Rotate API keys regularly
- Monitor for suspicious activity

## 📊 Performance Benchmarks

| Metric | Target | Acceptable |
|--------|--------|------------|
| Webhook response time | < 100ms | < 500ms |
| Event insertion | < 50ms | < 200ms |
| Analytics API | < 300ms | < 1000ms |
| Dashboard load | < 2s | < 5s |

---

**Last Updated:** 2026-01-15
**Version:** 1.0.0
