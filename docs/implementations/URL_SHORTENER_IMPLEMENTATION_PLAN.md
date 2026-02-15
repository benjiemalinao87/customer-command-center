# URL Shortener Implementation Plan (Updated)

## Overview

This plan outlines the implementation of a URL shortener service that:
- Accepts long URLs with query parameters (e.g., `https://long_url.com/schedule-a-call?name=benjiemalinao&email=email@gmail.com&phone=04623232`)
- **SECURELY stores PII (Personally Identifiable Information)** - names, emails, phone numbers are stored in the database, NOT exposed in URLs
- Generates unique short links per contact with **dynamic per-workspace domains** (e.g., `https://s.bath.com/abc123` for bath.com workspace, `https://s.windows-renovation.com/abc123` for windows-renovation.com workspace)
- Domain configuration stored in `workspace_custom_fields` table (field name: `short_link_domain`)
- Stores short links as custom fields on contacts using the existing `custom_fields` and `contact_custom_fields` tables
- Integrates as a native "Link Shortener" action in the Flow Builder
- Tracks click analytics (count, timestamps, IP, referrer)
- Workspace-scoped for security
- Links never expire

**Key Feature: Dynamic Domain Support**
- Each workspace can configure their own short link domain via `workspace_custom_fields`
- Field name: `short_link_domain` (workspace-scoped custom field)
- Example: bath.com workspace → `s.bath.com`, windows-renovation.com → `s.windows-renovation.com`
- Default fallback: `s.customerconnects.app` if not configured

**Key Feature: PII Protection**
- **Problem**: Exposing PII (names, emails, phone numbers) in URL query parameters is a privacy/security risk
- **Solution**: Store PII data securely in database, use intermediate redirect page that auto-submits form via POST
- **Flow**: Short link → Intermediate page → Auto-submit POST form to scheduler with PII data
- **Alternative**: Use encrypted/signed tokens that scheduler can exchange for data via API

## Database Schema

### 1. `shortened_links` Table

Stores metadata about shortened links in Supabase (for querying, analytics, and custom field mapping).

**Important Notes Based on Actual Schema:**
- `workspace_id` is **TEXT** (not UUID) - matches existing `contacts` and `custom_fields` tables
- `contact_id` is **UUID** - references `contacts(id)`
- Follows existing table patterns from the codebase

```sql
CREATE TABLE IF NOT EXISTS shortened_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Link identifiers
    short_code VARCHAR(10) NOT NULL,  -- e.g., "abc123"
    short_url TEXT NOT NULL,           -- Full short URL: https://s.bath.com/abc123 (dynamic per workspace)
    short_domain TEXT,                 -- Domain used for this link (from workspace_custom_fields.short_link_domain)
    original_url TEXT NOT NULL,        -- Base URL without PII (e.g., https://scheduler.com/book)
    
    -- PII Data (stored securely, NOT in URL)
    contact_data JSONB,                -- Encrypted/stored contact data: {name, email, phone, address, etc.}
    use_secure_redirect BOOLEAN DEFAULT true,  -- If true, use intermediate page to avoid PII in URL
    
    -- Link metadata
    link_name VARCHAR(255),            -- Optional name for the link
    description TEXT,                  -- Optional description
    
    -- Analytics
    click_count INTEGER DEFAULT 0,
    last_clicked_at TIMESTAMPTZ,
    first_clicked_at TIMESTAMPTZ,
    
    -- Custom field mapping
    custom_field_name VARCHAR(100),    -- Name of custom field to store link in (references custom_fields.name)
    custom_field_id UUID,              -- References custom_fields.id for faster lookups
    
    -- Metadata
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_short_code_per_workspace UNIQUE(workspace_id, short_code),
    CONSTRAINT unique_contact_link UNIQUE(workspace_id, contact_id, custom_field_name),
    CONSTRAINT fk_custom_field FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_shortened_links_workspace ON shortened_links(workspace_id);
CREATE INDEX idx_shortened_links_contact ON shortened_links(contact_id);
CREATE INDEX idx_shortened_links_short_code ON shortened_links(short_code);
CREATE INDEX idx_shortened_links_workspace_code ON shortened_links(workspace_id, short_code);
CREATE INDEX idx_shortened_links_custom_field ON shortened_links(custom_field_id);
```

