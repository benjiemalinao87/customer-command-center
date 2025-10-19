# Flow Builder Design Specification

## Overview
A visual flow builder for designing and managing text message sequences with a Mac OS-inspired design philosophy.

## Technology Stack
- **Framework**: React with TypeScript
- **Flow Library**: React Flow
- **State Management**: Zustand
- **Storage**: Supabase (primary), localStorage (backup)
- **Styling**: Chakra UI (consistent with existing app)

## Directory Structure
```typescript
src/
  components/
    flow-builder/
      nodes/
        MessageNode.tsx       // SMS message node
        DelayNode.tsx         // Delay action node
        ConditionNode.tsx     // Conditions/splits
        ActionNode.tsx        // Generic actions
      panels/
        NodePanel.tsx         // Side panel for node selection
        PropertiesPanel.tsx   // Edit node properties
      FlowBuilder.tsx         // Main component
      FlowControls.tsx        // Toolbar controls
      types.ts               // Flow-related types
```

## Core Components

### 1. Node Types
- **Message Node**
  - SMS/MMS composition
  - Character count
  - Media attachment support
  - Preview functionality

- **Delay Node**
  - Time delay settings
  - Schedule optimization
  - Timezone handling

- **Condition Node**
  - Multiple branches
  - Rule builder interface
  - Contact property conditions
  - Message response conditions

- **Action Node**
  - Integration triggers
  - Webhook configurations
  - Custom action support

- **Comment Node**
  - Flow documentation
  - Team collaboration notes

### 2. User Interface

#### Canvas
- Infinite canvas with zoom/pan
- Grid snapping
- Minimap navigation
- Node alignment guides

#### Control Panel
- Node type selection
- Property editing
- Flow validation
- Save/load controls

#### Node Properties
- Contextual settings
- Validation rules
- Dynamic form fields
- Preview capabilities

## Features

### Basic Features
- Drag and drop node creation
- Node connection management
- Text editing
- Basic flow validation
- Save/load functionality

### Advanced Features
- Flow templates
- Undo/redo support
- Node search/filtering
- Flow simulation
- Export/import
- Keyboard shortcuts
- Auto-save
- Version history

### Pro Features
- Team collaboration
- Advanced integrations
- Custom node types
- Analytics tracking
- A/B testing support

## Progress

### Completed Features
1. **Basic Flow Builder Setup**
   - Implemented React Flow canvas
   - Created basic message node type
   - Added minimap and controls
   - Integrated with Mac OS-style window system

2. **Flow Builder Integration**
   - Added Flow Builder icon to dock
   - Created draggable window component
   - Integrated with main app navigation
   - Set up TypeScript types and interfaces

3. **Flow ID System**
   - Created unique ID generation system
   - Integrated with workspace_id
   - Set up flow state management
   - Added support for new and existing flows

### Current Implementation Details
```typescript
// Flow Data Structure
interface Flow {
  id: string;            // 14-char unique ID (5-char workspace_id + 9-char unique)
  name: string;          // Flow name
  createdAt: string;     // Creation timestamp
  updatedAt: string;     // Last update timestamp
  workspace_id: string;  // Workspace identifier
  nodes: FlowNode[];     // Flow nodes
  edges: FlowEdge[];     // Flow connections
}

// Directory Structure
src/
  components/
    flow-builder/
      nodes/
        MessageNode.tsx
      FlowBuilder.tsx
      types.ts
    windows/
      FlowBuilderWindow.tsx
  utils/
    flowIdGenerator.ts
```

### Next Features to Implement
1. **Flow Persistence**
   - Create Supabase table for flows
   - Implement save/load functionality
   - Add auto-save feature
   - Handle flow versioning

2. **Node Management**
   - Add side panel for node selection
   - Implement node addition functionality
   - Create delay node type
   - Add condition node type

3. **Flow Execution**
   - Create flow execution engine
   - Integrate with Twilio
   - Handle message scheduling
   - Implement flow testing

4. **Flow Management**
   - Create flow list view
   - Add flow templates
   - Implement flow duplication
   - Add flow search and filtering

### Supabase Schema (To Be Implemented)
```sql
create table flows (
  id text primary key,      -- 14-char unique ID
  name text not null,
  workspace_id text not null references workspaces(id),
  nodes jsonb not null default '[]',
  edges jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table flows enable row level security;

-- Create policies
create policy "Users can view their workspace flows" on flows
  for select using (
    workspace_id in (
      select id from workspaces
      where id = auth.uid()
    )
  );

create policy "Users can create flows in their workspace" on flows
  for insert with check (
    workspace_id in (
      select id from workspaces
      where id = auth.uid()
    )
  );
```

## State Management
```typescript
interface FlowState {
  nodes: Node[];
  edges: Edge[];
  selected: string | null;
  clipboard: any;
  history: HistoryState[];
  unsavedChanges: boolean;
}
```

## Data Storage
- Flow configurations in Supabase
- Real-time collaboration support
- Automatic backups
- Version control

## Integration Points
- Twilio API connection
- Contact management system
- Analytics platform
- External service webhooks

## UI/UX Guidelines
- Follow Mac OS design patterns
- Minimal, clean interface
- Subtle animations
- Clear visual feedback
- Accessible color scheme
- Responsive layout

## Performance Considerations
- Lazy loading for large flows
- Virtualization for many nodes
- Optimized rendering
- Efficient state updates
- Background saving

## Error Handling
- Validation feedback
- Error boundaries
- Recovery mechanisms
- Detailed logging
- User notifications

## Future Enhancements
- AI-powered flow suggestions
- Advanced analytics
- Mobile support
- Custom node development
- Integration marketplace

## Development Phases

