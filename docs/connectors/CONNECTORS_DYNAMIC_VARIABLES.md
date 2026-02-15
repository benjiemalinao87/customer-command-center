# Dynamic Variables in Connectors

**Date**: November 20, 2025  
**Feature**: Variable Picker for Dynamic Field Mapping  
**Status**: ✅ **IMPLEMENTED**

---

## 🎯 Overview

Users can now insert **dynamic variables** into connector configurations instead of hardcoding values. When a connector runs in a flow, these variables are replaced with actual contact data.

### Before (Hardcoded)
```
https://enhance-data-production.up.railway.app/phone?phone=+19096557511
```

### After (Dynamic)
```
https://enhance-data-production.up.railway.app/phone?phone={{contact.phone_number}}
```

---

## ✨ Features Implemented

### 1. Variable Picker Component
- **Location**: `frontend/src/components/connectors/ConnectorBuilder/VariablePicker.jsx`
- **Icon**: `<>` (Code2 icon) button next to input fields
- **Functionality**: Opens a searchable popover with all available fields

### 2. Available Variable Types

#### Contact Fields (System)
```
{{contact.phone_number}}
{{contact.email}}
{{contact.first_name}}
{{contact.last_name}}
{{contact.address}}
{{contact.city}}
{{contact.state}}
{{contact.zip}}
{{contact.created_at}}
{{contact.updated_at}}
```

#### Custom Fields
```
{{contact.custom.score}}
{{contact.custom.status}}
{{contact.custom.lead_source}}
{{contact.custom.notes}}
```

#### Workspace Fields
```
{{workspace.id}}
{{workspace.name}}
{{workspace.timezone}}
```

### 3. Integration Points

Variable Picker is available in:

1. **Endpoint URL** - Main URL input field
2. **Query Parameter Values** - Each param value field
3. **Header Values** - Each header value field
4. **Request Body** - Body template textarea

---

## 🎨 UI/UX

### Variable Picker Popover
- **Search**: Filter fields by name or key
- **Grouped Display**: Fields grouped by category (System, Custom, Workspace)
- **Visual Badges**: Color-coded badges show variable syntax
  - Blue: Contact fields
  - Purple: Custom fields
  - Green: Workspace fields
- **Click to Insert**: Click any field to insert variable at cursor position

### Example UI Flow

1. User types URL: `https://api.example.com/enrich?phone=`
2. User clicks `<>` button
3. Popover opens with searchable field list
4. User searches "phone"
5. User clicks "Phone Number"
6. Variable `{{contact.phone_number}}` is inserted
7. Final URL: `https://api.example.com/enrich?phone={{contact.phone_number}}`

---

## 🔧 Technical Implementation

### Component Structure

```jsx
<VariablePicker
  onInsert={(variable) => {
    // Insert variable into field
    const currentValue = field.value || '';
    updateField(currentValue + variable);
  }}
  buttonSize="sm"  // or "xs" for table cells
  buttonVariant="ghost"
/>
```

### Variable Format
All variables follow the pattern: `{{namespace.field_name}}`

- `contact.*` - Contact system fields
- `contact.custom.*` - Contact custom fields
- `workspace.*` - Workspace fields

### Future Extension Points
The system is designed to easily add:
- `{{flow.*}}` - Flow runtime variables
- `{{trigger.*}}` - Trigger event data
- `{{previous_step.*}}` - Previous action outputs
- `{{user.*}}` - Current user data

---

## 📊 Field Categories

### System Fields (10)
Standard contact fields available in every workspace.

### Custom Fields (4+)
User-defined fields specific to each workspace. In production, these will be fetched from the database dynamically.

### Workspace Fields (3)
Global workspace-level data available to all contacts.

---

## 🚀 Usage Examples

### Example 1: Phone Number Enrichment
```
URL: https://enhance-data-production.up.railway.app/phone?phone={{contact.phone_number}}
```

### Example 2: Email Validation
```
URL: https://api.emailvalidation.com/validate?email={{contact.email}}&name={{contact.first_name}}
```

