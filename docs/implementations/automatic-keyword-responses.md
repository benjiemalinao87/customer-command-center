# Automatic Keyword Response System Implementation

## Implementation Status: COMPLETE ✅

**Last Updated:** May 26, 2025

## 1. Overview

### Purpose & Scope
This feature implements an automatic keyword response system that allows users to configure automated responses based on specific keywords or phrases detected in incoming messages. The system enables workspace admins to create, manage, and activate keyword-based rules that can either send predetermined text responses or trigger more complex workflows.

### Stakeholders
- **End Users**: Customer service agents who benefit from automated responses to common inquiries
- **Workspace Admins**: Users who configure and manage the keyword rules
- **Developers**: Responsible for implementing and maintaining the feature
- **Product Managers**: Responsible for feature roadmap and requirements

## 2. What It Does (Capabilities)

- **Create keyword rules** with specific match types (contains, equals, starts with, ends with)
- **Define multiple keywords** for each rule that trigger the same response
- **Toggle rules** on/off without deleting them
- **Connect rules to sub-flows** for complex response patterns
- **Provide direct text responses** for simple automation scenarios
- **Search and filter** existing keyword rules
- **Edit and delete** existing keyword rules
- **Track usage metrics** of keyword rule activations
- **Handle error conditions** such as duplicate rules or invalid keyword formats
- **Support multi-workspace isolation** with workspace-specific rules

## 3. User Flow

```
                            ┌─────────────────────────┐
                            │  User visits            │
                            │  Flow Manager           │
                            └───────────┬─────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────┐
                            │  Selects                │
                            │  Keywords Tab           │
                            └───────────┬─────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────┐
                            │   Choose Action?        │
                            │  ┌─────────────────┐   │
                            │  │ Create New      │   │
                            │  │ Manage Existing │   │
                            │  └─────────────────┘   │
                            └─────┬───────────┬───────┘
                                  │           │
                    Create New ◄──┘           └──► Manage Existing
                                  │                       │
                                  ▼                       ▼
                    ┌──────────────────────┐  ┌──────────────────────┐
                    │  Click Add Keyword   │  │  View Keyword List   │◄──┐
                    │  Button              │  │                      │   │
                    └──────────┬───────────┘  └──────┬──────┬────┬───┘   │
                               │                     │      │    │       │
                               ▼                     │      │    │       │
                    ┌──────────────────────┐         │      │    │       │
                    │  Fill Keyword Form   │◄────────┤      │    │       │
                    │  - Name              │  Edit   │      │    │       │
                    │  - Description       │         │      │    │       │
                    └──────────┬───────────┘         │      │    │       │
                               │                     │      │    │       │
                               ▼              Toggle │      │    │       │
                    ┌──────────────────────┐         │      │    │       │
                    │  Define Match Rule   │         │      │    │       │
                    │  - Contains          │         │      │    │       │
                    │  - Equals            │         │      │    │       │
                    │  - Starts With       │         ▼      │    │       │
                    │  - Ends With         │  ┌──────────────────────┐   │
                    └──────────┬───────────┘  │  Activate/Deactivate │   │
                               │              │  Rule                │   │
                               ▼              └──────────┬───────────┘   │
                    ┌──────────────────────┐            │               │
                    │  Enter Keywords      │            └───────────────┤
                    │  - keyword1          │                            │
                    │  - keyword2          │                            │
                    │  - keyword3          │                     Delete │
                    └──────────┬───────────┘                            │
                               │                                 ┌──────────────────┐
                               ▼                                 │  Remove Rule     │
                    ┌──────────────────────┐                     │  (Confirmation)  │
                    │  Choose Response     │                     └──────────┬───────┘
                    │  Type:               │                                │
                    │  ┌─────────────────┐ │                                │
                    │  │ Sub Flow        │ │                                │
                    │  │ Text Reply      │ │                                │
                    │  └─────────────────┘ │                                │
                    └──────────┬───────────┘                                │
                               │                                            │
                               ▼                                            │
                    ┌──────────────────────┐                                │
                    │  Save Keyword Rule   │                                │
                    └──────────┬────────���──┘                                │
                               │                                            │
                               └────────────────────────────────────────────┘
```

