# Troubleshooting Plan for Dynamic Twilio Webhook Creation

## Problem Summary
1. Outbound text messages from LiveChat UI are not being sent
2. Inbound text messages are not being received

## Expected Behavior
1. **Outbound**: Messages should be sent, displayed in LiveChat UI, and saved to Supabase
2. **Inbound**: Messages should be received, displayed in LiveChat UI, and saved to Supabase

## Current State
Last working state: When Twilio SID was hardcoded in code and server
Current state: Upgrading to dynamic setup where users enter Twilio SID and auth token, and the app configures Twilio for inbound messages

## Key Files to Review
1. **backend/src/routes/twilio.js**: Contains the webhook configuration and message sending logic
2. **backend/index.js**: Contains the main API endpoints and socket.io setup
3. **frontend/src/services/messageService.js**: Handles message sending and receiving on the frontend
4. **frontend/src/services/messageStore.js**: Manages message state and socket connections
5. **frontend/src/components/livechat/livechat.js**: Main LiveChat component
6. **frontend/src/components/livechat/ChatArea.js**: Handles message display and sending

## Potential Issues and Troubleshooting Steps

### 1. Twilio Configuration Issues

**Potential Problems:**
- Incorrect Twilio credentials in workspace_twilio_config table
- Missing or incorrect phone numbers in twilio_numbers table
- Webhook URL not properly configured in Twilio

**Troubleshooting Steps:**
1. Verify Twilio credentials in Supabase:
   ```sql
   SELECT * FROM workspace_twilio_config WHERE workspace_id = 'your_workspace_id';
   ```

2. Verify phone numbers are correctly stored:
   ```sql
   SELECT * FROM twilio_numbers WHERE workspace_id = 'your_workspace_id';
   ```

3. Check webhook configuration in Twilio dashboard to ensure it points to the correct endpoint
4. Verify the `/twilio/configure-webhook` endpoint is correctly updating the webhook URL in Twilio

### 2. Outbound Message Flow Issues

**Potential Problems:**
- Socket connection issues between frontend and backend
- Error in the message sending process
- Incorrect phone number formatting
- Twilio client not being properly initialized with workspace credentials

**Troubleshooting Steps:**
1. Test the `/twilio/send/:workspaceId` endpoint directly with curl:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/send/your_workspace_id \
     -H "Content-Type: application/json" \
     -d '{"to": "+1234567890", "content": "Test message", "from": "+1987654321"}'
   ```

2. Check browser console for socket connection errors
3. Verify phone number formatting in the frontend (formatPhoneForTwilio function)
4. Add logging to the `getTwilioClientForWorkspace` function to ensure it's retrieving the correct credentials

### 3. Inbound Message Flow Issues

**Potential Problems:**
- Webhook URL not properly configured in Twilio
- Webhook validation failing
- Phone number lookup failing
- Message not being properly routed to the correct workspace

**Troubleshooting Steps:**
1. Test the webhook endpoint with a simulated Twilio request:
   ```bash
   curl -X POST https://cc.automate8.com/twilio \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "MessageSid=SM123&From=+1234567890&To=+1987654321&Body=Test inbound message"
   ```

2. Check if the phone number lookup is working correctly:
   ```sql
   SELECT * FROM twilio_numbers WHERE phone_number = '+1987654321';
   ```

3. Verify the webhook signature validation logic
4. Check the workspace-specific webhook endpoint: `/twilio/:workspaceId/webhook/message`

### 4. Socket.IO Connection Issues

**Potential Problems:**
- Socket.IO connection not established
- Socket.IO rooms not properly joined
- Message events not being emitted or received

**Troubleshooting Steps:**
1. Add additional logging to track socket connections and room joins
2. Verify that clients are joining the correct rooms based on contact ID
3. Test socket connection directly using a socket.io client tool
4. Check for any CORS or network issues preventing socket connections

### 5. Database Issues

**Potential Problems:**
- Messages not being saved to Supabase
- Contact lookup failing
- Workspace validation failing

**Troubleshooting Steps:**
1. Check message insertion logic in both outbound and inbound flows
2. Verify contact lookup and creation process
3. Check for any database permission issues
4. Verify that the correct workspace_id is being used in all database operations

## Testing Plan

### 1. Outbound Testing
1. Send a test message using curl to the backend endpoint:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/send/your_workspace_id \
     -H "Content-Type: application/json" \
     -d '{"to": "+1234567890", "content": "Test message", "from": "+1987654321"}'
   ```

2. If successful, test sending a message through the LiveChat UI
3. Verify the message appears in the UI and is saved to Supabase
4. Check Twilio logs to confirm the message was sent