### Example 3: Address Geocoding
```
URL: https://maps.googleapis.com/geocode?address={{contact.address}},{{contact.city}},{{contact.state}}
```

### Example 4: CRM Sync with Headers
```
URL: https://api.crm.com/contacts
Method: POST
Headers:
  - X-Contact-ID: {{contact.id}}
  - X-Workspace: {{workspace.id}}
Body:
{
  "firstName": "{{contact.first_name}}",
  "lastName": "{{contact.last_name}}",
  "email": "{{contact.email}}",
  "phone": "{{contact.phone_number}}",
  "customFields": {
    "score": "{{contact.custom.score}}",
    "status": "{{contact.custom.status}}"
  }
}
```

---

## 🔄 Runtime Variable Replacement

When a connector executes in a flow:

1. **Trigger**: Flow runs for contact with ID `abc123`
2. **Fetch Data**: System fetches contact data from database
3. **Replace Variables**: All `{{contact.*}}` variables replaced with actual values
4. **Execute Request**: API call made with real data
5. **Store Response**: Response saved to contact record

### Example Runtime Replacement

**Configuration**:
```
URL: https://api.example.com/user?email={{contact.email}}&id={{workspace.id}}
```

**At Runtime** (for contact John Doe in workspace ws_123):
```
URL: https://api.example.com/user?email=john@example.com&id=ws_123
```

---

## 🎯 Benefits

1. **Reusability**: One connector works for all contacts
2. **No Hardcoding**: No need to manually enter values
3. **Dynamic**: Automatically uses current contact data
4. **Flexible**: Mix static and dynamic values
5. **Type-Safe**: Variables validated at runtime
6. **User-Friendly**: Visual picker, no syntax memorization

---

## 📝 Future Enhancements

### Phase 2: Advanced Variables
- [ ] Conditional variables: `{{contact.phone_number || contact.email}}`
- [ ] Transformations: `{{contact.email | lowercase}}`
- [ ] Date formatting: `{{contact.created_at | date:'YYYY-MM-DD'}}`
- [ ] Array access: `{{contact.tags[0]}}`

### Phase 3: Expression Builder
- [ ] Visual expression builder
- [ ] Formula support: `{{contact.score * 2}}`
- [ ] String concatenation: `{{contact.first_name + ' ' + contact.last_name}}`

### Phase 4: Dynamic Field Loading
- [ ] Fetch custom fields from database
- [ ] Workspace-specific field suggestions
- [ ] Recently used fields
- [ ] Field type indicators (string, number, date, etc.)

---

## 🧪 Testing

### Manual Testing Checklist
- [x] Variable picker opens on click
- [x] Search filters fields correctly
- [x] Clicking field inserts variable
- [x] Variable appears in input field
- [x] Multiple variables can be inserted
- [x] Works in URL field
- [x] Works in param value fields
- [x] Works in header value fields
- [x] Works in body textarea
- [x] No linting errors

### Test Scenarios
1. **Insert Single Variable**: Click picker, select field, verify insertion
2. **Insert Multiple Variables**: Insert multiple variables in same field
3. **Search Functionality**: Search for field, verify filtering
4. **Mixed Content**: Combine static text with variables
5. **All Field Types**: Test contact, custom, and workspace fields

---

## 📚 Documentation Updates Needed

- [ ] User guide: How to use variable picker
- [ ] Video tutorial: Creating dynamic connectors
- [ ] API docs: Variable syntax reference
- [ ] Examples: Common use cases with variables

---

## ✅ Summary

**What Changed**:
- ✅ Created `VariablePicker` component
- ✅ Integrated into URL field
- ✅ Integrated into query param values
- ✅ Integrated into header values
- ✅ Integrated into request body
- ✅ Added search functionality
- ✅ Added grouped field display
- ✅ Added visual badges for variable types

**Impact**:
- 🎯 Users can create truly dynamic connectors
- 🚀 One connector works for all contacts
- 💡 No need to hardcode values
- ⚡ Faster connector creation
- 🔧 More flexible API integrations

**Status**: ✅ **READY FOR TESTING**