### 2. `short_link_clicks` Table

Stores individual click analytics for each shortened link.

```sql
CREATE TABLE IF NOT EXISTS short_link_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortened_link_id UUID NOT NULL REFERENCES shortened_links(id) ON DELETE CASCADE,
    workspace_id TEXT NOT NULL,
    
    -- Click data
    clicked_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,
    country_code VARCHAR(2),
    city TEXT,
    
    -- Device info (extracted from user_agent)
    device_type VARCHAR(50),  -- mobile, desktop, tablet
    browser VARCHAR(100),
    os VARCHAR(100),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_short_link_clicks_link_id ON short_link_clicks(shortened_link_id);
CREATE INDEX idx_short_link_clicks_workspace ON short_link_clicks(workspace_id);
CREATE INDEX idx_short_link_clicks_clicked_at ON short_link_clicks(clicked_at);
```

### 3. Custom Field Integration

The system will automatically create/update a custom field to store the short link value using the existing `custom_fields` and `contact_custom_fields` tables.

**Custom Field Structure:**

**Table: `custom_fields` (field definition)**
- `id`: UUID (primary key)
- `workspace_id`: TEXT (matches contact workspace)
- `name`: VARCHAR (e.g., "short_link" - configurable, default: "short_link")
- `label`: VARCHAR (e.g., "Short Link")
- `field_type`: VARCHAR = "text"
- `object_type`: VARCHAR = "contact"
- `is_active`: BOOLEAN = true
- `display_order`: INTEGER
- Unique constraint: `(workspace_id, name, object_type)`

**Table: `contact_custom_fields` (actual value)**
- `id`: UUID (primary key)
- `contact_id`: UUID (references contacts.id)
- `field_id`: UUID (references custom_fields.id)
- `value`: JSONB containing the short URL string (e.g., `"https://short-domain.com/abc123"`)
- `created_at`: TIMESTAMPTZ
- `updated_at`: TIMESTAMPTZ
- `created_by`: UUID
- `updated_by`: UUID

**Note:** The `contacts` table also has a `custom_fields` JSONB column, but we'll use the structured `contact_custom_fields` table for better integration with the existing custom fields system and proper field definitions.

### 4. Dynamic Domain Configuration

**Workspace Custom Field: `short_link_domain`**
- **Table:** `workspace_custom_fields` (workspace-scoped)
- **Field Definition:** `custom_fields` table with:
  - `name`: `short_link_domain`
  - `object_type`: `workspace`
  - `field_type`: `text`
- **Value Storage:** `workspace_custom_fields.value` (JSONB) - e.g., `"s.bath.com"` or `"s.windows-renovation.com"`
- **Default:** If not set, defaults to `s.customerconnects.app`

**How It Works:**
1. When creating a short link, query `workspace_custom_fields` for `short_link_domain`
2. Use that domain to construct the short URL: `https://{domain}/{code}`
3. Store the domain in `shortened_links.short_domain` for reference
4. When redirecting, use the stored domain or look it up from the database

## Cloudflare Workers Setup

### 1. KV Namespace Configuration

Create two KV namespaces:
- `SHORT_LINKS` - Production namespace for storing short code → original URL mappings
- `SHORT_LINKS_PREVIEW` - Preview namespace for development

**Wrangler Commands:**
```bash
wrangler kv:namespace create "SHORT_LINKS"
wrangler kv:namespace create "SHORT_LINKS" --preview
```

**KV Data Structure:**
```
Key: {workspace_id}:{short_code}
Value: {
  "original_url": "https://long_url.com/schedule-a-call?name=...",
  "contact_id": "uuid",
  "created_at": "2025-01-30T...",
  "workspace_id": "workspace_id"
}
```

### 2. Worker Structure

**Location:** `cloudflare-workers/url-shortener/`

