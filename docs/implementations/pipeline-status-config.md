# Pipeline Status Configuration Implementation Plan

## Overview
This plan outlines the implementation of an admin interface for configuring pipeline statuses, including lead statuses, appointment statuses, and appointment results. These configurations will be stored in Supabase and made available throughout the application, particularly in the contact page and LiveChat user details.

## Database Schema

We'll create the following tables in Supabase:

1. **`status_categories`**
   ```sql
   CREATE TABLE status_categories (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   -- Initial data
   INSERT INTO status_categories (name, description) VALUES 
     ('Lead Status', 'Statuses for tracking lead progression'),
     ('Appointment Status', 'Statuses for tracking appointment progression'),
     ('Appointment Result', 'Results of completed appointments');
   ```

2. **`status_options`**
   ```sql
   CREATE TABLE status_options (
     id SERIAL PRIMARY KEY,
     category_id INTEGER REFERENCES status_categories(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     description TEXT,
     color TEXT,
     is_default BOOLEAN DEFAULT FALSE,
     display_order INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(category_id, name)
   );
   
   -- Initial data
   INSERT INTO status_options (category_id, name, color, is_default, display_order) VALUES 
     (1, 'Lead', '#4285F4', TRUE, 1),
     (1, 'Contacted', '#34A853', FALSE, 2),
     (2, 'Scheduled', '#4285F4', TRUE, 1),
     (2, 'Confirmed', '#34A853', FALSE, 2),
     (2, 'Issued', '#FBBC05', FALSE, 3),
     (2, 'Appointment Completed', '#EA4335', FALSE, 4),
     (3, 'Canceled Appointment', '#EA4335', FALSE, 1),
     (3, 'DNS', '#FBBC05', FALSE, 2);
   ```

3. **Add columns to existing contacts table**
   ```sql
   ALTER TABLE contacts 
   ADD COLUMN lead_status_id INTEGER REFERENCES status_options(id) ON DELETE SET NULL,
   ADD COLUMN appointment_status_id INTEGER REFERENCES status_options(id) ON DELETE SET NULL,
   ADD COLUMN appointment_result_id INTEGER REFERENCES status_options(id) ON DELETE SET NULL;
   ```

## Frontend Implementation

### 1. Admin Configuration Interface

Create a new component for admin configuration:

- **Path**: `/frontend/src/components/admin/StatusConfiguration.tsx`
- **Features**:
  - Tabbed interface for the three status categories
  - CRUD operations for status options
  - Color picker for status colors
  - Drag-and-drop for reordering
  - Option to set default status for each category

Specific Components:
- `StatusCategoryTabs.tsx`: Manages tab selection between categories
- `StatusOptionsList.tsx`: Displays and manages the list of status options
- `StatusOptionEditor.tsx`: Form for creating/editing status options
- `ColorPicker.tsx`: Custom color picker component with preset colors
- `StatusOptionDragList.tsx`: Enables reordering via drag and drop

### 2. Status Services

Create the following service modules for interacting with the status configuration:

- **Path**: `/frontend/src/services/statusService.ts`
- **Functions**:
  ```typescript
  // Fetch all status categories
  export const getStatusCategories = async () => { ... }
  
  // Fetch status options for a specific category
  export const getStatusOptionsByCategory = async (categoryId) => { ... }
  
  // Create new status option
  export const createStatusOption = async (statusOption) => { ... }
  
  // Update existing status option
  export const updateStatusOption = async (id, updates) => { ... }
  
  // Delete status option
  export const deleteStatusOption = async (id) => { ... }
  
  // Reorder status options
  export const reorderStatusOptions = async (categoryId, orderedIds) => { ... }
  
  // Set default status for a category
  export const setDefaultStatus = async (categoryId, statusId) => { ... }
  ```

### 3. Contact Page Integration

Update the contact detail view to display and allow editing of statuses:

- Add new section to the contact detail page for status management
- Create a `ContactStatusSection.tsx` component that will:
  - Display current lead status, appointment status, and appointment result
  - Provide dropdowns for changing each status
  - Use proper color coding based on the status configuration
  - Update the database when statuses change
  - Implement optimistic UI updates

### 4. Integration with LiveChat UserDetails

