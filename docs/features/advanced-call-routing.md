# Advanced Call Routing System Design

## 📅 Design Date
**October 5, 2025**

## ✅ Implementation Status
**COMPLETED - October 5, 2025**

All features have been implemented and deployed:
- ✅ Database schema created
- ✅ Backend routing logic implemented
- ✅ Admin UI built and integrated
- ✅ Enhanced call modal with contact context
- ✅ Draggable call modal functionality
- ✅ Call notes with auto-save feature
- ✅ Deployed to production

## 🎯 Objective
Implement a criteria-based call routing system that routes calls based on contact attributes (lead_status, state, tags) before falling back to "ring all agents".

---

## 🔄 New Call Routing Flow

### Simple View
```
Incoming Call
     ↓
Identify Contact
     ↓
┌────────────────────────────┐
│ STEP 1: Direct Assignment │ ← Contact assigned to Agent A?
└────────────────────────────┘   YES → Ring Agent A only
     ↓ NO
┌────────────────────────────┐
│ STEP 2: Routing Rules      │ ← Contact matches rule criteria?
│ - Check lead_status        │   YES → Ring agents from rule
│ - Check state              │
│ - Check tags               │
└────────────────────────────┘
     ↓ NO MATCH
┌────────────────────────────┐
│ STEP 3: Fallback           │ ← Ring ALL agents
└────────────────────────────┘
```

### Detailed Flow
```
┌─────────────────┐
│ Incoming Call   │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ Identify Contact by │
│ Phone Number        │
└────────┬────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌──────────┐
│ Known   │ │ Unknown  │
│ Contact │ │ Caller   │
└────┬────┘ └────┬─────┘
     │           │
     │           ▼
     │      ┌─────────────────┐
     │      │ Ring ALL Agents │
     │      │ (Final Fallback)│
     │      └─────────────────┘
     │
     ▼
┌──────────────────┐
│ STEP 1:          │
│ Check Direct     │
│ Assignment       │
└────┬─────────────┘
     │
┌────┴────┐
│         │
▼         ▼
Has     No Direct
Agent   Assignment
  │         │
  │         ▼
  │    ┌──────────────────┐
  │    │ STEP 2:          │
  │    │ Check Routing    │
  │    │ Rules            │
  │    │ (Criteria-Based) │
  │    └────┬─────────────┘
  │         │
  │    ┌────┴────┐
  │    │         │
  │    ▼         ▼
  │  Matches  No Match
  │  Rule     Found
  │    │         │
  │    │         ▼
  │    │    ┌─────────────────┐
  │    │    │ STEP 3:         │
  │    │    │ Ring ALL Agents │
  │    │    │ (Final Fallback)│
  │    │    └─────────────────┘
  │    │
  │    ▼
  │ ┌──────────────┐
  │ │ Ring Agents  │
  │ │ from Rule    │
  │ └──────────────┘
  │         │
  ▼         │
┌──────────┐│
│ Ring     ││
│ Assigned ││
│ Agent(s) ││
└────┬─────┘│
     │      │
     └──┬───┘
        ▼
┌────────────────┐
│ First to Answer│
│ Gets Call      │
└────────────────┘
```

---

## 📊 Database Schema

### Table: `call_routing_rules`

```sql
CREATE TABLE call_routing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
  is_active BOOLEAN DEFAULT true,
  
  -- Criteria (JSON for flexibility)
  criteria JSONB NOT NULL DEFAULT '{}',
  -- Example: {
  --   "lead_status": ["New", "Contacted"],
  --   "state": ["CA", "NY"],
  --   "tags": ["VIP", "Premium"]
  -- }
  
  -- Routing action
  route_to_agent_ids TEXT[] NOT NULL, -- Array of user IDs to ring
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  
  CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) 
    REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_call_routing_rules_workspace 
  ON call_routing_rules(workspace_id, is_active, priority DESC);

CREATE INDEX idx_call_routing_rules_criteria 
  ON call_routing_rules USING GIN (criteria);
```

---

## 🎯 Routing Criteria

### 1. Lead Status
Match contact's `lead_status` field:
- New
- Contacted
- Qualified
- Proposal
- Negotiation
- Closed Won
- Closed Lost

### 2. State
Match contact's `state` field:
- Two-letter state codes (CA, NY, TX, etc.)
- Useful for geographic routing

### 3. Tags
Match contact's `tags` array:
- VIP
- Premium
- Enterprise
- Support
- Sales
- Custom tags

---

## 🔧 Backend Implementation

### Routing Logic (Pseudocode)

