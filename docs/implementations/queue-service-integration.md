# Queue Service Integration for AI Auto-Response

## Architecture Overview

The auto-response system uses a split architecture:

1. **Main App (deepseek-test-livechat)**
   - Receives inbound messages from Twilio
   - Stores messages in `livechat_messages` table
   - Adds entries to `ai_response_queue` table with status "pending"
   - Sends outbound messages via Twilio after AI processing

2. **Queue Service (secivres-eueuq.customerconnects.app)**
   - Processes queued AI response jobs
   - Handles rate limiting and scheduling
   - Calls back to main app's `/send-sms` endpoint with results

## Database Tables

### ai_response_queue

This table holds messages pending AI response:

| Column       | Type      | Description                                |
|--------------|-----------|------------------------------------------|
| id           | UUID      | Primary key                              |
| workspace_id | TEXT      | Workspace identifier                     |
| contact_id   | UUID      | Contact identifier                       |
| message_id   | UUID      | Reference to the inbound message         |
| status       | TEXT      | "pending", "processing", "complete", "error" |
| created_at   | TIMESTAMP | When the entry was created               |
| processed_at | TIMESTAMP | When processing completed (or NULL)      |
| error        | TEXT      | Error message if processing failed       |
| attempts     | INTEGER   | Number of processing attempts            |

### ai_response_logs

This table records completed AI responses:

| Column       | Type      | Description                               |
|--------------|-----------|------------------------------------------|
| id           | UUID      | Primary key                              |
| workspace_id | TEXT      | Workspace identifier                     |
| contact_id   | UUID      | Contact identifier                       |
| message_id   | UUID      | Reference to the inbound message         |
| provider     | TEXT      | AI provider (e.g., "openai")             |
| model        | TEXT      | AI model used                            |
| prompt       | TEXT      | The prompt sent to the AI                |
| response     | TEXT      | The AI's response                        |
| tokens_used  | INTEGER   | Number of tokens used                    |
| cost         | NUMERIC   | Cost of the AI call                      |
| created_at   | TIMESTAMP | When the response was generated          |

## Implementation Requirements for Queue Service

### 1. Polling Mechanism

The queue service should:

- Poll the `ai_response_queue` table for entries with status = "pending"
- Update status to "processing" when picked up
- Increment the attempts counter

### 2. AI Processing

For each pending entry:

- Fetch the original message from `livechat_messages` using message_id
- Fetch context messages (5 most recent messages for the contact)
- Fetch workspace AI configuration from `workspace_ai_config`
- Generate AI response using configured provider/model
- Record the response in `ai_response_logs`

### 3. Callback Mechanism

After processing:

- Send the result to `/send-sms` endpoint with payload:
  ```json
  {
    "to": "<contact phone>",
    "message": "<ai generated text>",
    "workspaceId": "<workspace_id>",
    "contactId": "<contact_id>",
    "metadata": {
      "contactId": "<contact_id>",
      "isAiGenerated": true,
      "aiLogId": "<log id>"
    }
  }
  ```
- Update `ai_response_queue` entry status to "complete" or "error"
- Set processed_at timestamp

### 4. Error Handling

- Retry failed jobs up to 3 times with exponential backoff
- Record errors in the `error` field
- Cap attempts at a maximum value

## Testing

1. Send a message to your Twilio number
2. Confirm entry appears in `ai_response_queue` with status "pending"
3. Queue service should pick up the entry and process it
4. Check for new outbound message in `livechat_messages`
5. Verify entry in `ai_response_logs`
