# Connectors Architecture Guide

## 📋 Overview

The **Connectors** feature allows users to build custom API integrations that can be used as actions in automation flows. This system is designed to be **connector-agnostic** - meaning you can add unlimited connectors without creating new code or workflows.

**Key Principle**: One reusable workflow handles ALL connectors dynamically.

---

## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Tools      │  │ Flow Builder │  │   Contacts   │         │
│  │  Connectors  │  │   (Actions)  │  │   (View)     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          │ Create/Edit      │ Use in Flow      │ View Results
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                           │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │ ConnectorBuilder │  │ ConnectorAction  │                   │
│  │  (Create/Edit)    │  │  (Flow Config)   │                   │
│  └────────┬─────────┘  └────────┬─────────┘                   │
│           │                      │                              │
│           │ API Calls            │ API Calls                    │
│           ▼                      ▼                              │
│  ┌─────────────────────────────────────┐                       │
│  │    connectorsApi.js (Service)      │                       │
│  └──────────────┬──────────────────────┘                       │
└─────────────────┼───────────────────────────────────────────────┘
                  │
                  │ HTTP Requests
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER (Hono API)                       │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  /api/v1/connectors                                  │      │
│  │    • GET    /              (List connectors)         │      │
│  │    • POST   /              (Create connector)        │      │
│  │    • GET    /:id           (Get connector)           │      │
│  │    • PUT    /:id           (Update connector)       │      │
│  │    • DELETE /:id           (Delete connector)        │      │
│  │    • POST   /:id/execute  (Execute connector)       │      │
│  │    • POST   /:id/test      (Test connector)          │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  │ Database Operations
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                        │
│  ┌──────────────────┐  ┌──────────────────┐                   │
│  │   connectors     │  │connector_        │                   │
│  │   (Config)       │  │executions        │                   │
│  │                  │  │(History)         │                   │
│  │ • id             │  │                  │                   │
│  │ • name           │  │ • id             │                   │
│  │ • config         │  │ • connector_id   │                   │
│  │ • field_mappings│  │ • status         │                   │
│  │ • workspace_id  │  │ • output_data    │                   │
│  └──────────────────┘  └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ When Flow Executes
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              TRIGGER.DEV (Background Jobs)                      │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  trigger-workflow Task                               │      │
│  │                                                       │      │
│  │  When connector action encountered:                 │      │
│  │  1. Fetch connector config from DB                  │      │
│  │  2. Execute connector (reusable logic)              │      │
│  │  3. Update contact fields                           │      │
│  │  4. Save raw response to metadata                   │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### 1. Creating a Connector (Frontend → Backend)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FLOW                             │
└─────────────────────────────────────────────────────────────┘

User clicks "Create Connector"
         │
         ▼
┌────────────────────┐
│ ConnectorBuilder   │
│ (5-Step Wizard)    │
│                    │
│ Step 1: Basic Info │
│ Step 2: API Config │
│ Step 3: Advanced   │
└─────────┬──────────┘
          │
          │ User fills form
          │ • Name: "Enhance Data"
          │ • URL: "https://api.example.com/phone"
          │ • Method: "GET"
          │ • Headers: [{key: "X-API-Key", value: "..."}]
          │ • Field Mappings: [
          │     {sourcePath: "identities[0].firstName", 
          │      targetField: "firstname"}
          │   ]
          │
          ▼
┌────────────────────┐
│ connectorsApi.js   │
│ createConnector()  │
└─────────┬──────────┘
          │
          │ POST /api/v1/connectors
          │ Headers: {
          │   Authorization: "Bearer <JWT>",
          │   X-Workspace-Id: "15213"
          │ }
          │ Body: {
          │   name: "Enhance Data",
          │   config: {...},
          │   field_mappings: [...]
          │ }
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              CLOUDFLARE WORKER                               │
└─────────────────────────────────────────────────────────────┘

POST /api/v1/connectors
         │
         ▼
