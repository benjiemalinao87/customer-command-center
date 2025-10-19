# Inbound Call Notification Implementation Guide

## Overview

This document outlines the complete architecture for handling inbound call notifications in web applications using Twilio Client (Twilio Voice SDK). It covers both the frontend and backend components necessary to successfully receive, notify, and handle incoming calls.

## Architecture

The system consists of three main components working together:

1. **Backend Voice API** - A Node.js Express server that handles Twilio webhooks and generates capability tokens
2. **Frontend Twilio Device Initialization** - JavaScript code that sets up the Twilio Device with the capability token
3. **Frontend Inbound Call Listener** - A component that listens for incoming call events and triggers UI notifications

## Backend Implementation

### 1. Twilio Webhook Handler for Incoming Calls

```javascript
// In your Express server (e.g., server.js)
app.post('/api/voice/incoming', async (req, res) => {
  try {
    const from = req.body.From;
    const to = req.body.To;
    
    console.log(`Incoming call from ${from} to ${to}`);
    
    // Look up which workspace this phone number belongs to
    const { data: number, error } = await supabase
      .from('twilio_numbers')
      .select('workspace_id')
      .eq('phone_number', to)
      .single();
      
    if (error || !number) {
      console.error('No workspace found for this number:', to);
      return res.status(404).send('Number not found');
    }
    
    // Create TwiML response to direct the call to the client
    const twiml = new VoiceResponse();
    twiml.redirect(`/api/workspaces/${number.workspace_id}/voice`);
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error handling incoming call:', error);
    res.status(500).send('Server error');
  }
});
```

### 2. Workspace Voice Handler

```javascript
app.post('/api/workspaces/:workspaceId/voice', validateWorkspace, async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const from = req.body.From;
    const to = req.body.To;
    const direction = req.body.Direction;
    
    console.log(`Call ${direction} from ${from} to ${to} for workspace ${workspaceId}`);
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    if (direction === 'inbound') {
      // This is an incoming call - get agents currently online
      const { data: agents } = await supabase
        .from('online_agents')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'available');
      
      if (!agents || agents.length === 0) {
        // No available agents - send to voicemail
        twiml.say('No agents are available. Please leave a message.');
        twiml.record({
          action: `/api/workspaces/${workspaceId}/voice/voicemail`,
          transcribe: true,
          maxLength: 120
        });
      } else {
        // Ring all available agents
        const dial = twiml.dial({
          callerId: from,
          timeout: 20,
          action: `/api/workspaces/${workspaceId}/voice/status`,
        });
        
        agents.forEach(agent => {
          dial.client(agent.user_id);
        });
      }
    } else {
      // Outbound call logic would go here
      // ...
    }
    
    // Log the call in database
    await supabase.from('call_logs').insert({
      workspace_id: workspaceId,
      from: from,
      to: to,
      direction: direction,
      status: 'initiated',
      timestamp: new Date().toISOString()
    });
    
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error) {
    console.error('Error processing voice call:', error);
    res.status(500).send('Server error');
  }
});
```

### 3. Token Generation Endpoint

```javascript
app.get('/api/workspaces/:workspaceId/token', validateWorkspace, async (req, res) => {
  try {
    const { account_sid, auth_token, api_key_sid, api_key_secret, twiml_app_sid } = req.twilioConfig;
    const workspaceId = req.params.workspaceId;
    const identity = req.query.identity; // This should be the user/agent ID
    
    console.log('Generating token for workspace:', workspaceId, 'identity:', identity);
    
    // Validate basic credentials
    if (!account_sid || !auth_token) {
      console.error('Missing basic Twilio credentials for workspace:', workspaceId);
      return res.status(400).json({ 
        error: 'Missing Twilio credentials'
      });
    }
    
    // Create an access token with the Twilio Account SID as the issuer
    const AccessToken = pkg.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;
    
    // Create an API key if one is not provided
    let keySid = api_key_sid || account_sid;
    let keySecret = api_key_secret || auth_token;
    
    // Create an access token
    const token = new AccessToken(account_sid, keySid, keySecret, {
      identity: identity, // Important: This needs to match the client identity in TwiML
      ttl: 3600 // Token expires in 1 hour
    });
    
    // Create a Voice grant and add it to the token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twiml_app_sid,
      incomingAllow: true // Allow this client to receive incoming calls
    });
    
    token.addGrant(voiceGrant);
    
    // Generate the JWT token string
    const tokenString = token.toJwt();
    
    // Update agent status to 'available'
    await supabase.from('online_agents').upsert({
      workspace_id: workspaceId,
      user_id: identity,
      status: 'available',
      last_seen: new Date().toISOString()
    });
    
    res.json({ token: tokenString });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});
```

## Frontend Implementation

### 1. Twilio Device Initialization Component

Create a component that initializes the Twilio Device once when the application loads:

```javascript
import { useEffect, useRef } from 'react';

const TwilioInboundListener = ({ workspaceId, userId }) => {
  const deviceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    async function setupDevice() {
      try {
        console.log('Fetching token for identity:', userId);
        const response = await fetch(`/api/workspaces/${workspaceId}/token?identity=${userId}`);
        const { token } = await response.json();
        if (!token) throw new Error('No token received');

        console.log('Token received, setting up Twilio Device');
        window.Twilio.Device.setup(token, { debug: true });
        deviceRef.current = window.Twilio.Device;

        window.Twilio.Device.on('ready', () => {
          console.log('Twilio Device: Registered and ready for calls');
        });
        
        window.Twilio.Device.on('error', (error) => {
          console.error('Twilio Device error:', error);
        });
        
        window.Twilio.Device.on('incoming', (conn) => {
          console.log('Incoming call event received:', conn);
          if (!isMounted) return;
          
          // IMPORTANT: This is the crucial part for inbound call notification
          // Dispatch action to global state to show incoming call UI
          window.dispatchEvent(new CustomEvent('incomingCall', {
            detail: {
              connection: conn,
              from: conn.parameters.From,
              to: conn.parameters.To
            }
          }));
          
          // Play ringtone
          const audio = new Audio('/sounds/ringtone.mp3');
          audio.loop = true;
          audio.play().catch(e => console.error('Could not play ringtone:', e));
          
          // Store the audio element so it can be stopped when call is answered/rejected
          window.incomingCallAudio = audio;
        });
      } catch (err) {
        console.error('Failed to initialize Twilio Device:', err);
      }
    }

    setupDevice();

    return () => {
      isMounted = false;
      if (deviceRef.current) {
        deviceRef.current.disconnectAll();
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
    };
  }, [workspaceId, userId]);

  return null; // No UI, just side effects
};

export default TwilioInboundListener;
```

