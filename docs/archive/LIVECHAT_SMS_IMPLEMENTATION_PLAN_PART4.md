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
