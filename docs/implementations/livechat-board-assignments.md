# LiveChat Board Assignments Implementation Plan

## Overview

The LiveChat Board Assignments system is designed to implement role-based access control for the LiveChat Board feature. This system will restrict access to specific LiveChat boards based on user roles and explicit assignments, ensuring that agents can only view and interact with boards they have been specifically assigned to, while administrators maintain full access to all boards within a workspace.

This implementation follows the same pattern as the existing board permissions system but is specifically tailored for the LiveChat boards. It will ensure proper data isolation between workspaces, maintain scalability, and provide a clean user interface that reflects these permissions.

## Core Functionality

- Restrict agent access to only assigned LiveChat boards
- Allow administrators to manage board assignments for agents
- Maintain proper workspace isolation for multi-tenant security
- Provide real-time updates when assignments change
- Ensure efficient database queries with proper indexing
- Support audit logging for assignment changes

## Files Involved

### New Files to Create

1. **`livechat_board_assignments_implementation.md`** - This documentation file
2. **`LivechatBoardSettings.js`** - Component for managing LiveChat board assignments
3. **`LivechatBoardAssignmentModal.js`** - Modal for bulk assigning users to boards

### Existing Files to Modify

1. **`useBoardData.js`** - Update to filter boards based on user role and assignments
2. **`BoardView.js`** - Update to include assignment management UI
3. **`BoardOptions.js`** - Add option for managing board assignments

## File Structure (Tree Diagram)

```
/components/livechat2/boardView/
├── AddContactToColumnModal.js      # Modal for adding contacts to columns
├── AddToBoardModal.js              # Modal for adding contacts to board
├── AvatarSelector.js               # Component for selecting user avatars
├── BoardAnalytics.js               # Analytics for board performance
├── BoardColumn.js                  # Individual column in the board view
├── BoardConfetti.js                # Visual effects for celebrations
├── BoardCursors.js                 # Cursor tracking for collaboration
├── BoardCustomization.js           # Board appearance customization
├── BoardOptions.js                 # Board settings and options menu (to modify)
├── BoardPresence.js                # User presence indicators
├── BoardReplyingStatus.js          # Shows who is replying to messages
├── BoardSidebar.js                 # Sidebar navigation for boards
├── BoardTopBar.js                  # Top navigation bar for boards
├── BoardView.js                    # Main board view component (to modify)
├── DarkModeToggle.js               # Toggle for dark/light mode
├── LeadCard.js                     # Card component for leads/contacts
├── LivechatBoardAssignmentModal.js # NEW: Modal for bulk assignments
├── LivechatBoardSettings.js        # NEW: Component for managing assignments
├── useBoardData.js                 # Custom hook for board data (to modify)
├── usePresence.js                  # Hook for user presence tracking
└── livechat_board_assignments_implementation.md # This documentation file
```

## Database Tables

### New Table: `livechat_board_assignments`

```sql
CREATE TABLE livechat_board_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id),
    livechat_board_id UUID NOT NULL REFERENCES livechat_board(id),
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    UNIQUE(workspace_id, livechat_board_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_livechat_board_assignments_user 
ON livechat_board_assignments(user_id, workspace_id);

CREATE INDEX idx_livechat_board_assignments_board
ON livechat_board_assignments(livechat_board_id, workspace_id);
```

**Purpose**: This table tracks which users (agents) are assigned to which LiveChat boards. It serves as the core of the permissions system, allowing the application to filter which boards an agent can access.

### New View: `livechat_board_assignments_with_details`

```sql
CREATE VIEW livechat_board_assignments_with_details AS
SELECT 
  a.id,
  a.workspace_id,
  a.livechat_board_id,
  a.user_id,
  a.created_at,
  u.full_name,
  u.avatar_url,
  w.name as workspace_name,
  b.name as board_name
FROM 
  livechat_board_assignments a
  JOIN user_profiles u ON a.user_id = u.id
  JOIN workspaces w ON a.workspace_id = w.id
  JOIN livechat_board b ON a.livechat_board_id = b.id;
```

