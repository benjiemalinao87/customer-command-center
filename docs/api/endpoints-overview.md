# API Endpoints Overview

This document provides a comprehensive overview of all available API endpoints in the CRM and messaging system.

## Base URLs

### Production
- **Frontend**: `https://cc1.automate8.com`
- **Backend**: `https://cc.automate8.com`
- **AI Services**: `https://ai-notes.customerconnects.app`
- **Database**: `https://ycwttshvizkotcwwyjpt.supabase.co`

### Development
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:5000`
- **AI Services**: `http://localhost:8787` (Wrangler dev)

## Authentication

### 1. JWT Authentication (Recommended for user sessions)
```http
Authorization: Bearer YOUR_JWT_TOKEN
```

### 2. API Key Authentication (For integrations)
```http
X-API-Key: crm_your_api_key_here
```

### 3. Workspace Context
```http
X-Workspace-Id: your_workspace_id
```

## API Categories

### Core Business Logic
- **[Contacts API](./contacts.md)** - Contact management (CRUD, search, enhanced search)
  - **NEW**: `/api/v3/contacts/search` - High-performance Cloudflare Worker endpoint (90% faster)
- **[Pipeline API](./PIPELINE_API.md)** - CRM pipeline and opportunities management
- **[Messaging API](./MESSAGING_API.md)** - Real-time messaging with Socket.IO and SMS
- **[Board API](./BOARD_API.md)** - Board management and visualization

### Communication & Integration
- **[Twilio API](./TWILIO_API.md)** - SMS/Voice integration and webhook handling
- **[Email API](./EMAIL_API.md)** - Email service integration
- **[AI API](./AI_API.md)** - Notes AI processor with content generation, enhancement, summarization, and expansion
- **[Webhook API](./WEBHOOK_API.md)** - External webhook management

### Workflow & Automation
- **[Trigger.dev API](./TRIGGER_API.md)** - Background job processing
- **[Actions API](./ACTIONS_API.md)** - Action execution system
- **[Schedule API](./SCHEDULE_API.md)** - Message scheduling
- **[Queue API](./QUEUE_API.md)** - Queue management

### Admin & Management
- **[Admin API](./ADMIN_API.md)** - Admin dashboard and analytics
- **[Workspace API](./WORKSPACE_API.md)** - Team and workspace management
- **[API Keys](./API_KEYS.md)** - API key management
- **[Billing API](./BILLING_API.md)** - Payment processing

## Quick Start

1. **Get API Key**: Contact your admin to get an API key
2. **Set Base URL**: Use production (`https://cc.automate8.com`) or development URL
3. **Add Authentication**: Include `X-API-Key` header in all requests
4. **Test Endpoint**: Start with `GET /api/contacts` to verify setup

## Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": { ... },
  "pagination": {
    "total": 100,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "error": null
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information",
  "data": null
}
```

## Rate Limiting

- **Default**: 1000 requests per hour per API key
- **Burst**: 100 requests per minute
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## Support

- **Documentation**: Check individual API docs for detailed examples
- **Issues**: Report at GitHub repository
- **Contact**: Reach out to development team for assistance