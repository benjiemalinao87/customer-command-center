# AI Auto-Responder Queue Service Integration

## Overview

The AI Auto-Responder feature needs to be properly integrated with the existing queue service architecture. Currently, the auto-responder processes messages directly within the Twilio webhook handler, contrary to the established pattern where message processing is delegated to a dedicated queue service. This document outlines a comprehensive implementation plan to align the auto-responder feature with the existing architecture.

## Goal

To refactor the AI Auto-Responder feature to properly integrate with the queue-services repository, ensuring consistent architecture, improved reliability, proper rate limiting, and enhanced performance.

## Current vs. Target Architecture

### Current Architecture (Mixed Approach)
- Inbound messages are stored in `livechat_messages`
- Entries are added to `ai_response_queue` with status "pending"
- **But the Twilio webhook also directly generates AI responses in the request handler**
- This creates inconsistency and potential race conditions

### Target Architecture (Queue Service)
- Inbound messages are stored in `livechat_messages`
- Entries are added to `ai_response_queue` with status "pending"
- **Direct AI generation is removed from Twilio webhook**
- Queue service uses Supabase Realtime to watch for new entries in the `ai_response_queue` table
- Queue service calls API endpoint in main app to generate responses
- Results are sent back to `/send-sms` endpoint

## System Components and Responsibilities

### Main Repository (deepseek-test-livechat)
- **Twilio Webhook (`/twilio/:workspaceId`):**
  - Receives inbound SMS
  - Stores message in `livechat_messages`
  - Adds entry to `ai_response_queue` with status "pending"
  - **Removes direct AI generation code**

- **AI Generation Endpoint (`/api/ai/generate-response`):**
  - Takes message_id, workspace_id, contact_id
  - Uses existing AI generation code in aiClient/aiResponderWorker
  - Returns generated response with logging details

- **Send SMS Endpoint (`/send-sms`):**
  - Receives messages from queue service
  - Sends message via Twilio
  - Stores outbound message in `livechat_messages`

### Queue Service Repository (queue-services)
- **Realtime Subscription:**
  - Subscribes to INSERT events on `ai_response_queue` table in Supabase
  - Immediately processes new entries when they appear
  - More responsive than polling

- **Processing Logic:**
  - Calls `/api/ai/generate-response` endpoint in main repo
  - Processes the response with appropriate error handling
  - Calls back to `/send-sms` with generated response

- **Callback Mechanism:**
  - Sends results to `/send-sms` with proper payload format
  - Updates `ai_response_queue` entry status to "complete"
  - Sets processed_at timestamp

## Architecture Diagram

```
┌───────────────┐      ┌────────────────┐      ┌───────────────────┐
│  Customer     │      │  Twilio        │      │  Main App         │
│  (Contact)    │──────►  Webhooks      │──────►  /twilio/:id      │
└───────────────┘      └────────────────┘      └─────────┬─────────┘
                                                         │
                                                         │ Stores
                                                         ▼
┌───────────────┐      ┌────────────────┐      ┌─────────────────────┐
│  Queue        │◄─────┤  Supabase      │◄─────┤  Database           │
│  Service      │      │  Realtime      │      │  ai_response_queue  │
│  (Subscription)│      │  Notification  │      │  (status="pending") │
└───────┬───────┘      └────────────────┘      └─────────────────────┘
        │
        │ API Call
        ▼
┌───────────────┐      ┌────────────────┐      
│  Main App     │      │  Main App      │      
│  /generate-   │─────►  AI Generation  │      
│  response     │      │  Logic         │      
└───────┬───────┘      └────────────────┘      
        │
        │ Get Response
        ▼
┌───────────────┐      ┌────────────────┐      ┌─────────────────────┐
│  Queue        │      │  Main App      │      │  Twilio             │
│  Worker       │──────►  /send-sms     │──────►  SMS API            │
└───────────────┘      └────────────────┘      └─────────────────────┘
                                                         │
                                                         │ Delivers
                                                         ▼
                                               ┌─────────────────────┐
                                               │  Customer           │
                                               │  Phone              │
                                               └─────────────────────┘
```

## Implementation Steps

### Phase 1: Remove Direct Processing
1. Modify Twilio webhook handler to remove direct AI generation code
2. Ensure proper entry creation in `ai_response_queue`
3. Add clear logging for debugging

### Phase 2: Create AI Generation Endpoint
1. Create `/api/ai/generate-response` endpoint in main app
2. Reuse existing AI generation code
3. Implement proper error handling and logging

### Phase 3: Implement Queue Service Components
1. Add Supabase Realtime subscription to queue service
2. Implement processing logic
3. Configure proper error handling and retry mechanism
4. Set up monitoring

### Phase 4: Update Callback Integration
1. Ensure queue service can call back to `/send-sms` endpoint
2. Format payload correctly
3. Update queue entry status
4. Implement logging

### Phase 5: Testing and Monitoring
1. Test end-to-end flow with real messages
2. Monitor queue performance
3. Verify proper rate limiting
4. Test error handling scenarios

## Expected Payload Formats

### Generation Request (Queue Service → Main App)
```json
{
  "workspace_id": "15213",
  "contact_id": "9cd5feff-10e4-4500-9fb8-0887f1d8e9ac",
  "message_id": "4c2a448a-2606-43ff-88a8-eca7976c8b20"
}
```

### Generation Response (Main App → Queue Service)
```json
{
  "success": true,
  "response": "Thank you for your message! We offer a range of home improvement services including kitchen remodeling, bathroom renovations, and custom cabinetry. Would you like more information about any specific service?",
  "logId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Send SMS Request (Queue Service → Main App)
```json
{
  "to": "+15551234567",
  "message": "Thank you for your message! We offer a range of home improvement services including kitchen remodeling, bathroom renovations, and custom cabinetry. Would you like more information about any specific service?",
  "workspaceId": "15213",
  "contactId": "9cd5feff-10e4-4500-9fb8-0887f1d8e9ac",
  "metadata": {
    "contactId": "9cd5feff-10e4-4500-9fb8-0887f1d8e9ac",
    "isAiGenerated": true,
    "aiLogId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

## Benefits of This Approach

1. **Consistency**: Aligns with the existing architecture where the queue service handles asynchronous processing
2. **Reliability**: Proper rate limiting and retry mechanisms
3. **Scalability**: Queue service can scale independently of main app
4. **Maintainability**: Clear separation of concerns