### 2. Inbound Testing
1. Send a test inbound message using curl:
   ```bash
   curl -X POST https://cc.automate8.com/twilio \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "MessageSid=SM123&From=+1234567890&To=+1987654321&Body=Test inbound message"
   ```

2. Verify the message appears in the LiveChat UI and is saved to Supabase
3. Send an actual SMS to the Twilio number and verify it's received

## Implementation Verification

1. Verify that the dynamic webhook configuration is working:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/configure-webhook \
     -H "Content-Type: application/json" \
     -d '{"workspaceId": "your_workspace_id", "webhookType": "sms", "webhookUrl": "https://cc.automate8.com/twilio"}'
   ```

2. Check Twilio dashboard to confirm the webhook URL was updated
3. Verify that the phone numbers are correctly synced from Twilio to the database

## Debugging Approach

1. Add comprehensive logging at each step of the process
2. Isolate and test each component separately
3. Compare the current implementation with the last known working state
4. Focus on the changes made during the upgrade to dynamic configuration

## Fix Implementation and Testing Plan

The root cause of the issue was identified: the database is not correctly tracking the Twilio webhook configuration state. Even though Twilio is properly configured via the webhook URL, the `workspace_twilio_config` table doesn't reflect this (showing `is_configured: false` and `webhook_url: null`).

### Changes Made:

1. **Updated `/twilio/configure-webhook` endpoint** in `backend/src/routes/twilio.js`:
   - Now also updates `is_configured` to `true` and saves the `webhook_url` in the database

2. **Added a new `/twilio/verify-webhook` endpoint**:
   - Checks the actual Twilio configuration
   - Updates the database to match Twilio's state
   - Returns the current configuration status

3. **Enhanced the test-connection endpoint**:
   - Now also checks and syncs webhook configuration

4. **Updated the frontend `IntegrationSettings.js`**:
   - Added webhook verification
   - Improved error handling
   - Added better user feedback

### Comprehensive Testing Plan:

#### Step 1: Test Database Synchronization
1. Run SQL to check current state:
   ```sql
   SELECT * FROM workspace_twilio_config WHERE workspace_id = '86509';
   ```

2. Verify the webhook with our new endpoint:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/verify-webhook \
     -H "Content-Type: application/json" \
     -d '{"workspaceId": "86509"}'
   ```

3. Check database again to confirm update:
   ```sql
   SELECT * FROM workspace_twilio_config WHERE workspace_id = '86509';
   ```

#### Step 2: Test Webhook Configuration
1. Set a global webhook:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/configure-webhook \
     -H "Content-Type: application/json" \
     -d '{"workspaceId": "86509", "webhookType": "global", "webhookUrl": "https://cc.automate8.com/twilio"}'
   ```

2. Verify in Twilio dashboard that webhook was updated
3. Check database to confirm update:
   ```sql
   SELECT * FROM workspace_twilio_config WHERE workspace_id = '86509';
   ```

4. Set a workspace-specific webhook:
   ```bash
   curl -X POST https://cc.automate8.com/twilio/configure-webhook \
     -H "Content-Type: application/json" \
     -d '{"workspaceId": "86509", "webhookType": "workspace", "webhookUrl": "https://cc.automate8.com/twilio/86509"}'
   ```

5. Verify in Twilio dashboard that webhook was updated
6. Check database to confirm update

#### Step 3: Test Outbound Messages
1. Send a test message using the fixed configuration:
   ```bash
   curl -X POST https://cc.automate8.com/send-sms \
     -H "Content-Type: application/json" \
     -d '{"to": "+17866757799", "message": "Test message after fix", "workspaceId": "86509"}'
   ```

2. Check Twilio logs to confirm the message was sent
3. Verify message was saved in database:
   ```sql
   SELECT * FROM messages WHERE workspace_id = '86509' ORDER BY created_at DESC LIMIT 1;
   ```

4. Test sending a message through the LiveChat UI and verify it works

#### Step 4: Test Inbound Messages
1. Simulate an inbound message:
   ```bash
   curl -X POST https://cc.automate8.com/twilio \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "MessageSid=SM123&From=+17866757799&To=+13256665486&Body=Test inbound message after fix"
   ```

2. Verify message was saved in database:
   ```sql
   SELECT * FROM messages WHERE workspace_id = '86509' AND direction = 'inbound' ORDER BY created_at DESC LIMIT 1;
   ```

3. Check if the LiveChat UI displays the message
4. Send a real text message to the Twilio number and verify it's received

#### Step 5: End-to-End Verification
1. Restart the application to ensure the fix persists
2. Test message sending and receiving again
3. Verify all components are working together correctly
