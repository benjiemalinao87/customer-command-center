# Connectors Feature - Deployment Guide

Complete deployment guide for the Connectors feature (Phase 2 implementation).

## 📋 Prerequisites

- ✅ Phase 1 Complete: Database tables created and verified
- ✅ Cloudflare Workers account with paid plan (for Hono deployment)
- ✅ Trigger.dev account and project set up
- ✅ Supabase project credentials
- ✅ Node.js 18+ installed locally

## 🚀 Deployment Steps

### Step 1: Deploy Cloudflare Worker (Hono API)

#### 1.1 Install Dependencies

```bash
cd cloudflare-workers/connectors-api
npm install
```

#### 1.2 Configure Secrets

```bash
# Supabase Configuration
wrangler secret put SUPABASE_URL
# Enter: https://ycwttshvizkotcwwyjpt.supabase.co

wrangler secret put SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Encryption Key (32 characters for AES-256)
wrangler secret put ENCRYPTION_KEY
# Enter: your-32-character-encryption-key-here

# Trigger.dev Configuration
wrangler secret put TRIGGER_API_KEY
# Enter: tr_dev_... (from Trigger.dev dashboard)

wrangler secret put TRIGGER_API_URL
# Enter: https://api.trigger.dev
```

#### 1.3 Test Locally

```bash
npm run dev
```

Visit http://localhost:8787/health to verify.

#### 1.4 Deploy to Staging

```bash
npm run deploy:staging
```

#### 1.5 Deploy to Production

```bash
npm run deploy:production
```

Note the deployed URL (e.g., `https://connectors-api.workers.dev`).

### Step 2: Deploy Trigger.dev Tasks

#### 2.1 Register Tasks

```bash
cd ../../  # Back to project root
npx trigger-dev@latest dev
```

This will:
- Register `connector-execution` task
- Start local development server
- Watch for code changes

#### 2.2 Deploy to Trigger.dev Cloud

```bash
npx trigger-dev@latest deploy
```

Verify deployment at https://cloud.trigger.dev

### Step 3: Apply Database Functions

The statistics functions were already applied in Phase 1, but verify:

```sql
-- Test increment functions
SELECT increment_connector_success('test-uuid');
SELECT increment_connector_failure('test-uuid');
```

### Step 4: Update Frontend Configuration

#### 4.1 Add Cloudflare Worker URL to Environment

```bash
# frontend/.env.local
REACT_APP_CONNECTORS_API_URL=https://connectors-api.workers.dev
```

#### 4.2 Update API Client

Create `frontend/src/services/connectorsApi.js`:

```javascript
import axios from 'axios';

const connectorsApi = axios.create({
  baseURL: process.env.REACT_APP_CONNECTORS_API_URL || 'https://connectors-api.workers.dev',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token interceptor
connectorsApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default connectorsApi;
```

### Step 5: Test End-to-End

#### 5.1 Test Single-Step Connector

```bash
cd scripts
node test-connector-single-step.js
```

Expected output:
```
✅ Connector created: abc-123
✅ Execution triggered: exec-456
✅ Execution completed successfully!
   Execution Time: 234 ms
```

#### 5.2 Test Multi-Step Connector

```bash
node test-connector-multi-step.js
```

Expected output:
```
✅ Multi-step execution completed successfully!
   Steps Executed:
   1. get_user: success
   2. get_user_posts: success
   3. get_first_post_details: success
```

### Step 6: Create Official Templates (SaaS Admin)

#### 6.1 Mark Your User as SaaS Admin

```sql
INSERT INTO saas_admin_users (user_id, role, permissions)
VALUES (
  'your-user-id-here',
  'admin',
  '{"can_create_templates": true, "can_manage_all_workspaces": true}'
);
```

#### 6.2 Create Official Templates

Use the admin UI or API:

