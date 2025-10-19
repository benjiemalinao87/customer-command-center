# Authentication & Admin Access Guide

## Overview

The Customer Connect Command Center now includes **Supabase authentication** that integrates seamlessly with the deepseek-test-livechat backend admin routes. Only users with valid Supabase accounts can access the dashboard, and only users listed in `SAAS_OWNER_EMAILS` can access the Admin tab.

## Architecture

```
┌─────────────────────────────────────┐
│  Customer Connect Command Center    │
│  (Frontend - React + Supabase Auth) │
└──────────────┬──────────────────────┘
               │ JWT Token (Bearer)
               ▼
┌─────────────────────────────────────┐
│  deepseek-test-livechat Backend     │
│  ├─ authenticate middleware         │ ← Verifies JWT token
│  └─ requireSaasOwner middleware     │ ← Checks SAAS_OWNER_EMAILS
└─────────────────────────────────────┘
```

## How It Works

### 1. User Login Flow

1. User enters email/password on Login screen
2. Frontend calls `supabase.auth.signInWithPassword()`
3. Supabase returns JWT access token
4. Token is stored in localStorage and session state
5. App shows main dashboard

### 2. Admin Access Flow

1. User clicks "Admin" tab
2. AdminDashboard component calls `adminApi.checkAdminAccess()`
3. adminApi gets JWT token via `getAccessToken()` from Supabase
4. Request sent to backend: `GET /api/admin/dashboard` with `Authorization: Bearer {token}`
5. Backend middleware chain:
   - **authenticate** middleware: Decodes JWT, extracts `user.email`
   - **requireSaasOwner** middleware: Checks if `user.email` is in `SAAS_OWNER_EMAILS`
6. If authorized → Admin dashboard loads
7. If unauthorized → "Access Denied" screen shown

## Environment Configuration

### Frontend (.env)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://ycwttshvizkotcwwyjpt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Admin API Configuration (points to backend)
VITE_ADMIN_API_URL=https://cc.automate8.com/api/admin
```

### Backend (.env)

```bash
# Admin Access Control
SAAS_OWNER_EMAILS=benjie@customerconnects.app,fake501@gmail.com

# Optional: IP-based protection
ADMIN_ALLOWED_IPS=1.2.3.4,5.6.7.8
```

## Key Files Created/Modified

### New Files

1. **[src/lib/supabase.ts](src/lib/supabase.ts)**
   - Supabase client initialization
   - `getAccessToken()` - Gets JWT token from session
   - `getCurrentUser()` - Gets current authenticated user

2. **[src/components/Login.tsx](src/components/Login.tsx)**
   - Premium login UI with email/password
   - Handles authentication with Supabase
   - Error handling and loading states

### Modified Files

1. **[src/App.tsx](src/App.tsx)**
   - Added authentication state management
   - Shows Login screen if not authenticated
   - Added user email display and logout button
   - Auth state listener for session changes

2. **[src/lib/adminApi.ts](src/lib/adminApi.ts)**
   - Updated to use `getAccessToken()` from supabase.ts
   - Proper error handling for authentication failures

3. **[.env](.env)**
   - Added Supabase credentials
   - Added admin API URL pointing to production backend

## Testing the Setup

### 1. Start the Development Server

```bash
cd "/Users/benjiemalinao/Documents/WORKING PROTOTYPE/Customer Connect Command Center"
npm run dev
```

### 2. Login with Valid Credentials

Use a Supabase account that exists in your auth system:
- Email: Your registered email
- Password: Your password

### 3. Access Admin Dashboard

After login:
1. Click the "Admin" tab in the navigation
2. If your email is in `SAAS_OWNER_EMAILS` → Admin dashboard loads
3. If not → "Access Denied" screen appears

## Security Features

### Multi-Layer Protection

1. **Authentication Layer**
   - Must be logged in via Supabase
   - JWT token verification

2. **Authorization Layer**
   - Email must be in `SAAS_OWNER_EMAILS` environment variable
   - Backend validates on every request

3. **Optional IP Whitelist**
   - Set `ADMIN_ALLOWED_IPS` in backend .env
   - Restricts admin access to specific IPs

4. **Audit Logging**
   - All admin actions logged to `saas_admin_logs` table
   - Includes: timestamp, user_id, action, IP address, user agent

### Session Management

- Sessions persist across browser refreshes
- Auto-refresh of JWT tokens
- Auth state changes trigger UI updates
- Sign out clears all session data

## Troubleshooting

### "Authentication required. Please log in."

**Cause**: No JWT token found in session

**Solution**:
1. Make sure you're logged in
2. Check browser console for Supabase errors
3. Verify `.env` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### "Access Denied" on Admin Tab

**Cause**: User email not in `SAAS_OWNER_EMAILS`

**Solution**:
1. Check backend `.env` has `SAAS_OWNER_EMAILS=your@email.com`
2. Verify email matches exactly (case-sensitive)
3. Check backend logs for authentication details

### CORS Errors

**Cause**: Backend not allowing frontend domain

**Solution**:
1. Check backend `FRONTEND_URL` in .env
2. Verify CORS middleware is configured correctly
3. Make sure backend is running on correct port/domain

## Production Deployment

### Frontend

1. Update `.env`:
   ```bash
   VITE_ADMIN_API_URL=https://cc.automate8.com/api/admin
   ```

2. Build and deploy:
   ```bash
   npm run build
   # Deploy dist/ folder to your hosting
   ```

### Backend

1. Update `.env`:
   ```bash
   SAAS_OWNER_EMAILS=benjie@customerconnects.app,fake501@gmail.com
   FRONTEND_URL=https://your-frontend-domain.com
   ```

2. Ensure admin routes are mounted:
   ```javascript
   // backend/src/index.js
   app.use('/api/admin', adminRoutes);
   ```

## Admin Features Available

Once authenticated and authorized, you can:

- **Overview Tab**:
  - View total workspaces, subscriptions, revenue
  - See plan distribution
  - Monitor user activity

- **Workspaces Tab**:
  - View all workspaces
  - Update subscription plans
  - See usage statistics
  - Track billing information

- **Monitoring Tab** (Coming Soon):
  - API request analytics
  - Rate limit violations

- **System Tab** (Coming Soon):
  - System health monitoring
  - Audit logs viewer

## Next Steps

1. ✅ Authentication integrated
2. ✅ Admin dashboard protected
3. ⬜ Complete stub components (Monitoring, System)
4. ⬜ Add more admin features
5. ⬜ Implement real-time notifications for admin actions
