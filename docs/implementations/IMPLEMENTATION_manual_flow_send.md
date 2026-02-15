# Manual Flow Send to Contact - Implementation Document

## Overview
Enable users to manually send/execute flows to specific contacts from the Contact Page (ContactsPageV2.js).

**Goal**: Add a "Send Flow" action that allows users to select a flow and trigger it for one or more selected contacts.

---

## System Architecture Diagram

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React / Chakra UI)                          │
│                                                                           │
│  ┌─────────────────────┐         ┌──────────────────────┐              │
│  │  ContactsPageV2.js  │────────▶│  SendFlowModal.js    │              │
│  │                     │         │                       │              │
│  │  • Contact List     │         │  • Flow Selector     │              │
│  │  • Bulk Actions     │         │  • Progress Bar      │              │
│  │  • 3-dot Menu       │         │  • Toast Messages    │              │
│  └─────────────────────┘         └──────────────────────┘              │
│                                            │                              │
│                                            │ API Call                     │
│                                            ▼                              │
│                                   ┌────────────────┐                     │
│                                   │  Supabase SDK  │                     │
│                                   │  (Load Flows)  │                     │
│                                   └────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS POST
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                           │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  /api/unified-workflow/execute-for-contact               │          │
│  │                                                            │          │
│  │  1. Validate Contact Exists                               │          │
│  │  2. Validate Flow Exists                                  │          │
│  │  3. Prepare Payload                                       │          │
│  │  4. Trigger Workflow Task                                 │          │
│  └──────────────────────────────────────────────────────────┘          │
│                                            │                              │
│                                            ▼                              │
│                                   ┌────────────────┐                     │
│                                   │  Supabase SDK  │                     │
│                                   │  (Validation)  │                     │
│                                   └────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Trigger Task
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRIGGER.DEV                                      │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────┐          │
│  │  trigger-workflow Task                                    │          │
│  │                                                            │          │
│  │  1. Parse Workflow Definition                             │          │
│  │  2. Execute Nodes Sequentially                            │          │
│  │  3. Handle Actions (SMS, Email, Delay, etc.)             │          │
│  │  4. Update Execution Status                               │          │
│  └──────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Write Results
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE (PostgreSQL)                        │
│                                                                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐     │
│  │    flows     │  │ flow_executions  │  │ flow_execution_steps │     │
│  │              │  │                  │  │                      │     │
│  │  • id        │  │  • id            │  │  • id                │     │
│  │  • name      │  │  • flow_id       │  │  • execution_id      │     │
│  │  • nodes     │  │  • contact_id    │  │  • node_id           │     │
│  │  • edges     │  │  • status        │  │  • status            │     │
│  └──────────────┘  │  • source        │  │  • result            │     │
│                     │  • started_at    │  └──────────────────────┘     │
│                     └──────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Frontend to Backend Flow

### Single Contact Flow Send

