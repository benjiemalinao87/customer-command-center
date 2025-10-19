# Outgoing Call Feature Implementation

## Overview

This document outlines the implementation of the outgoing call feature in the board component, which allows users to make phone calls directly from the CRM interface using Twilio Voice SDK with proper call logging and real-time updates.

## Features Implemented

### 1. Call Service (`frontend/src/services/callService.js`)
- **Singleton service** managing call lifecycle and state
- **Twilio Voice SDK integration** for actual call handling
- **Fallback simulation** for development/testing when Twilio is unavailable
- **Call log management** via backend API endpoints
- **Phone number formatting** to E.164 standard
- **Active call tracking** and duration monitoring

### 2. Call Control Modal (`frontend/src/components/board/components/CallControlModal.js`)
- **Real-time call status display** (initiating, ringing, in-progress, etc.)
- **Call duration timer** with live updates
- **Mute/unmute toggle** functionality
- **End call button** with proper cleanup
- **MacOS-inspired UI design** with clean aesthetics
- **Toast notifications** for user feedback

### 3. Backend API Routes (`backend/src/routes/calls.js`)
- **POST /api/calls/initiate** - Create call log and initiate call
- **PUT /api/calls/:callId/status** - Update call status and duration
- **GET /api/calls/history/:workspaceId** - Fetch call history
- **GET /api/calls/stats/:workspaceId** - Get call statistics
- **Real-time Socket.IO events** for workspace notifications

### 4. Board Integration (`frontend/src/components/board/sections/SpeedToLeadBoard.js`)
- **Call button integration** in contact cards
- **Modal state management** for active calls
- **Toast notifications** for call status updates
- **Error handling** and user feedback

## Technical Architecture

### Call Flow
1. **User clicks Call button** on contact card
2. **Call service initializes** with workspace context
3. **Backend API creates call log** entry with 'initiated' status
4. **Twilio Voice SDK makes call** (or fallback simulation)
5. **Call control modal opens** showing active call
6. **Real-time status updates** via Socket.IO events
7. **Call ends** and duration is recorded in database

### Database Schema
The feature uses the existing `call_logs` table:
```sql
call_logs (
  id: UUID PRIMARY KEY,
  workspace_id: UUID,
  call_sid: TEXT,
  direction: TEXT ('inbound'|'outbound'),
  from_number: TEXT,
  to_number: TEXT,
  status: TEXT ('initiated'|'ringing'|'in-progress'|'completed'|'failed'|'busy'|'no-answer'),
  duration: INTEGER (seconds),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)
```

### Real-time Communication
- **Socket.IO events** for workspace-level call notifications
- **call:initiated** - When call starts
- **call:status_updated** - When call status changes
- **Existing websocket infrastructure** leveraged (no new services)

## API Endpoints

### POST /api/calls/initiate
**Purpose**: Create call log and initiate outgoing call
**Request Body**:
```json
{
  "contactId": "uuid",
  "workspaceId": "uuid", 
  "phoneNumber": "+1234567890",
  "fromNumber": "+1987654321"
}
```
**Response**:
```json
{
  "success": true,
  "callId": "uuid",
  "callSid": "call_123_abc",
  "status": "initiated"
}
```

### PUT /api/calls/:callId/status
**Purpose**: Update call status and duration
**Request Body**:
```json
{
  "status": "completed",
  "duration": 120
}
```

### GET /api/calls/history/:workspaceId
**Purpose**: Fetch call history with contact details
**Query Parameters**: `limit`, `offset`

### GET /api/calls/stats/:workspaceId
**Purpose**: Get call statistics for dashboard
**Response**:
```json
{
  "stats": {
    "total": 150,
    "today": 12,
    "answered": 8,
    "answerRate": 67,
    "avgDuration": 180.5
  }
}
```

## Usage Instructions

### For Users
1. **Navigate to Speed to Lead Board** in the CRM
2. **Find contact** you want to call
3. **Click the Call button** on contact card
4. **Call control modal opens** showing call status
5. **Use mute/unmute** and end call controls as needed
6. **Call history** is automatically saved

