# Developer Mode Feature - Admin UI

## 📋 Overview

This feature provides platform administrators with tools to manage the Developer Mode ecosystem:
- Review and approve developer mode applications
- Manage developer workspaces and monitor usage
- Review and approve connectors for marketplace publication
- View platform revenue and analytics

**Location**: Command Center (Platform Admin Dashboard)  
**Target Users**: Platform Administrators Only

---

## 📁 File Structure

```
src/features/developer-mode/
├── README.md                          # This file - Feature documentation
├── index.ts                           # Feature exports (public API)
│
├── types/
│   └── developerMode.ts               # TypeScript interfaces for all data models
│
├── services/
│   └── developerModeApi.ts            # API service layer (currently uses mock data)
│
└── components/
    ├── DeveloperMode.tsx               # Main container component with tab navigation
    ├── DeveloperApplications.tsx       # Panel: Review developer mode applications
    ├── DeveloperWorkspaces.tsx         # Panel: Manage developer workspaces
    ├── ConnectorReview.tsx             # Panel: Review connector submissions
    └── RevenueDashboard.tsx            # Panel: Platform revenue analytics
```

---

## 🗂️ Component Breakdown

### 1. `DeveloperMode.tsx` (Main Container)
**Purpose**: Main entry point with tab navigation  
**Location**: `components/DeveloperMode.tsx`  
**Exports**: `DeveloperMode` component

**Features**:
- Tab-based navigation between 4 panels
- Consistent UI layout
- State management for active tab

**Usage**:
```tsx
import { DeveloperMode } from '@/features/developer-mode';

// In App.tsx
{currentView === 'developer-mode' && <DeveloperMode />}
```

---

### 2. `DeveloperApplications.tsx`
**Purpose**: Review and approve/reject developer mode applications  
**Location**: `components/DeveloperApplications.tsx`

**Features**:
- List all developer mode applications
- Filter by status (Pending, Approved, Rejected, Suspended)
- Search by workspace name or developer email
- Approve/Reject actions with reason field
- View application details in modal

**Data Source**: `developerModeApi.getApplications()`

---

### 3. `DeveloperWorkspaces.tsx`
**Purpose**: View and manage all developer workspaces  
**Location**: `components/DeveloperWorkspaces.tsx`

**Features**:
- List all approved developer workspaces
- View usage statistics (SMS, contacts, API calls)
- View revenue per workspace
- View published connectors count
- Suspend workspace functionality

**Data Source**: `developerModeApi.getWorkspaces()`

---

### 4. `ConnectorReview.tsx`
**Purpose**: Review connector submissions for marketplace  
**Location**: `components/ConnectorReview.tsx`

**Features**:
- List connectors pending review
- Filter by status (Pending, Approved, Rejected)
- Test connector execution
- View connector configuration
- Approve/Reject with reason

**Data Source**: `developerModeApi.getConnectors()`

---

### 5. `RevenueDashboard.tsx`
**Purpose**: Platform revenue analytics and reporting  
**Location**: `components/RevenueDashboard.tsx`

**Features**:
- Total revenue metrics
- Platform share (30%) vs Developer payouts (70%)
- Top selling connectors list
- Top earning developers list
- Date range selector
- CSV export functionality

**Data Source**: `developerModeApi.getRevenueStats()`

---

## 🔌 API Service Layer

### File: `services/developerModeApi.ts`

**Current Status**: Uses mock data for development  
**Future**: Will connect to Cloudflare Worker backend APIs

**API Methods**:

```typescript
// Applications
getApplications(status?: string): Promise<DeveloperApplication[]>
approveApplication(workspaceId: string, notes?: string): Promise<void>
rejectApplication(workspaceId: string, reason: string): Promise<void>
suspendWorkspace(workspaceId: string, reason: string): Promise<void>

// Connectors
getConnectors(status?: string): Promise<ConnectorSubmission[]>
approveConnector(connectorId: string, notes?: string): Promise<void>
rejectConnector(connectorId: string, reason: string): Promise<void>
testConnector(connectorId: string): Promise<any>

// Workspaces
getWorkspaces(): Promise<DeveloperWorkspace[]>
getWorkspaceDetails(workspaceId: string): Promise<DeveloperWorkspace | null>

// Revenue
getRevenueStats(period?: string): Promise<RevenueStats>
```