```
USER                 FRONTEND                    BACKEND                 TRIGGER.DEV              DATABASE
  │                     │                           │                         │                        │
  │ Click "Send Flow"   │                           │                         │                        │
  ├────────────────────▶│                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ Open Modal                │                         │                        │
  │                     │ Load Flows                │                         │                        │
  │                     ├──────────────────────────────────────────────────────────────────────────▶│
  │                     │                           │                         │   SELECT * FROM flows  │
  │                     │◀──────────────────────────────────────────────────────────────────────────┤
  │                     │                           │                         │   WHERE workspace_id   │
  │                     │                           │                         │                        │
  │ Select Flow         │                           │                         │                        │
  │ Click "Send Flow"   │                           │                         │                        │
  ├────────────────────▶│                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ POST /execute-for-contact │                         │                        │
  │                     ├──────────────────────────▶│                         │                        │
  │                     │                           │                         │                        │
  │                     │                           │ Validate Contact        │                        │
  │                     │                           ├────────────────────────────────────────────────▶│
  │                     │                           │                         │   SELECT * FROM        │
  │                     │                           │◀────────────────────────────────────────────────┤
  │                     │                           │                         │   contacts WHERE id    │
  │                     │                           │                         │                        │
  │                     │                           │ Validate Flow           │                        │
  │                     │                           ├────────────────────────────────────────────────▶│
  │                     │                           │                         │   SELECT * FROM        │
  │                     │                           │◀────────────────────────────────────────────────┤
  │                     │                           │                         │   flows WHERE id       │
  │                     │                           │                         │                        │
  │                     │                           │ Prepare Payload         │                        │
  │                     │                           │ {                       │                        │
  │                     │                           │   workflowId,           │                        │
  │                     │                           │   workspaceId,          │                        │
  │                     │                           │   contact: {...}        │                        │
  │                     │                           │ }                       │                        │
  │                     │                           │                         │                        │
  │                     │                           │ Trigger Workflow        │                        │
  │                     │                           ├────────────────────────▶│                        │
  │                     │                           │                         │                        │
  │                     │                           │                         │ Create Execution       │
  │                     │                           │                         ├───────────────────────▶│
  │                     │                           │                         │   INSERT INTO          │
  │                     │                           │                         │   flow_executions      │
  │                     │                           │                         │   (status: 'pending')  │
  │                     │                           │                         │                        │
  │                     │                           │                         │ Execute Nodes          │
  │                     │                           │                         │ ┌──────────────────┐  │
  │                     │                           │                         │ │ Node 1: Start    │  │
  │                     │                           │                         │ └──────────────────┘  │
  │                     │                           │                         │ ┌──────────────────┐  │
  │                     │                           │                         │ │ Node 2: Send SMS │  │
  │                     │                           │                         │ └──────────────────┘  │
  │                     │                           │                         │ ┌──────────────────┐  │
  │                     │                           │                         │ │ Node 3: Delay    │  │
  │                     │                           │                         │ └──────────────────┘  │
  │                     │                           │                         │                        │
  │                     │                           │                         │ Update Status          │
  │                     │                           │                         ├───────────────────────▶│
  │                     │                           │                         │   UPDATE               │
  │                     │                           │                         │   flow_executions      │
  │                     │                           │                         │   SET status =         │
  │                     │                           │                         │   'completed'          │
  │                     │                           │                         │                        │
  │                     │                           │ Return Task Handle      │                        │
  │                     │                           │◀────────────────────────┤                        │
  │                     │                           │ { taskId, status }      │                        │
  │                     │                           │                         │                        │
  │                     │ Response: Success         │                         │                        │
  │                     │◀──────────────────────────┤                         │                        │
  │                     │ { success: true,          │                         │                        │
  │                     │   taskId: "..." }         │                         │                        │
  │                     │                           │                         │                        │
  │ Success Toast       │                           │                         │                        │
  │◀────────────────────┤                           │                         │                        │
  │ "Flow sent          │                           │                         │                        │
  │  successfully"      │                           │                         │                        │
  │                     │                           │                         │                        │
```

---

## Bulk Flow Send (Multiple Contacts)

```
USER                 FRONTEND                    BACKEND                 TRIGGER.DEV              DATABASE
  │                     │                           │                         │                        │
  │ Select 3 Contacts   │                           │                         │                        │
  │ Click "Send Flow"   │                           │                         │                        │
  ├────────────────────▶│                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ Open Modal                │                         │                        │
  │                     │ Show: "3 contacts"        │                         │                        │
  │                     │                           │                         │                        │
  │ Select Flow         │                           │                         │                        │
  │ Click "Send Flow"   │                           │                         │                        │
  ├────────────────────▶│                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ ┌─────────────────────┐   │                         │                        │
  │                     │ │ FOR EACH CONTACT    │   │                         │                        │
  │                     │ │ (Sequential)        │   │                         │                        │
  │                     │ └─────────────────────┘   │                         │                        │
  │                     │                           │                         │                        │
  │                     │ Progress: 1/3             │                         │                        │
  │◀────────────────────┤                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ POST (Contact 1)          │                         │                        │
  │                     ├──────────────────────────▶│ Trigger Workflow       │                        │
  │                     │                           ├────────────────────────▶│ Execute Flow          │
  │                     │                           │                         ├───────────────────────▶│
  │                     │◀──────────────────────────┤                         │   INSERT execution_1   │
  │                     │ Success                   │                         │                        │
  │                     │                           │                         │                        │
  │                     │ Progress: 2/3             │                         │                        │
  │◀────────────────────┤                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ POST (Contact 2)          │                         │                        │
  │                     ├──────────────────────────▶│ Trigger Workflow       │                        │
  │                     │                           ├────────────────────────▶│ Execute Flow          │
  │                     │                           │                         ├───────────────────────▶│
  │                     │◀──────────────────────────┤                         │   INSERT execution_2   │
  │                     │ Success                   │                         │                        │
  │                     │                           │                         │                        │
  │                     │ Progress: 3/3             │                         │                        │
  │◀────────────────────┤                           │                         │                        │
  │                     │                           │                         │                        │
  │                     │ POST (Contact 3)          │                         │                        │
  │                     ├──────────────────────────▶│ Trigger Workflow       │                        │
  │                     │                           ├────────────────────────▶│ Execute Flow          │
  │                     │                           │                         ├───────────────────────▶│
  │                     │◀──────────────────────────┤                         │   INSERT execution_3   │
  │                     │ Success                   │                         │                        │
  │                     │                           │                         │                        │
  │ Success Toast       │                           │                         │                        │
  │◀────────────────────┤                           │                         │                        │
  │ "Flow sent to       │                           │                         │                        │
  │  3 contacts"        │                           │                         │                        │
  │                     │                           │                         │                        │
```

