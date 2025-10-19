# Pipeline Status Configuration - Implementation Phase 1

This document outlines the implementation plan for the Pipeline Status Configuration feature, focusing on integrating status management into the contact and LiveChat pages.

## Current Status

We already have the following components in place:
1. Database tables and RLS policies for `status_categories` and `status_options`
2. Base implementation of `statusService.js` for CRUD operations
3. `StatusContext.js` for state management

## Implementation Steps

### 1. Database Schema Verification

Run these verification queries in Supabase:

```sql
-- Verify workspace integration
SELECT 
  sc.id, 
  sc.name, 
  w.name as workspace_name,
  u.email as created_by_email
FROM 
  public.status_categories sc
JOIN 
  public.workspaces w ON sc.workspace_id = w.id
LEFT JOIN 
  auth.users u ON sc.created_by = u.id
ORDER BY 
  w.name, sc.name;

-- Verify RLS policies
SELECT
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM
  pg_policies
WHERE
  tablename IN ('status_categories', 'status_options')
ORDER BY
  tablename, policyname;
```

### 2. Admin Interface Implementation

Create a new component: `/frontend/src/components/admin/StatusConfig.js`

```javascript
import React from 'react';
import { useStatus } from '../../contexts/StatusContext';
import {
  Box,
  VStack,
  Heading,
  Button,
  useDisclosure,
  Text
} from '@chakra-ui/react';
import StatusCategoryList from './StatusCategoryList';
import StatusOptionList from './StatusOptionList';
import AddStatusModal from './AddStatusModal';

export const StatusConfig = () => {
  const { 
    categories,
    optionsByCategory,
    isLoading,
    error,
    createOption,
    updateOption,
    deleteOption,
    reorderOptions,
    setDefault
  } = useStatus();
  
  const { isOpen, onOpen, onClose } = useDisclosure();

  if (isLoading) {
    return <Box p={4}>Loading status configuration...</Box>;
  }

  if (error) {
    return (
      <Box p={4} color="red.500">
        Error loading status configuration: {error.message}
      </Box>
    );
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="md">Status Configuration</Heading>
          <Text mt={2} color="gray.600">
            Configure lead statuses, appointment statuses, and appointment results
          </Text>
        </Box>

        {categories.map((category) => (
          <Box key={category.id} borderWidth="1px" borderRadius="lg" p={4}>
            <Heading size="sm" mb={4}>{category.name}</Heading>
            <StatusOptionList
              options={optionsByCategory[category.id] || []}
              onUpdate={updateOption}
              onDelete={deleteOption}
              onReorder={reorderOptions}
              onSetDefault={setDefault}
            />
            <Button size="sm" mt={4} onClick={onOpen}>
              Add {category.name} Option
            </Button>
          </Box>
        ))}
      </VStack>

      <AddStatusModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={createOption}
        categories={categories}
      />
    </Box>
  );
};
```

### 3. Status Integration Components

Create these components:

1. `/frontend/src/components/admin/StatusCategoryList.js` - List of status categories
2. `/frontend/src/components/admin/StatusOptionList.js` - Draggable list of status options
3. `/frontend/src/components/admin/AddStatusModal.js` - Modal for adding/editing statuses

### 4. Contact Status Integration

Update `/frontend/src/components/contacts/ContactDetails.js` to include status selection:

```javascript
import { useStatus } from '../../contexts/StatusContext';

// Inside the ContactDetails component:
const { 
  optionsByCategory,
  updateContactStatusField 
} = useStatus();

// Add status selection UI:
<FormControl>
  <FormLabel>Lead Status</FormLabel>
  <Select
    value={contact.lead_status_id || ''}
    onChange={(e) => updateContactStatusField({
      contact_id: contact.id,
      field: 'lead_status_id',
      status_id: e.target.value ? parseInt(e.target.value) : null
    })}
  >
    <option value="">Select Status</option>
    {optionsByCategory[1]?.map(option => (
      <option key={option.id} value={option.id}>
        {option.name}
      </option>
    ))}
  </Select>
</FormControl>
```

### 5. Testing Plan

1. **Admin Access Control**
   - Verify only admin users can access status configuration
   - Test CRUD operations with admin and non-admin users
   - Verify workspace isolation

2. **Status Management**
   - Test creating new status options
   - Test updating existing options
   - Test deleting options
   - Test reordering via drag and drop
   - Test setting default options

3. **Contact Integration**
   - Test status selection in contact details
   - Verify status updates are reflected immediately
   - Test default status assignment
   - Verify proper error handling

### 6. Next Steps

After completing Phase 1:
1. Add status filters to contact list
2. Implement status change history
3. Add status-based automation rules
