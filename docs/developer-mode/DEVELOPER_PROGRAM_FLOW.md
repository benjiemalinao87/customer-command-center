# Developer Program Flow

> **Last Updated**: December 26, 2025

## Overview

The Developer Program allows external developers to build and publish connectors on the Customer Connect marketplace. This document describes the complete flow from lead capture to active developer.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DEVELOPER PROGRAM FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LANDING PAGE (/developers)                                               │
│     └── Public page - no auth required                                       │
│     └── High-converting funnel design                                        │
│     └── Application form modal                                               │
│                                                                              │
│  2. LEAD CAPTURE                                                             │
│     └── POST /public/developer-leads (Cloudflare Worker - admin-api)         │
│     └── Stores in Supabase: developer_leads table                           │
│     └── Sends email notification to admin                                    │
│     └── Shows success modal with signup CTA                                  │
│                                                                              │
│  3. USER SIGNUP                                                              │
│     └── Redirect to /auth with email pre-filled                              │
│     └── Standard signup flow                                                 │
│     └── Creates workspace automatically                                      │
│                                                                              │
│  4. FORMAL APPLICATION (Future - when they're logged in)                     │
│     └── Settings → Advanced → Developer Mode                                 │
│     └── POST /public/applications                                            │
│     └── Creates workspace_developer_config record                            │
│                                                                              │
│  5. ADMIN REVIEW                                                             │
│     └── Admin dashboard: Command Center → Developer Mode                     │
│     └── Review applications                                                  │
│     └── Approve/Reject with reason                                           │
│     └── Email sent to developer on status change                             │
│                                                                              │
│  6. ACTIVE DEVELOPER                                                         │
│     └── Can submit connectors to marketplace                                 │
│     └── 70% revenue share on paid connectors                                 │
│     └── Analytics and payout tracking                                        │
│                                                                              │
│  7. CONNECTOR SUBMISSION (NEW - Dec 2025) ✅                                  │
│     └── Developer Mode badge shows in Connectors Dashboard                   │
│     └── "Submit to Marketplace" option in connector menu                     │
│     └── POST /public/connectors - saves to connector_templates               │
│     └── "My Submissions" shows submission status                             │
│                                                                              │
│  8. ADMIN CONNECTOR REVIEW (NEW - Dec 2025) ✅                                │
│     └── Command Center → Developer Mode → Connector Review tab               │
│     └── View Config modal shows full API configuration                       │
│     └── Shows input_schema (required credentials)                            │
│     └── Shows field_mappings (response transformations)                      │
│     └── Approve/Reject buttons with reason                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Tables

### developer_leads
Captures leads from the public landing page BEFORE they create an account.

```sql
-- Location: supabase/migrations/20250626_001_developer_leads.sql

CREATE TABLE public.developer_leads (
    id UUID PRIMARY KEY,
    developer_name TEXT NOT NULL,
    developer_email TEXT UNIQUE NOT NULL,
    company TEXT,
    website TEXT,
    experience TEXT,
    intended_use TEXT NOT NULL,

    -- UTM tracking
    source TEXT DEFAULT 'developer_program_page',
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- Status: new, contacted, converted, rejected, spam
    status TEXT DEFAULT 'new',

    -- After conversion (user signs up)
    user_id UUID REFERENCES auth.users(id),
    workspace_id UUID REFERENCES workspaces(id),
    converted_to_application_id UUID,

    -- Admin tracking
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### workspace_developer_config
Formal developer mode applications (requires account).

```sql
-- Location: supabase/migrations/20250624_001_workspace_developer_config.sql

-- Stores developer mode status for workspaces
-- Created when workspace admin applies for developer mode
-- Updated when admin approves/rejects
```

## API Endpoints

### Public Endpoints (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/public/developer-leads` | Submit lead from landing page |
| GET | `/public/developer-leads/check/:email` | Check if email already applied |

### Authenticated Endpoints (User Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/public/applications` | Submit formal developer application |
| GET | `/public/applications/workspace/:id` | Get application status |
| POST | `/public/connectors` | Submit connector (approved devs only) |
| GET | `/public/connectors/workspace/:id` | Get workspace's connectors |
| PUT | `/public/connectors/:id` | Update connector |
| GET | `/public/marketplace` | Browse approved connectors |

### Admin Endpoints (Platform Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin-api/applications` | List all applications |
| POST | `/admin-api/applications/:id/approve` | Approve application |
| POST | `/admin-api/applications/:id/reject` | Reject application |
| GET | `/admin-api/connectors` | List all connectors pending review |
| GET | `/admin-api/connectors/:id` | Get full connector details (config, input_schema, field_mappings) |
| POST | `/admin-api/connectors/:id/approve` | Approve connector |
| POST | `/admin-api/connectors/:id/reject` | Reject connector |

## Frontend Components

### Public Pages (Main App)

| Component | Route | Description |
|-----------|-------|-------------|
| `DeveloperProgramPage.js` | `/developers` | Landing page with application form |

### Connectors Dashboard (Main App)

| Component | Location | Description |
|-----------|----------|-------------|
| `ConnectorsDashboard.jsx` | `/components/connectors/ConnectorsDashboard.jsx` | Shows Developer Mode badge (teal) when approved |
| | | "Submit to Marketplace" menu item |
| | | "My Submissions" menu item to track status |
| `ConnectorMarketplace.jsx` | `/components/connectors/ConnectorMarketplace.jsx` | Browse and install marketplace connectors |

### Settings Components

| Component | Location | Status |
|-----------|----------|--------|
| `DeveloperModeSettings.js` | `/settings/DeveloperModeSettings.js` | Not integrated - use /developers instead |
| `ConnectorSubmissionForm.js` | `/settings/ConnectorSubmissionForm.js` | Used after approval for submitting connectors |

### Admin Components (Command Center)

| Component | Location | Description |
|-----------|----------|-------------|
| `DeveloperMode.tsx` | `/features/developer-mode/` | Main container with tabs |
| `DeveloperApplications.tsx` | `/features/developer-mode/` | Review developer applications |
| `ConnectorReview.tsx` | `/features/developer-mode/` | Review connector submissions |
| `DeveloperWorkspaces.tsx` | `/features/developer-mode/` | Manage developer workspaces |
| `RevenueDashboard.tsx` | `/features/developer-mode/` | Analytics and payout tracking |

## Email Notifications

Emails are sent via Resend API from the Cloudflare Worker.

| Event | Recipient | Template |
|-------|-----------|----------|
| New lead submitted | Admin (benjie@buyerfound.ai) | `sendDeveloperLeadNotification` |
| Application approved | Developer | `sendApplicationApprovedEmail` |
| Application rejected | Developer | `sendApplicationRejectedEmail` |
| Connector approved | Developer | `sendConnectorApprovedEmail` |
| Connector rejected | Developer | `sendConnectorRejectedEmail` |

## Environment Variables

### Cloudflare Worker (admin-api)

```bash
# Required
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Optional
RESEND_API_KEY=re_xxx                    # For email notifications
ADMIN_NOTIFICATION_EMAIL=xxx@xxx.com      # Email to receive lead notifications
ENVIRONMENT=production
API_VERSION=v1
```

### Frontend

```bash
REACT_APP_DEVELOPER_MODE_API_URL=https://admin-api.xxx.workers.dev
```

## Revenue Model

- **Developer Share**: 70%
- **Platform Share**: 30%
- **Payout Method**: Stripe Connect (future implementation)
- **Payout Schedule**: Monthly

## Lead Status Flow

```
new → contacted → converted (signed up & applied) → [approved/rejected]
  │
  └→ spam (marked by admin)
  └→ rejected (not qualified)
```

## Files Reference

| File | Purpose |
|------|---------|
| `frontend/src/pages/DeveloperProgramPage.js` | Public landing page |
| `cloudflare-workers/admin-api/src/routes/public.ts` | Public API endpoints |
| `cloudflare-workers/admin-api/src/services/emailService.ts` | Email templates |
| `supabase/migrations/20250626_001_developer_leads.sql` | Lead capture table |
| `supabase/migrations/20250624_001_workspace_developer_config.sql` | Developer config table |

## Testing

1. Visit `http://localhost:3000/developers`
2. Click "Apply Now"
3. Fill out form and submit
4. Check Supabase `developer_leads` table for entry
5. Check admin email for notification
6. Click "Create Account Now" to be redirected to signup

## Connector Review Modal (Admin)

When admin clicks "View Config" in Command Center, a modal shows:

| Section | Description |
|---------|-------------|
| **Basic Info** | Name, description, category, pricing type, price |
| **Developer** | Developer name, workspace name |
| **API Configuration** | Full JSON config (url, method, headers, auth, body, retries, timeout) |
| **Input Schema** | Required credentials/parameters with titles and descriptions |
| **Field Mappings** | Table showing source_path → target_field transformations |
| **Tags** | Category tags for search/filtering |

### Technical Notes

- The list endpoint (`GET /admin-api/connectors`) only returns basic fields for performance
- The detail endpoint (`GET /admin-api/connectors/:id`) returns ALL fields including `config`, `input_schema`, `field_mappings`
- The detail endpoint fetches workspace and developer_config separately to avoid join issues with numeric workspace IDs

## Implementation Status (Dec 26, 2025)

### ✅ Completed

| Feature | Status | Notes |
|---------|--------|-------|
| Developer Landing Page | ✅ Done | `/developers` - public funnel |
| Lead Capture API | ✅ Done | POST /public/developer-leads |
| Developer Applications | ✅ Done | Full CRUD + approve/reject |
| Connector Submission UI | ✅ Done | Submit to Marketplace menu (teal badge) |
| Connector Submission API | ✅ Done | Uses connector_templates table |
| Admin Connector Review | ✅ Done | View Config modal with full details |
| Connector Marketplace | ✅ Done | Browse, filter, install connectors |
| Email Notifications | ✅ Done | Via Resend API |

### ⏳ Pending

| Feature | Priority | Notes |
|---------|----------|-------|
| Lead-to-Account Linking | Medium | Auto-link leads to applications |
| Stripe Connect Integration | Medium | Developer payouts |
| Connector Rating/Reviews | Low | User feedback system |
| Connector Uninstall/Reinstall | Low | Remove/update installed connectors |
| Developer Dashboard | Low | Usage analytics for developers |
