# LiveChat App

A real-time chat application built with React, Node.js, Socket.IO, and Twilio integration for SMS notifications.

## Project Structure

```
livechat-app/
├── backend/                 # Node.js backend with Socket.IO and Twilio
│   ├── config/             # Configuration files
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Express middleware
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic
│   └── server.js          # Main server file
└── frontend/              # React frontend with Chakra UI
    ├── public/            # Static files
    └── src/               # Source files
        ├── components/    # React components
        │   ├── calendar/  # Calendar related components
        │   ├── contacts/  # Contact management components
        │   ├── dock/      # Dock menu components
        │   ├── livechat/  # LiveChat related components
        │   ├── pipelines/ # Pipeline view components
        │   ├── stats/     # Statistics components
        │   ├── window/    # Window management components
        │   └── windows/   # Various window components
        ├── services/      # State management and API services
        ├── styles/        # Global styles and themes
        ├── utils/         # Utility functions
        └── App.js         # Main application component
```

## Core Components

### App.js (Main Application Component)
The `App.js` file serves as the main component and entry point of the application. It handles:

- Window Management
  - Controls which windows are active/visible
  - Manages window states (open, closed, minimized)
  - Handles window positioning and stacking

- Global State
  - Dark/Light mode toggle
  - Active windows tracking
  - Selected contact management

- Core Features
  - Dock menu integration
  - Window dragging functionality
  - Inter-component communication
  - Theme management

Key functionalities:
```javascript
// Window Management
const [activeWindows, setActiveWindows] = useState([]);  // Tracks open windows
const handleWindowClose = (windowId) => { ... };         // Closes specific windows
const handleDockItemClick = (itemId) => { ... };         // Opens windows from dock

// Theme Management
const { colorMode, toggleColorMode } = useColorMode();   // Handles dark/light mode

// Contact Management
const [selectedContact, setSelectedContact] = useState(null);  // Current contact
```

### Pipeline Management
The application includes a comprehensive pipeline management system:

- Lead Status Pipeline
  - Always visible and cannot be disabled
  - Tracks the progress of leads through the sales funnel

- Appointment Status Pipeline
  - Can be shown/hidden via board configuration
  - Tracks the status of appointments (scheduled, confirmed, etc.)

- Appointment Result Pipeline
  - Can be shown/hidden via board configuration
  - Tracks the outcomes of appointments

- Pipeline Configuration
  - Administrators can control pipeline visibility on a per-board basis
  - Settings are stored in the database and applied to all users viewing the board

## Features

- Real-time messaging using Socket.IO
- SMS notifications via Twilio
- Modern, responsive UI with Chakra UI
- Contact management with search functionality
- Dark/Light mode support
- Message status indicators (sent/delivered)
- Phone number-based user registration
- Message history display with timestamps
- Connection status indicators

## LiveChat Integration

The application includes a standalone LiveChat interface that can be accessed directly:

- **LiveChat URL**: [LiveChat 2.0]({process.env.REACT_APP_FRONTEND_URL}/livechat2.0)
- **Features**:
  - Real-time messaging
  - Modern UI/UX
  - Standalone interface
  - Mobile responsive design
  - Easy integration via iframe

To integrate the LiveChat into your own application, you can use an iframe:

```html
<iframe 
  src="{process.env.REACT_APP_FRONTEND_URL}/livechat2.0"
  width="100%"
  height="600px"
  frameborder="0"
></iframe>
```

### Frontend
- React 18.2.0
- Chakra UI for modern components
- Socket.IO Client 4.7.4
- Axios for HTTP requests

### Backend
- Node.js with Express
- Socket.IO for real-time communication
- Twilio SDK for SMS integration
- CORS enabled for secure cross-origin requests

## Database Schema

### CRM and Messaging System

The application uses a comprehensive CRM schema that integrates contacts, sales pipeline, and messaging:

#### Core Tables