---

## Component Interaction Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          ContactsPageV2.js                                  │
│                                                                              │
│  State:                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ • selectedContacts: []                                          │        │
│  │ • isSendFlowModalOpen: false                                    │        │
│  │ • contactsForFlow: []                                           │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  UI Elements:                                                                │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │                                                                  │        │
│  │  ┌──────────────────────────────────────────────────────┐      │        │
│  │  │ Contact Row                                           │      │        │
│  │  │  [✓] John Doe  |  +1234567890  |  john@email.com    │      │        │
│  │  │                                          [⋮ Menu]     │      │        │
│  │  │                                            │          │      │        │
│  │  │                                            ├─ Add to Board   │        │
│  │  │                                            ├─ Add to Campaign│        │
│  │  │                                            ├─ Send Email     │        │
│  │  │                                            ├─ Send Flow  ◀───┼────┐  │
│  │  │                                            └─ Delete         │    │  │
│  │  └──────────────────────────────────────────────────────┘      │    │  │
│  │                                                                  │    │  │
│  │  [✓] 3 selected    [Bulk Actions ▼]                            │    │  │
│  │                      │                                           │    │  │
│  │                      ├─ Create Opportunity                      │    │  │
│  │                      ├─ Add to Board                            │    │  │
│  │                      ├─ Send Flow  ◀────────────────────────────┼────┤  │
│  │                      ├─ Add to Campaign                         │    │  │
│  │                      └─ Change Status                           │    │  │
│  │                                                                  │    │  │
│  └────────────────────────────────────────────────────────────────┘    │  │
│                                                                          │  │
│  Handlers:                                                               │  │
│  ┌────────────────────────────────────────────────────────────────┐    │  │
│  │ handleSendFlow(contact?)                                        │    │  │
│  │   ├─ Get contacts (single or selected)                         │    │  │
│  │   ├─ Validate contacts exist                                   │    │  │
│  │   ├─ setContactsForFlow(contacts)                              │    │  │
│  │   └─ setIsSendFlowModalOpen(true) ─────────────────────────────┼────┤  │
│  └────────────────────────────────────────────────────────────────┘    │  │
│                                                                          │  │
└──────────────────────────────────────────────────────────────────────────┘  │
                                                                               │
                                                                               │
                                                                               ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          SendFlowModal.js                                   │