### 2. Incoming Call Modal Component

Create a modal component that listens for incoming call events and displays a UI to answer or reject the call:

```javascript
import { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  Flex,
  Icon,
  useDisclosure
} from '@chakra-ui/react';
import { PhoneIcon, CloseIcon } from '@chakra-ui/icons';

const IncomingCallModal = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [callData, setCallData] = useState(null);
  
  useEffect(() => {
    // Listen for the custom event dispatched by TwilioInboundListener
    const handleIncomingCall = (event) => {
      console.log('IncomingCallModal received event:', event.detail);
      setCallData(event.detail);
      onOpen();
    };
    
    window.addEventListener('incomingCall', handleIncomingCall);
    
    return () => {
      window.removeEventListener('incomingCall', handleIncomingCall);
    };
  }, [onOpen]);
  
  const handleAnswer = () => {
    if (!callData || !callData.connection) return;
    
    console.log('Answering call...');
    callData.connection.accept();
    
    // Stop the ringtone
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
      window.incomingCallAudio = null;
    }
    
    onClose();
    
    // Dispatch event that call has been answered - other components can listen for this
    window.dispatchEvent(new CustomEvent('callAnswered', {
      detail: { connection: callData.connection }
    }));
  };
  
  const handleReject = () => {
    if (!callData || !callData.connection) return;
    
    console.log('Rejecting call...');
    callData.connection.reject();
    
    // Stop the ringtone
    if (window.incomingCallAudio) {
      window.incomingCallAudio.pause();
      window.incomingCallAudio.currentTime = 0;
      window.incomingCallAudio = null;
    }
    
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleReject} closeOnEsc={false} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader bg="green.500" color="white" borderTopRadius="md">
          Incoming Call
        </ModalHeader>
        <ModalBody py={6}>
          <Flex direction="column" align="center" justify="center">
            <Icon as={PhoneIcon} boxSize={12} color="green.500" mb={4} />
            <Text fontSize="lg" fontWeight="bold">
              {callData?.from ? `From: ${callData.from}` : 'Incoming call'}
            </Text>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Flex width="100%" justify="space-between">
            <Button colorScheme="red" leftIcon={<CloseIcon />} onClick={handleReject}>
              Reject
            </Button>
            <Button colorScheme="green" leftIcon={<PhoneIcon />} onClick={handleAnswer}>
              Answer
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default IncomingCallModal;
```

### 3. Integration in Main App

Integrate both components in your main application layout:

```javascript
import React from 'react';
import { useSelector } from 'react-redux';
import TwilioInboundListener from './TwilioInboundListener';
import IncomingCallModal from './IncomingCallModal';

const AppLayout = ({ children }) => {
  const { user, workspace } = useSelector(state => state.auth);
  
  return (
    <>
      {children}
      
      {/* Always mount these components if user is logged in */}
      {user && workspace && (
        <>
          <TwilioInboundListener 
            workspaceId={workspace.id} 
            userId={user.id} 
          />
          <IncomingCallModal />
        </>
      )}
    </>
  );
};

export default AppLayout;
```

## Common Issues and Troubleshooting

### 1. Incoming calls not triggering frontend notification

Possible causes:
- The Twilio Device is not properly initialized with a valid token
- The token does not have the `incomingAllow: true` grant
- The token's identity does not match the Client identity in TwiML
- Missing event listener for the 'incoming' event
- Network issues preventing the Twilio Device from connecting to Twilio's servers

### 2. Debugging Steps

1. Enable debug mode in Twilio Device setup: `Twilio.Device.setup(token, { debug: true })`
2. Check browser console for Twilio Device logs
3. Verify the token contains the correct identity and grants:
   ```javascript
   const tokenData = JSON.parse(atob(token.split('.')[1])); // Decode JWT payload
   console.log('Token data:', tokenData);
   ```
4. Confirm the TwiML being returned by the server includes `<Client>` elements with matching identities
5. Test with the Twilio Voice SDK test page: https://www.twilio.com/docs/voice/sdks/javascript/quickstart

### 3. Browser Permissions

Make sure users grant microphone permissions when prompted. The Twilio Device may not fully initialize without these permissions.

## Best Practices

1. **Separate Concerns**:
   - Keep token generation separate from call handling
   - Use separate components for device initialization and UI

2. **Error Handling**:
   - Always handle errors in all async operations
   - Provide clear error messages to users

3. **Security**:
   - Generate short-lived tokens (1 hour or less)
   - Validate workspace access on the server
   - Use API keys instead of auth tokens when possible

4. **UX Considerations**:
   - Provide clear audio feedback for incoming calls
   - Make answer/reject buttons large and easy to use
   - Show caller information when available

## Conclusion

Implementing inbound call notifications requires careful coordination between the backend and frontend components. By following the patterns outlined in this document, you can create a reliable system that notifies agents of incoming calls and allows them to answer directly from their browser.
