# Developer Mode Backend Implementation Guide

## Overview

This document outlines the Cloudflare Worker backend implementation for the Developer Mode feature. All backend code should be implemented in Cloudflare Workers located in the main repo.

## Backend Location

**Main Repo**: `/Users/benjiemalinao/Documents/deepseek-test-livechat`  
**Worker Location**: `cloudflare-workers/admin-api/`

## Project Structure

```
cloudflare-workers/
└── admin-api/                          # NEW: Admin API Worker
    ├── src/
    │   ├── index.ts                    # Main entry point (Hono app)
    │   ├── routes/
    │   │   ├── developerMode.ts        # Developer mode endpoints
    │   │   ├── connectors.ts           # Connector review endpoints
    │   │   └── revenue.ts              # Revenue analytics endpoints
    │   ├── services/
    │   │   ├── developerModeService.ts # Business logic for dev mode
    │   │   ├── connectorService.ts     # Connector approval logic
    │   │   └── revenueService.ts       # Revenue calculation logic
    │   ├── middleware/
    │   │   ├── auth.ts                 # Admin authentication
    │   │   └── adminGuard.ts           # Admin role verification
    │   └── utils/
    │       ├── supabase.ts             # Supabase client
    │       └── errors.ts               # Error handling
    ├── wrangler.toml                    # Cloudflare Worker config
    └── package.json
```

## API Endpoints to Implement

### Base URL
All endpoints are prefixed with `/admin-api/`

### Authentication
All endpoints require:
- `Authorization: Bearer <admin_jwt_token>`
- Admin role verification (check `saas_admin_users` table)

---

### 1. Developer Mode Applications

#### GET `/admin-api/developer-mode/applications`
**Purpose**: Get list of developer mode applications  
**Query Params**: 
- `status` (optional): Filter by status ('pending', 'approved', 'rejected', 'suspended')
- `page` (optional): Page number for pagination
- `per_page` (optional): Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "workspace_id": "12345",
      "workspace_name": "Acme Corp",
      "approval_status": "pending",
      "developer_name": "John Doe",
      "developer_email": "john@acme.com",
      "developer_website": "https://johndoe.dev",
      "developer_bio": "...",
      "intended_use": "...",
      "created_at": "2025-01-23T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "per_page": 20,
    "total_pages": 1
  }
}
```

**Implementation**:
- Query `workspace_developer_config` table
- Join with `workspaces` table for workspace name
- Filter by status if provided
- Return paginated results

---

#### POST `/admin-api/developer-mode/approve`
**Purpose**: Approve a developer mode application  
**Request Body**:
```json
{
  "workspace_id": "12345",
  "notes": "Verified identity and use case"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Developer mode approved for workspace 12345",
  "data": {
    "workspace_id": "12345",
    "is_developer_mode": true,
    "approval_status": "approved",
    "approved_by": "admin-uuid",
    "approved_at": "2025-01-25T10:00:00Z",
    "stripe_subscription_created": true,
    "subscription_id": "sub_abc123"
  }
}
```

**Implementation Steps**:
1. Verify admin has permission
2. Update `workspace_developer_config`:
   - Set `is_developer_mode = true`
   - Set `approval_status = 'approved'`
   - Set `approved_by = admin_user_id`
   - Set `approved_at = NOW()`
3. Create Stripe subscription ($1/month)
4. Create `developer_subscriptions` record
5. Assign shared Twilio config (if applicable)
6. Send approval email to developer
7. Return success response

---

#### POST `/admin-api/developer-mode/reject`
**Purpose**: Reject a developer mode application  
**Request Body**:
```json
{
  "workspace_id": "12345",
  "rejection_reason": "Insufficient information provided"
}
```

**Implementation Steps**:
1. Update `workspace_developer_config`:
   - Set `approval_status = 'rejected'`
   - Set `rejection_reason = provided_reason`
2. Send rejection email to developer
3. Return success response

---

### 2. Connector Review

#### GET `/admin-api/connectors/pending`
**Purpose**: Get list of connectors pending review  
**Query Params**: 
- `status` (optional): Filter by status
- `page`, `per_page`: Pagination

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "connector-uuid",
      "name": "Shopify Product Sync",
      "description": "...",
      "category": "E-commerce",
      "icon": "🔌",
      "developer_workspace_id": "12345",
      "developer_name": "Acme Corp",
      "marketplace_status": "pending_review",
      "pricing_type": "subscription",
      "base_price": 10.00,
      "subscription_interval": "monthly",
      "created_at": "2025-01-24T12:00:00Z"
    }
  ]
}
```

**Implementation**:
- Query `connector_templates` table (or `connectors` table)
- Filter by `marketplace_status = 'pending_review'`
- Join with `workspaces` for developer name
- Return results

---

#### POST `/admin-api/connectors/:id/approve`
**Purpose**: Approve a connector for marketplace  
**Request Body**:
```json
{
  "notes": "Tested and approved for marketplace"
}
```

**Implementation Steps**:
1. Update connector `marketplace_status = 'approved'`
2. Set `reviewed_by = admin_user_id`
3. Set `reviewed_at = NOW()`
4. If paid connector, create Stripe product and price
5. Send approval email to developer
6. Return success response

---

#### POST `/admin-api/connectors/:id/reject`
**Purpose**: Reject a connector submission  
**Request Body**:
```json
{
  "rejection_reason": "Security concerns with API implementation"
}
```

