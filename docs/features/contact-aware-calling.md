# Contact-Aware Incoming Call System

## Overview

The Contact-Aware Incoming Call System enhances the voice calling experience by displaying incoming call notifications directly within the contact list when the caller is a known contact. This provides immediate context and reduces modal interruptions, creating a more integrated user experience.

## Features

### ✅ **Core Functionality**.


1. **Contact Lookup**: Automatically identifies incoming callers by phone number across multiple data sources
2. **Inline Notifications**: Shows call notifications directly in the contact list for known contacts
3. **Contextual UI**: Displays caller name, contact info, and call controls inline
4. **Fallback System**: Global modal for unknown callers maintains existing functionality
5. **Call Progress Tracking**: Shows in-progress call status with controls

### ✅ **UI Components**

- **InlineCallNotification**: Overlay notification within contact list items
- **CallInProgressIndicator**: Bottom notification showing active call status
- **Global Fallback Modal**: Traditional modal for unknown callers
- **Call Controls**: Accept/Reject buttons with phone icons

## Technical Architecture

### Data Flow

```
Incoming Call → Phone Number Extraction → Contact Lookup → UI Decision
                                              ↓
                          Known Contact: Inline Notification
                          Unknown Caller: Global Modal
```

### Component Structure

```
TwilioDeviceInitializer (Global State Management)
├── Contact Lookup Service
├── Call State Management  
├── Event Listener System
└── UI Coordination

ContactList (UI Display)
├── InlineCallNotification
├── CallInProgressIndicator
└── Contact Item Rendering
```

## Implementation Details

### 1. Contact Lookup Strategy

The system uses a two-tier approach to find contacts:

#### Primary Lookup - Direct Phone Match
```javascript
const { data } = await supabase
  .from('contacts')
  .select('*')
  .eq('workspace_id', workspaceId)
  .or(`phone.eq.${normalizedPhone},phone.eq.${originalPhone}`);
```

#### Secondary Lookup - Message History
```javascript
const { data } = await supabase
  .from('livechat_messages')
  .select('contact_id, contacts(*)')
  .eq('workspace_id', workspaceId)
  .or(`from_phone.eq.${normalizedPhone},to_phone.eq.${normalizedPhone}`)
  .not('contacts', 'is', null);
```

### 2. Phone Number Normalization

Consistent phone number formatting is critical for matching:

```javascript
const normalizePhoneNumber = (phone) => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  return `+1${digits}`;
};
```

### 3. Global State Management

Cross-component communication uses a global state object:

```javascript
const globalTwilioState = {
  incomingCall: null,
  callNotificationListeners: [],
  currentConnection: null,
  callInProgress: false
};
```

### 4. Event Listener Pattern

Components register for call state updates:

```javascript
// Register listener
addCallNotificationListener(handleCallStateChange);

// Notify all listeners
notifyCallStateChange(callState);

// Cleanup on unmount
removeCallNotificationListener(handleCallStateChange);
```

## UI/UX Design

### Inline Notification Styling

- **Position**: Absolute overlay on contact list item
- **Animation**: Pulse effect for visual attention
- **Colors**: Green theme for incoming calls, blue for in-progress
- **Layout**: Caller info + Accept/Reject buttons
- **Z-index**: Higher than contact items, lower than modals

### Visual Hierarchy

1. **Incoming Call**: Green background, pulse animation, prominent buttons
2. **In Progress**: Blue accent, bottom notification bar
3. **Contact Context**: Contact name replaces phone number when available

## Performance Considerations

### Database Optimization

1. **Indexes Required**:
   - `contacts.phone` (for primary lookup)
   - `livechat_messages.from_phone` (for message history)
   - `livechat_messages.to_phone` (for message history)

2. **Query Efficiency**:
   - Workspace-scoped queries reduce dataset size
   - OR conditions in single query vs multiple round trips
   - Contact join prevents N+1 queries

### Memory Management

1. **Listener Cleanup**: Proper removal prevents memory leaks
2. **State Reset**: Call termination clears all references
3. **Debouncing**: Prevents duplicate processing of same call

## Error Handling

### Graceful Degradation