1. **Contacts**
   - Workspace-specific contact management
   - Unique phone numbers per workspace
   - Custom fields and tags support
   - Links to creator and workspace

2. **Pipeline Stages**
   - Customizable sales stages per workspace
   - Default stages (New Lead → Closed Won/Lost)
   - Ordered progression tracking
   - Color coding for visual management

3. **Pipeline Deals**
   - Links contacts to pipeline stages
   - Value and status tracking
   - Team member assignment
   - Expected close date tracking
   - Custom fields for deal-specific data

4. **Conversations**
   - Groups messages by contact
   - Links to deals for context
   - Status tracking
   - Thread management

5. **Messages**
   - Bidirectional message storage
   - Twilio integration
   - Message status tracking
   - Support for different message types
   - Metadata storage

#### Relationships
```
Workspace
  ↳ Contacts (1:many)
  ↳ Pipeline Stages (1:many)
  ↳ Pipeline Deals (1:many)
  ↳ Conversations (1:many)
  ↳ Messages (1:many)

Contact
  ↳ Pipeline Deals (1:many)
  ↳ Conversations (1:many)

Pipeline Stage
  ↳ Pipeline Deals (1:many)

Pipeline Deal
  ↳ Conversations (1:many)

Conversation
  ↳ Messages (1:many)
```

#### Security
- Row Level Security (RLS) on all tables
- Workspace-based isolation
- Role-based access control
- Secure default policies

#### Performance
- Optimized indexes for common queries
- Efficient relationship traversal
- Metadata and custom fields support
- Proper constraint management

## Production Build Configuration

### Environment Setup
The application uses environment-specific configuration files:
- `.env.development` for development builds
- `.env.production` for production builds

### Build Commands
```bash
# Development
npm start             # Start development server with hot reload

# Production
npm run build:prod    # Create optimized production build
npm run serve         # Serve production build locally
```

## Security Considerations

### Twilio Integration
The application uses Twilio for SMS messaging with the following security measures:

1. Backend-only Authentication:
   - All Twilio credentials are stored securely in backend environment variables
   - No sensitive credentials exposed to frontend
   - Secure configuration endpoint for necessary frontend data

2. Environment Variables:
```bash
# Backend (.env)
TWILIO_ACCOUNT_SID=your_twilio_sid            # Twilio account SID
TWILIO_AUTH_TOKEN=your_twilio_token           # Twilio auth token
TWILIO_PHONE_NUMBER=your_twilio_phone         # Twilio phone number

# Frontend (.env.production)
REACT_APP_API_URL=your_api_url                # Backend API URL
REACT_APP_FRONTEND_URL=your_frontend_url      # Frontend URL
REACT_APP_TWILIO_WEBHOOK=your_webhook_url     # Webhook URL for Twilio
```

3. API Security:
   - All Twilio operations handled by backend
   - Frontend communicates via secure API endpoints
   - Proper error handling and logging
   - Rate limiting on sensitive endpoints

## Getting Started

### Backend Setup
1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
FRONTEND_URL=http://localhost:3000
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE=your_phone
```

4. Start the server:
```bash
npm start
```

### Frontend Setup
1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_TWILIO_PHONE=your_twilio_phone
```

4. Start development server:
```bash
npm start
```

## Deployment

The application is deployed on Railway with automatic deployments from GitHub:

1. Backend: https://livechat-app-production.up.railway.app
2. Frontend: https://livechat-app-frontend.up.railway.app

## Environment Variables

### Frontend Service (.env)
```
# API Configuration
REACT_APP_API_URL=https://cc.automate8.com     # Backend API URL
REACT_APP_TWILIO_PHONE=your_twilio_phone       # Twilio phone number

# Supabase Configuration
REACT_APP_SUPABASE_URL=your_supabase_url       # Supabase project URL
REACT_APP_SUPABASE_ANON_KEY=your_anon_key      # Supabase anonymous key
```

