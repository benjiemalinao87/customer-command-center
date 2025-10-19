# Livechat SMS Integration Implementation Plan

## Overview

This document provides a detailed implementation plan for integrating inbound and outbound SMS messaging functionality into an application using the existing livechat feature codebase as a reference. The plan covers the necessary frontend components, backend API routes, database tables, and Twilio integration required to build a complete SMS messaging solution.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Twilio Integration](#twilio-integration)
6. [Real-time Messaging](#real-time-messaging)
7. [Security and Workspace Isolation](#security-and-workspace-isolation)
8. [Implementation Steps](#implementation-steps)

## Architecture Overview

The livechat SMS integration follows a layered architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │◄────┤  Express Server │◄────┤  Twilio API    │
│  (Chakra UI)    │     │  (Socket.io)    │     │                 │
│                 │─────►                 │─────►                 │
└────────┬────────┘     └────────┬────────┘     └─────────────────┘
         │                       │
         │                       │
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────┐
│                                             │
│              Supabase Database              │
│                                             │
└─────────────────────────────────────────────┘
```

### Data Flow

1. **Inbound Messages**:
   - Twilio webhook → Express backend → Supabase database → Socket.io → Frontend

2. **Outbound Messages**:
   - Frontend → Express backend → Twilio API → Supabase database → Socket.io → Frontend (confirmation)

3. **Real-time Updates**:
   - Socket.io events handle real-time message delivery and status updates
## Database Schema

### Key Tables

#### 1. `livechat_messages` Table

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
- `phone`: The actual phone number
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
## Backend Implementation

### Key API Routes and Endpoints

#### 1. SMS Route (`/sms`)

The SMS route handles sending SMS messages and saving them to the database.

**Key Endpoints:**

- `POST /send-sms`: Sends an SMS message via Twilio and saves it to the database

**Implementation Details:**

```javascript
// Route handler for sending SMS messages
router.post('/send-sms', async (req, res) => {
  try {
    const { workspaceId, contactId, message, mediaUrls = [] } = req.body;
    
    // Validate required fields
    if (!workspaceId || !contactId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get contact phone number from database
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone')
      .eq('id', contactId)
      .single();
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get Twilio configuration for the workspace
    const { data: twilioConfig } = await supabase
      .from('workspace_twilio_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();
    
    if (!twilioConfig || !twilioConfig.is_configured) {
      return res.status(400).json({ error: 'Twilio not configured for this workspace' });
    }
    
    // Initialize Twilio client with workspace credentials
    const twilioClient = twilio(twilioConfig.account_sid, twilioConfig.auth_token);
    
    // Get a Twilio phone number for this workspace
    const { data: twilioNumbers } = await supabase
      .from('twilio_numbers')
      .select('phone')
      .eq('workspace_id', workspaceId)
      .limit(1);
    
    if (!twilioNumbers || twilioNumbers.length === 0) {
      return res.status(400).json({ error: 'No Twilio numbers available for this workspace' });
    }
    
    // Format phone numbers
    const to = formatPhoneNumber(contact.phone);
    const from = formatPhoneNumber(twilioNumbers[0].phone);
    
    // Prepare message options
    const messageOptions = {
      body: message,
      to,
      from
    };
    
    // Add media URLs if any
    if (mediaUrls && mediaUrls.length > 0) {
      messageOptions.mediaUrl = mediaUrls;
    }
    
    // Send message via Twilio
    const twilioMessage = await twilioClient.messages.create(messageOptions);
    
    // Save message to database
    const { data: savedMessage, error } = await supabase
      .from('livechat_messages' )
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        content: message,
        direction: 'outbound',
        status: 'sent',
        twilio_sid: twilioMessage.sid,
        message_type: mediaUrls.length > 0 ? 'media' : 'text'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving message to database:', error);
      return res.status(500).json({ error: 'Error saving message to database' });
    }
    
    // Return success response
    return res.json({
      success: true,
      message: savedMessage,
      twilioSid: twilioMessage.sid
    });
  } catch (error) {
    console.error('Error sending SMS:', error);
    return res.status(500).json({ error: 'Error sending SMS' });
  }
});
```

#### 2. Twilio Route (`/twilio`)

The Twilio route handles Twilio integration, including webhook processing, phone number syncing, and credential validation.

**Key Endpoints:**

- `POST /twilio/test-connection`: Tests Twilio credentials and syncs phone numbers
- `POST /twilio/webhook`: Processes inbound messages from Twilio
- `GET /twilio/config`: Gets Twilio configuration for a workspace
- `GET /twilio/phone-numbers`: Gets Twilio phone numbers for a workspace

**Implementation Details:**

```javascript
// Webhook handler for inbound messages
router.post('/webhook', async (req, res) => {
  try {
    // Extract message data from Twilio webhook
    const {
      From: from,
      To: to,
      Body: body,
      MessageSid: messageSid,
      NumMedia: numMedia,
      MediaUrl0: mediaUrl,
      MediaContentType0: mediaContentType
    } = req.body;
    
    // Find the workspace based on the 'to' phone number
    const { data: twilioNumber } = await supabase
      .from('twilio_numbers')
      .select('workspace_id')
      .eq('phone', to)
      .single();
    
    if (!twilioNumber) {
      console.error('No workspace found for phone number:', to);
      return res.status(404).send('No workspace found for this number');
    }
    
    const workspaceId = twilioNumber.workspace_id;
    
    // Find or create contact
    let contact;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', from)
      .eq('workspace_id', workspaceId)
      .single();
    
    if (existingContact) {
      contact = existingContact;
      
      // Update unread count
      await supabase
        .from('contacts')
        .update({ unread_count: (contact.unread_count || 0) + 1 })
        .eq('id', contact.id);
    } else {
      // Create new contact
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          phone: from,
          workspace_id: workspaceId,
          name: `Unknown (${from})`,
          unread_count: 1,
          conversation_status: 'Open'
        })
        .select()
        .single();
      
      contact = newContact;
    }
    
    // Prepare message data
    const messageData = {
      workspace_id: workspaceId,
      contact_id: contact.id,
      content: body,
      direction: 'inbound',
      status: 'delivered',
      twilio_sid: messageSid,
      message_type: numMedia > 0 ? 'media' : 'text'
    };
    
    // Add media URL if present
    if (numMedia > 0 && mediaUrl) {
      messageData.media_url = mediaUrl;
      messageData.media_type = mediaContentType;
    }
    
    // Save message to database
    const { data: savedMessage, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    if (error) {
      console.error('Error saving inbound message:', error);
      return res.status(500).send('Error saving message');
    }
    
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`workspace:${workspaceId}`).emit('new_message', {
        message: savedMessage,
        contact: contact
      });
    }
    
    // Return TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    return res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(500).send('Error processing webhook');
  }
});
```

#### 3. Socket.IO Integration

Socket.IO is used for real-time messaging and updates.

**Implementation Details:**

```javascript
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
  socket.on('join_workspace', (workspaceId) => {
    if (!workspaceId) return;
    
    socket.join(`workspace:${workspaceId}`);
    console.log(`Socket ${socket.id} joined workspace ${workspaceId}`);
  });
  
  // Handle send message event
  socket.on('send_message', async (data) => {
    try {
      const { workspaceId, contactId, message, mediaUrls } = data;
      
      // Call the SMS sending API
      const response = await axios.post(`${process.env.API_URL}/sms/send-sms`, {
        workspaceId,
        contactId,
        message,
        mediaUrls
      });
      
      // Emit message sent event
      socket.emit('message_sent', response.data);
      
      // Broadcast to workspace room
      socket.to(`workspace:${workspaceId}`).emit('new_message', {
        message: response.data.message,
        contactId
      });
    } catch (error) {
      console.error('Error sending message via socket:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});
```
## Frontend Implementation

The frontend implementation follows the Mac OS design philosophy with clean, minimal UI components that provide a seamless user experience.

### Key Components

#### 1. LiveChat2 Component

This is the main component that orchestrates the entire livechat interface.

**Key Features:**
- Contact list management
- Chat area with message history
- Contact details panel
- Real-time message updates via Socket.io
- Message sending functionality

**Implementation Details:**

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Box, Flex, useToast } from '@chakra-ui/react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { supabase } from '../../services/supabase';
import { socket } from '../../services/socket';
import ContactList from './ContactList';
import ChatArea from './ChatArea';
import ContactDetails from './ContactDetails';
import { fetchLivechatMessages, sendMessage } from '../../services/livechatService';

const LiveChat2 = () => {
  const { currentWorkspace } = useWorkspace();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const messagesEndRef = useRef(null);

  // Fetch contacts when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchContacts();
    
    // Join workspace socket room
    socket.emit('join_workspace', currentWorkspace.id);
    
    // Listen for new messages
    socket.on('new_message', handleNewMessage);
    
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [currentWorkspace?.id]);

  // Fetch messages when selected contact changes
  useEffect(() => {
    if (!selectedContact) {
      setMessages([]);
      return;
    }
    
    fetchMessages();
    
    // Mark messages as read
    if (selectedContact.unread_count > 0) {
      markMessagesAsRead();
    }
  }, [selectedContact]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle new message from socket
  const handleNewMessage = (data) => {
    const { message, contact } = data;
    
    // Update contacts list if needed
    if (contact) {
      setContacts(prev => {
        const existingContactIndex = prev.findIndex(c => c.id === contact.id);
        if (existingContactIndex >= 0) {
          // Update existing contact
          const updatedContacts = [...prev];
          updatedContacts[existingContactIndex] = {
            ...updatedContacts[existingContactIndex],
            unread_count: (updatedContacts[existingContactIndex].unread_count || 0) + 1,
            last_message: message.content,
            last_message_time: message.created_at
          };
          return updatedContacts;
        } else {
          // Add new contact
          return [...prev, {
            ...contact,
            last_message: message.content,
            last_message_time: message.created_at
          }];
        }
      });
    }
    
    // Add message to current chat if it's from the selected contact
    if (selectedContact && message.contact_id === selectedContact.id) {
      setMessages(prev => [...prev, message]);
      markMessagesAsRead();
    } else {
      // Show notification for new message
      toast({
        title: `New message from ${contact?.name || 'Unknown'}`,
        description: message.content,
        status: 'info',
        duration: 5000,
        isClosable: true,
        position: 'top-right'
      });
    }
  };

  // Fetch contacts from database
  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error fetching contacts',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Fetch messages for selected contact
  const fetchMessages = async () => {
    if (!selectedContact) return;
    
    setIsLoading(true);
    try {
      const messages = await fetchLivechatMessages(
        currentWorkspace.id,
        selectedContact.id
      );
      setMessages(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error fetching messages',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mark messages as read
  const markMessagesAsRead = async () => {
    if (!selectedContact) return;
    
    try {
      await supabase
        .from('contacts')
        .update({ unread_count: 0 })
        .eq('id', selectedContact.id);
      
      // Update local state
      setContacts(prev =>
        prev.map(contact =>
          contact.id === selectedContact.id
            ? { ...contact, unread_count: 0 }
            : contact
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send a new message
  const handleSendMessage = async (content, mediaUrls = []) => {
    if (!selectedContact || !content.trim()) return;
    
    try {
      const newMessage = await sendMessage(
        currentWorkspace.id,
        selectedContact.id,
        content,
        mediaUrls
      );
      
      // Add message to local state
      setMessages(prev => [...prev, newMessage]);
      
      // Update contact in the list
      setContacts(prev =>
        prev.map(contact =>
          contact.id === selectedContact.id
            ? {
                ...contact,
                last_message: content,
                last_message_time: new Date().toISOString()
              }
            : contact
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error sending message',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Flex h="100%" w="100%">
      {/* Contact List */}
      <Box w="300px" borderRight="1px solid" borderColor="gray.200">
        <ContactList
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />
      </Box>
      
      {/* Chat Area */}
      <Box flex="1">
        <ChatArea
          contact={selectedContact}
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          messagesEndRef={messagesEndRef}
        />
      </Box>
      
      {/* Contact Details */}
      {selectedContact && (
        <Box w="300px" borderLeft="1px solid" borderColor="gray.200">
          <ContactDetails
            contact={selectedContact}
            onContactUpdate={(updatedContact) => {
              setSelectedContact(updatedContact);
              setContacts(prev =>
                prev.map(c =>
                  c.id === updatedContact.id ? updatedContact : c
                )
              );
            }}
          />
        </Box>
      )}
    </Flex>
  );
};

export default LiveChat2;
```

#### 2. ChatArea Component

This component displays the message history and provides a message input area.

**Implementation Details:**

```jsx
import React, { useState } from 'react';
import {
  Box,
  Flex,
  Text,
  Input,
  IconButton,
  Spinner,
  VStack,
  HStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import MessageBubble from './MessageBubble';

const ChatArea = ({ contact, messages, isLoading, onSendMessage, messagesEndRef }) => {
  const [message, setMessage] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() && mediaFiles.length === 0) return;
    
    // Upload media files if any
    let mediaUrls = [];
    if (mediaFiles.length > 0) {
      setIsUploading(true);
      try {
        mediaUrls = await Promise.all(
          mediaFiles.map(async (file) => {
            // Upload file to storage
            const filePath = `media/${Date.now()}_${file.name}`;
            const { data, error } = await supabase.storage
              .from('livechat-media')
              .upload(filePath, file);
            
            if (error) throw error;
            
            // Get public URL
            const { publicURL } = supabase.storage
              .from('livechat-media')
              .getPublicUrl(filePath);
            
            return publicURL;
          })
        );
      } catch (error) {
        console.error('Error uploading media:', error);
      } finally {
        setIsUploading(false);
        setMediaFiles([]);
      }
    }
    
    // Send message
    await onSendMessage(message, mediaUrls);
    setMessage('');
  };
  
  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setMediaFiles(prev => [...prev, ...files]);
  };
  
  return (
    <Flex direction="column" h="100%" bg={bgColor}>
      {/* Chat header */}
      {contact ? (
        <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
          <Text fontWeight="bold">{contact.name || contact.phone_number}</Text>
          <Text fontSize="sm" color="gray.500">
            {contact.phone_number}
          </Text>
        </Box>
      ) : (
        <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
          <Text>Select a contact to start chatting</Text>
        </Box>
      )}
      
      {/* Messages area */}
      <VStack
        flex="1"
        p={4}
        spacing={4}
        overflowY="auto"
        align="stretch"
      >
        {isLoading ? (
          <Flex justify="center" align="center" h="100%">
            <Spinner />
          </Flex>
        ) : contact ? (
          messages.length > 0 ? (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOutbound={msg.direction === 'outbound'}
              />
            ))
          ) : (
            <Flex justify="center" align="center" h="100%">
              <Text color="gray.500">No messages yet</Text>
            </Flex>
          )
        ) : (
          <Flex justify="center" align="center" h="100%">
            <Text color="gray.500">Select a contact to view messages</Text>
          </Flex>
        )}
        <div ref={messagesEndRef} />
      </VStack>
      
      {/* Message input */}
      {contact && (
        <Box p={4} borderTop="1px solid" borderColor={borderColor}>
          <form onSubmit={handleSubmit}>
            <HStack>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={isUploading}
              />
              <IconButton
                as="label"
                icon={<FiPaperclip />}
                aria-label="Attach file"
                cursor="pointer"
                disabled={isUploading}
              >
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                  accept="image/*,video/*,audio/*"
                />
              </IconButton>
              <IconButton
                type="submit"
                icon={<FiSend />}
                aria-label="Send message"
                colorScheme="blue"
                disabled={(!message.trim() && mediaFiles.length === 0) || isUploading}
                isLoading={isUploading}
              />
            </HStack>
            
            {/* Media preview */}
            {mediaFiles.length > 0 && (
              <HStack mt={2} overflowX="auto" py={2}>
                {mediaFiles.map((file, index) => (
                  <Box
                    key={index}
                    position="relative"
                    borderRadius="md"
                    overflow="hidden"
                    w="60px"
                    h="60px"
                  >
                    <Box
                      as="img"
                      src={URL.createObjectURL(file)}
                      alt={`Media ${index}`}
                      w="100%"
                      h="100%"
                      objectFit="cover"
                    />
                  </Box>
                ))}
              </HStack>
            )}
          </form>
        </Box>
      )}
    </Flex>
  );
};

export default ChatArea;
```
#### 3. MessageBubble Component

This component renders individual messages in the chat area.

**Implementation Details:**

```jsx
import React from 'react';
import {
  Box,
  Text,
  Image,
  Link,
  Flex,
  useColorModeValue
} from '@chakra-ui/react';
import { format } from 'date-fns';

const MessageBubble = ({ message, isOutbound }) => {
  const outboundBgColor = useColorModeValue('blue.500', 'blue.600');
  const inboundBgColor = useColorModeValue('gray.200', 'gray.600');
  const outboundTextColor = 'white';
  const inboundTextColor = useColorModeValue('gray.800', 'white');
  
  // Format timestamp
  const formattedTime = message.created_at
    ? format(new Date(message.created_at), 'h:mm a')
    : '';
  
  // Check if message has media
  const hasMedia = message.message_type === 'media' && message.media_url;
  
  return (
    <Flex
      justify={isOutbound ? 'flex-end' : 'flex-start'}
      w="100%"
    >
      <Box
        maxW="70%"
        bg={isOutbound ? outboundBgColor : inboundBgColor}
        color={isOutbound ? outboundTextColor : inboundTextColor}
        borderRadius="lg"
        px={4}
        py={2}
      >
        {/* Media content */}
        {hasMedia && (
          <Box mb={2}>
            {message.media_type?.startsWith('image/') ? (
              <Image
                src={message.media_url}
                alt="Media attachment"
                borderRadius="md"
                maxH="200px"
              />
            ) : message.media_type?.startsWith('video/') ? (
              <Box as="video" controls width="100%" maxH="200px">
                <source src={message.media_url} type={message.media_type} />
                Your browser does not support the video tag.
              </Box>
            ) : message.media_type?.startsWith('audio/') ? (
              <Box as="audio" controls width="100%">
                <source src={message.media_url} type={message.media_type} />
                Your browser does not support the audio tag.
              </Box>
            ) : (
              <Link href={message.media_url} isExternal color="blue.400">
                Download attachment
              </Link>
            )}
          </Box>
        )}
        
        {/* Text content */}
        <Text>{message.content}</Text>
        
        {/* Timestamp */}
        <Text
          fontSize="xs"
          opacity={0.8}
          textAlign="right"
          mt={1}
        >
          {formattedTime}
          {isOutbound && (
            <Text as="span" ml={1}>
              {message.status === 'delivered' ? '✓✓' : message.status === 'sent' ? '✓' : ''}
            </Text>
          )}
        </Text>
      </Box>
    </Flex>
  );
};

export default MessageBubble;
```

#### 4. ContactList Component

This component displays the list of contacts with their last message and unread count.

**Implementation Details:**

```jsx
import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Badge,
  Flex,
  Avatar,
  useColorModeValue
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { format } from 'date-fns';

const ContactList = ({ contacts, selectedContact, onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBgColor = useColorModeValue('gray.100', 'gray.700');
  const selectedBgColor = useColorModeValue('gray.200', 'gray.600');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.name?.toLowerCase().includes(searchLower) ||
      contact.phone_number?.toLowerCase().includes(searchLower) ||
      contact.email?.toLowerCase().includes(searchLower)
    );
  });
  
  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // If same day, show time
    if (date.toDateString() === now.toDateString()) {
      return format(date, 'h:mm a');
    }
    
    // If within last 7 days, show day name
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return format(date, 'EEE');
    }
    
    // Otherwise show date
    return format(date, 'MM/dd/yy');
  };
  
  return (
    <Box h="100%" display="flex" flexDirection="column">
      {/* Search bar */}
      <Box p={4} borderBottom="1px solid" borderColor={borderColor}>
        <InputGroup>
          <InputLeftElement pointerEvents="none">
            <FiSearch color="gray.300" />
          </InputLeftElement>
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="md"
          />
        </InputGroup>
      </Box>
      
      {/* Contacts list */}
      <VStack
        flex="1"
        spacing={0}
        align="stretch"
        overflowY="auto"
        p={0}
      >
        {filteredContacts.length > 0 ? (
          filteredContacts.map(contact => (
            <Box
              key={contact.id}
              p={4}
              cursor="pointer"
              bg={selectedContact?.id === contact.id ? selectedBgColor : bgColor}
              _hover={{ bg: selectedContact?.id !== contact.id ? hoverBgColor : selectedBgColor }}
              borderBottom="1px solid"
              borderColor={borderColor}
              onClick={() => onSelectContact(contact)}
            >
              <Flex align="center">
                <Avatar
                  size="sm"
                  name={contact.name || contact.phone_number}
                  mr={3}
                />
                <Box flex="1">
                  <Flex justify="space-between" align="center">
                    <Text fontWeight="medium" noOfLines={1}>
                      {contact.name || contact.phone_number}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatTime(contact.last_message_time)}
                    </Text>
                  </Flex>
                  <Flex justify="space-between" align="center" mt={1}>
                    <Text fontSize="sm" color="gray.500" noOfLines={1}>
                      {contact.last_message || 'No messages yet'}
                    </Text>
                    {contact.unread_count > 0 && (
                      <Badge
                        borderRadius="full"
                        colorScheme="blue"
                        ml={2}
                      >
                        {contact.unread_count}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>
            </Box>
          ))
        ) : (
          <Flex justify="center" align="center" h="100px">
            <Text color="gray.500">No contacts found</Text>
          </Flex>
        )}
      </VStack>
    </Box>
  );
};

export default ContactList;
```

#### 5. ContactDetails Component

This component displays detailed information about the selected contact and provides actions like updating contact information.

**Implementation Details:**

```jsx
import React, { useState } from 'react';
import {
  Box,
  VStack,
  Text,
  Button,
  Avatar,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
  useColorModeValue
} from '@chakra-ui/react';
import { FiEdit, FiPhone, FiMail } from 'react-icons/fi';
import { supabase } from '../../services/supabase';

const ContactDetails = ({ contact, onContactUpdate }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Open edit modal
  const handleEdit = () => {
    setFormData({
      name: contact.name || '',
      email: contact.email || '',
      phone_number: contact.phone_number || ''
    });
    onOpen();
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone_number
        })
        .eq('id', contact.id)
        .select()
        .single();
      
      if (error) throw error;
      
      onContactUpdate(data);
      onClose();
      
      toast({
        title: 'Contact updated',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Error updating contact',
        description: error.message,
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Box h="100%" bg={bgColor} p={4}>
      <VStack spacing={4} align="stretch">
        {/* Contact header */}
        <Flex direction="column" align="center" p={4}>
          <Avatar
            size="xl"
            name={contact.name || contact.phone_number}
            mb={4}
          />
          <Text fontSize="xl" fontWeight="bold">
            {contact.name || 'Unnamed Contact'}
          </Text>
          <Text color="gray.500">{contact.conversation_status || 'Open'}</Text>
        </Flex>
        
        <Divider />
        
        {/* Contact info */}
        <VStack spacing={3} align="stretch">
          <Flex align="center">
            <Box as={FiPhone} mr={3} color="blue.500" />
            <Text>{contact.phone_number}</Text>
          </Flex>
          
          {contact.email && (
            <Flex align="center">
              <Box as={FiMail} mr={3} color="blue.500" />
              <Text>{contact.email}</Text>
            </Flex>
          )}
        </VStack>
        
        <Divider />
        
        {/* Actions */}
        <Button
          leftIcon={<FiEdit />}
          onClick={handleEdit}
          size="sm"
          colorScheme="blue"
          variant="outline"
        >
          Edit Contact
        </Button>
      </VStack>
      
      {/* Edit modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Contact</ModalHeader>
          <ModalCloseButton />
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <VStack spacing={4}>
                <FormControl>
                  <FormLabel>Name</FormLabel>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Phone Number</FormLabel>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </FormControl>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                colorScheme="blue"
                isLoading={isSubmitting}
              >
                Save
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContactDetails;
```
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
