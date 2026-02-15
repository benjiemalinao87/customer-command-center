# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Root Level
- `npm run postinstall` - Installs dependencies for both frontend and backend
- `npm start` - Starts frontend development server
- `npm run build` - Builds frontend for production
- `npm run build:dev` - Builds frontend for development
- `npm run build:prod` - Builds frontend for production

### Frontend
- `cd frontend && npm start` - Start React development server with hot reload
- `cd frontend && npm run build` - Create production build
- `cd frontend && npm run build:dev` - Create development build
- `cd frontend && npm run build:prod` - Create production build
- `cd frontend && npm test` - Run tests
- `cd frontend && npm run serve` - Serve production build locally

### Backend v1 (Express - Legacy)
- `cd backend && npm start` - Start Express server

### Trigger.dev (Root Level - Background Jobs)
- `npx trigger dev` - Start Trigger.dev development server (from project root)
- `npx trigger deploy` - Deploy Trigger.dev tasks to cloud
- **Config**: `trigger.config.ts` at project root
- **Tasks Directory**: `trigger/` at project root

### Backend v2 (Cloudflare Workers - API v2)
- `cd cloudflare-workers/api-v2 && wrangler dev` - Start local Workers development
- `cd cloudflare-workers/api-v2 && wrangler deploy` - Deploy to Cloudflare edge
- `cd cloudflare-workers/api-v2 && wrangler d1 migrations apply` - Apply D1 migrations
- `cd cloudflare-workers/api-v2 && wrangler r2 bucket create` - Create R2 buckets
- `cd cloudflare-workers/api-v2 && wrangler queues create` - Set up Cloudflare Queues
- `cd cloudflare-workers/api-v2 && wrangler tail` - View live logs from edge

### Testing & Quality
- `cd frontend && npm test` - Run Jest tests with React Testing Library
- `cd frontend && npm run test -- --coverage` - Run tests with coverage report
- Use ESLint and Prettier for code quality (configured in frontend via CRACO)
- No specific lint/typecheck commands configured - TypeScript compilation happens during build
- Frontend uses CRACO for Create React App configuration overrides

## Architecture Overview

### High-Level Structure
This is a full-stack CRM and messaging application with real-time chat capabilities, built with:
- **Frontend**: React 19 + Chakra UI (strict framework) + Socket.IO client
- **Backend v1**: Node.js + Express + Socket.IO server (Legacy)
- **Backend v2**: Cloudflare Workers + Durable Objects + D1 + R2 + Queue + Workflows + AI (Migration Target)
- **Database**: D1 (SQLite) + Supabase (PostgreSQL) - Hybrid during migration
- **External Services**: Twilio (SMS/Voice), Trigger.dev (background jobs), Resend (email)

### Core Application Flow (API v2 Target Architecture)
```
Frontend (React + Chakra UI) → Cloudflare Workers API v2 → D1 Database
                              ↓
                    Cloudflare Stack Integration:
                    ├── Durable Objects (real-time state)
                    ├── R2 (file storage)
                    ├── Queue (background jobs)
                    ├── Workflows (automation)
                    └── Worker AI (intelligent features)
```

### Migration Strategy: Express → Cloudflare Workers

#### Phase 1: Foundation (Current State)
- **Status**: ✅ Complete
- **Express Backend**: API v1 with full functionality
- **Cloudflare Workers**: Webhook processing and contact caching
- **Database**: Supabase PostgreSQL with RLS
- **Real-time**: Socket.IO for messaging

#### Phase 2: Core API Migration (In Progress)
- **Messaging API**: Migrate real-time messaging to Durable Objects
- **Authentication**: Move auth endpoints to Workers with D1 sessions
- **CRM Operations**: Contact and board management on D1
- **File Handling**: Implement R2 for attachments and media
- **Background Jobs**: Replace BullMQ with Cloudflare Queues

#### Phase 3: Advanced Features (Planned)
- **AI Integration**: Deploy Worker AI for conversation analysis
- **Complex Workflows**: Migrate automation to Cloudflare Workflows  
- **Analytics**: Edge-based performance metrics and reporting
- **Multi-region**: Global edge deployment with data locality
- **Cost Optimization**: Serverless scaling replacing always-on servers

#### Migration Approach
- **Endpoint-by-Endpoint**: Gradual migration maintaining compatibility
- **Dual Deployment**: Run both APIs during transition
- **Feature Parity**: Ensure no functionality loss during migration
- **Performance Testing**: Verify sub-50ms response times
- **Data Migration**: Supabase → D1 with zero downtime

### Key Architectural Patterns

#### 1. Workspace-Based Multi-Tenancy
- All data is workspace-scoped with RLS (Row Level Security)
- Contacts, messages, and configurations are isolated per workspace
- User can belong to multiple workspaces

#### 2. Real-Time Messaging System
- Socket.IO for real-time bidirectional communication
- Message deduplication and queue processing
- Twilio integration for SMS delivery
- Message status tracking (sent/delivered/failed)

#### 3. CRM Pipeline Management
- Customizable sales pipeline stages per workspace
- Multiple pipeline types: Lead Status, Appointment Status, Result Status
- Board-based contact organization with drag-and-drop
- Pipeline visibility can be configured per board

#### 4. Window Management System (macOS-style)
- Dock-based navigation with draggable windows
- Each window maintains independent state (search, filters, position)
- Context-based state management for window isolation

### Frontend Architecture

#### State Management Strategy
- **Local State**: `useState`, `useReducer` for component-specific state
- **Global State**: React Context for auth, workspace, theme
- **Advanced State**: Zustand for complex state management
- **Server State**: Direct Supabase client calls (no React Query currently)
- **Real-time**: Socket.IO + custom hooks for live updates

#### Build Configuration
- **Build Tool**: CRACO (Create React App Configuration Override)
- **TypeScript**: Full TypeScript support with strict type checking
- **Bundling**: Uses webpack with custom configurations via CRACO
- **Environment Handling**: env-cmd for environment-specific builds

#### Component Organization
```
components/
├── auth/           # Authentication components
├── board/          # Board view and pipeline management
├── contacts/       # Contact management and search
├── dock/           # Navigation dock system
├── livechat/       # Real-time messaging interface
├── windows/        # Window management components
└── automation/     # Flow builder and triggers
```

#### Key Frontend Services
- `messageService.js`: Central message handling, deduplication, Twilio integration
- `callService.js`: Outgoing call management with Twilio Voice SDK integration
- `supabaseClient.js`: Database connection and auth
- `socket.js`: WebSocket connection management
- `boardService.js`: Pipeline and board operations
- `boardCacheService.js`: Smart caching system with TTL and workspace isolation
- `boardContactCache.js`: Contact data caching with column-specific storage
- `boardStructureCache.js`: Board and column configuration caching
- `apiCacheService.js`: API response caching with automatic invalidation
- `searchCacheService.js`: Search results and filter caching
- `cachePerformanceMonitor.js`: Real-time cache performance monitoring

#### UI Framework Strategy (Strict Chakra UI)
- **Primary Framework**: Chakra UI exclusively - NO exceptions
- **Component Standards**: All UI components must use Chakra UI system
- **Design Tokens**: Leverage Chakra's theme system for consistency
- **Migration Priority**: Replace ALL Material UI components with Chakra equivalents
- **Custom Components**: Build using Chakra primitives and theme system

#### Key Frontend Libraries
- **UI Framework**: Chakra UI (strict - NO Material UI mixing)
- **Drag & Drop**: @hello-pangea/dnd, react-beautiful-dnd (wrap with Chakra styling)
- **Flow Builder**: @xyflow/react (ReactFlow) with Chakra theme integration
- **Charts**: Recharts with Chakra color tokens for consistency
- **Calendar**: FullCalendar with Chakra theme override
- **Voice**: @vapi-ai/web for voice calling integration
- **Real-time**: Socket.IO client transitioning to Durable Objects

### Backend Architecture

#### API v1 (Express - Legacy)
```
backend/src/
├── controllers/    # Request handlers
├── services/       # Business logic layer
├── routes/         # API endpoints
├── middleware/     # Auth, rate limiting, validation
├── queues/         # Background job processing
└── migrations/     # Database schema changes
```

#### API v2 (Cloudflare Workers - Target)
```
cloudflare-workers/api-v2/
├── src/
│   ├── handlers/           # Worker request handlers
│   ├── services/           # Business logic (shared across workers)
│   ├── middleware/         # Auth, rate limiting, CORS
│   ├── durable-objects/    # Real-time state management
│   │   ├── chat-room.js    # Real-time messaging state
│   │   ├── presence.js     # User presence tracking
│   │   └── collaboration.js # Multi-user collaboration
│   ├── workflows/          # Long-running automation processes
│   │   ├── message-automation.js
│   │   ├── pipeline-workflows.js
│   │   └── ai-analysis.js
│   └── ai/                 # Worker AI integrations
│       ├── conversation-analysis.js
│       ├── content-generation.js
│       └── sentiment-analysis.js
├── schema/
│   ├── d1-migrations/      # D1 SQLite migrations
│   ├── r2-buckets/         # R2 bucket configurations
│   └── types/              # TypeScript definitions
└── config/
    ├── wrangler.toml       # Worker deployment config
    ├── bindings.ts         # Resource bindings (D1, R2, Queue)
    └── ai-models.ts        # Worker AI model configurations
```

