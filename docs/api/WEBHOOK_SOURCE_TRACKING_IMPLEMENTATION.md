# Webhook Source Tracking Implementation Guide

## Overview

This guide implements source tracking for webhook requests to distinguish between Cloudflare Worker and Node.js backend processing. This enables performance comparison and system-specific analytics.

## Database Schema Changes

### 1. Add Source Column

```sql
-- Add source column to webhook_logs table
ALTER TABLE webhook_logs 
ADD COLUMN source VARCHAR(20) DEFAULT 'unknown';

-- Add index for better query performance
CREATE INDEX idx_webhook_logs_source ON webhook_logs(source);
```

### 2. Source Values

- `'cloudflare'` - Webhook processed by Cloudflare Worker
- `'nodejs'` - Webhook processed by Node.js backend
- `'unknown'` - Legacy records or undetermined source

## Implementation Steps

### Step 1: Database Schema Update

Run the SQL script to add the source column:

```bash
# Execute in Supabase SQL Editor
scripts/add_webhook_source_column.sql
```

### Step 2: Update Node.js Webhook Route

Modify `backend/src/routes/webhookRoutes.js` to include source in log entries:

```javascript
// In the log entry creation
const logEntry = {
  id: uuidv4(),
  webhook_id,
  workspace_id: workspace_id || null,
  timestamp: new Date().toISOString(),
  payload,
  status: 'success',
  source: 'nodejs'  // Add this line
};
```

### Step 3: Update Cloudflare Worker

Modify `cloudflare-workers/webhook-processor/src/handlers/webhook.js` to include source:

```javascript
// In the log creation
const logEntry = {
  id: logId,
  webhook_id: webhookId,
  workspace_id: workspaceId,
  timestamp: new Date().toISOString(),
  payload: requestData,
  status: 'success',
  source: 'cloudflare'  // Add this line
};
```

### Step 4: Enhance Analytics API

Modify `backend/src/routes/webhookAnalyticsRoutes.js` to support source filtering:

```javascript
// Add source parameter support
const source = req.query.source; // 'cloudflare', 'nodejs', or undefined for all

// Filter logs by source if specified
let filteredLogs = logs;
if (source) {
  filteredLogs = logs.filter(log => log.source === source);
}
```

### Step 5: Update Command Center

Add source breakdown to the Webhook Analytics dashboard:

```typescript
// Add source filter dropdown
const [sourceFilter, setSourceFilter] = useState<'all' | 'cloudflare' | 'nodejs'>('all');

// Add source column to webhook table
<th>Source</th>
<td>
  <span className={`badge ${webhook.source === 'cloudflare' ? 'bg-blue-100' : 'bg-green-100'}`}>
    {webhook.source}
  </span>
</td>
```

## API Endpoints

### Enhanced Analytics Endpoints

- `GET /api/webhook-analytics?source=cloudflare` - Cloudflare-only metrics
- `GET /api/webhook-analytics?source=nodejs` - Node.js-only metrics  
- `GET /api/webhook-analytics` - Combined metrics (default)

### Response Format

```json
{
  "webhook_name": "test-webhook",
  "source": "cloudflare",
  "metrics": {
    "total_requests": 100,
    "success_rate": 95.0,
    "average_processing_time": 1200,
    "p50_processing_time": 1000,
    "p95_processing_time": 2000,
    "p99_processing_time": 3000
  }
}
```

## Benefits

### Performance Comparison
- Compare processing times between systems
- Identify which system is faster for different payloads
- Optimize routing based on performance data

### Reliability Analysis
- Compare success rates between systems
- Identify system-specific failure patterns
- Make data-driven decisions about system usage

### Cost Optimization
- Choose the most cost-effective system for different use cases
- Optimize resource allocation based on performance data
- Reduce costs by routing to the most efficient system

### Debugging
- Identify issues specific to each system
- Isolate problems to Cloudflare vs Node.js
- Faster troubleshooting and resolution

## Testing

### Test Scripts

1. **Database Test**: `scripts/test_webhook_source_column.sql`
2. **API Test**: Test both webhook endpoints and verify source tracking
3. **Analytics Test**: Verify source filtering in analytics API

### Test Cases

1. **Node.js Webhook**: Send request to `cc.automate8.com/webhooks/...`
   - Verify source is logged as 'nodejs'
   - Check analytics API shows correct source

2. **Cloudflare Webhook**: Send request to `worker.api-customerconnect.app/webhooks/...`
   - Verify source is logged as 'cloudflare'
   - Check analytics API shows correct source

3. **Analytics Filtering**: Test source-specific analytics
   - `/api/webhook-analytics?source=nodejs`
   - `/api/webhook-analytics?source=cloudflare`
   - `/api/webhook-analytics` (combined)

## Migration Strategy

### Phase 1: Database Schema
- Add source column with default 'unknown'
- Update existing records to 'unknown'
- Verify column works correctly

### Phase 2: Webhook Systems
- Update Node.js webhook route
- Update Cloudflare Worker
- Test both systems log correct source

### Phase 3: Analytics Enhancement
- Update analytics API to support source filtering
- Test source-specific metrics
- Verify combined metrics still work

### Phase 4: Command Center
- Add source breakdown to dashboard
- Add source filter controls
- Test user interface

## Monitoring

### Key Metrics to Track

1. **Source Distribution**: Percentage of requests by source
2. **Performance Comparison**: Average processing time by source
3. **Reliability Comparison**: Success rate by source
4. **Error Analysis**: Error patterns by source

### Alerts

- High error rate for specific source
- Performance degradation for specific source
- Unusual source distribution patterns

## Future Enhancements

### Advanced Analytics
- Source-specific performance trends
- Cost analysis by source
- Load balancing recommendations

### Automation
- Auto-route based on performance
- Dynamic load balancing
- Intelligent failover

### Reporting
- Source performance reports
- Cost optimization recommendations
- System health dashboards

## Conclusion

Webhook source tracking provides valuable insights into system performance and enables data-driven decisions about webhook routing and optimization. This implementation creates a foundation for advanced analytics and system optimization.
