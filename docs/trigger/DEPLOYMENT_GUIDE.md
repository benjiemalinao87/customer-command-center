# Trigger.dev Tasks - Deployment Guide

## 📋 Overview

The Connectors feature uses Trigger.dev v3/v4 for background job processing. Tasks are registered when you run `dev` and are automatically available when your deployment endpoint is configured.

## 🚀 Deployment Steps

### Step 1: Register Tasks Locally (Development)

Run the dev command to register tasks and test locally:

```bash
cd /Users/benjiemalinao/Documents/deepseek-test-livechat
npx @trigger.dev/cli@latest dev
```

This will:
- Register the `connector-execution` task
- Start a local tunnel to Trigger.dev
- Allow you to test task execution locally

### Step 2: Configure Environment Variables

Set these environment variables for the Trigger.dev tasks:

```bash
# Supabase Configuration
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Trigger.dev Configuration (if needed)
TRIGGER_API_KEY=your_trigger_api_key
TRIGGER_API_URL=https://api.trigger.dev
```

### Step 3: Production Deployment

For production, Trigger.dev tasks are automatically available when:

1. **Your deployment endpoint is configured** in Trigger.dev dashboard
2. **Tasks are registered** (via `dev` command or CI/CD)
3. **Environment variables are set** in your deployment platform

#### Option A: Manual Registration (Development)

```bash
# Run dev to register tasks
npx @trigger.dev/cli@latest dev
```

#### Option B: CI/CD Deployment

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Register Trigger.dev tasks
  run: npx @trigger.dev/cli@latest dev --once
```

### Step 4: Verify Task Registration

Check your Trigger.dev dashboard:
- Visit: https://cloud.trigger.dev
- Navigate to: Your Project → Tasks
- Verify: `connector-execution` task is listed

## 📁 Task Files

### Main Task
- **File**: `trigger/connectorExecutionTask.js`
- **Task ID**: `connector-execution`
- **Max Duration**: 5 minutes
- **Retries**: 3 attempts with exponential backoff

### Step Executor
- **File**: `trigger/connectorStepExecutor.js`
- **Purpose**: Executes individual API requests
- **Features**: Template interpolation, authentication, timeout handling

### Utilities
- **File**: `trigger/utils/templateEngine.js`
- **File**: `trigger/utils/jsonPathExtractor.js`

## 🔧 Configuration

### trigger.config.ts

```typescript
export default defineConfig({
  project: "proj_dcpsazbkeyuadjmckuib",
  runtime: "node",
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["trigger"],
});
```

## 🧪 Testing

### Test Task Execution

1. **Start dev server**:
```bash
npx @trigger.dev/cli@latest dev
```

2. **Trigger task from Cloudflare Worker**:
```bash
curl -X POST https://connectors-api-production.benjiemalinao879557.workers.dev/api/v1/connectors/:id/execute \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "YOUR_WORKSPACE_ID",
    "input_data": {}
  }'
```

3. **Monitor execution** in Trigger.dev dashboard

## 📊 Task Payload

The `connector-execution` task expects:

```javascript
{
  executionId: "uuid",        // Execution record ID
  connectorId: "uuid",        // Connector ID
  workspaceId: "ws_123",      // Workspace ID
  inputData: {                // User-provided input
    phone: "+1234567890",
    email: "user@example.com"
  },
  contactId: "uuid",          // Optional: Contact to update
  flowRunId: "uuid"           // Optional: Flow Builder run ID
}
```

## 🔗 Integration with Cloudflare Worker

The Cloudflare Worker triggers tasks via Trigger.dev API:

```typescript
// In connectors API route
const triggerResponse = await fetch(`${TRIGGER_API_URL}/api/v1/tasks/connector-execution/trigger`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TRIGGER_API_KEY}`
  },
  body: JSON.stringify({
    executionId,
    connectorId,
    workspaceId,
    inputData,
    contactId,
    flowRunId
  })
});
```

## 🚨 Troubleshooting

### Issue: "Task not found"

**Solution**: Run `npx @trigger.dev/cli@latest dev` to register tasks

### Issue: "Authentication failed"

**Solution**: Verify `TRIGGER_API_KEY` is set correctly

### Issue: "Task execution failed"

**Solution**: Check Trigger.dev dashboard logs for detailed error messages

### Issue: "Environment variables not set"

**Solution**: Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured

## 📚 Resources

- **Trigger.dev Docs**: https://trigger.dev/docs
- **Trigger.dev Dashboard**: https://cloud.trigger.dev
- **Task Documentation**: `trigger/README_CONNECTORS.md`

## ✅ Deployment Checklist

- [ ] Trigger.dev account created
- [ ] Project initialized (`trigger.config.ts` configured)
- [ ] Tasks registered via `dev` command
- [ ] Environment variables configured
- [ ] Cloudflare Worker API key set in Trigger.dev
- [ ] Task execution tested locally
- [ ] Production endpoint configured
- [ ] Monitoring set up in Trigger.dev dashboard

---

**Note**: For Trigger.dev v3/v4, tasks are typically registered during development and automatically available in production when your deployment endpoint is configured. The `dev` command is used for local development and task registration.

