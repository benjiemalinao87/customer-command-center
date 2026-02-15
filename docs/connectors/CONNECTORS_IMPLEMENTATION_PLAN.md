# Connectors Implementation Plan - Trigger.dev Integration

## Table of Contents
1. [Overview](#overview)
2. [Multi-Step API Request Architecture](#multi-step-api-request-architecture)
3. [Database Schema Review](#database-schema-review)
4. [UI Components Review](#ui-components-review)
5. [Backend Implementation Plan](#backend-implementation-plan)
6. [Trigger.dev Task Structure](#triggerdev-task-structure)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)

---

## Overview

This document outlines the complete implementation plan for the Connectors feature using **Trigger.dev** as the async task execution engine. The key innovation is supporting **multi-step API requests** where one API call's response is used as input for subsequent calls.

### Key Requirements
- ✅ Support single API requests (simple connectors)
- ✅ Support multi-step/chained API requests (complex connectors)
- ✅ Handle authentication for each step
- ✅ Map data between steps (use Step 1 response in Step 2 request)
- ✅ Retry logic per step
- ✅ Comprehensive error handling
- ✅ Real-time execution monitoring

---

## Multi-Step API Request Architecture

### Problem Statement

Many REST APIs require sequential requests:

```
┌─────────────────────────────────────────────────────────────────┐
│  USE CASE: Enrich Contact from CRM API                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: email = "john@acme.com"                                 │
│                                                                  │
│  STEP 1: Search for contact ID                                  │
│  ──────────────────────────────────────────────────────────     │
│  GET /api/search?email=john@acme.com                            │
│  Response: {                                                     │
│    "results": [{                                                 │
│      "id": "contact_abc123",                                     │
│      "email": "john@acme.com"                                    │
│    }]                                                            │
│  }                                                               │
│                                                                  │
│  STEP 2: Get full contact details using ID from Step 1          │
│  ──────────────────────────────────────────────────────────     │
│  GET /api/contacts/{{step1.results[0].id}}                      │
│  Response: {                                                     │
│    "id": "contact_abc123",                                       │
│    "firstName": "John",                                          │
│    "lastName": "Smith",                                          │
│    "company": "Acme Corp",                                       │
│    "phone": "+1-555-0123"                                        │
│  }                                                               │
│                                                                  │
│  STEP 3: Get company details using company from Step 2          │
│  ──────────────────────────────────────────────────────────     │
│  GET /api/companies?name={{step2.company}}                      │
│  Response: {                                                     │
│    "industry": "Technology",                                     │
│    "employees": 500,                                             │
│    "revenue": "$50M"                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Solution: Step-Based Connector Configuration

```javascript
// Connector configuration with multiple steps
{
  "id": "connector_001",
  "name": "HubSpot Contact Enrichment",
  "type": "multi-step", // NEW: "single-step" or "multi-step"
  "steps": [
    {
      "id": "step_1",
      "name": "Search Contact by Email",
      "method": "POST",
      "url": "https://api.hubspot.com/crm/v3/objects/contacts/search",
      "auth": {
        "type": "bearer",
        "token": "{{workspace.hubspot_token}}"
      },
      "body": {
        "filterGroups": [{
          "filters": [{
            "propertyName": "email",
            "operator": "EQ",
            "value": "{{input.email}}"
          }]
        }]
      },
      "outputMapping": {
        "contactId": "results[0].id" // Extract ID for next step
      }
    },
    {
      "id": "step_2",
      "name": "Get Contact Details",
      "method": "GET",
      "url": "https://api.hubspot.com/crm/v3/objects/contacts/{{step_1.contactId}}", // Use previous step output
      "auth": {
        "type": "bearer",
        "token": "{{workspace.hubspot_token}}"
      },
      "outputMapping": {
        "firstName": "properties.firstname",
        "lastName": "properties.lastname",
        "companyId": "associations.companies[0].id"
      }
    },
    {
      "id": "step_3",
      "name": "Get Company Details",
      "method": "GET",
      "url": "https://api.hubspot.com/crm/v3/objects/companies/{{step_2.companyId}}",
      "auth": {
        "type": "bearer",
        "token": "{{workspace.hubspot_token}}"
      },
      "outputMapping": {
        "companyName": "properties.name",
        "industry": "properties.industry"
      }
    }
  ],
  "finalMapping": {
    // Map to contact fields
    "first_name": "{{step_2.firstName}}",
    "last_name": "{{step_2.lastName}}",
    "metadata.company_name": "{{step_3.companyName}}",
    "metadata.industry": "{{step_3.industry}}"
  }
}
```

---

## Database Schema Review

### Current Schema (To Be Reviewed via Supabase MCP)

We need to verify/create these tables:

```sql
-- Main connectors table
CREATE TABLE connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50), -- emoji or icon name
  category VARCHAR(100), -- 'enrichment', 'validation', 'communication', etc.
  
  -- NEW: Support for multi-step connectors
  type VARCHAR(20) DEFAULT 'single-step', -- 'single-step' or 'multi-step'
  
  -- Configuration (JSONB for flexibility)
  config JSONB NOT NULL, -- Contains steps array, auth, etc.
  
  -- Input schema (defines what users need to provide)
  input_schema JSONB, -- { "fields": [{ "name": "email", "type": "string", "required": true }] }
  
  -- Field mappings (how API response maps to contact fields)
  field_mappings JSONB, -- { "first_name": "{{step_2.firstName}}", ... }
  
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
  
  -- Indexes
  CONSTRAINT connectors_workspace_name_unique UNIQUE(workspace_id, name)
);

CREATE INDEX idx_connectors_workspace ON connectors(workspace_id);
CREATE INDEX idx_connectors_category ON connectors(category);
CREATE INDEX idx_connectors_enabled ON connectors(enabled);

-- Connector executions log
CREATE TABLE connector_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES connectors(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  flow_run_id UUID, -- Reference to flow execution if triggered from Flow Builder
  
  -- Execution details
  status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'success', 'failed', 'timeout'
  
  -- NEW: Step-by-step execution tracking
  steps_executed JSONB, -- [{ "step_id": "step_1", "status": "success", "duration_ms": 234, "response": {...} }]
  current_step VARCHAR(50), -- Which step is currently executing
  
  -- Input/Output
  input_data JSONB, -- User-provided inputs
  output_data JSONB, -- Final enriched data
  error_message TEXT,
  error_stack TEXT,
  
  -- Performance
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Trigger.dev integration
  trigger_run_id VARCHAR(255), -- Trigger.dev run ID for tracking
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_connector_executions_connector ON connector_executions(connector_id);
CREATE INDEX idx_connector_executions_workspace ON connector_executions(workspace_id);
CREATE INDEX idx_connector_executions_contact ON connector_executions(contact_id);
CREATE INDEX idx_connector_executions_status ON connector_executions(status);
CREATE INDEX idx_connector_executions_created ON connector_executions(created_at DESC);

-- Connector templates (pre-built connectors users can clone)
CREATE TABLE connector_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(100),
  
  -- Template configuration
  config JSONB NOT NULL,
  input_schema JSONB,
  field_mappings JSONB,
  
  -- Metadata
  is_featured BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT connector_templates_name_unique UNIQUE(name)
);

-- Workspace API credentials (encrypted storage)
CREATE TABLE workspace_api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  service_name VARCHAR(100) NOT NULL, -- 'hubspot', 'salesforce', 'clearbit', etc.
  
  -- Encrypted credentials
  credentials JSONB NOT NULL, -- { "api_key": "encrypted_value", "token": "encrypted_value" }
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  CONSTRAINT workspace_api_credentials_unique UNIQUE(workspace_id, service_name)
);

CREATE INDEX idx_workspace_api_credentials_workspace ON workspace_api_credentials(workspace_id);
```

---

## UI Components Review

### Current UI Components (To Be Reviewed)

Based on the screenshot, we have:

#### ✅ Already Built:
1. **ConnectorsDashboard** - List view of connectors
2. **ConnectorBuilder** - 5-step wizard
3. **BasicInfoStep** - Name, description, icon, category
4. **ApiConfigStep** - Method, URL, query params, headers, body
5. **AuthenticationStep** - Auth configuration
6. **ResponseMappingStep** - Map API response to contact fields
7. **AdvancedSettingsStep** - Timeout, retries, error handling

#### 🔧 Needs Enhancement:

**ApiConfigStep.jsx** - Add Multi-Step Support:

```javascript
// Current: Single request configuration
// Needed: Multiple request steps with data passing

┌─────────────────────────────────────────────────────────────────┐
│  API Configuration                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Connector Type:  ○ Single Request   ● Multi-Step Requests      │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ STEP 1: Search Contact                              [Edit] │ │
│  │ GET /api/search?email={{input.email}}                      │ │
│  │ Output: contactId                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ STEP 2: Get Contact Details                         [Edit] │ │
│  │ GET /api/contacts/{{step_1.contactId}}                     │ │
│  │ Output: firstName, lastName, companyId                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ STEP 3: Get Company Details                         [Edit] │ │
│  │ GET /api/companies/{{step_2.companyId}}                    │ │
│  │ Output: companyName, industry                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [+ Add Another Step]                                            │
│                                                                  │
│  ⚠️ Tip: Each step can use outputs from previous steps using    │
│     {{step_N.fieldName}} syntax                                 │
└─────────────────────────────────────────────────────────────────┘
```

**ResponseMappingStep.jsx** - Update for Multi-Step:

```javascript
┌─────────────────────────────────────────────────────────────────┐
│  Response Mapping                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Test All Steps:  [Run Full Test] ⚡                            │
│                                                                  │
│  Step 1 Response: ✓ Success (234ms)                            │
│  Step 2 Response: ✓ Success (456ms)                            │
│  Step 3 Response: ✓ Success (189ms)                            │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Combined Output Available for Mapping:                     │ │
│  │                                                             │ │
│  │ step_1.contactId = "contact_abc123"                        │ │
│  │ step_2.firstName = "John"                                  │ │
│  │ step_2.lastName = "Smith"                                  │ │
│  │ step_2.companyId = "company_xyz"                           │ │
│  │ step_3.companyName = "Acme Corp"                           │ │
│  │ step_3.industry = "Technology"                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Map to Contact Fields:                                          │
│  ┌──────────────────────┬──────────────────────────────────┐   │
│  │ Contact Field        │ Source                           │   │
│  ├──────────────────────┼──────────────────────────────────┤   │
│  │ first_name           │ {{step_2.firstName}}             │   │
│  │ last_name            │ {{step_2.lastName}}              │   │
│  │ metadata.company     │ {{step_3.companyName}}           │   │
│  │ metadata.industry    │ {{step_3.industry}}              │   │
│  └──────────────────────┴──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Backend Implementation Plan

### File Structure

```
backend/
├── src/
│   ├── services/
│   │   ├── connectorService.js          # CRUD operations for connectors
│   │   ├── connectorExecutionService.js # Orchestrates connector execution
│   │   ├── connectorTemplateService.js  # Manage templates
│   │   └── credentialService.js         # Encrypt/decrypt API credentials
│   ├── routes/
│   │   └── connectors.js                # API endpoints
│   ├── middleware/
│   │   └── connectorValidation.js       # Validate connector configs
│   └── utils/
│       ├── templateEngine.js            # Process {{variable}} syntax
│       ├── jsonPathExtractor.js         # Extract values from JSON responses
│       └── httpClient.js                # Axios wrapper with retry logic
├── trigger/
│   ├── connectorExecutionTask.js        # Main Trigger.dev task
│   ├── connectorStepExecutor.js         # Execute individual steps
│   └── connectorErrorHandler.js         # Error handling & retries
└── tests/
    ├── connectorExecution.test.js
    └── multiStepConnector.test.js
```

### API Endpoints

```javascript
// Connector Management
POST   /api/v1/connectors              # Create connector
GET    /api/v1/connectors              # List all connectors
GET    /api/v1/connectors/:id          # Get connector details
PUT    /api/v1/connectors/:id          # Update connector
DELETE /api/v1/connectors/:id          # Delete connector
POST   /api/v1/connectors/:id/test     # Test connector (all steps)
POST   /api/v1/connectors/:id/clone    # Clone connector

// Execution
POST   /api/v1/connectors/:id/execute  # Execute connector (triggers Trigger.dev task)
GET    /api/v1/connectors/:id/executions # Get execution history
GET    /api/v1/executions/:executionId # Get execution details

// Templates
GET    /api/v1/connector-templates     # List templates
POST   /api/v1/connector-templates/:id/install # Install template

// Credentials
POST   /api/v1/workspace/credentials   # Store API credentials
GET    /api/v1/workspace/credentials   # List stored credentials
DELETE /api/v1/workspace/credentials/:service # Delete credentials
```

---

## Trigger.dev Task Structure

### Main Execution Task

```typescript
// backend/trigger/connectorExecutionTask.js

import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from '@supabase/supabase-js';
import { executeStep } from './connectorStepExecutor';
import { applyFieldMappings } from '../src/utils/templateEngine';

export const executeConnector = task({
  id: "execute-connector",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  run: async (payload: {
    connectorId: string;
    contactId: string;
    workspaceId: string;
    inputs: Record<string, any>;
    flowRunId?: string;
  }, { ctx }) => {
    const startTime = Date.now();
    const { connectorId, contactId, workspaceId, inputs, flowRunId } = payload;

    logger.info(`🚀 Starting connector execution`, {
      connectorId,
      contactId,
      workspaceId
    });

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
      // Step 1: Load connector configuration
      const { data: connector, error: connectorError } = await supabase
        .from('connectors')
        .select('*')
        .eq('id', connectorId)
        .eq('workspace_id', workspaceId)
        .single();

      if (connectorError || !connector) {
        throw new Error(`Connector not found: ${connectorId}`);
      }

      if (!connector.enabled) {
        throw new Error(`Connector is disabled: ${connector.name}`);
      }

      logger.info(`📋 Loaded connector: ${connector.name}`, {
        type: connector.type,
        stepsCount: connector.config.steps?.length || 1
      });

      // Step 2: Create execution record
      const { data: execution, error: executionError } = await supabase
        .from('connector_executions')
        .insert({
          connector_id: connectorId,
          workspace_id: workspaceId,
          contact_id: contactId,
          flow_run_id: flowRunId,
          status: 'running',
          input_data: inputs,
          started_at: new Date().toISOString(),
          trigger_run_id: ctx.run.id,
          steps_executed: []
        })
        .select()
        .single();

      if (executionError) {
        throw new Error(`Failed to create execution record: ${executionError.message}`);
      }

      logger.info(`📝 Created execution record: ${execution.id}`);

      // Step 3: Execute connector (single or multi-step)
      let finalOutput = {};
      const stepsExecuted = [];

      if (connector.type === 'multi-step' && connector.config.steps) {
        // Multi-step execution
        logger.info(`🔗 Executing multi-step connector (${connector.config.steps.length} steps)`);

        // Context accumulates outputs from all previous steps
        const context = { input: inputs };

        for (let i = 0; i < connector.config.steps.length; i++) {
          const step = connector.config.steps[i];
          const stepStartTime = Date.now();

          logger.info(`▶️  Executing Step ${i + 1}: ${step.name}`);

          // Update execution record with current step
          await supabase
            .from('connector_executions')
            .update({ current_step: step.id })
            .eq('id', execution.id);

          try {
            // Execute this step with context from previous steps
            const stepResult = await executeStep(step, context, workspaceId, supabase);

            const stepDuration = Date.now() - stepStartTime;

            logger.info(`✅ Step ${i + 1} completed`, {
              stepId: step.id,
              duration: `${stepDuration}ms`,
              outputKeys: Object.keys(stepResult.output)
            });

            // Store step result
            stepsExecuted.push({
              step_id: step.id,
              step_name: step.name,
              status: 'success',
              duration_ms: stepDuration,
              response: stepResult.rawResponse,
              output: stepResult.output
            });

            // Add step output to context for next steps
            context[step.id] = stepResult.output;

            // Also add as step_N for easier referencing
            context[`step_${i + 1}`] = stepResult.output;

          } catch (stepError) {
            logger.error(`❌ Step ${i + 1} failed`, {
              stepId: step.id,
              error: stepError.message
            });

            stepsExecuted.push({
              step_id: step.id,
              step_name: step.name,
              status: 'failed',
              duration_ms: Date.now() - stepStartTime,
              error: stepError.message
            });

            // If continue_on_error is false, stop execution
            if (!connector.continue_on_error) {
              throw stepError;
            }
          }
        }

        // All steps completed, prepare final output
        finalOutput = context;

      } else {
        // Single-step execution (backward compatibility)
        logger.info(`🔹 Executing single-step connector`);

        const stepConfig = connector.config.steps?.[0] || connector.config;
        const stepResult = await executeStep(stepConfig, { input: inputs }, workspaceId, supabase);

        stepsExecuted.push({
          step_id: 'single_step',
          step_name: connector.name,
          status: 'success',
          duration_ms: Date.now() - startTime,
          response: stepResult.rawResponse,
          output: stepResult.output
        });

        finalOutput = stepResult.output;
      }

      // Step 4: Apply field mappings to contact
      logger.info(`🗺️  Applying field mappings to contact`);

      const mappedData = applyFieldMappings(
        connector.field_mappings,
        finalOutput
      );

      logger.info(`📊 Mapped data`, { fields: Object.keys(mappedData) });

      // Step 5: Update contact in database
      const { error: updateError } = await supabase
        .from('contacts')
        .update({
          ...mappedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (updateError) {
        throw new Error(`Failed to update contact: ${updateError.message}`);
      }

      logger.info(`💾 Contact updated successfully`);

      // Step 6: Update execution record as success
      const executionTime = Date.now() - startTime;

      await supabase
        .from('connector_executions')
        .update({
          status: 'success',
          output_data: finalOutput,
          steps_executed: stepsExecuted,
          execution_time_ms: executionTime,
          completed_at: new Date().toISOString()
        })
        .eq('id', execution.id);

      // Step 7: Update connector usage stats
      await supabase.rpc('increment_connector_stats', {
        p_connector_id: connectorId,
        p_success: true
      });

      logger.info(`✨ Connector execution completed successfully`, {
        executionId: execution.id,
        duration: `${executionTime}ms`,
        stepsExecuted: stepsExecuted.length
      });

      return {
        success: true,
        executionId: execution.id,
        contactId,
        enrichedFields: Object.keys(mappedData),
        stepsExecuted: stepsExecuted.length,
        executionTimeMs: executionTime
      };

    } catch (error) {
      logger.error(`💥 Connector execution failed`, {
        connectorId,
        error: error.message,
        stack: error.stack
      });

      // Update execution record as failed
      if (execution?.id) {
        await supabase
          .from('connector_executions')
          .update({
            status: 'failed',
            error_message: error.message,
            error_stack: error.stack,
            execution_time_ms: Date.now() - startTime,
            completed_at: new Date().toISOString()
          })
          .eq('id', execution.id);
      }

      // Update connector failure stats
      await supabase.rpc('increment_connector_stats', {
        p_connector_id: connectorId,
        p_success: false
      });

      throw error;
    }
  },
});
```

### Step Executor

```typescript
// backend/trigger/connectorStepExecutor.js

import axios from 'axios';
import { logger } from "@trigger.dev/sdk/v3";
import { interpolateTemplate } from '../src/utils/templateEngine';
import { extractJsonPath } from '../src/utils/jsonPathExtractor';
import { decryptCredentials } from '../src/services/credentialService';

export async function executeStep(
  stepConfig: any,
  context: Record<string, any>,
  workspaceId: string,
  supabase: any
) {
  const stepStartTime = Date.now();

  // Step 1: Interpolate URL with context variables
  const url = interpolateTemplate(stepConfig.url, context);
  logger.info(`🌐 Request URL: ${url}`);

  // Step 2: Build query parameters
  const queryParams = {};
  if (stepConfig.queryParams) {
    for (const param of stepConfig.queryParams) {
      const value = interpolateTemplate(param.value, context);
      queryParams[param.key] = value;
    }
  }

  // Step 3: Build headers
  const headers = {};
  if (stepConfig.headers) {
    for (const header of stepConfig.headers) {
      const value = interpolateTemplate(header.value, context);
      headers[header.key] = value;
    }
  }

  // Step 4: Handle authentication
  if (stepConfig.auth) {
    const auth = stepConfig.auth;

    // If auth references workspace credentials, load them
    if (auth.token?.startsWith('{{workspace.')) {
      const serviceName = auth.token.match(/{{workspace\.(\w+)_token}}/)?.[1];
      if (serviceName) {
        const { data: credentials } = await supabase
          .from('workspace_api_credentials')
          .select('credentials')
          .eq('workspace_id', workspaceId)
          .eq('service_name', serviceName)
          .single();

        if (credentials) {
          const decrypted = await decryptCredentials(credentials.credentials);
          auth.token = decrypted.token || decrypted.api_key;
        }
      }
    }

    // Apply auth to headers
    switch (auth.type) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${auth.token}`;
        break;
      case 'api-key':
        headers[auth.headerName || 'X-API-Key'] = auth.apiKey;
        break;
      case 'basic':
        const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
        break;
    }
  }

  // Step 5: Build request body
  let body = null;
  if (stepConfig.body && stepConfig.method !== 'GET') {
    const bodyString = JSON.stringify(stepConfig.body);
    const interpolated = interpolateTemplate(bodyString, context);
    body = JSON.parse(interpolated);
  }

  // Step 6: Execute HTTP request
  logger.info(`📤 Sending ${stepConfig.method} request`, {
    url,
    queryParams,
    hasBody: !!body
  });

  const response = await axios({
    method: stepConfig.method,
    url,
    params: queryParams,
    headers,
    data: body,
    timeout: stepConfig.timeout || 30000,
    validateStatus: (status) => status < 500 // Don't throw on 4xx
  });

  if (response.status >= 400) {
    throw new Error(`API returned ${response.status}: ${JSON.stringify(response.data)}`);
  }

  logger.info(`📥 Response received`, {
    status: response.status,
    duration: `${Date.now() - stepStartTime}ms`
  });

  // Step 7: Extract output fields using outputMapping
  const output = {};
  if (stepConfig.outputMapping) {
    for (const [key, jsonPath] of Object.entries(stepConfig.outputMapping)) {
      const value = extractJsonPath(response.data, jsonPath);
      output[key] = value;
      logger.info(`  ↳ ${key} = ${JSON.stringify(value)}`);
    }
  }

  return {
    rawResponse: response.data,
    output,
    status: response.status,
    durationMs: Date.now() - stepStartTime
  };
}
```

---

## Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Review existing schema via Supabase MCP
- [ ] Create/update `connectors` table with multi-step support
- [ ] Create `connector_executions` table
- [ ] Create `connector_templates` table
- [ ] Create `workspace_api_credentials` table
- [ ] Create RLS policies
- [ ] Create database functions (increment_connector_stats, etc.)

### Phase 2: Backend Core (Week 1-2)
- [ ] Implement `connectorService.js` (CRUD)
- [ ] Implement `credentialService.js` (encryption)
- [ ] Implement `templateEngine.js` ({{variable}} interpolation)
- [ ] Implement `jsonPathExtractor.js` (extract nested values)
- [ ] Create API routes
- [ ] Add validation middleware

### Phase 3: Trigger.dev Integration (Week 2)
- [ ] Implement `connectorExecutionTask.js`
- [ ] Implement `connectorStepExecutor.js`
- [ ] Add error handling and retries
- [ ] Test single-step execution
- [ ] Test multi-step execution
- [ ] Add comprehensive logging

### Phase 4: UI Enhancements (Week 3)
- [ ] Update `ApiConfigStep.jsx` for multi-step support
- [ ] Add step editor component
- [ ] Update `ResponseMappingStep.jsx` for multi-step testing
- [ ] Add execution history viewer
- [ ] Add real-time execution status
- [ ] Create connector templates library

### Phase 5: Flow Builder Integration (Week 3-4)
- [ ] Add "Connector" action node type
- [ ] Generate dynamic form fields from input_schema
- [ ] Handle connector execution in flow runtime
- [ ] Add connector execution to flow logs
- [ ] Test end-to-end workflow

### Phase 6: Testing & Documentation (Week 4)
- [ ] Unit tests for all services
- [ ] Integration tests for Trigger.dev tasks
- [ ] E2E tests for full connector execution
- [ ] Performance testing (100+ concurrent executions)
- [ ] User documentation
- [ ] API documentation

---

## Testing Strategy

### Unit Tests

```javascript
// backend/tests/connectorExecution.test.js