#### Key Backend Services (API v1 - Legacy)
- `messageService.js`: Message processing and Twilio integration
- `queueService.js`: Background job management with BullMQ
- `boardService.js`: Pipeline and contact management
- `emailService.js`: Email sending via Resend/Nodemailer
- `rateLimitService.js`: API rate limiting

#### Key Services (API v2 - Cloudflare Workers)
- **messageHandler.js**: Real-time messaging with Durable Objects
- **queueProcessor.js**: Background jobs via Cloudflare Queues
- **boardManager.js**: CRM operations with D1 database
- **fileService.js**: R2 object storage for media/attachments
- **workflowEngine.js**: Complex automation via Cloudflare Workflows
- **aiService.js**: Intelligent features via Worker AI
- **realtimeSync.js**: Multi-user collaboration via Durable Objects

#### External Service Integration
- **Twilio**: SMS/MMS sending, voice calling, webhook handling for inbound messages/calls
- **Trigger.dev**: Background job processing, scheduling, and automation workflows
- **Supabase**: Database, auth, real-time subscriptions
- **Resend**: Email delivery service

## Trigger.dev Integration

### Overview
Trigger.dev is integrated as a comprehensive background job processing and automation platform, handling scheduled messages, workflow actions, and complex business logic execution.

### Configuration
**Project ID**: `proj_dcpsazbkeyuadjmckuib`
**Runtime**: Node.js
**Max Duration**: 3600 seconds (1 hour)
**Task Directory**: `trigger/` (at project root, NOT in backend)
**Config File**: `trigger.config.ts` (at project root)

### CRITICAL: unifiedWorkflows.js - Main Background Processor

**Location**: `trigger/unifiedWorkflows.js` (~10,000 lines)

This is the **primary workflow execution engine** for the entire application. It handles all automation flows, sequences, and background processing.

#### Main Task: `triggerWorkflowTask`
```javascript
export const triggerWorkflowTask = task({
  id: "trigger-workflow",
  maxDuration: 3600,        // 1 hour max
  machine: "micro",         // 0.25 vCPU, 0.25 GB RAM
  queue: workflowQueue,     // Shared queue (concurrencyLimit: 80)
});
```

#### Key Payload Structure
```javascript
{
  workflowId: string,           // Flow ID or Sequence ID
  workspaceId: string,          // Workspace for RLS
  contactId: string,            // Contact being processed
  triggerData: object,          // Trigger context (webhook data, etc.)
  workflowDefinition?: object,  // Optional inline definition (for sequences)
  isTest?: boolean,             // Test mode flag
  sequenceExecutionId?: string, // For sequence analytics tracking
  sequenceId?: string           // For sequence analytics tracking
}
```

#### Core Functions in unifiedWorkflows.js

| Function | Purpose |
|----------|---------|
| `triggerWorkflowTask` | Main entry point - executes entire workflow |
| `executeWorkflowStep()` | Handles individual node execution |
| `sendSMSDirectly()` | SMS sending with DNC/opt-out checks |
| `sendEmailDirectly()` | Email delivery via Resend |
| `sendEmailNotificationDirectly()` | Internal email notifications |
| `sendTeamsNotificationDirectly()` | Microsoft Teams integration |
| `sendSlackNotificationDirectly()` | Slack notification delivery |
| `addTagDirectly()` | Contact tagging |
| `removeTagDirectly()` | Tag removal |
| `addInternalNoteDirectly()` | Add notes to contacts |
| `httpRequestDirectly()` | External API calls with response mapping |
| `setVariableDirectly()` | Workflow variable management |
| `assignAgentDirectly()` | Agent assignment |
| `subscribeCampaignDirectly()` | Campaign enrollment |
| `createContactDirectly()` | New contact creation |
| `deleteContactDirectly()` | Contact deletion |
| `closeConversationDirectly()` | Close chat conversations |
| `markLeadStatusDNCDirectly()` | Mark as Do Not Contact |
| `setEmailOptInDirectly()` / `setEmailOptOutDirectly()` | Email preferences |
| `setSmsOptInDirectly()` / `setSmsOptOutDirectly()` | SMS preferences |
| `moveToBoardDirectly()` | Pipeline stage changes |
| `runJavaScriptDirectly()` | Custom code execution |
| `replaceTemplateVariables()` | Variable interpolation ({{contact.name}}, etc.) |
| `evaluateConditionForWorkflow()` | Conditional logic evaluation |
| `checkBusinessHours()` | Business hours validation |
| `hasActiveAppointment()` | Appointment status check |
| `convertSequenceToWorkflow()` | Sequence → Workflow conversion |

#### Workflow Execution Flow
```
1. Validate payload (workflowId, workspaceId, contactId)
2. Check enrollment eligibility (prevents duplicates)
3. Fetch workflow definition (with LRU caching)
4. Create flow_executions record
5. Find start node (trigger/start type or topological)
6. Execute nodes sequentially:
   - Create flow_execution_steps record
   - Execute step based on node type
   - Handle delays (wait.for, wait.until)
   - Check for cancellation (auto-stop on response)
   - Find next node via edges
7. Update execution status (completed/failed/cancelled)
```

#### Supported Node Types
- `start`, `trigger` - Flow entry points
- `send-message` - SMS/MMS sending
- `send-email` - Email delivery
- `email-notification` - Internal email alerts
- `teams-notification` - MS Teams messages
- `slack-notification` - Slack messages
- `delay`, `wait` - Time delays
- `condition`, `if-else` - Conditional branching
- `ab-test` - A/B testing with variant tracking
- `add-tag`, `remove-tag` - Tag management
- `add-internal-note` - Contact notes
- `http-request` - External API calls
- `set-variable` - Variable assignment
- `assign-agent` - Agent assignment
- `subscribe-campaign` - Campaign enrollment
- `create-contact` - Contact creation
- `delete-contact` - Contact removal
- `close-conversation` - End conversations
- `mark-dnc` - Do Not Contact flag
- `email-opt-in/out`, `sms-opt-in/out` - Preferences
- `move-to-board` - Pipeline changes
- `run-javascript` - Custom code
- `connector` - Third-party integrations

#### Caching System
```javascript
// In-memory LRU cache for workflow definitions
const workflowCache = new Map();
const WORKFLOW_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const WORKFLOW_CACHE_MAX_SIZE = 100;      // Max 100 workflows
```

#### Test Mode
When `isTest: true` is passed:
- Skips database operations
- Skips actual SMS/email sending
- Skips enrollment checks
- Returns simulated results

#### Sequence Analytics Integration
For sequences (vs regular flows), tracks:
- `sequenceExecutionId` - Links to flow_sequence_executions
- `sequenceId` - Links to flow_sequences
- Creates `flow_sequence_message_jobs` records for "Messages Sent" analytics

### Other Trigger.dev Tasks

| File | Tasks |
|------|-------|
| `messageJobs.js` | `send-sms-task`, `scheduled-message-task` |
| `actionTasks.js` | Individual action processors |
| `scheduleTasks.js` | Scheduled job management |
| `unifiedDelayTasks.js` | Delay/wait handling |
| `unifiedContactTasks.js` | Bulk contact operations |
| `unifiedAppointmentReminders.js` | Appointment notifications |
| `appointmentWebhookIntegrations.js` | Calendar integrations |
| `importContactsTasks.js` | CSV/bulk import processing |
| `backgroundJobTasks.js` | General background jobs |
| `email-open-processor.js` | Email tracking |
| `trigger-event-processor.js` | Event-based triggers |
| `connectorExecutionTask.js` | Third-party connector execution |
| `connectorStepExecutor.js` | Connector step processing |

### Queues Configuration (`trigger/queues.js`)
```javascript
export const workflowQueue = queue({
  name: "workflow-queue",
  concurrencyLimit: 80
});
```

### Key Features

#### 1. Message Scheduling & Queue System
- **Immediate SMS delivery** with background processing
- **Delay-based scheduling** (`wait.for`) with minute precision
- **Time-based scheduling** (`wait.until`) for specific dates/times
- **Recurring messages** with cron-based patterns
- **Message status tracking** and delivery confirmation
- **Automatic retry** with exponential backoff

#### 2. Action System
Three specialized processors handle different action types:

**Basic Action Processor** (`process-basic-action`):
- add_tag, set_variable, assign_agent
- subscribe_campaign, delete_contact
- Concurrency: 10, Machine: small-1x

**Advanced Action Processor** (`process-advanced-action`):
- run_api_request, run_javascript, move_to_board
- Concurrency: 5, Machine: small-2x

**Integration Action Processor** (`process-integration-action`):
- send_webhook, email_integration, crm_integration
- Concurrency: 3, Machine: small-1x

#### 3. Async Provider Architecture
Configurable provider system allowing easy switching between:
- **TriggerDevProvider**: Full Trigger.dev integration
- **LocalProvider**: Development/testing
- **BullMQProvider**: Alternative queue system
- **AWSSQSProvider**: Cloud-based queuing

### Development Commands

#### Trigger.dev Development (from project root)
```bash
npx trigger dev            # Start Trigger.dev development server
npx trigger deploy         # Deploy tasks to Trigger.dev cloud
npx trigger whoami         # Check current auth status
```

