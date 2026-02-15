# Project Architecture & Context Summary
Generated on: 2025-11-19

## Project Overview
**Customer Connect Command Center** is a comprehensive CRM and communication platform designed for real-time engagement. It integrates messaging, voice calling, automation, and deal management into a unified interface.

## Technology Stack
- **Frontend:** React 19, Chakra UI, Zustand, React Router 7
- **Backend:** Node.js (Express), Socket.IO, Supabase Client
- **Database:** Supabase (PostgreSQL) with Realtime subscriptions
- **Infrastructure:** Railway (App hosting), Cloudflare Workers (Webchat), Trigger.dev (Background jobs)
- **External Services:**
  - **Twilio:** Voice & SMS
  - **SendGrid:** Email
  - **VAPI:** Voice AI Assistants
  - **Stripe:** Payments

## Key Architecture Components

### 1. Real-time Event System
The application utilizes a hybrid real-time architecture:
- **Supabase Realtime:** Listens for database changes (CRUD on contacts, messages).
- **Socket.IO:** Handles ephemeral, high-frequency events (typing indicators, presence, call signaling).
- **Developer Console:** A dedicated tool for monitoring these events in real-time.

### 2. CallManager (Voice System)
- **Role:** Manages WebRTC voice calls via Twilio Voice SDK.
- **Architecture:** Singleton pattern implemented in `MainContent.js`.
- **Optimization:** Uses `React.memo` and lazy initialization to prevent performance bottlenecks (recently fixed).

### 3. Workspace Isolation
- **Data Scoping:** All data is strictly scoped by `workspace_id`.
- **Board Isolation:** Webhooks and other resources are further scoped to specific "Boards" to prevent data leakage between teams/departments.

### 4. Automation & Workflows
- **Flow Builder:** A visual tool for creating automated communication flows.
- **Trigger.dev:** Handles background job processing and complex workflow execution.

## Recent Developments (as of Nov 2025)
- **Performance:** Major refactor of `CallManager` to reduce re-renders and memory usage.
- **Security:** Implementation of Board-Scoped Webhook Isolation.
- **Features:**
  - Outgoing Call functionality.
  - Webchat Widget Management.
  - Developer Console for event monitoring.
  - Swagger/OpenAPI documentation setup.

## Key Directories
- `frontend/src/components/livechat2`: Core messaging interface.
- `frontend/src/components/board`: Kanban/Board views.
- `frontend/src/services`: Frontend API wrappers.
- `backend/src/routes`: API route definitions.
- `backend/src/io.js`: Socket.IO logic.
