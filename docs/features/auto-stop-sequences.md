# Auto-Stop Sequences Feature

## Overview

The Auto-Stop Sequences feature automatically stops active sequences when specific events occur, preventing confusing follow-up messages after a lead has taken a desired action (e.g., booked an appointment, replied to a message, changed status, or had a tag added).

## Use Cases

### 1. Appointment Booking
When a contact books an appointment, all active sequences are stopped to prevent follow-up messages.

```
Contact Books Appointment
        |
        v
┌─────────────────────────────┐
│  Cloudflare Worker          │
│  (booking-pages-worker or   │
│   calendar-booking-api)     │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  Create Appointment         │
│  in Database                │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  Call Backend API           │
│  POST /api/workspaces/...   │
│  /stop-sequences-on-        │
│  appointment                │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  autoStopService.js         │
│  checkAndStopSequencesOn    │
│  AppointmentBooked()        │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  Stop All Active Sequences  │
│  • flow_sequence_executions │
│  • flow_executions          │
│  • scheduled_sms_jobs       │
└─────────────────────────────┘
```

### 2. Message Response
When a contact replies to a sequence message, the sequence is stopped.

```
Contact Replies to Message
        |
        v
┌─────────────────────────────┐
│  Twilio Webhook Handler     │
│  (backend/routes/twilio.js) │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  checkAndStopSequencesOn    │
│  Response()                 │
└──────────────┬──────────────┘
               |
               v
┌─────────────────────────────┐
│  Stop Sequence Execution    │
│  Status: 'cancelled'        │
└─────────────────────────────┘
```

### 3. Status Change
When a contact's status changes to a configured value, sequences stop.

### 4. Tag Added
When a specific tag is added to a contact, sequences stop.

## Architecture

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Auto-Stop System                         │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        v                     v                     v
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Triggers    │    │   Service    │    │   Database   │
│              │    │              │    │              │
│ • Appointment│───▶│ autoStop     │───▶│ • flow_      │
│   Booking    │    │ Service.js   │    │   sequence_  │
│              │    │              │    │   executions │
│ • Response   │    │ • stop       │    │              │
│              │    │   Sequence   │    │ • flow_      │
│ • Status     │    │   Execution  │    │   executions │
│   Change     │    │              │    │              │
│              │    │ • Cancel     │    │ • scheduled_ │
│ • Tag Added  │    │   Jobs       │    │   sms_jobs   │
└──────────────┘    └──────────────┘    └──────────────┘
```

### Data Flow

```
┌───────────────────────────────────────────────────────────┐
│                    Sequence Execution Lifecycle            │
└───────────────────────────────────────────────────────────┘

1. Sequence Started
   ┌─────────────────┐
   │ Status: 'active'│
   │ started_at: NOW │
   └────────┬────────┘
            │
            v
2. Messages Scheduled
   ┌─────────────────────────────┐
   │ scheduled_sms_jobs          │
   │ status: 'scheduled'         │
   └────────┬────────────────────┘
            │
            v
3. Event Triggers Auto-Stop
   ┌─────────────────────────────┐
   │ • Appointment booked        │
   │ • Contact replied           │
   │ • Status changed            │
   │ • Tag added                 │
   └────────┬────────────────────┘
            │
            v
4. Auto-Stop Process
   ┌─────────────────────────────┐
   │ 1. Find active executions   │
   │ 2. Update status: 'cancelled'│
   │ 3. Set completed_at: NOW    │
   │ 4. Cancel pending jobs      │
   │ 5. Cancel flow_executions   │
   └─────────────────────────────┘
```

## API Endpoints

### Stop Sequences on Appointment Booking

**Endpoint:** `POST /api/workspaces/:workspaceId/contacts/:contactId/stop-sequences-on-appointment`

**Headers:**
- `Content-Type: application/json`
- `X-Trigger-Source: <source>` (for internal calls)
- `Authorization: Bearer <token>` (for external calls)

**Request Body:**
```json
{
  "appointmentId": "uuid-of-appointment"
}
```

**Response:**
```json
{
  "success": true,
  "stopped": 1,
  "sequencesStopped": 1,
  "flowExecutionsCancelled": 1
}
```

**ASCII Request Flow:**
```
┌──────────────┐
│   Client     │
│  (Cloudflare │
│   Worker)    │
└──────┬───────┘
       │ POST /api/workspaces/{id}/contacts/{id}/stop-sequences-on-appointment
       │ Headers: X-Trigger-Source, Content-Type
       │ Body: { appointmentId: "..." }
       v
┌──────────────────────────┐
│   Backend API            │
│   sequenceRoutes.js      │
│   • Validate request     │
│   • Check auth           │
└──────┬───────────────────┘
       │
       v
┌──────────────────────────┐
│   autoStopService.js     │
│   checkAndStopSequences  │
│   OnAppointmentBooked()  │
│   • Query active execs   │
│   • Stop each sequence   │
│   • Update database      │
└──────┬───────────────────┘
       │
       v
┌──────────────────────────┐
│   Database               │
│   • Update status        │
│   • Set completed_at     │
│   • Cancel jobs          │
└──────────────────────────┘
```

## Implementation Details

### Service: `autoStopService.js`

The service provides several functions for different auto-stop scenarios:

```javascript
// Stop sequences when appointment is booked
checkAndStopSequencesOnAppointmentBooked(contactId, workspaceId, appointmentId)

// Stop sequences when contact replies
checkAndStopSequencesOnResponse(contactId, workspaceId, messageId)

// Stop sequences on status change
checkAndStopSequencesOnStatusChange(contactId, workspaceId, newStatus)