describe('Multi-Step Connector Execution', () => {
  it('should execute all steps in sequence', async () => {
    const connector = {
      type: 'multi-step',
      steps: [
        { id: 'step_1', method: 'GET', url: 'https://api.example.com/search' },
        { id: 'step_2', method: 'GET', url: 'https://api.example.com/details/{{step_1.id}}' }
      ]
    };

    const result = await executeConnector.trigger({
      connectorId: 'test_connector',
      contactId: 'test_contact',
      workspaceId: 'test_workspace',
      inputs: { email: 'test@example.com' }
    });

    expect(result.success).toBe(true);
    expect(result.stepsExecuted).toBe(2);
  });

  it('should pass data between steps', async () => {
    // Test that step 2 receives output from step 1
  });

  it('should handle step failures gracefully', async () => {
    // Test continue_on_error behavior
  });
});
```

### Integration Tests

```javascript
// Test with real APIs (using test accounts)
describe('Real API Integration', () => {
  it('should enrich contact from HubSpot', async () => {
    // Test with HubSpot sandbox account
  });

  it('should validate email with ZeroBounce', async () => {
    // Test with ZeroBounce test API
  });
});
```

---

## Security Considerations

### 1. Credential Encryption
```javascript
// All API keys/tokens stored encrypted (AES-256)
// Decrypted only during execution, never logged
```

### 2. Workspace Isolation
```javascript
// RLS policies ensure connectors can only access their workspace data
// Trigger.dev tasks validate workspace_id before execution
```

### 3. Rate Limiting
```javascript
// Prevent abuse: max 100 connector executions per workspace per minute
// Implemented at API gateway level
```

### 4. Input Validation
```javascript
// Validate all user inputs before interpolation
// Prevent injection attacks via template variables
```

### 5. Audit Logging
```javascript
// Log all connector executions
// Track who created/modified connectors
// Monitor for suspicious patterns
```

---

## Next Steps

1. ✅ **Review this plan** - Get feedback and approval
2. ⏳ **Review current UI** - Verify existing components
3. ⏳ **Review database via Supabase MCP** - Check current schema
4. ⏳ **Create detailed implementation checklist** - Break down into tasks
5. ⏳ **Start Phase 1** - Database setup

---

## Questions to Address

1. **Should we support conditional steps?** (e.g., only run Step 3 if Step 2 returns certain data)
2. **Should we support parallel step execution?** (e.g., call 3 APIs simultaneously)
3. **How do we handle API rate limits?** (queue, delay, fail?)
4. **Should connectors be shareable across workspaces?** (marketplace?)
5. **What's the max number of steps allowed?** (suggest: 5-10)

---

*This plan will be updated as we progress through implementation.*

