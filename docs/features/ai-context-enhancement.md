# AI Context Enhancement Documentation

## Overview

This document outlines the plan to enhance the ChatAI component to provide more tailored suggestions by giving it access to the full context of previous conversations across different message types (SMS, comments/notes, emails) for both inbound and outbound communications.

## Current Implementation

Currently, the ChatAI component has limited context awareness:

1. **Text Summarization**: Only processes the current input text without historical context
2. **Conversation Summarization**: Only uses the current visible messages in the chat window
3. **Text Improvement**: Only processes the current input text without considering conversation history

The backend AI service (`/api/ai/process-text`) uses simple prompts that don't incorporate rich contextual information about the contact, conversation history, or message metadata.

## Enhanced Implementation: Conversation Context Service Approach

We will implement a dedicated Conversation Context Service to centralize the management of conversation data and provide rich context to AI features. This approach optimizes for scalability and maintainability.

### File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── livechat2/
│   │       ├── ChatArea.js         # UI component for chat display
│   │       ├── ChatAI.js           # AI features UI component
│   │       └── LiveChat2.js        # Main container component
│   ├── services/
│   │   ├── ai.js                   # AI service for processing text
│   │   └── conversationContext.js  # NEW: Conversation context service
│   └── utils/
│       └── formatters.js           # Helpers for formatting data
│
backend/
└── src/
    └── routes/
        └── ai.js                   # Backend API endpoints for AI features
```

### Workflow Diagram

```
┌─────────────────┐     ┌───────────────────────┐     ┌─────────────┐
│                 │     │                       │     │             │
│    ChatArea     │────►│        ChatAI         │────►│  AI Service │
│                 │     │                       │     │             │
└────────┬────────┘     └───────────┬───────────┘     └──────┬──────┘
         │                          │                        │
         │                          │                        │
         │                          ▼                        ▼
         │              ┌───────────────────────┐    ┌──────────────┐
         └─────────────►│                       │    │              │
                        │  Conversation Context  │───►│  Backend API │
                        │        Service        │    │              │
                        └───────────────────────┘    └──────────────┘
```

## Implementation Details

### 1. Conversation Context Service (NEW)

Create a new service to centralize conversation data management:

```javascript
// src/services/conversationContext.js
import { supabase } from './supabase';

/**
 * Service for managing conversation context data
 */