## 4. Front-end & Back-end Flow

### Keyword Management Flow

```
┌──────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ User │     │ React UI │     │ API Layer │     │ Services │     │ Supabase │
└──┬───┘     └────┬─────┘     └─────┬─────┘     └────┬─────┘     └────┬─────┘
   │              │                  │                 │                │
   │ Open         │                  │                 │                │
   │ Keywords Tab │                  │                 │                │
   ├─────────────►│                  │                 │                │
   │              │                  │                 │                │
   │              │ GET              │                 │                │
   │              │ /api/keywords    │                 │                │
   │              ├─────────────────►│                 │                │
   │              │                  │                 │                │
   │              │                  │ getKeywords()   │                │
   │              │                  ├────────────────►│                │
   │              │                  │                 │                │
   │              │                  │                 │ select()       │
   │              │                  │                 │ FROM           │
   │              │                  │                 │ keyword_rules  │
   │              │                  │                 ├───────────────►│
   │              │                  │                 │                │
   │              │                  │                 │ keyword rules  │
   │              │                  │                 │◄───────────────┤
   │              │                  │                 │                │
   │              │                  │ formatted rules │                │
   │              │                  │◄────────────────┤                │
   │              │                  │                 │                │
   │              │ rules list       │                 │                │
   │              │◄─────────────────┤                 │                │
   │              │                  │                 │                │
   │◄─────────────┤                  │                 │                │
   │ Display      │                  │                 │                │
   │ rules list   │                  │                 │                │
   │              │                  │                 │                │
   │ Create       │                  │                 │                │
   │ new rule     │                  │                 │                │
   ├─────────────►│                  │                 │                │
   │              │                  │                 │                │
   │              │ POST             │                 │                │
   │              │ /api/keywords    │                 │                │
   │              ├─────────────────►│                 │                │
   │              │                  │                 │                │
   │              │                  │ createKeyword() │                │
   │              │                  ├────────────────►│                │
   │              │                  │                 │                │
   │              │                  │                 │ insert()       │
   │              │                  │                 ├───────────────►│
   │              │                  │                 │                │
   │              │                  │                 │ success        │
   │              │                  │                 │◄───────────────┤
   │              │                  │                 │                │
   │              │                  │ created rule    │                │
   │              │                  │◄────────────────┤                │
   │              │                  │                 │                │
   │              │ new rule         │                 │                │
   │              │◄─────────────────┤                 │                │
   │              │                  │                 │                │
   │◄─────────────┤                  │                 │                │
   │ Updated UI   │                  │                 │                │
   │              │                  │                 │                │
   │ Toggle       │                  │                 │                │
   │ activation   │                  │                 │                │
   ├─────────────►│                  │                 │                │
   │              │                  │                 │                │
   │              │ PATCH            │                 │                │
   │              │ /api/keywords/   │                 │                │
   │              │ :id/toggle       │                 │                │
   │              ├─────────────────►│                 │                │
   │              │                  │                 │                │
   │              │                  │ toggleKeyword() │                │
   │              │                  ├────────────────►│                │
   │              │                  │                 │                │
   │              │                  │                 │ update()       │
   │              │                  │                 ├───────────────►│
   │              │                  │                 │                │
   │              │                  │                 │ success        │
   │              │                  │                 │◄───────────────┤
   │              │                  │                 │                │
   │              │                  │ updated status  │                │
   │              │                  │◄────────────────┤                │
   │              │                  │                 │                │
   │              │ toggle state     │                 │                │
   │              │◄─────────────────┤                 │                │
   │              │                  │                 │                │
   │◄─────────────┤                  │                 │                │
   │ Updated      │                  │                 │                │
   │ toggle UI    │                  │                 │                │
   │              │                  │                 │                │
```