│                                                                              │
│  Props:                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ • isOpen: boolean                                               │        │
│  │ • onClose: function                                             │        │
│  │ • contacts: Array<Contact>                                      │        │
│  │ • workspaceId: string                                           │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  State:                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ • flows: []                                                     │        │
│  │ • selectedFlowId: ''                                            │        │
│  │ • isLoading: false                                              │        │
│  │ • isSending: false                                              │        │
│  │ • sendProgress: { current: 0, total: 0 }                       │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  UI:                                                                         │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │  ┌──────────────────────────────────────────────────────┐      │        │
│  │  │ Send Flow to Contacts                           [X]   │      │        │
│  │  ├──────────────────────────────────────────────────────┤      │        │
│  │  │                                                       │      │        │
│  │  │ Selected Contacts (3):                               │      │        │
│  │  │ [John Doe] [Jane Smith] [Bob Wilson]                │      │        │
│  │  │                                                       │      │        │
│  │  │ Select Flow: *                                       │      │        │
│  │  │ ┌─────────────────────────────────────────────┐     │      │        │
│  │  │ │ Choose a flow to send               ▼       │     │      │        │
│  │  │ ├─────────────────────────────────────────────┤     │      │        │
│  │  │ │ Welcome Flow                                 │     │      │        │
│  │  │ │ Follow-up Sequence                          │     │      │        │
│  │  │ │ Appointment Reminder                        │     │      │        │
│  │  │ └─────────────────────────────────────────────┘     │      │        │
│  │  │                                                       │      │        │
│  │  │ ┌───────────────────────────────────────────┐       │      │        │
│  │  │ │ Flow Preview:              [5 steps]       │       │      │        │
│  │  │ │ Welcome Flow                               │       │      │        │
│  │  │ │ This flow will be executed for 3 contacts  │       │      │        │
│  │  │ └───────────────────────────────────────────┘       │      │        │
│  │  │                                                       │      │        │
│  │  │ Sending... 2/3                                       │      │        │
│  │  │ [████████████████░░░░░░░░] 66%                      │      │        │
│  │  │                                                       │      │        │
│  │  ├──────────────────────────────────────────────────────┤      │        │
│  │  │                    [Cancel]  [▶ Send Flow]           │      │        │
│  │  └──────────────────────────────────────────────────────┘      │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Functions:                                                                  │
│  ┌────────────────────────────────────────────────────────────────┐        │
│  │ loadFlows()                                                     │        │
│  │   ├─ Query Supabase: SELECT * FROM flows                       │        │
│  │   ├─ Filter: flows with nodes.length > 0                       │        │
│  │   └─ setFlows(validFlows)                                      │        │
│  │                                                                  │        │
│  │ handleSendFlow()                                                │        │
│  │   ├─ Validate selectedFlowId                                   │        │
│  │   ├─ FOR EACH contact:                                         │        │
│  │   │   ├─ setSendProgress({ current: i+1, total })             │        │
│  │   │   ├─ POST /api/unified-workflow/execute-for-contact       │        │
│  │   │   ├─ Collect result or error                              │        │
│  │   │   └─ Continue to next                                      │        │
│  │   ├─ Show success toast (if any succeeded)                    │        │
│  │   ├─ Show error toast (if any failed)                         │        │
│  │   └─ onClose() if all succeeded                               │        │
│  └────────────────────────────────────────────────────────────────┘        │
│                                                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Analysis (via Supabase MCP)

### Key Tables

#### 1. `flows` Table
```sql
- id: UUID (PK)
- name: TEXT (NOT NULL)
- workspace_id: TEXT
- folder_id: UUID (FK to flow_folders)
- nodes: JSONB (ReactFlow nodes definition)
- edges: JSONB (ReactFlow edges definition)
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
```

#### 2. `flow_executions` Table
```sql
- id: UUID (PK)
- flow_id: UUID (FK to flows)
- contact_id: UUID (FK to contacts)
- workspace_id: TEXT (NOT NULL)
- status: TEXT (NOT NULL) 
  -- CHECK: 'pending', 'running', 'completed', 'failed', 'cancelled', 'partial_failure'
- source: TEXT ('manual', 'scheduled', 'webhook', 'trigger_workflow_task', etc.)
- started_at: TIMESTAMP WITH TIME ZONE
- completed_at: TIMESTAMP WITH TIME ZONE
- result: JSONB
- error_message: TEXT
- execution_time: INTEGER (milliseconds)
- metadata: JSONB
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
```

#### 3. `contacts` Table (Relevant Fields)
```sql
- id: UUID (PK)
- phone_number: TEXT
- workspace_id: TEXT (NOT NULL)
- name: TEXT
- email: TEXT
- firstname: VARCHAR (NOT NULL)
- lastname: VARCHAR (NOT NULL)
- lead_status: VARCHAR
- conversation_status: TEXT (DEFAULT 'New')
- metadata: JSONB
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
```

