# Webhook Analytics API Implementation

## 🎯 **Problem: Dashboard Showing No Data**

The Webhook Analytics Dashboard in the Command Center was showing no data because it was trying to fetch from a non-existent API endpoint.

---

## ✅ **Solution Implemented**

### **1. Created Backend API Endpoint**

**File**: `backend/src/routes/webhookAnalyticsRoutes.js`

**Endpoints**:
- `GET /api/webhook-analytics` - Fetch analytics for all webhooks
- `GET /api/webhook-analytics/:webhookId` - Fetch analytics for a specific webhook

**Query Parameters**:
- `range`: Time range ('1h' | '24h' | '7d' | '30d')

**Response Format**:
```json
[
  {
    "webhook_id": "uuid",
    "webhook_name": "ActiveProspect Leads",
    "workspace_id": "15213",
    "metrics": {
      "total_requests": 1234,
      "successful_requests": 1200,
      "failed_requests": 34,
      "success_rate": 97.25,
      "average_processing_time": 45,
      "p50_processing_time": 42,
      "p95_processing_time": 78,
      "p99_processing_time": 120,
      "error_rate": 2.75,
      "duplicates_prevented": 156,
      "last_24h": {
        "requests": 150,
        "success_rate": 98.5,
        "avg_processing_time": 42
      }
    },
    "last_updated": "2025-10-25T23:50:41.073Z"
  }
]
```

### **2. Data Sources**

The API queries two Supabase tables:

#### **webhooks table**
- `id`: Webhook UUID
- `name`: Webhook name
- `workspace_id`: Workspace ID
- `status`: 'active' or 'inactive'
- `call_count`: Total calls (legacy field)
- `last_used`: Last execution timestamp
- `created_at`: Creation timestamp

#### **webhook_logs table**
- `id`: Log UUID
- `webhook_id`: Reference to webhook
- `workspace_id`: Workspace ID
- `timestamp`: Log timestamp
- `status`: 'success', 'error', or 'processing'
- `error_message`: Error details (if failed)
- `result`: JSON with performance metrics

### **3. Metrics Calculated**

#### **Request Metrics**
- Total requests in time range
- Successful requests count
- Failed requests count
- Success rate percentage
- Error rate percentage

#### **Performance Metrics**
- Average processing time (ms)
- P50 (Median) processing time
- P95 processing time
- P99 processing time

#### **Duplicate Prevention**
- Counts contacts that were updated (not created)
- Indicates successful duplicate prevention

#### **24-Hour Comparison**
- Requests in last 24 hours
- Success rate in last 24 hours
- Average processing time in last 24 hours

### **4. Processing Time Extraction**

Processing times are extracted from the `result` field in webhook_logs:

```json
{
  "performance": {
    "total_processing_time": "45ms",
    "contact_action": "created" | "updated",
    "match_type": "phone" | "email" | "crm_id"
  }
}
```

### **5. Backend Integration**

**Modified**: `backend/index.js`

Added import:
```javascript
import webhookAnalyticsRoutes from './src/routes/webhookAnalyticsRoutes.js';
```

Added route:
```javascript
app.use('/api/webhook-analytics', webhookAnalyticsRoutes);
```

### **6. Command Center Dashboard Update**

**Modified**: `src/features/webhook-analytics/components/WebhookAnalytics.tsx`

Updated fetch to use production API:
```typescript
const apiUrl = import.meta.env.VITE_API_URL || 'https://cc.automate8.com';
const response = await fetch(`${apiUrl}/api/webhook-analytics?range=${timeRange}`);
```

---

## 🚀 **How to Test**

### **1. Start Backend Server**
```bash
cd /Users/benjiemalinao/Documents/deepseek-test-livechat/backend
npm start
```

### **2. Test API Endpoint**
```bash
# Test locally
curl http://localhost:3001/api/webhook-analytics?range=24h | jq

# Test production
curl https://cc.automate8.com/api/webhook-analytics?range=24h | jq
```

### **3. Start Command Center**
```bash
cd "/Users/benjiemalinao/Documents/WORKING PROTOTYPE/Customer Connect Command Center"
npm run dev
```

### **4. View Dashboard**
1. Login to Command Center
2. Click "Webhooks" in navigation
3. Data should now load automatically!

---

