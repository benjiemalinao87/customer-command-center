## Twilio Integration

### Configuration and Setup

#### 1. Twilio Account Setup

1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a phone number with SMS capabilities
4. Configure the webhook URL for inbound messages to point to your backend endpoint

#### 2. Environment Variables

Set up the following environment variables in your backend:

```
# Twilio environment variables (default values, will be overridden by workspace config)
TWILIO_ACCOUNT_SID=your_default_account_sid
TWILIO_AUTH_TOKEN=your_default_auth_token
TWILIO_PHONE_NUMBER=your_default_phone_number

# Base URL for webhook callbacks
BASE_URL=https://your-api-domain.com
```

#### 3. Twilio Service

Create a service to handle Twilio-related operations:

```javascript
// services/twilioService.js
import twilio from 'twilio';
import { supabase } from './supabase';

// Get Twilio client for a specific workspace
export const getTwilioClient = async (workspaceId) => {
  try {
    const { data: config, error } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();
    
    if (error || !config || !config.is_configured) {
      throw new Error('Twilio not configured for this workspace');
    }
    
    return twilio(config.account_sid, config.auth_token);
  } catch (error) {
    console.error('Error getting Twilio client:', error);
    throw error;
  }
};

// Get Twilio phone numbers for a workspace
export const getTwilioNumbers = async (workspaceId) => {
  try {
    const { data, error } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting Twilio numbers:', error);
    throw error;
  }
};

// Sync Twilio phone numbers with database
export const syncTwilioNumbers = async (workspaceId) => {
  try {
    const client = await getTwilioClient(workspaceId);
    
    // Get numbers from Twilio API
    const twilioNumbers = await client.incomingPhoneNumbers.list();
    
    // Get existing numbers from database
    const { data: existingNumbers } = await supabase
      .from('twilio_numbers')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    // Create map of existing numbers by SID
    const existingNumbersBySid = {};
    existingNumbers?.forEach(number => {
      existingNumbersBySid[number.twilio_sid] = number;
    });
    
    // Process each Twilio number
    for (const number of twilioNumbers) {
      const capabilities = {
        sms: number.capabilities.sms,
        mms: number.capabilities.mms,
        voice: number.capabilities.voice
      };
      
      if (existingNumbersBySid[number.sid]) {
        // Update existing number
        await supabase
          .from('twilio_numbers')
          .update({
            phone_number: number.phoneNumber,
            friendly_name: number.friendlyName,
            capabilities,
            updated_at: new Date()
          })
          .eq('twilio_sid', number.sid);
      } else {
        // Insert new number
        await supabase
          .from('twilio_numbers')
          .insert({
            workspace_id: workspaceId,
            phone_number: number.phoneNumber,
            twilio_sid: number.sid,
            friendly_name: number.friendlyName,
            capabilities
          });
      }
    }
    
    // Remove numbers that no longer exist in Twilio
    const twilioSids = twilioNumbers.map(n => n.sid);
    const numbersToRemove = existingNumbers?.filter(n => !twilioSids.includes(n.twilio_sid)) || [];
    
    if (numbersToRemove.length > 0) {
      await supabase
        .from('twilio_numbers')
        .delete()
        .in('id', numbersToRemove.map(n => n.id));
    }
    
    return await getTwilioNumbers(workspaceId);
  } catch (error) {
    console.error('Error syncing Twilio numbers:', error);
    throw error;
  }
};

// Format phone number to E.164 format
export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let digits = phoneNumber.replace(/\D/g, '');
  
  // Ensure it has country code (default to US +1)
  if (digits.length === 10) {
    digits = '1' + digits;
  }
  
  // Add + prefix
  return '+' + digits;
};
```

## Real-time Messaging

### Socket.IO Integration

Socket.IO is used for real-time messaging between the frontend and backend. It enables immediate delivery of messages and status updates.

#### 1. Socket.IO Server Setup

```javascript
// index.js (backend)
import { Server } from 'socket.io';
import http from 'http';
import express from 'express';

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }
    
    // Verify JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new Error('Authentication error: Invalid token'));
    }
    
    // Attach user to socket
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  
  // Join workspace room
  socket.on('join_workspace', async (workspaceId) => {
    if (!workspaceId) return;
    
    // Verify user has access to this workspace
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', socket.user.id)
        .single();
      
      if (error || !data) {
        socket.emit('error', { message: 'Not authorized to join this workspace' });
        return;
      }
      
      socket.join(`workspace:${workspaceId}`);
      console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
    } catch (error) {
      console.error('Error joining workspace room:', error);
      socket.emit('error', { message: 'Error joining workspace' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);
```