#### Environment Variables
```bash
# Required for Trigger.dev (in root .env or backend .env)
TRIGGER_SECRET_KEY=tr_dev_xxx  # Development secret key
TRIGGER_API_KEY=your_trigger_api_key_here
TRIGGER_PROJECT_ID=proj_dcpsazbkeyuadjmckuib

# Required for task processors
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here  # Preferred over SERVICE_KEY
SUPABASE_SERVICE_KEY=your_service_key_here            # Fallback
SUPABASE_ANON_KEY=your_anon_key_here
```

#### Frontend Configuration (for Action System Demo)
```bash
# Frontend .env for Action System
REACT_APP_TRIGGER_API_URL=https://api.trigger.dev
REACT_APP_TRIGGER_PUBLIC_KEY=pk_prod_your_public_key_here
REACT_APP_TRIGGER_PROJECT_ID=proj_dcpsazbkeyuadjmckuib
```

### Task Organization

#### Message Tasks (`messageJobs.js`)
- `send-sms-task`: Immediate SMS delivery
- `scheduled-message-task`: Delayed and scheduled messages

#### Action Tasks (`actionTasks.js`)
- `action-add-tag`: Contact tagging
- `action-set-variable`: Variable management
- `action-assign-agent`: Agent assignment
- `action-subscribe-campaign`: Campaign subscription
- `action-delete-contact`: Contact deletion
- `action-run-api-request`: External API calls
- `action-run-javascript`: Custom code execution
- `action-move-to-board`: Board management
- `action-send-webhook`: Webhook delivery
- `action-email-integration`: Email processing
- `action-crm-integration`: CRM synchronization

### API Endpoints

#### Message Scheduling
- `POST /api/trigger/send-sms` - Immediate SMS sending
- `POST /api/trigger/schedule-delay` - Delay-based scheduling
- `POST /api/trigger/schedule-until` - Time-based scheduling
- `POST /api/trigger/cancel-job` - Cancel scheduled messages
- `GET /api/trigger/job-status` - Check job status

#### Action Execution
- `POST /api/actions/execute` - Execute workflow actions
- `GET /api/actions/status/:id` - Check action status
- `POST /api/actions/cancel/:id` - Cancel action execution

#### Call Management
- `POST /api/calls/initiate` - Initiate outgoing call
- `PUT /api/calls/:callId/status` - Update call status and duration
- `GET /api/calls/history/:workspaceId` - Get call history
- `GET /api/calls/stats/:workspaceId` - Get call statistics

### Real-time Features

#### Status Monitoring
- **Real-time job updates** via Trigger.dev subscriptions
- **Delivery status tracking** for all message types
- **Action execution monitoring** with live progress updates
- **Error reporting** with detailed context

#### Frontend Integration
- `TriggerDevContext`: React context for status management
- `useScheduledMessagesRealtime`: Hook for message monitoring
- `ActionExecutionMonitor`: Component for action tracking
- Real-time status updates via Socket.IO integration

### Database Integration

#### Tables
- `scheduled_sms_jobs`: Scheduled message tracking
- `action_executions`: Action execution history
- `flow_executions`: Workflow run tracking
- `flow_execution_steps`: Individual step tracking
- `flow_execution_dlq`: Dead letter queue for failed executions

#### Features
- **Workspace isolation** with RLS policies
- **Retry mechanism** with exponential backoff
- **Dead letter queue** for permanent failures
- **Execution metadata** for debugging and analytics

### Error Handling & Monitoring

#### Retry Strategy
- **Default**: 3 attempts with exponential backoff
- **Min timeout**: 1000ms
- **Max timeout**: 10000ms
- **Backoff factor**: 2x with randomization

#### Error Classification
- **Retriable errors**: Network issues, temporary failures
- **Non-retriable errors**: Invalid data, authentication failures
- **Dead letter queue**: Permanently failed executions

#### Monitoring
- **Dashboard integration** for job monitoring
- **Real-time alerts** for critical failures
- **Performance metrics** tracking
- **Detailed logging** with context preservation

### Development Best Practices

#### Task Development
1. Use workspace-scoped operations for security
2. Implement proper error handling with context
3. Add comprehensive logging for debugging
4. Include retry logic for transient failures
5. Validate input data before processing

#### Testing Strategy
1. **Unit tests** for individual task processors
2. **Integration tests** for end-to-end workflows
3. **Mock mode** for development without Trigger.dev
4. **Payload validation** for all task inputs

#### Performance Optimization
1. **Concurrency limits** per task type
2. **Machine sizing** based on computational needs
3. **Batch processing** for bulk operations
4. **Connection pooling** for database operations

### Unified Workflow Lessons Learned

Critical insights from implementing and debugging `trigger/unifiedWorkflows.js`:

#### 1. Database Table Selection

| Entity Type | Storage Table | Execution Table | Step Tracking |
|-------------|---------------|-----------------|---------------|
| Flows | `flows` | `flow_executions` | `flow_execution_steps` |
| Sequences | `flow_sequences` | `flow_sequence_executions` | `flow_sequence_message_jobs` |

**FK Constraint Rule**: `flow_executions.flow_id` references `flows` table only. Never insert sequence IDs into this table.

#### 2. Valid Execution Status Values
```
queued | pending | running | completed | failed | cancelled | partial_failure
```
**Common Mistake**: Using `active` instead of `running` causes check constraint violations.

#### 3. Nested Workflow Contact Data

When triggering workflows from within other workflows (e.g., subscribe-campaign action):

```javascript
// WRONG - SMS/email steps fail
triggerData: { contact: { id: contactId } }

// CORRECT - Fetch full contact first
const { data: contactData } = await supabase
  .from('contacts').select('*').eq('id', contactId).single();
triggerData: { contact: contactData }
```

#### 4. Workflow Caching
- **TTL**: 5 minutes | **Max Size**: 100 workflows
- Changes to flow definitions may take 5 minutes to take effect
- Redeploy Trigger.dev for immediate effect

#### 5. Common Error Patterns

| Error | Cause | Fix |
|-------|-------|-----|
| `FK constraint on flow_id` | Using `flow_executions` for sequences | Use `flow_sequence_executions` |
| `check_status constraint` | Invalid status value | Use `running` not `active` |
| `no phone number available` | Contact data not passed | Fetch full contact before nested trigger |

#### 6. Calendar Link Template Variables (2026-02)

**Problem**: External CRM webhooks setting `appointment_date` on contacts didn't generate calendar links.

**Root Cause**: Two data flows existed - built-in booking wrote to `appointments` table (triggering calendar link generation), but webhooks only wrote to `contacts.appointment_date` (no trigger).

**Solution**:
1. Updated `webhook-processor` worker to INSERT into `appointments` table when `appointment_date` is mapped
2. Added `{{appointment.*}}` template variable support in `unifiedWorkflows.js`
3. Updated UI components to show new appointment fields

**Files Modified**:
- `cloudflare-workers/webhook-processor/src/handlers/webhook.js` - Creates appointment records
- `trigger/unifiedWorkflows.js` - `{{appointment.*}}` variable replacement
- `frontend/src/components/common/UnifiedFieldPicker.js` - `type: 'appointment'` fields
- `frontend/src/components/webhook/JsonPathFinder.js` - `category: 'appointment'` with teal badge

**Key Insight**: When adding new template variable sources, update both the workflow engine AND all UI components (there may be multiple field pickers for different contexts).

### Database Schema Highlights

#### Core Tables
- `workspaces`: Multi-tenant organization
- `contacts`: CRM contacts with custom fields support
- `messages`: Bidirectional message storage
- `boards`: Pipeline visualization and organization
- `pipeline_stages`: Customizable sales stages
- `conversations`: Message threading and context
- `call_logs`: Outbound/inbound call history and status tracking

#### Security Model
- Row Level Security (RLS) on all tables
- Workspace-based data isolation
- API key authentication for external integrations
- Role-based access control

### Development Workflow

#### System Requirements
- **Node.js**: >=18.0.0
- **npm**: >=9.0.0
- **Runtime**: Backend uses ES modules (`"type": "module"` in package.json)

#### Git Hooks & Documentation
- Automated changelog generation via `tools/post-push-changelog.js`
- Commit message format requirements (see `.cursor/rules/cursur_rule.mdc`)
- **CRITICAL**: Required to run changelog script after every push to main
- Follow structured commit format: Title, bullet points, lessons learned

#### Environment Configuration

**Frontend (.env)**:
```bash
# API Configuration
REACT_APP_API_VERSION=v2
REACT_APP_API_V1_URL=https://cc.automate8.com
REACT_APP_API_V2_URL=https://api-v2.automate8.com

# Database (Hybrid)
REACT_APP_SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_D1_DATABASE_ID=your-d1-database-id

# External Services
REACT_APP_TWILIO_ACCOUNT_SID=your-account-sid
REACT_APP_CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
REACT_APP_WORKER_AI_GATEWAY=https://gateway.ai.cloudflare.com
```

**Backend v1 (.env)**:
```bash
# Legacy Express Configuration
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
```

**Cloudflare Workers v2 (wrangler.toml)**:
```toml
name = "livechat-api-v2"
compatibility_date = "2025-01-01"

[[d1_databases]]
binding = "DB"
database_name = "livechat-production"
database_id = "your-d1-database-id"

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "livechat-files"

[[queues]]
binding = "QUEUE"
queue = "background-jobs"

[ai]
binding = "AI"

[vars]
ENVIRONMENT = "production"
TWILIO_ACCOUNT_SID = "your-twilio-sid"
```

