# Trigger.dev Queue Service Implementation

## 1. Overview

### Purpose & Scope
- Implement a robust message queuing and scheduling system using Trigger.dev
- Handle delayed and scheduled SMS messages with reliable delivery
- Support both immediate and future message scheduling with retry capabilities

### Stakeholders
- **Users**: Small business owners, coaches, and home improvement professionals
- **Developers**: Backend team maintaining the messaging infrastructure
- **System Admins**: Responsible for monitoring queue health and performance

## 2. What It Does (Capabilities)

- **Message Scheduling Types**:
  - Immediate SMS delivery with queuing
  - Delay-based scheduling (wait.for)
  - Time-based scheduling (wait.until)
  - Recurring message scheduling (cron-based)

- **Core Features**:
  - Message persistence in Supabase
  - Automatic retries on failure
  - Status tracking and updates
  - Media attachment support
  - Workspace-specific configurations
  - Error handling and logging

## 3. User Flow

```
                              ┌─────────────┐
                              │    User     │
                              └──────┬──────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │  Choose Schedule Type          │
                    │  ┌──────────────────────────┐ │
                    │  │ • Immediate              │ │
                    │  │ • Delay (minutes)        │ │
                    │  │ • Specific Time          │ │
                    │  │ • Recurring              │ │
                    │  └──────────────────────────┘ │
                    └─┬──────┬────────┬──────┬─────┘
                      │      │        │      │
        ┌─────────────┘      │        │      └────────────┐
        │                    │        │                   │
        ▼                    ▼        ▼                   ▼
┌───────────────┐   ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────┐
│ Queue Message │   │ Set Delay Minutes  │  │ Set Date/Time      │  │ Set Schedule    │
│ (Immediate)   │   │                    │  │                    │  │ Pattern         │
└───────┬───────┘   └─────────┬──────────┘  └──────────┬─────────┘  └────────┬────────┘
        │                     │                        │                     │
        ▼                     ▼                        ▼                     ▼
┌───────────────┐   ┌────────────────────┐  ┌────────────────────┐  ┌─────────────────┐
│ Process       │   │ Wait for Delay     │  │ Wait Until Time    │  │ Create          │
│ Queue         │   │                    │  │                    │  │ Recurring Job   │
└───────┬───────┘   └─────────┬──────────┘  └──────────┬─────────┘  └────────┬────────┘
        │                     │                        │                     │
        │                     └────────────┬───────────┘                     │
        │                                  │                                 │
        └──────────────────────────────────┼─────────────────────────────────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │  Send Message  │
                                  │  via Twilio    │
                                  └───────┬────────┘
                                          │
                                          ▼
                                  ┌────────────────┐
                                  │  Check Result  │
                                  └───┬────────┬───┘
                                      │        │
                              Success │        │ Failure
                                      │        │
                         ┌────────────▼──┐  ┌──▼──────────┐
                         │ Update Status │  │ Retry Logic │
                         │ to Delivered  │  │ (Max 3x)    │
                         └───────────────┘  └──┬──────────┘
                                               │
                                               └──────┐
                                                      │
                                               ┌──────▼──────┐
                                               │ Send Message│
                                               │ (Retry)     │
                                               └─────────────┘
```

## 4. Front-end & Back-end Flow