**File Structure:**
```
cloudflare-workers/url-shortener/
├── src/
│   ├── index.js                    # Main worker entry point
│   ├── handlers/
│   │   ├── createShortLink.js      # Create short link (POST /api/shorten)
│   │   ├── redirectLink.js         # Redirect short link (GET /:code)
│   │   └── getAnalytics.js         # Get analytics (GET /api/analytics/:code)
│   ├── services/
│   │   ├── linkService.js          # Link generation and validation
│   │   ├── analyticsService.js    # Analytics tracking
│   │   └── supabaseService.js     # Supabase integration
│   └── utils/
│       ├── codeGenerator.js        # Generate unique short codes
│       ├── urlValidator.js         # Validate URLs
│       └── cors.js                 # CORS handling
├── wrangler.toml
└── package.json
```

### 3. Worker Routes

**Production Route:**
- Pattern: `short.yourdomain.com/*`
- Zone: `yourdomain.com`

**Development Route:**
- Pattern: `url-shortener-dev.workers.dev/*`

## Data Flow Diagrams

### Flow 1: Creating a Short Link (Flow Builder Action)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FLOW BUILDER UI                              │
│  User adds "Link Shortener" action to flow                          │
│  Configures:                                                         │
│    - Original URL (with {{variables}})                              │
│    - Custom field name (where to store link)                        │
│    - Link name (optional)                                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ User saves flow
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FLOW EXECUTION (Trigger.dev)                     │
│  executeWorkflowStep() encounters "link-shortener" action            │
│  Interpolates variables in original URL:                            │
│    {{contact.first_name}} → "benjiemalinao"                         │
│    {{contact.email}} → "email@gmail.com"                            │
│    {{contact.phone}} → "04623232"                                   │
│  Final URL: https://long_url.com/schedule-a-call?name=benjiemalinao  │
│            &email=email@gmail.com&phone=04623232                     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ POST /api/shorten
                               │ {
                               │   workspaceId, contactId,
                               │   originalUrl, customFieldName
                               │ }
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER (url-shortener)                      │
│  1. Validate URL and parameters                                      │
│  2. Get workspace short link domain from workspace_custom_fields     │
│     (field: short_link_domain, default: s.customerconnects.app)     │
│  3. Generate unique short code (6-8 chars)                           │
│  4. Check KV for code collision (retry if exists)                    │
│  5. Construct short URL: https://{domain}/{code}                      │
│  6. Store in KV: {workspace_id}:{code} → {original_url, ...}       │
│  7. Insert into Supabase shortened_links table (with short_domain)  │
│  8. Create/update custom field definition in custom_fields          │
│  9. Create/update contact_custom_fields value                       │
│ 10. Return short URL                                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Response: { shortUrl, shortCode }
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                                 │
│  ┌──────────────────────┐      ┌──────────────────────┐            │
│  │ shortened_links       │      │ contact_custom_fields │            │
│  │ - id (UUID)          │      │ - id (UUID)          │            │
│  │ - workspace_id (TEXT)│      │ - contact_id (UUID) │            │
│  │ - contact_id (UUID)   │      │ - field_id (UUID)    │            │
│  │ - short_code: "abc123"│      │ - value (JSONB):     │            │
│  │ - original_url        │      │   "https://short-   │            │
│  │ - custom_field_name   │      │   domain.com/abc123" │            │
│  │ - custom_field_id     │      │ - created_at         │            │
│  └──────────────────────┘      │ - updated_at         │            │
│                                 └──────────────────────┘            │
│                                                                      │
│  ┌──────────────────────┐                                           │
│  │ custom_fields        │                                           │
│  │ - id (UUID)          │                                           │
│  │ - workspace_id (TEXT)│                                           │
│  │ - name: "short_link" │                                           │
│  │ - label: "Short Link"│                                           │
│  │ - field_type: "text" │                                           │
│  │ - object_type: "contact"                                        │
│  │ - is_active: true    │                                           │
│  │ - Unique: (workspace_id, name, object_type)                     │
│  └──────────────────────┘                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Flow 2: Redirecting a Short Link (User Clicks) - PII Protected

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                                │
│  User clicks: https://s.bath.com/abc123                              │
│  (NO PII in URL - just the short code)                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ GET /abc123
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER (url-shortener)                      │
│  1. Extract short code from path: "abc123"                           │
│  2. Determine workspace from hostname (s.bath.com → bath.com workspace)│
│  3. Lookup in KV: {workspace_id}:abc123                              │
│     - If not found, query Supabase by code + workspace_id            │
│     - If still not found, return 404                                 │
│  4. Get link data: original_url (base), contact_data (PII)          │
│  5. Track analytics (async):                                         │
│     - Insert into short_link_clicks table                            │
│     - Update click_count in shortened_links                          │
│  6. Return HTML page that auto-submits form with PII via POST        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ HTML Response (200 OK)
                               │ Contains auto-submit form
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    INTERMEDIATE PAGE (Auto-Submit)                   │
│  <html>                                                              │
│    <body onload="document.forms[0].submit()">                       │
│      <form method="POST" action="https://scheduler.com/book">       │
│        <input type="hidden" name="name" value="John Doe">           │
│        <input type="hidden" name="email" value="john@example.com"> │
│        <input type="hidden" name="phone" value="1234567890">        │
│      </form>                                                         │
│    </body>                                                           │
│  </html>                                                             │
│  (PII sent via POST, not visible in URL)                            │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               │ Auto-submit POST (JavaScript)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    ORIGINAL URL (Scheduler)                         │
│  POST https://scheduler.com/book                                     │
│  Body: name=John+Doe&email=john@example.com&phone=1234567890        │
│  Form auto-populates with PII data (sent securely via POST)         │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Database Setup