┌────────────────────┐
│ Auth Middleware    │
│ • Verify JWT       │
│ • Check workspace  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ ConnectorService    │
│ createConnector()   │
└─────────┬──────────┘
          │
          │ INSERT INTO connectors
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                  │
│                                                              │
│  connectors table:                                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id: "6ffb94ae-..."                                 │    │
│  │ name: "Enhance Data"                               │    │
│  │ workspace_id: "15213"                              │    │
│  │ config: {                                          │    │
│  │   method: "GET",                                   │    │
│  │   url: "https://api.example.com/phone",           │    │
│  │   headers: [{key: "X-API-Key", value: "..."}],   │    │
│  │   auth: {type: "none"}                            │    │
│  │ },                                                 │    │
│  │ field_mappings: [                                  │    │
│  │   {sourcePath: "identities[0].firstName",         │    │
│  │    targetField: "firstname"}                      │    │
│  │ ]                                                  │    │
│  │ enabled: true                                      │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
          │
          │ Response: {success: true, data: {...}}
          │
          ▼
┌────────────────────┐
│ Frontend receives  │
│ success response   │
│ • Shows toast      │
│ • Redirects to list │
└────────────────────┘
```

### 2. Using Connector in Flow (Frontend → Execution)

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FLOW                             │
└─────────────────────────────────────────────────────────────┘

User builds workflow in Flow Builder
         │
         ▼
┌────────────────────┐
│ Flow Builder UI    │
│                    │
│  [Start]           │
│     │              │
│     ▼              │
│  [Action]          │
│     │              │
│     ▼              │
│  [Connector]       │ ← User selects "Enhance Data"
└─────────┬──────────┘
          │
          │ Opens ConnectorAction component
          │
          ▼
┌────────────────────┐
│ ConnectorAction    │
│                    │
│ • Dropdown: Select │
│   connector        │
│ • Shows connector  │
│   details          │
│ • Quick Test       │
└─────────┬──────────┘
          │
          │ Saves to workflow config:
          │ {
          │   type: "connector",
          │   configuration: {
          │     connectorId: "6ffb94ae-..."
          │   }
          │ }
          │
          ▼
┌────────────────────┐
│ Workflow saved to  │
│ database           │
└─────────┬──────────┘
          │
          │ User clicks "Send Flow to Contact"
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│              TRIGGER.DEV EXECUTION                           │
└─────────────────────────────────────────────────────────────┘

trigger-workflow task starts
         │
         ▼
┌────────────────────┐
│ Execute Workflow   │
│                    │
│ Step 1: START      │ ✅
│ Step 2: ACTION     │
│   └─> connector    │ ← Encountered!
└─────────┬──────────┘
          │
          │ Read connectorId from action config
          │
          ▼
┌────────────────────┐
│ Fetch Connector    │
│ from Database      │
│                    │
│ SELECT * FROM      │
│ connectors         │
│ WHERE id = '...'   │
│ AND workspace_id   │
└─────────┬──────────┘
          │
          │ Connector config retrieved
          │
          ▼
┌────────────────────┐
│ Normalize Config   │
│                    │
│ • Convert headers  │
│   array → object   │
│ • Convert query    │
│   params array →   │
│   object           │
│ • Parse body       │
│   string → JSON    │
└─────────┬──────────┘
          │
          │ Build context for template interpolation
          │ {
          │   contact: {phone_number: "+16266958105", ...},
          │   workspace: {id: "15213"}
          │ }
          │
          ▼
┌────────────────────┐
│ Execute API Call   │
│                    │
│ 1. Interpolate URL:│
│    "https://api... │
│    /phone?phone={{│
│    contact.phone_  │
│    number}}"       │
│    → "https://api..│
│    /phone?phone=+1 │
│    6266958105"     │
│                    │
│ 2. Build headers   │
│ 3. Make request    │
│ 4. Parse response  │
└─────────┬──────────┘
          │
          │ API Response:
          │ {
          │   "identities": [{
          │     "firstName": "Jose",
          │     "lastName": "Tayzon",
          │     "address": "1461 Indian Well Dr"
          │   }]
          │ }
          │
          ▼
┌────────────────────┐
│ Apply Field        │
│ Mappings           │
│                    │
│ For each mapping:  │
│ • Extract value    │
│   from response    │
│ • Update contact   │
│   field            │
│                    │
│ Example:           │
│ sourcePath:        │
│   "identities[0].  │
│   firstName"       │
│ → targetField:     │
│   "firstname"      │
│ → Value: "Jose"    │
└─────────┬──────────┘
          │
          │ Update contact:
          │ {
          │   firstname: "Jose",
          │   lastname: "Tayzon",
          │   st_address: "1461 Indian Well Dr"
          │ }
          │
          ▼
┌────────────────────┐
│ Save Raw Response  │
│ to Metadata        │
│                    │
│ metadata: {        │
│   connector_       │
│   responses: [{    │
│     connector_id:  │
│       "6ffb94ae",  │
│     raw_response:  │
│       {...},       │
│     executed_at:   │
│       "2025-11-20" │
│   }]               │
│ }                  │
└─────────┬──────────┘
          │
          │ Execution complete
          │
          ▼
┌────────────────────┐
│ Update Execution   │
│ Record             │
│                    │
│ status: "completed"│
│ output_data: {...} │
│ execution_time_ms: │
│   951              │
└────────────────────┘
```

