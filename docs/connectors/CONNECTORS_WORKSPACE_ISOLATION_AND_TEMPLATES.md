# Connectors: Workspace Isolation & SaaS Template System

## Overview

This document explains the two-tier architecture for the Connectors feature:
1. **Workspace Isolation**: User-created connectors are fully isolated per workspace
2. **SaaS Templates**: Official pre-built templates managed by the SaaS team

---

## 🔒 Workspace Isolation Architecture

### Core Principle
**Each workspace operates in complete isolation**. Workspace A cannot see, access, or modify Workspace B's connectors or credentials.

### Database-Level Security

#### Row Level Security (RLS) Policies
```sql
-- Example: Connectors table RLS
CREATE POLICY "workspace_isolation_select" ON connectors FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );
```

**What this means**:
- Users can ONLY query connectors where they are a member of that workspace
- Database enforces this at the query level
- No application-level bugs can bypass this security

#### Foreign Key Constraints
```sql
workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE
```

**Cascade Behavior**:
- If a workspace is deleted, ALL its connectors are automatically deleted
- No orphaned data
- Clean data lifecycle management

### API-Level Security

#### Authentication Flow
```javascript
// Every API request requires:
1. Valid JWT token (Supabase Auth)
2. Workspace membership verification
3. RLS policy enforcement at database level

// Example API endpoint
POST /api/v1/connectors
Headers:
  Authorization: Bearer <jwt_token>
Body:
  {
    "workspaceId": "workspace_abc123",  // Must be user's workspace
    "name": "Phone Enrichment",
    "config": { ... }
  }

// Backend validation:
async function createConnector(req) {
  const { workspaceId } = req.body;
  const userId = req.auth.userId;
  
  // Verify user is member of workspace
  const isMember = await checkWorkspaceMembership(userId, workspaceId);
  if (!isMember) {
    throw new Error('Unauthorized: Not a member of this workspace');
  }
  
  // Create connector (RLS will double-check)
  const connector = await supabase
    .from('connectors')
    .insert({ workspace_id: workspaceId, ... });
}
```

### Credential Isolation

#### Encrypted Storage
```sql
CREATE TABLE workspace_api_credentials (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,  -- Isolated per workspace
  service_name VARCHAR(100),   -- e.g., 'hubspot', 'clearbit'
  credentials JSONB NOT NULL,  -- Encrypted at application level
  CONSTRAINT workspace_api_credentials_unique UNIQUE(workspace_id, service_name)
);
```

#### Encryption Flow
```javascript
// Store credentials
async function storeCredentials(workspaceId, serviceName, credentials) {
  const encrypted = await encrypt(credentials, process.env.ENCRYPTION_KEY);
  
  await supabase
    .from('workspace_api_credentials')
    .upsert({
      workspace_id: workspaceId,
      service_name: serviceName,
      credentials: encrypted
    });
}

// Retrieve credentials (only during connector execution)
async function getCredentials(workspaceId, serviceName) {
  const { data } = await supabase
    .from('workspace_api_credentials')
    .select('credentials')
    .eq('workspace_id', workspaceId)
    .eq('service_name', serviceName)
    .single();
  
  return decrypt(data.credentials, process.env.ENCRYPTION_KEY);
}
```

**Security Features**:
- AES-256 encryption
- Credentials never logged
- Decrypted only during execution
- Stored separately from connector config

---

## 🎯 SaaS Template System

### Purpose
Allow the SaaS team to create pre-built, tested connector templates that users can install with their own credentials.

### Template Types