Modify the `UserDetails.js` component to include status management:

```javascript
// Add to imports
import { useState, useEffect } from 'react';
import { Select, Badge } from '@chakra-ui/react';
import { getStatusOptionsByCategory, updateContactStatus } from '../services/statusService';

// Add to component state
const [leadStatuses, setLeadStatuses] = useState([]);
const [appointmentStatuses, setAppointmentStatuses] = useState([]);
const [appointmentResults, setAppointmentResults] = useState([]);
const [currentLeadStatus, setCurrentLeadStatus] = useState(null);
const [currentAppointmentStatus, setCurrentAppointmentStatus] = useState(null);
const [currentAppointmentResult, setCurrentAppointmentResult] = useState(null);

// Add useEffect to fetch statuses
useEffect(() => {
  const fetchStatuses = async () => {
    const leadStatusData = await getStatusOptionsByCategory(1);
    const appointmentStatusData = await getStatusOptionsByCategory(2);
    const appointmentResultData = await getStatusOptionsByCategory(3);
    
    setLeadStatuses(leadStatusData);
    setAppointmentStatuses(appointmentStatusData);
    setAppointmentResults(appointmentResultData);
    
    if (selectedContact) {
      setCurrentLeadStatus(selectedContact.lead_status_id);
      setCurrentAppointmentStatus(selectedContact.appointment_status_id);
      setCurrentAppointmentResult(selectedContact.appointment_result_id);
    }
  };
  
  fetchStatuses();
}, [selectedContact]);

// Add status change handlers
const handleLeadStatusChange = async (statusId) => {
  setCurrentLeadStatus(statusId);
  await updateContactStatus(selectedContact.id, 'lead_status_id', statusId);
};

// Add similar handlers for appointment status and result

// Add to the rendered JSX between "Tags" and "Quick Actions" sections
<Box p={4} borderBottom="1px" borderColor={borderColor}>
  <Text fontSize="sm" fontWeight="medium" mb={2} color={textColor}>
    Status Information
  </Text>
  
  {/* Lead Status */}
  <FormControl mt={2}>
    <FormLabel fontSize="xs">Lead Status</FormLabel>
    <Select 
      size="sm"
      value={currentLeadStatus || ''}
      onChange={(e) => handleLeadStatusChange(e.target.value)}
    >
      <option value="">Select status</option>
      {leadStatuses.map(status => (
        <option key={status.id} value={status.id}>{status.name}</option>
      ))}
    </Select>
  </FormControl>
  
  {/* Appointment Status */}
  <FormControl mt={2}>
    <FormLabel fontSize="xs">Appointment Status</FormLabel>
    <Select 
      size="sm"
      value={currentAppointmentStatus || ''}
      onChange={(e) => handleAppointmentStatusChange(e.target.value)}
    >
      <option value="">Select status</option>
      {appointmentStatuses.map(status => (
        <option key={status.id} value={status.id}>{status.name}</option>
      ))}
    </Select>
  </FormControl>
  
  {/* Appointment Result - only shown if appointment status is completed */}
  {currentAppointmentStatus && appointmentStatuses.find(s => s.id === currentAppointmentStatus)?.name === 'Appointment Completed' && (
    <FormControl mt={2}>
      <FormLabel fontSize="xs">Appointment Result</FormLabel>
      <Select 
        size="sm"
        value={currentAppointmentResult || ''}
        onChange={(e) => handleAppointmentResultChange(e.target.value)}
      >
        <option value="">Select result</option>
        {appointmentResults.map(result => (
          <option key={result.id} value={result.id}>{result.name}</option>
        ))}
      </Select>
    </FormControl>
  )}
</Box>
```

### 5. Pipeline Stage Visualization

Update the existing pipeline visualization in the contact detail view:

- Replace hardcoded stages in `ContactDetail.js` with dynamic stages from the database
- Modify the styling to use the configured colors
- Update progression logic based on the configured order
- Add visual indicators for the current stage

Create a new component for pipeline visualization:
- **Path**: `/frontend/src/components/common/PipelineProgressBar.tsx`
- Usage:
```jsx
<PipelineProgressBar 
  categoryId={2} // For appointment status
  currentStatusId={contact.appointment_status_id}
/>
```