// Stop sequences when tag is added
checkAndStopSequencesOnTagsAdded(contactId, workspaceId, tagNames)
```

### Core Function: `stopSequenceExecution()`

```
┌──────────────────────────────────────────────────┐
│         stopSequenceExecution() Process          │
└──────────────────────────────────────────────────┘

Input: executionId, workspaceId, reason, metadata
       │
       v
┌──────────────────────┐
│ 1. Get Pending Jobs  │
│    scheduled_sms_    │
│    jobs WHERE        │
│    execution_id      │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ 2. Cancel All Jobs   │
│    UPDATE status =   │
│    'cancelled'       │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ 3. Update Execution  │
│    status =          │
│    'cancelled'       │
│    completed_at =    │
│    NOW()             │
└──────────┬───────────┘
           │
           v
┌──────────────────────┐
│ 4. Cancel Flow Exec  │
│    If exists, update │
│    flow_executions   │
└──────────────────────┘
```

### Database Schema Changes

#### Tables Affected

```
flow_sequence_executions
├── status (active → cancelled)
├── completed_at (NULL → timestamp)
└── metadata (reason, appointment_id, etc.)

flow_executions
├── status (running/active → cancelled)
├── completed_at (NULL → timestamp)
└── metadata (cancelled_reason, appointment_id)

scheduled_sms_jobs
├── status (scheduled → cancelled)
└── cancelled_at (timestamp)
```

## Integration Points

### Cloudflare Workers

```
┌──────────────────────────────────────────────────┐
│        Booking Pages Worker Integration          │
└──────────────────────────────────────────────────┘

handleBookingSubmission()
    │
    ├─▶ Create Appointment
    │   └─▶ INSERT INTO appointments
    │
    ├─▶ Stop Sequences (NEW)
    │   └─▶ POST /api/.../stop-sequences-on-appointment
    │
    └─▶ Trigger Reminders
        └─▶ Schedule confirmation SMS/Email
```

```
┌──────────────────────────────────────────────────┐
│       Calendar Booking API Integration           │
└──────────────────────────────────────────────────┘

handleBook()
    │
    ├─▶ Create Appointment
    │   └─▶ INSERT INTO appointments
    │
    ├─▶ Stop Sequences (NEW)
    │   └─▶ POST /api/.../stop-sequences-on-appointment
    │
    └─▶ Trigger Reminders
        └─▶ Schedule confirmation SMS/Email
```

## Configuration

### Auto-Stop Rules in Sequences

Sequences can have auto-stop rules configured:

```javascript
{
  auto_stop_rules: {
    stopOnResponse: true,
    stopOnStatusChange: ['booked', 'qualified'],
    stopOnTagsAdded: ['appointment-scheduled', 'qualified']
  }
}
```

```
┌────────────────────────────────────────────┐
│      Auto-Stop Rule Evaluation             │
└────────────────────────────────────────────┘

Event Occurs
    │
    v
┌─────────────────────────┐
│ Check Sequence Rules    │
│ • stopOnResponse?       │
│ • stopOnStatusChange?   │
│ • stopOnTagsAdded?      │
└──────┬──────────────────┘
       │
       ├─▶ Rule Matches
       │   │
       │   v
       │   ┌──────────────┐
       │   │ Stop Sequence│
       │   └──────────────┘
       │
       └─▶ No Match
           │
           v
           ┌──────────────┐
           │ Continue     │
           │ Sequence     │
           └──────────────┘
```

## Testing

### Manual Test via cURL

```bash
curl -X POST "https://cc.automate8.com/api/workspaces/{workspaceId}/contacts/{contactId}/stop-sequences-on-appointment" \
  -H "Content-Type: application/json" \
  -H "X-Trigger-Source: manual-test" \
  -d '{"appointmentId": "test-appointment-123"}'
```

### Expected Results

```
Before:
┌─────────────────────────┐
│ flow_sequence_executions│
│ status: 'active'        │
│ completed_at: NULL      │
└─────────────────────────┘

After:
┌─────────────────────────┐
│ flow_sequence_executions│
│ status: 'cancelled'     │
│ completed_at: 2025-...  │
└─────────────────────────┘
```

## Benefits

```
┌─────────────────────────────────────────┐
│           Benefits of Auto-Stop          │
└─────────────────────────────────────────┘

1. Better Customer Experience
   └─▶ No confusing follow-ups after booking

2. Improved Conversion Rates
   └─▶ Focus on leads who haven't converted

3. Automation Efficiency
   └─▶ Sequences stop automatically
       No manual intervention needed

4. Data Accuracy
   └─▶ Clear status tracking
       completed_at timestamps
```

## Future Enhancements

```
┌─────────────────────────────────────────┐
│         Potential Enhancements          │
└─────────────────────────────────────────┘

□ Configurable auto-stop delays
  └─▶ Wait X minutes before stopping

□ Partial sequence stopping
  └─▶ Stop only future steps, not current

□ Notification when sequences stop
  └─▶ Alert team when auto-stop occurs

□ Analytics dashboard
  └─▶ Track auto-stop events and reasons

□ Custom auto-stop rules
  └─▶ Workspace-specific rules
```

## Related Files

- `backend/src/services/autoStopService.js` - Core auto-stop logic
- `backend/src/routes/sequenceRoutes.js` - API endpoints
- `cloudflare-workers/booking-pages-worker/src/index.ts` - Booking integration
- `cloudflare-workers/calendar-booking-api/src/handlers/book.ts` - Calendar integration
- `supabaseSchema/migrations/20251215_stop_sequences_on_appointment_booking.sql` - Database trigger

## Migration History

- **2025-12-15**: Initial implementation of auto-stop on appointment booking
- Added `checkAndStopSequencesOnAppointmentBooked()` function
- Integrated with Cloudflare Workers booking systems
- Created API endpoint for stopping sequences