### Backend Service (.env)
```
# Service URLs (Required for CORS and Webhooks)
FRONTEND_URL=https://cc1.automate8.com         # Frontend application URL
BACKEND_URL=https://cc.automate8.com           # Backend service URL

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_sid            # Twilio account SID
TWILIO_AUTH_TOKEN=your_twilio_token           # Twilio auth token
TWILIO_PHONE=your_twilio_phone                # Twilio phone number
```

### Why Two Sets of Variables?

1. **Frontend Variables** (`REACT_APP_*`):
   - Tell the frontend application where to find the backend API
   - Configure frontend-specific services (Twilio, Supabase)
   - Used in React components and services

2. **Backend Variables**:
   - Configure CORS to allow requests from the frontend
   - Set up WebSocket connection permissions
   - Construct webhook URLs for external services
   - Manage Twilio integration

### Development vs Production

#### Development
```
# Frontend
REACT_APP_API_URL=http://localhost:3001

# Backend
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
```

#### Production
```
# Frontend
REACT_APP_API_URL=https://cc.automate8.com

# Backend
FRONTEND_URL=https://cc1.automate8.com
BACKEND_URL=https://cc.automate8.com
```

## Phone Number Management
The application includes a robust phone number management system that:

- **Board-Specific Numbers**: Each board can be assigned a unique Twilio phone number
- **Number Assignment Protection**: Prevents duplicate phone number assignments across boards
- **Dynamic Number Selection**: Fetches available Twilio numbers from workspace configuration
- **Visual Status Indicators**: Clear UI showing number availability and current assignments
- **Error Prevention**: Built-in validation to prevent conflicting number assignments

### Board Configuration
The board configuration system allows:

- Selection of dedicated Twilio numbers for board communications
- Visual management of phone number assignments
- Clear status indicators for number availability
- Automatic validation to prevent conflicts
- Easy reassignment of numbers between boards

## Domain Configuration and Message Flow

### Architecture Overview
The application uses a split domain architecture:
- Frontend (UI): `https://cc1.automate8.com`
- Backend (API): `https://cc.automate8.com`

### Message Flow
1. **Inbound Messages (SMS → User)**
   - SMS arrives at Twilio
   - Twilio webhooks to `https://cc.automate8.com/twilio`
   - Backend processes message and emits via Socket.IO
   - Frontend receives and displays message

2. **Outbound Messages (User → SMS)**
   - User sends message from frontend
   - Frontend makes API call to `https://cc.automate8.com/send-sms`
   - Backend processes request and sends via Twilio
   - Twilio delivers SMS to recipient

### Why Split Domains?
1. **Security**: Separates client-side code from server operations
2. **Scalability**: Can scale frontend and backend independently
3. **Maintenance**: Easier to update/maintain each service separately
4. **Performance**: CDN optimization for frontend assets

## Troubleshooting Common Issues

### Message Delivery Issues

1. **Inbound Messages Not Showing**
   - Check Twilio webhook configuration
   - Verify backend URL in Twilio dashboard
   - Check Socket.IO connection status
   - Review backend logs for webhook receipt

2. **Outbound Messages Failing**
   - Verify API URL configuration
   - Check Twilio credentials
   - Ensure phone numbers are in E.164 format
   - Review network requests in browser console

3. **"Twilio not configured" Error**
   - Check environment variables
   - Verify API endpoints in frontend config
   - Ensure backend can access Twilio credentials
   - Check for CORS issues in browser console

### Environment Configuration

1. **Development Setup**
   ```bash
   # Frontend (.env.development)
   REACT_APP_API_URL=http://localhost:3001
   
   # Backend (.env)
   FRONTEND_URL=http://localhost:3000
   ```

2. **Production Setup**
   ```bash
   # Frontend (.env.production)
   REACT_APP_API_URL=https://cc.automate8.com
   
   # Backend (.env)
   FRONTEND_URL=https://cc1.automate8.com
   ```

### Quick Fixes for Common Issues

