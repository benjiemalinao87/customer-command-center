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