**Production URLs**:
- Frontend: `https://cc1.automate8.com`
- API v1 (Legacy): `https://cc.automate8.com`
- API v2 (Workers): `https://api-v2.automate8.com`
- Database: D1 + Supabase hybrid

#### Deployment Strategy
- **Target Platform**: Cloudflare Workers network for edge deployment
- **Runtime**: Node.js Express backend will be deployed to Cloudflare Workers
- **Edge Benefits**: Global distribution, reduced latency, serverless scaling
- **Migration Considerations**: Backend Express server compatibility with Workers runtime environment

#### Cursor Rules Integration
Key development guidelines from `.cursor/rules/`:
- Always use codebase search before creating new files
- Follow macOS design philosophy for UI consistency
- Organize features in dedicated directories with README files
- Run post-push-changelog.js after every push to main
- Use minimal code changes and avoid over-engineering

### Important Implementation Notes

#### Message Flow
1. **Outbound SMS**: User → Frontend → Backend API → Twilio → SMS
2. **Inbound SMS**: SMS → Twilio → Backend webhook → Socket.IO → Frontend

#### Call Flow
1. **Outbound Call**: User → Frontend (callService) → Backend API → Call Log → Twilio Voice SDK
2. **Call Status Updates**: Twilio → Backend → Socket.IO → Frontend real-time updates

#### Performance Considerations
- Message deduplication prevents duplicate displays
- Window state isolation prevents cross-contamination
- Supabase RLS reduces over-fetching
- Background job processing for heavy operations

#### Critical Files (DO NOT BREAK)
- `frontend/src/services/messageService.js`: Core messaging logic
- `frontend/src/socket.js`: Real-time connection management  
- `backend/src/services/messageService.js`: Server-side message processing
- `backend/index.js`: Main server configuration

### Common Development Tasks

#### Adding New Features
1. Follow feature-based organization - create directories under `components/` or `services/`
2. Always consider workspace isolation and RLS policies
3. Update both frontend and backend if API changes are needed
4. Add proper TypeScript types where applicable

#### Debugging Issues
1. Check browser console for Socket.IO connection issues
2. Review backend logs for Twilio webhook failures
3. Use React DevTools for component state inspection
4. Check Supabase dashboard for RLS policy violations

#### Making Database Changes  
1. Create migration files in `supabase/migrations/`
2. Test locally first, then apply to staging/production
3. Always include RLS policies for new tables
4. Update TypeScript types if schema changes affect frontend

### Design Philosophy

This application follows Apple design philosophy and macOS aesthetic principles with:

#### Core Design Elements
- **Soft, rounded corners** on all panels and buttons (8px radius)
- **MacOS-inspired UI** with frosted glass effects and subtle animations
- **Consistent spacing system** (8px multipliers throughout)
- **Light/dark mode** with proper SF Pro-inspired typography
- **Subtle translucency effects** for panels like in macOS
- **MacOS-style toggle switches** and dropdown selectors
- **Muted color palette** with accent blue (#0071E3) for actions
- **Micro-interactions** and subtle hover animations for interactive elements

#### User Experience Patterns
- **Categorically organized** settings with intuitive grouping
- **Dedicated integrations hub** with visual connection status indicators
- **Responsive layout** with appropriate spacing and typography
- **Team management sections** with improved member visibility
- **Consolidated notification preferences** and appearance settings
- **Security-focused layout** for sensitive information
- **Progressive disclosure** - revealing contextual actions only when needed

#### Visual Hierarchy
- **Well-organized interfaces** with logical grouping
- **Clean interfaces** focusing on improved user experience
- **Proper visual hierarchy** with consistent typography scales
- **Native-feeling components** that match macOS conventions
- **Contextual interaction patterns** following Mac OS design standards

## Lessons Learned from Development

This section contains key insights and best practices gathered from implementing various features across the application.

### Component Architecture & React Best Practices

#### React Hooks and Component Structure
- Always declare hooks at the top level of components
- Never use hooks conditionally or in callbacks  
- Memoize complex components and callbacks to prevent unnecessary re-renders
- Keep component state and UI logic separate for better maintainability
- Use functional components with hooks over class components
- Extract reusable logic into custom hooks

#### State Management
- Maintain single source of truth for each action type
- Use centralized state in custom hooks for complex logic
- Implement consistent error handling across all operations
- Clear selection state updates and proper cleanup after operations
- Handle loading states properly with visual feedback
- Use window-specific state management for independent UI components

#### Component Organization
- Group related handlers by functionality (selection, actions, bulk operations)
- Use descriptive function names and follow single responsibility principle
- Keep components focused and single-purpose
- Separate business logic from UI components
- Implement clear component interfaces and document responsibilities

### UI/UX Design Patterns

#### macOS Design Philosophy Integration
- Use semantic color naming (e.g., `headerBgColor`, `mutedTextColor`) for maintainability
- Implement dark mode at component level using `useColorModeValue`
- Maintain consistent color palette: gray.900/800/700 backgrounds, gray.100/400 text
- Apply subtle hover states and transitions (0.2s) for all interactive elements
- Use consistent spacing and padding (8px multipliers)
- Follow Mac OS visual patterns with rounded corners and frosted glass effects

#### Form and Input Design
- Associate form fields with labels and use ARIA attributes
- Provide clear, concise error messages near relevant inputs
- Implement proper focus management during dynamic content updates
- Use consistent border radius (6px) and height (40px) for form elements
- Apply proper color contrast ratios (4.5:1 minimum for normal text)

#### Layout and Navigation
- Use asymmetric grids (7:5 ratio) for main/secondary content
- Implement two-column layouts for complex interfaces (JSON payload | Field mappings)
- Keep related content together with consistent spacing (gap={6})
- Maintain scrollable content within fixed heights
- Use dock-based navigation with draggable windows for desktop-like experience

### Error Handling & Debugging

#### Comprehensive Error Handling Strategy
- Log both error and context (payload, IDs, workspace information)
- Return appropriate HTTP status codes with detailed error messages
- Store error details in relevant tables for later analysis
- Implement multi-level validation (UI, application logic, database)
- Use toast notifications for user feedback with consistent positioning (top-right)
- Handle both API and database errors gracefully

#### Debugging Best Practices
- Add detailed logging for complex operations
- Check browser console for Socket.IO connection issues
- Use React DevTools for component state inspection
- Test with realistic payloads from the beginning
- Implement diagnostic components and test pages for isolation
- Create dedicated test routes for debugging specific functionality

#### Production vs Development Differences
- Always test with production builds locally before deployment
- Environment variables require different handling (REACT_APP_ prefix for React)
- Error messages visible in development may be suppressed in production
- Implement proper error boundaries and fallback UI

### Database Design & Performance

#### Schema Design Best Practices
- Use consistent column naming across the system (snake_case backend, camelCase frontend)
- Implement Row Level Security (RLS) early for workspace-based isolation
- Use compound unique constraints for better data integrity
- Plan for extensibility with appropriate data types (JSONB for flexible fields)
- Document table schemas and required columns thoroughly

#### Query Optimization
- Use appropriate indexes for common query patterns
- Implement pagination and lazy loading for large datasets
- Build queries dynamically based on user selections
- Apply filters correctly and validate before executing critical operations
- Use batch processing for multiple contacts/operations

#### Data Consistency
- Ensure user selections (segments, filters) are properly applied to all queries
- Maintain consistency between UI display and backend operations
- Validate filter criteria before executing critical operations
- Test queries with different inputs to ensure correct results

### Supabase Agent Skills (Postgres Best Practices)

**Location**: `.cursor/skills/supabase-agent-skills/`

Comprehensive Postgres optimization guidance organized by impact priority:

| Priority | Category | Impact | Focus Areas |
|----------|----------|--------|-------------|
| 1 | Query Performance | CRITICAL | Missing indexes, slow queries, query plans |
| 2 | Connection Management | CRITICAL | Connection pooling, limits, serverless |
| 3 | Security & RLS | CRITICAL | Row-Level Security, privileges |
| 4 | Schema Design | HIGH | Table design, partitioning, data types |
| 5 | Concurrency & Locking | MEDIUM-HIGH | Deadlock prevention, SKIP LOCKED |
| 6 | Data Access Patterns | MEDIUM | N+1 queries, pagination, batch ops |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | EXPLAIN ANALYZE, pg_stat_statements |
| 8 | Advanced Features | LOW | Full-text search, JSONB, extensions |

#### Critical Performance Patterns

**1. RLS Policy Performance (100x improvement)**
```sql
-- BAD: auth.uid() called per row (1M rows = 1M calls)
create policy orders_policy on orders
  using (auth.uid() = user_id);

-- GOOD: Called once, cached
create policy orders_policy on orders
  using ((select auth.uid()) = user_id);
```

**2. Cursor-Based Pagination (O(1) vs O(n))**
```sql
-- BAD: OFFSET scans all skipped rows
SELECT * FROM products ORDER BY id LIMIT 20 OFFSET 199980;  -- Scans 200K rows

-- GOOD: Uses index, constant speed regardless of page depth
SELECT * FROM products WHERE id > 199980 ORDER BY id LIMIT 20;
```

**3. UPSERT Pattern (Atomic, No Race Conditions)**
```sql
-- Atomic insert-or-update
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = excluded.value, updated_at = now();
```

**4. Partial Indexes (5-20x Smaller)**
```sql
-- Only index relevant rows
CREATE INDEX idx_orders_pending ON orders (created_at)
WHERE status = 'pending';

CREATE INDEX idx_contacts_active ON contacts (workspace_id)
WHERE archived = false;
```

**5. SKIP LOCKED for Queue Processing (10x Throughput)**
```sql
-- Multiple workers process different jobs without blocking
UPDATE jobs
SET status = 'processing', worker_id = $1, started_at = now()
WHERE id = (
  SELECT id FROM jobs
  WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

**6. Security Definer Functions for Complex RLS**
```sql
-- Helper function bypasses RLS, runs efficient indexed lookup
CREATE OR REPLACE FUNCTION is_team_member(team_id bigint)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = $1 AND user_id = (SELECT auth.uid())
  );