1. **Socket Connection Issues**
   - Check browser console for connection errors
   - Verify WebSocket endpoint configuration
   - Check for firewall/proxy blocking WebSocket
   - Review CORS configuration

2. **Message Synchronization**
   - Clear browser cache and reload
   - Check message store initialization
   - Verify Socket.IO event handlers
   - Review message deduplication logic

3. **UI/State Issues**
   - Check React component lifecycle
   - Review state management flow
   - Verify prop passing between components
   - Check for race conditions in async operations

## Core Files and Their Roles

### Message Handling and Real-time Communication

#### messageService.js
The central service for managing all message-related functionality:
- Handles message sending, receiving, and storage
- Implements message deduplication logic
- Manages message queue processing
- Maintains message store for each contact
- Handles phone number formatting for Twilio
- Critical for the entire messaging system

#### socket.js
Core WebSocket configuration and management:
- Establishes and maintains Socket.IO connection
- Handles connection lifecycle (connect, disconnect, reconnect)
- Manages real-time event handling
- Provides debugging and error logging
- Essential for real-time message delivery

#### twilio.js
**Note: This file is currently not in use.** It was an alternative implementation for Twilio integration, but we're using the message handling in messageService.js instead. Can be removed to avoid confusion.

### Server and Application Core

#### server.js
Express server configuration for the frontend:
- Serves the built React application
- Handles route forwarding for SPA
- Manages static file serving
- Basic server configuration for production deployment

#### App.js
Main application component (currently in use):
- Manages application routing
- Handles authentication state
- Controls window/component rendering
- Manages global application state
- Implements the dock-based UI system

#### App.jsx
**Note: Not currently in use.** This was an alternative implementation with Supabase authentication. We're using App.js instead as it better fits our dock-based UI system and current authentication needs.

### Key Dependencies and Interactions
```
messageService.js ←→ socket.js
         ↓
      App.js
         ↓
    Components
```

- messageService.js relies on socket.js for real-time communication
- App.js uses messageService.js for message handling
- server.js serves the built application
- Components use messageService.js for sending/receiving messages

### Critical Notes
1. messageService.js and socket.js are critical services - modifications require thorough testing
2. server.js is essential for production deployment
3. App.js is the main application entry point
4. twilio.js and App.jsx can be removed in future cleanup
5. All message handling should go through messageService.js for consistency

## UI System and Navigation

### Dock-based Interface
The application uses a macOS-style dock system for navigation and window management:

#### Components
1. **Dock (`components/dock/Dock.js`)**
   - Main navigation component fixed at bottom
   - Animated icon buttons for different sections
   - Handles section switching and active states
   - Implements blur effects and animations

2. **DockWindow (`components/dock/DockWindow.js`)**
   - Manages individual application windows
   - Draggable window system
   - Window controls (minimize, maximize, close)
   - Responsive bounds and positioning

### Window Management
- Multiple windows can be open simultaneously
- Windows are draggable within viewport bounds
- macOS-style window controls and animations
- Custom scrollbars and modern UI effects

### Navigation Flow
```
Dock (Bottom Bar)
   ↓
DockWindow (Opens on icon click)
   ↓
Section Content (LiveChat, Contacts, etc.)
```

### Key UI Features
1. Desktop-like experience in browser
2. Smooth animations and transitions
3. Light/Dark mode support
4. Blur effects for modern feel
5. Responsive window management

## Window Management System

### Overview
The application implements a macOS-style window management system with the following features:

1. **Independent Window States**
   - Each window maintains its own state
   - Search and filter states are preserved
   - Window positions are remembered
   - No interference between windows

2. **Window Context System**
   ```javascript
   const WindowContext = createContext();
   const WindowProvider = ({ children }) => {
     const [windowStates, setWindowStates] = useState(new Map());
     // ... state management logic
   };
   ```

3. **Window Features**
   - Draggable windows with bounds
   - Consistent positioning
   - State preservation
   - Independent search functionality
   - Proper z-index management

