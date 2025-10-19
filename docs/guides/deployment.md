# Frontend Deployment Guide

## Project Overview
This is the frontend part of our LiveChat application, built with React and Chakra UI. It provides a modern, responsive interface for real-time messaging and contact management.

## Deployment Steps

### 1. GitHub Setup
1. Create a new repository on GitHub
2. Initialize local git repository
3. Add all files and make initial commit
4. Push to GitHub

### 2. Railway Setup
1. Create a new service in Railway project
2. Connect GitHub repository to Railway
3. Configure environment variables:
   - `REACT_APP_API_URL`: Backend API URL
   - `REACT_APP_TWILIO_PHONE`: Twilio phone number
4. Enable automatic deployments

### 3. Build Configuration
- Build command: `npm run build`
- Start command: `npx serve -s build`
- Node version: >=18.0.0
- NPM version: >=9.0.0

### 4. Post-Deployment Verification
1. Check if the frontend can connect to the backend
2. Verify WebSocket connections
3. Test message sending and receiving
4. Verify contact management features
5. Test dark/light mode functionality

## File Structure
```
frontend/
├── src/
│   ├── components/
│   │   └── chat/
│   │       ├── ContactForm.js
│   │       ├── MessageInput.js
│   │       ├── MessageList.js
│   │       ├── UserList.js
│   │       └── types.js
│   ├── App.js
│   ├── index.js
│   ├── socket.js
│   └── theme.js
├── public/
├── package.json
└── .env.production
```