**Backend Endpoints** (To be implemented in Cloudflare Worker):
- `GET /admin-api/developer-mode/applications`
- `POST /admin-api/developer-mode/approve`
- `POST /admin-api/developer-mode/reject`
- `GET /admin-api/connectors/pending`
- `POST /admin-api/connectors/:id/approve`
- `GET /admin-api/revenue`

---

## 📊 Data Models

### File: `types/developerMode.ts`

All TypeScript interfaces are defined here:

- `DeveloperApplication` - Developer mode application data
- `ConnectorSubmission` - Connector marketplace submission
- `DeveloperWorkspace` - Developer workspace with usage stats
- `RevenueStats` - Platform revenue analytics

See file for complete interface definitions.

---

## 🚀 Integration

### App.tsx Integration

The feature is integrated into the main App component:

1. **Import**: `import { DeveloperMode } from './features/developer-mode';`
2. **View Type**: Added `'developer-mode'` to View union type
3. **Navigation**: Added "Developer" tab button with Code icon
4. **Rendering**: Added conditional rendering for developer-mode view

---

## 🔄 Data Flow

```
User Action (Admin)
    ↓
Component (React)
    ↓
developerModeApi Service
    ↓
[Currently: Mock Data]
[Future: Cloudflare Worker API]
    ↓
Supabase Database
```

---

## 🛠️ Development Workflow

### Adding New Features

1. **Add Types**: Update `types/developerMode.ts` with new interfaces
2. **Add API Method**: Add method to `services/developerModeApi.ts`
3. **Create Component**: Add new component in `components/`
4. **Update Navigation**: Add tab to `DeveloperMode.tsx` if needed
5. **Export**: Update `index.ts` to export new components

### Testing with Mock Data

All components currently use mock data from `developerModeApi.ts`. To test:
1. Modify mock data arrays in `developerModeApi.ts`
2. Components will automatically reflect changes
3. No backend required for UI development

---

## 📝 Next Steps

### Backend Implementation (Cloudflare Worker)

1. **Create Worker**: `cloudflare-workers/admin-api/`
2. **Implement Endpoints**: All endpoints listed in API Service section
3. **Database Integration**: Connect to Supabase
4. **Authentication**: Verify admin role
5. **Update API Service**: Replace mock data with real API calls

### Database Schema

See main repo plan: `docs/developer-mode/DEVELOPER_MODE_IMPLEMENTATION_PLAN.md`

Required tables:
- `workspace_developer_config`
- `platform_shared_credentials`
- `developer_usage_tracking`
- `connector_marketplace`
- `connector_purchases`
- `developer_payouts`

---

## 🎨 Design Patterns

### Component Structure
- Functional components with hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Dark mode support via `dark:` variants
- Lucide icons for consistent iconography

### State Management
- Local state with `useState`
- Data fetching with `useEffect`
- Loading states for async operations
- Error handling with try/catch

### UI Patterns
- Tab-based navigation
- Modal dialogs for actions
- Status badges with color coding
- Search and filter functionality
- Responsive grid layouts

---

## 📚 Related Documentation

- **Main Implementation Plan**: `/deepseek-test-livechat/docs/developer-mode/DEVELOPER_MODE_IMPLEMENTATION_PLAN.md`
- **Backend API Spec**: See plan document for endpoint details
- **Database Schema**: See plan document for table structures

---

## 👥 For New Developers

### Quick Start

1. **Understand the Feature**: Read this README
2. **Review Types**: Check `types/developerMode.ts` for data models
3. **Explore Components**: Start with `DeveloperMode.tsx` (main entry)
4. **Check API Service**: See `services/developerModeApi.ts` for data flow
5. **Test Locally**: Run Command Center and navigate to "Developer" tab

### Common Tasks

**Adding a new status filter**:
1. Update type definition in `types/developerMode.ts`
2. Add filter button in component
3. Update API call to include status parameter

**Adding a new action**:
1. Add method to `developerModeApi.ts`
2. Add button/UI in component
3. Handle loading and error states

**Connecting to backend**:
1. Update method in `developerModeApi.ts`
2. Replace mock data with `fetch()` call
3. Handle authentication headers
4. Update error handling

---

## 🔒 Security Notes

- All API calls require admin authentication
- Admin role verification happens on backend
- Sensitive data (credentials) never exposed to frontend
- RLS policies enforce workspace isolation

---

## 📞 Support

For questions or issues:
1. Check this README
2. Review component code comments
3. Check main implementation plan
4. Contact platform admin team

