# Connectors Feature - Complete Review & Finalized Implementation Plan

## Executive Summary

This document provides a comprehensive review of:
1. ✅ Current UI Components (Frontend)
2. ✅ Database Schema (Supabase)
3. ✅ Trigger.dev Setup (Async Task Engine)
4. ✅ Answers to 5 Critical Questions
5. ✅ Finalized Implementation Plan with Multi-Step Support

---

## 1. UI Components Review

### ✅ Current Status: **EXCELLENT FOUNDATION**

All 5 core UI components are already built and functional:

#### 1.1 ConnectorsDashboard.jsx
**Status**: ✅ Complete
- Clean card-based layout
- Search functionality
- CRUD operations (Edit, Delete, Test)
- Mock data with 3 sample connectors
- Usage statistics display

**Needs Enhancement**:
- [ ] Connect to real API endpoints
- [ ] Add category filters
- [ ] Add execution history viewer
- [ ] Real-time connection status indicators

#### 1.2 ConnectorBuilder/index.jsx
**Status**: ✅ Complete
- 5-step wizard with progress indicator
- State management for connector data
- Navigation between steps
- Save functionality

**Needs Enhancement**:
- [ ] Add multi-step connector type toggle
- [ ] Validate each step before proceeding
- [ ] Add draft auto-save

#### 1.3 BasicInfoStep.jsx
**Status**: ✅ Complete
- Name, description, icon, category fields
- Live preview of connector card
- Clean form layout

**No changes needed** - This step is perfect as-is!

#### 1.4 ApiConfigStep.jsx ⚠️ **CRITICAL ENHANCEMENT NEEDED**
**Status**: ✅ Single-step complete, ❌ Multi-step missing

**Current Features**:
- HTTP method selection (GET, POST, PUT, PATCH, DELETE)
- Endpoint URL configuration
- Query parameters with "User Input" vs "Static Value"
- Headers configuration
- Request body template with {{variable}} syntax
- Tabbed interface (Query Params, Headers, Body)

**Required Enhancements for Multi-Step**:
```javascript
// Add connector type selection
<FormControl>
  <FormLabel>Connector Type</FormLabel>
  <RadioGroup value={config.type} onChange={(val) => handleChange('type', val)}>
    <Stack direction="row">
      <Radio value="single-step">Single Request</Radio>
      <Radio value="multi-step">Multi-Step Requests</Radio>
    </Stack>
  </RadioGroup>
</FormControl>

// If multi-step, show step builder
{config.type === 'multi-step' && (
  <VStack spacing={4}>
    {config.steps.map((step, index) => (
      <StepCard
        key={index}
        stepNumber={index + 1}
        step={step}
        onEdit={() => openStepEditor(index)}
        onDelete={() => removeStep(index)}
        previousSteps={config.steps.slice(0, index)} // For variable reference
      />
    ))}
    <Button onClick={addStep}>+ Add Step</Button>
  </VStack>
)}
```

#### 1.5 AuthenticationStep.jsx
**Status**: ✅ Complete
- Bearer Token, API Key, Basic Auth support
- Secure password fields
- Security notice about encryption

**Needs Enhancement**:
- [ ] Add workspace credential reference ({{workspace.service_token}})
- [ ] OAuth 2.0 support (currently disabled)

#### 1.6 ResponseMappingStep.jsx ⚠️ **ENHANCEMENT NEEDED**
**Status**: ✅ Single-step complete, ❌ Multi-step testing missing

**Current Features**:
- Test request with user inputs
- JSON response viewer
- Field mapping (JSON path → Contact field)
- System fields + custom fields dropdown

