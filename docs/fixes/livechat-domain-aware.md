# LiveChat Domain-Aware API Fix

## Issue Description

The livechat components (both v1 and v2) were not using the new domain-aware `apiUtils.js` functions for API calls. Instead, they were using hardcoded URLs and basic environment variable fallbacks, which prevented them from leveraging the health checking and failover functionality across the two backend domains: `cc.automate8.com` and `api.customerconnects.app`.

## Root Cause

The issue occurred because the livechat components were implemented before the domain-aware API utilities were created. They used direct `fetch()` calls with hardcoded URLs instead of the centralized `fetchWithFailover()` function.

### Affected Files and Issues:

**LiveChat v1:**
- `frontend/src/services/messageStore.js` (lines 51-61, 863): Used custom `getApiUrl()` function with hardcoded fallback
- SMS sending used direct fetch to `/send-sms` endpoint

**LiveChat v2:**
- `frontend/src/services/livechatService.js` (lines 463, 521): Hardcoded URLs for SMS and email sending
- `frontend/src/components/livechat2/compose/ComposeModal.js` (lines 353, 586): Hardcoded URLs for compose modal
- `frontend/src/components/livechat2/ChatArea.js` (lines 350, 953, 2117): Multiple hardcoded API URLs
- `frontend/src/components/livechat2/ScheduleMessageModal.js` (line 131): Hardcoded URL for message scheduling

**LiveChat v1 ChatArea:**
- `frontend/src/components/livechat/ChatArea.js` (lines 529, 640, 744): Multiple hardcoded URLs for testing endpoints

## Solution Implemented

### 1. Added Domain-Aware API Utilities

Imported and used the domain-aware API utilities in all affected files:

```javascript
import { getBaseUrl, fetchWithFailover } from '../utils/apiUtils';
```

### 2. Replaced Direct Fetch Calls

**Before:**
```javascript
const apiUrl = process.env.REACT_APP_API_URL || 'https://cc.automate8.com';
const response = await fetch(`${apiUrl}/send-sms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

**After:**
```javascript
const response = await fetchWithFailover('/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
```

### 3. Updated All API Endpoints

- **SMS Sending**: `/send-sms` endpoint now uses `fetchWithFailover()`
- **Email Sending**: `/api/email/send` endpoint now uses `fetchWithFailover()`
- **Message Scheduling**: `/api/trigger/schedule-until` endpoint now uses `fetchWithFailover()`
- **Twilio Configuration**: `/config/twilio` and related endpoints now use `fetchWithFailover()`

## Files Modified

1. **frontend/src/services/messageStore.js**
   - Removed custom `getApiUrl()` function
   - Added domain-aware API utilities import
   - Updated SMS sending to use `fetchWithFailover()`

2. **frontend/src/services/livechatService.js**
   - Added domain-aware API utilities import
   - Updated SMS and email sending endpoints

3. **frontend/src/components/livechat2/compose/ComposeModal.js**
   - Added domain-aware API utilities import
   - Updated SMS and email sending in compose modal

4. **frontend/src/components/livechat2/ChatArea.js**
   - Added domain-aware API utilities import
   - Updated email notifications, email sending, and message scheduling

5. **frontend/src/components/livechat2/ScheduleMessageModal.js**
   - Added domain-aware API utilities import
   - Updated message scheduling endpoint

6. **frontend/src/components/livechat/ChatArea.js**
   - Added domain-aware API utilities import
   - Updated all testing and configuration endpoints

## Benefits

1. **Automatic Failover**: If `cc.automate8.com` is down, the system automatically tries `api.customerconnects.app`
2. **Health Checking**: Built-in health checks ensure requests go to the most responsive domain
3. **Consistent Error Handling**: Centralized error handling and retry logic
4. **CORS Compatibility**: Proper handling for both backend domains
5. **Performance**: Intelligent routing to the fastest available endpoint

## Testing Recommendations

1. **SMS Sending Test**: Send SMS messages from both livechat v1 and v2
2. **Email Sending Test**: Send emails from both livechat versions
3. **Domain Failover Test**: Block access to one domain and verify automatic failover
4. **Message Scheduling Test**: Schedule messages using both inline and modal schedulers
5. **Error Handling Test**: Test with invalid payloads to verify proper error handling

## Future Considerations

- All new livechat features should use the domain-aware API utilities from the start
- Consider adding monitoring to track which domain is being used most frequently
- Document the domain-aware pattern for other developers

## Related Files

- `frontend/src/utils/apiUtils.js` - Contains the domain-aware utility functions
- Backend endpoints on both domains must maintain identical APIs
- CORS configuration must allow requests from both domains

## Implementation Notes

The fix maintains backward compatibility while adding the new domain-aware functionality. No changes are required to the backend APIs or database structure. The change is purely on the frontend client-side request handling. 