1. **Create Migration File**
   - Location: `supabase/migrations/YYYYMMDD_create_url_shortener_tables.sql`
   - Create `shortened_links` table
   - Create `short_link_clicks` table
   - Add indexes
   - Add RLS policies (workspace-scoped access)
   - Create helper functions for custom field management

2. **Create Custom Field Helper Functions**
   - Function to auto-create custom field if it doesn't exist
   - Function to get or create custom field by name
   - Function to update contact_custom_fields value
   - Location: `supabase/migrations/YYYYMMDD_url_shortener_helpers.sql`

### Phase 2: Cloudflare Worker Setup

1. **Initialize Worker Project**
   - Create `cloudflare-workers/url-shortener/` directory
   - Set up `wrangler.toml` with KV namespace bindings
   - Configure routes for production and development
   - Set up environment variables/secrets

2. **Implement Core Services**
   - `codeGenerator.js`: Generate unique 6-8 character codes
   - `linkService.js`: Create, retrieve, validate links
   - `analyticsService.js`: Track clicks, update statistics
   - `supabaseService.js`: Database operations (create links, update custom fields)

3. **Implement Handlers**
   - `createShortLink.js`: POST endpoint for creating links
   - `redirectLink.js`: GET endpoint for redirecting
   - `getAnalytics.js`: GET endpoint for analytics data

4. **Deploy Worker**
   - Deploy to Cloudflare Workers
   - Configure custom domain (e.g., `short.yourdomain.com`)
   - Set up environment variables/secrets

### Phase 3: Backend Integration

1. **Create Trigger.dev Task**
   - Location: `trigger/unifiedWorkflows.js`
   - Add `link-shortener` case in `executeWorkflowStep()`
   - Interpolate variables in original URL using existing variable system
   - Call Cloudflare Worker API to create short link
   - Handle response and error cases
   - Update custom field using existing customFieldService

2. **Create Backend API Route (Optional)**
   - Location: `backend/src/routes/shortLinksRoutes.js`
   - Endpoints for admin operations:
     - GET `/api/short-links` - List links for workspace
     - GET `/api/short-links/:id/analytics` - Get analytics
     - DELETE `/api/short-links/:id` - Delete link

### Phase 4: Frontend Integration

1. **Create Action Component**
   - Location: `frontend/src/components/flow-builder/actions/components/LinkShortenerAction.js`
   - Form fields:
     - Original URL input (with variable suggestions using existing variable picker)
     - Custom field name input (with validation)
     - Link name input (optional)
   - Validation and preview
   - Follow existing action component patterns