**Required Enhancements for Multi-Step**:
```javascript
// Test all steps sequentially
<Button onClick={testAllSteps} isLoading={testing}>
  Run Full Test (All Steps)
</Button>

// Show step-by-step results
{testResults && testResults.map((result, index) => (
  <Accordion key={index}>
    <AccordionItem>
      <AccordionButton>
        <Box flex="1">
          Step {index + 1}: {result.stepName} 
          {result.status === 'success' ? '✓' : '✗'}
        </Box>
      </AccordionButton>
      <AccordionPanel>
        <Code>{JSON.stringify(result.response, null, 2)}</Code>
        <Text>Available variables: {Object.keys(result.output).join(', ')}</Text>
      </AccordionPanel>
    </AccordionItem>
  </Accordion>
))}

// Final mapping uses all step outputs
<Select>
  <optgroup label="Step 1 Outputs">
    <option value="step_1.contactId">Contact ID</option>
  </optgroup>
  <optgroup label="Step 2 Outputs">
    <option value="step_2.firstName">First Name</option>
    <option value="step_2.companyId">Company ID</option>
  </optgroup>
</Select>
```

#### 1.7 AdvancedSettingsStep.jsx
**Status**: ✅ Complete
- Timeout configuration (1s - 60s)
- Retry attempts (0-5)
- Continue on error toggle
- Log response data toggle

**No changes needed** - Perfect as-is!

### UI Enhancement Priority

| Component | Priority | Effort | Impact |
|-----------|----------|--------|--------|
| ApiConfigStep (Multi-step) | 🔴 HIGH | 2-3 days | Critical for feature |
| ResponseMappingStep (Multi-step test) | 🔴 HIGH | 1-2 days | Critical for feature |
| ConnectorsDashboard (API integration) | 🟡 MEDIUM | 1 day | High |
| AuthenticationStep (Workspace creds) | 🟢 LOW | 4 hours | Medium |

---

## 2. Database Schema Review

### ✅ Current Status: **NO CONNECTOR TABLES EXIST**

**Finding**: Zero connector-related tables in the database.

**Required Tables** (from implementation plan):

```sql
-- 1. connectors table
CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(100),
  
  -- Multi-step support
  type VARCHAR(20) DEFAULT 'single-step', -- 'single-step' or 'multi-step'
  
  -- Configuration
  config JSONB NOT NULL,
  input_schema JSONB,
  field_mappings JSONB,
  
  -- Settings
  enabled BOOLEAN DEFAULT true,
  timeout_ms INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 3,
  continue_on_error BOOLEAN DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Usage tracking
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  
  CONSTRAINT connectors_workspace_name_unique UNIQUE(workspace_id, name)
);

CREATE INDEX idx_connectors_workspace ON connectors(workspace_id);
CREATE INDEX idx_connectors_category ON connectors(category);
CREATE INDEX idx_connectors_enabled ON connectors(enabled);

-- 2. connector_executions table
CREATE TABLE connector_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  flow_run_id UUID,
  
  -- Execution details
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'success', 'failed', 'timeout'
  
  -- Multi-step tracking
  steps_executed JSONB, -- Array of step results
  current_step VARCHAR(50),
  
  -- Input/Output
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  error_stack TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Trigger.dev integration
  trigger_run_id VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connector_executions_connector ON connector_executions(connector_id);
CREATE INDEX idx_connector_executions_workspace ON connector_executions(workspace_id);
CREATE INDEX idx_connector_executions_contact ON connector_executions(contact_id);
CREATE INDEX idx_connector_executions_status ON connector_executions(status);
CREATE INDEX idx_connector_executions_created ON connector_executions(created_at DESC);

-- 3. connector_templates table (optional, for marketplace)
CREATE TABLE connector_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(100),
  
  config JSONB NOT NULL,
  input_schema JSONB,
  field_mappings JSONB,
  
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT connector_templates_name_unique UNIQUE(name)
);

-- 4. workspace_api_credentials table (encrypted storage)
CREATE TABLE workspace_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL, -- 'hubspot', 'salesforce', 'clearbit', etc.
  
  credentials JSONB NOT NULL, -- Encrypted
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  CONSTRAINT workspace_api_credentials_unique UNIQUE(workspace_id, service_name)
);

CREATE INDEX idx_workspace_api_credentials_workspace ON workspace_api_credentials(workspace_id);

-- 5. Helper function for updating connector stats
CREATE OR REPLACE FUNCTION increment_connector_stats(
  p_connector_id UUID,
  p_success BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE connectors
  SET 
    total_executions = total_executions + 1,
    successful_executions = CASE WHEN p_success THEN successful_executions + 1 ELSE successful_executions END,
    failed_executions = CASE WHEN NOT p_success THEN failed_executions + 1 ELSE failed_executions END,
    last_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_connector_id;
END;
$$ LANGUAGE plpgsql;
```