## 📊 **Data Flow**

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Command Center Dashboard                                           │
│  (Webhook Analytics Component)                                      │
│                                                                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ HTTP GET /api/webhook-analytics?range=24h
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Backend API Server                                                 │
│  (webhookAnalyticsRoutes.js)                                        │
│                                                                     │
│  1. Parse time range                                                │
│  2. Query webhooks table                                            │
│  3. Query webhook_logs table                                        │
│  4. Calculate metrics                                               │
│  5. Return JSON response                                            │
│                                                                     │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         │ Supabase Queries
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Supabase Database                                                  │
│                                                                     │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │  webhooks        │    │  webhook_logs    │                      │
│  ├──────────────────┤    ├──────────────────┤                      │
│  │ id               │◄───┤ webhook_id       │                      │
│  │ name             │    │ timestamp        │                      │
│  │ workspace_id     │    │ status           │                      │
│  │ status           │    │ result           │                      │
│  │ call_count       │    │ error_message    │                      │
│  │ last_used        │    │ workspace_id     │                      │
│  └──────────────────┘    └──────────────────┘                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔍 **Troubleshooting**

### **Issue: Still No Data**

**Possible Causes**:

1. **No Webhook Activity**
   - Check if you have webhooks in the database
   - Check if webhooks have been executed recently
   - Solution: Send test webhook requests

2. **CORS Error**
   - Check browser console for CORS errors
   - Verify backend CORS settings allow Command Center domain
   - Solution: Update CORS configuration in backend

3. **API Endpoint Not Found**
   - Verify backend server is running
   - Check backend logs for errors
   - Test endpoint directly with curl

4. **Database Connection Error**
   - Verify Supabase credentials in `.env`
   - Check Supabase project is active
   - Test database connection

### **Debug Commands**

```bash
# Check if webhooks exist
curl https://cc.automate8.com/api/webhook-analytics?range=30d | jq '.[] | {name, total_requests: .metrics.total_requests}'

# Check backend logs
cd backend
npm start
# Watch for console output

# Test specific webhook
curl https://cc.automate8.com/api/webhook-analytics/YOUR_WEBHOOK_ID?range=24h | jq
```

---

## 📈 **Performance Considerations**

### **Query Optimization**

1. **Time Range Filtering**: Logs are filtered by timestamp to reduce data volume
2. **Indexed Columns**: Ensure `webhook_logs.timestamp` and `webhook_logs.webhook_id` are indexed
3. **Limit Results**: Only active webhooks with data are returned

### **Caching Strategy**

Consider adding caching for:
- Webhook list (cache for 5 minutes)
- Metrics calculations (cache for 1 minute)
- Historical data (cache for 1 hour)

**Implementation**:
```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

router.get('/', async (req, res) => {
  const cacheKey = `webhook-analytics-${range}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  // ... fetch data ...
  
  cache.set(cacheKey, analytics);
  res.json(analytics);
});
```

---

## 🎯 **Next Steps**

### **Phase 1: Basic Functionality** ✅
- [x] Create API endpoint
- [x] Query webhook data
- [x] Calculate metrics
- [x] Connect dashboard to API

### **Phase 2: Enhancements**
- [ ] Add caching layer
- [ ] Implement real-time updates via WebSocket
- [ ] Add database indexes for performance
- [ ] Create aggregated metrics table

### **Phase 3: Advanced Features**
- [ ] Export reports (CSV/PDF)
- [ ] Email alerts for errors
- [ ] Webhook health monitoring
- [ ] Anomaly detection

---

## 📚 **Related Documentation**

- [Webhook Analytics Dashboard](../../WORKING%20PROTOTYPE/Customer%20Connect%20Command%20Center/docs/features/WEBHOOK_ANALYTICS_DASHBOARD.md)
- [Webhook Analytics Integration](../../WORKING%20PROTOTYPE/Customer%20Connect%20Command%20Center/docs/WEBHOOK_ANALYTICS_INTEGRATION.md)
- [Cloudflare Webhook System](./CLOUDFLARE_WEBHOOK_SYSTEM.md)
- [Webhook Duplicate Prevention](./WEBHOOK_DUPLICATE_PREVENTION_STRATEGY.md)

---

## ✅ **Summary**

The Webhook Analytics Dashboard now has a fully functional backend API that:
- Queries real webhook data from Supabase
- Calculates comprehensive metrics
- Supports multiple time ranges
- Returns data in the format expected by the dashboard

**Status**: ✅ Ready to use!

**API Endpoint**: `https://cc.automate8.com/api/webhook-analytics`

**Dashboard**: Customer Connect Command Center → Webhooks tab