**Implementation Steps**:
1. Update connector `marketplace_status = 'rejected'`
2. Set `rejection_reason = provided_reason`
3. Send rejection email to developer
4. Return success response

---

#### POST `/admin-api/connectors/:id/test`
**Purpose**: Test connector execution (dry run)  
**Response**:
```json
{
  "success": true,
  "message": "Connector test completed successfully",
  "output": { /* connector execution result */ }
}
```

**Implementation**:
- Execute connector in test mode
- Use test data (no real contact updates)
- Return execution result

---

### 3. Developer Workspaces

#### GET `/admin-api/developer-mode/workspaces`
**Purpose**: Get list of all developer workspaces  
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "dev-1",
      "workspace_id": "12345",
      "workspace_name": "Acme Corp",
      "developer_name": "John Doe",
      "developer_email": "john@acme.com",
      "is_developer_mode": true,
      "approval_status": "approved",
      "total_connectors_published": 3,
      "total_revenue_generated": 1200.00,
      "stripe_connect_account_id": "acct_123",
      "stripe_onboarding_complete": true,
      "usage": {
        "sms_sent": 15,
        "sms_included": 20,
        "contacts_count": 8500,
        "contacts_included": 10000,
        "api_calls": 125000
      },
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

**Implementation**:
- Query `workspace_developer_config` where `is_developer_mode = true`
- Join with `workspaces` for workspace name
- Join with `developer_usage_tracking` for current usage
- Calculate revenue from `connector_purchases` table
- Return aggregated data

---

### 4. Revenue Analytics

#### GET `/admin-api/revenue`
**Purpose**: Get platform revenue statistics  
**Query Params**:
- `period` (optional): Time period ('7', '30', '90', '365' days, default: '30')

**Response**:
```json
{
  "success": true,
  "data": {
    "total_revenue": 2450.00,
    "platform_revenue": 735.00,
    "developer_payouts": 1715.00,
    "period_start": "2024-12-25T00:00:00Z",
    "period_end": "2025-01-25T00:00:00Z",
    "top_connectors": [
      {
        "id": "conn-3",
        "name": "Email Verification API",
        "revenue": 890.00,
        "installs": 152
      }
    ],
    "top_developers": [
      {
        "workspace_id": "12345",
        "workspace_name": "Acme Corp",
        "revenue": 1200.00,
        "connector_count": 3
      }
    ]
  }
}
```

**Implementation**:
- Query `connector_purchases` table for period
- Calculate total revenue
- Calculate platform share (30%) and developer payouts (70%)
- Aggregate by connector for top connectors
- Aggregate by developer workspace for top developers
- Return aggregated statistics

---

## Database Tables Required

See main implementation plan for complete schema. Key tables:

1. `workspace_developer_config` - Developer mode configuration
2. `platform_shared_credentials` - Shared Twilio/Email credentials
3. `developer_usage_tracking` - Usage statistics
4. `connector_templates` (or `connectors`) - Connector definitions
5. `connector_purchases` - Purchase records
6. `developer_payouts` - Payout records

---

## Authentication & Authorization

### Admin Authentication Middleware

```typescript
// middleware/adminGuard.ts

/**
 * Verify that the request is from an authenticated admin user
 * 
 * Checks:
 * 1. JWT token is valid
 * 2. User exists in saas_admin_users table
 * 3. User is active
 * 
 * @param c - Hono context
 * @returns Admin user ID if authorized, throws error if not
 */
export async function verifyAdmin(c: Context) {
  // 1. Extract JWT from Authorization header
  // 2. Verify JWT with Supabase
  // 3. Check saas_admin_users table
  // 4. Return admin user ID
}
```

---

## Error Handling

All endpoints should return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { /* optional additional details */ }
}
```

Common error codes:
- `UNAUTHORIZED` - Not authenticated or not admin
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `DATABASE_ERROR` - Database operation failed

---

## Environment Variables

Required environment variables for the Worker:

```bash
# Supabase
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Stripe (for subscriptions and payouts)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin API
ADMIN_API_BASE_URL=https://admin-api.your-domain.com
```

---

## Testing

### Local Development

1. Use `wrangler dev` for local testing
2. Use mock Supabase client for development
3. Test with sample data

### Integration Testing

1. Test with real Supabase database
2. Verify admin authentication
3. Test all CRUD operations
4. Verify error handling

---

## Deployment

### Cloudflare Worker Deployment

1. Build: `npm run build`
2. Deploy: `wrangler publish`
3. Configure environment variables in Cloudflare dashboard
4. Set up custom domain (optional)

### Route Configuration

Configure routes in `wrangler.toml`:
```toml
routes = [
  { pattern = "admin-api.your-domain.com/*", zone_name = "your-domain.com" }
]
```

---

## Next Steps

1. **Create Worker Structure**: Set up `cloudflare-workers/admin-api/` directory
2. **Implement Authentication**: Build admin auth middleware
3. **Implement Endpoints**: Build each endpoint one by one
4. **Database Integration**: Connect to Supabase
5. **Testing**: Test all endpoints
6. **Update Frontend**: Replace mock data in `developerModeApi.ts`

---

## Related Files

- **Frontend API Service**: `Command Center/src/features/developer-mode/services/developerModeApi.ts`
- **Main Implementation Plan**: `deepseek-test-livechat/docs/developer-mode/DEVELOPER_MODE_IMPLEMENTATION_PLAN.md`
- **Database Schema**: See main plan for SQL migrations