### 3. Multiple Connectors in One Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    WORKFLOW EXAMPLE                          │
│              "Complete Lead Enrichment"                      │
└─────────────────────────────────────────────────────────────┘

┌──────────┐
│  START  │
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│  Connector Action 1   │
│  "Enhance Data"       │
│  (Phone Enrichment)   │
│                       │
│  Input:               │
│  • contact.phone_     │
│    number             │
│                       │
│  Output:              │
│  • firstname          │
│  • lastname           │
│  • address            │
└────┬──────────────────┘
     │
     │ Contact fields updated
     │
     ▼
┌──────────────────────┐
│  Connector Action 2   │
│  "Email Verification" │
│                       │
│  Input:               │
│  • contact.email      │
│                       │
│  Output:              │
│  • email_valid        │
│  • email_score        │
└────┬──────────────────┘
     │
     │ Contact fields updated
     │
     ▼
┌──────────────────────┐
│  Connector Action 3   │
│  "Address Validation" │
│                       │
│  Input:               │
│  • contact.st_address │
│  • contact.city       │
│  • contact.state      │
│                       │
│  Output:              │
│  • address_valid      │
│  • address_score      │
└────┬──────────────────┘
     │
     │ Contact fields updated
     │
     ▼
┌──────────┐
│  SMS    │
│  (Send) │
└─────────┘

All executed in ONE workflow run!
```

---

## 🔑 Key Components

### Frontend Components

```
frontend/src/components/connectors/
├── ConnectorsDashboard.jsx          # Main dashboard (list view)
├── ConnectorBuilder/
│   ├── index.jsx                    # Wizard container
│   ├── BasicInfoStep.jsx            # Step 1: Name, description
│   ├── ApiConfigStep.jsx            # Step 2: API configuration
│   ├── AdvancedSettingsStep.jsx     # Step 3: Timeout, retries
│   ├── VariablePicker.jsx           # Dynamic variable selector
│   └── InteractiveJsonViewer.jsx   # JSON response mapper
└── README_CONNECTORS_FEATURE.md     # Feature documentation

frontend/src/components/flow-builder/actions/
├── ActionSidebar.js                  # Shows connectors in sidebar
└── components/
    └── ConnectorAction.js           # Connector action config UI

