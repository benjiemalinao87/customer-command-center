# Email & SMS Dynamic Variable Support

## Overview
Both Email and SMS nodes now support dynamic variable insertion, allowing users to personalize messages with contact-specific information. This ensures consistency across all communication channels in the Flow Builder.

## Implementation Date
November 17, 2025

## Features

### 1. Variable Insertion UI
Both Email and SMS configuration panels include a "Variable" button (🔧 icon) that opens a dropdown menu with available template variables.

#### Available Variables
- `{{firstname}}` - Contact's first name
- `{{lastname}}` - Contact's last name
- `{{full_name}}` - Contact's full name
- `{{company}}` - Contact's company name
- `{{phone}}` - Contact's phone number
- `{{email}}` - Contact's email address

### 2. Smart Cursor Positioning
When a variable is inserted:
- It's added at the current cursor position
- The cursor is automatically repositioned after the inserted variable
- The field remains focused for continued typing

### 3. Multi-Field Support (Email Only)
The Email node supports variable insertion in both:
- **Subject Line** - Personalize email subjects (e.g., "Hello {{firstname}}, your proposal is ready")
- **Message Body** - Include dynamic content in the email body

### 4. Real-time Preview
Variables are displayed in the `{{variable}}` format, making it easy to see what will be replaced during workflow execution.

## User Experience

### SMS Node
1. Click the "Variable" icon (🔧) in the message text header
2. Select a variable from the dropdown
3. Variable is inserted at cursor position
4. Continue typing or insert more variables

### Email Node
1. Click the "Variable" icon in either the Subject or Message field
2. Active field is tracked automatically based on focus
3. Select a variable from the dropdown
4. Variable is inserted at cursor position in the active field
5. Switch between Subject and Message fields as needed

## Technical Implementation

### Component Updates

#### EmailConfigSidebar.js
**New State Variables:**
```javascript
const [showVariables, setShowVariables] = useState(false);
const [activeField, setActiveField] = useState('body'); // 'subject' or 'body'
const subjectRef = useRef(null);
const bodyRef = useRef(null);
```

**Template Variables Array:**
```javascript
const templateVariables = [
  { name: 'firstname', description: 'Contact\'s first name' },
  { name: 'lastname', description: 'Contact\'s last name' },
  { name: 'full_name', description: 'Contact\'s full name' },
  { name: 'company', description: 'Contact\'s company name' },
  { name: 'phone', description: 'Contact\'s phone number' },
  { name: 'email', description: 'Contact\'s email address' },
];
```

**Insert Variable Function:**
```javascript
const insertVariable = (variable) => {
  const inputRef = activeField === 'subject' ? subjectRef : bodyRef;
  const currentValue = activeField === 'subject' ? subject : body;
  const setValue = activeField === 'subject' ? setSubject : setBody;
  
  if (inputRef.current) {
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const newValue = currentValue.substring(0, start) + 
      `{{${variable}}}` + 
      currentValue.substring(end);
    
    setValue(newValue);
    
    // Focus back and set cursor position
    setTimeout(() => {
      inputRef.current.focus();
      const newPosition = start + variable.length + 4; // 4 for {{ and }}
      inputRef.current.setSelectionRange(newPosition, newPosition);
    }, 0);
  }
};
```

#### SMSConfigDrawer.js
- Already implemented (reference implementation)
- Uses same variable format and insertion logic

### Variable Processing (Backend)

Variables are processed by the Trigger.dev unified workflow:

**Location:** `trigger/unifiedWorkflows.js`

```javascript
// Variables are replaced with actual contact data during execution
const processedMessage = message.replace(/\{\{(\w+)\}\}/g, (match, key) => {
  return contact[key] || match;
});
```

## Benefits

### 1. Personalization
- Increase engagement with personalized messages
- Build stronger relationships with contacts
- Improve conversion rates

### 2. Consistency
- Same variable system across SMS and Email
- Reduces learning curve for users
- Maintains data integrity

### 3. Efficiency
- Quick variable insertion (no manual typing)
- Reduces typos in variable names
- Auto-completion ensures correct syntax

### 4. User-Friendly
- Visual dropdown with descriptions
- Intuitive icon-based UI
- Smart cursor positioning

## Usage Examples

### Email Subject
```
Hello {{firstname}}, your {{company}} proposal is ready
```
Result: "Hello John, your Acme Corp proposal is ready"

### Email Body
```
Dear {{full_name}},

Thank you for choosing {{company}}. Your order has been processed.

If you have any questions, please reply to this email or call us at your convenience.

Best regards,
Support Team
```

### SMS Message
```
Hi {{firstname}}! Your appointment is confirmed for tomorrow at 2 PM. Reply YES to confirm or NO to reschedule.
```

## Testing Checklist

- [x] Variable insertion in Email Subject field
- [x] Variable insertion in Email Message field
- [x] Variable insertion in SMS Message field
- [x] Cursor positioning after insertion
- [x] Multiple variables in same field
- [x] Field focus tracking (Email)
- [x] Popover open/close behavior
- [x] Variable replacement during workflow execution (Subject + Body)
- [x] Complete contact data passed to workflow
- [x] No linter errors
- [x] Consistent UI across SMS and Email
- [x] Deployed to Trigger.dev production (v20251117.4)

## Future Enhancements

### Phase 1 (Planned)
- [ ] Custom variable creation
- [ ] Variable preview with sample data
- [ ] Variable validation warnings

### Phase 2 (Consideration)
- [ ] Advanced templating (if/else conditions)
- [ ] Date/time formatting options
- [ ] Number formatting (currency, phone)
- [ ] Multi-language support

## Related Files

### Frontend
- `/frontend/src/components/flow-builder/drawers/EmailConfigSidebar.js` - Email configuration with variables
- `/frontend/src/components/flow-builder/drawers/SMSConfigDrawer.js` - SMS configuration with variables

### Backend
- `/trigger/unifiedWorkflows.js` - Variable processing and replacement logic

### Documentation
- `/docs/FEATURE_email_sms_dynamic_variables.md` - This file
- `/docs/TRIGGER_FLOW_BUILDER_INTEGRATION.md` - Overall workflow integration

## Lessons Learned

1. **Consistent UX**: Using the same variable system across SMS and Email reduces confusion and training time.

2. **Smart Field Tracking**: Automatically tracking the active field (Subject vs. Message) provides a seamless user experience without requiring explicit selection.

3. **Cursor Positioning**: Maintaining cursor position after variable insertion is critical for smooth typing flow.

4. **Visual Clarity**: Using the `{{variable}}` format makes it immediately clear what will be replaced, unlike other systems that hide the variable syntax.

5. **Component Reusability**: The variable insertion UI (Popover + Button list) is highly reusable and could be extracted into a shared component.

## Support

For questions or issues related to dynamic variables:
1. Check that variables are spelled correctly in the template
2. Verify contact data includes the required fields
3. Test with sample data first
4. Review execution logs in Trigger.dev for variable replacement details

---

**Status:** ✅ Implemented and Production Ready
**Last Updated:** November 17, 2025

