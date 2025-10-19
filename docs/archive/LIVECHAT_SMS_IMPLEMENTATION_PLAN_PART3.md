## Backend Implementation

### Key API Routes and Endpoints

#### 1. SMS Route (`/sms`)

The SMS route handles sending SMS messages and saving them to the database.

**Key Endpoints:**

- `POST /sms/send-sms`: Sends an SMS message via Twilio and saves it to the database

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
      .select('phone_number')
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
      .select('phone_number')
      .eq('workspace_id', workspaceId)
      .limit(1);
    
    if (!twilioNumbers || twilioNumbers.length === 0) {
      return res.status(400).json({ error: 'No Twilio numbers available for this workspace' });
    }
    
    // Format phone numbers
    const to = formatPhoneNumber(contact.phone_number);
    const from = formatPhoneNumber(twilioNumbers[0].phone_number);
    
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
      .from('livechatmessages')
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