### Usage
Windows can be managed using the WindowContext:
```javascript
const { windowState, updateWindowState } = useWindowState('windowId');

// Update window state
updateWindowState({
  searchQuery: 'new query',
  position: { x: 50, y: 50 }
});
```

### Best Practices
1. Always use WindowContext for window-specific state
2. Maintain independent states for each window
3. Use proper cleanup when windows close
4. Implement consistent positioning
5. Use memoization for performance

### Implementation Details
1. **Window Positioning**
   - Initial position: `{ x: 50, y: 50 }`
   - Bounded by viewport
   - Draggable with handle

2. **State Management**
   - Window-specific search state
   - Position preservation
   - Filter state management
   - Independent scroll positions

3. **Performance Optimizations**
   - Memoized filtering
   - Efficient state updates
   - Proper cleanup
   - Event debouncing

### Recent Improvements
1. Fixed window positioning consistency
2. Enhanced search functionality
3. Improved state isolation
4. Better performance with memoization
5. Added proper window bounds

# Webhook Implementation

This repository contains the implementation of a webhook system for handling incoming data from external sources and mapping it to contacts in our CRM system.

## Features

- **Webhook Configuration**: Create and manage webhooks with custom field mappings
- **Field Mapping**: Map fields from incoming JSON payloads to contact fields
- **Custom Fields**: Support for custom fields stored in contact metadata
- **Webhook Logs**: Track webhook execution with detailed logs
- **Simulation Tool**: Test webhook configurations without creating actual contacts

## Architecture

```
+------------------+    +-----------------+    +------------------+
|   External       |    |   Webhook       |    |   Database       |
|   Application    +--->+   Endpoint      +--->+   (Supabase)     |
+------------------+    +-----------------+    +------------------+
        |                       |                      ^
        |                       |                      |
        v                       v                      |
+------------------+    +-----------------+    +------------------+
|   Sample JSON    |    |   Field         |    |   Contact        |
|   Payload        |    |   Mapping       |    |   Creation       |
+------------------+    +-----------------+    +------------------+
```

## Deployment

This project is deployed on Railway. Any push to the main branch will trigger a new deployment.

### Environment Variables

The following environment variables need to be set in Railway:

- `SUPABASE_URL`: The URL of your Supabase instance
- `SUPABASE_SERVICE_KEY`: The service key for your Supabase instance
- `API_URL`: The base URL of your API

## Testing

See [webhook_testing.md](webhook_testing.md) for detailed instructions on how to test the webhook implementation.

## Documentation

- [webhook_implementation.md](frontend/src/components/webhook/webhook_implementation.md): Detailed implementation plan
- [lesson_learn.md](lesson_learn.md): Best practices and lessons learned
- [progress.md](progress.md): Implementation progress tracking

## Next Steps

- Implement rate limiting for webhook endpoints
- Add webhook templates for common services
- Implement webhook analytics dashboard
- Add batch testing capabilities
- Support for webhook authentication methods (Basic Auth, API Keys)
- Implement retry mechanism for failed webhook calls

## Development Workflow

### Git Hooks and Changelog Process

We use Git hooks to automate our changelog process and ensure consistent commit message formatting. To set up the Git hooks, run:

```bash
# From the project root
./scripts/setup-git-hooks.sh
```

This will set up:

1. **Pre-push Hook**: Validates commit message format before pushing to main
2. **Post-commit Hook**: Automatically runs the changelog script after committing to main
3. **Commit Message Template**: Provides a template for properly formatted commit messages

#### Commit Message Format

All commits to the main branch must follow this format:

```
Title of Change

Key details and bullet points:
- Point 1
- Point 2
- Point 3

Lessons Learned:
- Lesson 1
- Lesson 2
- Lesson 3
```

#### Git Alias

The setup script also creates a Git alias `pushlog` that combines pushing and running the changelog script:

```bash
# Push to main and run changelog script
git pushlog origin main
```

This ensures that the changelog is always updated after pushing to main.
