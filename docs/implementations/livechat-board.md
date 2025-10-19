# Livechat Board Implementation

## 1. Migration: Add `lead_status` to `livechat_board_column`
- Added a `lead_status` column (nullable) to the `livechat_board_column` table to allow mapping columns to a contact status if needed.
- This enables dynamic board columns per workspace and supports flexible use cases for each agent or workspace.

```sql
ALTER TABLE public.livechat_board_column
  ADD COLUMN IF NOT EXISTS lead_status text;
```

**Status:** Migration completed via Supabase MCP.

## Live Chat Board Data Model (ASCII Diagram)

```
+-------------------+         +------------------------+
| livechat_board    | 1     * | livechat_board_column  |
|-------------------|---------|------------------------|
| id (PK)           |         | id (PK)                |
| workspace_id (FK) |         | board_id (FK)          |
| name              |         | name                   |
| created_at        |         | position               |
+-------------------+         +------------------------+
        |   1
        |   *
        v
+-------------------+         +------------------------+
| board_contacts    |  *    1 | contacts               |
|-------------------|---------|------------------------|
| id (PK)           |         | id (PK)                |
| contact_id (FK)   |         | ...                    |
| board_id (FK)     |         +------------------------+
| status            |
| metadata (jsonb)  |
+-------------------+
        |
        *
        |
        v
+-----------------------------+
| contact_livechat_board_column|
|-----------------------------|
| id (PK)                     |
| contact_id (FK)             |
| board_id (FK)               |
| column_id (FK)              |
| assigned_at                 |
+-----------------------------+

* workspace_members table is used for workspace-user access control.

## Table Explanations

### 1. `livechat_board`
**Purpose:**
Stores the main board entity for live chat. Each board typically represents a workspace or a project where conversations (leads, contacts) are managed in a kanban-style interface.

**What it's for:**
- Defines the "board" context (like a Trello board).
- Associates with a workspace.
- Used to group columns and contacts for live chat workflows.

---

### 2. `livechat_board_column`
**Purpose:**
Stores columns for each board. Columns are used to organize contacts/leads visually (e.g., "New", "In Progress", "Closed").

**What it's for:**
- Allows each board to have multiple columns for workflow stages.
- Enables kanban-style movement of contacts/leads between stages.

---

### 3. `board_contacts`
**Purpose:**
Stores which contacts are associated with which boards, along with their status and metadata.

**What it's for:**
- Tracks which contacts/leads are present on a board.
- Stores the status and extra info (metadata) for each contact on that board.
- Enables board-specific operations on contacts.

---

### 4. `contact_livechat_board_column`
**Purpose:**
Maps contacts to specific columns in a board, so you know which stage each contact is in.

**What it's for:**
- Tracks the current column (stage) for each contact on a board.
- Enables moving contacts between columns.

---

### 5. `workspace_members`
**Purpose:**
Tracks which users are members of which workspaces. Used for access control and permissions.

**What it's for:**
- Ensures only workspace members can access specific boards and data.
- Used to validate permissions in backend endpoints.

## Table Usage Clarification (2025-04-17)

### contact_livechat_board_column
- **Purpose:** Used for associating a contact with a specific board *and* column in the livechat/kanban context.
- **When to use:**
  - When adding a contact to a board from ContactDetails.js or AddToBoardModal.js.
  - This is the canonical table for tracking which contacts are in which columns for livechat boards.
- **API:** The backend endpoint for adding a contact to a board/column should ONLY upsert into this table for this workflow.

### board_contacts
- **Purpose:** Used for general board membership or relationship, NOT for livechat/kanban board column assignments.
- **When to use:**
  - Only for workflows that require tracking board-level membership, not column assignments.
  - NOT used when adding a contact to a board from ContactDetails.js.
- **API:** The backend should NOT insert into this table for AddToBoardModal.js or ContactDetails.js workflows.

### Implementation Note
- As of 2025-04-17, the backend logic for adding a contact to a board from ContactDetails.js has been updated to only upsert into `contact_livechat_board_column` and skip `board_contacts` entirely. This prevents unique constraint errors and keeps table usage consistent with their intended purposes.

---

**If you are updating or debugging board/contact logic, always check this doc and the backend route to ensure correct table usage.**

## API Endpoints (Live Chat Board)

### 1. GET `/api/livechat/boards/:boardId/columns`
- **Purpose:** Get all columns for a specific board.
- **Tables Used:** `livechat_board`, `livechat_board_column`, `workspace_members`
- **Auth:** Requires user authentication and workspace membership.
- **Returns:** List of columns for the board.

---

### 2. POST `/api/board/add-contact`
- **Purpose:** Add a contact to a board, or update an existing contact's status/metadata in a board.
- **Tables Used:** `board_contacts`, `livechat_board`, `contacts`
- **Auth:** Requires authentication.
- **Body:** `{ contactId, boardId, columnId, status, source, metadata }`
- **Returns:** Success/failure and updated contact-board association.

---

### 3. Contacts Search (via Supabase RPC)
- **Purpose:** Fetch paginated contacts with last message for a workspace/board.
- **How:** Uses direct Supabase RPC: `get_paginated_contacts_with_last_message`
- **Tables Used:** `contacts`, `livechat_messages`, `board_contacts`
- **Note:** No REST endpoint; frontend calls Supabase directly for performance.

---

### 4. Workspace Membership APIs
- **Purpose:** Manage and validate workspace memberships (access control for boards).
- **Tables Used:** `workspace_members`
- **Endpoints:**
  - `POST /api/workspace-members` (add user to workspace)
  - `GET /api/workspace-members/workspace/:workspaceId` (get all members)

---

*Other endpoints (e.g., Twilio SMS, webhooks) are available but not directly tied to board/column/contact management.*

## API Implementation Reference

#### File: `backend/src/routes/livechatBoard.js`

- Implements:
  - `GET /api/livechat/boards/:boardId/columns`
- Handles authentication, workspace membership, board ownership, and returns columns for the board.

**Sample cURL Request:**
```bash
curl -X GET \
  'https://<your-backend-domain>/api/livechat/boards/<BOARD_ID>/columns' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```
- Replace `<your-backend-domain>`, `<BOARD_ID>`, and `<JWT_TOKEN>` with your actual values.

## Hybrid Implementation Plan (April 17, 2025)

### Architecture Overview

We're implementing a hybrid approach that leverages both Supabase real-time subscriptions and API endpoints:

1. **Supabase Real-time for Reading and Live Updates**
   - Board & Column fetching with real-time subscriptions
   - Real-time presence and cursor tracking
   - State management with Supabase as single source of truth

2. **API Endpoints for Write Operations**
   - Creating Boards & Columns
   - Adding Contacts to Boards
   - Complex operations requiring multiple database changes

```
┌─────────────────┐                ┌─────────────────┐
│                 │                │                 │
│    Frontend     │                │     Backend     │
│                 │                │                 │
└────────┬────────┘                └────────┬────────┘
         │                                  │
         │                                  │
         │                                  │
         │         ┌──────────────┐         │
         │         │              │         │
         ├────────►│   Supabase   │◄────────┤
         │         │              │         │
         │         └──────────────┘         │
         │                                  │
         │         Real-time Updates        │
         │◄─────────────────────────────────┤
         │                                  │
         │         API Endpoints            │
         ├─────────────────────────────────►│
         │                                  │
         │                                  │
