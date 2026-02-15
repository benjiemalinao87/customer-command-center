# Public Servers and Endpoints

This document lists all public-facing servers, APIs, and endpoints in the system.

## Main Application Servers

### Production
- **Frontend**: `https://cc1.automate8.com`
- **Backend API**: `https://cc.automate8.com`
- **Database (Supabase)**: `https://ycwttshvizkotcwwyjpt.supabase.co`

### Development
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:5000`
- **AI Services**: `http://localhost:8787` (Wrangler dev)

---

## Cloudflare Workers (Edge Services)

### 1. Webhook Processor
- **Production**: `https://worker.api-customerconnect.app`
- **Worker URL**: `https://webhook-processor.benjiemalinao879557.workers.dev`
- **Purpose**: High-performance webhook processing with sub-50ms response times
- **Endpoints**:
  - `POST /webhooks/{webhookId}` - Process webhook payloads
  - `GET /health` - Health check

### 2. Notes AI Processor
- **Custom Domain**: `https://ai-notes.customerconnects.app/api/notes`
- **Direct Worker URL**: `https://notes-ai-processor.benjiemalinao879557.workers.dev`
- **Purpose**: AI content generation, enhancement, summarization, and expansion
- **Endpoints**:
  - `POST /generate` - Generate content
  - `POST /enhance` - Enhance content
  - `POST /summarize` - Summarize content
  - `POST /expand` - Expand content
  - `GET /health` - Health check

### 3. Livechat API v2
- **Custom Domain**: `https://api-v2.automate8.com`
- **Worker URL**: `https://livechat-api-v2.benjiemalinao879557.workers.dev`
- **Purpose**: High-performance livechat API with D1 database sync
- **Endpoints**:
  - `GET /api/v2/contacts/:id` - Get contact
  - `GET /api/v2/contacts/search` - Search contacts
  - `GET /api/v2/contacts/:id/messages` - Get messages
  - `POST /api/v2/webhook/sync` - Supabase sync webhook

### 4. URL Shortener
- **Worker URL**: `https://url-shortener.benjiemalinao879557.workers.dev`
- **Custom Domain**: `*.schedules.today` (workspace subdomains)
- **Purpose**: URL shortening with workspace-specific subdomains
- **Endpoints**:
  - `POST /api/shorten` - Create short link
  - `GET /:code` - Redirect link
  - `GET /api/analytics/:code` - Get analytics
  - `GET /health` - Health check

### 5. Connectors API
- **Staging**: `https://connectors-api-staging.benjiemalinao879557.workers.dev`
- **Production**: `https://connectors-api-production.benjiemalinao879557.workers.dev`
- **Purpose**: Connector management and execution for integrations
- **Endpoints**:
  - `GET /api/v1/connectors` - List connectors
  - `POST /api/v1/connectors` - Create connector
  - `POST /api/v1/connectors/:id/execute` - Execute connector
  - `GET /health` - Health check

### 6. Leads API v3
- **Base URL**: `https://api-customerconnect.app/api/v3/leads`
- **Purpose**: Lead-centric API for CRM pipeline management
- **Endpoints**:
  - `GET /` - List leads
  - `POST /` - Create lead
  - `GET /{id}` - Get lead
  - `PUT /{id}` - Update lead
  - `GET /{id}/activities` - Get lead activities
  - `GET /contacts/search` - Search contacts
  - `GET /pipeline/{workspace_id}` - Get pipeline overview

### 7. Inbound Leads API
- **Worker URL**: `https://inbound-leads-api.benjiemalinao879557.workers.dev`
- **Purpose**: Handle inbound leads from external sources
- **Endpoints**:
  - `GET /api/inbound-leads` - List inbound leads
  - `GET /api/inbound-leads/:id` - Get specific lead
  - `GET /api/webhook-stats` - Get webhook statistics

### 8. Calendar Booking API
- **Worker URL**: `https://calendar-booking-api.benjiemalinao879557.workers.dev`
- **Purpose**: Calendar booking and appointment management
- **Endpoints**:
  - `GET /api/calendar/availability` - Get availability (public)
  - `POST /api/calendar/book` - Book appointment (public)
  - `GET /api/calendar/events` - Get events (auth required)
  - `GET /api/calendar/bookings` - Get bookings (auth required)