class ConversationContextService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get conversation context for a contact
   * @param {string} workspaceId - Workspace ID
   * @param {string} contactId - Contact ID
   * @param {Object} options - Options for context retrieval
   * @returns {Promise<Object>} - Conversation context data
   */
  async getConversationContext(workspaceId, contactId, options = {}) {
    const cacheKey = `${workspaceId}-${contactId}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }
    
    try {
      // Fetch contact information
      const contactInfo = await this.getContactInfo(workspaceId, contactId);
      
      // Fetch messages with appropriate limits
      const messages = await this.getContactMessages(
        workspaceId, 
        contactId, 
        options.messageLimit || 50
      );
      
      // Prepare context data
      const contextData = {
        contactInfo,
        messages,
        messageStats: this.getMessageStats(messages),
        formattedHistory: this.formatConversationHistory(messages, contactInfo)
      };
      
      // Update cache
      this.cache.set(cacheKey, {
        data: contextData,
        timestamp: Date.now()
      });
      
      return contextData;
    } catch (error) {
      console.error('Error fetching conversation context:', error);
      throw error;
    }
  }
  
  /**
   * Get contact information
   * @param {string} workspaceId - Workspace ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} - Contact information
   */
  async getContactInfo(workspaceId, contactId) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
      
    if (error) throw error;
    return data;
  }
  
  /**
   * Get messages for a contact
   * @param {string} workspaceId - Workspace ID
   * @param {string} contactId - Contact ID
   * @param {number} limit - Maximum number of messages to retrieve
   * @returns {Promise<Array>} - Messages
   */
  async getContactMessages(workspaceId, contactId, limit = 50) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    return data.reverse(); // Return in chronological order
  }
  
  /**
   * Get statistics about message types
   * @param {Array} messages - Messages to analyze
   * @returns {Object} - Message statistics
   */
  getMessageStats(messages) {
    return {
      total: messages.length,
      sms: messages.filter(m => m.message_type === 'sms' || m.msg_type === 'sms').length,
      email: messages.filter(m => m.message_type === 'email' || m.msg_type === 'email').length,
      comment: messages.filter(m => m.is_internal).length,
      inbound: messages.filter(m => m.direction === 'inbound').length,
      outbound: messages.filter(m => m.direction === 'outbound').length
    };
  }
  
  /**
   * Format conversation history for AI consumption
   * @param {Array} messages - Messages to format
   * @param {Object} contactInfo - Contact information
   * @returns {string} - Formatted conversation history
   */
  formatConversationHistory(messages, contactInfo) {
    let formattedText = `CONTACT INFORMATION:\n`;
    formattedText += `Name: ${contactInfo?.name || 'Unknown'}\n`;
    formattedText += `Email: ${contactInfo?.email || 'Not provided'}\n`;
    formattedText += `Phone: ${contactInfo?.phone || 'Not provided'}\n\n`;
    
    formattedText += `CONVERSATION HISTORY:\n`;
    
    if (messages.length === 0) {
      formattedText += 'No message history available.\n';
      return formattedText;
    }
    
    messages.forEach((msg, index) => {
      const timestamp = new Date(msg.created_at).toLocaleString();
      const messageType = msg.is_internal ? 'INTERNAL NOTE' : 
                         (msg.message_type || msg.msg_type || 'MESSAGE').toUpperCase();
      const sender = msg.direction === 'inbound' ? 'Customer' : 'Agent';
      
      formattedText += `[${timestamp}] [${messageType}] ${sender}: `;
      
      // Add subject for emails
      if ((msg.message_type === 'email' || msg.msg_type === 'email') && msg.subject) {
        formattedText += `Subject: "${msg.subject}" - `;
      }
      
      formattedText += `${msg.body || msg.content}\n`;
    });
    
    return formattedText;
  }
  
  /**
   * Clear the cache for a specific contact or all contacts
   * @param {string} workspaceId - Workspace ID (optional)
   * @param {string} contactId - Contact ID (optional)
   */
  clearCache(workspaceId, contactId) {
    if (workspaceId && contactId) {
      this.cache.delete(`${workspaceId}-${contactId}`);
    } else {
      this.cache.clear();
    }
  }
}

// Create singleton instance
const conversationContext = new ConversationContextService();

export default conversationContext;
```

### 2. Enhanced AI Service

Update the AI service to use the Conversation Context Service:

```javascript
// src/services/ai.js
import axios from 'axios';
import conversationContext from './conversationContext';

const API_URL = process.env.REACT_APP_API_URL || 'https://cc.automate8.com';
const API_PATH = `${API_URL}/api/ai`;

// Existing functions...

/**
 * Enhanced version of summarizeConversation that uses rich context
 * @param {string} workspaceId - The workspace ID
 * @param {string} contactId - The contact ID
 * @param {string} inputText - Current input text (optional)
 * @returns {Promise<Object>} - The summarized conversation result
 */
export const summarizeConversationEnhanced = async (workspaceId, contactId, inputText = '') => {
  try {
    // Get rich context data from the context service
    const contextData = await conversationContext.getConversationContext(workspaceId, contactId);
    
    // Add current input if available
    if (inputText) {
      contextData.inputText = inputText;
    }
    
    // Call the backend API
    const response = await axios.post(`${API_PATH}/summarize-conversation-enhanced`, {
      workspaceId,
      contextData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error summarizing conversation with enhanced context:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Suggest a response based on conversation context
 * @param {string} workspaceId - The workspace ID
 * @param {string} contactId - The contact ID
 * @returns {Promise<Object>} - The suggested response
 */
export const suggestResponse = async (workspaceId, contactId) => {
  try {
    // Get rich context data from the context service
    const contextData = await conversationContext.getConversationContext(workspaceId, contactId);
    
    // Call the backend API
    const response = await axios.post(`${API_PATH}/suggest-response`, {
      workspaceId,
      contextData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error suggesting response:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};

/**
 * Improve text with conversation context awareness
 * @param {string} workspaceId - The workspace ID
 * @param {string} contactId - The contact ID
 * @param {string} text - Text to improve
 * @returns {Promise<Object>} - The improved text result
 */
export const improveTextEnhanced = async (workspaceId, contactId, text) => {
  try {
    if (!text.trim()) {
      return { success: false, error: 'No text provided' };
    }
    
    // Get rich context data from the context service
    const contextData = await conversationContext.getConversationContext(workspaceId, contactId);
    
    // Add text to improve
    contextData.inputText = text;
    
    // Call the backend API
    const response = await axios.post(`${API_PATH}/improve-text-enhanced`, {
      workspaceId,
      contextData
    });
    
    return response.data;
  } catch (error) {
    console.error('Error improving text with enhanced context:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || error.message 
    };
  }
};
```

### 3. Updated ChatAI Component

Simplify the ChatAI component to use the enhanced AI service:

```javascript
// src/components/livechat2/ChatAI.js
import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { FaRobot } from 'react-icons/fa';
import { 
  summarizeText, 
  summarizeConversationEnhanced, 
  improveTextEnhanced,
  suggestResponse
} from '../../services/ai';

const ChatAI = ({ 
  workspaceId, 
  contactId,
  inputText, 
  onTextProcessed,
  size = "md",
  borderRadius = 0,
  colorScheme = "gray" 
}) => {
  const [aiProcessing, setAiProcessing] = useState(false);
  const toast = useToast();

  // Handle AI actions
  const handleAIAction = (action) => {
    switch (action) {
      case 'summarize_text':
        handleSummarizeText();
        break;
      case 'summarize_conversation':
        handleSummarizeConversation();
        break;
      case 'improve_text':
        handleImproveText();
        break;
      case 'suggest_response':
        handleSuggestResponse();
        break;
      default:
        break;
    }
  };

  // Handle text summarization
  const handleSummarizeText = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'No text to summarize',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setAiProcessing(true);
    try {
      const result = await summarizeText(workspaceId, inputText);
      
      if (result.success) {
        onTextProcessed(result.processed);
        toast({
          title: 'Text summarized',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to summarize text');
      }
    } catch (error) {
      toast({
        title: 'Error summarizing text',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAiProcessing(false);
    }
  };

  // Handle conversation summarization with enhanced context
  const handleSummarizeConversation = async () => {
    if (!contactId) {
      toast({
        title: 'Cannot summarize conversation',
        description: 'No contact selected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setAiProcessing(true);
    try {
      const result = await summarizeConversationEnhanced(workspaceId, contactId, inputText);
      
      if (result.success) {
        onTextProcessed(result.processed);
        toast({
          title: 'Conversation summarized',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to summarize conversation');
      }
    } catch (error) {
      toast({
        title: 'Error summarizing conversation',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAiProcessing(false);
    }
  };

  // Handle text improvement with enhanced context
  const handleImproveText = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'No text to improve',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setAiProcessing(true);
    try {
      const result = await improveTextEnhanced(workspaceId, contactId, inputText);
      
      if (result.success) {
        onTextProcessed(result.processed);
        toast({
          title: 'Text improved',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to improve text');
      }
    } catch (error) {
      toast({
        title: 'Error improving text',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAiProcessing(false);
    }
  };

  // Handle response suggestion
  const handleSuggestResponse = async () => {
    if (!contactId) {
      toast({
        title: 'Cannot suggest response',
        description: 'No contact selected.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setAiProcessing(true);
    try {
      const result = await suggestResponse(workspaceId, contactId);
      
      if (result.success) {
        onTextProcessed(result.processed);
        toast({
          title: 'Response suggestion generated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to generate response suggestion');
      }
    } catch (error) {
      toast({
        title: 'Error generating suggestion',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setAiProcessing(false);
    }
  };

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="AI options"
        icon={aiProcessing ? <Spinner size="sm" /> : <FaRobot />}
        isLoading={aiProcessing}
        size={size}
        borderRadius={borderRadius}
        colorScheme={colorScheme}
      />
      <MenuList>
        <MenuItem onClick={() => handleAIAction('summarize_text')}>
          Summarize Text
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('summarize_conversation')}>
          Summarize Conversation
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('improve_text')}>
          Improve Text
        </MenuItem>
        <MenuItem onClick={() => handleAIAction('suggest_response')}>
          Suggest Response
        </MenuItem>
      </MenuList>
    </Menu>
  );
};

export default ChatAI;
```

### 4. Backend API Enhancements

Update the backend API to handle the enhanced context:

```javascript
// backend/src/routes/ai.js
// New endpoints for enhanced AI features

// Endpoint for suggesting responses based on conversation context
router.post('/suggest-response', async (req, res) => {
  try {
    const { workspaceId, contextData } = req.body;
    
    console.log('Response suggestion request:', { 
      workspaceId,
      contextDataAvailable: !!contextData
    });

    if (!workspaceId || !contextData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Get OpenAI client for this workspace
    const { client: openai, model } = await getOpenAIClient(workspaceId);
    
    // Generate a response suggestion
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a customer service assistant helping an agent respond to a customer. 
          Based on the conversation history and context provided, suggest a helpful, professional response.
          
          Consider the tone of previous messages, the customer's needs, and any specific issues mentioned.
          If this is an email, maintain a formal tone. If it's an SMS, be concise but friendly.
          If it's an internal comment, focus on actionable insights for team members.
          
          Tailor your response to the conversation context and customer history.`
        },
        {
          role: 'user',
          content: contextData.formattedHistory
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const suggestedResponse = response.choices[0].message.content.trim();
    
    // Return the suggested response
    return res.status(200).json({
      success: true,
      processed: suggestedResponse,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error suggesting response:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint for enhanced conversation summarization
router.post('/summarize-conversation-enhanced', async (req, res) => {
  try {
    const { workspaceId, contextData } = req.body;
    
    console.log('Enhanced conversation summary request:', { 
      workspaceId,
      contextDataAvailable: !!contextData
    });

    if (!workspaceId || !contextData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Get OpenAI client for this workspace
    const { client: openai, model } = await getOpenAIClient(workspaceId);
    
    // Add current input text if available
    let formattedContent = contextData.formattedHistory;
    if (contextData.inputText) {
      formattedContent += `\nCURRENT DRAFT:\n${contextData.inputText}\n`;
    }
    
    // Generate an enhanced summary
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are a conversation summarization expert. Summarize the following conversation between a Customer and an Agent.
          
          Focus on:
          1. The main topics discussed
          2. Any issues or questions raised by the customer
          3. Solutions or answers provided by the agent
          4. Any pending action items or follow-ups needed
          
          Consider all message types (SMS, email, internal comments) in your summary.
          Be concise but comprehensive, highlighting the most important information.
          Keep your summary to 3-5 sentences.`
        },
        {
          role: 'user',
          content: formattedContent
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const enhancedSummary = response.choices[0].message.content.trim();
    
    // Return the enhanced summary
    return res.status(200).json({
      success: true,
      processed: enhancedSummary,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error generating enhanced conversation summary:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint for improving text with conversation context
router.post('/improve-text-enhanced', async (req, res) => {
  try {
    const { workspaceId, contextData } = req.body;
    
    console.log('Enhanced text improvement request:', { 
      workspaceId,
      contextDataAvailable: !!contextData,
      hasInputText: !!contextData?.inputText
    });

    if (!workspaceId || !contextData || !contextData.inputText) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    // Get OpenAI client for this workspace
    const { client: openai, model } = await getOpenAIClient(workspaceId);
    
    // Format content for AI
    const formattedContent = `
${contextData.formattedHistory}

TEXT TO IMPROVE:
${contextData.inputText}
`;
    
    // Generate improved text
    const response = await openai.chat.completions.create({
      model: model,
      messages: [
        {
          role: 'system',
          content: `You are an expert at improving written communication. Enhance the provided text to make it more professional, clear, and effective.
          
          Consider:
          1. The conversation history and context
          2. The appropriate tone based on previous messages
          3. The type of communication (SMS, email, internal note)
          4. The customer's needs and concerns
          
          Maintain the original intent and key information while improving clarity, tone, and effectiveness.
          Do not add new information that isn't supported by the context.`
        },
        {
          role: 'user',
          content: formattedContent
        }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    const improvedText = response.choices[0].message.content.trim();
    
    // Return the improved text
    return res.status(200).json({
      success: true,
      processed: improvedText,
      usage: response.usage
    });
  } catch (error) {
    console.error('Error improving text with enhanced context:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

### 5. Integration with ChatArea

Update the ChatArea component to pass the necessary props to ChatAI:

```javascript
// In ChatArea.js
<ChatAI
  workspaceId={currentWorkspace?.id}
  contactId={contact?.id}
  inputText={newMessage}
  onTextProcessed={(processedText) => setNewMessage(processedText)}
  size="md"
  borderRadius={0}
  colorScheme="gray"
/>
```

## Implementation Phases

### Phase 1: Conversation Context Service
1. Create the new `conversationContext.js` service
2. Implement methods for fetching and formatting conversation data
3. Add caching for performance optimization
4. Test the service with sample data

### Phase 2: Backend API Enhancement
1. Add new API endpoints for context-aware AI processing
2. Update existing endpoints to use the enhanced context
3. Test the new endpoints with sample data

### Phase 3: Frontend Service Enhancement
1. Update the AI service to use the Conversation Context Service
2. Add new service functions for enhanced features
3. Test the service functions with the new backend endpoints

### Phase 4: ChatAI Component Update
1. Simplify the ChatAI component to use the enhanced AI service
2. Update the UI to include new AI actions
3. Test the enhanced component with sample data

### Phase 5: Integration
1. Update the ChatArea component to pass the necessary props to ChatAI
2. Test the integrated solution with real conversations

## Benefits

1. **Centralized Context Management**: The Conversation Context Service provides a single source of truth for conversation data.

2. **Improved Performance**: Caching reduces redundant database queries and API calls.

3. **Better Separation of Concerns**: UI components focus on presentation, while the service layer handles data management.

4. **Scalability**: The service-based architecture makes it easier to add new AI features in the future.

5. **Maintainability**: Smaller, focused components and services are easier to maintain and test.

6. **Enhanced User Experience**: Agents receive more helpful AI suggestions based on the full conversation context.

## Considerations

1. **Cache Invalidation**: Ensure the cache is properly invalidated when messages are added or updated.

2. **Error Handling**: Implement robust error handling to gracefully handle failures in AI processing.

3. **Performance Monitoring**: Monitor the performance of the Conversation Context Service to ensure it scales well.

4. **Privacy**: Ensure that sensitive information is handled appropriately when sending data to the AI service.

5. **Fallbacks**: Provide fallback options when AI processing fails or when the context is insufficient.

## Next Steps

After implementing these enhancements, consider the following future improvements:

1. **Contact-Specific Learning**: Train the AI to recognize patterns in interactions with specific contacts.

2. **Sentiment Tracking**: Track sentiment over time to identify trends and potential issues.

3. **Automated Tagging**: Use AI to automatically tag conversations with relevant categories.

4. **Response Templates**: Generate and suggest response templates based on common scenarios.

5. **Proactive Suggestions**: Offer suggestions before the user explicitly requests them, based on conversation context.
