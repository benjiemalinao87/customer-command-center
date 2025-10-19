# Enhanced Metrics System Database Integration Plan

## 1. Core Database Schema

### 1.1 Messages & Communication Tables

```sql
-- Track all message events
CREATE TABLE message_events (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    agent_id INTEGER REFERENCES agents(id),
    contact_id INTEGER REFERENCES contacts(id),
    conversation_id INTEGER REFERENCES conversations(id),
    message_body TEXT,
    message_type VARCHAR(50),
    status VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- Track all call events
CREATE TABLE call_events (
    id SERIAL PRIMARY KEY,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    agent_id INTEGER REFERENCES agents(id),
    contact_id INTEGER REFERENCES contacts(id),
    conversation_id INTEGER REFERENCES conversations(id),
    call_status VARCHAR(50),
    duration INTEGER,
    source VARCHAR(50),
    queue_time INTEGER,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track conversation states and transitions
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    agent_id INTEGER REFERENCES agents(id),
    status VARCHAR(20) CHECK (status IN ('open', 'pending', 'done', 'spam', 'unsubscribe')),
    lead_source VARCHAR(100),
    market VARCHAR(100),
    product VARCHAR(100),
    first_response_time INTEGER,
    resolution_time INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Track conversation state changes
CREATE TABLE conversation_state_changes (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    agent_id INTEGER REFERENCES agents(id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT
);
```

### 1.2 Agent & Performance Tables

```sql
-- Track agent details and status
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    status VARCHAR(20),
    current_workload INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track agent performance metrics
CREATE TABLE agent_performance_metrics (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    date DATE NOT NULL,
    messages_handled INTEGER DEFAULT 0,
    calls_handled INTEGER DEFAULT 0,
    avg_response_time INTEGER,
    avg_resolution_time INTEGER,
    satisfaction_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, date)
);

-- Track agent availability and shifts
CREATE TABLE agent_availability (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    status VARCHAR(20),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 Contact & Lead Management Tables

```sql
-- Track contact information
CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    phone VARCHAR(50) UNIQUE,
    email VARCHAR(255),
    lead_source VARCHAR(100),
    market VARCHAR(100),
    state VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_contact_at TIMESTAMP WITH TIME ZONE
);

-- Track opt-outs and preferences
CREATE TABLE contact_preferences (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id),
    opt_out_type VARCHAR(50),
    opt_out_reason TEXT,
    initiated_by VARCHAR(20) CHECK (initiated_by IN ('contact', 'agent', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contact_id, opt_out_type)
);

-- Track lead sources
CREATE TABLE lead_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 1.4 Analytics & Reporting Views

```sql
-- Materialized view for daily metrics
CREATE MATERIALIZED VIEW daily_metrics AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_messages,
    COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_messages,
    AVG(CASE WHEN direction = 'inbound' THEN first_response_time END) as avg_response_time,
    COUNT(DISTINCT contact_id) as unique_contacts
FROM message_events
GROUP BY DATE(created_at)
WITH DATA;

-- Materialized view for agent performance
CREATE MATERIALIZED VIEW agent_performance AS
SELECT 
    a.id as agent_id,
    a.name,
    COUNT(DISTINCT c.id) as total_conversations,
    AVG(c.first_response_time) as avg_response_time,
    AVG(c.resolution_time) as avg_resolution_time,
    COUNT(*) FILTER (WHERE c.status = 'done') as resolved_conversations
FROM agents a
LEFT JOIN conversations c ON c.agent_id = a.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.name
WITH DATA;

-- View for lead source performance
CREATE MATERIALIZED VIEW lead_source_performance AS
SELECT 
    ls.name as lead_source,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT conv.id) as total_conversations,
    AVG(conv.resolution_time) as avg_resolution_time
FROM lead_sources ls
LEFT JOIN contacts c ON c.lead_source = ls.name
LEFT JOIN conversations conv ON conv.contact_id = c.id
WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ls.name
WITH DATA;
```

## 2. Indexes & Performance Optimization

