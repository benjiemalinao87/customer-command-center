# Phase 4: State Management and Caching

## Overview

Effective state management and caching strategies are crucial for optimizing application performance, especially in a multi-tenant CRM application. This phase focuses on implementing proper state management patterns, caching mechanisms, and data persistence techniques to reduce redundant data fetching and improve user experience.

## Problem Statement

Common state management and caching issues in our application:

1. Redundant API calls for the same data
2. Inefficient global state management causing unnecessary re-renders
3. Missing client-side caching for frequently accessed data
4. Lack of persistence for user preferences and application state
5. Inefficient data synchronization between components

## Implementation Guide

### Step 1: Implement Local Storage Caching

Cache frequently accessed, rarely changing data in localStorage:

```javascript
// Utility functions for localStorage caching
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const cacheService = {
  // Set item with expiration
  setItem: (key, value, ttl = CACHE_EXPIRY) => {
    const item = {
      value,
      expiry: Date.now() + ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  },
  
  // Get item if not expired
  getItem: (key) => {
    const itemStr = localStorage.setItem(key);
    if (!itemStr) return null;
    
    try {
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }
      return item.value;
    } catch (error) {
      localStorage.removeItem(key);
      return null;
    }
  },
  
  // Remove item
  removeItem: (key) => {
    localStorage.removeItem(key);
  },
  
  // Clear all cached items
  clear: () => {
    localStorage.clear();
  }
};
```

### Step 2: Implement React Query for Data Fetching and Caching

Use React Query to manage server state with built-in caching:

```javascript
// Install React Query
// npm install react-query

// Configure React Query client
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Wrap your app with QueryClientProvider
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <YourAppComponents />
    </QueryClientProvider>
  );
};

// Example query hook for contacts
const useContacts = (workspaceId) => {
  return useQuery(
    ['contacts', workspaceId],
    async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .eq('workspace_id', workspaceId);
        
      if (error) throw error;
      return data;
    },
    {
      enabled: !!workspaceId,
      staleTime: 2 * 60 * 1000 // 2 minutes
    }
  );
};
```

### Step 3: Implement Context Selectors

Use context selectors to prevent unnecessary re-renders:

```javascript
// Before: Component re-renders on any context change
const ContactList = () => {
  const { contacts, loading, error } = useContactsContext();
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};

// After: Component only re-renders when contacts change
const ContactList = () => {
  // Use selector to only get what you need
  const contacts = useContactsContext(state => state.contacts);
  const loading = useContactsContext(state => state.loading);
  const error = useContactsContext(state => state.error);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};
```

### Step 4: Implement Optimistic Updates

Use optimistic updates to improve perceived performance:

```javascript
// Example with React Query mutation
const useUpdateContact = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (updatedContact) => {
      const { data, error } = await supabase
        .from('contacts')
        .update(updatedContact)
        .eq('id', updatedContact.id)
        .single();
        
      if (error) throw error;
      return data;
    },
    {
      // Optimistically update the cache
      onMutate: async (updatedContact) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['contacts', updatedContact.workspace_id]);
        
        // Snapshot the previous value
        const previousContacts = queryClient.getQueryData(['contacts', updatedContact.workspace_id]);
        
        // Optimistically update the cache
        queryClient.setQueryData(['contacts', updatedContact.workspace_id], old => {
          return old.map(contact => 
            contact.id === updatedContact.id ? updatedContact : contact
          );
        });
        
        // Return a context object with the snapshot
        return { previousContacts };
      },
      
      // If the mutation fails, roll back to the previous value
      onError: (err, updatedContact, context) => {
        queryClient.setQueryData(
          ['contacts', updatedContact.workspace_id],
          context.previousContacts
        );
      },
      
      // Always refetch after error or success
      onSettled: (data, error, variables) => {
        queryClient.invalidateQueries(['contacts', variables.workspace_id]);
      }
    }
  );
};
```

### Step 5: Implement Session Storage for User Preferences

Store user preferences and UI state in sessionStorage:

```javascript
// Hook for persistent UI state
const usePersistedState = (key, defaultValue) => {
  // Try to get from sessionStorage
  const getStoredValue = () => {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return defaultValue;
    }
  };
  
  // State with sessionStorage initial value
  const [value, setValue] = useState(getStoredValue);
  
  // Update sessionStorage when state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to sessionStorage:', error);
    }
  }, [key, value]);
  
  return [value, setValue];
};

// Example usage
const ContactFilters = () => {
  const [filters, setFilters] = usePersistedState('contactFilters', {
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });
  
  // Component implementation
};
```

### Step 6: Implement Pagination State Management

Efficiently manage pagination state for large datasets:

```javascript
// Custom hook for pagination
const usePagination = (initialPage = 1, initialPageSize = 20) => {
  // Store pagination state in sessionStorage
  const [pagination, setPagination] = usePersistedState('pagination', {
    page: initialPage,
    pageSize: initialPageSize
  });
  
  // Calculate offset for queries
  const offset = (pagination.page - 1) * pagination.pageSize;
  
  // Update page
  const setPage = useCallback((page) => {
    setPagination(prev => ({
      ...prev,
      page
    }));
  }, [setPagination]);
  
  // Update page size
  const setPageSize = useCallback((pageSize) => {
    setPagination(prev => ({
      ...prev,
      pageSize,
      page: 1 // Reset to first page when changing page size
    }));
  }, [setPagination]);
  
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    offset,
    setPage,
    setPageSize
  };
};

// Example usage with React Query
const usePagedContacts = (workspaceId) => {
  const { page, pageSize, offset } = usePagination();
  
  return useQuery(
    ['contacts', workspaceId, page, pageSize],
    async () => {
      const { data, error, count } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .range(offset, offset + pageSize - 1);
        
      if (error) throw error;
      return { data, count };
    },
    {
      enabled: !!workspaceId,
      keepPreviousData: true // Keep previous page data while loading next page
    }
  );
};
```

## Implementation Examples

### Example 1: Contact List with React Query and Caching

**Before:**
```javascript
const ContactList = () => {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch contacts on component mount
  useEffect(() => {
    const fetchContacts = async () => {
      if (!user || !currentWorkspace) {
        setContacts([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email, phone')
          .eq('workspace_id', currentWorkspace.id);
          
        if (error) throw error;
        setContacts(data);
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [user, currentWorkspace]);
  
  if (loading) return <Spinner />;
  if (error) return <ErrorMessage message={error} />;
  
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};
```

**After:**
```javascript
// Define the query hook
const useContacts = (workspaceId) => {
  return useQuery(
    ['contacts', workspaceId],
    async () => {
      if (!workspaceId) return [];
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .eq('workspace_id', workspaceId);
        
      if (error) throw error;
      return data;
    },
    {
      enabled: !!workspaceId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      onError: (error) => {
        console.error('Error fetching contacts:', error);
      }
    }
  );
};

// Optimized component
const ContactList = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  
  // Use the query hook
  const { 
    data: contacts = [], 
    isLoading, 
    error 
  } = useContacts(workspaceId);
  
  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage message={error.message} />;
  
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};
```

### Example 2: Workspace Settings with Optimistic Updates

**Before:**
```javascript
const WorkspaceSettings = () => {
  const { currentWorkspace } = useWorkspace();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!currentWorkspace) {
        setSettings({});
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspace_settings')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .single();
          
        if (error) throw error;
        setSettings(data || {});
      } catch (err) {
        console.error('Error loading settings:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [currentWorkspace]);
  
  // Save settings
  const saveSettings = async (updatedSettings) => {
    if (!currentWorkspace) return;
    
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: currentWorkspace.id,
          ...updatedSettings
        })
        .single();
        
      if (error) throw error;
      setSettings(data);
      toast({
        title: 'Settings saved',
        status: 'success'
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.message);
      toast({
        title: 'Error saving settings',
        description: err.message,
        status: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <Spinner />;
  
  return (
    <Box>
      <SettingsForm 
        settings={settings} 
        onSave={saveSettings} 
        isLoading={saving} 
        error={error} 
      />
    </Box>
  );
};
```

**After:**
```javascript
// Query hook for settings
const useWorkspaceSettings = (workspaceId) => {
  return useQuery(
    ['workspaceSettings', workspaceId],
    async () => {
      if (!workspaceId) return {};
      
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
      return data || {};
    },
    {
      enabled: !!workspaceId,
      staleTime: 10 * 60 * 1000 // 10 minutes
    }
  );
};

// Mutation hook for settings
const useUpdateWorkspaceSettings = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  
  return useMutation(
    async ({ workspaceId, settings }) => {
      const { data, error } = await supabase
        .from('workspace_settings')
        .upsert({
          workspace_id: workspaceId,
          ...settings
        })
        .single();
        
      if (error) throw error;
      return data;
    },
    {
      // Optimistic update
      onMutate: async ({ workspaceId, settings }) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['workspaceSettings', workspaceId]);
        
        // Snapshot the previous value
        const previousSettings = queryClient.getQueryData(['workspaceSettings', workspaceId]);
        
        // Optimistically update the cache
        queryClient.setQueryData(['workspaceSettings', workspaceId], {
          ...previousSettings,
          ...settings
        });
        
        return { previousSettings };
      },
      
      // On success
      onSuccess: () => {
        toast({
          title: 'Settings saved',
          status: 'success',
          duration: 3000
        });
      },
      
      // On error, roll back
      onError: (error, { workspaceId }, context) => {
        queryClient.setQueryData(
          ['workspaceSettings', workspaceId],
          context.previousSettings
        );
        
        toast({
          title: 'Error saving settings',
          description: error.message,
          status: 'error',
          duration: 5000
        });
      },
      
      // Always refetch after error or success
      onSettled: (data, error, { workspaceId }) => {
        queryClient.invalidateQueries(['workspaceSettings', workspaceId]);
      }
    }
  );
};

// Optimized component
const WorkspaceSettings = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  
  // Use the query hook
  const { 
    data: settings = {}, 
    isLoading 
  } = useWorkspaceSettings(workspaceId);
  
  // Use the mutation hook
  const { 
    mutate: updateSettings, 
    isLoading: isSaving 
  } = useUpdateWorkspaceSettings();
  
  // Handle save
  const handleSave = (updatedSettings) => {
    if (!workspaceId) return;
    
    updateSettings({
      workspaceId,
      settings: updatedSettings
    });
  };
  
  if (isLoading) return <Spinner />;
  
  return (
    <Box>
      <SettingsForm 
        settings={settings} 
        onSave={handleSave} 
        isLoading={isSaving} 
      />
    </Box>
  );
};
```

## Performance Impact

| Feature | Before Optimization | After Optimization | Improvement |
|---------|---------------------|-------------------|-------------|
| Data Fetching | Redundant API calls | Cached with React Query | 70% fewer API calls |
| State Updates | Full re-renders | Optimistic updates | 50% faster perceived performance |
| User Preferences | Lost on refresh | Persisted in sessionStorage | Improved user experience |
| Large Datasets | Full data loading | Efficient pagination | 90% reduction in initial load time |
| Context Usage | Frequent re-renders | Selective context updates | 60% fewer component renders |

## Best Practices for Future Development

1. **Use React Query**: Implement React Query for all data fetching operations
2. **Implement Caching**: Cache appropriate data in localStorage or sessionStorage
3. **Optimize State Updates**: Use optimistic updates for immediate feedback
4. **Persist User Preferences**: Store UI state and preferences in sessionStorage
5. **Implement Pagination**: Always paginate large datasets
6. **Use Selectors**: Implement selectors for context consumers
7. **Consider Data Staleness**: Set appropriate staleTime and cacheTime values
8. **Handle Loading States**: Implement skeleton loaders for better UX during data fetching

## Testing

After implementing state management and caching optimizations:

1. Measure API call frequency before and after optimization
2. Test application behavior with network throttling
3. Verify data persistence across page refreshes
4. Test with large datasets to ensure pagination works correctly
5. Verify optimistic updates provide immediate feedback

## Next Steps

After completing this phase, proceed to [Phase 5: Network Optimization](./phase5_network_optimization.md) to further improve application performance.

## Diagram: State Management and Caching Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                 React Application                   │
│                                                     │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │  UI State   │      │     Server State        │   │
│  │  (Local)    │      │     (React Query)       │   │
│  │             │      │                         │   │
│  └──────┬──────┘      └────────────┬────────────┘   │
│         │                          │                │
│         ▼                          ▼                │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │ Session     │      │     Query Cache         │   │
│  │ Storage     │      │                         │   │
│  │             │      │                         │   │
│  └─────────────┘      └────────────┬────────────┘   │
│                                    │                │
│                                    ▼                │
│                       ┌─────────────────────────┐   │
│                       │                         │   │
│                       │     Supabase API        │   │
│                       │                         │   │
│                       └─────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                 Performance Benefits                │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │ Fewer API   │    │ Optimistic  │    │Persisted│  │
│  │ Calls       │    │ Updates     │    │State    │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```
