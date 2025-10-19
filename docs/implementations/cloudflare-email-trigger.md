# Cloudflare Email Routing Trigger System

## Overview

This system automatically creates Cloudflare email routing rules whenever a new email configuration is added to the `workspace_email_config` table or when an existing configuration is updated. The system uses PostgreSQL triggers to detect changes and makes HTTP requests to the Cloudflare API to create routing rules.

## Architecture

### Components

1. **`create_cloudflare_email_rule(email_address TEXT)`** - Function that makes HTTP requests to Cloudflare API
2. **`trigger_cloudflare_email_rule()`** - Trigger function that executes on table changes
3. **`cloudflare_email_rule_trigger`** - Database trigger on `workspace_email_config` table
4. **`cloudflare_api_logs`** - Logging table for all API calls and responses

### Database Schema

#### workspace_email_config (existing table)
- `workspace_id` (TEXT, NOT NULL) - Unique workspace identifier
- `from_email` (TEXT, NOT NULL) - Email address used for outbound emails
- `from_name` (TEXT) - Display name for emails
- `reply_to` (TEXT) - Reply-to email address
- `resend_api_key` (TEXT, NOT NULL) - Resend service API key
- `is_active` (BOOLEAN, DEFAULT true) - Whether this config is active
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

#### cloudflare_api_logs (new table)
- `id` (BIGSERIAL, PRIMARY KEY) - Auto-incrementing ID
- `email_address` (TEXT, NOT NULL) - Email address for which rule was created
- `api_action` (TEXT, NOT NULL) - Type of API action performed
- `request_payload` (JSONB) - JSON payload sent to API
- `response_payload` (JSONB) - JSON response from API
- `status` (TEXT, NOT NULL) - Status: 'success', 'error', or 'pending'
- `error_message` (TEXT) - Error message if applicable
- `created_at` (TIMESTAMP WITH TIME ZONE) - Timestamp of API call

## Trigger Behavior

### When Triggers Execute

The trigger executes on:
- **INSERT**: Creates a Cloudflare rule when `is_active = TRUE`
- **UPDATE**: Creates a Cloudflare rule when:
  - Email address changes (`from_email` field)
  - Record becomes active (`is_active` changes from FALSE to TRUE)

### When Triggers DON'T Execute

- When `is_active = FALSE`
- When only non-email fields are updated (name, API key, etc.)
- When record is deleted

## API Integration

### Cloudflare API Details

- **Endpoint**: `https://api.cloudflare.com/client/v4/zones/{zone_id}/email/routing/rules`
- **Zone ID**: `0d325fccdc5d84a8ec084cfd889a03dc`
- **Authentication**: Bearer token `f7wVw8ine6JvZ_OI6iGKcrroaKUr3Yia4xDkc8UV`

### Rule Creation Format

```json
{
  "actions": [{
    "type": "forward",
    "value": ["temp@example.com"]
  }],
  "matchers": [{
    "type": "literal",
    "field": "to", 
    "value": "user@customerconnects.app"
  }],
  "enabled": false,
  "name": "user - UPDATE TO CUSTOMERCONNECT WORKER"
}
```

**Note**: Rules are created with `"enabled": false` because they need manual conversion to worker actions via the Cloudflare Dashboard.

## Usage Examples

### Adding New Email Configuration

```sql
INSERT INTO workspace_email_config (
  workspace_id,
  from_email,
  from_name,
  reply_to,
  resend_api_key,
  is_active
) VALUES (
  '12345',
  'support@customerconnects.app',
  'Customer Support',
  'support@customerconnects.app',
  'your_resend_api_key',
  true
);
-- This will automatically create a Cloudflare routing rule
```

### Updating Email Address

```sql
UPDATE workspace_email_config 
SET from_email = 'newsupport@customerconnects.app'
WHERE workspace_id = '12345';
-- This will create a new Cloudflare rule for the new email
```

### Activating Inactive Configuration

```sql
UPDATE workspace_email_config 
SET is_active = true
WHERE workspace_id = '12345';
-- This will create a Cloudflare rule if none exists
```

## Monitoring and Logging

### Check API Call Status

```sql
SELECT 
  email_address,
  api_action,
  status,
  error_message,
  created_at
FROM cloudflare_api_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### View Successful Rule Creations

```sql
SELECT 
  email_address,
  response_payload->>'success' as api_success,
  response_payload->'result'->>'id' as rule_id,
  created_at
FROM cloudflare_api_logs 
WHERE status = 'success' 
ORDER BY created_at DESC;
```

### View Failed API Calls

```sql
SELECT 
  email_address,
  error_message,
  request_payload,
  response_payload,
  created_at
FROM cloudflare_api_logs 
WHERE status = 'error' 
ORDER BY created_at DESC;
```

## Manual Function Execution

You can manually create a Cloudflare rule for any email address:

```sql
SELECT create_cloudflare_email_rule('manual@customerconnects.app');
```

## Testing

Use the test script located at `scripts/test_cloudflare_email_trigger.sql` to verify the system works correctly.

## Security Considerations

1. **API Token**: The Cloudflare API token is hardcoded in the function. Consider using environment variables or secure storage.
2. **Function Security**: Functions are created with `SECURITY DEFINER` to ensure proper permissions.
3. **Error Handling**: Failed API calls are logged but don't prevent database operations from completing.

## Post-Creation Steps

After a Cloudflare rule is created via this trigger:

1. **Check Cloudflare Dashboard**: Go to Email > Email Routing > Routes
2. **Find the Rule**: Look for rules with "UPDATE TO CUSTOMERCONNECT WORKER" in the name
3. **Convert to Worker**: Edit the rule and change action from "Forward" to "Send to Worker"
4. **Select Worker**: Choose the appropriate worker (e.g., "customerconnect")
5. **Enable Rule**: Set the rule to enabled
6. **Test**: Send a test email to verify routing works

## Troubleshooting

### Common Issues

1. **HTTP Extension Missing**: Ensure `http` extension is enabled in Supabase
2. **Permission Errors**: Check that service_role has necessary permissions
3. **API Token Invalid**: Verify the Cloudflare API token is still valid
4. **Network Issues**: Check if Supabase can reach Cloudflare API endpoints

### Debug Queries

```sql
-- Check if trigger exists
SELECT * FROM information_schema.triggers 
WHERE event_object_table = 'workspace_email_config';

-- Check if HTTP extension is enabled
SELECT * FROM pg_extension WHERE extname = 'http';

-- View recent trigger executions (check PostgreSQL logs)
SELECT * FROM cloudflare_api_logs ORDER BY created_at DESC LIMIT 5;
```

## Maintenance

### Updating API Token

If the Cloudflare API token needs to be updated:

```sql
CREATE OR REPLACE FUNCTION create_cloudflare_email_rule(email_address TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Update the api_headers array with new token
-- ... (rest of function remains the same)
$$;
```

### Cleanup Old Logs

```sql
-- Delete logs older than 30 days
DELETE FROM cloudflare_api_logs 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## Migration Information

- **Migration Name**: `create_cloudflare_email_routing_trigger`
- **Applied**: Successfully created all components
- **Dependencies**: Requires `http` extension
- **Rollback**: Drop trigger, functions, and table if needed

## Performance Notes

- Trigger executes asynchronously to avoid blocking database operations
- API calls are made using PostgreSQL's `http` extension
- Logging table has indexes on `email_address` and `created_at` for efficient queries
- Failed API calls don't prevent database transactions from completing 