### Sample Data Insights
- **Flows**: Active flows exist across multiple workspaces (e.g., "real test", "Scoring", "qwewe")
- **Flow Executions**: Historical executions show `source: 'trigger_workflow_task'` and `status: 'completed'`
- **Execution Pattern**: Flows can be executed multiple times for the same contact

---

## Existing API Endpoints (Discovered)

### Backend Routes

#### 1. **POST `/api/unified-workflow/execute-for-contact`**
**Location**: `backend/src/routes/unifiedWorkflowRoutes.js:196-308`

**Request Body**:
```javascript
{
  workflowId: string,     // Flow UUID
  workspaceId: string,    // Workspace ID
  contactId: string,      // Contact UUID
  isTest: boolean         // Optional, default false
}
```

**Response**:
```javascript
{
  success: true,
  taskId: string,         // Trigger.dev task ID
  workflowId: string,
  contactId: string,
  contactName: string,
  status: 'triggered',
  message: 'Workflow execution started for contact'
}
```

**Process**:
1. Validates contact exists in workspace
2. Validates flow exists in workspace
3. Prepares payload with contact data
4. Triggers Trigger.dev workflow task
5. Returns task handle

#### 2. **POST `/api/unified-workflow/execute-workflow`**
**Location**: `backend/src/routes/unifiedWorkflowRoutes.js:15-113`

**Request Body**:
```javascript
{
  workflowId: string,
  workspaceId: string,
  contactId: string,
  triggerData: object,
  workflowDefinition: object,  // Optional
  isTest: boolean,
  bypassDatabaseLookup: boolean
}
```

#### 3. **POST `/api/workflows/:workflowId/execute`**
**Location**: `backend/src/routes/workflowRoutes.js:15-93`

**Alternative endpoint** using `flowService.startFlow()`

---

## Frontend Service Methods

### FlowExecutionService
**Location**: `frontend/src/services/FlowExecutionService.js`

```javascript
class FlowExecutionService {
  async executeFlow(flowId, contactId, workspaceId, options = {}) {
    // Executes flow for a contact
    // Returns execution details
  }
}
```

### FlowService  
**Location**: `frontend/src/services/flowService.js`

```javascript
// List flows for workspace
async function listFlows(workspaceId) {
  const { data, error } = await supabase
    .from('flows')
    .select('id, name, workspace_id, nodes, edges')
    .eq('workspace_id', workspaceId)
    .order('name');
  return data;
}
```

---

## Implementation Plan

### Phase 1: UI Component - Flow Selector Modal

**File**: `frontend/src/components/contactV2/SendFlowModal.js`