**Purpose**: This view joins assignment data with user and board details for easier querying and display in the UI.

### Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE livechat_board_assignments ENABLE ROW LEVEL SECURITY;

-- Policy for reading assignments
CREATE POLICY "Users can view livechat board assignments in their workspace" 
ON livechat_board_assignments
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy for creating/updating assignments (admin only)
CREATE POLICY "Admins can manage livechat board assignments" 
ON livechat_board_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE user_id = auth.uid() 
    AND workspace_id = livechat_board_assignments.workspace_id
    AND role = 'admin'
  )
);
```

**Purpose**: These policies ensure proper data isolation and access control at the database level, following the principle of defense in depth.

## User Flow

### Administrator Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Admin      │────▶│  LiveChat   │────▶│  Board      │────▶│  Manage     │
│  Login      │     │  Board View │     │  Options    │     │  Team Access │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                                        │
                          │                                        │
                          ▼                                        ▼
                    ┌─────────────┐                         ┌─────────────┐
                    │             │                         │             │
                    │  View All   │                         │  Select     │
                    │  Boards     │                         │  Agents     │
                    │             │                         │             │
                    └─────────────┘                         └─────────────┘
                                                                  │
                                                                  │
                                                                  ▼
                                                           ┌─────────────┐
                                                           │             │
                                                           │  Save       │
                                                           │  Assignments│
                                                           │             │
                                                           └─────────────┘
```

1. Admin logs into the application
2. Admin navigates to the LiveChat Board view
3. Admin can see all LiveChat boards in the workspace
4. Admin clicks on "Board Options" for a specific board
5. Admin selects "Manage Team Access" from the options
6. Admin is presented with a list of all workspace members
7. Admin selects which agents should have access to this board
8. Admin clicks "Save Assignments" to update the permissions
9. System records the changes and updates the UI in real-time

### Agent Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Agent      │────▶│  LiveChat   │────▶│  View Only  │
│  Login      │     │  Board View │     │  Assigned   │
│             │     │             │     │  Boards     │
└───────┬───────┘     └───────┬───────┘     └─────────────┘
        │                         │                    │
        │                         │                    │
        ▼                         ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  No Boards  │     │  Interact   │     │  Interact   │
│  Message if │     │  With       │     │  With       │
│  None       │     │  Board      │     │  Board      │
│  Assigned   │     │  Content    │     │  Content    │
└─────────────┘     └─────────────┘     └─────────────┘
```

1. Agent logs into the application
2. Agent navigates to the LiveChat Board view
3. Agent only sees boards they have been assigned to
4. If an agent has no assigned boards, they see a message indicating they need to be assigned to boards
5. Agent can interact normally with the boards they have access to
6. Agent cannot see or access the "Manage Team Access" option

## Frontend and Backend Flow

### Frontend Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Frontend Flow                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Auth &     │────▶│  Board      │────▶│  UI         │────▶│  Assignment │
│  Context    │     │  Loading    │     │  Rendering  │     │  Management │
│  Loading    │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │                   │
       ▼                  ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Get User    │     │ Admin: All  │     │ Conditional │     │ Load        │
│ Profile &   │     │ Boards      │     │ Rendering   │     │ Members &   │
│ Role        │     │ Agent: Only │     │ Based on    │     │ Current     │
│             │     │ Assigned    │     │ User Role   │     │ Assignments │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

1. **Authentication & Context Loading**:
   - User logs in and receives authentication token
   - Application loads workspace context and user profile
   - User role is determined from `user_profiles_with_workspace` view

2. **Board Loading**:
   - `useBoardData` hook fetches boards based on user role
   - For admins: All boards in the workspace are loaded
   - For agents: Only boards they're assigned to are loaded

3. **UI Rendering**:
   - BoardView renders available boards
   - Admin UI includes board assignment management options
   - Agent UI hides management options

4. **Assignment Management**:
   - Admin opens LivechatBoardSettings component
   - Component loads workspace members and current assignments
   - Admin makes changes and saves
   - UI updates to reflect changes

### Backend Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Backend Flow                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Data       │────▶│  Real-time  │────▶│  Assignment │────▶│  Error      │
│  Fetching   │     │  Updates    │     │  Operations │     │  Handling   │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                  │                   │                   │
       ▼                  ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Supabase    │     │ Subscribe   │     │ Create/     │     │ Graceful    │
│ Queries     │     │ to Board &  │     │ Update/     │     │ Error       │
│ with RLS    │     │ Assignment  │     │ Delete      │     │ Handling    │
│ Protection  │     │ Changes     │     │ Operations  │     │ & Feedback  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │ Audit       │
                                        │ Logging     │
                                        │             │
                                        └─────────────┘
```