### For Developers
1. **Import call service**: `import { callService } from '../../../services/callService'`
2. **Initialize service**: `await callService.initialize(workspaceId)`
3. **Make call**: `await callService.makeCall(contact, workspaceId)`
4. **Handle call events** via modal or custom UI

## Configuration

### Environment Variables
- `TWILIO_ACCOUNT_SID` - Twilio account identifier
- `TWILIO_AUTH_TOKEN` - Twilio authentication token
- `TWILIO_PHONE_NUMBER` - Default outgoing number
- `SUPABASE_URL` - Database connection URL
- `SUPABASE_SERVICE_KEY` - Database service key

### Twilio Voice SDK Setup
The service automatically detects and uses the existing `VoiceCallService` from `src/services/TwilioService.ts`. If unavailable, it falls back to simulation mode for development.

## Error Handling

### Frontend
- **Toast notifications** for user-friendly error messages
- **Graceful fallbacks** when Twilio service unavailable
- **Automatic cleanup** on call failures
- **Console logging** for debugging

### Backend
- **Comprehensive error responses** with descriptive messages
- **Database transaction safety** for call log operations
- **Socket.IO error handling** for real-time events
- **Detailed server logging** for troubleshooting

## Testing

### Manual Testing
1. **Start backend server**: `npm start` in `/backend`
2. **Start frontend server**: `npm start` in `/frontend`
3. **Navigate to board** and test call functionality
4. **Check call logs** in database and UI
5. **Verify real-time updates** across browser tabs

### Development Mode
- **Fallback simulation** works without Twilio credentials
- **Call duration simulation** for testing UI
- **Mock call status transitions** for development

## Future Enhancements

### Planned Features
- **Incoming call handling** with popup notifications
- **Call recording** integration
- **Call notes** and follow-up reminders
- **Multi-provider support** (beyond Twilio)
- **Advanced call analytics** and reporting
- **Call queue management** for teams

### Technical Improvements
- **WebRTC integration** for browser-based calling
- **Call transfer** and conference capabilities
- **Voice mail** integration
- **Call disposition** tracking
- **Automated call logging** with AI transcription

## Troubleshooting

### Common Issues

**Call fails to initiate**
- Check Twilio credentials in environment variables
- Verify phone number format (E.164 required)
- Check browser microphone permissions
- Review backend logs for API errors

**Modal doesn't open**
- Verify CallControlModal import in SpeedToLeadBoard
- Check React state management for modal visibility
- Ensure call service initialization completed

**Database errors**
- Verify Supabase connection and credentials
- Check call_logs table schema and permissions
- Review backend API route configuration

**Real-time updates not working**
- Verify Socket.IO connection in browser dev tools
- Check workspace room subscription
- Review backend Socket.IO event emission

### Debug Logging
Enable detailed logging by setting console log levels:
```javascript
// In callService.js
const logger = {
  info: console.log,
  warn: console.warn, 
  error: console.error
};
```

## Dependencies

### Frontend
- `@chakra-ui/react` - UI components and theming
- `react` - Core React framework
- `@supabase/supabase-js` - Database client (legacy, being phased out)

### Backend  
- `express` - Web server framework
- `socket.io` - Real-time communication
- `@supabase/supabase-js` - Database operations
- `twilio` - Voice calling service

### External Services
- **Twilio Voice** - Phone call infrastructure
- **Supabase** - Database and real-time subscriptions
- **Socket.IO** - WebSocket communication

## Security Considerations

### Data Protection
- **Phone numbers encrypted** in database
- **Call logs access controlled** by workspace permissions
- **API endpoints protected** by authentication middleware
- **Sensitive data excluded** from client-side logging

### Privacy Compliance
- **Call recording consent** (when implemented)
- **Data retention policies** for call logs
- **GDPR compliance** for EU users
- **Audit trails** for call activities

---

## Summary

The outgoing call feature provides a complete solution for making phone calls directly from the CRM interface with proper logging, real-time updates, and user-friendly controls. The implementation follows best practices for error handling, security, and scalability while maintaining the existing application architecture and design patterns.
