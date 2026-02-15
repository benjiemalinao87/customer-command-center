# Integration System - Quick Reference Guide

## For Developers

### Adding a New Integration (5 minutes)

1. **Open the config file**
   ```
   frontend/src/config/integrationsConfig.js
   ```

2. **Add your integration to the INTEGRATIONS array**
   ```javascript
   {
     key: 'your-integration',
     name: 'Your Integration',
     category: 'communication', // Choose from categories below
     icon: IconComponent,       // Import from lucide-react
     iconColor: '#HEX_CODE',
     description: 'Short one-liner description',
     longDescription: 'Longer description for tooltip',
     status: 'available',       // or 'connected'
     configureLabel: 'Connect', // or 'Configure'
     features: [
       'Feature 1',
       'Feature 2',
       'Feature 3'
     ],
     setupComplexity: 'easy',   // easy | medium | hard
     requiresAuth: true,
     authType: 'api_key',       // api_key | oauth2 | basic_auth
     documentationUrl: 'https://docs.example.com',
     isPremium: false
   }
   ```

3. **Import the icon at top of file**
   ```javascript
   import { YourIcon } from 'lucide-react';
   ```

4. **Done!** The UI updates automatically.

---

## Available Categories

| Category ID | Display Name | Use For |
|-------------|--------------|---------|
| `communication` | Communication | Phone, SMS, messaging |
| `ai` | AI & Automation | AI models, ML tools |
| `crm` | CRM & Sales | Customer management |
| `marketing` | Marketing & Email | Email, campaigns |
| `collaboration` | Collaboration | Team chat, meetings |
| `analytics` | Analytics & Reporting | Data, insights |
| `ecommerce` | E-commerce | Online stores |
| `productivity` | Productivity | Calendars, tasks |
| `automation` | Workflow Automation | Zapier-like tools |
| `other` | Other Integrations | Miscellaneous |

---

## Property Reference

### Required Properties
```javascript
key: 'unique-id'              // Must be unique
name: 'Display Name'          // User-facing name
category: 'category-id'       // From list above
icon: IconComponent           // Lucide React icon
iconColor: '#HEXCODE'         // Brand color
description: 'Short text'    // 1-2 lines max
status: 'available'           // available | connected
configureLabel: 'Connect'    // Button text
```

### Recommended Properties
```javascript
longDescription: 'Detailed text'     // For tooltip
features: ['Feature 1', ...]         // 3-5 key features
setupComplexity: 'easy'              // easy | medium | hard
requiresAuth: true                   // true | false
authType: 'api_key'                  // api_key | oauth2 | basic_auth
documentationUrl: 'https://...'      // Official docs
isPremium: false                     // true | false
```

---

## Helper Functions

### Quick Examples

```javascript
import {
  getIntegrationsByCategory,
  getIntegrationByKey,
  getCategoriesWithCounts,
  getGroupedIntegrations,
  searchIntegrations
} from './config/integrationsConfig';

// Get all integrations in a category
const aiIntegrations = getIntegrationsByCategory('ai');

// Find specific integration
const twilio = getIntegrationByKey('twilio');

// Get categories with counts
const categories = getCategoriesWithCounts();
// Returns: [{ id, name, description, icon, color, priority, count }, ...]

// Get all integrations grouped by category
const grouped = getGroupedIntegrations();
// Returns: { communication: [...], ai: [...], ... }

// Search integrations
const results = searchIntegrations('email');
// Searches name, description, and features
```

---

## Common Tasks

### Change Integration Status
```javascript
// In integrationsConfig.js, find your integration:
{
  key: 'twilio',
  // ... other properties
  status: 'connected'  // Change to 'available' or 'connected'
}
```

### Mark as Premium
```javascript
{
  key: 'salesforce',
  // ... other properties
  isPremium: true  // Shows premium badge
}
```

### Update Description
```javascript
{
  key: 'openai',
  description: 'New short description',
  longDescription: 'New detailed description for tooltip'
}
```

### Change Category
```javascript
{
  key: 'zapier',
  category: 'automation'  // Move to different category
}
```

---

## Component Usage

### In Settings Window
```javascript
// Already integrated in:
import IntegrationsDashboard from '../settings/IntegrationsDashboard';

// Usage:
<IntegrationsDashboard
  activeConfig={activeConfig}
  inlineMode={false}
/>
```