```javascript
import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  VStack,
  Text,
  Select,
  FormControl,
  FormLabel,
  useToast,
  Spinner,
  Box,
  Badge,
  HStack,
  Alert,
  AlertIcon,
  AlertDescription
} from '@chakra-ui/react';
import { Play } from 'lucide-react';
import { supabase } from '../../services/supabase';

const SendFlowModal = ({ 
  isOpen, 
  onClose, 
  contacts = [],  // Array of contact objects
  workspaceId 
}) => {
  const [flows, setFlows] = useState([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const toast = useToast();

  // Load flows when modal opens
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadFlows();
    }
  }, [isOpen, workspaceId]);

  const loadFlows = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('id, name, workspace_id, created_at')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      setFlows(data || []);
    } catch (error) {
      console.error('Error loading flows:', error);
      toast({
        title: 'Error loading flows',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFlow = async () => {
    if (!selectedFlowId) {
      toast({
        title: 'No flow selected',
        description: 'Please select a flow to send',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSending(true);
    const results = [];
    const errors = [];

    try {
      // Send flow to each selected contact
      for (const contact of contacts) {
        try {
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL || 'https://cc.automate8.com'}/api/unified-workflow/execute-for-contact`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                workflowId: selectedFlowId,
                workspaceId: workspaceId,
                contactId: contact.id,
                isTest: false
              }),
            }
          );

          const data = await response.json();

          if (data.success) {
            results.push({
              contactId: contact.id,
              contactName: contact.name || `${contact.firstname} ${contact.lastname}`,
              taskId: data.taskId
            });
          } else {
            errors.push({
              contactId: contact.id,
              contactName: contact.name || `${contact.firstname} ${contact.lastname}`,
              error: data.error
            });
          }
        } catch (error) {
          errors.push({
            contactId: contact.id,
            contactName: contact.name || `${contact.firstname} ${contact.lastname}`,
            error: error.message
          });
        }
      }

      // Show results
      if (results.length > 0) {
        toast({
          title: 'Flow sent successfully',
          description: `Flow sent to ${results.length} contact${results.length > 1 ? 's' : ''}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      }

      if (errors.length > 0) {
        toast({
          title: 'Some flows failed to send',
          description: `${errors.length} contact${errors.length > 1 ? 's' : ''} failed`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }

      // Close modal on success
      if (errors.length === 0) {
        onClose();
      }

    } catch (error) {
      console.error('Error sending flow:', error);
      toast({
        title: 'Error sending flow',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSending(false);
    }
  };

  const selectedFlow = flows.find(f => f.id === selectedFlowId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Send Flow to Contact{contacts.length > 1 ? 's' : ''}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4} align="stretch">
            {/* Contact Summary */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                Selected Contacts:
              </Text>
              <HStack spacing={2} flexWrap="wrap">
                {contacts.slice(0, 3).map((contact) => (
                  <Badge key={contact.id} colorScheme="blue">
                    {contact.name || `${contact.firstname} ${contact.lastname}`}
                  </Badge>
                ))}
                {contacts.length > 3 && (
                  <Badge colorScheme="gray">
                    +{contacts.length - 3} more
                  </Badge>
                )}
              </HStack>
            </Box>

            {/* Flow Selector */}
            <FormControl isRequired>
              <FormLabel>Select Flow</FormLabel>
              {isLoading ? (
                <Box textAlign="center" py={4}>
                  <Spinner size="sm" />
                  <Text fontSize="sm" mt={2}>Loading flows...</Text>
                </Box>
              ) : flows.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  <AlertDescription>
                    No flows available in this workspace
                  </AlertDescription>
                </Alert>
              ) : (
                <Select
                  placeholder="Choose a flow"
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                >
                  {flows.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.name}
                    </option>
                  ))}
                </Select>
              )}
            </FormControl>

            {/* Preview */}
            {selectedFlow && (
              <Box p={3} bg="gray.50" borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  Flow Preview:
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {selectedFlow.name}
                </Text>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  This flow will be executed for {contacts.length} contact{contacts.length > 1 ? 's' : ''}
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose} isDisabled={isSending}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            leftIcon={<Play size={16} />}
            onClick={handleSendFlow}
            isLoading={isSending}
            loadingText="Sending..."
            isDisabled={!selectedFlowId || flows.length === 0}
          >
            Send Flow
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default SendFlowModal;
```

---

### Phase 2: Integrate into ContactsPageV2

**File**: `frontend/src/components/contactV2/ContactsPageV2.js`

**Changes Required**:

1. **Import the modal**:
```javascript
import SendFlowModal from './SendFlowModal';
```

2. **Add state for modal**:
```javascript
const [isSendFlowModalOpen, setIsSendFlowModalOpen] = useState(false);
```

3. **Add handler function**:
```javascript
const handleSendFlow = (contact) => {
  // If single contact is passed, use that, otherwise use all selected contacts
  const contactsToSend = contact ? [contact] : 
    contacts.filter(c => selectedContacts.includes(c.id));
  
  if (contactsToSend.length === 0) {
    toast({
      title: "No Contacts Selected",
      description: "Please select at least one contact",
      status: "warning",
      duration: 3000,
      isClosable: true,
      position: "top-right",
    });
    return;
  }

  setSelectedContactsForBoard(contactsToSend);
  setIsSendFlowModalOpen(true);
};
```

4. **Add menu item in actions dropdown** (around line 1480):
```javascript
<MenuItem
  icon={<Icon as={Play} size={14} />}
  onClick={() => handleSendFlow(contact)}
>
  Send Flow
</MenuItem>
```

5. **Add bulk action menu item** (around line 1640):
```javascript
<MenuItem
  icon={<Icon as={Play} size={14} />}
  onClick={() => handleSendFlow()}
>
  Send Flow
</MenuItem>
```

6. **Add modal at the end** (around line 1816):
```javascript
<SendFlowModal
  isOpen={isSendFlowModalOpen}
  onClose={() => {
    setIsSendFlowModalOpen(false);
    setSelectedContactsForBoard([]);
  }}
  contacts={selectedContactsForBoard}
  workspaceId={currentWorkspace?.id}
/>
```

---

### Phase 3: Testing Checklist

#### Unit Tests
- [ ] Modal opens and closes correctly
- [ ] Flows load from Supabase
- [ ] Flow selection updates state
- [ ] API call is made with correct payload
- [ ] Success/error toasts display properly

#### Integration Tests
- [ ] Single contact flow send
- [ ] Multiple contacts flow send (bulk)
- [ ] Flow execution creates `flow_executions` record
- [ ] Flow execution triggers Trigger.dev task
- [ ] Error handling for invalid flow/contact

#### User Acceptance Tests
- [ ] User can select a contact and send a flow
- [ ] User can select multiple contacts and send a flow
- [ ] User sees confirmation when flow is sent
- [ ] User sees error message if flow fails
- [ ] Flow execution appears in Flow Builder "Enrollment History" tab

---

## Database Verification Queries

### Check Flow Execution Created
```sql
SELECT 
  fe.id,
  fe.flow_id,
  fe.contact_id,
  fe.status,
  fe.source,
  fe.started_at,
  f.name as flow_name,
  c.firstname || ' ' || c.lastname as contact_name
FROM flow_executions fe
JOIN flows f ON fe.flow_id = f.id
JOIN contacts c ON fe.contact_id = c.id
WHERE fe.workspace_id = 'YOUR_WORKSPACE_ID'
ORDER BY fe.created_at DESC
LIMIT 10;
```

### Check Flow Execution Steps
```sql
SELECT 
  fes.id,
  fes.flow_execution_id,
  fes.node_id,
  fes.node_type,
  fes.status,
  fes.started_at,
  fes.completed_at
FROM flow_execution_steps fes
WHERE fes.flow_execution_id = 'YOUR_EXECUTION_ID'
ORDER BY fes.created_at;
```

---

## Error Handling

### Common Errors and Solutions

1. **Flow not found**
   - Verify flow exists in workspace
   - Check workspace_id matches

2. **Contact not found**
   - Verify contact exists in workspace
   - Check contact_id is valid UUID

3. **API endpoint not reachable**
   - Verify backend URL is correct
   - Check CORS settings
   - Verify authentication headers

4. **Trigger.dev task fails**
   - Check Trigger.dev logs
   - Verify workflow definition is valid
   - Check node configurations

---

## Future Enhancements

1. **Flow Preview**: Show flow nodes/steps before sending
2. **Schedule Flow**: Allow scheduling flow for future execution
3. **Flow Templates**: Quick access to commonly used flows
4. **Execution History**: View past flow executions for a contact
5. **Batch Progress**: Show progress bar for bulk flow sends
6. **Flow Variables**: Allow user to set custom variables before sending
7. **Conditional Sending**: Only send if contact meets certain criteria

---

## Related Files

### Frontend
- `frontend/src/components/contactV2/ContactsPageV2.js` - Main contact list
- `frontend/src/components/contactV2/SendFlowModal.js` - New modal component
- `frontend/src/services/flowService.js` - Flow data service
- `frontend/src/services/FlowExecutionService.js` - Execution service

### Backend
- `backend/src/routes/unifiedWorkflowRoutes.js` - API endpoints
- `backend/src/services/flowService.js` - Flow execution logic
- `trigger/unifiedWorkflows.js` - Trigger.dev workflow definitions

### Database
- `backend/migrations/flow_executions.sql` - Flow executions schema
- `supabaseSchema/supabase_migrations/20250223_flow_management.sql` - Flow management schema

---

## Cursor Rules Used
- `.cursor/rules/database-schema-patterns.mdc` - Database schema patterns
- `.cursor/rules/flow-builder-ui-patterns.mdc` - Flow Builder UI patterns
- `.cursor/rules/testing-and-debugging-workflows.mdc` - Testing patterns

---

**Document Created**: 2025-01-17
**Last Updated**: 2025-01-17
**Status**: Ready for Implementation