```javascript
async function routeIncomingCall(contactId, workspaceId) {
  // STEP 1: Check direct assignment
  const assignments = await getContactAssignments(contactId, workspaceId);
  if (assignments.length > 0) {
    return { agents: assignments, source: 'direct_assignment' };
  }
  
  // STEP 2: Check routing rules (ordered by priority)
  const contact = await getContact(contactId);
  const rules = await getActiveRoutingRules(workspaceId);
  
  for (const rule of rules) {
    if (matchesCriteria(contact, rule.criteria)) {
      const agents = await getAgentsByIds(rule.route_to_agent_ids);
      return { agents, source: 'routing_rule', rule_id: rule.id };
    }
  }
  
  // STEP 3: Fallback to all agents
  const allAgents = await getAllWorkspaceAgents(workspaceId);
  return { agents: allAgents, source: 'fallback_all' };
}

function matchesCriteria(contact, criteria) {
  // Check lead_status
  if (criteria.lead_status && criteria.lead_status.length > 0) {
    if (!criteria.lead_status.includes(contact.lead_status)) {
      return false;
    }
  }
  
  // Check state
  if (criteria.state && criteria.state.length > 0) {
    if (!criteria.state.includes(contact.state)) {
      return false;
    }
  }
  
  // Check tags (contact must have at least one matching tag)
  if (criteria.tags && criteria.tags.length > 0) {
    const contactTags = contact.tags || [];
    const hasMatchingTag = criteria.tags.some(tag => 
      contactTags.includes(tag)
    );
    if (!hasMatchingTag) {
      return false;
    }
  }
  
  return true; // All criteria matched
}
```

---

## 🎨 Admin UI Design

### Location
`/settings/call-routing` (Admin only)

### Features

1. **Rule List**
   - Display all routing rules
   - Show priority, criteria, and assigned agents
   - Enable/disable toggle
   - Edit/Delete actions
   - Drag-and-drop to reorder priority

2. **Create/Edit Rule Form**
   - Rule name and description
   - Priority slider
   - Criteria builder:
     - Lead Status (multi-select dropdown)
     - State (multi-select dropdown)
     - Tags (multi-select with custom tags)
   - Agent assignment (multi-select)
   - Active/Inactive toggle

3. **Rule Preview**
   - Show which contacts would match this rule
   - Test with sample contact data

---

## 📝 Example Rules

### Rule 1: VIP Customers
```json
{
  "name": "VIP Customer Routing",
  "priority": 100,
  "criteria": {
    "tags": ["VIP", "Premium"]
  },
  "route_to_agent_ids": ["agent_senior1", "agent_senior2"]
}
```

### Rule 2: California Leads
```json
{
  "name": "California Territory",
  "priority": 50,
  "criteria": {
    "state": ["CA"],
    "lead_status": ["New", "Contacted"]
  },
  "route_to_agent_ids": ["agent_west_coast"]
}
```

### Rule 3: Hot Leads
```json
{
  "name": "Hot Leads - Immediate Response",
  "priority": 90,
  "criteria": {
    "lead_status": ["Qualified", "Proposal"],
    "tags": ["Hot"]
  },
  "route_to_agent_ids": ["agent_closer1", "agent_closer2", "agent_closer3"]
}
```

---

## 🧪 Testing Scenarios

### Scenario 1: Direct Assignment (Highest Priority)
- Contact assigned to Agent A
- Contact matches routing rule for Agent B
- **Result:** Rings Agent A only ✅

### Scenario 2: Routing Rule Match
- Contact not assigned
- Contact has lead_status="New" and state="CA"
- Rule matches: "California New Leads" → Agent B
- **Result:** Rings Agent B only ✅

### Scenario 3: Multiple Rule Matches
- Contact matches Rule 1 (priority 50) and Rule 2 (priority 100)
- **Result:** Uses Rule 2 (higher priority) ✅

### Scenario 4: No Match - Fallback
- Contact not assigned
- Contact doesn't match any routing rules
- **Result:** Rings all agents ✅

---

## 🚀 Implementation Summary

### Phase 1: Database ✅ (Completed)
1. ✅ Created `call_routing_rules` table
2. ✅ Added indexes for performance
3. ✅ JSONB criteria support
4. ✅ Priority-based ordering

### Phase 2: Backend ✅ (Completed)
1. ✅ Updated voice webhook routing logic (3-tier system)
2. ✅ Implemented criteria matching function
3. ✅ Added detailed logging for routing decisions
4. ✅ Deployed to Railway

**File:** `backend/inbound-outbound-calling/server.js`
- Lines 471-559: Routing rules implementation
- Criteria matching for lead_status, state, tags
- Priority-ordered rule evaluation

### Phase 3: Frontend UI ✅ (Completed)
1. ✅ Created CallRoutingSettings component
2. ✅ Built rule list view with table
3. ✅ Created rule form (create/edit)
4. ✅ Priority slider for ordering
5. ✅ Implemented enable/disable toggle
6. ✅ Enhanced call modal with contact context