#### 1. Official Templates (SaaS Team)
```sql
INSERT INTO connector_templates (
  name,
  description,
  icon,
  category,
  config,
  is_official,  -- TRUE
  is_featured,  -- TRUE (if featured)
  is_public,    -- TRUE
  published_by
) VALUES (
  'Phone Number Enrichment (AudienceAcuity)',
  'Enrich phone numbers with identity and demographic data',
  '📞',
  'enrichment',
  '{
    "type": "single-step",
    "steps": [{
      "method": "GET",
      "url": "https://api.audienceacuity.com/v2/identities/byPhone",
      "auth": {
        "type": "bearer",
        "token": "{{workspace.audienceacuity_token}}"  -- Placeholder
      },
      "queryParams": [{
        "key": "phone",
        "value": "{{input.phoneNumber}}",
        "type": "user_input"
      }]
    }],
    "fieldMappings": {
      "first_name": "{{step_1.identity.firstName}}",
      "last_name": "{{step_1.identity.lastName}}",
      "address": "{{step_1.identity.address}}"
    }
  }',
  true,  -- is_official
  true,  -- is_featured
  true,  -- is_public
  '<saas_admin_user_id>'
);
```

#### 2. Community Templates (Users)
```sql
-- User publishes their connector as a template
INSERT INTO connector_templates (
  name,
  description,
  config,
  is_official,  -- FALSE
  is_public,    -- TRUE (if they choose to share)
  published_by
) VALUES (
  'Custom Industry API',
  'My custom connector for industry-specific data',
  '{ ... }',
  false,  -- Not official
  true,   -- Public
  '<user_id>'
);
```

### SaaS Admin Management

#### Admin Roles Table
```sql
CREATE TABLE saas_admin_users (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  role VARCHAR(50) CHECK (role IN ('developer', 'admin', 'owner')),
  permissions JSONB DEFAULT '{
    "can_create_templates": true,
    "can_feature_templates": true,
    "can_moderate": true,
    "can_delete_templates": true
  }'
);
```

#### Role Permissions

| Role | Create Official Templates | Feature Templates | Moderate Community | Delete Any Template |
|------|--------------------------|-------------------|-------------------|---------------------|
| Developer | ✅ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Owner | ✅ | ✅ | ✅ | ✅ |

#### Adding SaaS Admins
```sql
-- Grant admin access to a user
INSERT INTO saas_admin_users (user_id, role)
VALUES ('<user_uuid>', 'admin');

-- Now this user can create official templates
```

### Template Installation Flow

#### Step 1: User Browses Marketplace
```javascript
// GET /api/v1/connector-templates
{
  "templates": [
    {
      "id": "template_001",
      "name": "Phone Number Enrichment",
      "description": "Enrich phone numbers with identity data",
      "icon": "📞",
      "category": "enrichment",
      "is_official": true,  // ← Created by SaaS team
      "is_featured": true,
      "install_count": 1247,
      "rating": 4.8,
      "requires_credentials": ["audienceacuity_api_key"]  // ← User needs this
    },
    {
      "id": "template_002",
      "name": "Company Data (Clearbit)",
      "description": "Get company details from Clearbit API",
      "icon": "🏢",
      "category": "enrichment",
      "is_official": true,
      "is_featured": true,
      "install_count": 892,
      "rating": 4.6,
      "requires_credentials": ["clearbit_api_key"]
    }
  ]
}
```

#### Step 2: User Views Template Details
```javascript
// GET /api/v1/connector-templates/template_001
{
  "id": "template_001",
  "name": "Phone Number Enrichment",
  "description": "Enrich phone numbers with identity and demographic data using AudienceAcuity API",
  "icon": "📞",
  "category": "enrichment",
  "is_official": true,
  
  // Configuration preview (credentials redacted)
  "config": {
    "type": "single-step",
    "steps": [{
      "method": "GET",
      "url": "https://api.audienceacuity.com/v2/identities/byPhone",
      "auth": {
        "type": "bearer",
        "token": "{{workspace.audienceacuity_token}}"  // Placeholder
      }
    }]
  },
  
  // What user needs to provide
  "required_credentials": [
    {
      "key": "audienceacuity_api_key",
      "label": "AudienceAcuity API Key",
      "description": "Get your API key from audienceacuity.com/settings",
      "type": "api_key",
      "help_url": "https://docs.audienceacuity.com/authentication"
    }
  ],
  
  // Example output
  "sample_output": {
    "first_name": "John",
    "last_name": "Doe",
    "address": "123 Main St, San Francisco, CA"
  }
}
```

