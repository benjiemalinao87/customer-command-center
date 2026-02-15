# Connector Execution - Trigger.dev Tasks

Background job processing for connector executions (single-step and multi-step).

## 🎯 Overview

The connector execution system uses Trigger.dev to handle long-running API requests, retries, and multi-step workflows. This ensures reliable execution even for slow or unreliable external APIs.

## 📁 Files

```
trigger/
├── connectorExecutionTask.js    # Main execution orchestrator
├── connectorStepExecutor.js     # Individual step executor
└── README_CONNECTORS.md         # This file
```

## 🔄 Execution Flow

### Single-Step Connector

```
1. Cloudflare Worker receives execute request
2. Creates execution record in DB (status: pending)
3. Triggers Trigger.dev task
4. Task executes API request
5. Updates DB with result (status: completed/failed)
6. Updates connector statistics
7. Maps response fields to contact (if configured)
```

### Multi-Step Connector

```
1. Cloudflare Worker receives execute request
2. Creates execution record in DB (status: pending)
3. Triggers Trigger.dev task
4. Task executes steps sequentially:
   a. Step 1 → output stored as step_1
   b. Step 2 uses {{step_1.field}} → output stored as step_2
   c. Step 3 uses {{step_2.field}} → output stored as step_3
   ...
5. Updates DB with final result
6. Updates connector statistics
7. Maps response fields to contact
```

## 🧩 Task: connector-execution

**File**: `connectorExecutionTask.js`

### Payload

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

### Configuration

- **Max Duration**: 5 minutes
- **Retry**: 3 attempts with exponential backoff
- **Timeout**: Per-step timeout from connector config

### Context Variables

The task builds a context object for template interpolation:

```javascript
{
  input: {                    // User input
    phone: "+1234567890",
    email: "user@example.com"
  },
  workspace: {                // Workspace credentials
    api_token: "decrypted_token",
    api_secret: "decrypted_secret"
  },
  steps: {                    // Previous step outputs (multi-step only)
    step_1: { userId: "123" },
    step_2: { userData: {...} }
  }
}
```

## 🔧 Step Executor

**File**: `connectorStepExecutor.js`

### Features

- **Template Interpolation**: `{{input.field}}`, `{{workspace.credential}}`, `{{step_N.field}}`
- **Authentication**: Bearer, API Key, Basic Auth
- **Body Types**: JSON, Form, XML, Raw
- **Timeout Handling**: Configurable per connector
- **Error Handling**: Detailed error messages with response body

### Example Step Config

```javascript
{
  name: "get_user_id",
  method: "GET",
  url: "https://api.example.com/users",
  queryParams: {
    email: "{{input.email}}"
  },
  headers: {
    "X-Custom-Header": "value"
  },
  auth: {
    type: "bearer",
    token: "{{workspace.api_token}}"
  }
}
```

### Example Multi-Step Config

```javascript
{
  type: "multi-step",
  steps: [
    {
      name: "get_user_id",
      method: "GET",
      url: "https://api.example.com/users?email={{input.email}}",
      auth: { type: "bearer", token: "{{workspace.api_token}}" }
    },
    {
      name: "get_user_details",
      method: "GET",
      url: "https://api.example.com/users/{{steps.get_user_id.id}}",
      auth: { type: "bearer", token: "{{workspace.api_token}}" }
    },
    {
      name: "update_user",
      method: "PATCH",
      url: "https://api.example.com/users/{{steps.get_user_id.id}}",
      body: {
        phone: "{{input.phone}}"
      },
      bodyType: "json",
      auth: { type: "bearer", token: "{{workspace.api_token}}" }
    }
  ],
  combine_outputs: false  // Return only last step output
}
```

## 📊 Database Updates

### Execution Lifecycle

```sql
-- 1. Created by Cloudflare Worker
INSERT INTO connector_executions (status) VALUES ('pending');

-- 2. Task starts
UPDATE connector_executions SET status = 'executing', started_at = NOW();

-- 3. Task completes
UPDATE connector_executions SET 
  status = 'completed',
  output_data = {...},
  steps_executed = [...],
  execution_time_ms = 1234,
  completed_at = NOW();

-- 4. Statistics updated
SELECT increment_connector_success(connector_id);
```

### Connector Statistics

```sql
CREATE OR REPLACE FUNCTION increment_connector_success(p_connector_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE connectors
  SET 
    total_executions = total_executions + 1,
    successful_executions = successful_executions + 1,
    last_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_connector_id;
END;
$$ LANGUAGE plpgsql;
```

## 🧪 Testing

### Test Single-Step Connector

```javascript
// Create test connector
const connector = {
  id: "test-connector-id",
  workspace_id: "ws_test",
  type: "single-step",
  config: {
    method: "GET",
    url: "https://jsonplaceholder.typicode.com/users/1",
    auth: { type: "none" }
  },
  timeout_ms: 10000
};

// Trigger execution
await fetch("https://connectors-api.workers.dev/api/v1/connectors/test-connector-id/execute", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_JWT",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    workspace_id: "ws_test",
    input_data: {}
  })
});
```

### Test Multi-Step Connector

```javascript
// Create multi-step connector
const connector = {
  type: "multi-step",
  config: {
    steps: [
      {
        name: "get_posts",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts"
      },
      {
        name: "get_first_post",
        method: "GET",
        url: "https://jsonplaceholder.typicode.com/posts/{{steps.get_posts[0].id}}"
      }
    ]
  }
};
```

## 🚨 Error Handling

### Retry Strategy

- **Attempt 1**: Immediate
- **Attempt 2**: After 2 seconds
- **Attempt 3**: After 4 seconds
- **Max Attempts**: 3

### Error Types

1. **Timeout**: Request exceeds connector timeout
2. **HTTP Error**: Non-2xx status code
3. **Network Error**: DNS, connection failures
4. **Parse Error**: Invalid JSON response
5. **Template Error**: Missing variables in context

### Continue on Error

For multi-step connectors, set `continue_on_error: true` to execute remaining steps even if one fails.

## 📝 Logging

All execution steps are logged with structured data:

```javascript
logger.info("Executing step 1/3", {
  stepName: "get_user_id",
  method: "GET",
  url: "https://api.example.com/users"
});

logger.info("Step 1 completed successfully", {
  stepName: "get_user_id",
  executionTime: 234
});
```

View logs in Trigger.dev dashboard: https://cloud.trigger.dev

## 🔗 Integration with Flow Builder

Connectors can be used as actions in Flow Builder:

```javascript
// Flow Builder action
{
  type: "connector",
  connector_id: "uuid",
  input_data: {
    phone: "{{contact.phone}}",
    email: "{{contact.email}}"
  }
}
```

The Flow Builder will:
1. Call Cloudflare Worker to execute connector
2. Wait for completion (or timeout)
3. Use output in subsequent actions

## 📚 Related Documentation

- [Connectors Implementation Plan](../docs/CONNECTORS_REVIEW_AND_FINALIZED_PLAN.md)
- [Cloudflare Worker API](../cloudflare-workers/connectors-api/README.md)
- [Database Schema](../docs/CONNECTORS_WORKSPACE_ISOLATION_AND_TEMPLATES.md)