$$;

-- Use in policy
CREATE POLICY team_orders_policy ON orders
  USING ((SELECT is_team_member(team_id)));
```

#### Rules Reference Files
Located in `.cursor/skills/supabase-agent-skills/skills/postgres-best-practices/rules/`:
- `query-*.md` - Index types, missing indexes, composite indexes
- `conn-*.md` - Connection pooling, limits, timeouts
- `security-*.md` - RLS basics, RLS performance, privileges
- `schema-*.md` - Primary keys, data types, partitioning
- `lock-*.md` - SKIP LOCKED, deadlock prevention, advisory locks
- `data-*.md` - N+1 queries, pagination, batch inserts, upsert
- `monitor-*.md` - EXPLAIN ANALYZE, pg_stat_statements, VACUUM
- `advanced-*.md` - Full-text search, JSONB indexing

### Security Implementation

#### Authentication & Authorization
- Implement SQL RPC functions with SECURITY DEFINER for privileged operations
- Use layered fallback mechanisms for critical authentication functionality
- Never trust client-side operations for user creation - verify on server
- Implement proper error handling for authentication flows
- Test authentication with various edge cases

#### Data Protection
- Enable RLS on all tables with workspace-specific policies
- Include workspace_id in all queries to maintain security
- Escape user-generated content and avoid `dangerouslySetInnerHTML`
- Use environment variables properly (never expose secrets to client)
- Implement API key authentication for external integrations

### External Service Integration

#### Twilio Integration
- **SMS/MMS**: Validate phone numbers, handle inbound/outbound flows
- **Voice Calling**: Outgoing calls with Twilio Voice SDK integration
- **Phone Number Management**: E.164 formatting for international support
- **Webhook Handling**: Comprehensive logging for inbound messages
- **Fallback Mode**: Simulated calls for development without Twilio credentials
- **Real-time Updates**: Socket.IO events for call status changes
- Store credentials securely in backend environment variables

#### Trigger.dev Integration
- **Task Organization**: Use separate processors for different action complexity levels
- **Environment Configuration**: Require both backend API keys and frontend public keys
- **Error Classification**: Implement proper retry logic for retriable vs non-retriable errors
- **Workspace Isolation**: Always scope operations to workspaces for security
- **Real-time Monitoring**: Use Trigger.dev subscriptions for live status updates
- **Provider Architecture**: Abstract queue systems for easy switching between providers
- **Task Development**: Include comprehensive logging and error context for debugging
- **Performance Tuning**: Set appropriate concurrency limits and machine sizes per task type

#### Queue Services & Background Processing  
- Include all required fields in API payloads (contactId, workspaceId, delay, callbackEndpoint)
- Implement retry mechanisms with exponential backoff
- Use dead-letter queues for permanently failed operations
- Handle timezone calculations properly for scheduled messages
- Maintain backward compatibility when upgrading APIs
- Configure proper task timeout limits based on operation complexity
- Use task metadata for debugging and tracking execution context

#### Email Services
- Use proper HTML content for email templates
- Implement workspace-specific email configuration
- Handle email delivery failures gracefully
- Store email metadata for tracking and analytics

### Smart Caching System

#### Overview
A comprehensive multi-layer caching system has been implemented to significantly improve board performance and user experience. The system provides intelligent caching with TTL-based expiration, workspace isolation, and real-time invalidation.

#### Caching Architecture

**Core Services:**
- **BoardCacheService**: Central caching engine with TTL and LRU eviction
- **BoardContactCache**: Contact data caching with column-specific storage
- **BoardStructureCache**: Board and column configuration caching
- **ApiCacheService**: API response caching with automatic invalidation
- **SearchCacheService**: Search results and filter caching
- **CachePerformanceMonitor**: Real-time metrics and performance tracking

#### Key Features

**1. Multi-Layer Caching Strategy**
```
Layer 1: Contact Data (5-minute TTL)
├── Column-specific contact lists
├── Individual contact details
├── Contact counts per column
└── Board summary statistics

Layer 2: Board Structure (10-minute TTL)
├── Board configurations
├── Column definitions
├── Pipeline stages
└── User preferences

Layer 3: API Responses (3-minute TTL)
├── Board API calls
├── Contact API calls
├── Search API calls
└── Workspace API calls

Layer 4: Search Results (2-minute TTL)
├── Search query results
├── Filter combinations
├── Search suggestions
└── Popular search terms
```

**2. Workspace Isolation**
- All cache entries are scoped to specific workspaces
- Prevents cross-workspace data contamination
- Supports multi-tenant architecture securely

**3. Real-Time Cache Invalidation**
- Socket.IO event handlers automatically invalidate relevant caches
- Contact additions, moves, and deletions trigger targeted invalidation
- Maintains data consistency with live updates

**4. Performance Monitoring**
- Real-time cache hit/miss tracking
- Memory usage monitoring
- Response time metrics
- Workspace and cache-type specific statistics
- Automated performance recommendations

#### Implementation Details

**Cache TTL Configuration:**
```javascript
const defaultTTL = {
  contacts: 5 * 60 * 1000,      // 5 minutes
  boards: 10 * 60 * 1000,      // 10 minutes
  columns: 15 * 60 * 1000,     // 15 minutes
  search: 2 * 60 * 1000,       // 2 minutes
  api: 3 * 60 * 1000,          // 3 minutes
  user: 30 * 60 * 1000         // 30 minutes
};
```

**Real-Time Invalidation Events:**
- `board:contact_added` → Invalidates contact and search caches
- `board:contact_moved` → Invalidates column-specific caches
- `board:contact_removed` → Invalidates contact and count caches
- `board:column_deleted` → Invalidates board structure caches

**Performance Monitoring Features:**
- Hit rate tracking (target: >70%)
- Cache efficiency scoring (0-100)
- Memory usage monitoring
- Response time analysis
- Trend analysis and recommendations

#### Benefits Achieved

**1. Performance Improvements**
- **60-80% reduction** in API calls for repeated board views
- **50ms average response time** for cached data vs 200-500ms for API calls
- **Instant column switching** with cached contact data
- **Reduced server load** by eliminating redundant queries

**2. User Experience Enhancements**
- **Immediate data display** when switching between boards
- **Smooth scrolling** with pre-loaded contact data
- **Reduced loading spinners** for frequently accessed data
- **Consistent performance** across different network conditions

**3. Scalability Benefits**
- **Reduced database load** for high-traffic workspaces
- **Improved concurrent user handling** with cached responses
- **Lower infrastructure costs** through reduced API calls
- **Better mobile performance** with cached data

#### Console Debugging Tools

The caching system provides comprehensive debugging tools accessible via browser console:

```javascript
// View cache statistics
showCacheStats()
showCachePerformance()

// Inspect cache contents
showCacheEntries()
showContactCacheStats('workspace_id')
showBoardStructureCacheStats('workspace_id')

// Management operations
clearBoardCache()
clearApiCache()
exportCacheMetrics()