#### Step 3: User Installs Template
```javascript
// POST /api/v1/connector-templates/template_001/install
{
  "workspaceId": "workspace_abc123",
  "connectorName": "Phone Enrichment",  // Optional: customize name
  "credentials": {
    "audienceacuity_api_key": "ak_live_1234567890abcdef"  // User's key
  }
}

// Backend process:
async function installTemplate(templateId, workspaceId, credentials) {
  // 1. Load template
  const template = await getTemplate(templateId);
  
  // 2. Store user's credentials (encrypted)
  await storeCredentials(
    workspaceId,
    'audienceacuity',
    { api_key: credentials.audienceacuity_api_key }
  );
  
  // 3. Create connector in user's workspace
  const connector = await supabase
    .from('connectors')
    .insert({
      workspace_id: workspaceId,
      name: template.name,
      description: template.description,
      icon: template.icon,
      category: template.category,
      config: template.config,  // Copy template config
      input_schema: template.input_schema,
      field_mappings: template.field_mappings,
      created_from_template: templateId,
      created_by: userId
    });
  
  // 4. Update template install count
  await supabase
    .from('connector_templates')
    .update({ install_count: template.install_count + 1 })
    .eq('id', templateId);
  
  return connector;
}

// Response:
{
  "success": true,
  "connector": {
    "id": "connector_xyz789",
    "workspace_id": "workspace_abc123",  // ← Isolated to user's workspace
    "name": "Phone Enrichment",
    "enabled": true,
    "created_from_template": "template_001"
  }
}
```

#### Step 4: User Uses Connector in Flow Builder
```javascript
// The installed connector now appears in user's connector list
// GET /api/v1/connectors?workspaceId=workspace_abc123
{
  "connectors": [
    {
      "id": "connector_xyz789",
      "name": "Phone Enrichment",
      "icon": "📞",
      "category": "enrichment",
      "enabled": true,
      "total_executions": 0,
      "created_from_template": "template_001"  // Shows it's from a template
    }
  ]
}

// User adds it to a flow
// The connector uses THEIR credentials (not the template's)
```

### Template Update Strategy

#### When SaaS Team Updates a Template
```javascript
// Option 1: Notify users of update
async function notifyTemplateUpdate(templateId) {
  // Find all connectors created from this template
  const connectors = await supabase
    .from('connectors')
    .select('id, workspace_id, name')
    .eq('created_from_template', templateId);
  
  // Notify workspace owners
  for (const connector of connectors) {
    await sendNotification(connector.workspace_id, {
      type: 'template_update',
      message: `Template "${connector.name}" has been updated. Review changes?`,
      action_url: `/connectors/${connector.id}/update-from-template`
    });
  }
}

// Option 2: Auto-update (with user consent)
async function updateConnectorFromTemplate(connectorId) {
  const connector = await getConnector(connectorId);
  const template = await getTemplate(connector.created_from_template);
  
  // Update config while preserving user's credentials
  await supabase
    .from('connectors')
    .update({
      config: template.config,
      field_mappings: template.field_mappings,
      updated_at: new Date()
    })
    .eq('id', connectorId);
}
```

---

## API Endpoints Summary

### User Endpoints (Workspace-Scoped)
```javascript
// Connectors (workspace-isolated)
GET    /api/v1/connectors?workspaceId=xxx          // List workspace connectors
POST   /api/v1/connectors                          // Create connector
GET    /api/v1/connectors/:id                      // Get connector details
PUT    /api/v1/connectors/:id                      // Update connector
DELETE /api/v1/connectors/:id                      // Delete connector
POST   /api/v1/connectors/:id/test                 // Test connector
POST   /api/v1/connectors/:id/execute              // Execute connector (triggers Trigger.dev)

// Templates (public access)
GET    /api/v1/connector-templates                 // Browse marketplace
GET    /api/v1/connector-templates/:id             // View template details
POST   /api/v1/connector-templates/:id/install     // Install to workspace
POST   /api/v1/connector-templates/:id/rate        // Rate template

// Credentials (workspace-isolated)
POST   /api/v1/workspace/credentials                // Store credentials
GET    /api/v1/workspace/credentials                // List stored credentials
DELETE /api/v1/workspace/credentials/:service       // Delete credentials
```

