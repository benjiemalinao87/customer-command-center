# LiveChat Agent Permissions Implementation Document

## 1. Overview

### Purpose & Scope
To implement a robust agent permission system for the livechat application that enables:
- Agent self-assignment to conversations
- Multiple agent collaboration on conversations
- Automatic assignment on outbound messages
- Clear ownership and responsibility tracking

### Stakeholders
- Agents: Customer service representatives handling conversations
- Admins: Workspace managers overseeing agent assignments
- Customers: End users receiving consistent support experience

## 2. What It Does (Capabilities)

### Agent Assignment
- Self-assign to any unassigned conversation
- Join existing conversations as collaborator
- Auto-assign on first outbound message
- Remove self from conversation

### Admin Controls
- View all conversation assignments
- Manually assign/unassign agents
- Set maximum agents per conversation
- View assignment history

### Collaboration Features
- Internal notes between agents
- Assignment change notifications
- Agent presence indicators
- Typing indicators for co-assigned agents

## 3. User Flow

```
                         ┌──────────────────────┐
                         │  Agent Views         │
                         │  Contact             │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Is Assigned?       │
                         │                      │
                         └─────┬──────────┬─────┘
                               │          │
                          No   │          │   Yes
                               │          │
                   ┌───────────▼──┐   ┌──▼──────────────┐
                   │ Show Assign  │   │ Show Current    │
                   │ Button       │   │ Assignees       │
                   └──────┬───────┘   └─────┬───────────┘
                          │                 │
                          │                 │
                ┌─────────▼─────────┐       │
                │  Click Assign     │       │
                │  Button           │       │
                └─────────┬─────────┘       │
                          │                 │
                          ▼                 │
                ┌─────────────────────┐     │
                │  Self-Assignment    │     │
                │  Modal              │     │
                │  - Confirm action   │     │
                └─────────┬───────────┘     │
                          │                 │
                          ▼                 │
                ┌─────────────────────┐     │
                │  Update Assignment  │     │
                │  in Database        │     │
                └─────────────────────┘     │
                                            │
                                            ▼
                                  ┌─────────────────────┐
                                  │  Can Join as        │
                                  │  Collaborator?      │
                                  └──────────┬──────────┘
                                             │
                                             │
                                   ┌─────────▼─────────┐
                                   │  Click Join       │
                                   │  Button           │
                                   └─────────┬─────────┘
                                             │
                                             ▼
                                   ┌─────────────────────┐
                                   │  Add as Additional  │
                                   │  Agent to Contact   │
                                   └─────────────────────┘
```

## 4. Front-end & Back-end Flow

```
┌────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│   UI   │     │   API   │     │ Supabase │     │ RealTime │
└───┬────┘     └────┬────┘     └────┬─────┘     └────┬─────┘
    │               │                │                │
    │ Request       │                │                │
    │ Assignment    │                │                │
    ├──────────────►│                │                │
    │               │                │                │
    │               │ Update         │                │
    │               │ contact_       │                │
    │               │ assignments    │                │
    │               ├───────────────►│                │
    │               │                │                │
    │               │ success        │                │
    │               │◄───────────────┤                │
    │               │                │                │
    │               │                │ Broadcast      │
    │               │                │ Assignment     │
    │               │                │ Change         │
    │               │                ├───────────────►│
    │               │                │                │
    │ Assignment    │                │                │
    │ Confirmed     │                │                │
    │◄──────────────┤                │                │
    │               │                │                │
    │ Subscribe to  │                │                │
    │ assignment    │                │                │
    │ changes       │                │                │
    ├───────────────┼────────────────►│                │
    │               │                │                │
    │               │                │                │ Update UI
    │               │                │                │ for all
    │               │                │                │ connected
    │               │                │                │ agents
    │◄───────────────────────────────┼────────────────┤
    │               │                │                │
    │ UI Updated    │                │                │
    │ with new      │                │                │
    │ assignment    │                │                │
    │               │                │                │
```

## 5. File Structure