1. **Data Fetching**:
   - Supabase client queries `livechat_board` table with appropriate filters
   - For agents, joins with `livechat_board_assignments` to filter boards
   - RLS policies ensure proper data isolation

2. **Real-time Updates**:
   - Supabase subscriptions listen for changes to boards and assignments
   - When changes occur, the UI updates automatically

3. **Assignment Operations**:
   - Create/update/delete operations on `livechat_board_assignments` table
   - Batch operations for efficiency when updating multiple assignments
   - Audit logging for tracking changes

4. **Error Handling**:
   - Graceful handling of database errors
   - User-friendly error messages
   - Fallback mechanisms for edge cases

## Data Flow Diagram

```
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│               │         │               │         │               │
│  User         │         │  Frontend     │         │  Database     │
│  Interface    │◄────────┤  Logic        │◄────────┤  Layer        │
│               │         │               │         │               │
└───────┬───────┘         └───────┬───────┘         └───────┬───────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ Admin View:   │         │ useBoardData  │         │ Tables:       │
│ - All boards  │         │ - Fetch based │         │ - livechat_   │
│ - Assignment  │         │   on role     │         │   board       │
│   management  │         │ - Filter for  │         │ - livechat_   │
│               │         │   agents      │         │   board_      │
└───────────────┘         └───────────────┘         │   assignments │
                                                    │ - user_       │
┌───────────────┐         ┌───────────────┐         │   profiles_   │
│ Agent View:   │         │ Real-time     │         │   with_       │
│ - Only        │         │ Subscriptions:│         │   workspace   │
│   assigned    │         │ - Board       │         │               │
│   boards      │         │   changes     │         │ RLS Policies: │
│ - No mgmt     │         │ - Assignment  │         │ - Workspace   │
│   options     │         │   changes     │         │   isolation   │
└───────────────┘         └───────────────┘         └───────────────┘
```

## User Stories

1. **As an administrator**, I want to assign specific agents to specific LiveChat boards so that they only see relevant conversations.
   
2. **As an administrator**, I want to see which agents are assigned to each LiveChat board so that I can manage workload distribution effectively.

3. **As an administrator**, I want to bulk assign multiple agents to multiple boards at once to save time during team reorganizations.

4. **As an administrator**, I want to receive confirmation when board assignments are updated so that I know the changes were successful.

5. **As an agent**, I want to only see the LiveChat boards I'm assigned to so that my interface is clean and focused on my responsibilities.

6. **As an agent**, I want to see a helpful message if I haven't been assigned to any boards yet so that I understand why I don't see any boards.

7. **As an agent**, I want to receive real-time updates when I'm assigned to a new board so that I can start working on it immediately.

8. **As a new user**, I want the system to handle my lack of assignments gracefully so that I'm not confused by empty screens.

9. **As a team lead**, I want to see which agents are currently online and assigned to each board so that I can ensure proper coverage.

10. **As a system administrator**, I want the board assignment system to be secure and respect workspace boundaries so that data isolation is maintained.

## Implementation Stages