### Database Implementation Priority

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Create connectors table | 🔴 HIGH | 1 hour | None |
| Create connector_executions table | 🔴 HIGH | 1 hour | connectors table |
| Create workspace_api_credentials | 🟡 MEDIUM | 1 hour | None |
| Create connector_templates | 🟢 LOW | 1 hour | None (future) |
| Add RLS policies | 🔴 HIGH | 2 hours | All tables |
| Create helper functions | 🟡 MEDIUM | 1 hour | connectors table |

---

## 3. Trigger.dev Setup Review

### ✅ Current Status: **FULLY CONFIGURED & OPERATIONAL**

**Project Details**:
- **Project ID**: `proj_dcpsazbkeyuadjmckuib`
- **Project Name**: Customer Connect
- **Status**: ACTIVE_HEALTHY
- **Runtime**: Node.js
- **Max Duration**: 3600 seconds (1 hour)
- **Retry Config**: 3 attempts with exponential backoff
- **Task Directory**: `trigger/` (root level)

**Existing Tasks** (in `trigger/` directory):
1. ✅ `actionTasks.js` - Flow Builder action processors
2. ✅ `messageJobs.js` - Message queue processing
3. ✅ `scheduleTasks.js` - Scheduled task execution
4. ✅ `trigger-event-processor.js` - Event processing
5. ✅ `unifiedContactTasks.js` - Contact operations
6. ✅ `unifiedDelayTasks.js` - Delay/wait operations
7. ✅ `unifiedWorkflows.js` - Workflow orchestration
8. ✅ `waitService.js` - Wait/pause service

**Environment Variables** (from TRIGGER_SETUP.md):
```bash
TRIGGER_API_KEY=your_trigger_api_key_here
TRIGGER_PROJECT_ID=proj_dcpsazbkeyuadjmckuib
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
```

### New Task to Add: Connector Execution

**File**: `trigger/connectorExecutionTask.js`

**Integration Points**:
1. ✅ Supabase client already configured
2. ✅ Retry logic already defined in `trigger.config.ts`
3. ✅ Logging infrastructure in place
4. ✅ Task registration pattern established

**No infrastructure changes needed** - Just add the new task file!

---

## 4. Answers to 5 Critical Questions

### Question 1: Should we support conditional steps?

**Answer**: ✅ **YES - Phase 2 Enhancement**

**Reasoning**:
- Many real-world APIs require conditional logic (e.g., "Only fetch company data if contact has company_id")
- Reduces unnecessary API calls and costs
- Improves performance and reliability

**Implementation**:
```javascript
{
  "id": "step_3",
  "name": "Get Company Details",
  "condition": {
    "enabled": true,
    "expression": "{{step_2.companyId}} !== null" // Simple expression evaluation
  },
  "method": "GET",
  "url": "https://api.example.com/companies/{{step_2.companyId}}"
}
```

**Priority**: 🟡 Medium (Phase 2 - after basic multi-step works)

---

### Question 2: Should we support parallel step execution?

**Answer**: ✅ **YES - Phase 3 Enhancement**

**Reasoning**:
- Significant performance improvement for independent API calls
- Example: Fetch contact data from 3 different enrichment APIs simultaneously
- Reduces total execution time from 3s → 1s (if each API takes 1s)

**Implementation**:
```javascript
{
  "type": "multi-step",
  "steps": [
    {
      "id": "step_1",
      "name": "Search Contact",
      "method": "GET",
      "url": "..."
    },
    {
      "id": "parallel_group_1",
      "type": "parallel", // NEW: Parallel execution group
      "steps": [
        {
          "id": "step_2a",
          "name": "Get Phone Data",
          "method": "GET",
          "url": "https://phone-api.com/lookup/{{step_1.phone}}"
        },
        {
          "id": "step_2b",
          "name": "Get Email Data",
          "method": "GET",
          "url": "https://email-api.com/verify/{{step_1.email}}"
        },
        {
          "id": "step_2c",
          "name": "Get Address Data",
          "method": "GET",
          "url": "https://address-api.com/validate/{{step_1.address}}"
        }
      ]
    },
    {
      "id": "step_3",
      "name": "Merge Results",
      "method": "POST",
      "url": "...",
      "body": {
        "phone": "{{step_2a.verified}}",
        "email": "{{step_2b.valid}}",
        "address": "{{step_2c.standardized}}"
      }
    }
  ]
}
```