```
frontend/
├── components/
│   └── livechat2/
│       ├── AssignmentButton.js       # Assignment UI component
│       ├── AssignmentModal.js        # Assignment dialog
│       ├── AgentList.js             # Display assigned agents
│       └── CollaborationTools.js    # Agent collaboration features
├── services/
│   ├── assignmentService.js         # Assignment business logic
│   └── collaborationService.js      # Real-time collaboration logic
└── utils/
    └── api.js                       # API request utility
```

## 6. Data & Logic Artifacts

### Database Schema

We are utilizing two separate tables to handle board and contact assignments:

#### Board Assignment Table
```sql
CREATE TABLE livechat_board_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id TEXT REFERENCES workspaces(id),
    livechat_board_id UUID,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    FOREIGN KEY (livechat_board_id) REFERENCES livechat_boards(id)
);
```

#### Contact Assignment Table (For Contact-Level Assignments)
```sql
CREATE TABLE livechat_contact_assignments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    UNIQUE(workspace_id, contact_id, user_id)
);

#### Row Level Security (RLS)

```sql
-- Enable RLS for both tables
ALTER TABLE livechat_board_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE livechat_contact_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for board assignments
CREATE POLICY "Users can view board assignments in their workspace"
ON livechat_board_assignments FOR SELECT
TO public
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage board assignments"
ON livechat_board_assignments FOR ALL
TO public
USING (
    EXISTS (
        SELECT 1
        FROM workspace_members
        WHERE user_id = auth.uid()
        AND workspace_id = livechat_board_assignments.workspace_id
        AND role = 'admin'
    )
);

-- Policies for contact assignments
CREATE POLICY "Users can view contact assignments in their workspace"
ON livechat_contact_assignments FOR SELECT
TO public
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can manage their own contact assignments"
ON livechat_contact_assignments 
FOR ALL
TO public
USING (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    )
);

#### Views

1. View for board assignments with details
```sql
CREATE OR REPLACE VIEW livechat_board_assignments_with_details AS
SELECT 
    a.id,
    a.workspace_id,
    a.livechat_board_id,
    a.user_id,
    a.created_at,
    a.created_by,
    a.status,
    u.full_name as agent_name,
    u.avatar_url as agent_avatar,
    w.name AS workspace_name
FROM livechat_board_assignments a
JOIN user_profiles u ON a.user_id = u.id
JOIN workspaces w ON a.workspace_id = w.id;
```

2. View for contact assignments with details
```sql
CREATE OR REPLACE VIEW livechat_contact_assignments_with_details AS
SELECT 
    a.id,
    a.workspace_id,
    a.contact_id,
    a.user_id,
    a.created_at,
    a.created_by,
    a.status,
    u.full_name as agent_name,
    u.avatar_url as agent_avatar,
    w.name AS workspace_name,
    c.firstname AS contact_firstname,
    c.lastname AS contact_lastname,
    c.phone_number AS contact_phone_number
FROM livechat_contact_assignments a
JOIN user_profiles u ON a.user_id = u.id
JOIN workspaces w ON a.workspace_id = w.id
JOIN contacts c ON a.contact_id = c.id;
```

#### Indexes
```sql
-- Existing indexes remain unchanged
-- New indexes for contact assignments
CREATE INDEX idx_contact_assignments_contact_id ON livechat_contact_assignments(contact_id);
CREATE INDEX idx_contact_assignments_user_id ON livechat_contact_assignments(user_id);
CREATE INDEX idx_board_assignments_contact_id ON livechat_board_assignments(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX idx_board_assignments_workspace_id ON livechat_board_assignments(workspace_id);
```

## Service Layer

### Assignment Service

The `assignmentService.js` handles all contact-level assignment operations:

```javascript
// Get all agents assigned to a contact
export const getContactAssignments = async (contactId, workspaceId) => {
  const { data } = await supabase
    .from('livechat_contact_assignments_with_details')
    .select('*')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active');
  return data || [];
};

// Assign an agent to a contact
export const assignAgentToContact = async (contactId, userId, workspaceId) => {
  // Check for existing assignment
  const { data: existing } = await supabase
    .from('livechat_contact_assignments')
    .select('id, status')
    .eq('contact_id', contactId)
    .eq('user_id', userId)
    .eq('workspace_id', workspaceId)
    .single();

  if (existing?.status === 'inactive') {
    // Reactivate existing assignment
    return supabase
      .from('livechat_contact_assignments')
      .update({ status: 'active' })
      .eq('id', existing.id)
      .select()
      .single();
  }

  if (existing) return existing;

  // Create new assignment
  return supabase
    .from('livechat_contact_assignments')
    .insert({
      contact_id: contactId,
      user_id: userId,
      workspace_id: workspaceId,
      status: 'active',
      created_by: auth.uid()
    })
    .select()
    .single();
};

// Unassign an agent from a contact
export const unassignAgentFromContact = async (assignmentId) => {
  return supabase
    .from('livechat_contact_assignments')
    .update({ status: 'inactive' })
    .eq('id', assignmentId)
    .select()
    .single();
};

// Subscribe to assignment changes for a contact
export const subscribeToAssignmentChanges = async (contactId, callback) => {
  const channel = `public:livechat_contact_assignments:${contactId}`;
  return supabase
    .from('livechat_contact_assignments')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'livechat_contact_assignments',
      filter: `contact_id = ${contactId}`,
    }, (payload) => {
      callback(payload);
    }, { channel })
    .subscribe();
};
```

## 7. UI Components

### AssignmentButton
A button component that displays and manages agent assignments for a contact:

- **Location**: Appears in the ChatArea header next to the conversation status button
- **Features**:
  - Shows assigned agents with their avatars and names
  - Allows self-assignment to contacts
  - Supports unassigning from contacts
  - Real-time updates using Supabase subscriptions
  - Displays tooltips for better UX
  - Follows MacOS design philosophy with subtle animations

### Service Layer
The `assignmentService.js` handles all assignment-related operations:

```javascript
// Key functions:
getContactAssignments(contactId, workspaceId)
assignAgentToContact(contactId, userId, workspaceId)
unassignAgentFromContact(assignmentId)
subscribeToAssignmentChanges(contactId, callback)
```

## 8. User Stories

1. As an agent, I want to self-assign to an unassigned conversation so that I can help the customer
2. As an agent, I want to join an existing conversation as a collaborator so that I can provide additional support
3. As an admin, I want to manually assign conversations to specific agents so that I can manage workload
4. As an agent, I want to be automatically assigned when I send the first message so that ownership is clear
5. As an agent, I want to see who else is assigned to a conversation so that I can coordinate effectively
6. As an admin, I want to view assignment history so that I can track conversation ownership
7. As an agent, I want to leave internal notes for other agents so that we can collaborate effectively
8. As an agent, I want to see when other assigned agents are typing so that I don't send conflicting messages
9. As an admin, I want to set a maximum number of agents per conversation to prevent overcrowding
10. As an agent, I want to receive notifications when I'm assigned to a conversation so that I can respond promptly

## 8. Implementation Stages

### Phase 1: MVP (2-3 weeks)
- Basic assignment functionality
- Self-assignment button
- Assignment display
- Auto-assignment on message
- Database schema and RLS

### Phase 2: Collaboration (2-3 weeks)
- Multiple agent support
- Internal notes
- Presence indicators
- Assignment notifications
- History tracking

### Phase 3: Admin Features (1-2 weeks)
- Manual assignment controls
- Assignment history view
- Maximum agent limits
- Analytics and reporting

## 9. Future Roadmap

### Performance Optimizations
- Implement caching for assignment data
- Batch assignment updates
- Optimize real-time updates

### Enhanced Features
- AI-based auto-assignment
- Load balancing between agents
- Advanced collaboration tools
- Performance analytics
- SLA tracking per assignment

### Scaling Considerations
- Sharding for high-volume workspaces
- Read replicas for assignment queries
- Caching layer for real-time updates
- Rate limiting for assignment changes

## References
- Intercom's agent collaboration patterns
- Zendesk's assignment system
- Drift's real-time agent presence
- Industry standard real-time collaboration patterns