**Files:**
- `frontend/src/components/settings/CallRoutingSettings.js` (New)
- `frontend/src/components/settings/AdvancedSettings.js` (Updated)
- `frontend/src/components/livechat2/CallManager.js` (Enhanced)

**Location:** Settings → Advanced → Call Routing

### Phase 4: Enhanced Call Modal ✅ (Completed)
Added contact context display:
- 👤 Assigned agents
- 📊 Lead status
- 📦 Product
- 🏢 Market
- 📍 State

**Benefits:** Agents have full context before answering calls

### Phase 5: Draggable Call Modal ✅ (Completed)
- ✅ Drag-and-drop functionality
- ✅ Position anywhere on screen
- ✅ Viewport boundary constraints
- ✅ Smooth dragging experience
- ✅ Cursor feedback (grab/grabbing)

### Phase 6: Call Notes with Auto-Save ✅ (Completed)
- ✅ Notes textarea during active calls
- ✅ Auto-loads existing notes when call starts
- ✅ Auto-saves to contact when call ends
- ✅ Resizable textarea (60px-120px)
- ✅ Frosted glass design matching modal
- ✅ Clear placeholder text with instructions

---

## 📱 Enhanced Incoming Call Modal

### Contact Context Display
When a call comes in, agents now see comprehensive contact information:

```
📞 Incoming Call

[Contact Name]
[Phone Number]

👤 Assigned: [Agent Names]     ← Shows assigned agents
📊 Status: [Lead Status]        ← New, Qualified, etc.
📦 Product: [Product Interest]  ← Solar, HVAC, etc.
🏢 Market: [Market Segment]     ← Residential, Commercial
📍 State: [Geographic Location] ← CA, NY, TX, etc.
```

### Implementation Details
**File:** `frontend/src/components/livechat2/CallManager.js`

**Changes:**
1. Enhanced `lookupContactByPhone` to fetch additional fields:
   - `lead_status`
   - `product`
   - `market`
   - `state`
   - `assignedAgents` (via join)

2. Updated call modal UI to display context:
   - Conditional rendering (only shows if data exists)
   - Clean visual hierarchy with badges
   - Consistent styling with frosted glass effect
   - Responsive layout

**Benefits:**
- ✅ Agents know who should handle the call
- ✅ Full customer context before answering
- ✅ Personalized conversation starter
- ✅ Better customer service
- ✅ Faster decision-making

---

## 📝 Call Notes with Auto-Save

### Real-Time Note Taking
During active calls, agents can take notes that are automatically saved to the contact:

```
📞 Call In Progress

[Contact Info Display]

┌─────────────────────────────────┐
│ Take notes during call...       │ ← Notes textarea
│ (auto-saves when call ends)     │
│                                 │
│ [Agent typing notes here...]    │
└─────────────────────────────────┘

[Call Controls]
```

### Implementation Details
**File:** `frontend/src/components/livechat2/CallManager.js`

**Features:**
1. **Auto-Load Notes:** When call is accepted, existing notes are loaded
2. **Real-Time Editing:** Notes can be edited during the call
3. **Auto-Save:** Notes are saved to `contacts.notes` when call ends
4. **Error Handling:** Comprehensive error handling for save failures
5. **UI Design:** Frosted glass textarea matching modal aesthetic

**Technical Implementation:**
- Added `callNotes` state to track notes during call
- Fetch `notes` column from contacts table
- Load existing notes in `acceptCall` function
- Save notes in `endCall` function before call logging
- Update `contacts.notes` field via Supabase
- Clear notes after successful save

**Benefits:**
- ✅ Document call details in real-time
- ✅ No manual save needed (auto-save on call end)
- ✅ Previous notes loaded for context
- ✅ Better customer service with documented history
- ✅ Zero risk of losing notes

---

## 📊 Success Metrics

- ✅ Direct assignments work (already verified)
- ✅ Routing rules match correctly
- ✅ Priority ordering works
- ✅ Fallback to all agents when no match
- ✅ Admin UI is intuitive and easy to use
- ✅ Routing decisions are logged for debugging

---

## 🔮 Future Enhancements

1. **Time-Based Routing**
   - Route based on time of day
   - Business hours vs after hours

2. **Load Balancing**
   - Route to least busy agent
   - Round-robin distribution

3. **Skills-Based Routing**
   - Match contact needs to agent skills
   - Language preferences

4. **AI-Powered Routing**
   - Predict best agent based on historical data
   - Sentiment analysis

---

**Status:** Ready for Implementation
**Next Step:** Create database table and implement backend logic