// Performance recommendations
showCacheRecommendations()
```

#### Monitoring and Alerts

**Performance Metrics Tracked:**
- Cache hit rate (target: >70%)
- Average response time (<100ms for cached data)
- Memory usage (automatic cleanup at size limits)
- Cache efficiency score (target: >80%)
- Eviction and invalidation rates

**Automatic Recommendations:**
- Low hit rate warnings
- High response time alerts
- Memory usage optimization suggestions
- Cache size adjustment recommendations

#### Future Enhancements

**Planned Improvements:**
- **Pre-warming strategies** for frequently accessed data
- **Intelligent cache size adjustment** based on usage patterns
- **Cross-tab cache synchronization** for multi-tab users
- **Compression** for large cached objects
- **Cache persistence** across browser sessions

### Performance Optimization

#### Frontend Performance
- Use React.memo, useMemo, and useCallback appropriately
- Implement code-splitting and lazy loading for large components
- Monitor and optimize component re-renders
- Use proper data structures for efficient lookups
- Implement virtualization for large lists

#### API & Database Performance
- Use connection pooling for database operations
- Implement batch operations where appropriate
- Add appropriate database indexes for query optimization
- Use dynamic imports to reduce initial load time
- Monitor performance metrics and optimize accordingly

### Testing & Quality Assurance

#### Testing Strategy
- Test components with various data states (loading, error, empty, populated)
- Verify behavior when context providers are not available
- Test with realistic data from the beginning
- Implement integration tests for authentication and user management flows
- Simulate network errors and slow connections

#### Code Quality
- Use ESLint and Prettier for consistent code formatting
- Remove unused imports and debug logging after validation
- Document complex logic and important architectural decisions
- Follow consistent naming conventions across the codebase
- Implement proper TypeScript types where applicable

### Workflow & Development Process

#### Git & Documentation
- Run changelog script after every push to main branch
- Follow commit message format requirements
- Create comprehensive documentation for complex features
- Update relevant documentation when making changes
- Use feature-based organization for new components

#### Environment Management
- Use REACT_APP_ prefix for React environment variables
- Document all required environment variables in .env.example
- Keep configuration separate from business logic
- Validate environment variables at startup
- Handle missing environment variables gracefully

### Common Pitfalls & Prevention

#### Import and Dependency Issues
- Keep imports organized and grouped by source
- Avoid cross-directory imports outside webpack boundaries
- Always verify imported components are actually used
- Consider bundle size when importing large libraries
- Use absolute imports with proper configuration

#### Data Handling Issues
- Always validate data types before rendering (especially for tags and dynamic content)
- Implement consistent parsing across all components
- Check for null/undefined values before accessing properties
- Use fallback patterns for object properties
- Maintain backward compatibility when changing data structures

#### State Management Issues
- Avoid unnecessary re-renders with proper memoization
- Handle race conditions between data fetching and context initialization
- Implement proper cleanup for subscriptions and timers
- Use proper loading states for asynchronous operations
- Clear state appropriately when components unmount

This comprehensive collection of lessons learned should guide future development and help avoid common pitfalls while maintaining code quality and user experience standards.

## Cloudflare Workers Webhook Processor

### Overview
A high-performance edge webhook processor built on Cloudflare Workers, designed to deliver sub-50ms response times for webhook processing. This system replaces Express.js-based webhook endpoints while maintaining full compatibility with the existing frontend webhook management system.

### Key Features
- **Edge Processing**: Global deployment across 300+ Cloudflare edge locations
- **Sub-50ms Response Times**: 82% faster than Express backend
- **Smart Caching**: Intelligent edge caching with workspace isolation
- **Advanced Field Mapping**: High-performance JSONPath extraction without external dependencies
- **Real-time Monitoring**: Comprehensive performance metrics and logging

### Project Location
```
cloudflare-workers/webhook-processor/
├── src/
│   ├── index.js                 # Main worker entry point
│   ├── handlers/
│   │   ├── webhook.js           # Core webhook processing logic
│   │   ├── fieldMapping.js     # JSONPath field mapping processor
│   │   ├── validation.js       # Contact data validation
│   │   └── logging.js           # Webhook execution logging
│   ├── services/
│   │   ├── auth.js             # Webhook authentication
│   │   ├── supabase.js         # Database client
│   │   └── cache.js            # Edge caching service
│   └── utils/
│       ├── cors.js             # CORS handling
│       ├── performance.js      # Performance monitoring
│       └── jsonPath.js         # Optimized JSONPath extraction
├── wrangler.toml               # Cloudflare Workers configuration
├── README.md                   # Complete documentation
├── DEPLOYMENT.md               # Deployment and migration guide
└── .env.example                # Environment configuration template
```

### Performance Benefits
- **Response Time**: < 50ms average (vs 200-500ms Express backend)
- **Throughput**: 1000+ requests/second per edge location
- **Cache Hit Rate**: > 90% for webhook configurations
- **Global Availability**: 99.99% uptime with edge failover

### Migration Strategy
The system supports hybrid deployment:
1. **Phase 1**: Parallel deployment alongside Express endpoints
2. **Phase 2**: Gradual traffic migration with monitoring
3. **Phase 3**: Complete migration with Express deprecation

### Development Commands
```bash
cd cloudflare-workers/webhook-processor
npm install                    # Install dependencies
wrangler dev                  # Start local development
wrangler deploy               # Deploy to production
wrangler tail                 # View real-time logs
```

### Integration with Existing System
- **Frontend Compatibility**: Works seamlessly with existing webhook management UI
- **Database Integration**: Uses same Supabase database with RLS policies
- **Field Mapping**: Supports all existing JSONPath configurations
- **Monitoring**: Integrates with current webhook analytics system

## Cloudflare Workers Services Directory

All Cloudflare Workers are located in `cloudflare-workers/` directory. Each worker is an independent microservice deployed to Cloudflare's edge network.

### Development Commands (All Workers)
```bash
cd cloudflare-workers/<worker-name>
wrangler dev                    # Local development
wrangler deploy                 # Deploy to production
wrangler deploy --env staging   # Deploy to staging
wrangler tail                   # View real-time logs
wrangler secret put <NAME>      # Set secret
```

### Workers Overview

| Worker | Purpose | Route/Domain |
|--------|---------|--------------|
| `webhook-processor` | Inbound webhook processing | `worker.api-customerconnect.app/*` |
| `workflow-trigger-api` | Trigger workflows via HTTP | `hooks.api-customerconnect.app/*` |
| `leads-api` | Lead management API | `*api-customerconnect.app/*` |
| `inbound-leads-api` | Inbound lead queries | Production |
| `opportunities` | Pipeline/opportunity management | `prod-api.customerconnects.app` |
| `contact-list-cache` | Redis-backed contact caching | Development/Staging |
| `livechat-api` | Real-time chat API (v2) | D1 Database |
| `chatbot-ai` | AI-powered chatbot with Durable Objects | Worker AI + D1 |
| `connectors-api` | Third-party connector execution | Durable Objects |
| `sms-service` | SMS sending service | Supabase integration |
| `notes-ai-processor` | AI note processing | `ai-notes.customerconnects.app` |
| `notes-image-storage` | R2-based image storage for notes | R2 bucket |
| `booking-pages-worker` | Appointment booking pages | `*.appointments.today` |
| `calendar-booking-api` | Calendar booking API | Supabase + Trigger.dev |
| `webchat` | Embeddable chat widget | `widget-preview.customerconnects.app` |
| `admin-api` | Admin operations | Development |
| `meta-webhook` | Facebook/Instagram webhooks | `meta-webhook.automate8.com` |
| `enhance-data-api` | Data enrichment (Audience Acuity) | D1 + KV |
| `lead-score-processor` | Lead scoring with Cloudflare Queue | Queue consumer |
| `email-trigger-processor` | Email event processing | Queue + Lead Score |
| `link-click-trigger` | Link click tracking & workflow triggers | Queue + Workflow |
| `url-shortener` | URL shortening service | KV store, `schedules.today` |
| `r2-image-proxy` | R2 image proxy for sequences | R2 bucket |

### Detailed Worker Descriptions

#### webhook-processor
**Purpose**: High-performance edge webhook processing
**Bindings**: KV (WEBHOOK_REJECTIONS)
**Features**:
- Sub-50ms response times
- JSONPath field mapping
- Supabase integration
- Durable Objects for analytics

#### workflow-trigger-api
**Purpose**: HTTP endpoint to trigger workflows
**Route**: `hooks.api-customerconnect.app/*`
**Use Case**: External systems triggering automation flows

#### chatbot-ai
**Purpose**: AI-powered CRM agent
**Bindings**: Worker AI, D1 (customer-connects), Durable Objects (CRM_AGENT)
**Features**:
- Conversation analysis
- Intelligent responses
- State persistence via Durable Objects

#### connectors-api
**Purpose**: Execute third-party integrations
**Bindings**: Durable Objects (CONNECTOR_AGENT)
**Secrets**: SUPABASE, ENCRYPTION_KEY, TRIGGER_API_KEY, OPENAI_API_KEY

#### lead-score-processor
**Purpose**: Process lead scoring events
**Bindings**: Queue consumer (`lead-score-events`), Cloudflare Workflow
**Config**: max_batch_size: 10, max_batch_timeout: 5

#### link-click-trigger
**Purpose**: Track link clicks and trigger workflows
**Bindings**: Queue (`link-click-events`), Cloudflare Workflow
**Use Case**: URL click tracking for sequences

#### url-shortener
**Purpose**: Shorten URLs for SMS/email
**Bindings**: KV (SHORT_LINKS_KV)
**Domain**: `schedules.today`

#### enhance-data-api
**Purpose**: Contact data enrichment
**Bindings**: D1 (enhance-data), KV
**Integration**: Audience Acuity API

#### notes-image-storage
**Purpose**: Store images for contact notes
**Bindings**: R2 (NOTES_IMAGES)
**Config**: Max 10MB, supports jpg/png/gif/webp/svg + audio

#### booking-pages-worker
**Purpose**: Public appointment booking pages
**Routes**: `*.appointments.today/*`
**Integration**: Supabase, Trigger.dev, Backend API

### Common Patterns

#### Supabase Integration
Most workers use Supabase for database access:
```javascript
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
```

#### CORS Handling
Standard CORS pattern across workers:
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

#### Error Response Format
```javascript
return new Response(JSON.stringify({
  success: false,
  error: 'Error message',
  code: 'ERROR_CODE'
}), { status: 400, headers: corsHeaders });
```

### Environment Variables
Most workers need these secrets (set via `wrangler secret put`):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Some workers need additional secrets:
- `TRIGGER_API_KEY`, `TRIGGER_SECRET_KEY` - For Trigger.dev integration
- `ENCRYPTION_KEY` - For connector credential encryption
- `OPENAI_API_KEY` - For AI features

## Outgoing Call Feature

### Overview
The outgoing call feature enables users to make phone calls directly from the CRM interface using Twilio Voice SDK with proper call logging and real-time status updates.

### Key Components

#### Frontend
- **callService.js**: Singleton service managing call lifecycle and state
- **CallControlModal.js**: Real-time call status display with mute/end controls
- **Board Integration**: Call buttons integrated into contact cards

#### Backend
- **routes/calls.js**: API endpoints for call management
- **Real-time Events**: Socket.IO events for workspace-level call notifications
- **Call Logging**: Comprehensive tracking in `call_logs` table

### Implementation Details

#### Call States
- `initiated`: Call started but not yet ringing
- `ringing`: Call is ringing at recipient
- `in-progress`: Call answered and active
- `completed`: Call ended successfully
- `failed`, `busy`, `no-answer`: Various failure states

#### Real-time Events
- `call:initiated`: Broadcast when call starts
- `call:status_updated`: Broadcast on status changes

#### Development Mode
- Fallback simulation when Twilio credentials unavailable
- Simulated call states for testing UI flows
- Automatic status transitions for development

### Usage
1. Navigate to Speed to Lead Board
2. Click Call button on any contact with phone number
3. Call Control Modal opens with real-time status
4. Use mute/unmute and end call controls
5. Call history automatically saved to database

## LiveChat2 Refactoring & Memory Leak Prevention

### Overview
The LiveChat2 component has undergone systematic refactoring to address memory leaks and improve maintainability. The original monolithic 2,580-line ChatArea.js has been decomposed into focused, memory-safe components.

### Refactoring Progress
- **ChatArea.js**: Reduced from 2,580 lines to 787 lines (69% reduction)
- **Components Extracted**: 4 major components totaling 1,367 lines
- **Memory Safety**: Implemented comprehensive leak prevention patterns

### Extracted Components

#### 1. MessageList Component (182 lines)
- **Location**: `frontend/src/components/livechat2/ChatArea/MessageList/MessageList.js`
- **Responsibility**: Message display with autonomous scroll management
- **Features**: Auto-scroll behavior, scroll position tracking, message grouping
- **Memory Safety**: Proper cleanup of scroll event listeners

#### 2. MessageInput Component (659 lines)  
- **Location**: `frontend/src/components/livechat2/ChatArea/MessageInput/MessageInput.js`
- **Responsibility**: Comprehensive input handling with mentions, attachments, scheduling
- **Features**: Speech-to-text integration, shortcut support, file uploads
- **Memory Safety**: Timer cleanup, event listener management

#### 3. EmailComposer Component (326 lines)
- **Location**: `frontend/src/components/livechat2/ChatArea/EmailComposer/EmailComposer.js`  
- **Responsibility**: Self-contained email composition with attachments and validation
- **Features**: CC support, file attachments, workspace-scoped sending
- **Memory Safety**: Upload cleanup, form state management

#### 4. useMessageRealtime Hook (195 lines)
- **Location**: `frontend/src/components/livechat2/ChatArea/hooks/useMessageRealtime.js`
- **Responsibility**: Memory-safe real-time message handling
- **Features**: Socket.IO management, Supabase subscriptions, message deduplication
- **Memory Safety**: Comprehensive cleanup patterns addressing NestJS leak patterns

### Memory Leak Prevention Patterns

#### Critical Memory Leak Risks Addressed
Based on NestJS memory leak prevention best practices:

1. **Event Emitter Listeners (Socket.IO)**
   - Proper cleanup with `socket.off()` calls
   - Automatic unregistration on component unmount
   - Connection health monitoring

2. **Supabase Real-time Subscriptions** 
   - Channel cleanup with `supabase.removeChannel()`
   - Subscription tracking and cleanup arrays
   - Workspace-scoped channel management

3. **Timer Management**
   - Bounded timer tracking with `Set` data structure
   - Automatic cleanup on component unmount
   - Timer creation helper with cleanup tracking

4. **Unbounded Caches**
   - Message cache limits (MAX_MESSAGES = 1000)
   - Processed IDs cache limits (MAX_PROCESSED_IDS = 5000)
   - LRU-style eviction patterns

#### Implementation Details

**Memory-Safe Hook Pattern:**
```javascript
const useMessageRealtime = (contact, workspace, user) => {
  const timerRefs = useRef(new Set());
  const processedMessageIds = useRef(new Set());
  
  // Bounded message cache
  const addMessage = useCallback((newMessage) => {
    setMessages(prev => {
      const updated = [...prev, newMessage];
      return updated.length > MAX_MESSAGES 
        ? updated.slice(-MAX_MESSAGES) 
        : updated;
    });
  }, []);
  
  // Global cleanup on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(timer => clearTimeout(timer));
      timerRefs.current.clear();
      processedMessageIds.current.clear();
    };
  }, []);
};
```

**Connection Management:**
- Exponential backoff for reconnection attempts
- Connection status monitoring
- Fallback refresh mechanisms for degraded connections

**Performance Monitoring:**
- Real-time statistics tracking (cache sizes, timer counts)
- Memory usage monitoring capabilities
- Cleanup verification for testing

### Development Commands for Refactored Components

#### Testing Refactored Components
```bash
cd frontend
npm start                    # Test integrated components
npm test MessageList        # Test message display component
npm test MessageInput       # Test input handling component
npm test useMessageRealtime  # Test real-time hook (when tests exist)
```

#### Component Structure Validation
```bash
# Verify component integration
grep -r "MessageList" src/components/livechat/
grep -r "useMessageRealtime" src/components/livechat/

# Check memory leak prevention
grep -r "cleanup" src/components/livechat2/ChatArea/hooks/
grep -r "MAX_MESSAGES\|MAX_PROCESSED_IDS" src/components/livechat2/
```

### Refactoring Best Practices Learned

#### Component Extraction Strategy
1. **Identify Bounded Contexts**: Group related functionality (message display, input handling, real-time updates)
2. **Extract by Responsibility**: Each component should have a single, clear purpose
3. **Maintain Prop Interfaces**: Minimize prop passing between components
4. **Preserve Functionality**: Ensure all existing features continue to work

#### Memory Safety Implementation
1. **Proactive Cleanup**: Implement cleanup in `useEffect` return functions
2. **Bounded Collections**: Set maximum sizes for arrays and caches
3. **Timer Tracking**: Use refs to track and cleanup all timers
4. **Connection Management**: Proper cleanup of all external connections

#### Testing Strategy
1. **Component Isolation**: Test each extracted component independently
2. **Integration Testing**: Verify components work together correctly
3. **Memory Leak Testing**: Use browser dev tools to monitor memory usage
4. **Cleanup Verification**: Test component unmounting behavior

### Future Refactoring Phases

**Potential Next Extractions:**
1. **Message Scheduling Components** (~150 lines remaining)
2. **Opportunity/CRM Integration** (~100 lines remaining)
3. **Contact Status Management** (~75 lines remaining)

**Memory Safety Extensions:**
1. **Cross-tab Synchronization**: Prevent memory leaks in multi-tab scenarios
2. **Service Worker Integration**: Offline-first message handling
3. **Performance Monitoring**: Real-time memory usage tracking

## Calendar Link Auto-Generation System

### Overview
The system automatically generates Google Calendar, Outlook Calendar, and iCal (.ics) links when appointments are created. This functionality is triggered by a PostgreSQL trigger that calls a Cloudflare Worker via pg_net.

### Architecture Flow
```
1. Appointment INSERT/UPDATE in appointments table
        ↓
2. PostgreSQL Trigger: appointment_calendar_link_trigger
        ↓
3. Function: notify_appointment_calendar_link()
        ↓
4. pg_net HTTP POST to Cloudflare Worker
        ↓
5. Worker: calendar-link-generator.benjiemalinao879557.workers.dev
        ↓
6. Generates shortened URLs for Google, Outlook, iCal
        ↓
7. Updates appointments.calendar_links JSONB
        ↓
8. Also updates contacts.calendar_links for template variables
```

### Data Flow Sources

| Source | Behavior | Calendar Links |
|--------|----------|----------------|
| **Built-in Booking Page** | Creates record in `appointments` table | ✅ Auto-generated via trigger |
| **External CRM Webhook** | Creates record in `appointments` table (via webhook-processor) | ✅ Auto-generated via trigger |

**Key Implementation (2026-02)**: The `webhook-processor` Cloudflare Worker now creates an `appointments` record when `appointment_date` is mapped from incoming webhook payload. This triggers the existing calendar link generation flow automatically.

### Calendar Links JSONB Structure
```json
{
  "google": "https://home-project-partner.schedules.today/nxjbAi",
  "outlook": "https://home-project-partner.schedules.today/t73Xy6",
  "ical": "https://calendar-link-generator.../appointments/{id}.ics",
  "generated_at": "2026-01-30T19:27:21.042Z",
  "timezone_used": "America/New_York"
}
```

### Key Implementation Files

| File | Purpose |
|------|---------|
| `cloudflare-workers/calendar-link-generator/src/index.js` | Main worker that generates and shortens calendar links |
| `cloudflare-workers/webhook-processor/src/handlers/webhook.js` | Creates appointment records when webhook sets appointment_date |
| `trigger/unifiedWorkflows.js` | `{{appointment.*}}` template variable replacement (~line 1394) |
| `frontend/src/components/common/UnifiedFieldPicker.js` | Variable picker with `type: 'appointment'` fields |
| `frontend/src/components/webhook/JsonPathFinder.js` | Webhook field mapping with `category: 'appointment'` badges |

### Template Variables in Workflows

**New Variables (from appointments table):**
```
{{appointment.appointment_date}}     → Appointment date/time (UTC)
{{appointment.title}}                → Appointment title
{{appointment.duration_minutes}}     → Duration in minutes
{{appointment.location}}             → Meeting location
{{appointment.booking_timezone}}     → Timezone for display
{{appointment.calendar_links.google}} → Google Calendar link (shortened)
{{appointment.calendar_links.outlook}} → Outlook Calendar link (shortened)
{{appointment.calendar_links.ical}}   → iCal file download URL
```

**Legacy Variables (from contacts table - being sunset):**
```
{{contact.appointment_date}}         → ⚠️ Legacy - use appointment.appointment_date
{{contact.appointment_time}}         → ⚠️ Legacy field
{{contact.appointment_date_display}} → ⚠️ Legacy field
```

### Webhook Field Mapping

When configuring webhooks in the UI, users can map JSON fields to:
- `appointment_date` - Triggers calendar link generation
- `appointment_title` - Sets appointment title
- `appointment_notes` - Sets description
- `appointment_duration` - Duration in minutes (default: 30)
- `appointment_location` - Physical location

These fields are shown with a teal "Appt" badge in JsonPathFinder.js.

### System User ID
For appointments created via webhook-processor:
```
UUID: 464cf603-5a10-4470-a100-331fc0766680
```
This is set as `created_by` and matches the system user used by calendar-booking-api.

### Debugging Calendar Links

1. **Check appointments table**: Verify `calendar_links` JSONB is populated
2. **Check pg_net logs**: Database trigger may have failed
3. **Check worker logs**: `wrangler tail calendar-link-generator`
4. **Verify contact.calendar_links**: Should be synced from appointment

---

## Lessons Learned (2026-02)

### Date Distance Triggers & Contact Conditions Feature

This section documents critical learnings from implementing the Date Distance Triggers with Contact Conditions feature.

#### Lesson 1: Verify Database State Before Debugging Code

**Mistake**: Spent time debugging backend code when the trigger was firing despite conditions not being met.

**Root Cause**: The contact condition was never saved to the database - the UI had the condition configured but the user forgot to click "Save".

**Solution**: Always verify the actual database state first:
```sql
-- Check if conditions are actually saved
SELECT id, event_type, conditions
FROM triggers
WHERE id = 'your-trigger-id';
```

**Rule**: When debugging "trigger should not have fired" issues, verify the database first, not the code.

#### Lesson 2: Use Exact Webhook Payload Structures

**Mistake**: Assumed a generic webhook payload structure instead of using the exact format provided by the user.

**Root Cause**: Klaviyo webhooks have deeply nested structures that differ from assumed patterns.

**Correct Approach**:
```javascript
// WRONG - Assumed structure
{ "ADate": "2025-02-05", "CRMStatus": "Set" }

// CORRECT - Actual Klaviyo structure
{
  "data": {
    "attributes": {
      "profile": {
        "data": {
          "attributes": {
            "properties": {
              "ADate": "2025-02-05",
              "CRMStatus": "Appointment Set"
            }
          }
        }
      }
    }
  }
}
```

**Rule**: When the user provides an exact payload structure, use it EXACTLY - don't assume or simplify.

#### Lesson 3: Railway Deployment Model

**Key Understanding**: Changes to backend code in local files do NOT affect production until:
1. Code is committed to git
2. Code is pushed to remote (main branch)
3. Railway automatically deploys from the push

**Testing Strategy**:
- For backend logic testing, rely on comprehensive logging
- Check Railway logs after pushing changes
- Remember that local file edits are not "deployed" - they require git push

#### Lesson 4: Document Feature Behaviors Comprehensively

When implementing a complex feature like Date Distance Triggers with Contact Conditions, document:

1. **When conditions are evaluated**:
   - Date Distance: At webhook/trigger time (immediate)
   - Time-Based: Both at scheduling AND at execution time (re-evaluated)

2. **What happens when conditions fail**:
   - Trigger is skipped silently
   - Logged with `trigger_count: 0` in response

3. **Data flow**:
   ```
   Webhook → Contact Update → Date Distance Service → Condition Check → Workflow Trigger
   ```

#### Lesson 5: Test Both Positive and Negative Cases

**Testing Strategy Used**:
1. **Negative test**: Send webhook with condition that should NOT match → verify trigger_count: 0
2. **Positive test**: Send webhook with condition that SHOULD match → verify execution starts

This confirms both the allow and block paths work correctly.

#### Quick Reference: Contact Conditions Feature

| Trigger Type | Condition Evaluation Time | Re-evaluation? |
|--------------|---------------------------|----------------|
| Date Distance | Immediately when date is set | No |
| Time-Based | At scheduling time | Yes, at execution |

**Contact Condition Operators**:
- `equals` / `not_equals` - Exact match (case-insensitive)
- `contains` / `not_contains` - Substring match
- `starts_with` / `ends_with` - Prefix/suffix match
- `is_empty` / `is_not_empty` - Null/empty check
- `greater_than` / `less_than` - Numeric comparison
- `in` / `not_in` - List membership

**Logic Modes**: AND (all must match) or OR (any can match)

#### Lesson 6: Custom Field Resolution in Backend Condition Evaluation (2026-02)

**Problem**: Contact conditions worked with a single direct field (e.g., `lead_status = Appointment`) but failed when adding custom fields (e.g., `Branch Company = Hansons`). Triggers would skip contacts even though the custom field value matched.

**Root Cause**: The `getFieldValue()` function didn't handle the `custom.` prefix used by the frontend:
```
Frontend saves condition: { field: "custom.branch_company", value: "Hansons" }
Contact data location: contact.metadata.custom_fields.branch_company = "Hansons"
Old getFieldValue tried: contact["custom.branch_company"] → undefined ❌
```

**Fix**: Updated `getFieldValue()` in both files to detect and resolve `custom.` prefix:
- `trigger/dateDistanceEvaluationTask.js` - For Trigger.dev task execution
- `backend/src/services/contactConditionsService.js` - For backend API evaluation

```javascript
if (fieldName.startsWith('custom.')) {
    const customFieldName = fieldName.replace('custom.', '');
    const candidateKeys = getCandidateKeys(customFieldName); // Handles naming variations
    for (const key of candidateKeys) {
        const value = contact.metadata?.custom_fields?.[key] ??
                      contact.metadata?.customFields?.[key];
        if (value !== null && value !== undefined) return value;
    }
    return undefined;
}
```

**Field Type Resolution Summary**:
| Field Type | Stored As | Resolved From |
|------------|-----------|---------------|
| Direct (lead_status) | `lead_status` | `contact.lead_status` |
| Direct (product) | `product` | `contact.product` |
| Custom (Branch Company) | `custom.branch_company` | `contact.metadata.custom_fields.branch_company` |
| Nested (timezone) | `metadata.timezone` | `contact.metadata.timezone` |

**Deployment Requirements**:
- Trigger.dev changes: `npx trigger deploy` (or MCP tool)
- Backend changes: `git push origin main` (Railway auto-deploys)

**Debugging Checklist**:
1. ✅ Query contact to verify `metadata.custom_fields` structure
2. ✅ Query trigger to verify stored `conditions.contactConditions.conditions[].field`
3. ✅ Verify `getFieldValue()` maps `custom.X` → `metadata.custom_fields.X`
4. ✅ Check Trigger.dev dashboard for condition evaluation logs
5. ✅ Ensure both Trigger.dev AND backend are deployed after changes

#### Lesson 7: New Node Type "Unknown step type" Error (2026-02)

**Problem**: Added a new `ai_agent` action node type to Flow Builder but workflow execution returned "Unknown step type: ai_agent" even after adding case handlers.

**Root Cause**: `trigger/unifiedWorkflows.js` has **MULTIPLE switch statements** for node execution:
1. **Multi-action array switch** (~line 4135) - Handles actions inside `data.actions[]` arrays
2. **Main `executeWorkflowStep` switch** (~line 2104-6880) - Handles individual node execution

The case handler was only added to the multi-action switch, but regular workflows execute nodes through the main `executeWorkflowStep` switch.

**Solution**: Add the case handler to **BOTH** switches if needed, but at minimum to `executeWorkflowStep`:
```javascript
// In executeWorkflowStep() before the 'default' case (~line 6877):
case 'ai_agent':
case 'ai-agent': {
  logger.log("🤖 Executing AI Agent action", { nodeId: node.id });
  const aiResult = await executeAIAgentDirectly({
    workspaceId, contactId, configuration: data, supabaseAdmin, triggerData, isTest
  });
  // Store outputs in workflow variables for subsequent steps
  if (aiResult.success && aiResult.outputs) {
    if (!triggerData.variables) triggerData.variables = {};
    Object.entries(aiResult.outputs).forEach(([key, value]) => {
      triggerData.variables[`ai_${key}`] = value;
    });
  }
  return aiResult;
}
```

**Key Insight**: When adding new node types to `unifiedWorkflows.js`:
1. **REQUIRED**: Add case to `executeWorkflowStep` switch (main execution path)
2. **Optional**: Add case to multi-action array switch (~line 4135) only if supporting action arrays
3. Create the corresponding `execute*Directly()` function
4. Deploy with `npx trigger deploy`

**Debugging Approach**:
1. Search for "Unknown step type" to find which switch statement throws the error
2. Grep for existing node types (e.g., `case 'send-message'`) to see all switch locations
3. Ensure your new case is in the same switch that threw the error