### Incoming Message Processing Flow

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│ Customer │     │ API Layer │     │ Services │     │ Supabase │
│ (SMS)    │     │           │     │          │     │          │
└────┬─────┘     └─────┬─────┘     └────┬─────┘     └────┬─────┘
     │                 │                 │                │
     │ Send SMS to     │                 │                │
     │ Twilio number   │                 │                │
     ├────────────────►│                 │                │
     │                 │                 │                │
     │                 │ POST            │                │
     │                 │ /api/twilio/    │                │
     │                 │ webhook         │                │
     │                 │                 │                │
     │                 │                 │ insert()       │
     │                 │                 │ message to     │
     │                 │                 │ livechat_      │
     │                 │                 │ messages       │
     │                 │                 ├───────────────►│
     │                 │                 │                │
     │                 │                 │ success        │
     │                 │                 │◄───────────────┤
     │                 │                 │                │
     │                 │                 │ select()       │
     │                 │                 │ active         │
     │                 │                 │ keyword_rules  │
     │                 │                 ├───────────────►│
     │                 │                 │                │
     │                 │                 │ active rules   │
     │                 │                 │◄───────────────┤
     │                 │                 │                │
     │                 │                 │ Process        │
     │                 │                 │ keyword        │
     │                 │                 │ matching       │
     │                 │                 │ logic          │
     │                 │                 │                │
     │                 │                 │ ┌─────────────┐│
     │                 │                 │ │ Check each  ││
     │                 │                 │ │ rule:       ││
     │                 │                 │ │ - contains  ││
     │                 │                 │ │ - equals    ││
     │                 │                 │ │ - starts    ││
     │                 │                 │ │ - ends      ││
     │                 │                 │ └─────────────┘│
     │                 │                 │                │
     │                 │                 │ insert()       │
     │                 │                 │ to keyword_    │
     │                 │                 │ rule_logs      │
     │                 │                 ├───────────────►│
     │                 │                 │                │
     │                 │                 │ log created    │
     │                 │                 │◄───────────────┤
     │                 │                 │                │
     │                 │                 │ Execute        │
     │                 │                 │ response:      │
     │                 │                 │ - Text reply   │
     │                 │                 │ - Trigger flow │
     │                 │                 │                │
     │                 │ success         │                │
     │                 │◄────────────────┤                │
     │                 │                 │                │
     │◄────────────────┤                 │                │
     │ Receive         │                 │                │
     │ automated reply │                 │                │
     │ (if applicable) │                 │                │
     │                 │                 │                │
```

## 5. File Structure

```
deepseek-test-livechat/
├── frontend/
│   └── src/
│       ├── components/
│       │   └── flow-builder/
│       │       └── keywords/ [New folder for keyword components]
│       │           ├── KeywordManager.js [Main container component]
│       │           ├── KeywordForm.js [Form for creating/editing rules]
│       │           ├── KeywordList.js [List view of all keyword rules]
│       │           ├── KeywordListItem.js [Individual rule component]
│       │           └── KeywordContext.js [Context provider for keyword state]
│       ├── services/
│       │   └── keywordService.js [Frontend service for keyword API calls]
│       └── hooks/
│           └── useKeywords.js [Custom hook for keyword management]
├── backend/
│   ├── index.js [Main server file with Twilio webhook handler]
│   ├── keyword-integration.js [Reference implementation for keyword integration]
│   └── src/
│       ├── routes/
│       │   └── keywordRoutes.js [Express routes for keyword API]
│       ├── controllers/
│       │   └── keywordController.js [Request handlers for keyword routes]
│       ├── services/
│       │   ├── keywordService.js [Core business logic for keywords]
│       │   └── messageProcessor.js [Handles incoming messages + keyword matching]
│       ├── utils/
│       │   └── keywordProcessor.js [Utility for processing keyword matches]
│       └── models/
│           └── keywordRules.js [Database interface for keyword rules]
└── supabase/
    └── migrations/
        └── YYYYMMDD_keywords.sql [SQL migration for keyword tables]