2. **Register Action in Flow Builder**
   - Update `ActionConfigurationModal.js` to include `link_shortener`
   - Add to `ACTION_COMPONENTS` mapping
   - Add icon and description
   - Follow existing action registration patterns

3. **Update Action Sidebar**
   - Add "Link Shortener" to Integrations section
   - Location: `frontend/src/components/flow-builder/actions/ActionSidebar.js`
   - Use existing icon system

4. **Create Custom Field Display Component (Optional)**
   - Display short link in contact view
   - Show click count and analytics
   - Make link clickable
   - Integrate with existing CustomFieldsDisplay component

### Phase 5: Testing & Documentation

1. **Unit Tests**
   - Test code generation (uniqueness, collision handling)
   - Test URL validation
   - Test variable interpolation
   - Test custom field creation/update

2. **Integration Tests**
   - Test full flow: Create link → Store in KV → Store in DB → Update custom field
   - Test redirect flow: Click link → Track analytics → Redirect
   - Test workspace isolation
   - Test custom field integration

3. **Documentation**
   - Create `README_URL_SHORTENER.md` in `cloudflare-workers/url-shortener/`
   - Update main README with link shortener feature
   - Document API endpoints
   - Document custom field integration
   - Document variable interpolation

## Technical Details

### Short Code Generation

**Algorithm:**
- Generate random 6-8 character alphanumeric string
- Use base62 encoding (0-9, a-z, A-Z) for URL-safe characters
- Check KV for collision before accepting
- Retry up to 5 times if collision occurs
- Ensure uniqueness per workspace

**Example Codes:**
- `abc123`
- `xY9zK2`
- `mN7pQr`

### URL Variable Interpolation & PII Handling

**Supported Variables (based on existing system):**
- `{{contact.first_name}}` - Contact's first name
- `{{contact.last_name}}` - Contact's last name
- `{{contact.email}}` - Contact's email
- `{{contact.phone}}` - Contact's phone
- `{{contact.custom_fields.field_name}}` - Custom field values
- `{{workspace.custom_fields.field_name}}` - Workspace custom fields

**PII Protection Approach:**

**Option 1: Auto-Submit Form (Recommended)**
- Store PII in `shortened_links.contact_data` JSONB field
- Short link redirects to intermediate HTML page
- Page auto-submits POST form with PII data
- PII never appears in URL or browser history

**Option 2: Encrypted Token (Alternative)**
- Generate encrypted token containing PII
- Short link redirects with token: `https://scheduler.com/book?token=encrypted_data`
- Scheduler exchanges token via API to get PII
- More complex but allows GET-based redirects

**Example (Option 1 - Auto-Submit):**
```
Input URL: https://scheduler.com/book?name={{contact.first_name}}&email={{contact.email}}&phone={{contact.phone}}

Process:
1. Extract base URL: https://scheduler.com/book
2. Extract PII: {name: "John", email: "john@example.com", phone: "1234567890"}
3. Store in database: 
   - original_url: "https://scheduler.com/book"
   - contact_data: {"name": "John", "email": "john@example.com", "phone": "1234567890"}
4. Generate short link: https://s.bath.com/abc123

When clicked:
- Redirects to intermediate page
- Auto-submits POST form with PII
- Scheduler receives data via POST (not in URL)
```

### Custom Field Integration Details

**Creating Custom Field:**
1. Check if custom field exists: `SELECT * FROM custom_fields WHERE workspace_id = ? AND name = ? AND object_type = 'contact'`
2. If not exists, create: `INSERT INTO custom_fields (workspace_id, name, label, field_type, object_type, is_active) VALUES (...)`
3. Get field_id from created or existing field

**Updating Contact Custom Field:**
1. Check if contact_custom_fields entry exists: `SELECT * FROM contact_custom_fields WHERE contact_id = ? AND field_id = ?`
2. If exists, update: `UPDATE contact_custom_fields SET value = ? WHERE contact_id = ? AND field_id = ?`
3. If not exists, insert: `INSERT INTO contact_custom_fields (contact_id, field_id, value) VALUES (...)`