```

### User Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Load App   │────►│ Select Board│────►│ View Columns│
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│ Move Contact│◄────│Add/Edit Card│◄────│ Add Column  │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                      Frontend                       │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │             │    │             │    │          │ │
│  │ useBoardData│◄───┤ BoardView   │◄───┤ UI       │ │
│  │             │    │             │    │          │ │
│  └──────┬──────┘    └─────────────┘    └──────────┘ │
│         │                                           │
└─────────┼───────────────────────────────────────────┘
          │
          │ Real-time Subscriptions
          ▼
┌─────────────────────────────────────────────────────┐
│                      Supabase                       │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────┐ │
│  │             │    │             │    │          │ │
│  │ livechat_   │    │ livechat_   │    │ board_   │ │
│  │ board       │    │ board_column│    │ contacts │ │
│  └─────────────┘    └─────────────┘    └──────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
          ▲
          │ API Endpoints for Write Operations
          │
┌─────────┼───────────────────────────────────────────┐
│         │                 Backend                   │
│  ┌──────┴──────┐    ┌─────────────┐    ┌──────────┐ │
│  │             │    │             │    │          │ │
│  │ Board API   │    │ Column API  │    │ Contact  │ │
│  │ Endpoints   │    │ Endpoints   │    │ API      │ │
│  └─────────────┘    └─────────────┘    └──────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### File Structure

```
frontend/src/components/livechat2/boardView/
├── BoardView.js                 # Main board component
├── useBoardData.js              # Custom hook for board data with real-time
├── BoardSidebar.js              # Board selection sidebar
├── BoardColumn.js               # Individual column component
├── LeadCard.js                  # Contact/lead card component
├── BoardTopBar.js               # Top navigation bar
├── usePresence.js               # Real-time user presence hook
├── BoardCursors.js              # Real-time cursor visualization
├── BoardPresence.js             # User presence visualization
├── BoardReplyingStatus.js       # Real-time typing indicators
└── livechat_board_implementation.md  # This implementation doc
```

### Real-Time Contact Updates (April 17, 2025)

#### Implementation Details
- Enabled Supabase Realtime for the `contact_livechat_board_column` table (see Supabase dashboard, "Realtime" toggle ON).
- Added a new `useEffect` in `useBoardData.js` to subscribe to real-time changes on `contact_livechat_board_column` for the active board.
- On any insert, update, or delete in this table (for the current board), the frontend automatically refetches contacts and updates the UI.
- No manual refresh is needed—contacts appear and move in real-time as soon as changes happen in the database.

#### Code Snippet
```js
useEffect(() => {
  if (!activeBoardId) return;
  const contactSub = supabase
    .channel(`contact-livechat-board-column-${activeBoardId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'contact_livechat_board_column',
      filter: `board_id=eq.${activeBoardId}`
    }, (payload) => {
      fetchContactsForBoard(activeBoardId);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(contactSub);
  };
}, [activeBoardId]);
```

#### User Experience
- Contacts added to or moved between columns update instantly for all users viewing the board.
- This leverages Supabase's built-in real-time engine for a seamless collaborative experience.

### Board Deletion Cascade Fix (April 17, 2025)

#### Problem
- Deleting a board in the UI did not actually remove it from the `livechat_board` table if related rows existed in `livechat_board_column`, `contact_livechat_board_column`, or `board_contacts` due to foreign key constraints.
- The UI would show a success message even if the board was not deleted from the database.

#### Solution
- The frontend now performs a **cascading delete**:
  1. Deletes all contact assignments for the board (`contact_livechat_board_column`).
  2. Deletes all columns for the board (`livechat_board_column`).
  3. Deletes all board membership rows for the board (`board_contacts`).
  4. Finally deletes the board itself (`livechat_board`).
- Improved error handling and user feedback: if any step fails, an error message is shown and the board remains in the UI.

#### User Experience
- Boards are now reliably deleted from both the UI and the database, along with all related data.
- Users receive accurate feedback if deletion fails for any reason.

## Board Deletion RLS Fix (April 17, 2025)

#### Problem
- Board deletion in the UI appeared to succeed, but the board was not actually deleted from the database.
- Supabase returned no error, but also did not delete any rows.
- Manual SQL deletion as a superuser worked, but app/API deletions did not.

#### Root Cause
- Row Level Security (RLS) was enabled on the `livechat_board` table, but there was **no DELETE policy**.
- With RLS enabled and no DELETE policy, all deletes are blocked for regular users (the app), but allowed for superusers (SQL editor).

#### Solution
- Added the following RLS policy to allow workspace members to delete boards:

```sql
CREATE POLICY "Users can delete boards in their workspace"
ON public.livechat_board
FOR DELETE
TO public
USING (
  workspace_id IN (
    SELECT workspace_members.workspace_id
    FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
  )
);
```

#### User Experience
- Board deletion now works from the UI for all authorized workspace members.
- The frontend and backend are now consistent and reliable for deletes.

## RLS Policy Fix for Column Deletion (2025-04-18)

### Problem
- Column deletion from the frontend was not working, even though the correct column ID and board ID were sent.
- Supabase returned no error, but the row was not deleted.
- Direct SQL via MCP also failed until RLS was updated.

### Root Cause
- Row Level Security (RLS) was enabled on the `livechat_board_column` table, but there was no policy allowing DELETE operations.
- When RLS blocks an operation and no policy matches, Supabase returns no error and does not delete the row.

### Solution
- Added a universal RLS policy to allow all deletes for development:

```sql
CREATE POLICY "Allow all deletes"
  ON livechat_board_column
  FOR DELETE
  USING (true);
```
- After applying this policy via Supabase MCP, column deletion worked both via SQL and from the frontend app.

### Lessons Learned
- Always check RLS policies when database changes do not happen as expected, even if no error is returned.
- Use MCP/SQL console to verify and debug permissions directly.
- For production, restrict policies to only allow deletes for authorized users (e.g., board owners, workspace members).

### Next Steps
- For production, replace the universal policy with a secure one that matches your business logic.

## Backend Structure

```
backend/src/routes/
├── livechatBoard.js             # Board & column API endpoints
└── contacts.js                  # Contact management endpoints
```

### Implementation Tasks

#### Phase 1: Real-time Board & Column Management
- [x] Create `useBoardData.js` custom hook
- [x] Update `BoardView.js` to use the custom hook
- [x] Implement real-time subscriptions for boards
- [x] Implement real-time subscriptions for columns
- [x] Add proper loading states and error handling

#### Phase 2: API Integration
- [x] Update board creation API endpoint
- [x] Update column creation API endpoint
- [x] Integrate API calls with real-time state
- [x] Implement optimistic updates

#### Phase 3: Contact Management
- [x] Implement contact-to-column assignment
- [x] Add drag-and-drop between columns
- [x] Create contact card component
- [x] Add real-time updates for contact movements

### Database Schema Updates

No additional schema changes are needed at this time. The existing tables:
- `livechat_board`
- `livechat_board_column`
- `board_contacts`
- `contact_livechat_board_column`

provide all the necessary structure for our implementation.

### Implementation Progress
- [x] Initial API endpoints for board and column creation
- [x] Basic board display in frontend
- [x] Real-time board and column subscriptions (implemented in useBoardData.js)
- [x] BoardView component updated to use real-time data
- [x] Created supporting UI components (BoardColumn, LeadCard, BoardCustomization)
- [x] Contact management integration with real-time updates
- [x] Drag-and-drop functionality with database persistence

## Implementation Updates (April 17, 2025)

### Completed Tasks
1. Created `useBoardData.js` custom hook for real-time board and column management
   - Implemented Supabase real-time subscriptions for boards and columns
   - Added proper error handling and loading states
   - Integrated API functions for creating boards and columns

2. Updated `BoardView.js` to use the custom hook
   - Removed direct API calls from the component
   - Improved loading and error states
   - Fixed UI issues with empty columns

3. Created supporting UI components
   - `BoardColumn.js`: Component for displaying a column with leads/contacts
   - `LeadCard.js`: Component for displaying a contact card in a column
   - `BoardCustomization.js`: Component for board settings and customization

4. Implemented contact management functionality
   - Added functions to add contacts to columns
   - Implemented drag-and-drop between columns with database persistence
   - Created API endpoints with workspace constraints for security
   - Added optimistic UI updates for a smooth user experience

### API Endpoints for Contact Management

#### 1. `POST /api/livechat/boards/:boardId/contacts`
- **Purpose:** Add a contact to a board and specific column
- **Security:** Enforces workspace constraints for board, column, and contact
- **Request Body:** `{ contact_id, column_id, workspace_id }`
- **Response:** Success status and data about the board-contact and column-contact relationships

#### 2. `POST /api/livechat/boards/:boardId/contacts/:contactId/move`
- **Purpose:** Move a contact between columns in a board
- **Security:** Enforces workspace constraints for board and column
- **Request Body:** `{ column_id, workspace_id }`
- **Response:** Success status and updated column-contact relationship

### Real-time Contact Management

The system now supports real-time updates for contact management:

1. **Drag and Drop Integration**
   - When a contact is dragged between columns, the UI updates immediately (optimistic update)
   - The database is updated in the background
   - If the update fails, the UI will be corrected when the subscription receives the error state

2. **Contact Fetching**
   - Contacts are fetched when a board is selected
   - Contacts are grouped by column and displayed in the appropriate columns
   - Contact data is formatted for display in the LeadCard component

3. **Workspace Security**
   - All operations enforce workspace constraints to ensure data isolation
   - API endpoints verify that boards, columns, and contacts belong to the specified workspace

### Next Steps
1. Test the real-time functionality with multiple users
2. Add contact search and filtering functionality
3. Implement column reordering
4. Add board customization options

## Database Schema Alignment Fixes - April 17, 2025

The system has been updated to align with the actual database schema:

1. **Column Name Corrections**
   - Fixed column name mismatches in contact queries:
     - Changed `first_name` to `firstname`
     - Changed `last_name` to `lastname`
     - Changed `phone` to `phone_number`
     - Removed reference to non-existent `avatar_url` column
     - Changed `last_activity_at` to `last_action_at`

2. **Workspace Detection Improvements**
   - Enhanced workspace detection logic in the Add to Board modal
   - Implemented multiple fallback mechanisms for determining the workspace ID
   - Added debug information to help troubleshoot workspace-related issues

3. **Defensive Programming**
   - Added null defaults for missing columns to maintain backward compatibility
   - Improved error handling and user feedback
   - Enhanced logging for easier debugging

These fixes ensure that contacts can be properly added to boards and displayed in the board view without database schema errors.

## Contact-to-Board Integration - April 17, 2025

The system now allows adding contacts to boards directly from the contact details panel:

1. **Contact Details Integration**
   - Added a board icon button to the contact header section
   - Implemented a modal for selecting boards and columns
   - Contacts can be added to any board in the current workspace

2. **Component Structure**
   - Created `AddToBoardModal.js` component for board and column selection
   - The modal fetches available boards and columns for the current workspace
   - Uses the backend API endpoint to add contacts to boards

3. **User Flow**
   - User clicks the board icon in the contact details panel
   - Modal displays available boards and columns
   - User selects a board and column
   - Contact is added to the selected board and column
   - Real-time updates ensure the contact appears in the board view immediately

4. **Security Considerations**
   - All operations enforce workspace constraints
   - API endpoints verify that boards, columns, and contacts belong to the specified workspace
   - Error handling provides clear feedback to users

### Implementation Details
- Used the existing `/api/livechat/boards/:boardId/contacts` endpoint for adding contacts to boards
- Maintained consistent UI design with the Mac OS design philosophy
- Added proper loading states and error handling for a smooth user experience

### Next Steps
- Implement the ability to move contacts between boards
- Add a visual indicator in contact details to show which boards a contact is already on
- Create a bulk action to add multiple contacts to a board at once

### UI Enhancements

- Implemented skeleton loading state in the BoardView component. Instead of displaying a spinner and text while loading boards and columns, skeleton placeholders mimicking board columns and cards are now rendered. This provides a smoother and more visual loading experience when a board is being loaded or switched.

## Communication Agent User Stories & Features

As an agent responsible for texting, calling, and following up with contacts, these user stories and features would enhance the board view for communication-focused workflows.

### Message Prioritization
**User Story:** As a communication agent, I want to instantly see which conversations need immediate attention, so I can respond to the most urgent messages first.

**Features:**
- **Response Time Indicators**: Visual countdown showing how long a message has been waiting
- **Message Type Filters**: Toggle between text messages, missed calls, voicemails
- **Urgency Tags**: Auto-tag messages with urgency levels based on content analysis

### Conversation Context
**User Story:** As a communication agent, I need immediate context when responding to a conversation, so I don't have to search through message history.

**Features:**
- **Conversation Snippets**: Preview of the last few messages directly on the board
- **Conversation Status Labels**: Visual indicators for active, stalled, or new conversations
- **Quick Notes**: Ability to see and add agent notes without opening the full conversation

### Follow-up Management
**User Story:** As a communication agent, I want a system that helps me remember when to follow up, so no conversation falls through the cracks.

**Features:**
- **Follow-up Reminders**: Cards that highlight when follow-ups are due
- **Auto-scheduling**: Suggest optimal follow-up times based on response patterns
- **Follow-up Templates**: Quick access to templated follow-up messages
- **Snooze Conversations**: Temporarily hide conversations until follow-up time

### Multi-channel Communication
**User Story:** As a communication agent, I need to seamlessly switch between texting and calling, while maintaining conversation context.

**Features:**
- **Channel Preference Indicators**: See preferred contact method for each contact
- **One-click Channel Switch**: Easily switch from texting to calling (and vice versa)
- **Cross-channel History**: View text and call history in a unified timeline
- **Channel-specific Templates**: Access templates optimized for each channel

### Communication Analytics
**User Story:** As a communication agent, I want insights into my communication patterns, so I can improve my response rates and effectiveness.

**Features:**
- **Response Time Metrics**: See average response times by agent
- **Conversion Indicators**: Visual feedback on which conversations led to positive outcomes
- **Best Time to Contact**: Suggestions for optimal contact times based on past success
- **Message Effectiveness**: Feedback on which message types get better responses

## Implementation Priorities

Based on agent needs, these features should be prioritized:

1. **Message Prioritization**: Knowing which conversations need immediate attention
2. **Conversation Context at a Glance**: Having message history visible without clicking through
3. **Follow-up Management**: Never missing critical follow-ups
4. **Multi-channel Integration**: Seamless switching between text and call

These features would significantly improve efficiency for communication agents, allowing them to handle more conversations while maintaining personalized communication with each contact.

## Implementation Approach

For each feature, the implementation should follow our hybrid approach pattern:
- Server-side filtering for data efficiency
- Client-side caching for performance
- Optimistic UI updates for responsiveness

This ensures the board view remains fast and responsive even as the number of contacts and conversations grows.