```sql
-- Message events indexes
CREATE INDEX idx_message_events_created_at ON message_events(created_at);
CREATE INDEX idx_message_events_agent_contact ON message_events(agent_id, contact_id);
CREATE INDEX idx_message_events_conversation ON message_events(conversation_id);

-- Call events indexes
CREATE INDEX idx_call_events_created_at ON call_events(created_at);
CREATE INDEX idx_call_events_agent_contact ON call_events(agent_id, contact_id);
CREATE INDEX idx_call_events_status ON call_events(call_status);

-- Conversation indexes
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_dates ON conversations(created_at, updated_at, closed_at);
CREATE INDEX idx_conversations_agent ON conversations(agent_id);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);

-- Contact indexes
CREATE INDEX idx_contacts_lead_source ON contacts(lead_source);
CREATE INDEX idx_contacts_market ON contacts(market);
CREATE INDEX idx_contacts_state ON contacts(state);
CREATE INDEX idx_contacts_dates ON contacts(created_at, updated_at, last_contact_at);
```

## 3. Maintenance Procedures

```sql
-- Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY agent_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY lead_source_performance;
END;
$$ LANGUAGE plpgsql;

-- Schedule view refreshes
SELECT cron.schedule('0 * * * *', $$
    SELECT refresh_analytics_views();
$$);

-- Partition old data
CREATE OR REPLACE FUNCTION create_message_partition()
RETURNS void AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS message_events_y_m 
    PARTITION OF message_events
    FOR VALUES FROM (DATE_TRUNC('month', CURRENT_DATE))
    TO (DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month'));
END;
$$ LANGUAGE plpgsql;
```

## 4. Data Access Layer

```typescript
// src/services/database/MetricsDatabase.ts

interface MetricsDatabase {
  // Message tracking
  trackMessageEvent(event: MessageEvent): Promise<void>;
  getMessageMetrics(dateRange: DateRange): Promise<MessageMetrics>;
  
  // Call tracking
  trackCallEvent(event: CallEvent): Promise<void>;
  getCallMetrics(dateRange: DateRange): Promise<CallMetrics>;
  
  // Conversation tracking
  updateConversationStatus(
    conversationId: number,
    status: ConversationStatus,
    agentId: number
  ): Promise<void>;
  
  // Agent performance
  getAgentPerformance(
    agentId: number,
    dateRange: DateRange
  ): Promise<AgentPerformance>;
  
  // Lead source analytics
  getLeadSourcePerformance(
    dateRange: DateRange
  ): Promise<LeadSourcePerformance[]>;
  
  // Contact management
  trackContactInteraction(
    contactId: number,
    interaction: ContactInteraction
  ): Promise<void>;
}

// Types
interface DateRange {
  start: Date;
  end: Date;
}

interface MessageMetrics {
  inbound: number;
  outbound: number;
  avgResponseTime: number;
  uniqueContacts: number;
}

interface CallMetrics {
  inbound: number;
  outbound: number;
  avgDuration: number;
  missedCalls: number;
}

interface AgentPerformance {
  totalConversations: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  resolvedConversations: number;
}

interface LeadSourcePerformance {
  source: string;
  totalContacts: number;
  totalConversations: number;
  avgResolutionTime: number;
}
```

## 5. Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- Set up database schema
- Create indexes
- Implement base tracking functions
- Set up monitoring

### Phase 2: Data Layer (Week 2)
- Implement database service layer
- Set up caching with Redis
- Add batch processing
- Implement retry mechanisms

### Phase 3: Analytics (Week 3)
- Create materialized views
- Implement performance tracking
- Set up automated refreshes
- Add monitoring dashboards

### Phase 4: Migration (Week 4)
- Data migration from old system
- Validation and testing
- Performance optimization
- Documentation

## 6. Monitoring & Maintenance

### Daily Tasks
- Monitor table sizes and growth
- Check view refresh status
- Verify data consistency
- Monitor query performance

### Weekly Tasks
- Review slow queries
- Analyze index usage
- Check data distribution
- Update statistics

### Monthly Tasks
- Archive old data
- Optimize partitions
- Review and adjust caching
- Update monitoring thresholds 