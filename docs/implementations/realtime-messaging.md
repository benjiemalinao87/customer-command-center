# Real-time Messaging Implementation

## Overview
This document outlines the implementation of real-time messaging in the LiveChat application using Socket.IO and Supabase real-time subscriptions.

## Architecture

### Technology Stack
- Backend: Node.js with Express and Socket.IO
- Frontend: React with Socket.IO client
- Database: Supabase
- Real-time Layer: Socket.IO (primary) + Supabase real-time (backup)

## Backend Implementation

### Socket.IO Server Setup
```javascript
// backend/index.js
import { Server } from 'socket.io';
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Handle room joins
  socket.on('join_contact', async ({ contactId }) => {
    const room = `contact:${contactId}`;
    socket.join(room);
  });
  
  socket.on('join_workspace', async ({ workspaceId }) => {
    socket.join(workspaceId);
  });
});
```

### Message Broadcasting
Messages are broadcast to two types of rooms:
1. Contact-specific rooms (`contact:${contactId}`)
2. Workspace-wide rooms (`${workspaceId}`)

```javascript
// Broadcast new message
const room = `contact:${contactId}`;
io.to(room).emit('new_message', message);

// Also broadcast to workspace
io.to(workspaceId).emit('new_message', {
  ...message,
  workspace_id: workspaceId,
  direction: 'inbound'
});
```

## Frontend Implementation

### Socket.IO Client Setup
```javascript
// frontend/src/services/messageService.js
import { io } from 'socket.io-client';

const socket = io('YOUR_BACKEND_URL', {
  transports: ['websocket'],
  autoConnect: true
});

socket.on('connect', () => {
  console.log('Connected to socket server');
});
```

### Room Management
```javascript
export const joinContactRoom = (contactId) => {
  socket.emit('join_contact', { contactId });
};

export const joinWorkspace = (workspaceId) => {
  socket.emit('join_workspace', { workspaceId });
};
```

### Message Handling in Components
```javascript
// frontend/src/components/Chat.jsx
useEffect(() => {
  joinContactRoom(contactId);
  
  const handleNewMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };
  
  socket.on('new_message', handleNewMessage);
  
  return () => {
    socket.off('new_message', handleNewMessage);
  };
}, [contactId]);
```

## Database Schema

### livechat_messages Table
```sql
CREATE TABLE livechat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id),
  workspace_id UUID REFERENCES workspaces(id),
  sender VARCHAR(255),
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  direction VARCHAR(50),
  status VARCHAR(50),
  twilio_sid VARCHAR(255),
  msg_type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Error Handling & Reliability

### Socket Disconnection
- Implement automatic reconnection
- Cache messages during disconnection
- Resync on reconnection

```javascript
socket.on('disconnect', () => {
  console.log('Disconnected from server');
  // Implement reconnection logic
});

socket.on('reconnect', () => {
  console.log('Reconnected to server');
  // Resync messages
});
```

### Message Deduplication
```javascript
const processedMessages = new Set();

socket.on('new_message', (message) => {
  if (processedMessages.has(message.id)) {
    return; // Skip duplicate message
  }
  processedMessages.add(message.id);
  handleNewMessage(message);
});
```

## Performance Optimizations

### Message Caching
- Cache recent messages locally
- Implement pagination for message history
- Use optimistic updates for sent messages

### Room-based Broadcasting
- Messages are only sent to relevant rooms
- Separate rooms for contacts and workspaces
- Efficient message routing

## Security Considerations

1. Authentication
   - Validate socket connections
   - Authenticate room joins
   - Verify message permissions

2. Data Validation
   - Sanitize message content
   - Validate message structure
   - Check room permissions

3. Rate Limiting
   - Implement message rate limiting
   - Prevent spam and abuse
   - Monitor connection limits

## Testing

1. Unit Tests
   - Test message handling
   - Test room management
   - Test reconnection logic

2. Integration Tests
   - Test real-time communication
   - Test database operations
   - Test error scenarios

3. Load Tests
   - Test concurrent connections
   - Test message throughput
   - Test system stability

## Monitoring & Debugging

1. Logging
   - Log socket events
   - Log message flow
   - Log errors and warnings

2. Metrics
   - Track message delivery
   - Monitor connection status
   - Measure latency

## Future Improvements

1. Message Queuing
   - Implement message queue for reliability
   - Handle offline message delivery
   - Support message prioritization

2. Enhanced Features
   - Typing indicators
   - Read receipts
   - Message reactions

3. Scalability
   - Horizontal scaling
   - Load balancing
   - Redis for socket.io adapter
