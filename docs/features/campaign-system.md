# Campaign System Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Component Structure](#component-structure)
5. [Features](#features)
6. [Security](#security)
7. [Analytics](#analytics)
8. [Standard Operating Procedures](#standard-operating-procedures)
9. [Troubleshooting](#troubleshooting)

## Overview

The Campaign System is a sophisticated component designed to create and manage automated communication sequences with contacts. It follows Mac OS design principles with clean interfaces, subtle animations, and intuitive user interactions.

### Core Capabilities
- Multi-step campaign creation workflow
- Status-based and time-based message sequencing
- Multi-channel communication (SMS, Email, WhatsApp)
- Audience segmentation and targeting
- Real-time analytics and tracking
- Campaign performance monitoring
- Template management system

## System Architecture

### Technology Stack
- Frontend: React with Chakra UI
- Backend: Supabase (PostgreSQL)
- Real-time: Supabase Realtime
- State Management: React Hooks
- UI Framework: Chakra UI

### Key Components
1. Campaign Builder
   - Step-based workflow
   - Dynamic node management
   - Real-time preview
   - Validation system

2. Message Management
   - Rich text editing
   - Variable insertion
   - Template support
   - Multi-channel support

3. Analytics Dashboard
   - Real-time metrics
   - Performance tracking
   - Contact journey visualization
   - Segment analysis

## Database Schema

### Core Tables

1. campaigns
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type campaign_type NOT NULL DEFAULT 'sequence',
    status campaign_status NOT NULL DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
```

2. campaign_messages
```sql
CREATE TABLE campaign_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL,
    type message_type NOT NULL,
    name TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    template_id UUID,
    sequence_order INTEGER,
    day INTEGER,
    schedule JSONB NOT NULL DEFAULT '{"type": "fixed", "time": "09:00"}',
    conditions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    status message_status DEFAULT 'draft'
);
```

3. message_events
```sql
CREATE TABLE message_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Analytics Tables

1. campaign_metrics
```sql
CREATE TABLE campaign_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL,
    total_contacts INTEGER DEFAULT 0,
    active_contacts INTEGER DEFAULT 0,
    completed_contacts INTEGER DEFAULT 0,
    opted_out_contacts INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_delivered INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Component Structure

### 1. CampaignBuilder
Main orchestrator component that manages:
- Campaign creation workflow
- State management
- Component coordination
- Data persistence

```javascript
const CampaignBuilder = ({ board }) => {
  // State management
  const [campaign, setCampaign] = useState({...});
  const [nodes, setNodes] = useState([...]);
  
  // Operations
  const handleSave = async () => {...};
  const handleLaunch = async () => {...};
  
  // Workflow management
  const handleNext = () => {...};
  const handlePrevious = () => {...};
};
```

### 2. CampaignSetup
Handles initial campaign configuration:
- Campaign name and description
- Campaign type selection
- Audience segment selection
- Schedule configuration

### 3. CampaignNode
Manages individual message nodes:
- Message type selection (SMS/Email/WhatsApp)
- Content editing
- Schedule configuration
- Variable insertion

### 4. CampaignReview
Provides final review and launch capabilities:
- Campaign summary
- Message sequence review
- Audience overview
- Launch controls

## Features

### 1. Campaign Types
- Status-based Sequence
- Time-based Drip
- One-time Broadcast

### 2. Message Types
- SMS
- Email
- WhatsApp

### 3. Scheduling Options
- Fixed time
- Relative time
- Status-based triggers

### 4. Variable System
Available variables:
- Basic Info (name, email, phone)
- Address Fields
- Lead Info
- Custom Fields
- System Info

## Security

### Row Level Security (RLS)
All tables implement RLS policies:
```sql
CREATE POLICY "Users can view their workspace campaigns"
    ON campaigns FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
    ));
```

### Data Validation
- Input sanitization
- Type checking
- Permission verification
- Rate limiting

## Analytics

### Real-time Metrics
- Contact enrollment stats
- Message delivery rates
- Response rates
- Campaign completion rates

### Performance Views
```sql
CREATE VIEW campaign_enrollment_stats AS
SELECT 
    c.id as campaign_id,
    c.workspace_id,
    COUNT(DISTINCT cs.contact_id) as total_enrolled,
    COUNT(DISTINCT CASE WHEN cs.status = 'in_progress' 
        THEN cs.contact_id END) as active_contacts,
    COUNT(DISTINCT CASE WHEN cs.status = 'completed' 
        THEN cs.contact_id END) as completed_contacts
FROM campaigns c
LEFT JOIN campaign_contact_status cs ON c.id = cs.campaign_id
GROUP BY c.id, c.workspace_id;
```

## Standard Operating Procedures

### Campaign Creation
1. Access the Campaign Builder
2. Configure basic campaign settings
3. Select target audience
4. Create message sequence
5. Review and launch

### Campaign Management
1. Monitor campaign performance
2. Adjust message content if needed
3. Pause/resume campaigns
4. Archive completed campaigns

### Template Management
1. Create reusable templates
2. Manage template variables
3. Update existing templates
4. Archive obsolete templates

### Troubleshooting
1. Check campaign status
2. Verify message delivery
3. Review error logs
4. Contact support if needed

## Troubleshooting

### Common Issues
1. Message Not Sending
   - Check campaign status
   - Verify contact opt-in status
   - Check message schedule
   - Review error logs

2. Analytics Not Updating
   - Check real-time connection
   - Verify data pipeline
   - Review database logs

3. Campaign Not Starting
   - Verify segment selection
   - Check schedule configuration
   - Review launch conditions

### Error Handling
```javascript
try {
  // Operation code
} catch (error) {
  console.error('Operation failed:', error);
  toast({
    title: 'Error',
    description: error.message,
    status: 'error',
    duration: 5000,
    isClosable: true,
  });
}
```

## Maintenance

### Regular Tasks
1. Monitor system performance
2. Archive old campaigns
3. Update templates
4. Clean up unused segments

### Database Maintenance
1. Regular backups
2. Index optimization
3. Query performance monitoring
4. Data archival 