```

## 6. Data & Logic Artifacts

### Database Tables

| Name | Purpose | Columns | Relationships |
|------|---------|---------|--------------|
| `keyword_rules` | Stores rule definitions | id, workspace_id, name, rule_type, keywords, flow_id, reply_text, is_active, created_at, updated_at | Belongs to workspace |
| `keyword_rule_logs` | Tracks rule activations | id, rule_id, message_id, contact_id, workspace_id, triggered_at, response_type | Belongs to keyword_rule, message, contact |
| `keyword_flows` | Maps rules to flows | id, rule_id, flow_id, workspace_id | Many-to-many between rules and flows |

#### keyword_rules Table
- **id** (UUID, Primary Key): Unique identifier
- **workspace_id** (TEXT, Not Null): Foreign key to workspace
- **name** (TEXT, Not Null): Human-readable rule name
- **rule_type** (TEXT, Not Null): 'contains', 'equals', 'starts_with', 'ends_with'
- **keywords** (JSONB, Not Null): Array of keyword strings
- **flow_id** (UUID, Null): Optional ID of associated flow
- **reply_text** (TEXT, Null): Optional text response
- **is_active** (BOOLEAN, Default true): Whether rule is active
- **created_at** (TIMESTAMP, Default now()): Creation timestamp
- **updated_at** (TIMESTAMP, Default now()): Last update timestamp

#### keyword_rule_logs Table
- **id** (UUID, Primary Key): Unique identifier
- **rule_id** (UUID, Not Null): Foreign key to triggered rule
- **message_id** (UUID, Not Null): ID of triggering message
- **contact_id** (UUID, Not Null): ID of message sender
- **workspace_id** (TEXT, Not Null): Workspace ID
- **triggered_at** (TIMESTAMP, Default now()): When rule triggered
- **response_type** (TEXT, Not Null): 'text' or 'flow'
- **success** (BOOLEAN, Default true): Whether response was successful

#### RLS Policies
```sql
-- Enable RLS
ALTER TABLE keyword_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_rule_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_flows ENABLE ROW LEVEL SECURITY;

-- Create policy for keyword_rules
CREATE POLICY "Users can only access their workspace keyword rules"
ON keyword_rules
FOR ALL
USING (workspace_id IN (
  SELECT workspace_id 
  FROM workspace_members 
  WHERE user_id = auth.uid()
));