```bash
curl -X POST https://connectors-api.workers.dev/api/v1/connector-templates \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phone Number Enrichment",
    "description": "Enrich phone numbers with carrier and location data",
    "icon": "📞",
    "category": "data-enrichment",
    "is_official": true,
    "is_featured": true,
    "is_public": true,
    "config": {
      "type": "single-step",
      "method": "GET",
      "url": "https://api.numverify.com/validate",
      "queryParams": {
        "access_key": "{{workspace.numverify_api_key}}",
        "number": "{{input.phone}}"
      }
    },
    "input_schema": {
      "phone": { "type": "string", "required": true }
    },
    "field_mappings": [
      { "source_path": "carrier", "target_field": "phone_carrier" },
      { "source_path": "location", "target_field": "phone_location" }
    ]
  }'
```

### Step 7: Monitor and Verify

#### 7.1 Check Cloudflare Worker Logs

```bash
wrangler tail connectors-api-production
```

#### 7.2 Check Trigger.dev Dashboard

Visit https://cloud.trigger.dev and monitor:
- Task executions
- Success/failure rates
- Execution times
- Error logs

#### 7.3 Check Database Stats

```sql
-- Total connectors
SELECT COUNT(*) FROM connectors;

-- Total executions
SELECT COUNT(*) FROM connector_executions;

-- Executions by status
SELECT status, COUNT(*) 
FROM connector_executions 
GROUP BY status;

-- Top connectors by usage
SELECT 
  c.name,
  c.total_executions,
  c.successful_executions,
  c.failed_executions,
  ROUND((c.successful_executions::numeric / NULLIF(c.total_executions, 0)) * 100, 2) as success_rate
FROM connectors c
ORDER BY c.total_executions DESC
LIMIT 10;
```

## 🔒 Security Checklist

- [ ] All Cloudflare Worker secrets configured
- [ ] Encryption key is 32 characters (AES-256)
- [ ] CORS configured for production domains only
- [ ] RLS policies verified and tested
- [ ] Service role key not exposed to frontend
- [ ] API rate limiting configured (optional)
- [ ] Webhook signatures verified (Trigger.dev)

## 🧪 Testing Checklist

- [ ] Health endpoint responds
- [ ] Authentication works with JWT
- [ ] Workspace isolation verified
- [ ] Single-step connector executes successfully
- [ ] Multi-step connector with variable interpolation works
- [ ] Credential encryption/decryption works
- [ ] Template installation works
- [ ] Field mapping updates contacts correctly
- [ ] Error handling and retries work
- [ ] Statistics update correctly

## 📊 Performance Benchmarks

Target metrics:

- **API Response Time**: < 50ms (p95)
- **Connector Execution**: < 5s for simple APIs
- **Multi-Step Execution**: < 30s for 3-5 steps
- **Database Queries**: < 100ms
- **Concurrent Executions**: 100+ per minute

## 🚨 Troubleshooting

### Issue: "Connector execution failed: timeout"

**Solution**: Increase `timeout_ms` in connector config or check external API performance.

### Issue: "Template variable not found"

**Solution**: Verify credentials are stored in `workspace_api_credentials` and variable syntax is correct (`{{workspace.service_name}}`).

### Issue: "RLS policy violation"

**Solution**: Verify user is member of workspace and workspace_id is correct.

### Issue: "Encryption key invalid"

**Solution**: Ensure encryption key is exactly 32 characters for AES-256.

## 📚 Next Steps

After successful deployment:

1. **Create Official Templates**: Build 5-10 popular connector templates
2. **User Documentation**: Write user-facing guides for connector creation
3. **Flow Builder Integration**: Connect connectors to Flow Builder actions
4. **Analytics Dashboard**: Build admin dashboard for connector usage
5. **Rate Limiting**: Implement per-workspace rate limits
6. **Webhook Support**: Add webhook triggers for connectors

## 🎯 Success Criteria

Phase 2 is complete when:

- ✅ Cloudflare Worker deployed and responding
- ✅ Trigger.dev tasks registered and executing
- ✅ Single-step connector test passes
- ✅ Multi-step connector test passes
- ✅ At least 1 official template created
- ✅ Frontend can create, list, and execute connectors
- ✅ All security measures in place
- ✅ Monitoring and logging configured

## 📞 Support

For deployment issues:
- Cloudflare Workers: https://developers.cloudflare.com/workers/
- Trigger.dev: https://trigger.dev/docs
- Supabase: https://supabase.com/docs

---

**Deployment Date**: _________  
**Deployed By**: _________  
**Production URL**: _________  
**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete

