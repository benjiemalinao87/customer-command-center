# Developer Mode Feature - Quick Start Guide

## 🚀 For New Developers

This guide will help you quickly understand and work with the Developer Mode feature.

---

## 📍 File Locations

### Frontend (Command Center - This Repo)
```
src/features/developer-mode/
├── README.md                    # Full documentation
├── QUICK_START.md              # This file
├── BACKEND_IMPLEMENTATION.md   # Backend implementation guide
├── types/                      # TypeScript interfaces
├── services/                   # API service layer
└── components/                 # React components
```

### Backend (Main Repo - To Be Implemented)
```
cloudflare-workers/admin-api/   # Cloudflare Worker backend
```

---

## 🔍 Key Files to Know

### 1. **Types** (`types/developerMode.ts`)
**What it is**: All TypeScript interfaces  
**When to edit**: When adding new data fields or structures  
**Key interfaces**:
- `DeveloperApplication` - Application data structure
- `ConnectorSubmission` - Connector marketplace data
- `DeveloperWorkspace` - Workspace with usage stats
- `RevenueStats` - Revenue analytics data

### 2. **API Service** (`services/developerModeApi.ts`)
**What it is**: Bridge between UI and backend  
**Current state**: Uses mock data  
**When backend ready**: Replace mock implementations with real `fetch()` calls  
**Key methods**:
- `getApplications()` - Fetch applications list
- `approveApplication()` - Approve dev mode
- `getConnectors()` - Fetch connectors
- `getRevenueStats()` - Fetch revenue data

### 3. **Main Component** (`components/DeveloperMode.tsx`)
**What it is**: Tab navigation container  
**What it does**: Switches between 4 panels  
**When to edit**: When adding new tabs or changing navigation

### 4. **Panel Components** (`components/*.tsx`)
**What they are**: Individual admin panels  
**Each panel**: Self-contained with own data fetching and state

---

## 🎯 Common Tasks

### Adding a New Field to Display

**Example**: Add "Company Size" to DeveloperApplications

1. **Update Type** (`types/developerMode.ts`):
```typescript
export interface DeveloperApplication {
  // ... existing fields
  company_size?: string;  // Add new field
}
```

2. **Update Mock Data** (`services/developerModeApi.ts`):
```typescript
const MOCK_APPLICATIONS: DeveloperApplication[] = [
  {
    // ... existing data
    company_size: '10-50 employees',  // Add to mock
  }
];
```

3. **Update Component** (`components/DeveloperApplications.tsx`):
```tsx
<div>
  <span>Company Size: {app.company_size}</span>
</div>
```

---

### Adding a New Action Button

**Example**: Add "Request More Info" button

1. **Add API Method** (`services/developerModeApi.ts`):
```typescript
export const developerModeApi = {
  // ... existing methods
  requestMoreInfo: async (workspaceId: string): Promise<void> => {
    // TODO: POST /admin-api/developer-mode/request-info
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};
```

2. **Add Handler** (`components/DeveloperApplications.tsx`):
```typescript
const handleRequestInfo = async (workspaceId: string) => {
  await developerModeApi.requestMoreInfo(workspaceId);
  // Show success message
};
```

3. **Add Button** (in JSX):
```tsx
<button onClick={() => handleRequestInfo(app.workspace_id)}>
  Request More Info
</button>
```

---

### Connecting to Real Backend

**When backend is ready**, update `developerModeApi.ts`:

**Before (Mock)**:
```typescript
getApplications: async (status?: string) => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_APPLICATIONS.filter(...);
}
```

**After (Real API)**:
```typescript
getApplications: async (status?: string) => {
  const token = await getAccessToken(); // From lib/supabase
  const url = `${API_BASE_URL}/admin-api/developer-mode/applications${status ? `?status=${status}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch applications');
  }
  
  const data = await response.json();
  return data.data; // Assuming API returns { success: true, data: [...] }
}
```

---

## 🐛 Debugging Tips

### Component Not Rendering?
1. Check if tab is selected in `DeveloperMode.tsx`
2. Check browser console for errors
3. Verify component is exported in `index.ts`

### Data Not Loading?
1. Check `loadApplications()` / `loadWorkspaces()` is called in `useEffect`
2. Check API service method exists
3. Check mock data is defined
4. Check browser Network tab (when using real API)

### Type Errors?
1. Check interface matches data structure
2. Check all required fields are provided
3. Check optional fields use `?` in interface

---

## 📚 Learning Path

### Day 1: Understanding
1. Read `README.md` - Full feature overview
2. Review `types/developerMode.ts` - Understand data structures
3. Look at `DeveloperMode.tsx` - See how tabs work

### Day 2: Exploring Components
1. Open `DeveloperApplications.tsx` - See approval workflow
2. Open `DeveloperWorkspaces.tsx` - See workspace management
3. Open `ConnectorReview.tsx` - See connector approval
4. Open `RevenueDashboard.tsx` - See analytics

### Day 3: Making Changes
1. Try adding a new field (see Common Tasks above)
2. Try adding a new action button
3. Test your changes in the UI

### Day 4: Backend Integration
1. Read `BACKEND_IMPLEMENTATION.md`
2. Understand API endpoints needed
3. Update `developerModeApi.ts` to use real APIs

---

## 🔗 Related Documentation

- **Full README**: `README.md` - Complete feature documentation
- **Backend Guide**: `BACKEND_IMPLEMENTATION.md` - Cloudflare Worker setup
- **Main Plan**: `deepseek-test-livechat/docs/developer-mode/` - Overall architecture

---

## 💡 Pro Tips

1. **Use TypeScript**: All types are defined - use them for IntelliSense
2. **Check Mock Data**: When testing, modify mock data in `developerModeApi.ts`
3. **Follow Patterns**: Look at existing components for patterns to follow
4. **Dark Mode**: All components support dark mode - test both themes
5. **Error Handling**: Add try/catch and user-friendly error messages

---

## ❓ Questions?

1. Check the code comments - they explain what each function does
2. Read the README.md for detailed documentation
3. Look at similar components for examples
4. Check the main implementation plan for architecture details

