# Inbound Lead Management

A comprehensive CRM queue management system for efficiently processing, tracking, and managing incoming leads from external sources (webhooks, landing pages, Facebook Ads, etc.).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Complete Data Flow](#complete-data-flow)
4. [Features](#features)
5. [Usage](#usage)
6. [Component Structure](#component-structure)
7. [Development Guide](#development-guide)

---

## Architecture Overview

### System Components

The Inbound Lead Management system consists of:

1. **Cloudflare Webhook Processor** (Edge Worker) - Processes incoming webhooks at global edge locations
2. **Supabase PostgreSQL Database** - Stores contacts and leads with workspace isolation
3. **Express Backend** (Socket.IO Server) - Emits real-time events for new leads
4. **Cloudflare Inbound Leads API** (Edge Worker) - Fast API for querying leads
5. **React Frontend** (Chakra UI) - Dashboard for viewing and managing leads

### Performance Characteristics

- **Initial Load:** ~600ms (Cloudflare Worker API)
- **Real-Time Update:** <1 second (WebSocket notification + API refresh)
- **Edge Locations:** 300+ worldwide (Cloudflare network)
- **Response Format:** Sub-50ms webhook processing
- **Database:** PostgreSQL with Row Level Security (RLS)

---

## Database Schema

### Primary Table: `leads` (54 columns, 3,229+ records)

The `leads` table stores comprehensive sales opportunity tracking data:

#### Core Fields
- `id` (uuid) - Primary key
- `contact_id` (uuid) - Foreign key to contacts table
- `workspace_id` (text) - Multi-tenant isolation

#### Lead Source Tracking
- `lead_source` - Where the lead came from
- `sub_source` - Specific source detail
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` - Marketing attribution
- `landing_page_url` - Original conversion page
- `conversion_event` - What action triggered the lead
- `webhook_id` - If created via webhook

#### Lead Qualification
- `lead_status_id` (integer) - Current status
- `qualification_status` - Qualification level
- `lead_score` (integer) - Scoring value
- `stage` - Current pipeline stage
- `temperature` - Hot/Warm/Cold indicator
- `priority` - Priority level

#### Product/Service Interest
- `product_interest` - Primary product
- `secondary_products` (jsonb) - Additional interests
- `service_type` - Type of service needed

#### Business Value
- `estimated_value` (numeric) - Deal size estimate
- `probability` (integer) - Win probability %
- `expected_close_date` (date) - Target close
- `budget_range` - Budget information
- `timeline` - Purchase timeline

#### Assignment & Ownership
- `assigned_to` (uuid) - Assigned user
- `team_id` (text) - Team assignment
- `created_by`, `updated_by` (uuid) - Audit trail

#### Contact Preferences
- `preferred_contact_method` - Email/SMS/Phone
- `best_time_to_contact` - Scheduling preference
- `timezone` - Contact timezone

#### Sales Intelligence
- `initial_inquiry` (text) - First message/question
- `pain_points` (jsonb) - Customer challenges
- `decision_makers` (jsonb) - Key stakeholders
- `budget_range` - Budget information
- `competition` (jsonb) - Competing solutions
- `referral_source` - How they found you

#### Activity Tracking
- `last_activity_at` (timestamp) - Last interaction
- `next_follow_up_at` (timestamp) - Scheduled follow-up
- `follow_up_count` (integer) - Number of follow-ups

#### Conversion Tracking
- `is_active` (boolean) - Active status
- `is_converted` (boolean) - Won/Lost status
- `converted_at` (timestamp) - Conversion date
- `conversion_value` (numeric) - Actual deal value
- `lost_reason` - Why deal was lost
- `lost_at` (timestamp) - Lost date

#### Custom Data
- `metadata` (jsonb) - Additional custom fields
- `tags` (jsonb) - Lead tags
- `custom_fields` (jsonb) - Workspace-specific fields

#### Automation
- `campaign_id` (uuid) - Associated campaign
- `nurture_sequence_id` (uuid) - Automation sequence

### Related Tables

1. **contacts** (53 columns) - Person/company contact information
2. **lead_activities** (51 columns) - Activity tracking for leads
3. **lead_pipeline_stages** (25 columns) - Custom pipeline stages
4. **lead_custom_fields** (23 columns) - Custom field definitions
5. **lead_field_definitions** (29 columns) - Field metadata

### Relationship: Contacts → Leads

| Aspect | **contacts** Table | **leads** Table |
|--------|-------------------|-----------------|
| **Purpose** | Person/company information | Sales opportunity tracking |
| **Always Created?** | ✅ YES (every webhook) | ❌ NO (conditional) |
| **Relationship** | 1 contact record | N lead records (1:N) |
| **Deduplication** | By CRM ID, Phone, Email | By contact_id + product |
| **Columns** | 53 (basic info) | 54 (sales tracking) |
| **Foreign Key** | - | `contact_id → contacts.id` |

**Key Point:** One webhook payload creates ONE contact (always) and ZERO or ONE lead (conditional).

---

## Complete Data Flow

### Webhook to Database: Step-by-Step ASCII Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: External Webhook Source                                             │
│ (Facebook Ads, Landing Page, Zapier, Custom Integration)                    │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ POST /webhooks/{webhook_id}
                              │ Payload: { firstname, lastname, phone, email,
                              │           product, lead_status, notes, etc. }
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Cloudflare Webhook Processor (Edge Worker)                          │
│ Location: cloudflare-workers/webhook-processor/src/handlers/webhook.js      │
│                                                                              │
│ Actions:                                                                     │
│  ✓ Authenticate webhook ID + workspace_id                                   │
│  ✓ Process field mappings (payload → contact fields)                        │
│  ✓ Validate required fields (phone OR email required)                       │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Contact Deduplication & Creation/Update                             │
│ Function: createOrUpdateContactAdvanced()                                   │
│                                                                              │
│ Priority Logic:                                                              │
│  1. Check CRM ID match (if payload has crm_id) → UPDATE                     │
│  2. Check Phone match → UPDATE                                              │
│  3. Check Email match → UPDATE                                              │
│  4. No match found → CREATE NEW                                             │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4A: INSERT/UPDATE → contacts TABLE (Supabase PostgreSQL)               │
│ Table: contacts (53 columns)                                                │
│                                                                              │
│ Data Written:                                                                │
│  • id (uuid) ← Generated or existing                                        │
│  • workspace_id (text) ← From webhook config                                │
│  • firstname, lastname, email, phone ← From mapped payload                  │
│  • lead_source ← From payload or webhook name                               │
│  • notes ← From payload notes field                                         │
│  • webhook_id (uuid) ← Originating webhook ID                               │
│  • webhook_name (text) ← Webhook display name                               │
│  • created_at / updated_at ← Timestamp                                      │
│  • custom_fields (jsonb) ← Any unmapped payload fields                      │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4B: Lead Logic Decision - Does payload contain lead data?              │
│ Conditions: payload has (lead_status OR product OR notes)                   │
│                                                                              │
│ YES → Continue to Step 5                                                    │
│ NO  → Skip lead creation, STOP HERE                                         │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ YES (has lead data)
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: Smart Lead Update vs Create Decision                                │
│ Function: shouldUpdateExistingLead()                                        │
│                                                                              │
│ Query: Find existing ACTIVE lead for same contact + product                 │
│  SELECT * FROM leads                                                         │
│  WHERE contact_id = {contact.id}                                            │
│    AND product_interest = {payload.product}                                 │
│    AND is_active = true                                                     │
│  ORDER BY created_at DESC                                                   │
│                                                                              │
│ Decision Logic:                                                              │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ IF existing lead found AND:                                │            │
│  │  • Payload has status update keyword                       │            │
│  │    (converted, won, lost, qualified, etc.)                 │            │
│  │  • Lead is < 30 days old                                   │            │
│  │  • Lead not already converted (is_converted = false)       │            │
│  │ THEN: UPDATE existing lead → Go to Step 6A                 │            │
│  │ ELSE: CREATE new lead → Go to Step 6B                      │            │
│  └────────────────────────────────────────────────────────────┘            │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
        UPDATE PATH                 CREATE PATH
                 │                         │
                 ↓                         ↓
┌────────────────────────────┐  ┌─────────────────────────────────────────────┐
│ STEP 6A: UPDATE            │  │ STEP 6B: INSERT → leads TABLE               │
│  existing lead             │  │ Function: createLeadForContact()            │
│                            │  │                                             │
│ Function:                  │  │ Data Written:                               │
│  updateExistingLead()      │  │  • id (uuid) ← Generated                    │
│                            │  │  • contact_id (uuid) ← From contact         │
│ UPDATE leads SET:          │  │  • workspace_id (text) ← From webhook       │
│  • stage ← mapped status   │  │  • product_interest ← payload.product       │
│  • is_converted ← bool     │  │  • lead_source ← 'webhook'                  │
│  • converted_at ← now()    │  │  • stage ← 'new' (default)                  │
│  • last_activity_at        │  │  • initial_inquiry ← payload.notes          │
│  • metadata ← webhook info │  │  • is_active ← true                         │
│  • previous_stage          │  │  • created_by ← null (system)               │
│ WHERE id = {lead_id}       │  │  • metadata ← { webhook: {...} }            │
│                            │  │  • created_at ← now()                       │
└────────────┬───────────────┘  └────────────┬────────────────────────────────┘
             │                               │
             └───────────┬───────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: INSERT → lead_activities TABLE                                      │
│ (Activity tracking for audit trail)                                         │
│                                                                              │
│ Activities Created (based on context):                                      │
│                                                                              │
│  IF UPDATE PATH:                                                            │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ 1. Status Update Activity                                   │          │
│   │    • activity_type: 'status_updated'                        │          │
│   │    • title: "Status: new → qualified"                       │          │
│   │    • metadata: { previous_stage, new_stage }                │          │
│   │                                                              │          │
│   │ 2. Appointment Activity (if appointment_date in payload)    │          │
│   │    • activity_type: 'appointment_scheduled'                 │          │
│   │    • title: "Appointment: 2025-10-20 10:00AM"               │          │
│   │                                                              │          │
│   │ 3. Conversion Activity (if status = won/converted)          │          │
│   │    • activity_type: 'lead_converted'                        │          │
│   │    • title: "🎉 Lead Converted to Won"                       │          │
│   │    • outcome: 'converted'                                   │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                              │
│  IF CREATE PATH:                                                            │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │ 1. Lead Creation Activity                                   │          │
│   │    • activity_type: 'lead_created'                          │          │
│   │    • title: "🆕 New Lead Created"                            │          │
│   │    • description: "Lead created from webhook submission"    │          │
│   │    • is_automated: true                                     │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                              │
│ All activities include:                                                     │
│  • lead_id, workspace_id, timestamp                                         │
│  • metadata: { webhook: { id, source, timestamp } }                         │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: Response & Real-Time Notification                                   │
│                                                                              │
│ Cloudflare Worker Returns:                                                  │
│  HTTP 200 OK                                                                │
│  {                                                                           │
│    "success": true,                                                         │
│    "contact_id": "uuid",                                                    │
│    "lead_id": "uuid",                                                       │
│    "message": "Contact created/updated successfully"                        │
│  }                                                                           │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 9: Express Backend Detects New Contact (Database Trigger or Poll)      │
│                                                                              │
│ Socket.IO Event Emitted:                                                    │
│  socket.emit('webhook:contact_created', {                                   │
│    workspace_id: "...",                                                     │
│    contact_id: "...",                                                       │
│    firstname: "...",                                                        │
│    lastname: "...",                                                         │
│    webhook_name: "..."                                                      │
│  })                                                                          │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ WebSocket Push
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 10: Frontend React Component Receives Event                            │
│ Component: InboundLeadManagement.js                                         │
│                                                                              │
│ socket.on('webhook:contact_created', (data) => {                            │
│   if (data.workspace_id === currentWorkspace) {                             │
│     // Show toast notification                                              │
│     toast({ title: 'New Lead Received', ... })                              │
│                                                                              │
│     // Refresh data via API                                                 │
│     fetchLeads() → GET /api/inbound-leads?workspace_id=X                    │
│   }                                                                          │
│ })                                                                           │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ API Call
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 11: Cloudflare Inbound Leads API Worker                                │
│ Location: cloudflare-workers/inbound-leads-api/                             │
│                                                                              │
│ Query:                                                                       │
│  SELECT leads.*, contacts.firstname, contacts.lastname, contacts.phone      │
│  FROM leads                                                                  │
│  JOIN contacts ON leads.contact_id = contacts.id                            │
│  WHERE leads.workspace_id = {workspace_id}                                  │
│  ORDER BY leads.created_at DESC                                             │
│  LIMIT 100                                                                  │
│                                                                              │
│ Response Time: ~600ms                                                       │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │ JSON Response
                              ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 12: Frontend UI Update                                                 │
│                                                                              │
│ ✓ New lead appears in table                                                 │
│ ✓ Metrics updated (Total Leads, New Leads, etc.)                            │
│ ✓ Toast notification displayed                                              │
│ ✓ Total Latency: < 1 second (from webhook to UI)                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Update Mechanism: WebSocket Push + API Pull (Hybrid)

**Why This Approach?**

✅ **Advantages:**
1. Real-time notifications - Users instantly know when new leads arrive
2. Fresh data - Always fetches latest data from source of truth (database)
3. No stale data - No caching issues, always current
4. Workspace isolation - Socket.IO events are workspace-scoped
5. Toast notifications - User-friendly feedback
6. No polling overhead - No unnecessary API calls
7. Edge performance - Cloudflare Worker API is fast (~600ms)

❌ **Trade-offs:**
- Two-step process: WebSocket event → API call (adds ~600ms)
- WebSocket dependency: Requires Socket.IO connection
- Not fully optimistic: Doesn't update UI before API call

**Not Used (Alternatives):**
- ❌ Polling (inefficient, delayed updates, higher server load)
- ❌ Supabase Realtime (requires subscription tier, complex auth)
- ❌ Server-Sent Events (one-way only, not supported by infrastructure)

---

## Features

- **Dashboard Metrics**: Real-time KPIs showing queue performance and conversion rates
- **Lead Table**: Sortable and filterable table of all leads in the system
- **Heat Map Visualization**: Visual representation of lead distribution by source and product
- **Search & Filter**: Advanced search and filtering capabilities

---

## Usage

The Inbound Lead Management dashboard appears automatically when the application loads. Users can:

1. View dashboard metrics at the top of the screen
2. Search and filter leads using the search bar and filter dropdown
3. Select leads by checking the checkbox next to each lead
4. View the heat map visualization by clicking the "Heat Map" button
5. Close the dashboard by clicking the X button in the top-right corner

---

## Component Structure

### File Organization

```
frontend/src/components/inbound-lead-management/
├── InboundLeadManagement.js    # Main dashboard component
├── LeadDetailSidebar.js         # Lead detail view
├── MetricsGrid.js               # KPI metrics display
├── index.js                     # Export file
├── README.md                    # This file
├── DATA-FLOW.md                 # Detailed data flow documentation
├── progress.md                  # Development progress
└── lesson_learn.md              # Lessons learned
```

### Key Components

1. **InboundLeadManagement.js** - Main dashboard
   - Real-time lead table with sorting and filtering
   - Socket.IO integration for live updates
   - Toast notifications for new leads
   - Search and filter functionality

2. **LeadDetailSidebar.js** - Detailed lead view
   - Contact information display
   - Lead activity timeline
   - Status management

3. **MetricsGrid.js** - Dashboard metrics
   - Total leads, new leads, conversion rates
   - Top sources and products
   - Real-time metric updates

### Service Integration

- **inboundLeadsService.js** - API client for Cloudflare Worker
- **socket.js** - WebSocket connection management
- **supabaseClient.js** - Database authentication (legacy, being phased out)

---

## Development Guide

### Prerequisites

- Node.js (v18 or higher)
- React 19
- Chakra UI
- Socket.IO client

### API Integration

The component integrates with the Cloudflare Inbound Leads API:

```javascript
import { getInboundLeads } from '../../services/inboundLeadsService';

// Fetch leads with filters
const data = await getInboundLeads(workspaceId, {
  limit: 100,
  offset: 0,
  status: 'all' // or 'new', 'qualified', etc.
});

// Returns: { leads: [...], metrics: {...}, total: 123 }
```

### Real-Time Updates

Socket.IO integration for live lead notifications:

```javascript
import socket from '../../socket';

useEffect(() => {
  if (!workspaceId || !socket) return;

  const handleNewWebhookContact = (data) => {
    if (data.workspace_id === workspaceId) {
      // Show notification
      toast({
        title: 'New Lead Received',
        description: `${data.firstname} ${data.lastname} from ${data.webhook_name}`,
        status: 'info',
        position: 'top-right'
      });

      // Refresh leads data
      fetchLeads();
    }
  };

  socket.on('webhook:contact_created', handleNewWebhookContact);

  return () => {
    socket.off('webhook:contact_created', handleNewWebhookContact);
  };
}, [workspaceId]);
```

### Next Steps for Enhancement

#### 1. Enhanced Lead Assignment
- Implement automatic lead routing based on source
- Add round-robin assignment logic
- Territory-based assignment rules

#### 2. Advanced Filtering
- Date range filters (created_at, last_activity_at)
- Multi-select filters (sources, products, statuses)
- Saved filter presets

#### 3. Lead Scoring Integration
- Display lead scores in table
- Visual indicators for hot/warm/cold leads
- Score-based sorting

#### 4. Activity Timeline
- Show full lead activity history in detail sidebar
- Track all interactions (calls, emails, SMS, notes)
- Display activity timeline visualization

#### 5. Bulk Operations
- Bulk assignment to users/teams
- Bulk status updates
- Bulk export to CSV

#### 6. Performance Optimizations
- Implement virtual scrolling for large datasets
- Add pagination controls
- Optimize re-renders with React.memo

---

## API Endpoints

### Cloudflare Inbound Leads API

**Base URL:** `https://inbound-leads-api.{account}.workers.dev`

#### GET `/api/inbound-leads`
Fetch leads with filters and pagination.

**Query Parameters:**
- `workspace_id` (required) - Workspace identifier
- `limit` (optional, default: 100) - Number of results
- `offset` (optional, default: 0) - Pagination offset
- `status` (optional) - Filter by lead status
- `source` (optional) - Filter by lead source
- `product` (optional) - Filter by product interest

**Response:**
```json
{
  "leads": [
    {
      "id": "uuid",
      "contact_id": "uuid",
      "workspace_id": "text",
      "product_interest": "Product A",
      "lead_source": "webhook",
      "stage": "new",
      "created_at": "2025-10-18T12:00:00Z",
      "contact": {
        "firstname": "John",
        "lastname": "Doe",
        "phone": "+1234567890",
        "email": "john@example.com"
      }
    }
  ],
  "metrics": {
    "totalLeads": 3229,
    "newLeads": 45,
    "pending": 120,
    "todayLeads": 12,
    "topProduct": "Product A",
    "topSource": "Facebook Ads",
    "conversionRate": "15.2%"
  },
  "total": 3229
}
```

#### GET `/api/inbound-leads/:id`
Get a single lead by ID.

**Response:**
```json
{
  "lead": { /* full lead object */ },
  "activities": [ /* lead activities */ ]
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Initial load displays leads correctly
- [ ] Real-time updates work when new webhook arrives
- [ ] Toast notifications appear for new leads
- [ ] Search functionality filters leads
- [ ] Status filter works correctly
- [ ] Lead detail sidebar displays full information
- [ ] Metrics update in real-time
- [ ] Workspace isolation prevents cross-workspace data leaks

### Test Webhook Payload

```bash
curl -X POST https://webhook-processor.{account}.workers.dev/webhooks/{webhook_id} \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: your-workspace-id" \
  -d '{
    "firstname": "Test",
    "lastname": "Lead",
    "phone": "+1234567890",
    "email": "test@example.com",
    "product": "Product A",
    "lead_status": "new",
    "notes": "Test lead from API"
  }'
```

---

## Troubleshooting

### Common Issues

**Issue:** Leads not appearing in dashboard
**Solution:** Check workspace_id matches, verify Socket.IO connection, check browser console for errors

**Issue:** Real-time updates not working
**Solution:** Verify Socket.IO connection in network tab, check backend logs for webhook events

**Issue:** Slow API response
**Solution:** Check Cloudflare Worker logs, verify database query performance, consider adding indexes

**Issue:** Duplicate leads appearing
**Solution:** Check deduplication logic in webhook processor, verify contact matching rules

---

## Performance Metrics

- **API Response Time:** ~600ms (Cloudflare Worker)
- **WebSocket Latency:** <100ms (Socket.IO)
- **Total Update Latency:** <1 second (webhook to UI)
- **Database Query Time:** 200-400ms (PostgreSQL with indexes)
- **Edge Locations:** 300+ worldwide (Cloudflare network)

---

## Summary

The Inbound Lead Management system is a comprehensive, real-time CRM solution that:

✅ **Processes webhooks** from multiple sources (Facebook Ads, landing pages, Zapier)
✅ **Creates/updates contacts** with smart deduplication (CRM ID > Phone > Email)
✅ **Generates leads** conditionally based on payload content
✅ **Tracks activities** for complete audit trails
✅ **Updates in real-time** via Socket.IO WebSocket push notifications
✅ **Delivers sub-second performance** with Cloudflare edge workers
✅ **Maintains workspace isolation** with Row Level Security (RLS)
✅ **Provides comprehensive metrics** for lead management insights

### Key Technical Achievements

- **Edge-First Architecture:** Sub-50ms webhook processing at 300+ global locations
- **Smart Lead Logic:** Automatic decision between creating new vs updating existing leads
- **Real-Time Notifications:** <1 second latency from webhook to UI update
- **Comprehensive Tracking:** 54-column lead schema with JSONB flexibility
- **Activity Logging:** Automated activity creation for status changes, appointments, conversions

### Database Tables

| Table | Purpose | Columns | Records |
|-------|---------|---------|---------|
| **contacts** | Person/company info | 53 | N/A |
| **leads** | Sales opportunities | 54 | 3,229+ |
| **lead_activities** | Activity tracking | 51 | N/A |
| **lead_pipeline_stages** | Custom stages | 25 | N/A |

### Data Flow Summary

```
Webhook → Cloudflare Worker → contacts table (always)
                            ↓
                      leads table (conditional)
                            ↓
                 lead_activities table (audit trail)
                            ↓
                   Socket.IO event → Frontend
                            ↓
                     Toast + Table Update
```

---

## Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

---

## Related Documentation

- [DATA-FLOW.md](./DATA-FLOW.md) - Detailed data flow documentation
- [progress.md](./progress.md) - Development progress tracking
- [lesson_learn.md](./lesson_learn.md) - Lessons learned during development
- [Cloudflare Workers Webhook Processor](../../cloudflare-workers/webhook-processor/)
- [Cloudflare Workers Inbound Leads API](../../cloudflare-workers/inbound-leads-api/)

---

**Last Updated:** 2025-10-18
**Version:** 2.0.0
**Author:** Development Team
**License:** MIT 