### Stage 1: Database Setup (Week 1) ✅ COMPLETED

1. ✅ Created the `livechat_board_assignments` table with proper foreign key references
   - Used TEXT type for livechat_board_id to match existing schema
   - Added workspace_id and user_id fields with appropriate data types
   - Added created_at, updated_at, and created_by audit fields

2. ✅ Set up indexes for performance optimization
   - Created index on (user_id, workspace_id) for user-based queries
   - Created index on (livechat_board_id, workspace_id) for board-based queries

3. ✅ Implemented Row Level Security policies
   - Enabled RLS on the table
   - Created policy for viewing assignments within user's workspace
   - Created policy for managing assignments (admin only)

4. ✅ Created the `livechat_board_assignments_with_details` view
   - Joined assignment data with user and board details
   - Included user names and avatars for UI display

5. ✅ Tested database queries and security
   - Verified table creation and indexes
   - Confirmed RLS policies are working as expected

### Stage 2: Core Frontend Components (Week 2) ✅ COMPLETED

1. ✅ Modified `useBoardData.js` to filter boards based on role and assignments
   - Added user role check from user_profiles_with_workspace
   - Implemented conditional filtering based on admin status
   - Added queries to fetch board assignments for non-admin users
   - Added error handling and logging

2. ✅ Created `LivechatBoardSettings.js` component
   - Implemented UI for viewing and managing board assignments
   - Added functionality to select/deselect team members
   - Implemented search functionality for filtering members
   - Added optimized save logic that only updates changed assignments
   - Implemented activity logging for audit purposes

3. ✅ Created `LivechatBoardAssignmentModal.js` component
   - Implemented modal wrapper for the settings component
   - Added proper header and layout

4. ✅ Updated `BoardOptions.js` to include assignment management option
   - Added "Manage Team Access" button to board options menu
   - Integrated with LivechatBoardAssignmentModal
   - Used Lucide React icons for consistent UI

### Stage 3: Advanced Features (Week 3) ⏳ IN PROGRESS

1. ✅ Hide Board Options for non-admin users
   - Updated `BoardTopBar.js` to fetch user role from user_profiles_with_workspace
   - Added conditional rendering to only show BoardOptions for admin users
   - Implemented proper state management for user role and admin status
   - Added error handling for role fetching

2. Implement real-time subscription for assignment changes
3. Add audit logging for assignment operations
4. Implement caching strategies for performance

### Stage 4: Testing and Refinement (Week 4)

1. Comprehensive testing across different roles and scenarios
2. Performance optimization for large workspaces
3. UI/UX refinements based on feedback
4. Documentation updates

## Roadmap

### Phase 1: MVP (Months 1-2)

- Basic board assignment functionality
- Role-based access control
- Simple UI for managing assignments
- Essential security features

### Phase 2: Enhanced Features (Months 3-4)

- Bulk assignment operations
- Advanced filtering and search in assignment UI
- Performance optimizations for large workspaces
- Improved audit logging

### Phase 3: Advanced Integration (Months 5-6)

- Integration with notification system for assignment changes
- Analytics for board usage by assigned agents
- API endpoints for programmatic assignment management
- Advanced permission models (read-only, full access, etc.)

### Phase 4: Enterprise Features (Months 7-12)

- Hierarchical assignment models (team leads can manage assignments)
- Scheduled assignments (time-based access)
- Integration with external identity providers
- Advanced compliance and audit features

## Conclusion

This implementation plan provides a comprehensive approach to adding role-based access control to the LiveChat Board feature. By following the existing patterns used in the board permissions system but adapting them specifically for LiveChat boards, we ensure consistency in the codebase while addressing the unique requirements of the LiveChat feature.

The plan prioritizes security, scalability, and user experience, ensuring that both administrators and agents have a clean, intuitive interface that reflects their permissions. The staged implementation approach allows for incremental development and testing, reducing risk and allowing for adjustments based on feedback.