### Standalone Integration List
```javascript
import IntegrationsList from '../settings/IntegrationsList';

// Usage:
<IntegrationsList
  onSelectIntegration={(name) => console.log('Selected:', name)}
/>
```

---

## Styling Customization

### Category Colors (Chakra UI)
- `purple` - Communication
- `blue` - AI & Automation
- `green` - CRM & Sales
- `orange` - Marketing
- `pink` - Collaboration
- `cyan` - Analytics
- `yellow` - E-commerce
- `teal` - Productivity
- `red` - Automation
- `gray` - Other

### Setup Complexity Colors
- `green` - Easy Setup
- `yellow` - Medium Setup
- `red` - Advanced Setup

---

## File Locations

```
📁 /frontend/src/
├── 📁 config/
│   ├── integrationsConfig.js           ← Main config file
│   └── INTEGRATIONS_README.md          ← Full documentation
├── 📁 components/settings/
│   ├── IntegrationsList.js             ← Simple list view
│   └── IntegrationsDashboard.js        ← Full dashboard
```

---

## Best Practices

### ✅ DO
- Use official brand colors for iconColor
- Keep descriptions concise (1-2 lines)
- List 3-5 most important features
- Use descriptive, clear names
- Test on mobile after adding
- Check dark mode appearance

### ❌ DON'T
- Don't duplicate integration keys
- Don't use invalid category IDs
- Don't hardcode API keys
- Don't skip required properties
- Don't use non-Lucide icons
- Don't make descriptions too long

---

## Troubleshooting

### Integration Not Showing
1. Check category ID is valid
2. Verify key is unique
3. Check icon is imported
4. Clear browser cache
5. Check console for errors

### Icon Not Displaying
1. Verify icon is imported
2. Check icon name is correct
3. Ensure it's from lucide-react
4. Check iconColor is valid hex

### Category Empty
1. Verify integrations have correct category
2. Check category ID matches exactly
3. Ensure category has integrations assigned

### Styling Issues
1. Check color is valid Chakra color
2. Verify hex code format (#RRGGBB)
3. Test in both light and dark mode
4. Check responsive breakpoints

---

## Testing Checklist

- [ ] Integration displays in correct category
- [ ] Icon renders correctly
- [ ] Colors look good (light + dark mode)
- [ ] Description readable
- [ ] Features list displays
- [ ] Button works
- [ ] Tooltip shows
- [ ] Mobile responsive
- [ ] No console errors

---

## Code Snippets

### Full Integration Template
```javascript
{
  // Required
  key: 'integration-name',
  name: 'Integration Name',
  category: 'communication',
  icon: Phone,
  iconColor: '#9061F9',
  description: 'Brief description of what this integration does',
  status: 'available',
  configureLabel: 'Connect',

  // Recommended
  longDescription: 'More detailed description that appears in tooltip',
  features: [
    'Key feature 1',
    'Key feature 2',
    'Key feature 3',
    'Key feature 4',
    'Key feature 5'
  ],
  setupComplexity: 'medium',
  requiresAuth: true,
  authType: 'oauth2',
  documentationUrl: 'https://docs.example.com',
  isPremium: false
}
```

### Adding a Category
```javascript
// In INTEGRATION_CATEGORIES object:
new_category: {
  id: 'new_category',
  name: 'New Category',
  description: 'What this category includes',
  icon: Globe,
  color: 'purple',
  priority: 11
}
```

---

## Getting Help

1. **Read the docs**: `frontend/src/config/INTEGRATIONS_README.md`
2. **Check examples**: Look at existing integrations in config
3. **Search issues**: Check if others had same problem
4. **Ask team**: Post in #engineering channel
5. **Test locally**: Always test before committing

---

## Quick Links

- [Full Documentation](/frontend/src/config/INTEGRATIONS_README.md)
- [Implementation Summary](/INTEGRATION_CATEGORIZATION_SUMMARY.md)
- [UI Comparison](/INTEGRATION_UI_COMPARISON.md)
- [Testing Checklist](/INTEGRATION_TESTING_CHECKLIST.md)
- [Lucide Icons](https://lucide.dev/icons)
- [Chakra UI Colors](https://chakra-ui.com/docs/theming/theme#colors)

---

**Last Updated**: January 13, 2025
**Version**: 1.0.0
**Maintainer**: Engineering Team