1. **Contact Lookup Failure**: Falls back to global modal with phone number
2. **Database Error**: Logs error, continues with phone-only display
3. **Missing Contact Data**: Validates object existence before property access

### Recovery Strategies

```javascript
try {
  const contact = await lookupContactByPhone(phone, workspaceId);
  if (contact) {
    // Use inline notification
  } else {
    // Fallback to global modal
  }
} catch (error) {
  console.error('Contact lookup failed:', error);
  // Always show global modal as fallback
  showGlobalIncomingCallUI(connection, phone, '');
}
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing Supabase configuration:

```javascript
const supabaseUrl = 'https://ycwttshvizkotcwwyjpt.supabase.co';
const supabaseKey = 'your-anon-key';
```

### Database Requirements

Ensure the following tables exist with proper relationships:

1. **contacts**: `id`, `phone`, `name`, `workspace_id`
2. **livechat_messages**: `contact_id`, `from_phone`, `to_phone`, `workspace_id`

## Testing

### Test Scenarios

1. **Known Contact Call**: Verify inline notification appears in contact list
2. **Unknown Caller**: Verify global modal appears
3. **Multiple Calls**: Test duplicate call prevention
4. **Call Progression**: Test state transitions (incoming → in-progress → ended)
5. **Contact Lookup**: Test various phone number formats
6. **Error Conditions**: Test database failures, network issues

### Manual Testing Checklist

- [ ] Known contact call shows inline notification
- [ ] Accept button connects call and shows in-progress indicator
- [ ] Reject button terminates call and clears UI
- [ ] Unknown caller shows global modal
- [ ] Phone number normalization works with various formats
- [ ] Component unmounting doesn't break call handling
- [ ] Multiple contacts with same call don't interfere

## Future Enhancements

### Planned Features

1. **Contact Caching**: In-memory cache for frequent callers
2. **Rich Contact Display**: Last conversation snippet in notification
3. **Call History**: Integration with call logs
4. **Custom Ringtones**: Per-contact audio customization
5. **Auto-routing**: Contact-based accept/reject rules

### Performance Improvements

1. **Lazy Loading**: Load contact details on-demand
2. **Batch Lookup**: Multiple contact resolution in single query
3. **WebSocket Updates**: Real-time contact updates
4. **Offline Support**: Cached contact data for offline scenarios

## Troubleshooting

### Common Issues

#### Inline Notification Not Appearing

1. **Check Console**: Look for contact lookup errors
2. **Verify Database**: Ensure contact exists with correct phone number
3. **Phone Format**: Confirm normalization is working
4. **Component State**: Verify ContactList is receiving call state updates

#### Global Modal Always Showing

1. **Database Connection**: Verify Supabase credentials
2. **Workspace ID**: Ensure correct workspace is being queried
3. **Table Structure**: Confirm contacts table schema
4. **Phone Matching**: Check phone number formats in database

#### Call State Not Updating

1. **Listener Registration**: Verify addCallNotificationListener is called
2. **Component Lifecycle**: Check useEffect cleanup
3. **State Synchronization**: Confirm notifyCallStateChange is called
4. **Browser Console**: Look for JavaScript errors

### Debug Logging

Enable debug mode to see detailed call flow:

```javascript
console.log('[ContactList] Call state changed:', callState);
console.log('[TwilioDevice] Contact lookup result:', contact);
console.log('[TwilioDevice] Normalized phone:', normalizedPhone);
```

## Dependencies

- **@supabase/supabase-js**: Database queries
- **@chakra-ui/react**: UI components
- **lucide-react**: Icons
- **react**: Component framework

## Contributing

When making changes to this system:

1. **Test Contact Lookup**: Verify phone number matching works
2. **Test UI States**: Check all call state transitions
3. **Performance**: Monitor database query performance
4. **Error Handling**: Ensure graceful degradation
5. **Documentation**: Update this README with changes

## Support

For issues or questions:

1. Check console logs for error messages
2. Verify database connectivity and schema
3. Test with known phone numbers in contacts table
4. Review call flow in browser dev tools

---

**Status**: ✅ Complete and Production Ready
**Last Updated**: June 1, 2025
**Version**: 1.0.0 