**Trigger.dev Implementation**:
```typescript
// In connectorExecutionTask.js
if (step.type === 'parallel') {
  // Execute all parallel steps simultaneously
  const parallelResults = await Promise.all(
    step.steps.map(parallelStep => 
      executeStep(parallelStep, context, workspaceId, supabase)
    )
  );
  
  // Merge results into context
  parallelResults.forEach((result, index) => {
    context[step.steps[index].id] = result.output;
  });
}
```

**Priority**: 🟢 Low (Phase 3 - nice-to-have optimization)

---

### Question 3: How do we handle API rate limits?

**Answer**: ✅ **Implement Rate Limiting with Queue Management**

**Strategy**:

#### Option A: Connector-Level Rate Limiting (Recommended)
```javascript
// In connector config
{
  "rateLimiting": {
    "enabled": true,
    "maxRequestsPerMinute": 60,
    "maxRequestsPerHour": 1000,
    "strategy": "queue" // or "fail"
  }
}
```

**Implementation**:
```typescript
// Use Trigger.dev's built-in queue concurrency
export const executeConnector = task({
  id: "execute-connector",
  queue: {
    name: (payload) => `connector-${payload.connectorId}`, // One queue per connector
    concurrencyLimit: (payload) => {
      // Load connector config and get rate limit
      const connector = await getConnector(payload.connectorId);
      return connector.config.rateLimiting?.maxRequestsPerMinute || 10;
    }
  },
  run: async (payload) => {
    // Execute connector
  }
});
```

#### Option B: Service-Level Rate Limiting
```javascript
// Track API usage per service (e.g., all HubSpot connectors share limit)
CREATE TABLE api_rate_limits (
  service_name VARCHAR(100) PRIMARY KEY,
  requests_per_minute INTEGER,
  requests_per_hour INTEGER,
  current_minute_count INTEGER DEFAULT 0,
  current_hour_count INTEGER DEFAULT 0,
  minute_window_start TIMESTAMPTZ,
  hour_window_start TIMESTAMPTZ
);
```

**Recommended Approach**: Combination
- Use Trigger.dev queue concurrency for basic throttling
- Add database tracking for service-level limits
- Implement exponential backoff on 429 (Rate Limit) responses

**Priority**: 🔴 High (Phase 1 - critical for production)

---

### Question 4: Should connectors be shareable across workspaces?

**Answer**: ✅ **YES - Two-Tier System: Workspace Isolation + SaaS Templates**

**Implementation Strategy**:

## 🔒 WORKSPACE ISOLATION (Critical Security Requirement)

### User-Created Connectors
- **Fully Isolated**: Each workspace can ONLY see/manage their own connectors
- **No Cross-Workspace Access**: Workspace A cannot see Workspace B's connectors
- **RLS Enforcement**: Database-level security via Row Level Security policies
- **User Credentials**: Each workspace stores their own API credentials (encrypted)

```sql
-- RLS Policy ensures workspace isolation
CREATE POLICY "Users can view connectors in their workspaces"
  ON connectors FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );
```

### Data Flow Example:
```
Workspace A (Home Improvement Co.)
├─ Connector: "Phone Enrichment" 
│  └─ Uses: Workspace A's AudienceAcuity API key
├─ Connector: "Email Validator"
│  └─ Uses: Workspace A's ZeroBounce API key
└─ ❌ CANNOT see Workspace B's connectors

Workspace B (Marketing Agency)
├─ Connector: "HubSpot Sync"
│  └─ Uses: Workspace B's HubSpot API key
└─ ❌ CANNOT see Workspace A's connectors
```

---

## 🎯 SAAS TEMPLATE SYSTEM (Official Pre-Built Connectors)

