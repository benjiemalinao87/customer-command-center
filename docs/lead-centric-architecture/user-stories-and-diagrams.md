# 📖 User Stories & System Diagrams

**Lead-Centric Architecture: User Stories and Visual Documentation**  
*Version 1.0 | Updated: September 15, 2025*

---

## 🎭 **User Stories**

### **👨‍💼 Sales Agent - "Sarah"**

#### **Story 1: Multi-Product Lead Management**
```
As a Sales Agent for a home improvement company,
I want to track multiple leads for the same customer across different projects,
So that I can maximize revenue opportunities and provide better service.

Acceptance Criteria:
✅ I can see all leads for a customer in one view
✅ Each lead tracks a different product/service independently
✅ Lead histories don't interfere with each other
✅ I can update lead stages independently
✅ Activities are tracked per lead, not just per contact
```

**Sarah's Daily Workflow:**
```
08:00 - Check dashboard for today's follow-ups
08:30 - Call John Doe about Kitchen Remodel (Lead #1)
09:15 - Email John Doe quote for Solar Installation (Lead #2)
10:00 - Update Kitchen lead to "Proposal Sent"
10:30 - Schedule site visit for Solar lead
11:00 - Create activity notes for both interactions
```

#### **Story 2: Lead Activity Tracking**
```
As a Sales Agent,
I want to log detailed activities for each lead,
So that I have complete visibility into the sales process and can follow up effectively.

Acceptance Criteria:
✅ I can create different activity types (Call, Email, Meeting, Quote)
✅ Activities include outcome, duration, and next steps
✅ I can see a timeline of all lead interactions
✅ System automatically logs webhook-generated activities
✅ I can filter activities by type and outcome
```

### **🏠 Home Improvement Customer - "John Doe"**

#### **Story 3: Multi-Project Customer Journey**
```
As a Homeowner planning multiple improvement projects,
I want each project inquiry to be handled separately,
So that I can evaluate different contractors and timelines independently.

Customer Experience:
✅ Kitchen quote doesn't affect bathroom pricing
✅ Different sales reps can handle different projects
✅ Project timelines are managed independently
✅ Payment schedules are separate per project
✅ Communication history is organized by project
```

**John's Project Timeline:**
```
Month 1: Submits kitchen remodel inquiry → Lead #1 created
Month 2: Kitchen proposal received → Lead #1 moves to "Proposal"
Month 3: Inquires about solar panels → Lead #2 created
Month 4: Kitchen project approved → Lead #1 converts to "Won"
Month 5: Solar site assessment → Lead #2 moves to "Qualified"
Month 6: Solar installation scheduled → Lead #2 converts to "Won"
```

### **👩‍💻 Marketing Manager - "Lisa"**

#### **Story 4: Campaign Performance Tracking**
```
As a Marketing Manager,
I want to track lead generation and conversion across different campaigns,
So that I can optimize marketing spend and improve ROI.

Acceptance Criteria:
✅ I can see leads by traffic source (Google, Facebook, etc.)
✅ Conversion rates are tracked per product category
✅ Lead quality scores are calculated automatically
✅ Campaign attribution follows the entire lead lifecycle
✅ I can generate reports on lead performance
```

### **🔧 System Administrator - "Mike"**

#### **Story 5: Webhook Integration Management**
```
As a System Administrator,
I want to easily integrate external lead sources via webhooks,
So that leads flow automatically into our CRM without manual entry.

Acceptance Criteria:
✅ Webhook endpoints are reliable and scalable
✅ Lead creation logic handles duplicates intelligently
✅ System provides detailed logs for troubleshooting
✅ Integration works with multiple lead sources
✅ Failed webhooks are retried automatically
```

### **📊 Business Owner - "Robert"**

#### **Story 6: Business Intelligence & Reporting**
```
As a Business Owner,
I want comprehensive analytics on lead performance and sales conversion,
So that I can make data-driven decisions about business growth.

Acceptance Criteria:
✅ Dashboard shows lead pipeline health
✅ Conversion rates by product and sales rep
✅ Revenue forecasting based on lead stages
✅ Customer lifetime value across multiple projects
✅ Performance trends over time
```

#### **Story 7: Executive Dashboard & Strategic KPIs**
```
As a Business Owner,
I want a high-level executive dashboard with key performance indicators,
So that I can quickly assess business health and identify areas needing attention.

Acceptance Criteria:
✅ Real-time business health score with trend indicators
✅ Monthly recurring revenue (MRR) tracking and forecasting
✅ Customer acquisition cost (CAC) and lifetime value (LTV) metrics
✅ Pipeline velocity and conversion rate trends
✅ Team productivity and capacity utilization
✅ Competitive performance benchmarking
✅ Alert system for critical metrics falling below thresholds
```

**Robert's Daily 10-Minute Business Review:**
```
07:30 - Check business health score and overnight alerts
07:35 - Review yesterday's lead generation and conversion metrics
07:38 - Scan team performance and capacity indicators
07:40 - Identify any issues requiring immediate attention
```

### **👩‍💼 Supervisor - "Amanda"**

#### **Story 8: Agent Performance Management**
```
As a Sales Supervisor,
I want to monitor and manage my team's performance across all lead activities,
So that I can provide coaching, optimize assignments, and ensure targets are met.

Acceptance Criteria:
✅ I can see each agent's lead activity volume and quality metrics
✅ Response time tracking and follow-up compliance monitoring
✅ Conversion rates and pipeline progression by agent
✅ Activity logging completeness and data quality scores
✅ Workload distribution and capacity management
✅ Performance trends and coaching opportunity identification
✅ Individual and team goal tracking with progress indicators
```

**Amanda's Daily Team Management:**
```
08:00 - Review overnight lead assignments and agent availability
08:15 - Check yesterday's activity completion and response times
08:30 - Identify agents needing coaching or support
08:45 - Optimize today's lead distribution based on performance
09:00 - One-on-one coaching sessions with underperforming agents
10:00 - Team standup with performance highlights and goals
```

#### **Story 9: Real-Time Team Monitoring**
```
As a Sales Supervisor,
I want real-time visibility into my team's current activities and availability,
So that I can provide immediate support and redistribute workload as needed.

Acceptance Criteria:
✅ Live dashboard showing each agent's current status and activity
✅ Lead assignment queue with priority and aging indicators
✅ Real-time alerts for stuck leads or missed follow-ups
✅ Instant messaging and escalation system for urgent issues
✅ Team capacity view with availability and workload balance
✅ Performance anomaly detection with automatic notifications
```

### **🔧 System Administrator - "David"**

#### **Story 10: System Configuration & Integration Management**
```
As a System Administrator,
I want comprehensive control over system settings, integrations, and data flow,
So that I can ensure optimal performance, security, and reliability.

Acceptance Criteria:
✅ Centralized configuration management for all system components
✅ Integration health monitoring with automatic retry mechanisms
✅ Data flow visualization and bottleneck identification
✅ User access control and permission management
✅ System performance monitoring and alerting
✅ Backup and disaster recovery management
✅ API rate limiting and security configuration
```

#### **Story 11: Advanced Webhook & Automation Management**
```
As a System Administrator,
I want advanced webhook processing and automation rule management,
So that I can ensure reliable lead capture and intelligent routing.

Acceptance Criteria:
✅ Webhook performance analytics and error tracking
✅ Advanced duplicate detection and merge rules
✅ Custom field mapping and data transformation rules
✅ Automated lead scoring and assignment logic
✅ Integration failure recovery and manual intervention tools
✅ Audit logging and compliance reporting
✅ A/B testing for webhook processing algorithms
```

**David's Weekly System Health Review:**
```
Monday: Integration health and performance metrics review
Tuesday: User access audit and security assessment
Wednesday: Webhook analytics and optimization
Thursday: System performance and capacity planning
Friday: Backup verification and disaster recovery testing
```

### **📈 Marketing Director - "Christine"**

#### **Story 12: Multi-Channel Campaign Orchestration**
```
As a Marketing Director,
I want to orchestrate and optimize campaigns across multiple channels,
So that I can maximize lead generation while minimizing acquisition costs.

Acceptance Criteria:
✅ Unified campaign performance dashboard across all channels
✅ Cross-channel attribution and customer journey mapping
✅ Budget allocation optimization with ROI-based recommendations
✅ A/B testing framework for messaging and creative optimization
✅ Automated campaign scaling based on performance thresholds
✅ Competitor analysis and market positioning insights
✅ Lead quality scoring and source optimization
```

**Christine's Campaign Optimization Workflow:**
```
Week 1: Performance analysis and budget reallocation
Week 2: A/B testing setup and creative optimization
Week 3: Channel expansion and new opportunity exploration
Week 4: Strategy refinement and next month's planning
```

#### **Story 13: Advanced Marketing Analytics & Forecasting**
```
As a Marketing Director,
I want predictive analytics and advanced marketing intelligence,
So that I can anticipate market trends and optimize future campaigns.

Acceptance Criteria:
✅ Predictive lead volume forecasting based on historical patterns
✅ Seasonal trend analysis and campaign timing optimization
✅ Customer lifetime value prediction by acquisition channel
✅ Market saturation indicators and expansion opportunity identification
✅ Competitive intelligence and market share analysis
✅ Attribution modeling with customizable lookback windows
✅ Marketing mix modeling for optimal budget allocation
```