```
┌────────┐     ┌────────┐     ┌─────────────┐     ┌──────────┐     ┌────────┐
│ Client │     │ Routes │     │ Trigger.dev │     │ Supabase │     │ Twilio │
└───┬────┘     └───┬────┘     └──────┬──────┘     └────┬─────┘     └───┬────┘
    │              │                  │                 │               │
    │ Schedule     │                  │                 │               │
    │ Message      │                  │                 │               │
    │ Request      │                  │                 │               │
    ├─────────────►│                  │                 │               │
    │              │                  │                 │               │
    │              │ Save Message     │                 │               │
    │              │ Details          │                 │               │
    │              ├─────────────────────────────────────►               │
    │              │                  │                 │               │
    │              │                  │ insert()        │               │
    │              │                  │ scheduled_      │               │
    │              │                  │ sms_jobs        │               │
    │              │                  │                 │               │
    │              │ success          │                 │               │
    │              │◄─────────────────────────────────────┐             │
    │              │                  │                 │               │
    │              │ Create Job/Task  │                 │               │
    │              ├─────────────────►│                 │               │
    │              │                  │                 │               │
    │              │                  │ Job registered  │               │
    │              │                  │ in queue        │               │
    │              │                  │                 │               │
    │              │ Job Created      │                 │               │
    │              │◄─────────────────┤                 │               │
    │              │                  │                 │               │
    │ Scheduling   │                  │                 │               │
    │ Confirmed    │                  │                 │               │
    │◄─────────────┤                  │                 │               │
    │              │                  │                 │               │
    │              │                  │                 │               │
    │              │           ┌──────────────────┐     │               │
    │              │           │  ⏰ Wait Period  │     │               │
    │              │           │  (Scheduled time)│     │               │
    │              │           └──────────────────┘     │               │
    │              │                  │                 │               │
    │              │                  │ Update Status   │               │
    │              │                  │ to Processing   │               │
    │              │                  ├────────────────►│               │
    │              │                  │                 │               │
    │              │                  │ success         │               │
    │              │                  │◄────────────────┤               │
    │              │                  │                 │               │
    │              │                  │ Send SMS        │               │
    │              │                  │ (to, body,      │               │
    │              │                  │ mediaUrl)       │               │
    │              │                  ├─────────────────────────────────►│
    │              │                  │                 │               │
    │              │                  │                 │ SMS sent      │
    │              │                  │                 │ to carrier    │
    │              │                  │                 │               │
    │              │                  │ Delivery Status │               │
    │              │                  │◄─────────────────────────────────┤
    │              │                  │                 │               │
    │              │                  │ Update Final    │               │
    │              │                  │ Status          │               │
    │              │                  │ (delivered/     │               │
    │              │                  │  failed)        │               │
    │              │                  ├────────────────►│               │
    │              │                  │                 │               │
    │              │                  │ success         │               │
    │              │                  │◄────────────────┤               │
    │              │                  │                 │               │
```

## 5. File Structure

```
backend/
├── src/
│   └── routes/
│       └── triggerRoutes.js      # API endpoints for message scheduling
└── trigger/
    ├── client.js                 # Trigger.dev client configuration
    ├── messageJobs.js            # Message sending job definitions
    ├── scheduleTasks.js          # Scheduling task definitions
    └── waitService.js            # Wait utilities for scheduling
```

## 6. Data & Logic Artifacts

### Database Tables
- `scheduled_sms_jobs`
  - Purpose: Store scheduled message details and status
  - Fields: id, to_phone, body, workspace_id, scheduled_time, status, metadata

### Jobs & Tasks
1. **delayMessageJob**
   - Purpose: Handle delay-based message scheduling
   - Input: to, body, delayMinutes, workspaceId, mediaUrl
   - Output: Message delivery status

2. **untilMessageJob**
   - Purpose: Handle time-based message scheduling
   - Input: to, body, scheduledTime, workspaceId, mediaUrl
   - Output: Message delivery status

## 7. User Stories

1. As a business owner, I want to schedule messages for later delivery so that I can plan my communication in advance.
2. As a coach, I want to set up recurring messages so that I can maintain regular client communication.
3. As an admin, I want to see message delivery status so that I can ensure messages are being sent.
4. As a user, I want to receive confirmation when a message is scheduled so that I know it will be sent.
5. As a system admin, I want failed messages to be retried so that temporary issues don't affect delivery.
6. As a developer, I want detailed error logs so that I can debug issues effectively.
7. As a business owner, I want to attach media to scheduled messages so that I can send rich content.
8. As a user, I want to cancel scheduled messages so that I can prevent unwanted sends.
9. As an admin, I want to see queued messages so that I can manage the message pipeline.
10. As a developer, I want proper error handling so that the system remains stable.

## 8. Implementation Stages

### Phase 1: MVP (Completed)
- Basic message scheduling
- Delay-based and time-based scheduling
- Status tracking
- Error handling

### Phase 2: Enhanced Features
- Message templates
- Bulk scheduling
- Advanced retry strategies
- Dashboard for monitoring

### Phase 3: Scale & Optimize
- Multi-region support
- Performance optimizations
- Advanced analytics
- API rate limiting

## 9. Future Roadmap