### Two Types of Templates:

#### 1. Official Templates (Created by SaaS Team)
- **Created By**: SaaS developers/admins/owners
- **Marked As**: `is_official = true`
- **Featured**: Can be featured on marketplace
- **Quality**: Tested and maintained by SaaS team
- **Examples**: 
  - "Phone Number Enrichment (AudienceAcuity)"
  - "Company Data (Clearbit)"
  - "Email Validation (ZeroBounce)"
  - "HubSpot Contact Sync"
  - "Salesforce Lead Enrichment"

#### 2. Community Templates (Created by Users)
- **Created By**: Regular workspace users
- **Marked As**: `is_official = false`
- **Sharing**: Users can publish their connectors as templates
- **Quality**: Community-rated
- **Examples**: Custom industry-specific connectors

### Template Management Table:

```sql
CREATE TABLE connector_templates (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(100),
  
  -- Configuration (NO credentials stored)
  config JSONB NOT NULL,
  input_schema JSONB,
  field_mappings JSONB,
  
  -- Template type
  is_official BOOLEAN DEFAULT false,  -- TRUE = SaaS team created
  is_featured BOOLEAN DEFAULT false,  -- Featured on marketplace
  is_public BOOLEAN DEFAULT false,    -- Publicly visible
  
  -- Stats
  install_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  rating_count INTEGER DEFAULT 0,
  
  -- Creator
  published_by UUID REFERENCES auth.users(id)
);
```

### SaaS Admin Management:

```sql
CREATE TABLE saas_admin_users (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role VARCHAR(50) CHECK (role IN ('developer', 'admin', 'owner')),
  permissions JSONB DEFAULT '{
    "can_create_templates": true,
    "can_feature_templates": true,
    "can_moderate": true
  }',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Template Installation Flow:

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: User Browses Template Marketplace                      │
│  ─────────────────────────────────────────────────────────────  │
│  GET /api/v1/connector-templates                                │
│                                                                  │
│  Response:                                                       │
│  [                                                               │
│    {                                                             │
│      "id": "template_001",                                       │
│      "name": "Phone Number Enrichment",                          │
│      "description": "Enrich phone numbers with identity data",   │
│      "icon": "📞",                                               │
│      "category": "enrichment",                                   │
│      "is_official": true,  ← Created by SaaS team               │
│      "is_featured": true,                                        │
│      "install_count": 1247,                                      │
│      "rating": 4.8,                                              │
│      "requires_credentials": ["audienceacuity_api_key"]          │
│    }                                                             │
│  ]                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: User Clicks "Install Template"                         │
│  ─────────────────────────────────────────────────────────────  │
│  POST /api/v1/connector-templates/template_001/install          │
│  {                                                               │
│    "workspaceId": "workspace_abc123",                            │
│    "credentials": {                                              │
│      "audienceacuity_api_key": "user's_own_api_key"  ← User provides │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: System Creates Connector in User's Workspace           │
│  ─────────────────────────────────────────────────────────────  │
│  1. Copy template config to new connector                       │
│  2. Store user's credentials (encrypted) in workspace_api_credentials │
│  3. Link credentials to connector config                        │
│  4. Save connector in user's workspace                          │
│                                                                  │
│  Result:                                                         │
│  {                                                               │
│    "id": "connector_xyz",                                        │
│    "workspace_id": "workspace_abc123",  ← Isolated to workspace │
│    "name": "Phone Number Enrichment",                            │
│    "config": { /* template config */ },                          │
│    "created_from_template": "template_001"                       │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: User Can Now Use Connector in Flow Builder             │
│  ─────────────────────────────────────────────────────────────  │
│  - Connector appears in user's connector list                   │
│  - Uses user's own API credentials                              │
│  - Fully customizable (can edit config)                         │
│  - Isolated to their workspace                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Security Points:

1. **Templates Store NO Credentials**
   - Templates only contain configuration (URLs, field mappings, etc.)
   - Users provide their own API keys during installation

2. **Workspace Isolation**
   - Each installed connector belongs to ONE workspace
   - Cannot be shared or accessed by other workspaces

3. **Encrypted Credential Storage**
   - User credentials stored in `workspace_api_credentials` table
   - Encrypted at rest using AES-256
   - Only decrypted during connector execution

4. **SaaS Admin Permissions**
   - Only designated SaaS admins can create official templates
   - Regular users can create community templates
   - Admins can feature/moderate templates

### API Endpoints for Template Management:

```javascript
// Public endpoints (all users)
GET    /api/v1/connector-templates              // Browse marketplace
GET    /api/v1/connector-templates/:id          // View template details
POST   /api/v1/connector-templates/:id/install  // Install to workspace
POST   /api/v1/connector-templates/:id/rate     // Rate template