#### **Story 14: Brand & Content Performance Tracking**
```
As a Marketing Director,
I want to track brand awareness and content performance impact on lead generation,
So that I can optimize messaging and content strategy for maximum conversion.

Acceptance Criteria:
✅ Content engagement correlation with lead generation
✅ Brand mention tracking and sentiment analysis
✅ Message testing and optimization across all touchpoints
✅ Landing page performance and conversion optimization
✅ Email campaign effectiveness and list health monitoring
✅ Social media impact on lead generation and nurturing
✅ SEO performance and organic lead generation tracking
```

### **🏢 Enterprise Admin - "Michael"**

#### **Story 15: Multi-Workspace Enterprise Management**
```
As an Enterprise Administrator,
I want to manage multiple workspaces and maintain data governance,
So that I can ensure compliance, security, and optimal resource utilization.

Acceptance Criteria:
✅ Centralized user management across all workspaces
✅ Data governance and compliance reporting (GDPR, CCPA, etc.)
✅ Cross-workspace analytics and benchmarking
✅ Resource allocation and cost management per workspace
✅ Security policy enforcement and audit trails
✅ White-label customization and branding management
✅ API usage monitoring and rate limiting per workspace
```

#### **Story 16: Advanced Security & Compliance**
```
As an Enterprise Administrator,
I want comprehensive security controls and compliance monitoring,
So that I can protect sensitive data and meet regulatory requirements.

Acceptance Criteria:
✅ Role-based access control with granular permissions
✅ Data encryption in transit and at rest verification
✅ Audit logging with tamper-proof trail maintenance
✅ Automated compliance reporting and violation alerts
✅ Data retention policy enforcement and automated purging
✅ Third-party integration security assessment and monitoring
✅ Incident response automation and notification systems
```

**Michael's Monthly Governance Review:**
```
Week 1: Security audit and vulnerability assessment
Week 2: Compliance reporting and policy updates
Week 3: User access review and permission optimization
Week 4: Performance analysis and resource planning
```

### **💼 Marketing Operations Manager - "Jennifer"**

#### **Story 17: Marketing Technology Stack Optimization**
```
As a Marketing Operations Manager,
I want to optimize our marketing technology stack and data flow,
So that I can ensure clean data, efficient processes, and maximum ROI.

Acceptance Criteria:
✅ Marketing technology integration health monitoring
✅ Data quality scoring and automated cleansing workflows
✅ Lead routing optimization and response time tracking
✅ Marketing automation workflow performance analysis
✅ Campaign attribution and revenue tracking accuracy
✅ Marketing and sales alignment metrics and reporting
✅ Technology stack ROI analysis and optimization recommendations
```

#### **Story 18: Advanced Lead Intelligence & Scoring**
```
As a Marketing Operations Manager,
I want sophisticated lead scoring and intelligence gathering,
So that I can deliver high-quality, sales-ready leads to the team.

Acceptance Criteria:
✅ Multi-dimensional lead scoring with behavioral and demographic factors
✅ Lead intelligence enrichment from multiple data sources
✅ Predictive lead quality modeling based on historical conversions
✅ Intent data integration and buying signal identification
✅ Lead nurturing workflow optimization based on engagement patterns
✅ Sales feedback integration for continuous scoring improvement
✅ Automated lead qualification and routing based on fit and intent
```

**Jennifer's Lead Quality Optimization Process:**
```
Daily: Monitor lead flow and quality metrics
Weekly: Analyze scoring model performance and adjust parameters
Monthly: Review integration health and data quality improvements
Quarterly: Complete lead scoring model optimization and sales alignment review
```

---

## 🏗️ **Architecture Diagrams**

### **System Overview - High Level**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🏢 LEAD-CENTRIC CRM SYSTEM                           │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   🌐 SOURCES    │    │  🔄 PROCESSING  │    │  💾 STORAGE     │    │  🎨 INTERFACE   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ Website Forms   │────│ Webhook         │────│ Supabase DB     │────│ React Frontend  │
│ Landing Pages   │    │ Processors      │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ Facebook Ads    │    │ ┌─────────────┐ │    │ │  contacts   │ │    │ │ Dashboard   │ │
│ Google Ads      │────│ │Cloudflare   │ │    │ │  leads      │ │────│ │ Lead Views  │ │
│ Phone Calls     │    │ │Worker       │ │────│ │ activities  │ │    │ │ Reports     │ │
│ Walk-ins        │    │ │             │ │    │ │ pipelines   │ │    │ │             │ │
│ Referrals       │    │ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ CRM Systems     │────│ ┌─────────────┐ │    │                 │    │                 │
│                 │    │ │Node.js      │ │    │                 │    │                 │
│                 │    │ │Backend      │ │    │                 │    │                 │
│                 │    │ │             │ │    │                 │    │                 │
│                 │    │ └─────────────┘ │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │                        │
        ▼                        ▼                        ▼                        ▼
   Lead Sources            Smart Processing         Relational Data          User Interface
```

### **Data Flow - Lead Creation Process**

```
🌐 EXTERNAL LEAD SOURCE
        │
        │ HTTP POST /webhooks/[id]
        │ {firstname, lastname, email, 
        │  phone, productid, lead_status}
        ▼