### SaaS Admin Endpoints (Admin-Only)
```javascript
// Template management
POST   /api/v1/admin/connector-templates           // Create official template
PUT    /api/v1/admin/connector-templates/:id       // Update official template
DELETE /api/v1/admin/connector-templates/:id       // Delete official template
PATCH  /api/v1/admin/connector-templates/:id/feature  // Feature/unfeature
GET    /api/v1/admin/connector-templates/stats     // Template analytics

// Admin management
POST   /api/v1/admin/users                         // Grant admin access
DELETE /api/v1/admin/users/:userId                 // Revoke admin access
GET    /api/v1/admin/users                         // List admin users
```

---

## Security Checklist

### ✅ Workspace Isolation
- [x] RLS policies enforce workspace boundaries
- [x] Foreign key constraints prevent orphaned data
- [x] API endpoints verify workspace membership
- [x] Credentials stored per workspace
- [x] No cross-workspace data leakage possible

### ✅ Credential Security
- [x] AES-256 encryption at rest
- [x] Decrypted only during execution
- [x] Never logged or exposed in API responses
- [x] Stored separately from connector config
- [x] Workspace-scoped access only

### ✅ Template Security
- [x] Templates contain NO credentials
- [x] Users provide their own API keys
- [x] Official templates verified by SaaS team
- [x] Community templates clearly marked
- [x] Template installation creates isolated connector

### ✅ Admin Security
- [x] Admin access explicitly granted
- [x] Role-based permissions
- [x] Audit trail for template changes
- [x] Only admins can create official templates
- [x] Regular users can't impersonate admins

---

## Testing Strategy

### Workspace Isolation Tests
```javascript
describe('Workspace Isolation', () => {
  it('should not allow Workspace A to see Workspace B connectors', async () => {
    // Create connector in Workspace A
    const connectorA = await createConnector(workspaceA.id, { name: 'Test A' });
    
    // Try to access from Workspace B (should fail)
    const result = await getConnector(connectorA.id, workspaceB.id);
    expect(result).toBeNull();
  });
  
  it('should cascade delete connectors when workspace is deleted', async () => {
    const connector = await createConnector(workspaceA.id, { name: 'Test' });
    await deleteWorkspace(workspaceA.id);
    
    const result = await getConnector(connector.id);
    expect(result).toBeNull();
  });
});
```

### Template Installation Tests
```javascript
describe('Template Installation', () => {
  it('should install template with user credentials', async () => {
    const template = await createOfficialTemplate({
      name: 'Test Template',
      requires_credentials: ['api_key']
    });
    
    const connector = await installTemplate(template.id, workspaceA.id, {
      api_key: 'user_key_123'
    });
    
    expect(connector.workspace_id).toBe(workspaceA.id);
    expect(connector.created_from_template).toBe(template.id);
    
    // Verify credentials stored separately
    const creds = await getCredentials(workspaceA.id, 'test_service');
    expect(creds.api_key).toBe('user_key_123');
  });
});
```

---

## Conclusion

This two-tier architecture provides:
1. **Complete workspace isolation** for security and privacy
2. **Scalable template system** for SaaS team to provide value
3. **User flexibility** to create custom connectors or use templates
4. **Clear separation** between configuration (templates) and credentials (user-owned)

Users get the best of both worlds:
- **Quick start** with official templates
- **Full control** over their own connectors and credentials
- **Complete isolation** from other workspaces

