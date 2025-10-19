# Inactivity Logout Implementation

## Overview

Successfully implemented an automatic inactivity-based logout system that logs users out after a period of inactivity without showing warning modals.

## Features Implemented

### ✅ Core Features
- **Automatic Logout**: Users are logged out after configurable period of inactivity
- **No Modal Warning**: Clean logout without interrupting user experience with modals
- **Activity Tracking**: Monitors mouse, keyboard, scroll, and touch events
- **Configurable Timeouts**: Environment-based configuration with sensible defaults
- **Tab Visibility Detection**: Resets timer when user returns to tab
- **Secure Logout**: Properly signs out from Supabase and redirects to login

### ✅ Configuration Options
- **Development**: 5 minutes (for easier testing)
- **Production**: 30 minutes (standard security practice)
- **Custom**: Environment variable override (`REACT_APP_INACTIVITY_TIMEOUT`)

## Files Created/Modified

### New Files
1. **`frontend/src/hooks/useInactivityLogout.js`** - Main hook for inactivity detection
2. **`frontend/src/utils/inactivityConfig.js`** - Configuration management
3. **`frontend/src/utils/README_inactivity_config.md`** - Documentation
4. **`scripts/test-inactivity-logout.js`** - Testing utility
5. **`docs/inactivity-logout-implementation.md`** - This documentation

### Modified Files
1. **`frontend/src/App.js`** - Integrated inactivity system into main app

## How It Works

### Activity Detection
The system monitors these user interactions:
- Mouse movements and clicks
- Keyboard input (keypress, keydown)
- Scrolling and wheel events
- Touch interactions

### Logout Process
1. User becomes inactive for configured period
2. System automatically calls `signOut()` from Supabase
3. User is redirected to `/auth` (login page)
4. No warning or confirmation is shown

### Configuration
```javascript
// Default configurations
const config = {
  development: {
    inactivityTimeout: 5 * 60 * 1000,  // 5 minutes
    checkInterval: 30 * 1000,          // Check every 30 seconds
  },
  production: {
    inactivityTimeout: 30 * 60 * 1000, // 30 minutes
    checkInterval: 60 * 1000,          // Check every minute
  }
};
```

## Testing

### Quick Test Setup
```bash
# Set up test configuration (30 second timeout)
node scripts/test-inactivity-logout.js

# Start development server
cd frontend && npm start

# Login and wait 30 seconds without activity
# You should be automatically logged out

# Restore original configuration
node scripts/test-inactivity-logout.js --restore
```

### Manual Testing
1. Login to the application
2. Stay inactive for the configured timeout period
3. Verify automatic logout and redirect to login page
4. Check browser console for debug messages

## Environment Configuration

### Setting Custom Timeout
Add to your `.env` file:
```bash
# Set timeout in minutes
REACT_APP_INACTIVITY_TIMEOUT=45  # 45 minutes
```

### Available Options
- `15` - 15 minutes (high security)
- `30` - 30 minutes (standard)
- `60` - 1 hour (extended)
- `120` - 2 hours (development)

## Security Benefits

1. **Prevents Session Hijacking**: Automatic logout protects against unauthorized access
2. **No User Disruption**: Silent logout without interrupting workflow
3. **Configurable Security**: Adjust timeout based on security requirements
4. **Reliable Cleanup**: Ensures both client and server sessions are terminated

## Debug Information

### Development Logging
The system logs detailed information in development mode:
- Activity detection events
- Inactivity timer checks
- Logout events and reasons

### Console Messages
```javascript
// Activity detected
"User activity detected, resetting inactivity timer"

// Inactivity check
"Checking inactivity: {timeSinceLastActivity: 180, timeoutLimit: 300, isInactive: false}"

// Logout triggered
"User being logged out due to inactivity"
```

## Integration Details

### In App.js
```javascript
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { getInactivityConfig, formatTimeout } from './utils/inactivityConfig';

// In AppContent component
const inactivityConfig = getInactivityConfig();
const { isMonitoring } = useInactivityLogout(inactivityConfig);
```

### Hook Usage
```javascript
// Basic usage with default config
const { isMonitoring } = useInactivityLogout();

// Custom configuration
const customConfig = {
  inactivityTimeout: 45 * 60 * 1000, // 45 minutes
  checkInterval: 60 * 1000           // Check every minute
};
const { isMonitoring, forceLogout, resetTimer } = useInactivityLogout(customConfig);
```

## Best Practices

1. **Environment-Specific Timeouts**: Use shorter timeouts in development for easier testing
2. **Activity Events**: Monitor comprehensive set of events for accurate activity detection
3. **Tab Visibility**: Reset timer when user returns to prevent unexpected logouts
4. **Graceful Failure**: Always redirect even if logout fails for security
5. **Debug Logging**: Use console logging in development for troubleshooting

## Future Enhancements

Potential improvements that could be added:
- Warning notification before logout (optional)
- User preference for timeout duration
- Different timeouts for different user roles
- Activity-specific timeouts (e.g., longer for active typing)
- Server-side session validation

## Troubleshooting

### Common Issues
1. **Too Frequent Logouts**: Check if timeout is too short for environment
2. **Not Logging Out**: Verify events are being captured, check console logs
3. **Different Environments**: Remember dev vs prod have different default timeouts

### Testing Tips
- Use the test script for quick testing with short timeouts
- Check browser console for debug information
- Test tab switching and return behavior
- Verify redirect to login page works properly