frontend/src/services/
└── connectorsApi.js                  # API service layer
```

### Backend Components

```
cloudflare-workers/connectors-api/
├── src/
│   ├── index.ts                     # Hono app entry point
│   ├── routes/
│   │   └── connectors.ts            # REST API endpoints
│   ├── services/
│   │   ├── connectorService.ts      # Business logic
│   │   ├── templateService.ts       # Template management
│   │   └── credentialService.ts     # Credential encryption
│   ├── middleware/
│   │   └── auth.ts                  # JWT authentication
│   └── utils/
│       ├── templateEngine.ts        # Variable interpolation
│       ├── jsonPathExtractor.ts     # JSON path extraction
│       └── encryption.ts            # AES-256-GCM encryption

trigger/
├── unifiedWorkflows.js               # Main workflow executor
│   └── (Contains connector execution logic inline)
├── connectorExecutionTask.js         # Standalone task (optional)
├── connectorStepExecutor.js          # API request executor
└── utils/
    ├── templateEngine.js             # Template interpolation
    └── jsonPathExtractor.js          # JSON path extraction
```

### Database Schema

```sql
-- Connectors table
CREATE TABLE connectors (
  id UUID PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,              -- 'single-step' or 'multi-step'
  config JSONB NOT NULL,            -- API configuration
  field_mappings JSONB,             -- Field mapping rules
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Execution history
CREATE TABLE connector_executions (
  id UUID PRIMARY KEY,
  connector_id UUID REFERENCES connectors(id),
  workspace_id TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  status TEXT NOT NULL,             -- 'pending', 'executing', 'completed', 'failed'
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

---

## 🎯 How Multiple Connectors Work

### The Magic: Dynamic Execution

```
┌─────────────────────────────────────────────────────────────┐
│           ONE WORKFLOW HANDLES ALL CONNECTORS               │
└─────────────────────────────────────────────────────────────┘

Workflow encounters connector action
         │
         │ Read connectorId from action config
         │
         ▼
┌────────────────────┐
│ Database Query     │
│                    │
│ SELECT * FROM      │
│ connectors         │
│ WHERE id = ?       │
└─────────┬──────────┘
          │
          │ Returns connector config
          │
          ▼
┌────────────────────┐
│ Execute Connector  │
│ (Reusable Logic)   │
│                    │
│ • Normalize config │
│ • Interpolate vars │
│ • Make API call    │
│ • Parse response   │
│ • Apply mappings   │
│ • Update contact   │
└────────────────────┘

This same logic works for ANY connector!
```

### Example: 10 Different Connectors

```
Connector 1: "Enhance Data"
  └─> Uses same execution logic
      └─> Different config, same process

Connector 2: "Email Verification"
  └─> Uses same execution logic
      └─> Different config, same process

Connector 3: "Address Validation"
  └─> Uses same execution logic
      └─> Different config, same process

... (7 more connectors)

All use the SAME workflow task!
No code changes needed!
```

---

## 📊 Data Structures

### Connector Config Format

```javascript
{
  // Basic Info
  name: "Enhance Data",
  type: "single-step",  // or "multi-step"
  enabled: true,

  // API Configuration
  config: {
    method: "GET",      // GET, POST, PUT, DELETE, etc.
    url: "https://api.example.com/phone?phone={{contact.phone_number}}",
    
    // Headers (stored as array, converted to object)
    headers: [
      {key: "X-API-Key", value: "{{workspace.api_key}}"},
      {key: "Content-Type", value: "application/json"}
    ],
    
    // Query Parameters (stored as array, converted to object)
    queryParams: [
      {key: "format", value: "json"}
    ],
    
    // Request Body (for POST/PUT)
    body: {
      phone: "{{contact.phone_number}}",
      email: "{{contact.email}}"
    },
    bodyType: "json",   // json, form, xml, raw
    
    // Authentication
    auth: {
      type: "bearer",   // none, bearer, api_key, basic
      token: "{{workspace.api_token}}"
    },
    
    // Advanced Settings
    timeout: 30000,     // milliseconds
    retries: 3
  },

  // Field Mappings
  field_mappings: [
    {
      sourcePath: "identities[0].firstName",
      targetField: "firstname"
    },
    {
      sourcePath: "identities[0].lastName",
      targetField: "lastname"
    },
    {
      sourcePath: "identities[0].address",
      targetField: "st_address"
    }
  ]
}
```

### Execution Flow Data

```javascript
// Input to connector execution
{
  contact: {
    id: "49fc8ebc-...",
    phone_number: "+16266958105",
    email: "user@example.com",
    firstname: "New",
    lastname: "Contact"
  },
  workspace: {
    id: "15213"
  }
}

// API Response (example)
{
  "input": {
    "phone": " 16266958105"
  },
  "identities": [{
    "firstName": "Jose",
    "lastName": "Tayzon",
    "address": "1461 Indian Well Dr",
    "city": "Diamond Bar",
    "state": "CA",
    "zip": "91765"
  }]
}

// Contact Update (after mapping)
{
  firstname: "Jose",        // from identities[0].firstName
  lastname: "Tayzon",       // from identities[0].lastName
  st_address: "1461...",    // from identities[0].address
  city: "Diamond Bar",       // from identities[0].city
  state: "CA",               // from identities[0].state
  zip: "91765"              // from identities[0].zip
}

// Metadata (raw response saved)
{
  metadata: {
    connector_responses: [{
      connector_id: "6ffb94ae-...",
      connector_name: "Enhance Data",
      execution_id: "47766d18-...",
      executed_at: "2025-11-20T09:54:01.679Z",
      status: "completed",
      raw_response: { /* full API response */ }
    }]
  }
}
```

---

## 🔐 Security & Isolation

### Workspace Isolation

```
┌─────────────────────────────────────────────────────────────┐
│              WORKSPACE ISOLATION                            │
└─────────────────────────────────────────────────────────────┘

Workspace A (ID: 15213)
  ├─> Connector 1: "Enhance Data"
  ├─> Connector 2: "Email Check"
  └─> Connector 3: "Address Validator"
      │
      └─> Only accessible by Workspace A users
          └─> RLS policies enforce isolation

Workspace B (ID: 15214)
  ├─> Connector 1: "Lead Scoring"
  └─> Connector 2: "CRM Sync"
      │
      └─> Only accessible by Workspace B users
          └─> Cannot see Workspace A connectors
```

### Authentication Flow

```
Frontend Request
     │
     ▼
┌────────────────────┐
│ JWT Token          │
│ (from Supabase)    │
└─────────┬──────────┘
          │
          │ Authorization: Bearer <JWT>
          │ X-Workspace-Id: 15213
          │
          ▼
┌────────────────────┐
│ Cloudflare Worker  │
│ Auth Middleware    │
│                    │
│ 1. Verify JWT      │
│ 2. Extract user_id │
│ 3. Check workspace │
│    membership      │
└─────────┬──────────┘
          │
          │ ✅ Authenticated
          │
          ▼
┌────────────────────┐
│ Route Handler      │
│                    │
│ • Verify workspace │
│   access           │
│ • Execute request  │
└────────────────────┘
```

---

## 🚀 Adding a New Connector

### Step-by-Step Process

```
1. USER CREATES CONNECTOR
   │
   ├─> Frontend: ConnectorBuilder wizard
   │   ├─> Step 1: Name, description
   │   ├─> Step 2: API config (URL, method, headers, body)
   │   └─> Step 3: Advanced settings
   │
   └─> Saves to database
       └─> connectors table

2. CONNECTOR AVAILABLE IN FLOW BUILDER
   │
   ├─> ActionSidebar fetches connectors
   │   └─> GET /api/v1/connectors
   │
   └─> User can add to workflow

3. WORKFLOW EXECUTION
   │
   ├─> trigger-workflow task runs
   │
   ├─> Encounters connector action
   │   └─> Reads connectorId
   │
   ├─> Fetches connector config
   │   └─> SELECT * FROM connectors WHERE id = ?
   │
   ├─> Executes connector
   │   ├─> Normalizes config
   │   ├─> Interpolates variables
   │   ├─> Makes API call
   │   ├─> Parses response
   │   ├─> Applies field mappings
   │   └─> Updates contact
   │
   └─> Saves raw response to metadata

NO CODE CHANGES NEEDED!
```

---

## 🧪 Testing a Connector

### Quick Test Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    QUICK TEST FLOW                           │
└─────────────────────────────────────────────────────────────┘

User clicks "Test" in ConnectorAction
         │
         ▼
┌────────────────────┐
│ Frontend           │
│                    │
│ POST /api/v1/      │
│ connectors/:id/    │
│ test               │
│                    │
│ Body: {            │
│   workspace_id:    │
│     "15213",       │
│   input_data: {    │
│     contact: {     │
│       phone_number:│
│         "+1234..." │
│     }              │
│   }                │
│ }                  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Cloudflare Worker  │
│                    │
│ • Load connector   │
│ • Interpolate vars │
│ • Make API call    │
│ • Return response  │
│   (bypasses        │
│   Trigger.dev)     │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ Frontend displays  │
│ response           │
│                    │
│ • Shows JSON       │
│ • Allows mapping   │
│   fields           │
└────────────────────┘
```

---

## 📝 Best Practices

### 1. Connector Naming
- Use descriptive names: "Enhance Data", "Email Verification"
- Avoid generic names: "API Call", "Connector 1"

### 2. Field Mappings
- Use specific source paths: `identities[0].firstName` not `firstName`
- Map to standard contact fields when possible
- Create custom fields for unique data

### 3. Error Handling
- Set appropriate timeouts (default: 30s)
- Configure retries for unreliable APIs
- Test with real data before production use

### 4. Security
- Never hardcode API keys in connector config
- Use workspace credentials for sensitive data
- Enable encryption for stored credentials

### 5. Performance
- Keep API calls fast (< 5s ideal)
- Use single-step connectors when possible
- Consider caching for frequently used connectors

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Connector Not Executing
```
Check:
- Is connector enabled? (enabled = true)
- Does user have workspace access?
- Are environment variables set in Trigger.dev?
```

#### 2. Field Mappings Not Working
```
Check:
- Source path matches response structure
- Target field exists in contacts table
- Response data is in expected format
- Check metadata.connector_responses for raw data
```

#### 3. API Request Failing
```
Check:
- URL is correct and accessible
- Authentication is configured properly
- Headers are in correct format
- Body is not sent with GET requests
- Timeout is sufficient
```

#### 4. Variables Not Interpolating
```
Check:
- Variable syntax: {{contact.phone_number}}
- Contact data is available in context
- Variable name matches contact field
- Use VariablePicker to ensure correct syntax
```

---

## 📚 Additional Resources

- **Feature Specification**: `docs/CONNECTORS_FEATURE_SPECIFICATION.md`
- **Implementation Plan**: `docs/CONNECTORS_IMPLEMENTATION_PLAN.md`
- **API Documentation**: `cloudflare-workers/connectors-api/README.md`
- **Trigger.dev Guide**: `trigger/README_CONNECTORS.md`

---

## ✅ Summary

**Key Takeaways:**

1. ✅ **One workflow handles ALL connectors** - No need to create new workflows
2. ✅ **Dynamic execution** - Connectors are fetched and executed at runtime
3. ✅ **Scalable architecture** - Add unlimited connectors without code changes
4. ✅ **Workspace isolation** - Each workspace has its own connectors
5. ✅ **Full history** - Raw responses saved for troubleshooting
6. ✅ **Field mapping** - Automatic contact field updates
7. ✅ **Reusable logic** - Same execution code for all connectors

**The system is connector-agnostic and designed to scale!** 🚀