### 6. Dynamic Opportunity Stages

Update the `OpportunityCreator.js` component to use the dynamic status options:

- Replace the hardcoded `OPPORTUNITY_STAGES` array with data from the status API
- Update the select dropdown to display statuses with their respective colors
- Modify the opportunity creation logic to use the status IDs rather than names

```javascript
// Replace hardcoded stages with state
const [opportunityStages, setOpportunityStages] = useState([]);
const [selectedStageId, setSelectedStageId] = useState(null);

// Add useEffect to fetch stages
useEffect(() => {
  const fetchStages = async () => {
    const stages = await getStatusOptionsByCategory(1); // Lead Status category
    setOpportunityStages(stages);
    if (stages.length > 0) {
      // Set default stage
      const defaultStage = stages.find(stage => stage.is_default) || stages[0];
      setSelectedStageId(defaultStage.id);
    }
  };
  
  fetchStages();
}, []);

// Update the dropdown in the JSX
<FormControl>
  <FormLabel>Stage</FormLabel>
  <Select 
    value={selectedStageId || ''}
    onChange={(e) => setSelectedStageId(e.target.value)}
  >
    {opportunityStages.map((stage) => (
      <option key={stage.id} value={stage.id}>
        {stage.name}
      </option>
    ))}
  </Select>
</FormControl>
```

## Implementation Steps

1. **Database Setup** (Week 1)
   - Create new tables in Supabase
   - Add necessary relationships and RLS policies
   - Create SQL migration scripts for production
   - Write validation queries to verify data integrity

2. **Core Status Service** (Week 1)
   - Create the statusService module
   - Implement CRUD operations for status options
   - Add proper error handling and logging
   - Write unit tests for critical functions

3. **Admin Configuration Interface** (Week 2)
   - Create the StatusConfiguration components
   - Implement CRUD operations in the UI
   - Add validation and error handling
   - Build color picker and drag-and-drop reordering

4. **Contact Page Integration** (Week 3)
   - Update contact detail view with status sections
   - Create the PipelineProgressBar component
   - Test status updates and visualization

5. **LiveChat Integration** (Week 3)
   - Update UserDetails component with status management
   - Ensure consistent styling with contact page
   - Test status updates from the chat interface

6. **Opportunity Integration** (Week 4)
   - Update OpportunityCreator to use dynamic stages
   - Test opportunity creation with different statuses
   - Update any related components or views

7. **Testing and Refinement** (Week 4)
   - Test all integrations end-to-end
   - Fix any bugs or inconsistencies
   - Optimize performance where necessary
   - Add final polish to UI/UX

## Design Considerations

- Follow Mac OS design philosophy with clean, minimalist interfaces
- Use consistent color coding across the application
- Implement proper loading states and error handling
- Ensure responsive design for all interfaces
- Use optimistic updates for a better user experience

## Technical Considerations

- Use TypeScript for type safety
- Keep components small and focused (<200 lines)
- Follow React hooks rules strictly
- Implement proper cleanup for event listeners and subscriptions
- Use consistent error handling and user feedback
- Implement proper data validation before saving to database

## SQL Verification Queries

After implementing the database changes, we can verify the tables and data with these queries:

```sql
-- Verify status_categories table
SELECT * FROM status_categories;

-- Verify status_options table with order
SELECT so.*, sc.name as category_name 
FROM status_options so
JOIN status_categories sc ON so.category_id = sc.id
ORDER BY so.category_id, so.display_order;

-- Verify default statuses for each category
SELECT sc.name as category_name, so.name as default_status
FROM status_categories sc
LEFT JOIN status_options so ON sc.id = so.category_id AND so.is_default = true;

-- Check contacts with statuses
SELECT 
  c.id, 
  c.name, 
  ls.name as lead_status, 
  appt_s.name as appointment_status, 
  appt_r.name as appointment_result
FROM contacts c
LEFT JOIN status_options ls ON c.lead_status_id = ls.id
LEFT JOIN status_options appt_s ON c.appointment_status_id = appt_s.id
LEFT JOIN status_options appt_r ON c.appointment_result_id = appt_r.id
LIMIT 10;
