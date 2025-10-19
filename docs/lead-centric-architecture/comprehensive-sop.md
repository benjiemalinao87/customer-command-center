# 📚 Lead-Centric Architecture: Comprehensive SOP

**Standard Operating Procedure for Lead Management System**  
*Version 1.0 | Updated: September 15, 2025*

---

## 🎯 **Table of Contents**

1. [System Overview](#system-overview)
2. [Core Concepts](#core-concepts)
3. [Architecture Components](#architecture-components)
4. [Lead Lifecycle Management](#lead-lifecycle-management)
5. [Webhook Integration Guide](#webhook-integration-guide)
6. [API Reference](#api-reference)
7. [Frontend Integration](#frontend-integration)
8. [Database Schema](#database-schema)
9. [Testing & Debugging](#testing--debugging)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)
12. [Development Workflow](#development-workflow)

---

## 🏗️ **System Overview**

### **What is the Lead-Centric Architecture?**

The Lead-Centric Architecture is an advanced CRM system that allows **multiple leads per contact**, providing granular tracking of sales opportunities, customer interactions, and business processes.

### **Key Benefits:**
- 🎯 **Multiple Opportunities**: Track different products/services per contact
- 📊 **Comprehensive Analytics**: Detailed activity tracking and reporting
- 🔄 **Smart Automation**: Intelligent lead creation and update logic
- 🚀 **Scalable Design**: High-performance API built on Cloudflare Workers
- 🔒 **Data Integrity**: Backward-compatible with existing contact system

### **Business Use Cases:**
- **Home Improvement**: Bath remodel → Kitchen upgrade → HVAC system
- **SaaS Products**: Basic plan → Premium features → Enterprise solution
- **Coaching Services**: Initial consultation → Program enrollment → Advanced training
- **Real Estate**: Rental inquiry → Purchase discussion → Investment opportunity

---

## 💡 **Core Concepts**

### **1. Contact vs Lead Relationship**
```
📱 Contact (Person)
├── 🏠 Lead: Bath Remodel ($15K, Qualified)
├── 🍳 Lead: Kitchen Upgrade ($25K, New)
└── ❄️ Lead: HVAC System ($8K, Won)
```

### **2. Lead Lifecycle Stages**
```
New → Qualified → Proposal → Won/Lost/Inactive
```

### **3. Activity Tracking**
Every interaction is tracked with:
- **Type**: Call, Email, SMS, Meeting, Note, Quote, etc.
- **Outcome**: Positive, Negative, Neutral, Scheduled
- **Context**: Automated vs Manual, Priority, Duration
- **Metadata**: Full audit trail with timestamps

### **4. Smart Lead Logic**
The system intelligently decides when to:
- **UPDATE** existing leads (status progression)
- **CREATE** new leads (different products, time gaps)

---

## 🏗️ **Architecture Components**

### **Backend Systems**

| **Component** | **Technology** | **Purpose** | **URL** |
|---------------|----------------|-------------|---------|
| **Cloudflare Workers** | Edge Computing | Lead API v3, Webhooks | `api-customerconnect.app` |
| **Node.js Backend** | Express/Railway | Legacy APIs, Contact management | `cc.automate8.com` |
| **Supabase** | PostgreSQL | Database, Real-time features | `ycwttshvizkotcwwyjpt.supabase.co` |
| **React Frontend** | JavaScript | User interface | `cc1.automate8.com` |

### **Database Tables**

| **Table** | **Purpose** | **Key Fields** |
|-----------|-------------|----------------|
| `contacts` | Core contact information | `id`, `phone_number`, `email`, `workspace_id` |
| `leads` | Lead opportunities | `contact_id`, `product_interest`, `stage`, `estimated_value` |
| `lead_activities` | Interaction history | `lead_id`, `activity_type`, `title`, `description` |
| `lead_pipeline_stages` | Customizable stages | `workspace_id`, `stage_name`, `color`, `conversion_probability` |
| `lead_custom_fields` | Dynamic field values | `lead_id`, `field_definition_id`, `value` |
| `lead_field_definitions` | Field templates | `workspace_id`, `field_name`, `field_type`, `options` |

---

## 🔄 **Lead Lifecycle Management**

### **Lead Creation Methods**

#### **1. Webhook Integration (Automatic)**
```bash
curl -X POST "https://api-customerconnect.app/webhooks/[ID]" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: 39135" \
  -d '{
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com",
    "phone_number": "5551234567",
    "productid": "Solar Panels",
    "lead_status": "New",
    "source": "Website"
  }'
```

#### **2. Contact Creation API (Dual-Write)**
```bash
curl -X POST "https://cc.automate8.com/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "39135",
    "firstname": "Jane",
    "lastname": "Smith",
    "email": "jane@example.com",
    "product": "Kitchen Remodel",
    "enable_lead_tracking": true
  }'
```

#### **3. Manual Lead Creation (UI)**
- Navigate to Contact Details → Leads Overview
- Click "Create New Lead" button
- Fill out lead form with product, source, estimated value
- System automatically assigns default pipeline stage

#### **4. Lead API v3 (Direct)**
```bash
curl -X POST "https://api-customerconnect.app/api/v3/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: [KEY]" \
  -d '{
    "contact_id": "uuid",
    "workspace_id": "39135",
    "product_interest": "Pool Installation",
    "estimated_value": 50000,
    "lead_source": "Referral"
  }'
```

### **Lead Update Logic**

#### **Smart Decision Matrix**

| **Scenario** | **Same Contact** | **Same Product** | **Time Gap** | **Status Keyword** | **Current State** | **Action** |
|--------------|------------------|------------------|--------------|--------------------|--------------------|------------|
| Status Progression | ✅ | ✅ | < 30 days | ✅ (Qualified/Won) | Not Converted | **UPDATE** |
| Different Product | ✅ | ❌ | Any | Any | Any | **CREATE NEW** |
| Long Gap | ✅ | ✅ | > 30 days | Any | Any | **CREATE NEW** |
| Already Won | ✅ | ✅ | < 30 days | Any | Converted | **CREATE NEW** |
| No Status Keyword | ✅ | ✅ | < 30 days | ❌ | Any | **CREATE NEW** |

#### **Status Keywords for Updates**
```javascript
['converted', 'won', 'lost', 'closed', 'qualified', 'proposal', 'negotiation']
```

### **Activity Tracking**

#### **Automatic Activities**
- **Lead Created**: When new lead is generated
- **Status Updated**: When lead stage changes
- **Appointment Scheduled**: When appointment data is provided
- **Lead Converted**: When lead reaches won status

#### **Manual Activities (Agent-Created)**
- **Call Logs**: Duration, outcome, notes
- **Email Tracking**: Subject, content, attachments
- **Meeting Notes**: Attendees, agenda, action items
- **Quote Generation**: Amount, products, validity

---

## 🔗 **Webhook Integration Guide**

### **Webhook Processors Available**

| **Processor** | **URL Pattern** | **Features** | **Use Case** |
|---------------|-----------------|--------------|-------------|
| **Cloudflare Worker** | `worker.api-customerconnect.app/webhooks/[ID]` | Smart lead logic, Activity tracking | Modern integrations |
| **Node.js Backend** | `cc.automate8.com/webhooks/[ID]` | Webhook rules, Legacy compatibility | Existing integrations |
| **Supabase Edge Function** | `ycwttshvizkotcwwyjpt.supabase.co/functions/v1/webhook-handler` | Real-time processing | Direct database |

### **Webhook Payload Examples**

#### **New Lead Creation**
```json
{
  "firstname": "Carlos",
  "lastname": "Rodriguez",
  "email": "carlos@example.com",
  "phone_number": "3055551234",
  "crm_id": "CRM123456",
  "productid": "Pool Installation",
  "lead_status": "New",
  "source": "Facebook Ads",
  "adate": "2025-09-30",
  "atime": "2:00 PM",
  "appointment_status": "scheduled"
}
```

#### **Lead Status Update**
```json
{
  "crm_id": "CRM123456",
  "productid": "Pool Installation",
  "lead_status": "Converted",
  "appointment_status": "completed"
}
```

### **Response Formats**

#### **Success Response**
```json
{
  "success": true,
  "message": "Contact and lead created successfully",
  "contact_id": "uuid",
  "lead_id": "uuid",
  "is_new_contact": true,
  "processing_time": "1234ms"
}
```

#### **Error Response**
```json
{
  "success": false,
  "error": "Invalid workspace_id",
  "code": "VALIDATION_ERROR",
  "request_id": "uuid"
}
```

---

## 🚀 **API Reference**

### **Lead API v3 Endpoints**

#### **Base URL**: `https://api-customerconnect.app/api/v3`

#### **Authentication**
```bash
# Add to headers
X-API-Key: your-api-key
Content-Type: application/json
```

#### **Core Endpoints**

| **Method** | **Endpoint** | **Purpose** | **Auth Required** |
|------------|--------------|-------------|-------------------|
| `GET` | `/leads/health` | Health check | ❌ |
| `GET` | `/leads` | List all leads | ✅ |
| `GET` | `/leads/:id` | Get specific lead | ✅ |
| `POST` | `/leads` | Create new lead | ✅ |
| `PUT` | `/leads/:id` | Update lead | ✅ |
| `GET` | `/leads/:id/activities` | Get lead activities | ✅ |
| `POST` | `/leads/:id/activities` | Create activity | ✅ |
| `GET` | `/leads/pipeline/:workspace_id` | Pipeline overview | ✅ |
| `GET` | `/leads/pipeline/:workspace_id/stages` | Get stages | ✅ |
| `POST` | `/leads/pipeline/:workspace_id/stages` | Create stage | ✅ |

#### **Query Parameters**

##### **List Leads (`GET /leads`)**
```bash
?workspace_id=39135&stage=new&limit=50&offset=0&include_activities=true
```

##### **Pipeline Overview (`GET /leads/pipeline/:workspace_id`)**
```bash
?include_counts=true&date_range=last_30_days
```

#### **Request/Response Examples**

##### **Create Lead**
```bash
curl -X POST "https://api-customerconnect.app/api/v3/leads" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "contact_id": "contact-uuid",
    "workspace_id": "39135",
    "product_interest": "Solar Installation",
    "lead_source": "Google Ads",
    "estimated_value": 25000,
    "priority": "high",
    "temperature": "hot",
    "qualification_status": "qualified",
    "timeline": "30_days",
    "initial_inquiry": "Interested in solar for 2000 sq ft home",
    "tags": ["solar", "residential", "urgent"],
    "custom_fields": {
      "roof_type": "shingle",
      "electricity_bill": "$300/month"
    }
  }'
```

##### **Create Activity**
```bash
curl -X POST "https://api-customerconnect.app/api/v3/leads/[lead-id]/activities" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{
    "activity_type": "call",
    "title": "Discovery Call",
    "description": "Discussed solar requirements and timeline",
    "outcome": "positive",
    "duration_minutes": 30,
    "performed_by": "agent-uuid",
    "priority": "medium",
    "activity_data": {
      "call_duration": 30,
      "call_outcome": "interested",
      "next_steps": "Send proposal"
    }
  }'
```

---

## 🎨 **Frontend Integration**

### **React Components**

#### **Core Lead Components**
```javascript
// Main lead overview component
<LeadsOverview contactId={contactId} workspaceId={workspaceId} />

// Individual lead management
<LeadStageSelector leadId={leadId} onStageChange={handleStageChange} />

// Activity management
<LeadActivityCreator leadId={leadId} onActivityCreated={handleRefresh} />
<AddLeadActivityButton leadId={leadId} />

// Lead creation
<CreateLeadButton contactId={contactId} onLeadCreated={handleRefresh} />
<LeadCreator contactId={contactId} workspaceId={workspaceId} />
```

#### **Activity History Components**
```javascript
// Enhanced activity timeline
<EnhancedActivityHistory contactId={contactId} />

// Legacy activity support
<ActivityHistory contactId={contactId} showLegacyOnly={true} />
```

#### **Pipeline Management**
```javascript
// Centralized pipeline management
<PipelineManagement workspaceId={workspaceId} />

// Lead pipeline specific
<LeadPipelineManager workspaceId={workspaceId} />
<LeadStageFormModal onStageCreated={handleStageCreated} />
```

### **Service Integration**

#### **Lead Activities Service**
```javascript
import LeadActivitiesService from '../services/LeadActivitiesService';

// Create lead activity
const result = await LeadActivitiesService.createLeadActivity({
  leadId: 'uuid',
  activityType: 'call',
  title: 'Discovery Call',
  description: 'Discussed requirements',
  performedBy: 'agent-uuid'
});

// Create new lead
const leadResult = await LeadActivitiesService.createLead({
  contactId: 'uuid',
  workspaceId: '39135',
  productInterest: 'Solar Panels',
  estimatedValue: 25000
});
```

### **Integration Patterns**

#### **Contact Detail View Integration**
```javascript
// Add to ContactDetailView.js
import LeadsOverview from './LeadsOverview';
import EnhancedActivityHistory from './EnhancedActivityHistory';

function ContactDetailView({ contactId }) {
  return (
    <TabPanels>
      <TabPanel> {/* Details Tab */}
        <LeadsOverview 
          contactId={contactId} 
          workspaceId={workspaceId}
          onLeadCreated={handleRefresh}
        />
      </TabPanel>
      
      <TabPanel> {/* Leads History Tab */}
        <EnhancedActivityHistory 
          contactId={contactId}
          showBothLeadAndContact={true}
        />
      </TabPanel>
    </TabPanels>
  );
}
```

#### **Refresh Patterns**
```javascript
// Use refresh triggers for real-time updates
const [refreshTrigger, setRefreshTrigger] = useState(0);

const handleActivityCreated = () => {
  setRefreshTrigger(prev => prev + 1);
};

useEffect(() => {
  // Refresh data when trigger changes
  fetchLeads();
}, [refreshTrigger]);
```

---

## 🗄️ **Database Schema**

### **Core Tables Structure**

#### **`leads` Table (54 columns)**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  
  -- Source attribution
  lead_source VARCHAR(100),
  sub_source VARCHAR(100),
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  
  -- Business information
  product_interest VARCHAR(255),
  estimated_value DECIMAL(15,2),
  probability INTEGER DEFAULT 0,
  
  -- Lead management
  stage VARCHAR(100) DEFAULT 'new',
  priority VARCHAR(50) DEFAULT 'medium',
  temperature VARCHAR(50) DEFAULT 'warm',
  qualification_status VARCHAR(100) DEFAULT 'unqualified',
  
  -- Status tracking
  is_active BOOLEAN DEFAULT TRUE,
  is_converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata and audit
  metadata JSONB,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **`lead_activities` Table (51 columns)**
```sql
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  
  -- Activity classification
  activity_type VARCHAR(100) NOT NULL,
  activity_category VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Activity metadata
  activity_data JSONB,
  outcome VARCHAR(100),
  priority VARCHAR(50),
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  
  -- Attribution
  performed_by UUID,
  is_automated BOOLEAN DEFAULT FALSE,
  
  -- Audit trail
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### **`lead_pipeline_stages` Table (25 columns)**
```sql
CREATE TABLE lead_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL,
  stage_name VARCHAR(100) NOT NULL,
  stage_slug VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3182CE',
  stage_order INTEGER,
  conversion_probability INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **Key Relationships**
```
contacts (1) ← (N) leads (1) ← (N) lead_activities
                           ↓
                    lead_custom_fields (N) → (1) lead_field_definitions
```

### **Database Functions**

#### **`ensure_workspace_pipeline(workspace_id)`**
- Creates default pipeline stages for new workspaces
- Returns: Array of created stages

#### **`get_default_stage_for_workspace(workspace_id)`**
- Gets the default stage slug for lead creation
- Returns: `{stage_slug: 'new'}`

### **Row Level Security (RLS)**
```sql
-- Enable RLS on all lead tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Example RLS policy for workspace isolation
CREATE POLICY "workspace_isolation" ON leads
  FOR ALL USING (workspace_id = current_setting('app.workspace_id'));
```

---

## 🧪 **Testing & Debugging**

### **Test Scripts**

#### **Backend Lead Creation Test**
```bash
# Test dual-write pattern
curl -X POST "https://cc.automate8.com/contacts" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "39135",
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "phone_number": "5551234567",
    "product": "Test Product",
    "enable_lead_tracking": true
  }'
```

#### **Webhook Test**
```bash
# Test webhook lead creation
curl -X POST "https://worker.api-customerconnect.app/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: 39135" \
  -d '{
    "firstname": "Webhook",
    "lastname": "Test",
    "email": "webhook@example.com",
    "productid": "Test Product",
    "lead_status": "New",
    "source": "Test"
  }'
```

#### **Lead Update Test**
```bash
# Test lead status update
curl -X POST "https://worker.api-customerconnect.app/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: 39135" \
  -d '{
    "crm_id": "existing_crm_id",
    "productid": "Test Product",
    "lead_status": "Converted"
  }'
```

### **Database Verification Queries**

#### **Check Lead Creation**
```sql
SELECT l.*, c.firstname, c.lastname 
FROM leads l 
JOIN contacts c ON l.contact_id = c.id 
WHERE c.email = 'test@example.com'
ORDER BY l.created_at DESC;
```

#### **Check Activity Tracking**
```sql
SELECT la.*, l.product_interest 
FROM lead_activities la 
JOIN leads l ON la.lead_id = l.id 
WHERE l.contact_id = 'contact-uuid'
ORDER BY la.created_at DESC;
```

#### **Check Pipeline Stages**
```sql
SELECT * FROM lead_pipeline_stages 
WHERE workspace_id = '39135' 
ORDER BY stage_order;
```

### **Frontend Debugging**

#### **Browser Console Commands**
```javascript
// Check lead data loading
console.log('Lead data:', leadsData);

// Verify API calls
console.log('API response:', await LeadActivitiesService.createLead(data));

// Debug component state
console.log('Component state:', { leads, activities, refreshTrigger });
```

#### **Common Debug Points**
- Service worker CORS issues
- API authentication failures
- Database constraint violations
- Environment variable mismatches

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **1. Webhook Not Creating Leads**

**Symptoms:**
- Contact created but no lead
- Response shows success but missing lead_id

**Diagnosis:**
```sql
-- Check if lead was created
SELECT COUNT(*) FROM leads WHERE contact_id = 'contact-uuid';

-- Check for constraint violations
SELECT * FROM lead_activities WHERE lead_id = 'lead-uuid';
```

**Solutions:**
- Verify `workspace_id` header is present
- Check product field mapping in webhook payload
- Ensure lead_status or product fields are provided
- Verify environment variables in worker

#### **2. Frontend Activities Not Showing**

**Symptoms:**
- UI shows empty activity history
- Console errors about missing data

**Diagnosis:**
```javascript
// Check API response
const response = await fetch('/api/v3/leads/uuid/activities');
console.log('Activities response:', await response.json());
```

**Solutions:**
- Verify API endpoint URLs
- Check CORS configuration
- Ensure proper authentication headers
- Validate component state updates

#### **3. Pipeline Stages Missing**

**Symptoms:**
- Cannot create stages
- "Pipeline ID required" errors

**Diagnosis:**
```sql
-- Check if default stages exist
SELECT * FROM lead_pipeline_stages WHERE workspace_id = 'workspace-id';

-- Check RPC function
SELECT * FROM get_default_stage_for_workspace('workspace-id');
```

**Solutions:**
- Run `ensure_workspace_pipeline` function
- Create default stages manually
- Verify workspace ID consistency
- Check database permissions

#### **4. Environment Variable Issues**

**Symptoms:**
- "supabaseKey is required" errors
- API authentication failures

**Common Mismatches:**
```bash
# Code expects:
SUPABASE_SERVICE_ROLE_KEY

# Railway has:
SUPABASE_SERVICE_KEY

# Fix: Update code to match Railway
```

#### **5. Lead Update Logic Not Working**

**Symptoms:**
- Always creates new leads
- Never updates existing leads

**Debug Steps:**
1. Check `shouldUpdateExistingLead` logic
2. Verify status keyword detection
3. Confirm time gap calculation
4. Check product interest matching

### **Debug Logging**

#### **Enable Verbose Logging**
```javascript
// In webhook processor
console.log('Webhook payload:', payload);
console.log('Contact data:', contactData);
console.log('Lead data:', leadData);
console.log('Should update:', shouldUpdateResult);
```

#### **Monitor API Calls**
```bash
# Watch webhook calls
tail -f /var/log/webhook.log

# Monitor database queries
SELECT * FROM pg_stat_activity WHERE application_name = 'webhook-processor';
```

---

## ✅ **Best Practices**

### **Development Guidelines**

#### **1. Lead Creation**
- ✅ Always provide `workspace_id`
- ✅ Include `product_interest` or `product`
- ✅ Use consistent field naming
- ✅ Validate required fields before creation
- ✅ Handle errors gracefully with fallbacks

#### **2. Activity Tracking**
- ✅ Create activities for all significant interactions
- ✅ Use descriptive titles and outcomes
- ✅ Include relevant metadata for reporting
- ✅ Set appropriate priority levels
- ✅ Track both automated and manual activities

#### **3. API Integration**
- ✅ Use API v3 for new integrations
- ✅ Implement proper error handling
- ✅ Include authentication headers
- ✅ Validate responses before processing
- ✅ Use batch operations for efficiency

#### **4. Database Operations**
- ✅ Use transactions for related operations
- ✅ Implement proper indexing for queries
- ✅ Follow RLS policies for security
- ✅ Use database functions for complex logic
- ✅ Monitor query performance

#### **5. Frontend Development**
- ✅ Implement loading states
- ✅ Use proper error boundaries
- ✅ Cache data when appropriate
- ✅ Implement optimistic updates
- ✅ Follow React best practices

### **Security Considerations**

#### **Data Protection**
- 🔒 Validate all inputs
- 🔒 Sanitize user data
- 🔒 Use prepared statements
- 🔒 Implement rate limiting
- 🔒 Log security events

#### **Access Control**
- 🔒 Enforce workspace isolation
- 🔒 Validate user permissions
- 🔒 Use secure authentication
- 🔒 Audit access patterns
- 🔒 Implement session management

### **Performance Optimization**

#### **Database**
- ⚡ Index frequently queried columns
- ⚡ Use pagination for large datasets
- ⚡ Optimize query plans
- ⚡ Monitor slow queries
- ⚡ Use connection pooling

#### **API**
- ⚡ Implement caching strategies
- ⚡ Use CDN for static assets
- ⚡ Optimize payload sizes
- ⚡ Implement compression
- ⚡ Monitor response times

#### **Frontend**
- ⚡ Lazy load components
- ⚡ Implement virtual scrolling
- ⚡ Use React.memo appropriately
- ⚡ Optimize bundle sizes
- ⚡ Cache API responses

---

## 🔄 **Development Workflow**

### **Feature Development Process**

#### **1. Planning Phase**
1. Review requirements with stakeholders
2. Design database schema changes
3. Plan API endpoint modifications
4. Design UI/UX components
5. Identify integration points

#### **2. Development Phase**
1. **Backend First**:
   - Create/modify database tables
   - Implement API endpoints
   - Add business logic
   - Write unit tests

2. **Frontend Integration**:
   - Create React components
   - Implement services
   - Add to existing views
   - Test user interactions

3. **Integration Testing**:
   - Test end-to-end workflows
   - Verify data consistency
   - Test error scenarios
   - Performance testing

#### **3. Deployment Process**
1. **Development Environment**:
   - Test locally with dev database
   - Verify all components work
   - Run automated tests

2. **Staging Deployment**:
   - Deploy to staging environment
   - Run integration tests
   - Stakeholder review
   - Performance validation

3. **Production Deployment**:
   - Deploy database migrations
   - Deploy backend services
   - Deploy frontend updates
   - Monitor system health

### **Git Workflow**

#### **Commit Message Format**
```
Title of Change

Key details and improvements:
- Point 1
- Point 2
- Point 3

Lessons Learned:
- Lesson 1
- Lesson 2
- Lesson 3
```

#### **Branch Strategy**
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/lead-*`: Feature development
- `bugfix/issue-*`: Bug fixes
- `hotfix/critical-*`: Production hotfixes

### **Testing Strategy**

#### **Unit Tests**
```javascript
// Test lead creation logic
describe('Lead Service', () => {
  test('should create lead with valid data', async () => {
    const result = await leadService.createLeadFromContact(contact, data);
    expect(result.success).toBe(true);
    expect(result.data.contact_id).toBe(contact.id);
  });
});
```

#### **Integration Tests**
```javascript
// Test webhook integration
describe('Webhook Integration', () => {
  test('should create contact and lead via webhook', async () => {
    const response = await request(app)
      .post('/webhooks/test-id')
      .send(webhookPayload)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.lead_id).toBeDefined();
  });
});
```

#### **End-to-End Tests**
```javascript
// Test complete user workflow
describe('Lead Management Workflow', () => {
  test('agent can create and manage lead', async () => {
    // Login as agent
    await page.goto('/contacts/contact-id');
    
    // Create lead
    await page.click('[data-testid="create-lead-button"]');
    await page.fill('[data-testid="product-input"]', 'Solar Panels');
    await page.click('[data-testid="save-lead"]');
    
    // Verify lead appears
    await expect(page.locator('[data-testid="lead-card"]')).toBeVisible();
  });
});
```

### **Documentation Maintenance**

#### **Keep Updated**
- API documentation with new endpoints
- Database schema changes
- Component integration guides
- Troubleshooting procedures
- Performance optimizations

#### **Version Control**
- Tag major releases
- Maintain changelog
- Document breaking changes
- Archive deprecated features
- Update migration guides

---

## 📋 **Quick Reference**

### **Essential URLs**
- **Lead API v3**: `https://api-customerconnect.app/api/v3`
- **Webhook Endpoints**: 
  - Cloudflare: `https://worker.api-customerconnect.app/webhooks/[ID]`
  - Node.js: `https://cc.automate8.com/webhooks/[ID]`
- **Frontend**: `https://cc1.automate8.com`
- **Database**: `https://ycwttshvizkotcwwyjpt.supabase.co`

### **Key Environment Variables**
```bash
SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...
WORKSPACE_ID=39135
API_BASE_URL=https://api-customerconnect.app
```

### **Common SQL Queries**
```sql
-- Find leads for contact
SELECT * FROM leads WHERE contact_id = 'uuid';

-- Get lead activities
SELECT * FROM lead_activities WHERE lead_id = 'uuid' ORDER BY created_at DESC;

-- Check pipeline stages
SELECT * FROM lead_pipeline_stages WHERE workspace_id = '39135';

-- Lead conversion stats
SELECT stage, COUNT(*) FROM leads WHERE workspace_id = '39135' GROUP BY stage;
```

### **Emergency Contacts**
- **Technical Issues**: Developer Team
- **Business Logic**: Product Manager
- **Database Issues**: DevOps Team
- **Client Support**: Customer Success

---

**📝 Document Version**: 1.0  
**📅 Last Updated**: September 15, 2025  
**👥 Maintained By**: Development Team  
**🔄 Review Cycle**: Monthly  

*This SOP is a living document. Please contribute improvements and report any inaccuracies.*
