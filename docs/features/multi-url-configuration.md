# Multi-URL Configuration and Failover Support

This document explains the multi-URL configuration system that provides failover support for both frontend and backend services.

## Overview

The application now supports multiple backend and frontend URLs for high availability and load distribution. The system automatically fails over to backup URLs when the primary URL becomes unavailable.

## Backend URLs

**Primary**: `https://cc.automate8.com`
**Secondary**: `https://api.customerconnects.app`

## Frontend URLs

**Primary**: `https://cc1.automate8.com`
**Secondary**: `https://dash.customerconnects.app`

## Environment Configuration

### Frontend Environment Variables

```bash
# Multiple URLs separated by commas
REACT_APP_API_URL=https://cc.automate8.com,https://api.customerconnects.app
REACT_APP_FRONTEND_URL=https://cc1.automate8.com,https://dash.customerconnects.app
```

### Backend Environment Variables

```bash
# Multiple frontend URLs for CORS
FRONTEND_URL=https://cc1.automate8.com,https://dash.customerconnects.app
CORS_ORIGIN=https://dash.customerconnects.app
```

## How Failover Works

### Frontend Failover

1. **Health Check**: The system performs health checks on `/health` endpoint
2. **Caching**: Working URLs are cached in `sessionStorage` for performance
3. **Automatic Retry**: When a request fails, it automatically tries the next URL
4. **Fallback**: If all URLs fail, it uses the first URL and lets the app handle errors

### Health Check Endpoint

The backend provides a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2025-01-08T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 12345
}
```

## API Utilities

### Key Functions

- `getBackendUrls()` - Returns array of backend URLs
- `getFrontendUrls()` - Returns array of frontend URLs
- `getHealthyBackendUrl()` - Returns first healthy backend URL (async)
- `fetchWithFailover()` - Enhanced fetch with automatic failover

### Usage Example

```javascript
import { fetchWithFailover, getApiHeaders } from '../utils/apiUtils';

// Automatic failover fetch
const response = await fetchWithFailover('/api/users', {
  method: 'GET',
  headers: await getApiHeaders()
});
```

## Updated Services

The following services have been updated to support multi-URL failover:

- `adminService.js` - Admin dashboard API calls
- `apiUtils.js` - Core API utility functions
- All frontend services that use `getBaseUrl()`

## Railway Deployment

### Frontend Railway Configuration

```bash
REACT_APP_API_URL=https://cc.automate8.com,https://api.customerconnects.app
REACT_APP_FRONTEND_URL=https://cc1.automate8.com,https://dash.customerconnects.app
```

### Backend Railway Configuration

```bash
FRONTEND_URL=https://cc1.automate8.com,https://dash.customerconnects.app
CORS_ORIGIN=https://dash.customerconnects.app
```

## Benefits

1. **High Availability**: Service continues even if one URL fails
2. **Load Distribution**: Requests distributed across multiple endpoints
3. **Performance**: Cached healthy URLs reduce latency
4. **Automatic Recovery**: System automatically detects when failed URLs recover
5. **Transparent**: Existing code continues to work without changes

## Monitoring

- Health checks run automatically when needed
- Failed URLs are logged to console for monitoring
- Working URLs are cached to avoid unnecessary health checks
- Session storage tracks the currently healthy URL

## Fallback Behavior

If no URLs are configured in environment variables, the system falls back to:

- **Backend**: `['https://cc.automate8.com', 'https://api.customerconnects.app']`
- **Frontend**: `['https://cc1.automate8.com', 'https://dash.customerconnects.app']`

## Notes

- Twilio webhooks are now workspace-dynamic (removed static configuration)
- Health checks timeout after 5 seconds
- Failed URLs are retried on subsequent requests
- CORS is configured to accept all frontend URLs automatically 