### 9. Booking Pages Worker
- **Custom Domain**: `*.appointments.today`
- **Worker URL**: `https://booking-pages-worker.benjiemalinao879557.workers.dev`
- **Purpose**: Public booking pages for appointments
- **Endpoints**:
  - `GET /` - Booking page
  - `POST /api/appointments` - Create appointment

### 10. Webchat Worker
- **Worker URL**: `https://webchat-worker-production.benjiemalinao879557.workers.dev`
- **Purpose**: Embedded webchat widget functionality
- **Endpoints**:
  - `POST /api/webchat/message` - Send message
  - `GET /api/webchat/status` - Get chat status

### 11. Contact List Cache
- **Worker URL**: `https://contact-list-cache.benjiemalinao879557.workers.dev`
- **Purpose**: Cached contact lists for board views
- **Endpoints**:
  - `GET /api/boards/{boardId}/contacts` - Get cached contacts
  - `POST /api/cache/invalidate` - Invalidate cache

### 12. Notes Image Storage
- **Worker URL**: `https://notes-image-storage.benjiemalinao879557.workers.dev`
- **Purpose**: Image storage for notes
- **Endpoints**:
  - `POST /api/images/upload` - Upload image
  - `GET /api/images/:id` - Get image

### 13. Opportunities API
- **Custom Domain**: `https://prod-api.customerconnects.app/api/pipeline/opportunities`
- **Worker URL**: `https://opportunities-api.benjiemalinao879557.workers.dev`
- **Purpose**: Pipeline opportunities management
- **Endpoints**:
  - `GET /api/pipeline/opportunities` - List opportunities
  - `POST /api/pipeline/opportunities` - Create opportunity

### 14. SMS Service
- **Worker URL**: `https://sms-service.benjiemalinao879557.workers.dev`
- **Purpose**: SMS sending service
- **Endpoints**:
  - `POST /api/sms/send` - Send SMS
  - `GET /health` - Health check

### 15. Workflow Trigger API
- **Worker URL**: `https://workflow-trigger-api.benjiemalinao879557.workers.dev`
- **Purpose**: Trigger workflows from external sources
- **Endpoints**:
  - `POST /api/trigger/workflow` - Trigger workflow
  - `GET /health` - Health check

---

## Third-Party Services

### Trigger.dev
- **API URL**: `https://api.trigger.dev`
- **Public Access Token**: `pk_prod_08qnydjIs1znbhd0fEBj` (placeholder - needs to be generated)
- **Purpose**: Background job processing and workflow automation

### Supabase
- **Project URL**: `https://ycwttshvizkotcwwyjpt.supabase.co`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inljd3R0c2h2aXprb3Rjd3d5anB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzgyNDQ5NzUsImV4cCI6MjA1MzgyMDk3NX0.7Mn5vXXre0KwW0lKgsPv1lwSXn5CiRjTRMw2RuH_55g`
- **Purpose**: Database, authentication, and real-time subscriptions

#### Supabase Public API Endpoints:
- **PostgREST API (Database)**: `https://ycwttshvizkotcwwyjpt.supabase.co/rest/v1/`
  - CRUD operations on database tables
  - Example: `GET https://ycwttshvizkotcwwyjpt.supabase.co/rest/v1/contacts`
  
- **Auth API**: `https://ycwttshvizkotcwwyjpt.supabase.co/auth/v1/`
  - User authentication, sign-up, sign-in, user management
  
- **Storage API**: `https://ycwttshvizkotcwwyjpt.supabase.co/storage/v1/`
  - File storage operations (upload, retrieve files)
  
- **Realtime API**: `wss://ycwttshvizkotcwwyjpt.supabase.co/realtime/v1/`
  - WebSocket connection for real-time database changes

---

## Configuration

All public server URLs are configured in:
- `frontend/public/config.js` - Runtime configuration for React app
- Environment variables in various `wrangler.toml` files
- Backend environment variables

---

## Notes

- All Cloudflare Workers are deployed to the edge for global distribution
- Custom domains are configured for production services
- Development servers run on localhost
- All production servers use HTTPS
- Worker URLs follow the pattern: `{service-name}.benjiemalinao879557.workers.dev`

---

## Last Updated
Generated: 2025-01-14