#### 2. Socket.IO Client Setup

```javascript
// services/socket.js (frontend)
import { io } from 'socket.io-client';
import { supabase } from './supabase';

// Initialize Socket.IO client
export const initSocket = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token: session.access_token
      }
    });
    
    // Set up event listeners
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    return socket;
  } catch (error) {
    console.error('Error initializing socket:', error);
    throw error;
  }
};

// Singleton socket instance
let socketInstance = null;

export const getSocket = async () => {
  if (!socketInstance) {
    socketInstance = await initSocket();
  }
  return socketInstance;
};

// Join workspace room
export const joinWorkspace = async (workspaceId) => {
  const socket = await getSocket();
  socket.emit('join_workspace', workspaceId);
};
```

## Security and Workspace Isolation

### Row-Level Security (RLS) Policies

Supabase RLS policies are used to enforce workspace isolation and secure access to data.

#### 1. Messages Table RLS

```sql
-- Allow users to select messages from their workspaces
CREATE POLICY "Users can view messages from their workspaces"
ON messages FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow users to insert messages in their workspaces
CREATE POLICY "Users can insert messages in their workspaces"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Allow users to update message status in their workspaces
CREATE POLICY "Users can update message status in their workspaces"
ON messages FOR UPDATE
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);
```

#### 2. Twilio Numbers Table RLS

```sql
-- Allow users to view Twilio numbers from their workspaces
CREATE POLICY "Users can view Twilio numbers from their workspaces"
ON twilio_numbers FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Similar policies for insert, update, and delete operations
```

#### 3. Workspace Twilio Config Table RLS

```sql
-- Allow users to view Twilio config from their workspaces
CREATE POLICY "Users can view Twilio config from their workspaces"
ON workspace_twilio_config FOR SELECT
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

-- Similar policies for insert, update, and delete operations
```

### API Authentication and Authorization

All API endpoints should verify the user's authentication status and workspace membership before allowing access to data or operations.

```javascript
// Middleware to verify workspace membership
const verifyWorkspaceMembership = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    
    if (!workspaceId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user is a member of the workspace
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }
    
    // Add workspace member data to request
    req.workspaceMember = data;
    next();
  } catch (error) {
    console.error('Error verifying workspace membership:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply middleware to routes
router.use('/workspaces/:workspaceId', verifyWorkspaceMembership);
```

## Implementation Steps

Follow these steps to implement the livechat SMS integration:

### 1. Database Setup

1. Create the necessary tables in your Supabase database:
   - `messages` table
   - `twilio_numbers` table
   - `workspace_twilio_config` table
   - `contacts` table

2. Set up RLS policies for each table to enforce workspace isolation.

### 2. Backend Implementation

1. Set up the Express server with necessary middleware.
2. Implement the Twilio service for handling Twilio API interactions.
3. Create the SMS route for sending and receiving SMS messages.
4. Implement the Twilio webhook endpoint for handling inbound messages.
5. Set up Socket.IO for real-time messaging.

### 3. Frontend Implementation

1. Create the LiveChat2 component as the main container.
2. Implement the ContactList component for displaying contacts.
3. Create the ChatArea component for displaying messages and sending new ones.
4. Implement the MessageBubble component for rendering individual messages.
5. Create the ContactDetails component for displaying and editing contact information.
6. Set up the Socket.IO client for real-time updates.

### 4. Twilio Integration

1. Create a Twilio account and purchase phone numbers.
2. Configure webhook URLs for inbound messages.
3. Implement the Twilio number syncing functionality.
4. Test sending and receiving SMS messages.

### 5. Testing and Deployment

1. Test the entire flow:
   - Sending outbound SMS messages
   - Receiving inbound SMS messages
   - Real-time updates via Socket.IO
   - Contact management
   - Media handling

2. Deploy the application to your production environment.

## Conclusion

This implementation plan provides a comprehensive guide for integrating SMS messaging functionality into your application using the existing livechat feature codebase. By following these steps, you can build a robust SMS messaging system that supports both inbound and outbound messages, real-time updates, and media handling.

The plan covers all aspects of the implementation, including:
- Database schema design
- Backend API routes and endpoints
- Frontend components and UI
- Twilio integration
- Real-time messaging with Socket.IO
- Security and workspace isolation

By leveraging the existing codebase and following this plan, you can efficiently implement SMS messaging functionality in your application.