┌─────────────────────────────────────┐
│      🔄 WEBHOOK PROCESSOR           │
│  ┌─────────────────────────────────┐│
│  │ 1. Contact Existence Check      ││
│  │    ├─ CRM ID Match?             ││
│  │    ├─ Phone Number Match?       ││
│  │    └─ Email Match?              ││
│  └─────────────────────────────────┘│
│                 │                   │
│        ┌────────┴────────┐          │
│        ▼                 ▼          │
│  ┌──────────┐    ┌──────────────┐   │
│  │NEW       │    │EXISTING      │   │
│  │CONTACT   │    │CONTACT       │   │
│  └──────────┘    └──────────────┘   │
│        │                 │          │
│        ▼                 ▼          │
│  ┌─────────────────────────────────┐│
│  │ 2. Lead Decision Logic          ││
│  │    ├─ Same Product?             ││
│  │    ├─ Status Keyword?           ││
│  │    ├─ Time Gap < 30 days?       ││
│  │    └─ Not Converted?            ││
│  └─────────────────────────────────┘│
│                 │                   │
│        ┌────────┴────────┐          │
│        ▼                 ▼          │
│  ┌──────────┐    ┌──────────────┐   │
│  │CREATE    │    │UPDATE        │   │
│  │NEW LEAD  │    │EXISTING LEAD │   │
│  └──────────┘    └──────────────┘   │
└─────────────────────────────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────┐
│      💾 DATABASE OPERATIONS         │
│  ┌─────────────────────────────────┐│
│  │ contacts table                  ││
│  │ ├─ INSERT/UPDATE contact       ││
│  │ └─ Link to workspace           ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ leads table                     ││
│  │ ├─ INSERT new lead              ││
│  │ ├─ Link to contact_id           ││
│  │ └─ Set default pipeline stage  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ lead_activities table           ││
│  │ ├─ Log creation activity        ││
│  │ ├─ Track status changes         ││
│  │ └─ Record appointment data      ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│         📤 RESPONSE                 │
│  {                                  │
│    "success": true,                 │
│    "contact_id": "uuid",            │
│    "lead_id": "uuid",               │
│    "message": "Lead created",       │
│    "processing_time": "1234ms"      │
│  }                                  │
└─────────────────────────────────────┘
```

### **Lead Lifecycle - State Machine**

```
                    🌟 LEAD LIFECYCLE STATES 🌟

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  📥 ENTRY POINTS                   🔄 ACTIVE STATES               📊 END STATES │
│                                                                                 │
│  ┌─────────────┐                                                               │
│  │ 🌐 Website  │────┐                                                          │
│  └─────────────┘    │                                                          │
│  ┌─────────────┐    │              ┌─────────────┐                             │
│  │ 📞 Phone    │────┤              │     NEW     │                             │
│  └─────────────┘    │              │   (Stage)   │                             │
│  ┌─────────────┐    │              └──────┬──────┘                             │
│  │ 👥 Referral │────┼─── CREATE ──────────│                                    │
│  └─────────────┘    │                     │                                    │
│  ┌─────────────┐    │                     ▼                                    │
│  │ 📧 Email    │────┤              ┌─────────────┐                             │
│  └─────────────┘    │              │ QUALIFIED   │                             │
│  ┌─────────────┐    │              │  (Stage)    │                             │
│  │ 🔄 Webhook  │────┘              └──────┬──────┘                             │
│  └─────────────┘                          │                                    │
│                                           ▼                                    │
│                                    ┌─────────────┐                             │
│                                    │  PROPOSAL   │                             │
│                                    │   (Stage)   │                             │
│                                    └──────┬──────┘                             │
│                                           │                                    │
│                    ┌──────────────────────┼──────────────────────┐             │
│                    ▼                      ▼                      ▼             │
│             ┌─────────────┐        ┌─────────────┐        ┌─────────────┐      │
│             │     WON     │        │    LOST     │        │  INACTIVE   │      │
│             │ (Converted) │        │ (Rejected)  │        │ (No Response│      │
│             │     💰      │        │     ❌      │        │      😴     │      │
│             └─────────────┘        └─────────────┘        └─────────────┘      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                             📈 STAGE PROGRESSION RULES

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  AUTOMATIC TRIGGERS:                         MANUAL TRIGGERS:                   │
│  ├─ Webhook status updates                   ├─ Agent stage changes             │
│  ├─ Email engagement                         ├─ Call outcomes                   │
│  ├─ Appointment scheduling                   ├─ Meeting results                 │
│  ├─ Form submissions                         ├─ Quote responses                 │
│  └─ Time-based rules                         └─ Manual notes                    │
│                                                                                 │
│  STAGE PROBABILITIES:                        STAGE DURATIONS:                   │
│  ├─ New: 10%                                ├─ New → Qualified: 3-7 days       │
│  ├─ Qualified: 25%                          ├─ Qualified → Proposal: 7-14 days │
│  ├─ Proposal: 60%                           ├─ Proposal → Decision: 14-30 days │
│  ├─ Won: 100%                               └─ Average cycle: 21-45 days       │
│  └─ Lost/Inactive: 0%                                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Database Schema - Entity Relationship**

```
                        🗄️ DATABASE SCHEMA RELATIONSHIPS

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐                     │
│  │   workspaces    │                    │   contacts      │                     │
│  │─────────────────│                    │─────────────────│                     │
│  │ id (PK)         │◄──────────────────►│ workspace_id    │                     │
│  │ name            │                    │ id (PK)         │                     │
│  │ created_at      │                    │ firstname       │                     │
│  │ settings        │                    │ lastname        │                     │
│  └─────────────────┘                    │ email           │                     │
│           │                             │ phone_number    │                     │
│           │                             │ lead_status     │                     │
│           │                             │ lead_source     │                     │
│           │                             │ product         │                     │
│           │                             │ created_at      │                     │
│           │                             └─────────────────┘                     │
│           │                                      │                              │
│           │                                      │ 1:N                          │
│           │                                      ▼                              │
│           │                             ┌─────────────────┐                     │
│           │                             │     leads       │                     │
│           │                             │─────────────────│                     │
│           │                             │ id (PK)         │                     │
│           │                             │ contact_id (FK) │                     │
│           │                             │ workspace_id    │                     │
│           │                             │ product_interest│                     │
│           │                             │ lead_source     │                     │
│           │                             │ stage           │                     │
│           │                             │ estimated_value │                     │
│           │                             │ priority        │                     │
│           │                             │ temperature     │                     │
│           │                             │ is_active       │                     │
│           │                             │ is_converted    │                     │
│           │                             │ converted_at    │                     │
│           │                             │ metadata        │                     │
│           │                             │ tags            │                     │
│           │                             │ created_at      │                     │
│           │                             │ updated_at      │                     │
│           │                             └─────────────────┘                     │
│           │                                      │                              │
│           │                                      │ 1:N                          │
│           │                                      ▼                              │
│           │                             ┌─────────────────┐                     │
│           │                             │ lead_activities │                     │
│           │                             │─────────────────│                     │
│           │                             │ id (PK)         │                     │
│           │                             │ lead_id (FK)    │                     │
│           │                             │ workspace_id    │                     │
│           │                             │ activity_type   │                     │
│           │                             │ title           │                     │
│           │                             │ description     │                     │
│           │                             │ activity_data   │                     │
│           │                             │ outcome         │                     │
│           │                             │ priority        │                     │
│           │                             │ performed_by    │                     │
│           │                             │ is_automated    │                     │
│           │                             │ duration_minutes│                     │
│           │                             │ scheduled_at    │                     │
│           │                             │ completed_at    │                     │
│           │                             │ metadata        │                     │
│           │                             │ created_at      │                     │
│           │                             └─────────────────┘                     │
│           │                                                                     │
│           │ 1:N                                                                 │
│           ▼                                                                     │
│  ┌─────────────────┐                    ┌─────────────────┐                     │
│  │lead_pipeline_   │                    │ lead_custom_    │                     │
│  │    stages       │                    │    fields       │                     │
│  │─────────────────│                    │─────────────────│                     │
│  │ id (PK)         │                    │ id (PK)         │                     │
│  │ workspace_id    │                    │ lead_id (FK)    │◄─────┐              │
│  │ stage_name      │                    │ field_def_id(FK)│      │              │
│  │ stage_slug      │                    │ value           │      │ N:1          │
│  │ color           │                    │ created_at      │      │              │
│  │ stage_order     │                    └─────────────────┘      │              │
│  │ is_default      │                                             │              │
│  │ is_active       │                    ┌─────────────────┐      │              │
│  │ conversion_prob │                    │lead_field_      │      │              │
│  │ created_at      │                    │ definitions     │      │              │
│  └─────────────────┘                    │─────────────────│      │              │
│                                         │ id (PK)         │──────┘              │
│                                         │ workspace_id    │                     │
│                                         │ field_name      │                     │
│                                         │ field_type      │                     │
│                                         │ is_required     │                     │
│                                         │ options         │                     │
│                                         │ created_at      │                     │
│                                         └─────────────────┘                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                              🔗 KEY RELATIONSHIPS

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  🏢 Workspace (1) ────────── (N) 📱 Contacts                                   │
│                                                                                 │
│  📱 Contact (1) ──────────── (N) 🎯 Leads                                      │
│                                                                                 │
│  🎯 Lead (1) ────────────── (N) 📝 Activities                                  │
│                                                                                 │
│  🎯 Lead (1) ────────────── (N) 🏷️ Custom Fields                              │
│                                                                                 │
│  🏢 Workspace (1) ────────── (N) 🏗️ Pipeline Stages                           │
│                                                                                 │
│  🏢 Workspace (1) ────────── (N) 📋 Field Definitions                          │
│                                                                                 │
│  📋 Field Definition (1) ─── (N) 🏷️ Custom Fields                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **API Architecture - Request Flow**

```
                        🌐 API REQUEST FLOW ARCHITECTURE

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  👤 CLIENT REQUEST                                                              │
│                                                                                 │
│  ┌─────────────────┐                                                            │
│  │ React Frontend  │                                                            │
│  │ ┌─────────────┐ │                                                            │
│  │ │ Component   │ │                                                            │
│  │ │ - Lead View │ │────┐                                                       │
│  │ │ - Activity  │ │    │                                                       │
│  │ │ - Pipeline  │ │    │                                                       │
│  │ └─────────────┘ │    │                                                       │
│  │       │         │    │                                                       │
│  │       ▼         │    │                                                       │
│  │ ┌─────────────┐ │    │                                                       │
│  │ │ Services    │ │    │                                                       │
│  │ │ - LeadAPI   │ │    │                                                       │
│  │ │ - Activity  │ │    │                                                       │
│  │ │ - Pipeline  │ │    │                                                       │
│  │ └─────────────┘ │    │                                                       │
│  └─────────────────┘    │                                                       │
│                         │ HTTPS Request                                         │
│                         │ Headers: X-API-Key, Content-Type                     │
│                         │ Method: GET/POST/PUT/DELETE                           │
│                         ▼                                                       │
│                                                                                 │
│  🌍 CLOUDFLARE EDGE                                                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                     ⚡ CLOUDFLARE WORKERS                                   ││
│  │                                                                             ││
│  │  ┌─────────────────┐              ┌─────────────────┐                       ││
│  │  │ 🛡️ Security      │              │ 🚀 Lead API v3   │                       ││
│  │  │ ┌─────────────┐ │              │ ┌─────────────┐ │                       ││
│  │  │ │ CORS        │ │              │ │ /leads      │ │                       ││
│  │  │ │ Rate Limit  │ │              │ │ /activities │ │                       ││
│  │  │ │ Auth Check  │ │──────────────│ │ /pipeline   │ │                       ││
│  │  │ │ Validation  │ │              │ │ /stages     │ │                       ││
│  │  │ └─────────────┘ │              │ └─────────────┘ │                       ││
│  │  └─────────────────┘              │       │         │                       ││
│  │                                   │       ▼         │                       ││
│  │                                   │ ┌─────────────┐ │                       ││
│  │                                   │ │ Business    │ │                       ││
│  │                                   │ │ Logic       │ │                       ││
│  │                                   │ │ - Validation│ │                       ││
│  │                                   │ │ - Transform │ │                       ││
│  │                                   │ │ - Enrichment│ │                       ││
│  │                                   │ └─────────────┘ │                       ││
│  │                                   └─────────────────┘                       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                              │                                  │
│                                              │ Database Query                   │
│                                              │ (Supabase Client)               │
│                                              ▼                                  │
│                                                                                 │
│  💾 DATABASE LAYER                                                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                        🐘 SUPABASE POSTGRESQL                               ││
│  │                                                                             ││
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            ││
│  │  │ 🔐 Row Level     │   │ 📊 Query Engine │   │ 🚀 Real-time    │            ││
│  │  │    Security     │   │                 │   │    Updates      │            ││
│  │  │ ┌─────────────┐ │   │ ┌─────────────┐ │   │ ┌─────────────┐ │            ││
│  │  │ │ Workspace   │ │   │ │ Optimized   │ │   │ │ WebSocket   │ │            ││
│  │  │ │ Isolation   │ │   │ │ Indexes     │ │   │ │ Subscriptions│ │            ││
│  │  │ │ User Perms  │ │   │ │ Query Plans │ │   │ │ Live Updates │ │            ││
│  │  │ │ Data Policy │ │   │ │ Aggregation │ │   │ │             │ │            ││
│  │  │ └─────────────┘ │   │ └─────────────┘ │   │ └─────────────┘ │            ││
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘            ││
│  │                                │                                            ││
│  │                                ▼                                            ││
│  │  ┌───────────────────────────────────────────────────────────────────────┐  ││
│  │  │                     📋 TABLE OPERATIONS                              │  ││
│  │  │                                                                       │  ││
│  │  │  leads ◄─► lead_activities ◄─► lead_custom_fields                    │  ││
│  │  │    ▲              ▲                      ▲                           │  ││
│  │  │    │              │                      │                           │  ││
│  │  │  contacts    lead_pipeline_stages  lead_field_definitions            │  ││
│  │  │                                                                       │  ││
│  │  └───────────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                              │                                  │
│                                              │ Response Data                    │
│                                              ▼                                  │
│                                                                                 │
│  📤 RESPONSE PIPELINE                                                           │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                       🔄 RESPONSE PROCESSING                                ││
│  │                                                                             ││
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            ││
│  │  │ 🔧 Transform     │   │ 📦 Serialize     │   │ ✅ Validate      │            ││
│  │  │                 │   │                 │   │                 │            ││
│  │  │ ┌─────────────┐ │   │ ┌─────────────┐ │   │ ┌─────────────┐ │            ││
│  │  │ │ Data Format │ │   │ │ JSON        │ │   │ │ Schema      │ │            ││
│  │  │ │ Enrichment  │───► │ │ Response    │───► │ │ Validation  │ │            ││
│  │  │ │ Aggregation │ │   │ │ Compression │ │   │ │ Error Check │ │            ││
│  │  │ │ Filtering   │ │   │ │ Headers     │ │   │ │ Status Code │ │            ││
│  │  │ └─────────────┘ │   │ └─────────────┘ │   │ └─────────────┘ │            ││
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                              │                                  │
│                                              │ HTTP Response                    │
│                                              ▼                                  │
│  👤 CLIENT RESPONSE                                                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          📱 FRONTEND UPDATE                                 ││
│  │                                                                             ││
│  │  Success Response:                    Error Response:                       ││
│  │  {                                   {                                      ││
│  │    "success": true,                    "error": "Validation failed",       ││
│  │    "data": [...],                     "code": "INVALID_REQUEST",           ││
│  │    "pagination": {...},               "details": {...},                    ││
│  │    "metadata": {...}                  "request_id": "uuid"                 ││
│  │  }                                   }                                      ││
│  │                                                                             ││
│  │  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            ││
│  │  │ 🔄 State Update  │   │ 🎨 UI Refresh    │   │ 📝 Activity Log  │            ││
│  │  │                 │   │                 │   │                 │            ││
│  │  │ ┌─────────────┐ │   │ ┌─────────────┐ │   │ ┌─────────────┐ │            ││
│  │  │ │ Redux/State │ │   │ │ Component   │ │   │ │ Console Log │ │            ││
│  │  │ │ React State │ │   │ │ Re-render   │ │   │ │ Error Track │ │            ││
│  │  │ │ Cache Update│ │   │ │ Notification│ │   │ │ Performance │ │            ││
│  │  │ │ Local Store │ │   │ │ Progress    │ │   │ │ Analytics   │ │            ││
│  │  │ └─────────────┘ │   │ └─────────────┘ │   │ └─────────────┘ │            ││
│  │  └─────────────────┘   └─────────────────┘   └─────────────────┘            ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Webhook Smart Logic - Decision Tree**

```
                        🧠 WEBHOOK SMART DECISION ALGORITHM

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  📥 WEBHOOK PAYLOAD RECEIVED                                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ {                                                                           ││
│  │   "firstname": "John",                                                      ││
│  │   "lastname": "Doe",                                                        ││
│  │   "email": "john@example.com",                                              ││
│  │   "crm_id": "CRM123",                                                       ││
│  │   "productid": "Solar Panels",                                              ││
│  │   "lead_status": "Qualified"                                                ││
│  │ }                                                                           ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                        │                                        │
│                                        ▼                                        │
│  🔍 STEP 1: CONTACT EXISTENCE CHECK                                             │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                  🔎 Contact Discovery Matrix                                ││
│  │                                                                             ││
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                      ││
│  │  │ 🆔 CRM ID    │    │ 📞 Phone     │    │ ✉️ Email     │                      ││
│  │  │ Match?      │    │ Match?      │    │ Match?      │                      ││
│  │  │             │    │             │    │             │                      ││
│  │  │ Priority: 1 │    │ Priority: 2 │    │ Priority: 3 │                      ││
│  │  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                      ││
│  │         │                  │                  │                             ││
│  │         ▼                  ▼                  ▼                             ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │                    MATCH RESULT                                     │    ││
│  │  │                                                                     │    ││
│  │  │  ✅ FOUND: Existing contact → UPDATE MODE                           │    ││
│  │  │  ❌ NOT FOUND: New contact → CREATE MODE                            │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                        │                                        │
│                           ┌────────────┴────────────┐                           │
│                           ▼                         ▼                           │
│  🆕 NEW CONTACT PATH                    🔄 EXISTING CONTACT PATH                 │
│                                                                                 │
│  ┌─────────────────────┐              ┌─────────────────────────────────────┐   │
│  │ Create Contact      │              │ 🧠 LEAD DECISION ALGORITHM          │   │
│  │ ↓                   │              │                                     │   │
│  │ Create Lead         │              │ ┌─────────────────────────────────┐ │   │
│  │ ↓                   │              │ │ 🔍 Lead Existence Check         │ │   │
│  │ Create Activity     │              │ │                                 │ │   │
│  │ ↓                   │              │ │ Query: SELECT * FROM leads      │ │   │
│  │ Return Success      │              │ │ WHERE contact_id = $1           │ │   │
│  └─────────────────────┘              │ │   AND product_interest = $2     │ │   │
│                                       │ │   AND is_active = true          │ │   │
│                                       │ └─────────────────────────────────┘ │   │
│                                       │                  │                  │   │
│                                       │     ┌────────────┴────────────┐     │   │
│                                       │     ▼                         ▼     │   │
│                                       │ ┌────────────┐        ┌──────────┐  │   │
│                                       │ │ LEAD       │        │ NO LEAD  │  │   │
│                                       │ │ EXISTS     │        │ FOUND    │  │   │
│                                       │ └─────┬──────┘        └─────┬────┘  │   │
│                                       │       │                     │       │   │
│                                       │       ▼                     ▼       │   │
│                                       │ ┌─────────────────┐   ┌───────────┐ │   │
│                                       │ │ 🤔 UPDATE       │   │ CREATE    │ │   │
│                                       │ │ DECISION        │   │ NEW LEAD  │ │   │
│                                       │ │                 │   └───────────┘ │   │
│                                       │ │ ┌─────────────┐ │                 │   │
│                                       │ │ │Status       │ │                 │   │
│                                       │ │ │Keyword?     │ │                 │   │
│                                       │ │ │             │ │                 │   │
│                                       │ │ │✅ Qualified │ │                 │   │
│                                       │ │ │✅ Converted │ │                 │   │
│                                       │ │ │✅ Won       │ │                 │   │
│                                       │ │ │✅ Lost      │ │                 │   │
│                                       │ │ │❌ Interest  │ │                 │   │
│                                       │ │ └─────┬───────┘ │                 │   │
│                                       │ │       │         │                 │   │
│                                       │ │       ▼         │                 │   │
│                                       │ │ ┌─────────────┐ │                 │   │
│                                       │ │ │Time Gap     │ │                 │   │
│                                       │ │ │< 30 days?   │ │                 │   │
│                                       │ │ │             │ │                 │   │
│                                       │ │ │✅ Recent    │ │                 │   │
│                                       │ │ │❌ Old       │ │                 │   │
│                                       │ │ └─────┬───────┘ │                 │   │
│                                       │ │       │         │                 │   │
│                                       │ │       ▼         │                 │   │
│                                       │ │ ┌─────────────┐ │                 │   │
│                                       │ │ │Already      │ │                 │   │
│                                       │ │ │Converted?   │ │                 │   │
│                                       │ │ │             │ │                 │   │
│                                       │ │ │❌ Active    │ │                 │   │
│                                       │ │ │✅ Won       │ │                 │   │
│                                       │ │ └─────┬───────┘ │                 │   │
│                                       │ │       │         │                 │   │
│                                       │ │       ▼         │                 │   │
│                                       │ │ ┌─────────────┐ │                 │   │
│                                       │ │ │ DECISION    │ │                 │   │
│                                       │ │ │             │ │                 │   │
│                                       │ │ │All ✅ →     │ │                 │   │
│                                       │ │ │UPDATE LEAD  │ │                 │   │
│                                       │ │ │             │ │                 │   │
│                                       │ │ │Any ❌ →     │ │                 │   │
│                                       │ │ │CREATE NEW   │ │                 │   │
│                                       │ │ └─────────────┘ │                 │   │
│                                       │ └─────────────────┘                 │   │
│                                       └─────────────────────────────────────┘   │
│                                                        │                        │
│                                                        ▼                        │
│  📝 ACTIVITY TRACKING                                                           │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                          🎯 Activity Generation                             ││
│  │                                                                             ││
│  │  UPDATE SCENARIO:                         CREATE SCENARIO:                  ││
│  │  ├─ Status Updated Activity               ├─ Lead Created Activity          ││
│  │  ├─ Appointment Scheduled Activity       ├─ Initial Contact Activity       ││
│  │  ├─ Conversion Milestone Activity        ├─ Source Attribution Activity    ││
│  │  └─ Progress Tracking Activity           └─ Pipeline Assignment Activity    ││
│  │                                                                             ││
│  │  ACTIVITY METADATA:                                                         ││
│  │  {                                                                          ││
│  │    "activity_type": "status_updated",                                       ││
│  │    "title": "Status: new → qualified",                                      ││
│  │    "description": "Lead status updated via webhook",                        ││
│  │    "is_automated": true,                                                    ││
│  │    "metadata": {                                                            ││
│  │      "webhook": {"id": "...", "source": "..."},                            ││
│  │      "status_change": {"previous": "new", "new": "qualified"},             ││
│  │      "appointment": {"date": "...", "status": "..."}                       ││
│  │    }                                                                        ││
│  │  }                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

                             🎯 DECISION OUTCOMES

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  UPDATE EXISTING LEAD ✅                    CREATE NEW LEAD 🆕                  │
│  ────────────────────────                  ─────────────────────                │
│  ✅ Same CRM ID                            ❌ Different Product                  │
│  ✅ Same Product                           ❌ > 30 Days Gap                     │
│  ✅ Status Keywords                        ❌ Already Converted                  │
│  ✅ < 30 Days                              ❌ No Status Keywords                 │
│  ✅ Not Converted                          ❌ No Existing Contact               │
│                                                                                 │
│  EXAMPLES:                                 EXAMPLES:                            │
│  • "New" → "Qualified"                    • "Bath" → "Kitchen"                 │
│  • "Qualified" → "Converted"              • 31+ days later                     │
│  • Add appointment data                   • Won lead → new inquiry             │
│  • Status progression                     • Different phone/email              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 **User Journey Maps**

### **Sales Agent Daily Workflow**

```
        👩‍💼 SARAH'S DAILY LEAD MANAGEMENT WORKFLOW

🌅 MORNING (8:00 AM - 12:00 PM)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  8:00 AM │ 📊 Dashboard Review                                                  │
│          │ ├─ Check overnight webhook leads                                     │
│          │ ├─ Review pipeline status                                            │
│          │ └─ Prioritize today's follow-ups                                     │
│          │                                                                      │
│  8:30 AM │ 📞 Priority Calls                                                   │
│          │ ├─ Call John Doe (Kitchen Lead - Day 5)                            │
│          │ ├─ Update: "Qualified" → "Proposal"                                 │
│          │ └─ Log activity: 20-min call, budget confirmed                      │
│          │                                                                      │
│  9:15 AM │ ✉️ Email Campaign                                                   │
│          │ ├─ Send solar quote to John Doe (Solar Lead)                       │
│          │ ├─ Attach proposal documents                                         │
│          │ └─ Schedule follow-up for next week                                 │
│          │                                                                      │
│  10:00 AM│ 🔄 Lead Updates                                                     │
│          │ ├─ Kitchen lead: Add $25K estimated value                           │
│          │ ├─ Schedule site measurement                                         │
│          │ └─ Create meeting activity for Thursday                             │
│          │                                                                      │
│  11:00 AM│ 📝 Documentation                                                    │
│          │ ├─ Update lead notes                                                │
│          │ ├─ Add custom fields (roof type, square footage)                   │
│          │ └─ Tag leads for next week's focus                                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

🌞 AFTERNOON (12:00 PM - 6:00 PM)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  1:00 PM │ 🏠 Site Visits                                                      │
│          │ ├─ Drive to Johnson residence                                        │
│          │ ├─ Conduct kitchen measurement                                       │
│          │ └─ Real-time notes on mobile app                                    │
│          │                                                                      │
│  3:00 PM │ 📱 Mobile Lead Management                                           │
│          │ ├─ Quick activity log from car                                       │
│          │ ├─ Upload measurement photos                                         │
│          │ └─ Update lead status to "Site Visited"                            │
│          │                                                                      │
│  4:00 PM │ 💰 Quote Preparation                                               │
│          │ ├─ Use measurement data                                              │
│          │ ├─ Generate PDF quote                                               │
│          │ └─ Create quote activity with $28K value                           │
│          │                                                                      │
│  5:00 PM │ 📊 End-of-Day Review                                               │
│          │ ├─ Check conversion metrics                                          │
│          │ ├─ Plan tomorrow's activities                                        │
│          │ └─ Update lead temperatures                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

🌙 EVENING (6:00 PM+)
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  📱 Mobile Notifications                                                        │
│  ├─ New webhook lead: Pool Installation inquiry                                │
│  ├─ Auto-assigned based on territory                                           │
│  └─ Add to tomorrow's call list                                                │
│                                                                                 │
│  🎯 Weekly Goals Tracking                                                       │
│  ├─ 15 new leads this week ✅                                                  │
│  ├─ 8 leads moved to proposal ✅                                               │
│  ├─ 3 conversions target: 2 achieved 📈                                       │
│  └─ Pipeline value: $180K (↑15%)                                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### **Customer Multi-Project Journey**

```
           🏠 JOHN DOE'S MULTI-PROJECT HOME IMPROVEMENT JOURNEY

📅 TIMELINE: 6-MONTH JOURNEY
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  MONTH 1: KITCHEN INQUIRY                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 🌐 Website Form Submission                                              │   │
│  │ ├─ Product: Kitchen Remodel                                             │   │
│  │ ├─ Budget: $20-30K                                                      │   │
│  │ ├─ Timeline: 2-3 months                                                 │   │
│  │ └─ AUTO: Lead #1 created, Agent assigned                               │   │
│  │                                                                         │   │
│  │ 📞 Sales Call (Day 2)                                                  │   │
│  │ ├─ Agent: Sarah                                                         │   │
│  │ ├─ Duration: 25 minutes                                                 │   │
│  │ ├─ Outcome: Interested, schedule site visit                            │   │
│  │ └─ Status: New → Qualified                                              │   │
│  │                                                                         │   │
│  │ 🏠 Site Visit (Day 8)                                                  │   │
│  │ ├─ Measurements taken                                                   │   │
│  │ ├─ Photos uploaded                                                      │   │
│  │ ├─ Custom quote required                                                │   │
│  │ └─ Status: Qualified → Proposal                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  MONTH 2: KITCHEN PROPOSAL                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 📄 Proposal Delivered                                                  │   │
│  │ ├─ Amount: $27,500                                                      │   │
│  │ ├─ Timeline: 6 weeks                                                    │   │
│  │ ├─ Payment plan options                                                 │   │
│  │ └─ Consideration period: 1 week                                         │   │
│  │                                                                         │   │
│  │ 🤔 Customer Thinking Period                                            │   │
│  │ ├─ Questions via email                                                  │   │
│  │ ├─ Reference check calls                                                │   │
│  │ ├─ Material selections                                                  │   │
│  │ └─ Financing options discussed                                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  MONTH 3: SOLAR INQUIRY (SEPARATE PROJECT)                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ 🌞 Google Ad Click → Solar Landing Page                                │   │
│  │ ├─ Product: Solar Installation                                          │   │
│  │ ├─ Monthly Bill: $250                                                   │   │
│  │ ├─ Roof Type: Shingle                                                   │   │
│  │ └─ AUTO: Lead #2 created (SAME CONTACT)                                │   │
│  │                                                                         │   │
│  │ 📱 Immediate Response (Webhook)                                        │   │
│  │ ├─ SMS auto-response: "Thanks for solar interest!"                     │   │
│  │ ├─ Agent: Mike (Solar Specialist)                                      │   │
│  │ ├─ Different rep due to product specialization                         │   │
│  │ └─ No interference with kitchen project                                │   │
│  │                                                                         │   │
│  │ 🔍 Solar Assessment                                                    │   │
│  │ ├─ Satellite roof analysis                                              │   │
│  │ ├─ Utility bill review                                                  │   │
│  │ ├─ Savings calculation                                                  │   │
│  │ └─ Status: New → Qualified                                              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  MONTH 4: KITCHEN CONVERSION                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ✅ Kitchen Project Approved                                            │   │
│  │ ├─ Contract signed: $27,500                                             │   │
│  │ ├─ Deposit: $5,000                                                      │   │
│  │ ├─ Start date: May 15th                                                 │   │
│  │ └─ AUTO: Lead #1 status → Won, Revenue attributed                      │   │
│  │                                                                         │   │
│  │ 🔨 Project Management                                                  │   │
│  │ ├─ Material ordering                                                    │   │
│  │ ├─ Permit applications                                                  │   │
│  │ ├─ Contractor scheduling                                                │   │
│  │ └─ Customer portal access                                               │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  MONTH 5: SOLAR PROPOSAL                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ☀️ Solar Proposal Ready                                                │   │
│  │ ├─ System size: 7.2 kW                                                  │   │
│  │ ├─ Cost: $18,900 (after incentives)                                    │   │
│  │ ├─ ROI: 8.5 years                                                       │   │
│  │ └─ Status: Qualified → Proposal                                         │   │
│  │                                                                         │   │
│  │ 💡 Customer Confidence Building                                        │   │
│  │ ├─ Satisfied with kitchen progress                                      │   │
│  │ ├─ Trust in company established                                         │   │
│  │ ├─ Existing customer discount                                           │   │
│  │ └─ Faster decision timeline                                             │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  MONTH 6: SOLAR CONVERSION                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │ ⚡ Solar Project Approved                                              │   │
│  │ ├─ Leveraged kitchen satisfaction                                       │   │
│  │ ├─ Bundle discount applied                                              │   │
│  │ ├─ Final price: $17,500                                                 │   │
│  │ └─ AUTO: Lead #2 status → Won                                           │   │
│  │                                                                         │   │
│  │ 📊 Customer Lifetime Value                                             │   │
│  │ ├─ Kitchen: $27,500                                                     │   │
│  │ ├─ Solar: $17,500                                                       │   │
│  │ ├─ Total: $45,000                                                       │   │
│  │ └─ Future opportunities: HVAC, Bathroom, Pool                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

🎯 CUSTOMER EXPERIENCE BENEFITS:
├─ Separate sales processes for each project
├─ Independent timelines and decisions  
├─ No confusion between projects
├─ Specialized agents per product
├─ Leveraged trust for cross-selling
└─ Complete interaction history per project
```

---

## 🎨 **System Architecture Diagrams**

### **System Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                          LEAD-CENTRIC CRM SYSTEM ARCHITECTURE                           │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ 🌐 LEAD SOURCES LAYER                                                                     │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Website      │  │ Landing      │  │ Facebook     │  │ Google       │                 │
│  │ Forms        │  │ Pages        │  │ Ads          │  │ Ads          │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                 │                 │                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Phone        │  │ Walk-ins     │  │ Referrals    │  │ CRM          │                 │
│  │ Calls        │  │              │  │              │  │ Systems      │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                 │                 │                 │                          │
└─────────┼─────────────────┼─────────────────┼─────────────────┼──────────────────────────┘
          │                 │                 │                 │
          └─────────┬───────┴─────────┬───────┴─────────┬───────┘
                    │                 │                 │
┌───────────────────┼─────────────────┼─────────────────┼──────────────────────────────────┐
│ 🔄 PROCESSING LAYER                 │                 │                                  │
├─────────────────────────────────────┼─────────────────┼──────────────────────────────────┤
│                                     │                 │                                  │
│ ┌─── WEBHOOK PROCESSORS ────────────┼─────────────────┼────────────────────────────────┐ │
│ │                                   ▼                 ▼                                │ │
│ │  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐                │ │
│ │  │ Cloudflare       │   │ Node.js          │   │ Supabase         │                │ │
│ │  │ Worker           │   │ Backend          │   │ Edge             │                │ │
│ │  │ (Smart Logic)    │   │ (Legacy Support) │   │ (Real-time)      │                │ │
│ │  └────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘                │ │
│ └───────────┼──────────────────────┼──────────────────────┼──────────────────────────┘ │
│             │                      │                      │                            │
│             └──────────────────────┼──────────────────────┘                            │
│                                    │                                                   │
│ ┌─── BUSINESS LOGIC ────────────────┼─────────────────────────────────────────────────┐ │
│ │                                   ▼                                                 │ │
│ │  ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐                │ │
│ │  │ Contact          │   │ Lead             │   │ Activity         │                │ │
│ │  │ Check            │──>│ Decision         │──>│ Tracking         │                │ │
│ │  └──────────────────┘   └──────────────────┘   └────────┬─────────┘                │ │
│ │                                                          │                          │ │
│ │  ┌──────────────────────────────────────────────────────┘                          │ │
│ │  │                                                                                  │ │
│ │  ▼                                                                                  │ │
│ │  ┌──────────────────┐                                                              │ │
│ │  │ Validation &     │                                                              │ │
│ │  │ Security         │                                                              │ │
│ │  └────────┬─────────┘                                                              │ │
│ └───────────┼────────────────────────────────────────────────────────────────────────┘ │
└─────────────┼──────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 💾 DATA LAYER - SUPABASE DATABASE                                                        │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐                       │
│  │ contacts    │────>│ leads       │────>│ lead_activities     │                       │
│  └─────────────┘     └─────┬───────┘     └─────────────────────┘                       │
│                            │                                                            │
│                            ├───────>┌──────────────────────┐                            │
│                            │        │ lead_custom_fields   │                            │
│                            │        └──────────┬───────────┘                            │
│                            │                   │                                        │
│                            │        ┌──────────┴───────────┐                            │
│                            │        │ lead_field_          │                            │
│                            │        │ definitions          │                            │
│                            │        └──────────────────────┘                            │
│                            │                                                            │
│                            └───────>┌──────────────────────┐                            │
│                                     │ lead_pipeline_stages │                            │
│                                     └──────────────────────┘                            │
│                                                                                         │
└─────────────┬───────────────────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 🚀 API LAYER                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────┐      ┌─────────────────────────────────┐          │
│  │ API v3 (Cloudflare Workers)     │      │ Legacy APIs (Node.js)           │          │
│  │ • /leads                         │      │ • Contact endpoints             │          │
│  │ • /activities                    │      │ • Reports                       │          │
│  │ • /pipeline                      │      │ • Analytics                     │          │
│  └────────────┬────────────────────┘      └────────────┬────────────────────┘          │
│               │                                        │                                │
└───────────────┼────────────────────────────────────────┼────────────────────────────────┘
                │                                        │
                ▼                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎨 PRESENTATION LAYER - REACT FRONTEND                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ Dashboard    │  │ Lead Views   │  │ Activity     │  │ Pipeline     │               │
│  │              │  │              │  │ History      │  │ Management   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                                         │
│  ┌──────────────┐                                                                       │
│  │ Reports      │                                                                       │
│  │              │                                                                       │
│  └──────────────┘                                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘


DATA FLOW:
═══════════════════════════════════════════════════════════════════════════════════════════
1. Lead Sources → Processing Layer (Webhook Processors)
2. Webhook Processors → Business Logic (Contact Check → Lead Decision → Activity Tracking)
3. Business Logic → Validation & Security
4. Validated Data → Database Layer (Supabase)
5. Database ← API Layer ← Presentation Layer (User Interface)
6. Real-time updates flow bidirectionally between Database and Frontend
```

### **Lead Lifecycle State Machine**

```
                          LEAD LIFECYCLE STATE MACHINE
                          ═══════════════════════════

                                  ┌─────────────┐
                                  │   START     │
                                  │   (Entry)   │
                                  └──────┬──────┘
                                         │
                                         │ Lead Created
                                         │
                                         ▼
                          ┌──────────────────────────────┐
                          │         NEW                  │
                          │                              │
                          │  Entry Activities:           │
                          │  • Lead Created              │
                          │  • Welcome Email             │
                          │  • Agent Assignment          │
                          └──┬─────────────────────┬─────┘
                             │                     │
        ┌────────────────────┼─────────────────────┼────────────────────┐
        │                    │                     │                    │
        │ Agent Call/        │ No Response/        │ Timeout/           │
        │ Webhook Update/    │ Not Interested/     │ No Engagement      │
        │ Form Engagement    │ Budget Mismatch     │                    │
        │                    │                     │                    │
        ▼                    ▼                     ▼                    │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│   QUALIFIED     │  │      LOST       │  │    INACTIVE     │         │
│                 │  │                 │  │                 │         │
│  Engagement     │  │  ❌ Terminal    │  │  😴 Dormant     │         │
│  Activities:    │  │     State       │  │     State       │         │
│  • Discovery    │  │                 │  │                 │         │
│    Call         │  │  ┌───────────┐  │  │  ┌───────────┐  │         │
│  • Needs        │  │  │ Closed/   │  │  │  │ On Hold   │  │         │
│    Assessment   │  │  │ Archived  │  │  │  │ Waiting   │  │         │
│  • Budget       │  │  └─────┬─────┘  │  │  └─────┬─────┘  │         │
│    Discussion   │  │        │        │  │        │        │         │
└────┬─────┬──────┘  │        ▼        │  │        │        │         │
     │     │          │   ┌─────────┐  │  │        │        │         │
     │     │          │   │  END    │  │  │        ▼        │         │
     │     │          │   └─────────┘  │  │  ┌───────────┐  │         │
     │     │          │                │  │  │ Re-engage │  │         │
     │     │          └────────────────┘  │  │ Follow-up │  │         │
     │     │                              │  │ Success   │  │         │
     │     │ Requirements Not Met/        │  └─────┬─────┘  │         │
     │     │ Budget Issues/               │        │        │         │
     │     │ Competition                  │        └────────┼─────────┘
     │     │                              │                 │
     │     └──────────────────────────────┘                 │
     │                                                      │
     │ Site Visit/                                          │
     │ Requirements Met/                                    │
     │ Budget Confirmed                                     │
     │                                                      │
     ▼                                                      │
┌─────────────────┐                                        │
│   PROPOSAL      │                                        │
│                 │                Permanent Loss/         │
│  Sales          │                Contact Unreachable     │
│  Activities:    │                          │             │
│  • Quote        │                          └─────────────┘
│    Generation   │                                        │
│  • Presentation │                                        │
│  • Negotiation  │                                        ▼
└────┬─────┬──────┘                                ┌─────────────────┐
     │     │                                       │      LOST       │
     │     │                                       │  ❌ Terminal    │
     │     │                                       │     State       │
     │     │                                       └────────┬────────┘
     │     │                                                │
     │     │ Proposal Rejected/                             ▼
     │     │ Price Too High/                        ┌─────────────┐
     │     │ Competitor Chosen                      │     END     │
     │     │                                        └─────────────┘
     │     └─────────────────────────────────────────────────────────┐
     │                                                               │
     │ Revision Needed/                                              │
     │ More Information/                                             │
     │ Re-evaluation                                                 │
     │                                                               │
     │  ┌────────────────────────────────────────────────────────────┘
     │  │
     ▼  ▼
     (back to QUALIFIED)

     │
     │ Contract Signed/
     │ Deposit Received/
     │ Project Approved
     │
     ▼
┌─────────────────┐
│      WON        │
│  ✅ Success     │
│     State       │
│                 │
│  Fulfillment    │
│  Activities:    │
│  • Contract     │
│    Processing   │
│  • Project      │
│    Kickoff      │
│  • Delivery     │
│    Management   │
└────────┬────────┘
         │
         │ Project Complete/
         │ Revenue Recognized
         │
         ▼
    ┌─────────┐
    │   END   │
    │ ✓ Done  │
    └─────────┘


STATE SUMMARY:
═══════════════════════════════════════════════════════════════
• NEW          → Entry point for all leads
• QUALIFIED    → Active engagement, budget confirmed
• PROPOSAL     → Quote/proposal stage, negotiation
• WON          → ✅ Contract signed, revenue recognized
• LOST         → ❌ Deal lost, archived
• INACTIVE     → 😴 On hold, can be re-engaged

TRANSITIONS:
═══════════════════════════════════════════════════════════════
Forward Progress:  NEW → QUALIFIED → PROPOSAL → WON
Negative Outcomes: Any State → LOST
Pause/Resume:      Any State → INACTIVE → NEW/QUALIFIED
Revision Loop:     PROPOSAL → QUALIFIED → PROPOSAL
```

### **Smart Lead Decision Algorithm**

```
                         SMART LEAD DECISION ALGORITHM
                         ══════════════════════════════

                              ┌──────────────────────┐
                              │ 📥 Webhook Payload   │
                              │    Received          │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ 🔍 Contact Exists?   │
                              │                      │
                              │ Check:               │
                              │ 1. CRM ID Match      │
                              │ 2. Phone Match       │
                              │ 3. Email Match       │
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼─────────────────────┐
                    │                    │                     │
             CRM/Phone/Email          No Match               │
                  Match                                       │
                    │                    │                     │
                    ▼                    ▼                     │
        ┌────────────────────┐  ┌─────────────────┐           │
        │ 📋 EXISTING        │  │ 🆕 NEW          │           │
        │    CONTACT         │  │    CONTACT      │           │
        └─────────┬──────────┘  └────────┬────────┘           │
                  │                      │                    │
                  │                      ▼                    │
                  │         ┌──────────────────────┐          │
                  │         │ Create Contact       │          │
                  │         │ & Lead               │          │
                  │         └──────────┬───────────┘          │
                  │                    │                      │
                  │                    ▼                      │
                  │         ┌──────────────────────┐          │
                  │         │ Create Activity      │          │
                  │         │ (Log Creation)       │          │
                  │         └──────────┬───────────┘          │
                  │                    │                      │
                  │                    │                      │
                  ▼                    │                      │
     ┌─────────────────────────┐       │                      │
     │ 🎯 Lead Exists?         │       │                      │
     │    Same Product?        │       │                      │
     └──────┬─────────┬────────┘       │                      │
            │         │                │                      │
      No Lead Found   Lead Exists      │                      │
            │         │                │                      │
            ▼         ▼                │                      │
  ┌─────────────┐  ┌─────────────────────────┐               │
  │ 🆕 CREATE   │  │ 🧠 DECISION ALGORITHM   │               │
  │ NEW LEAD    │  │                         │               │
  └──────┬──────┘  └──────────┬──────────────┘               │
         │                    │                              │
         │                    ▼                              │
         │         ┌──────────────────────┐                  │
         │         │ 📊 Status Keyword?   │                  │
         │         │                      │                  │
         │         │ Keywords:            │                  │
         │         │ • qualified          │                  │
         │         │ • converted          │                  │
         │         │ • won                │                  │
         │         └──────┬──────┬────────┘                  │
         │                │      │                           │
         │           No   │      │ Yes                       │
         │                │      │                           │
         │                │      ▼                           │
         │                │  ┌──────────────────────┐        │
         │                │  │ ⏰ Time Gap?         │        │
         │                │  │                      │        │
         │                │  │ Is < 30 days?        │        │
         │                │  └──────┬──────┬────────┘        │
         │                │         │      │                 │
         │                │    No   │      │ Yes             │
         │                │  (Old)  │      │ (Recent)        │
         │                │         │      │                 │
         │                │         │      ▼                 │
         │                │         │  ┌──────────────────┐  │
         │                │         │  │ 🔄 Conversion    │  │
         │                │         │  │    Status?       │  │
         │                │         │  │                  │  │
         │                │         │  │ Already Won?     │  │
         │                │         │  └──────┬──────┬────┘  │
         │                │         │         │      │       │
         │                │         │    Won  │      │Active │
         │                │         │         │      │       │
         ├────────────────┴─────────┴─────────┘      │       │
         │                                           │       │
         ▼                                           ▼       │
  ┌─────────────┐                         ┌──────────────┐  │
  │ Create      │                         │ 🔄 UPDATE    │  │
  │ Activity    │                         │ EXISTING     │  │
  │ (Log        │                         │ LEAD         │  │
  │  Creation)  │                         └──────┬───────┘  │
  └──────┬──────┘                                │          │
         │                                       ▼          │
         │                          ┌─────────────────────┐ │
         │                          │ Update Activities:  │ │
         │                          │ • Status Change     │ │
         │                          │ • Appointment       │ │
         │                          │ • Conversion        │ │
         │                          └──────────┬──────────┘ │
         │                                     │            │
         └─────────────────┬───────────────────┘            │
                           │                                │
                           ▼                                │
                  ┌──────────────────┐                      │
                  │ ✅ SUCCESS       │◄─────────────────────┘
                  │    RESPONSE      │
                  └──────────────────┘


DECISION EXAMPLES:
═══════════════════════════════════════════════════════════════

Example 1: Kitchen → Solar (Different Product)
├─ Contact Exists: ✅
├─ Lead Exists: ❌ (Different product)
└─ Result: CREATE NEW LEAD

Example 2: Kitchen New → Qualified (Status Update)
├─ Contact Exists: ✅
├─ Lead Exists: ✅ (Same product)
├─ Status Keyword: ✅ (qualified)
├─ Time Gap: ✅ (< 30 days)
├─ Conversion Status: Active
└─ Result: UPDATE EXISTING LEAD

Example 3: Kitchen after 31+ days
├─ Contact Exists: ✅
├─ Lead Exists: ✅ (Same product)
├─ Status Keyword: ✅
├─ Time Gap: ❌ (> 30 days)
└─ Result: CREATE NEW LEAD
```

### **Database Entity Relationship**

```mermaid
erDiagram
    WORKSPACES {
        uuid id PK
        text name
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    
    CONTACTS {
        uuid id PK
        text workspace_id FK
        varchar firstname
        varchar lastname
        varchar email
        varchar phone_number
        varchar lead_status
        varchar lead_source
        varchar product
        varchar st_address
        varchar city
        varchar state
        varchar zip
        jsonb tags
        timestamp created_at
        timestamp updated_at
    }
    
    LEADS {
        uuid id PK
        uuid contact_id FK
        text workspace_id
        varchar product_interest
        varchar lead_source
        varchar stage
        decimal estimated_value
        integer probability
        varchar priority
        varchar temperature
        varchar qualification_status
        boolean is_active
        boolean is_converted
        timestamp converted_at
        jsonb metadata
        jsonb tags
        timestamp created_at
        timestamp updated_at
    }
    
    LEAD_ACTIVITIES {
        uuid id PK
        uuid lead_id FK
        text workspace_id
        varchar activity_type
        varchar title
        text description
        jsonb activity_data
        varchar outcome
        varchar priority
        uuid performed_by
        boolean is_automated
        integer duration_minutes
        timestamp scheduled_at
        timestamp completed_at
        jsonb metadata
        timestamp created_at
    }
    
    LEAD_PIPELINE_STAGES {
        uuid id PK
        text workspace_id
        varchar stage_name
        varchar stage_slug
        varchar color
        integer stage_order
        integer conversion_probability
        boolean is_default
        boolean is_active
        timestamp created_at
    }
    
    LEAD_CUSTOM_FIELDS {
        uuid id PK
        uuid lead_id FK
        uuid field_definition_id FK
        text value
        timestamp created_at
        timestamp updated_at
    }
    
    LEAD_FIELD_DEFINITIONS {
        uuid id PK
        text workspace_id
        varchar field_name
        varchar field_type
        boolean is_required
        jsonb options
        timestamp created_at
    }
    
    %% Relationships
    WORKSPACES ||--o{ CONTACTS : "has"
    WORKSPACES ||--o{ LEAD_PIPELINE_STAGES : "defines"
    WORKSPACES ||--o{ LEAD_FIELD_DEFINITIONS : "configures"
    
    CONTACTS ||--o{ LEADS : "generates"
    
    LEADS ||--o{ LEAD_ACTIVITIES : "tracks"
    LEADS ||--o{ LEAD_CUSTOM_FIELDS : "extends"
    
    LEAD_FIELD_DEFINITIONS ||--o{ LEAD_CUSTOM_FIELDS : "defines"
```

### **API Request Flow Sequence**

```mermaid
sequenceDiagram
    participant C as 👤 Client<br/>(React App)
    participant CF as ⚡ Cloudflare<br/>Edge
    participant W as 🔧 Worker<br/>(API v3)
    participant S as 🗄️ Supabase<br/>Database
    participant RT as 📡 Real-time<br/>Updates

    Note over C,RT: Lead Creation Flow

    C->>+CF: POST /api/v3/leads<br/>Headers: X-API-Key<br/>Body: {contact_id, product_interest...}
    
    CF->>+W: Route to Worker<br/>CORS Check<br/>Rate Limiting
    
    W->>W: 🛡️ Validate Request<br/>- Auth Check<br/>- Schema Validation<br/>- Business Rules
    
    W->>+S: Verify Contact Exists<br/>SELECT * FROM contacts<br/>WHERE id = $1
    S-->>-W: Contact Data
    
    W->>W: 🧠 Business Logic<br/>- Get Default Stage<br/>- Enrich Lead Data<br/>- Generate Activity
    
    W->>+S: Create Lead<br/>INSERT INTO leads<br/>VALUES (...)
    S-->>-W: New Lead ID
    
    W->>+S: Create Initial Activity<br/>INSERT INTO lead_activities<br/>VALUES (...)
    S-->>-W: Activity ID
    
    S->>RT: 📡 Real-time Event<br/>Lead Created
    RT-->>C: WebSocket Update<br/>UI Refresh
    
    W-->>-CF: ✅ Success Response<br/>{success: true, lead: {...}}
    CF-->>-C: JSON Response<br/>Status: 201
    
    C->>C: 🎨 Update UI<br/>- Refresh Lead List<br/>- Show Notification<br/>- Update Dashboard

    Note over C,RT: Activity Tracking Flow

    C->>+CF: POST /api/v3/leads/:id/activities<br/>Body: {activity_type, title...}
    
    CF->>+W: Route to Worker
    
    W->>W: 🛡️ Validate Activity<br/>- Lead Exists<br/>- Required Fields<br/>- User Permissions
    
    W->>+S: Insert Activity<br/>UPDATE lead SET last_activity_at<br/>INSERT INTO lead_activities
    S-->>-W: Activity Created
    
    W->>+S: Update Lead Stage<br/>(if stage change)
    S-->>-W: Lead Updated
    
    S->>RT: 📡 Activity Event
    RT-->>C: Live Update
    
    W-->>-CF: ✅ Activity Response
    CF-->>-C: Success

    Note over C,RT: Pipeline Management

    C->>+CF: GET /api/v3/leads/pipeline/:workspace_id
    
    CF->>+W: Route Request
    
    W->>+S: Get Pipeline Data<br/>SELECT leads, stages, activities<br/>WITH aggregations
    S-->>-W: Pipeline Overview
    
    W->>W: 📊 Calculate Metrics<br/>- Stage Counts<br/>- Conversion Rates<br/>- Revenue Projections
    
    W-->>-CF: Pipeline Data
    CF-->>-C: Dashboard Ready

    Note over C,RT: Error Handling

    alt Error Scenario
        C->>CF: Invalid Request
        CF->>W: Bad Data
        W->>W: 🚨 Validation Fails
        W-->>CF: 400 Error Response<br/>{error: "Validation failed"}
        CF-->>C: Error Message
        C->>C: 🔴 Show Error Toast
    end
```

### **User Journey Flow**

```mermaid
journey
    title Sales Agent Daily Lead Management Journey
    
    section Morning Setup
      Check Dashboard          : 5: Agent
      Review New Webhooks      : 4: Agent
      Prioritize Follow-ups    : 5: Agent
      Plan Day Activities      : 4: Agent
    
    section Lead Engagement
      Call Priority Leads      : 5: Agent, Customer
      Update Lead Status       : 5: Agent
      Log Call Activities      : 4: Agent
      Send Follow-up Emails    : 4: Agent
      Schedule Appointments    : 5: Agent, Customer
    
    section Proposal Phase
      Conduct Site Visits      : 5: Agent, Customer
      Generate Quotes          : 4: Agent
      Present Proposals        : 5: Agent, Customer
      Handle Objections        : 3: Agent, Customer
      Negotiate Terms          : 4: Agent, Customer
    
    section Conversion
      Close Won Deals          : 5: Agent, Customer
      Process Contracts        : 4: Agent
      Hand-off to Delivery     : 4: Agent, Operations
      Update CRM Records       : 4: Agent
    
    section End of Day
      Review Pipeline Health   : 4: Agent
      Plan Tomorrow            : 4: Agent
      Update Lead Temperatures : 3: Agent
      Check Performance KPIs   : 5: Agent
```

### **Webhook Processing Decision Tree**

```mermaid
graph TD
    A[📥 Webhook Received] --> B{🔍 Parse Payload}
    B -->|Valid JSON| C[Extract Contact Info]
    B -->|Invalid| Z1[❌ Return 400 Error]
    
    C --> D{👤 Contact Exists?}
    D -->|CRM ID Match| E[📋 Found by CRM ID]
    D -->|Phone Match| F[📞 Found by Phone]
    D -->|Email Match| G[✉️ Found by Email]
    D -->|No Match| H[🆕 New Contact Path]
    
    H --> H1[Create Contact Record]
    H1 --> H2[Create Lead Record]
    H2 --> H3[Create Initial Activity]
    H3 --> H4[✅ Return Success + Lead ID]
    
    E --> I{🎯 Check Existing Leads}
    F --> I
    G --> I
    
    I -->|No Lead for Product| J[🆕 Create New Lead]
    I -->|Lead Exists| K{🧠 Smart Decision Logic}
    
    J --> J1[Create Lead Record]
    J1 --> J2[Create Lead Activity]
    J2 --> J3[✅ Return Success + Lead ID]
    
    K --> L{📊 Status Keyword?}
    L -->|No Status Words| J
    L -->|Has Status Words| M{⏰ Recent Lead?}
    
    M -->|> 30 Days Old| J
    M -->|< 30 Days| N{🏆 Already Won?}
    
    N -->|Already Converted| J
    N -->|Still Active| O[🔄 Update Existing Lead]
    
    O --> O1[Update Lead Status]
    O1 --> O2[Create Status Activity]
    O2 --> O3[Create Appointment Activity]
    O3 --> O4[Create Conversion Activity]
    O4 --> O5[✅ Return Success + Updated]
    
    %% Status Keywords Examples
    L -.-> L1[Keywords: qualified<br/>converted, won, lost<br/>proposal, negotiation]
    
    %% Time Examples
    M -.-> M1[Examples:<br/>Same day: UPDATE<br/>2 weeks: UPDATE<br/>31 days: NEW LEAD]
    
    %% Product Examples
    I -.-> I1[Examples:<br/>Kitchen → Solar: NEW<br/>Kitchen → Kitchen: CHECK<br/>Bath → Pool: NEW]
    
    %% Error Paths
    B -->|Parsing Error| Z2[❌ Return 422 Error]
    C -->|Missing Required Fields| Z3[❌ Return 400 Error]
    H1 -->|Database Error| Z4[❌ Return 500 Error]
    O1 -->|Update Failed| Z5[❌ Return 500 Error]
    
    classDef errorNode fill:#ffebee,stroke:#f44336
    classDef successNode fill:#e8f5e8,stroke:#4caf50
    classDef decisionNode fill:#fff3e0,stroke:#ff9800
    classDef processNode fill:#e3f2fd,stroke:#2196f3
    classDef exampleNode fill:#f3e5f5,stroke:#9c27b0
    
    class Z1,Z2,Z3,Z4,Z5 errorNode
    class H4,J3,O5 successNode
    class B,D,I,K,L,M,N decisionNode
    class C,E,F,G,H1,H2,H3,J1,J2,O1,O2,O3,O4 processNode
    class L1,M1,I1 exampleNode
```

---

**📝 Document Version**: 1.0  
**📅 Last Updated**: September 15, 2025  
**👥 Created By**: Development Team  
**🎯 Purpose**: User Stories & Visual Architecture Documentation  

*These diagrams and stories provide a comprehensive view of how the lead-centric architecture serves real users in real scenarios. The Mermaid diagrams offer interactive, modern visualizations that can be rendered in GitHub, documentation platforms, and development tools.*