### Phase 1: Core Implementation
- Basic node types
- Canvas interaction
- Save/load functionality
- Essential UI components

### Phase 2: Advanced Features
- Additional node types
- Flow validation
- Templates system
- Undo/redo

### Phase 3: Pro Features
- Team collaboration
- Advanced integrations
- Analytics
- A/B testing

## Testing Strategy
- Unit tests for components
- Integration tests for flows
- E2E testing for critical paths
- Performance benchmarks
- User acceptance testing

## Implementation Plan

### Initial Setup and Core Components
```typescript
// 1. Core Flow Builder Components
src/components/flow-builder/
  - FlowBuilder.tsx        // Main container
  - FlowCanvas.tsx        // React Flow canvas
  - BasicMessageNode.tsx  // Start with just the SMS node type

// 2. Flow Data Structure
interface FlowNode {
  id: string;
  type: 'message' | 'delay' | 'condition';
  data: {
    content?: string;     // SMS content
    delay?: number;       // Delay in minutes
    twilioConfig?: {
      from: string;
      to: string;
    };
  };
  position: { x: number; y: number };
}
```

### Integration Architecture

#### Flow Execution Engine
```typescript
class FlowExecutionEngine {
  async executeFlow(flowId: string, contactId: string) {
    const flow = await this.getFlow(flowId);
    const contact = await this.getContact(contactId);
    
    for (const node of flow.nodes) {
      switch (node.type) {
        case 'message':
          await this.sendMessage(node.data, contact);
          break;
        case 'delay':
          await this.handleDelay(node.data.delay);
          break;
      }
    }
  }

  // Integrate with existing Twilio sending function
  private async sendMessage(messageData, contact) {
    await twilioService.sendMessage({
      to: contact.phone,
      body: messageData.content
    });
  }
}
```

### Database Schema
```sql
-- Flows table
create table flows (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  nodes jsonb not null,
  edges jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Flow executions table
create table flow_executions (
  id uuid primary key default uuid_generate_v4(),
  flow_id uuid references flows(id),
  contact_id uuid references contacts(id),
  status text not null,
  current_node_id text,
  started_at timestamptz default now(),
  completed_at timestamptz
);
```

### Development Sequence

1. **Basic Flow Canvas with Message Node**
   - Visual builder implementation
   - Node addition and connection functionality
   - Basic message configuration

2. **Flow Storage & Retrieval**
   - Supabase integration for flow configurations
   - Load and edit existing flows

3. **Flow Execution Engine**
   - Node-by-node execution
   - Twilio service integration
   - Delay and scheduling handling

4. **Advanced Node Types**
   - Delay nodes implementation
   - Condition nodes implementation
   - Action nodes implementation

### Integration Points

#### Message Sending Integration
```typescript
private async sendMessage(nodeData: MessageNodeData, contact: Contact) {
  const result = await this.twilioService.sendMessage({
    to: contact.phone,
    body: nodeData.content,
  });

  await this.logMessageExecution({
    flowExecutionId: this.currentExecutionId,
    nodeId: nodeData.id,
    messageId: result.messageId,
    status: result.status
  });
}
```

#### Flow Scheduling Integration
```typescript
async scheduleFlow(flowId: string, contactId: string, startTime: Date) {
  const executionId = await db.flowExecutions.insert({
    flowId,
    contactId,
    status: 'scheduled',
    scheduledFor: startTime
  });

  await this.scheduler.addJob({
    type: 'execute_flow',
    data: { executionId },
    runAt: startTime
  });
}
```

## Flow Builder Design Document

### Overview
The Flow Builder is a visual tool for creating message flows using a node-based interface. It follows macOS design principles with clean, minimal aesthetics and smooth interactions.

### Core Components

#### Node Editor
- Location: Right side panel
- Width: 320px
- Appears when node is selected
- Features:
  - Text message input
  - Image URL input with preview
  - File URL input
  - Delete functionality
  - Clean, minimal styling

#### Message Node
- Width: 240px
- Dynamic height based on content
- Components:
  - Header with icon and label
  - Message preview section
  - Delete button (top-right)
  - Connection handles (top/bottom)

#### Message Preview
- Text Messages:
  - Full content display
  - Pre-wrap formatting
  - Word break handling
  - Clear typography

- Image Messages:
  - URL display
  - Image preview (max 200px height)
  - Aspect ratio preservation
  - Fallback placeholder

- File Messages:
  - URL display
  - Clear labeling
  - Icon indication

### Design Principles

#### Layout
- Fixed width nodes for consistency
- Dynamic height for content
- Clear visual hierarchy
- Proper spacing and alignment

#### Typography
- Font sizes:
  - Headers: Medium (16px)
  - Content: Small (14px)
  - Labels: Extra small (12px)
- Font weights:
  - Headers: Medium (500)
  - Content: Regular (400)
  - Labels: Medium (500)

#### Colors
- Light mode:
  - Background: White
  - Border: Gray.200
  - Text: Gray.600
  - Accent: Blue.500

- Dark mode:
  - Background: Gray.700
  - Border: Gray.600
  - Text: Gray.300
  - Accent: Blue.400

#### Interactions
- Hover effects on interactive elements
- Smooth transitions (0.2s)
- Clear feedback states
- Intuitive delete functionality

### Component Structure
```
FlowBuilder/
├── FlowBuilder.js       # Main component
├── NodeEditor.js        # Right panel editor
├── nodes/
│   ├── index.js        # Node definitions
│   ├── MessageNode.js  # Message node component
│   └── ConditionNode.js # Condition node component
└── styles/
    └── theme.js        # Custom theme overrides
```

### Future Enhancements
1. Rich text editing
2. Direct file uploads
3. Node templates
4. Advanced node types
5. Flow validation
6. Preview mode