// SaaS admin endpoints (admins only)
POST   /api/v1/admin/connector-templates        // Create official template
PUT    /api/v1/admin/connector-templates/:id    // Update official template
DELETE /api/v1/admin/connector-templates/:id    // Delete official template
PATCH  /api/v1/admin/connector-templates/:id/feature  // Feature/unfeature
```

**Priority**: 🔴 High (Phase 1 - Core feature for scalability)

---

### Question 5: What's the max number of steps allowed?

**Answer**: ✅ **5-10 Steps (Recommended: 5)**

**Reasoning**:

#### Technical Constraints:
1. **Timeout Limits**: Each step takes 1-5 seconds
   - 5 steps × 5s = 25 seconds (acceptable)
   - 10 steps × 5s = 50 seconds (pushing it)
   - 20 steps × 5s = 100 seconds (too slow)

2. **Error Propagation**: More steps = higher failure probability
   - 5 steps @ 95% success rate = 77% overall success
   - 10 steps @ 95% success rate = 60% overall success

3. **Debugging Complexity**: More steps = harder to debug

#### Recommended Limits:
```javascript
const CONNECTOR_LIMITS = {
  MAX_STEPS: 5,           // Hard limit for UI
  MAX_STEPS_ADVANCED: 10, // For power users (feature flag)
  MAX_PARALLEL_STEPS: 3,  // Per parallel group
  MAX_EXECUTION_TIME: 60000 // 60 seconds total
};
```

#### UI Validation:
```javascript
// In ApiConfigStep.jsx
const addStep = () => {
  if (config.steps.length >= MAX_STEPS) {
    toast({
      title: "Step Limit Reached",
      description: `Maximum ${MAX_STEPS} steps allowed per connector.`,
      status: "warning"
    });
    return;
  }
  // Add step...
};
```

**Priority**: 🔴 High (Phase 1 - enforce from day 1)

---

## 5. Finalized Implementation Plan

### Phase 1: Core Infrastructure (Week 1) - **START HERE**

#### Day 1-2: Database Setup
- [ ] Create `connectors` table with multi-step support
- [ ] Create `connector_executions` table
- [ ] Create `workspace_api_credentials` table
- [ ] Add RLS policies for all tables
- [ ] Create `increment_connector_stats()` function
- [ ] Test database schema with sample data

**Deliverable**: Database ready for connector storage

#### Day 3-4: Backend API
- [ ] Create `backend/src/services/connectorService.js` (CRUD)
- [ ] Create `backend/src/services/credentialService.js` (encryption)
- [ ] Create `backend/src/utils/templateEngine.js` ({{variable}} interpolation)
- [ ] Create `backend/src/utils/jsonPathExtractor.js` (extract nested values)
- [ ] Create `backend/src/routes/connectors.js` (API endpoints)
- [ ] Add validation middleware

**API Endpoints**:
```javascript
POST   /api/v1/connectors              // Create
GET    /api/v1/connectors              // List
GET    /api/v1/connectors/:id          // Get
PUT    /api/v1/connectors/:id          // Update
DELETE /api/v1/connectors/:id          // Delete
POST   /api/v1/connectors/:id/test     // Test (all steps)
POST   /api/v1/connectors/:id/execute  // Execute (triggers Trigger.dev)
GET    /api/v1/connectors/:id/executions // History
```

**Deliverable**: Backend API ready for connector management

#### Day 5-7: Trigger.dev Integration
- [ ] Create `trigger/connectorExecutionTask.js` (main task)
- [ ] Create `trigger/connectorStepExecutor.js` (step executor)
- [ ] Implement multi-step execution with context passing
- [ ] Add comprehensive logging
- [ ] Test single-step execution
- [ ] Test multi-step execution (2-3 steps)
- [ ] Test error handling and retries

**Deliverable**: Async connector execution working end-to-end

---

### Phase 2: UI Enhancements (Week 2)

#### Day 1-3: Multi-Step UI
- [ ] Update `ApiConfigStep.jsx`:
  - [ ] Add connector type toggle (single vs multi-step)
  - [ ] Create `StepCard` component
  - [ ] Create `StepEditor` modal
  - [ ] Add step ordering (drag-and-drop)
  - [ ] Show available variables from previous steps
  - [ ] Add step validation

- [ ] Update `ResponseMappingStep.jsx`:
  - [ ] Add "Test All Steps" button
  - [ ] Show step-by-step execution results
  - [ ] Display combined output from all steps
  - [ ] Update field mapping to support step outputs

**Deliverable**: UI supports multi-step connector creation

#### Day 4-5: Dashboard Enhancements
- [ ] Connect dashboard to real API
- [ ] Add category filters
- [ ] Add execution history viewer
- [ ] Add real-time status updates (via Socket.IO)
- [ ] Add connector cloning
- [ ] Add bulk operations (enable/disable multiple)

**Deliverable**: Fully functional connector management dashboard

#### Day 6-7: Testing & Polish
- [ ] End-to-end testing (create → test → save → execute)
- [ ] Error handling UI (show friendly error messages)
- [ ] Loading states and skeleton screens
- [ ] Responsive design fixes
- [ ] Accessibility audit (keyboard navigation, screen readers)

**Deliverable**: Production-ready UI

---

### Phase 3: Flow Builder Integration (Week 3)

#### Day 1-2: Action Node Type
- [ ] Add "Connector" action type to Flow Builder
- [ ] Create connector selection dropdown
- [ ] Generate dynamic form fields from `input_schema`
- [ ] Add connector icon and description display

#### Day 3-4: Runtime Integration
- [ ] Update flow execution engine to handle connector actions
- [ ] Trigger Trigger.dev task from flow runtime
- [ ] Handle sync vs async execution modes
- [ ] Update contact with enriched data
- [ ] Add connector execution to flow logs

#### Day 5-7: Monitoring & Debugging
- [ ] Add connector execution step to flow execution timeline
- [ ] Show connector status in flow run details
- [ ] Link to Trigger.dev dashboard for detailed logs
- [ ] Add retry button for failed connector executions
- [ ] Test complete flow with multiple connectors

**Deliverable**: Connectors fully integrated into Flow Builder

---

### Phase 4: Advanced Features (Week 4)

#### Day 1-2: Rate Limiting
- [ ] Implement connector-level rate limiting
- [ ] Add rate limit configuration UI
- [ ] Create `api_rate_limits` table
- [ ] Add rate limit tracking to Trigger.dev task
- [ ] Handle 429 responses with exponential backoff

#### Day 3-4: Conditional Steps
- [ ] Add condition configuration to step editor
- [ ] Implement expression evaluation in step executor
- [ ] Add condition testing in UI
- [ ] Update documentation

#### Day 5-7: Templates & Marketplace
- [ ] Create 5-10 pre-built connector templates
- [ ] Add template installation flow
- [ ] Create template browsing UI
- [ ] Add template search and filtering
- [ ] Test template installation and customization

**Deliverable**: Advanced features ready for power users

---

## 6. Testing Strategy

### Unit Tests
```javascript
// backend/tests/connectorExecution.test.js
describe('Connector Execution', () => {
  it('should execute single-step connector', async () => {
    // Test basic execution
  });

  it('should execute multi-step connector with data passing', async () => {
    // Test step 2 receives step 1 output
  });

  it('should handle step failures gracefully', async () => {
    // Test continue_on_error behavior
  });

  it('should apply field mappings correctly', async () => {
    // Test JSON path extraction and contact update
  });
});
```

### Integration Tests
```javascript
// Test with real APIs (sandbox accounts)
describe('Real API Integration', () => {
  it('should enrich contact from HubSpot', async () => {
    // Use HubSpot test account
  });

  it('should validate email with ZeroBounce', async () => {
    // Use ZeroBounce test API
  });
});
```

### E2E Tests
```javascript
// frontend/tests/e2e/connectors.spec.js
describe('Connector Creation Flow', () => {
  it('should create and test a connector', async () => {
    // 1. Navigate to Connectors
    // 2. Click "Create Connector"
    // 3. Fill in all 5 steps
    // 4. Test connector
    // 5. Save connector
    // 6. Verify it appears in dashboard
  });
});
```

---

## 7. Documentation Plan

### User Documentation
1. **Getting Started Guide**
   - What are connectors?
   - Creating your first connector
   - Testing and debugging

2. **Advanced Guide**
   - Multi-step connectors
   - Variable interpolation
   - Field mapping
   - Error handling

3. **API Reference**
   - All API endpoints
   - Request/response examples
   - Error codes

4. **Connector Templates**
   - Pre-built connector guides
   - Popular API integrations
   - Best practices

### Developer Documentation
1. **Architecture Overview**
   - System design
   - Data flow diagrams
   - Technology stack

2. **Trigger.dev Integration**
   - Task structure
   - Execution flow
   - Monitoring and debugging

3. **Contributing Guide**
   - Adding new connector templates
   - Testing guidelines
   - Code style

---

## 8. Success Metrics

### User Adoption
- **Target**: 60% of workspaces create ≥1 connector within 30 days
- **Measure**: `SELECT COUNT(DISTINCT workspace_id) FROM connectors`

### Connector Usage
- **Target**: Average 50 executions per connector per week
- **Measure**: `SELECT AVG(total_executions) FROM connectors WHERE created_at > NOW() - INTERVAL '7 days'`

### Data Enrichment Rate
- **Target**: 80% of new contacts enriched within 5 minutes
- **Measure**: Track time from contact creation to first enrichment

### Error Rate
- **Target**: <5% failed executions
- **Measure**: `SELECT (failed_executions::float / total_executions) * 100 FROM connectors`

### Performance
- **Target**: 95th percentile execution time <10 seconds
- **Measure**: `SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY execution_time_ms) FROM connector_executions`

---

## 9. Next Steps - START HERE 🚀

### Immediate Actions (This Week):

1. **✅ Review this document** - Get team approval
2. **🔴 Create database tables** - Run SQL migration
3. **🔴 Build backend API** - Start with connectorService.js
4. **🔴 Create Trigger.dev task** - connectorExecutionTask.js
5. **🟡 Update UI for multi-step** - ApiConfigStep.jsx

### Week 1 Checklist:
- [ ] Database schema created and tested
- [ ] Backend API endpoints working
- [ ] Trigger.dev task executing single-step connectors
- [ ] UI can create and save connectors (single-step only)
- [ ] End-to-end test: Create → Save → Execute → View Results

### Week 2 Goal:
- [ ] Multi-step connectors working end-to-end
- [ ] UI supports multi-step creation and testing
- [ ] Dashboard shows execution history
- [ ] Ready for Flow Builder integration

---

## 10. Risk Mitigation

### Risk 1: API Rate Limiting Issues
**Mitigation**: Implement queue-based rate limiting from day 1

### Risk 2: Complex Multi-Step Debugging
**Mitigation**: Comprehensive logging at each step, real-time status updates

### Risk 3: Security Concerns with API Credentials
**Mitigation**: AES-256 encryption, never log credentials, audit trail

### Risk 4: Performance Degradation with Many Steps
**Mitigation**: Enforce 5-step limit, add timeout warnings, optimize step execution

### Risk 5: User Confusion with Multi-Step UI
**Mitigation**: Progressive disclosure, helpful tooltips, example templates

---

## Conclusion

**We have everything we need to start building!**

✅ UI foundation is solid
✅ Trigger.dev is configured and working
✅ Database structure is defined
✅ All critical questions answered
✅ Implementation plan is detailed and actionable

**Recommendation**: Start with **Phase 1, Day 1-2** (Database Setup) immediately.

Let's build this! 🚀

