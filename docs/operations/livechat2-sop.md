# LiveChat Version 2 - Standard Operating Procedures (SOP)

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture & Components](#architecture--components)
3. [Feature Documentation](#feature-documentation)
4. [Testing Procedures](#testing-procedures)
5. [Debugging Guide](#debugging-guide)
6. [Maintenance Guidelines](#maintenance-guidelines)
7. [Deployment Procedures](#deployment-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Development Workflow](#development-workflow)

---

## System Overview

### What is LiveChat Version 2?
LiveChat V2 is a comprehensive real-time messaging and CRM system that enables businesses to communicate with customers via SMS, manage contacts, and track conversations in real-time.

### Key Capabilities
- **Real-time SMS Messaging** - Instant bidirectional text messaging
- **Contact Management** - CRM-style contact organization and filtering
- **Message Scheduling** - Schedule messages for future delivery via Trigger.dev
- **File Attachments** - Send/receive images, videos, documents
- **Internal Comments** - Team collaboration with @mentions
- **Call Integration** - Outbound calling with Twilio Voice SDK
- **Pipeline Management** - Sales pipeline tracking and opportunity creation
- **Multi-workspace Support** - Tenant isolation with Row Level Security

### Tech Stack
- **Frontend**: React 18 + Chakra UI + Socket.IO client
- **Backend**: Node.js + Express + Socket.IO server
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **External Services**: Twilio (SMS/Voice), Trigger.dev (scheduling)
- **Real-time**: Socket.IO for bidirectional communication

---

## Architecture & Components

### High-Level Architecture
```
Frontend (React) ←→ Backend (Express/Socket.IO) ←→ Supabase Database
                                ↓
                    External Services (Twilio, Trigger.dev)
```

### Main Component Structure
```
LiveChat2/ (Main orchestrator - 2,120 lines after refactoring)
├── ChatArea/ (Message interface - extracted components)
│   ├── MessageList/ - Message display with autonomous scroll
│   ├── MessageInput/ - Input handling with shortcuts & scheduling
│   ├── ContactHeader/ - Contact actions (close/reopen/opportunity)
│   ├── EmailComposer/ - Email composition modal
│   └── hooks/
│       ├── useRealtimeMessages.js - Real-time message handling
│       ├── useScheduledMessages.js - Scheduled message management
│       └── useMessageRealtime.js - Message subscriptions
├── ContactList/ - Contact display and selection
├── InboxSidebar/ - Filtering and folder navigation
├── ContactDetails/ - Contact information sidebar
└── shortcuts/ - Message shortcuts system
```

### Core Data Flow
1. **Incoming Messages**: SMS → Twilio → Backend → Socket.IO → Frontend
2. **Outgoing Messages**: Frontend → Backend → Twilio → SMS
3. **Real-time Updates**: Database changes → Supabase → Frontend subscriptions
4. **Contact Management**: Frontend → Backend API → Supabase with RLS

---

## Feature Documentation

### 1. Real-time Messaging System

#### **What it does:**
- Receives incoming SMS/MMS messages instantly
- Sends outgoing messages with delivery tracking
- Handles message deduplication and prevents duplicates
- Updates contact list in real-time
- Shows notifications with sound alerts

#### **How to test:**
```bash
1. Open LiveChat2 interface
2. Select a contact with phone number
3. Send SMS to business number from external phone
4. Verify:
   ✅ Message appears instantly in chat
   ✅ Contact moves to top of list
   ✅ Toast notification shows
   ✅ Sound alert plays
   ✅ No duplicate messages
```

#### **Key files:**
- `hooks/useRealtimeMessages.js` - Core logic (~195 lines)
- `ChatArea/MessageList/` - Message display
- `socket.js` - Socket.IO connection management

#### **Debug commands:**
```javascript
// Browser console
console.log('Socket connected:', window.socket?.connected);
// Look for: [useRealtimeMessages] 📱 INCOMING MESSAGE
```

### 2. Message Scheduling System

#### **What it does:**
- Schedule messages for future delivery
- Quick preset buttons (3hr, 6hr, tomorrow 8AM, etc.)
- Custom date/time scheduling via modal
- Integration with Trigger.dev for reliable delivery
- Contact-specific scheduled message viewing

#### **How to test:**
```bash
1. Open chat with contact
2. Type message in input field
3. Click schedule icon (clock)
4. Select quick preset (e.g., "3 Hours")
5. Verify:
   ✅ Success toast shows scheduled time
   ✅ Message input clears
   ✅ View scheduled messages shows entry
   ✅ Message delivers at scheduled time
```

#### **Key files:**
- `MessageInput/MessageInput.js` - Inline scheduling UI
- `hooks/useScheduledMessages.js` - Schedule management
- `ContactScheduledMessagesModal/` - Viewing scheduled messages

#### **Debug commands:**
```javascript
// Check scheduled messages in database
await supabase
  .from('scheduled_sms_jobs')
  .select('*')
  .eq('contact_id', 'CONTACT_ID')
  .eq('status', 'pending');
```

### 3. Contact Management System

#### **What it does:**
- Display contacts with last message preview
- Real-time contact list updates
- Filtering by status (open, closed, assigned)
- Search functionality with debouncing
- Contact status updates and unread counts

#### **How to test:**
```bash
1. Open LiveChat2 interface
2. Test filtering:
   - Click "Open" filter → Shows only open conversations
   - Click "Closed" filter → Shows only closed conversations  
   - Click "Assigned to Me" → Shows only assigned contacts
3. Test search:
   - Type contact name in search box
   - Verify results filter in real-time
4. Test real-time updates:
   - Send message to contact
   - Verify contact moves to top of list
```

#### **Key files:**
- `ContactList/ContactList.js` - Contact display
- `LiveChat2.js` - Main contact management logic
- `services/livechatService.js` - Contact API calls

### 4. Message Input & Shortcuts System

#### **What it does:**
- Multi-mode input (SMS, Comment, Email)
- Keyboard shortcuts activated with "/"
- File attachment support (images, videos, documents)
- @mention system for team comments
- Speech-to-text and video recording

#### **How to test:**
```bash
1. Message shortcuts:
   - Type "/" in message input
   - Verify dropdown appears with shortcuts
   - Select shortcut → text inserts
2. File attachments:
   - Click attachment icon
   - Select file → verify preview appears
   - Send message → verify file delivers
3. Comments with mentions:
   - Switch to "Comment" tab
   - Type "@" → verify team member list appears
   - Send comment → verify team member gets notification
```

#### **Key files:**
- `MessageInput/MessageInput.js` - Main input component (1,096 lines)
- `shortcuts/` - Shortcut management system
- `services/mediaService.js` - File upload handling

### 5. Call Integration System

#### **What it does:**
- Outbound calling via Twilio Voice SDK
- Call status tracking (initiated, ringing, connected, ended)
- Call logging with duration and status
- Real-time call control modal
- Fallback simulation for development

#### **How to test:**
```bash
1. Navigate to Speed to Lead Board
2. Find contact with phone number
3. Click "Call" button
4. Verify:
   ✅ Call Control Modal opens
   ✅ Shows real-time status updates
   ✅ Mute/unmute controls work
   ✅ End call button works
   ✅ Call logged in database
```

#### **Key files:**
- `services/callService.js` - Call management
- `CallControlModal.js` - Real-time call interface
- `routes/calls.js` - Backend call API

---

## Testing Procedures

### Manual Testing Checklist

#### **Real-time Messaging**
- [ ] Send SMS from external phone → Message appears instantly
- [ ] Send outbound SMS → Delivers successfully
- [ ] Send multiple rapid messages → No duplicates appear
- [ ] Contact list updates automatically with new messages
- [ ] Notifications work (sound + toast)

#### **Message Scheduling**
- [ ] Quick schedule (3 hours) → Success message shows
- [ ] Custom schedule → Modal opens and works
- [ ] View scheduled messages → Shows correct entries
- [ ] Scheduled message delivers at correct time
- [ ] Cancel scheduled message works

#### **Contact Management**
- [ ] Filter by Open → Shows only open conversations
- [ ] Filter by Closed → Shows only closed conversations
- [ ] Search contacts → Real-time filtering works
- [ ] Contact selection → Chat loads correctly
- [ ] Contact status updates → Reflects in list

#### **File Attachments**
- [ ] Image upload → Preview shows, sends successfully
- [ ] Video upload → Preview shows, sends successfully
- [ ] Document upload → Sends successfully
- [ ] Large files → Proper error handling

#### **Team Collaboration**
- [ ] Switch to Comment tab → Internal mode active
- [ ] @mention team member → Dropdown appears
- [ ] Send comment with mention → Notification sent
- [ ] Comment only visible to team → External users can't see

### Automated Testing

#### **Browser Console Tests**
```javascript
// Socket.IO connection test
console.log('Socket status:', {
  connected: window.socket?.connected,
  id: window.socket?.id
});

// Memory usage test
console.log('Memory:', performance.memory);

// Test hook status
console.log('LiveChat2 hooks active');
```

#### **API Testing**
```bash
# Test message sending
curl -X POST https://cc.automate8.com/api/messages/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "body": "Test message"}'

# Test contact retrieval
curl -X GET https://cc.automate8.com/api/contacts?workspace_id=WORKSPACE_ID
```

---

## Debugging Guide

### Common Issues & Solutions

#### **1. Messages Not Appearing in Real-time**
**Symptoms:** Messages only show after page refresh
**Debug Steps:**
```javascript
// Check Socket.IO connection
console.log('Socket connected:', window.socket?.connected);

// Check workspace subscription
console.log('Current workspace:', workspace?.id);

// Look for error logs
// Console should show: [useRealtimeMessages] 📱 INCOMING MESSAGE
```
**Solutions:**
- Refresh page to reinitialize Socket.IO
- Check network connectivity
- Verify backend Socket.IO server is running

#### **2. Duplicate Messages**
**Symptoms:** Same message appears multiple times
**Debug Steps:**
```javascript
// Check deduplication logs
// Look for: [useRealtimeMessages] 🚫 DUPLICATE MESSAGE DETECTED

// Check message IDs
console.log('Processed messages cache size:', processedMessagesRef.current?.size);
```
**Solutions:**
- Verify message IDs are unique
- Check deduplication logic in useRealtimeMessages
- Clear browser cache and reload

#### **3. Contact List Not Updating**
**Symptoms:** New messages don't move contacts to top
**Debug Steps:**
```bash
1. Check contact fetching
2. Verify workspace ID consistency  
3. Check database RLS policies
4. Look for JavaScript errors in console
```

#### **4. File Uploads Failing**
**Symptoms:** Attachments don't send or show errors
**Debug Steps:**
```javascript
// Check media service
console.log('Media service config:', mediaService);

// Check file size limits
console.log('File size:', file.size, 'MB:', file.size / 1024 / 1024);
```
**Solutions:**
- Verify file size under limits (10MB)
- Check Supabase storage configuration
- Ensure proper file type support

#### **5. Scheduled Messages Not Sending**
**Symptoms:** Scheduled messages don't deliver at set time
**Debug Steps:**
```sql
-- Check scheduled jobs table
SELECT * FROM scheduled_sms_jobs 
WHERE contact_id = 'CONTACT_ID' 
AND status = 'pending';

-- Check Trigger.dev job status
```
**Solutions:**
- Verify Trigger.dev integration
- Check contact has valid phone number
- Ensure workspace ID is correct

### Performance Debugging

#### **Memory Leaks**
```javascript
// Monitor memory usage over time
setInterval(() => {
  console.log('Memory usage:', {
    used: performance.memory.usedJSHeapSize / 1024 / 1024,
    total: performance.memory.totalJSHeapSize / 1024 / 1024
  });
}, 30000); // Every 30 seconds
```

#### **Socket.IO Connection Issues**
```javascript
// Debug Socket.IO events
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});

// Check connection state
socket.on('connect', () => console.log('Socket connected'));
socket.on('disconnect', () => console.log('Socket disconnected'));
```

---

## Maintenance Guidelines

### Code Quality Standards

#### **React Hooks Rules**
- Always call hooks at top level (never conditional)
- Include proper cleanup in useEffect return functions
- Use stable dependencies to prevent infinite loops
- Implement memory-safe patterns with bounded caches

#### **Error Handling**
```javascript
// Always wrap async operations
try {
  const result = await someAsyncOperation();
  // Handle success
} catch (error) {
  logger.error('Operation failed:', error);
  // Show user-friendly error message
  toast({
    title: 'Error',
    description: 'Something went wrong. Please try again.',
    status: 'error'
  });
}
```

#### **State Management**
- Use refs for stable access without dependencies
- Implement optimistic UI updates where appropriate
- Clean up state on component unmount
- Avoid direct state mutations

### Performance Guidelines

#### **Message Processing**
- Implement message deduplication (ID + content-based)
- Use bounded caches (max 200 entries, keep last 100)
- Debounce rapid API calls (300ms debounce)
- Clean up old processed message references

#### **Contact Management**
- Implement pagination for large contact lists
- Use debounced search (150ms delay)
- Cache frequently accessed contact data
- Invalidate caches on data changes

### Security Guidelines

#### **Data Validation**
- Validate all user inputs before processing
- Sanitize data before database insertion
- Use parameterized queries to prevent SQL injection
- Implement proper error messages without exposing internals

#### **Authentication & Authorization**
- Use Row Level Security (RLS) for workspace isolation
- Validate workspace access on all API calls
- Never expose sensitive data in client-side logs
- Implement proper session management

---

## Deployment Procedures

### Pre-deployment Checklist
- [ ] All tests pass locally
- [ ] No console errors in production build
- [ ] Memory leak testing completed
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Socket.IO server is running
- [ ] Twilio webhooks configured

### Build Process
```bash
# Frontend build
cd frontend
npm run build

# Backend preparation
cd backend
npm install --production
```

### Environment Configuration
```bash
# Frontend (.env.production)
REACT_APP_SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_anon_key
REACT_APP_BACKEND_URL=https://cc.automate8.com

# Backend (.env)
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
```

### Deployment Steps
1. **Build & Test**: Create production build and verify locally
2. **Database**: Apply any pending migrations
3. **Backend**: Deploy backend with proper environment variables
4. **Frontend**: Deploy frontend build to CDN/hosting
5. **Verification**: Run post-deployment tests
6. **Monitoring**: Check logs and metrics

---

## Troubleshooting

### Emergency Procedures

#### **Real-time Messages Down**
1. **Immediate**: Check Socket.IO server status
2. **Quick Fix**: Restart Socket.IO server
3. **Fallback**: Users can refresh page to reinitialize
4. **Investigation**: Check server logs for errors

#### **Database Connection Issues**
1. **Check**: Supabase dashboard for service status
2. **Verify**: RLS policies are not blocking requests  
3. **Fallback**: Display error message with retry option
4. **Contact**: Supabase support if widespread issue

#### **Message Delivery Failures**
1. **Check**: Twilio console for webhook delivery status
2. **Verify**: Phone numbers are properly formatted
3. **Test**: Send test message via Twilio console
4. **Escalate**: Check with Twilio support for carrier issues

### Support Contacts
- **Primary Developer**: Development Team Lead
- **Backend Issues**: Backend Engineering Team
- **Database Issues**: Database Administrator
- **External Services**: Service-specific support (Twilio, Trigger.dev)

---

## Development Workflow

### New Developer Onboarding

#### **Day 1 Setup**
1. Clone repository and install dependencies
2. Set up local development environment
3. Configure Supabase local development
4. Test basic functionality (send/receive messages)
5. Review this SOP document thoroughly

#### **Week 1 Tasks**
- Implement a small feature (e.g., add new shortcut)
- Fix a minor bug with guidance
- Review code architecture and component structure
- Understand testing procedures and debugging tools

#### **Month 1 Goals**
- Independently implement medium-sized features
- Understand all major system components
- Contribute to documentation improvements
- Mentor newer team members

### Code Review Standards

#### **Required Checks**
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] Memory leaks prevented (cleanup functions)
- [ ] Tests pass and coverage maintained
- [ ] Documentation updated if needed

#### **Architecture Review**
- [ ] Component follows single responsibility principle
- [ ] Proper separation of concerns
- [ ] Reusable components extracted where appropriate
- [ ] Performance considerations addressed
- [ ] Security best practices followed

### Git Workflow
```bash
# Feature development
git checkout -b feature/your-feature-name
# ... develop feature
git add .
git commit -m "feat: descriptive commit message

- Bullet point changes
- Another change
- Any lessons learned"

# Push and create PR
git push origin feature/your-feature-name
# Create pull request for review
```

### Post-merge Requirements
```bash
# After merging to main
git checkout main
git pull origin main
node tools/post-push-changelog.js  # Required!
```

---

## Version History

- **v2.0** (January 2025) - Major refactoring with component extraction
- **v1.x** - Legacy monolithic LiveChat2.js component
- **v0.x** - Initial development and prototyping

---

## Contributing

### Documentation Updates
- Update this SOP when adding new features
- Include testing procedures for all new functionality  
- Document any architectural changes
- Maintain debugging guides and troubleshooting steps

### Code Contributions
- Follow established patterns and conventions
- Include comprehensive tests for new features
- Update component documentation
- Ensure memory-safe implementations

---

**Last Updated**: January 2025  
**Next Review**: Quarterly or when major features added  
**Maintainer**: Development Team Lead