### PII Protection Implementation

**How It Works:**

1. **Link Creation:**
   - Parse original URL to separate base URL from query parameters
   - Extract PII from query parameters (name, email, phone, etc.)
   - Store base URL in `original_url` field
   - Store PII in `contact_data` JSONB field
   - Set `use_secure_redirect = true`

2. **Link Redirect (Secure Mode):**
   - User clicks short link: `https://s.bath.com/abc123`
   - Worker looks up link data from database
   - Returns HTML page with auto-submit form
   - Form contains hidden inputs with PII data
   - JavaScript auto-submits form via POST to original URL
   - PII never appears in URL or browser history

3. **Intermediate Page HTML Template:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Redirecting...</title>
</head>
<body onload="document.forms[0].submit()">
  <form method="POST" action="{{original_url}}" id="redirectForm">
    {{#each contact_data}}
    <input type="hidden" name="{{@key}}" value="{{this}}">
    {{/each}}
  </form>
  <p>Redirecting...</p>
  <script>
    // Fallback if onload doesn't work
    setTimeout(() => document.getElementById('redirectForm').submit(), 100);
  </script>
</body>
</html>
```

4. **Alternative: Token-Based (If scheduler supports API):**
   - Generate encrypted token: `encrypt({contact_id, workspace_id, expires_at})`
   - Redirect to: `https://scheduler.com/book?token=abc123xyz`
   - Scheduler calls API: `GET /api/short-links/token/abc123xyz`
   - API returns PII data (authenticated)
   - Token expires after use or time limit

### Analytics Tracking

**Data Collected:**
- Click timestamp
- IP address (from Cloudflare request) - optionally anonymized
- User agent (from request headers)
- Referrer (from request headers)
- Country code (from Cloudflare `request.cf.country`)
- City (from Cloudflare `request.cf.city`)
- Device type (parsed from user_agent: mobile/desktop/tablet)
- Browser (parsed from user_agent)
- OS (parsed from user_agent)

**Privacy Considerations:**
- Option to anonymize IP addresses (last octet)
- GDPR compliance for EU users
- Data retention policies (optional cleanup)
- No PII stored in analytics - only aggregated data

## Security Considerations

1. **PII Protection (Critical)**
   - **Never expose PII in URLs** - Store in database, use POST forms
   - Encrypt sensitive data in `contact_data` JSONB field (optional but recommended)
   - Use intermediate redirect page with auto-submit form
   - PII data only accessible via authenticated API calls
   - Implement data retention policies (auto-delete old links)

2. **Workspace Isolation**
   - All queries filtered by `workspace_id`
   - KV keys prefixed with `workspace_id`
   - RLS policies enforce workspace boundaries
   - Verify workspace membership before creating links
   - Prevent cross-workspace data access

3. **URL Validation**
   - Validate URL format before shortening
   - Optional: Whitelist allowed domains
   - Block malicious URLs (phishing, malware)
   - Sanitize and validate all input data

4. **Rate Limiting**
   - Limit link creation per workspace (e.g., 1000/day)
   - Limit redirect requests per IP (e.g., 100/minute)
   - Prevent abuse and DDoS
   - Monitor for suspicious patterns

5. **Access Control**
   - Only workspace members can create links
   - Only workspace members can view analytics
   - Public redirects are allowed (for sharing)
   - Use existing workspace_members table for authorization
   - Implement token expiration for sensitive links (optional)

6. **Data Privacy Compliance**
   - GDPR compliance: Right to deletion (delete links on request)
   - CCPA compliance: Data access and deletion
   - Audit logging for PII access
   - Secure data transmission (HTTPS only)

## Performance Considerations

1. **KV Caching**
   - Primary storage in Cloudflare KV (fast reads, <10ms)
   - Supabase for analytics and querying
   - KV TTL: Never (links don't expire)
   - Cache custom field definitions

2. **Analytics Batching**
   - Batch insert clicks for high-traffic links (optional)
   - Use Cloudflare Durable Objects for real-time stats (future enhancement)
   - Aggregate analytics queries

3. **CDN Caching**
   - Cache redirect responses (short TTL: 1 minute)
   - Cache analytics data (longer TTL: 5 minutes)
   - Use Cloudflare's edge caching

## Files to Create/Modify

### New Files
- `supabase/migrations/YYYYMMDD_create_url_shortener_tables.sql`
- `supabase/migrations/YYYYMMDD_url_shortener_helpers.sql`
- `cloudflare-workers/url-shortener/src/index.js`
- `cloudflare-workers/url-shortener/src/handlers/createShortLink.js`
- `cloudflare-workers/url-shortener/src/handlers/redirectLink.js`
- `cloudflare-workers/url-shortener/src/handlers/getAnalytics.js`
- `cloudflare-workers/url-shortener/src/services/linkService.js`
- `cloudflare-workers/url-shortener/src/services/analyticsService.js`
- `cloudflare-workers/url-shortener/src/services/supabaseService.js`
- `cloudflare-workers/url-shortener/src/utils/codeGenerator.js`
- `cloudflare-workers/url-shortener/src/utils/urlValidator.js`
- `cloudflare-workers/url-shortener/src/utils/cors.js`
- `cloudflare-workers/url-shortener/wrangler.toml`
- `cloudflare-workers/url-shortener/package.json`
- `cloudflare-workers/url-shortener/README_URL_SHORTENER.md`
- `frontend/src/components/flow-builder/actions/components/LinkShortenerAction.js`
- `backend/src/routes/shortLinksRoutes.js` (optional)

### Modified Files
- `trigger/unifiedWorkflows.js` - Add link-shortener action handler
- `frontend/src/components/flow-builder/actions/ActionConfigurationModal.js` - Register action
- `frontend/src/components/flow-builder/actions/ActionSidebar.js` - Add to sidebar
- `backend/src/services/customFieldService.js` - Helper for auto-creating fields (if needed)

## Environment Variables

### Cloudflare Worker Secrets
- `SUPABASE_URL` - Supabase project URL (https://ycwttshvizkotcwwyjpt.supabase.co)
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `SHORT_DOMAIN` - Short domain (e.g., `short.yourdomain.com`)

### Backend Environment Variables
- `SHORT_LINK_WORKER_URL` - Cloudflare Worker URL for creating links

## Testing Checklist

- [ ] Create short link via Flow Builder action
- [ ] Verify link stored in KV with correct workspace prefix
- [ ] Verify link stored in Supabase `shortened_links` table
- [ ] Verify custom field definition created in `custom_fields` table
- [ ] Verify custom field value stored in `contact_custom_fields` table
- [ ] Click short link and verify redirect to original URL
- [ ] Verify analytics tracked in `short_link_clicks` table
- [ ] Verify click_count updated in `shortened_links` table
- [ ] Test workspace isolation (links from workspace A not accessible from workspace B)
- [ ] Test variable interpolation (contact.first_name, contact.email, etc.)
- [ ] Test URL validation (invalid URLs rejected)
- [ ] Test error handling (missing fields, invalid workspace, etc.)
- [ ] Test high-traffic scenarios (multiple concurrent clicks)
- [ ] Test custom field display in contact view
- [ ] Test RLS policies (users can only see their workspace links)

## Key Schema Corrections Based on Actual Database

1. **workspace_id is TEXT, not UUID** - All workspace references use TEXT type
2. **custom_fields table structure:**
   - Has `object_type` column (contact, appointment, workspace)
   - Has `is_active` column for soft deletes
   - Unique constraint: `(workspace_id, name, object_type)`
3. **contact_custom_fields table structure:**
   - Has `id` as primary key (UUID)
   - Has `created_by` and `updated_by` columns
   - Value is stored as JSONB
4. **contacts table:**
   - Has `first_name` and `last_name` (not `firstname`/`lastname`)
   - Has `custom_fields` JSONB column (legacy, but we use structured table)
   - Has `metadata` JSONB column