### Planned Enhancements
- Message templating system
- Bulk message scheduling
- Advanced scheduling patterns
- Message preview and testing
- Real-time delivery tracking

### Performance Optimizations
- Implement caching for frequent queries
- Optimize database queries
- Add message batching
- Implement rate limiting

### Scaling Considerations
- Horizontal scaling of worker processes
- Multi-region message routing
- Load balancing strategies
- Database sharding for high volume

## 10. API Reference

### Send SMS Immediately
**Endpoint**: `/api/trigger/send-sms`  
**Method**: POST  
**Description**: Send an SMS message immediately through Trigger.dev background job

**Request Body**:
```json
{
  "to": "+1234567890",
  "body": "Your message content",
  "mediaUrl": "https://example.com/image.jpg", // Optional
  "workspaceId": "ws_123",
  "fromNumber": "+1987654321"
}
```

**Sample Curl**:
```bash
curl -X POST http://localhost:3000/api/trigger/send-sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hello, this is an immediate message",
    "workspaceId": "ws_123",
    "fromNumber": "+1987654321"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_immediate_xyz",
    "status": "processing",
    "messageId": "msg_123"
  }
}
```

### Schedule Message with Delay
**Endpoint**: `/api/trigger/schedule-delay`  
**Method**: POST  
**Description**: Schedule a message to be sent after a specified delay in minutes

**Request Body**:
```json
{
  "to": "+1234567890",
  "body": "Your message content",
  "mediaUrl": "https://example.com/image.jpg", // Optional
  "workspaceId": "ws_123",
  "delayMinutes": 5,
  "fromNumber": "+1987654321"
}
```

**Sample Curl**:
```bash
curl -X POST http://localhost:3000/api/trigger/schedule-delay \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hello from delay scheduler",
    "workspaceId": "ws_123",
    "delayMinutes": 5,
    "fromNumber": "+1987654321"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_xyz",
    "status": "scheduled",
    "scheduledTime": "2025-05-11T15:22:43+10:00"
  }
}
```

### Schedule Message for Specific Time
**Endpoint**: `/api/trigger/schedule-until`  
**Method**: POST  
**Description**: Schedule a message to be sent at a specific date and time

**Request Body**:
```json
{
  "to": "+1234567890",
  "body": "Your message content",
  "mediaUrl": "https://example.com/image.jpg", // Optional
  "workspaceId": "ws_123",
  "scheduledTime": "2025-05-11T16:00:00+10:00",
  "fromNumber": "+1987654321"
}
```

**Sample Curl**:
```bash
curl -X POST http://localhost:3000/api/trigger/schedule-until \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "body": "Hello at specific time",
    "workspaceId": "ws_123",
    "scheduledTime": "2025-05-11T16:00:00+10:00",
    "fromNumber": "+1987654321"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc",
    "status": "scheduled",
    "scheduledTime": "2025-05-11T16:00:00+10:00"
  }
}
```

### Cancel Scheduled Message
**Endpoint**: `/api/trigger/cancel-job`  
**Method**: POST  
**Description**: Cancel a previously scheduled message

**Request Body**:
```json
{
  "jobId": "job_xyz",
  "workspaceId": "ws_123"
}
```

**Sample Curl**:
```bash
curl -X POST http://localhost:3000/api/trigger/cancel-job \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "job_xyz",
    "workspaceId": "ws_123"
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_xyz",
    "status": "cancelled"
  }
}
```

### Get Job Status
**Endpoint**: `/api/trigger/job-status`  
**Method**: GET  
**Description**: Get the current status of a scheduled message job

**Query Parameters**:
- jobId: The ID of the job to check
- workspaceId: The workspace ID

**Sample Curl**:
```bash
curl http://localhost:3000/api/trigger/job-status?jobId=job_xyz&workspaceId=ws_123
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "job_xyz",
    "status": "completed",
    "scheduledTime": "2025-05-11T15:22:43+10:00",
    "completedTime": "2025-05-11T15:22:45+10:00",
    "messageStatus": "delivered"
  }
}
```

## References
- [Trigger.dev Documentation](https://trigger.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Twilio API Reference](https://www.twilio.com/docs/api)
- [Queue Design Patterns](https://aws.amazon.com/builders-library/reliability-patterns/)
