## Database Schema

### Key Tables

#### 1. `messages` Table

This table stores all chat messages, including SMS messages:

```sql
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT,
    sentiment FLOAT CHECK (sentiment >= -1 AND sentiment <= 1),
    embedding vector(1536),
    twilio_sid TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

Important fields:
- `workspace_id`: Links the message to a specific workspace for isolation
- `contact_id`: Links the message to a specific contact
- `content`: The actual message text
- `message_type`: Identifies the type of message (text, email, etc.)
- `twilio_sid`: Twilio's unique identifier for the message
- `status`: Current status of the message (pending, sent, delivered, failed)

Indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_workspace_id ON messages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_twilio_sid ON messages(twilio_sid) WHERE twilio_sid IS NOT NULL;
```

#### 2. `twilio_numbers` Table

This table stores Twilio phone numbers associated with workspaces:

```sql
CREATE TABLE IF NOT EXISTS twilio_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  twilio_sid TEXT NOT NULL,
  friendly_name TEXT,
  capabilities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Important fields:
- `workspace_id`: Links the phone number to a specific workspace
- `phone_number`: The actual phone number
- `twilio_sid`: Twilio's unique identifier for the phone number
- `capabilities`: JSON object containing capabilities of the number (SMS, MMS, Voice)

Indexes:
```sql
CREATE INDEX IF NOT EXISTS twilio_numbers_workspace_id_idx ON twilio_numbers(workspace_id);
CREATE INDEX IF NOT EXISTS twilio_numbers_phone_number_idx ON twilio_numbers(phone_number);
```

#### 3. `workspace_twilio_config` Table

This table stores Twilio configuration for each workspace:

```sql
CREATE TABLE IF NOT EXISTS workspace_twilio_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
    account_sid TEXT NOT NULL,
    auth_token TEXT NOT NULL,
    webhook_url TEXT,
    webhook_type TEXT DEFAULT 'global',
    is_configured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id)
);
```

Important fields:
- `workspace_id`: Links the configuration to a specific workspace
- `account_sid`: Twilio account SID
- `auth_token`: Twilio authentication token
- `webhook_url`: URL for Twilio webhooks
- `webhook_type`: Type of webhook configuration (global, per-number)

#### 4. `contacts` Table

This table stores contact information:

```sql
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    name TEXT,
    email TEXT,
    conversation_status TEXT DEFAULT 'Open',
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT contacts_phone_number_workspace_unique UNIQUE (phone_number, workspace_id)
);
```

Important fields:
- `phone`: Contact's phone number
- `workspace_id`: Links the contact to a specific workspace
- `conversation_status`: Status of the conversation (Open, Pending, Done, etc.)
- `unread_count`: Number of unread messages from this contact

### Row-Level Security (RLS) Policies

All tables have RLS policies to enforce workspace isolation:

```sql
-- For messages table
CREATE POLICY "Users can view messages from their workspaces"
ON messages FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Similar policies for insert, update, and delete operations
-- Similar policies for other tables
```
