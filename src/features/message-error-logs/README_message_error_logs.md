# Message Error Logs Feature

## Overview
This feature provides a UI component in the Command Center for support staff to monitor SMS and Email sending/receiving failures across all workspaces.

## Components

### MessageErrorLogs.tsx
The main component that displays:
- Summary statistics (total errors, SMS/MMS errors, Email errors, outbound errors)
- Filterable and searchable table of error logs
- Real-time data from the `message_error_logs` table

## Database Table

The `message_error_logs` table is located in Supabase with the following schema:

```sql
CREATE TABLE message_error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'email', 'mms')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  error_code TEXT,
  error_message TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  recipient TEXT,
  sender TEXT,
  message_body TEXT,
  twilio_sid TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Features

1. **Statistics Cards**: Display total errors, SMS/MMS errors, Email errors, and outbound errors
2. **Filtering**: Filter by message type (SMS, MMS, Email) and direction (Inbound, Outbound)
3. **Search**: Search across error messages, error codes, recipients, senders, and workspace IDs
4. **Pagination**: Configurable limit (25, 50, 100, 200 logs)
5. **Real-time Refresh**: Manual refresh button to reload latest data

## Backend Integration

The error logging is integrated into the backend:

1. **messageErrorLogService.js**: Utility service for logging errors to the database
2. **SMS Sending**: Error logging added to `/send-sms` endpoint in both `index.js` and `sms.js` routes
3. **Email Sending**: Error logging added to `emailService.js`

## Usage

1. Navigate to Command Center
2. Click on "Msg Errors" in the sidebar
3. Use filters to narrow down errors by type or direction
4. Search for specific errors using the search box
5. Click refresh to get latest data

## Files

- `src/features/message-error-logs/components/MessageErrorLogs.tsx` - Main component
- `src/features/message-error-logs/index.ts` - Feature export