-- Similar policies for keyword_rule_logs and keyword_flows
```

### Backend Functions

| Name | Module | Purpose | Inputs | Outputs |
|------|--------|---------|--------|---------|
| `getKeywords` | keywordService.js | Fetch keywords for workspace | workspace_id | keyword list |
| `createKeyword` | keywordService.js | Create new keyword rule | rule data | created rule |
| `updateKeyword` | keywordService.js | Update existing rule | id, rule data | updated rule |
| `toggleKeyword` | keywordService.js | Activate/deactivate rule | id, is_active | updated status |
| `deleteKeyword` | keywordService.js | Remove keyword rule | id | success status |
| `processMessage` | messageProcessor.js | Check incoming message for keyword matches | message, workspace_id | match results |
| `executeKeywordResponse` | messageProcessor.js | Execute response for matched rule | rule, message | response status |
| `logKeywordTrigger` | keywordService.js | Record rule activation | rule_id, message_id, etc. | log entry |

## 7. User Stories

1. **As a** workspace admin, **I want to** create keyword rules with multiple match types **so that** I can handle different message patterns effectively.

2. **As a** customer service agent, **I want to** have automated responses to common questions **so that** I can focus on more complex inquiries.

3. **As a** workspace admin, **I want to** temporarily disable a keyword rule **so that** I can stop automated responses without losing the rule configuration.

4. **As a** workspace admin, **I want to** edit existing keyword rules **so that** I can refine and improve my automation over time.

5. **As a** workspace admin, **I want to** search for specific keyword rules **so that** I can quickly find and manage them in a large ruleset.

6. **As a** developer, **I want to** log all keyword rule activations **so that** I can track usage and effectiveness.

7. **As a** workspace admin, **I want to** connect keyword rules to complex flows **so that** I can provide more sophisticated automated responses.

8. **As a** workspace admin, **I want to** see performance metrics for my keyword rules **so that** I can optimize my automation strategy.

9. **As a** contact, **I want to** receive immediate responses to my inquiries **so that** I don't have to wait for human assistance.

10. **As a** system admin, **I want to** ensure keyword rules are workspace-isolated **so that** different customers' automations don't interfere with each other.

## 8. Implementation Status and Completed Work

### Database Implementation - COMPLETE ✅
- **Database schema**: Created `keyword_rules`, `keyword_rule_logs`, and `keyword_flows` tables in Supabase
- **Row Level Security**: Implemented RLS policies to ensure data isolation between workspaces
- **Validation**: Added database-level constraints to ensure data integrity

### Backend Services - COMPLETE ✅
- **KeywordService**: Implemented full CRUD operations for keyword management
  - `getKeywords`: Fetch all or active-only keywords for a workspace
  - `getKeywordById`: Retrieve a specific keyword rule
  - `createKeyword`: Add new keyword rules with validation
  - `updateKeyword`: Modify existing keyword rules
  - `toggleKeyword`: Enable/disable keyword rules without deletion
  - `deleteKeyword`: Remove keyword rules
  - `checkMessageForKeywords`: Process messages against active keyword rules
  - `logKeywordTrigger`: Track rule activations for analytics

- **MessageProcessor**: Created service to handle incoming messages
  - `processMessage`: Analyzes messages for keyword matches
  - Integration with Twilio webhook handler via `keywordProcessor.js` utility
  - Support for both direct text replies and flow triggers
  - Detailed logging of processing results in `keyword_rule_logs` table
  - Early return from webhook handler when keyword match is found to prevent further processing

### API Endpoints - COMPLETE ✅
- **KeywordController**: Added endpoints for all keyword operations
  - `GET /api/keywords/workspace/:id`: List all keyword rules
  - `GET /api/keywords/workspace/:id/:keywordId`: Get single rule
  - `POST /api/keywords/workspace/:id`: Create new rule
  - `PUT /api/keywords/workspace/:id/:keywordId`: Update existing rule
  - `PATCH /api/keywords/workspace/:id/:keywordId/toggle`: Toggle rule status
  - `DELETE /api/keywords/workspace/:id/:keywordId`: Delete rule

- **API Integration**: Enhanced Twilio webhook handler to check for keyword matches
  - Short-circuit message processing if keyword match found
  - Support for automated responses triggered by keywords
  - Implemented in `backend/index.js` with support from `keywordProcessor.js` utility
  - Proper error handling to ensure webhook continues processing even if keyword matching fails

### Frontend Components - COMPLETE ✅
- **KeywordsSection**: Main container for managing keyword rules
  - Integrated with backend API services
  - Real-time updates after changes
  - Search and filter capabilities
  - MacOS-inspired clean design

- **CRUD Operations**: UI for all keyword management tasks
  - Create form with keyword management
  - Edit functionality with rule type selection
  - Toggle activation state
  - Delete with confirmation

- **Response Types**:
  - Direct text reply support
  - Sub-flow selection integration
  - Visual indicators for response types

### Additional Features - COMPLETE ✅
- **Error Handling**: Comprehensive error handling throughout
  - Form validation to ensure required fields
  - API error handling with user feedback
  - Logging for debugging and troubleshooting

- **Performance Optimization**:
  - Efficient database queries
  - State management for UI responsiveness
  - Caching of flow list and keyword data

## Original Implementation Plan

### Phase 1: MVP - COMPLETE ✅
- Database schema implementation
- Basic CRUD API for keyword rules
- Frontend UI for creating/editing rules
- Simple text response functionality
- Basic keyword matching for incoming messages

### Phase 2: Enhanced Features - COMPLETE ✅
- Connect keyword rules to flow builder
- Implement all match types (contains, equals, starts with, ends with)
- Add search and filtering capabilities
- Implement activation toggling
- Add basic usage metrics

### Phase 3: Advanced Features - PARTIALLY COMPLETE ⚠️
- Comprehensive logging system ✅
- Performance optimization for message processing ✅
- Twilio webhook integration for inbound messages ✅
- Advanced metrics and reporting ⏳ (Not Started)
- Bulk operations for keyword management ⏳ (Not Started)
- Testing and hardening ✅

## 10. Recent Updates

### May 26, 2025: Keyword Response System Fixes and Enhancements
- **Added**: Full integration with Twilio webhook handler in `backend/index.js`
- **Created**: New utility file `backend/src/utils/keywordProcessor.js` to handle keyword matching
- **Fixed**: Issue where keyword matches weren't being logged in the `keyword_rule_logs` table
- **Improved**: Message processing flow to check for keyword matches immediately after saving messages
- **Added**: Reference implementation in `backend/keyword-integration.js` for documentation purposes
- **Fixed**: Critical issue where contact ID was being used instead of phone number for SMS responses
- **Enhanced**: Improved error handling and logging for debugging keyword response issues
- **Updated**: `messageProcessor.js` to use the existing `/send-sms` API for consistent message handling
- **Added**: Metadata to outbound messages to track source of automated responses (keyword rules)
- **Implemented**: Contact lookup to get proper phone number before sending SMS responses

## 11. Future Roadmap

### Automated Response Priority Settings
- **Response Priority Configuration**: Create a settings panel to configure priority between automated response types
  - Allow admins to set order preference: Keyword > AI > Manual or AI > Keyword > Manual
  - Implement workspace-level settings with default configurations
  - Create toggle switches for enabling/disabling specific response types
  - Add queue timeout settings for fallback responses
- **Database Schema**: Add `automated_response_settings` table to store workspace preferences
  - Store ordered priority list of response mechanisms
  - Track enabled/disabled status for each response type
  - Include timeout settings for fallback triggers
- **Enhanced Message Processing Flow**:
  - Implement priority-based decision tree for incoming messages
  - Respect workspace settings when determining which response type to trigger
  - Add logging for which response type was selected and why
  - Create analytics dashboard for response type effectiveness
- **User Interface Enhancements**:
  - Add MacOS-inspired settings panel in workspace settings
  - Implement visual priority ordering system (drag-and-drop)
  - Create simple toggle switches for enabling/disabling mechanisms
  - Provide real-time preview of how message flow will process

### Other Planned Enhancements
- **Machine Learning Enhancement**: Implement fuzzy matching and intent recognition
- **Auto-Suggestion**: Recommend keyword rules based on common message patterns
- **A/B Testing**: Split testing for different keyword responses
- **Advanced Analytics**: Detailed performance metrics and optimization suggestions
- **Multi-language Support**: Keyword matching across different languages
- **Regular Expression Support**: More advanced pattern matching
- **Webhook Integration**: Connect keyword triggers to external systems
- **Scheduled Rules**: Time-based activation of keyword rules
- **Contact-specific Rules**: Personalized keyword responses based on contact data
- **Rule Templates**: Pre-built keyword sets for common industries/use cases

## References

1. [Twilio Autopilot](https://www.twilio.com/docs/autopilot)
2. [ChatGPT API Pattern Matching](https://platform.openai.com/docs/guides/gpt/pattern-matching)
3. [Intercom's Custom Bots](https://www.intercom.com/features/custom-bots)
4. [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
5. [React Query for API Data Management](https://tanstack.com/query/latest)
