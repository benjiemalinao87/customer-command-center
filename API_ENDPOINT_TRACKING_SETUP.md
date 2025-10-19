# API Endpoint Tracking Setup Guide

This guide will help you set up automatic tracking of API endpoint usage for your dashboard.

## 📋 **Overview**

The system tracks:
- ✅ Which endpoints are most used
- ✅ Response times per endpoint
- ✅ Success/error rates
- ✅ Request volume over time
- ✅ Workspace-specific usage

---

## 🚀 **Setup Steps**

### **Step 1: Create Supabase Table**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/ycwttshvizkotcwwyjpt
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire content from `SUPABASE_API_TRACKING_SETUP.sql`
5. Click **Run** (or press Ctrl+Enter)

This will create:
- `api_requests` table
- Indexes for performance
- RPC functions for analytics
- Row Level Security policies

---

### **Step 2: Add Logging Middleware to Backend**

#### **2a. Copy the middleware file**

The middleware file has been created at:
```
deepseek-test-livechat/backend/src/middleware/apiRequestLogger.js
```

#### **2b. Import and use in your backend**

Edit `/Users/allisonmalinao/Documents/Livechat/deepseek-test-livechat/backend/index.js`:

```javascript
// Add this import near the top with other middleware
import { apiRequestLoggerSelective } from './src/middleware/apiRequestLogger.js';

// Add this AFTER cors() and BEFORE your routes
// (around line 175, after app.use(cors(corsOptions)))
app.use(apiRequestLoggerSelective({
  excludePaths: [
    '/health',
    '/metrics',
    '/docs',
    '/api-docs',
    '/favicon.ico'
  ]
}));
```

#### **2c. Deploy to Railway**

Once you've added the middleware, push to GitHub and Railway will auto-deploy:

```bash
cd /Users/allisonmalinao/Documents/Livechat/deepseek-test-livechat
git add backend/src/middleware/apiRequestLogger.js
git add backend/index.js
git commit -m "feat: Add API request logging middleware"
git push origin main
```

---

### **Step 3: Verify It's Working**

After deployment:

1. Make some API requests to your backend (`https://cc.automate8.com/api/*`)
2. Go to Supabase → Table Editor → `api_requests`
3. You should see new rows appearing with:
   - Endpoint path
   - Response time
   - Status code
   - Timestamp

---

## 📊 **Viewing the Data**

### **In the Dashboard**

Once requests are logged, refresh your dashboard at `http://localhost:5173` (or `https://customer-command-center.pages.dev`).

The **"Most Used API Endpoints"** section will now show:
- Top 5 endpoints by request count
- Request volume per endpoint
- Color-coded bars

### **In Supabase**

You can also query the data directly:

```sql
-- Get most used endpoints (last 24 hours)
SELECT * FROM get_most_used_endpoints(24, 10);

-- Get endpoint trends (last 7 days)
SELECT * FROM get_endpoint_trends(7);

-- Get all requests for a specific endpoint
SELECT *
FROM api_requests
WHERE endpoint = '/api/contacts/list'
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🎨 **Alternative: Simple Mock Data (Temporary)**

If you want to see the chart working immediately while you set up tracking, you can use this test data:

```javascript
// In PerformanceDashboard.tsx, temporarily replace getMostUsedEndpoints() call:

const topEndpoints = [
  { label: '/api/sms/send', value: 1450, color: '#ec4899' },
  { label: '/api/livechat/messages', value: 983, color: '#8b5cf6' },
  { label: '/api/contacts/list', value: 762, color: '#3b82f6' },
  { label: '/api/workspace/members', value: 534, color: '#10b981' },
  { label: '/api/triggers/execute', value: 421, color: '#f59e0b' }
];
```

---

## 🔧 **Troubleshooting**

### **No data showing up?**

1. **Check if table exists:**
   ```sql
   SELECT * FROM api_requests LIMIT 1;
   ```

2. **Check backend logs in Railway:**
   - Go to Railway → SMS Backend → Logs
   - Look for errors like "Failed to log API request"

3. **Check environment variables:**
   - Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set in Railway

### **Table exists but no requests logged?**

- Verify the middleware is actually running:
  ```javascript
  console.log('✅ API Request Logger middleware active');
  ```

- Check if requests are actually hitting your backend (not just frontend)

---

## 📈 **Advanced: Add More Metrics**

You can extend the tracking to include:

- **User-specific usage** - Track which users make the most requests
- **Error tracking** - See which endpoints fail most often
- **Slow queries** - Find endpoints with high response times
- **Geographic data** - Track where requests come from
- **Rate limiting** - Monitor workspaces approaching limits

Let me know if you'd like help implementing any of these!

---

## 🎯 **Summary**

1. ✅ Run SQL script in Supabase
2. ✅ Add middleware to backend
3. ✅ Deploy to Railway
4. ✅ Watch the data flow in!

Your dashboard will automatically update with real endpoint usage data. 🚀
