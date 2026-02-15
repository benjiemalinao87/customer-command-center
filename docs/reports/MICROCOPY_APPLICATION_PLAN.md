# Microcopy Improvements - Application Plan

## Overview
This document outlines where to apply the microcopy improvements throughout the application for a more polished, user-friendly experience.

---

## 🎯 High Priority Areas

### 1. **Forms with Validation Errors**

#### LeadActivityCreator.js
- **Location**: `frontend/src/components/board/components/LeadActivityCreator.js`
- **Current**: "Title is required", "Description is required"
- **Improve**: Use microcopy utility for friendly messages
- **Fields to update**:
  - Title field
  - Description field
  - Duration field

#### LeadCreator.js
- **Location**: `frontend/src/components/board/components/LeadCreator.js`
- **Current**: "Product interest is required", "Estimated value must be a number"
- **Improve**: Add friendly error messages and help text
- **Fields to update**:
  - Product interest
  - Estimated value
  - Lead source

#### KeywordForm.js
- **Location**: `frontend/src/components/flow-builder/keywords/components/KeywordForm.js`
- **Current**: "Name is required", "At least one keyword is required"
- **Improve**: More conversational error messages

#### Booking Forms
- **Location**: 
  - `frontend/src/components/calendar/IntegratedBookingForm.tsx`
  - `frontend/src/components/calendar/ChakraBookingForm.tsx`
- **Improve**: Add friendly validation messages and help text

#### ComposeModal.js
- **Location**: `frontend/src/components/livechat2/compose/ComposeModal.js`
- **Improve**: Better error messages for message sending

---

### 2. **Empty States**

#### Flow Builder EmptyState.js
- **Location**: `frontend/src/components/flow-builder/EmptyState.js`
- **Current**: "No results found", "No flows or folders match..."
- **Improve**: Use `getEmptyState()` from microcopy utility
- **Types to update**:
  - `flows` - "No flows yet"
  - `folders` - "No folders yet"
  - `search` - "No results found"

#### EmptyAgentState.js
- **Location**: `frontend/src/components/my-ai-agent/components/EmptyAgentState.js`
- **Current**: "No AI Agents Yet", "No Matching Agents"
- **Improve**: More encouraging, actionable copy

#### BoardWindow.js
- **Location**: `frontend/src/components/board/BoardWindow.js`
- **Current**: "No Boards Available", "No active workspace found"
- **Improve**: 
  - "No active workspace found" → "We couldn't find your workspace. Don't worry, your data is safe. Try refreshing the page."
  - "No Boards Available" → Use `getEmptyState('boards')`

#### ContactsPageV2.js
- **Location**: `frontend/src/components/contactV2/ContactsPageV2.js`
- **Improve**: Enhance empty state with microcopy utility

#### PipelineView.jsx
- **Location**: `frontend/src/components/opportunities/components/PipelineView.jsx`
- **Improve**: Empty state for no opportunities

---

### 3. **Error Handling & Toast Messages**

#### Components with Error Toasts
Apply `getErrorMessage()` from microcopy utility to:

1. **Flow Builder Actions**:
   - `SendEmailNotificationAction.js`
   - `SendSlackNotificationAction.js`
   - `SendTeamsNotificationAction.js`
   - `RunApiRequestAction.js`
   - `LinkShortenerAction.js`
   - `AddInternalNoteAction.js`

2. **Settings Components**:
   - `ConnectorSubmissionForm.js`
   - `AIAppointmentSetterSettings.js`

3. **Tools**:
   - `CustomerProfileForm.js`
   - `RegistrationWizard.js`

4. **Board Components**:
   - `useBoardData.js` - Error handling for board data loading

---

### 4. **Form Help Text & Placeholders**

#### Forms Needing Help Text:
1. **LeadActivityCreator.js**
   - Add help text for activity type selection
   - Add help text for duration, outcome, sentiment

2. **LeadCreator.js**
   - Add help text for lead source, temperature, priority
   - Add placeholders using `getFieldPlaceholder()`

3. **KeywordForm.js**
   - Add help text for keywords and reply text
   - Better placeholders

4. **Booking Forms**
   - Add help text for date/time selection
   - Add help text for attendee information

---

## 🎨 Medium Priority Areas

### 5. **Success Messages**

Apply `getSuccessMessage()` to toast notifications:

- Contact creation/update
- Opportunity creation/update
- Flow save
- Sequence save
- Agent creation
- Settings updates

**Example**:
```javascript
// Before
toast({ title: 'Saved', status: 'success' });

// After
toast({ 
  title: getSuccessMessage('saved'),
  description: "All set! Your changes have been saved.",
  status: 'success' 
});
```

---

### 6. **Loading States**

Add friendly loading messages:
- "Loading your contacts..." instead of "Loading..."
- "Fetching opportunities..." instead of "Loading..."
- "Preparing your dashboard..." instead of "Loading..."

---

### 7. **Confirmation Dialogs**

Improve delete/remove confirmation messages:

**Current**: "Are you sure you want to delete this?"

**Improved**: 
- "Delete this contact?" → "Are you sure? This will permanently remove John Doe from your contacts. This action can't be undone."
- "Remove from board?" → "Remove this contact from the board? They'll still be in your contacts, just not on this board."

---

## 📋 Implementation Checklist

### Phase 1: Forms (High Priority)
- [ ] LeadActivityCreator.js - Error messages & help text
- [ ] LeadCreator.js - Error messages & help text
- [ ] KeywordForm.js - Error messages
- [ ] Booking Forms - Error messages & help text
- [ ] ComposeModal.js - Error messages

### Phase 2: Empty States (High Priority)
- [ ] Flow Builder EmptyState.js - Use microcopy utility
- [ ] EmptyAgentState.js - Enhanced copy
- [ ] BoardWindow.js - Error messages & empty states
- [ ] ContactsPageV2.js - Empty state
- [ ] PipelineView.jsx - Empty state

### Phase 3: Error Handling (High Priority)
- [ ] Flow Builder Actions - Error toasts
- [ ] Settings Components - Error messages
- [ ] Tools Components - Error messages
- [ ] Board Data Loading - Error handling

### Phase 4: Success Messages (Medium Priority)
- [ ] All success toasts - Use getSuccessMessage()
- [ ] Add descriptions to success messages

### Phase 5: Help Text & Placeholders (Medium Priority)
- [ ] Add help text to all form fields
- [ ] Update placeholders using microcopy utility
- [ ] Add tooltips where helpful

---

## 🚀 Quick Wins (Start Here)

1. **Empty States** - Easy to update, high impact
   - Flow Builder EmptyState.js
   - EmptyAgentState.js
   - BoardWindow.js

2. **Error Toasts** - Replace generic errors
   - All Flow Builder Actions
   - Settings components

3. **Form Validation** - Already have utility, just need to apply
   - LeadActivityCreator.js
   - LeadCreator.js
   - KeywordForm.js

---

## 📝 Notes

- All microcopy functions are available in `frontend/src/utils/microcopy.js`
- Import: `import { getFieldError, getFieldHelpText, getFieldPlaceholder, getErrorMessage, getSuccessMessage, getEmptyState } from '../../../utils/microcopy';`
- Keep tone consistent: friendly, helpful, reassuring
- Always provide next steps or context
- Reassure users their data is safe when errors occur
