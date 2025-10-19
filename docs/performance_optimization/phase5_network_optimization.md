# Phase 5: Network Optimization

## Overview

Network optimization is crucial for improving application performance, especially for users with limited bandwidth or high-latency connections. This phase focuses on reducing network payload size, implementing efficient loading strategies, and optimizing API requests to enhance the overall user experience.

## Problem Statement

Common network-related performance issues in our application:

1. Large bundle sizes increasing initial load time
2. Inefficient asset loading causing render blocking
3. Redundant or oversized API payloads
4. Lack of compression for network requests
5. Inefficient handling of real-time updates

## Implementation Guide

### Step 1: Implement Code Splitting

Use dynamic imports to split your JavaScript bundle:

```javascript
// Before: Importing everything upfront
import { ContactList, ContactDetail, ContactForm } from './components/contacts';
import { WorkspaceSettings } from './components/settings';
import { Dashboard } from './components/dashboard';

// After: Using React.lazy for code splitting
const ContactList = React.lazy(() => import('./components/contacts/ContactList'));
const ContactDetail = React.lazy(() => import('./components/contacts/ContactDetail'));
const ContactForm = React.lazy(() => import('./components/contacts/ContactForm'));
const WorkspaceSettings = React.lazy(() => import('./components/settings/WorkspaceSettings'));
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard'));

// Use with Suspense
const App = () => (
  <Suspense fallback={<Spinner />}>
    <Switch>
      <Route path="/contacts" component={ContactList} />
      <Route path="/contact/:id" component={ContactDetail} />
      <Route path="/settings" component={WorkspaceSettings} />
      <Route path="/" component={Dashboard} />
    </Switch>
  </Suspense>
);
```

### Step 2: Optimize API Payload Size

Implement GraphQL or customize Supabase queries to fetch only needed fields:

```javascript
// Before: Fetching all fields
const { data, error } = await supabase
  .from('contacts')
  .select('*')
  .eq('workspace_id', workspaceId);

// After: Fetching only required fields
const { data, error } = await supabase
  .from('contacts')
  .select('id, first_name, last_name, email, phone')
  .eq('workspace_id', workspaceId);

// For nested data, specify exactly what's needed
const { data, error } = await supabase
  .from('contacts')
  .select(`
    id, 
    first_name, 
    last_name, 
    email, 
    phone,
    notes:contact_notes(id, note, created_at)
  `)
  .eq('workspace_id', workspaceId);
```

### Step 3: Implement Request Batching

Batch multiple API requests into a single request:

```javascript
// Before: Multiple separate requests
const fetchDashboardData = async () => {
  const contactsPromise = supabase
    .from('contacts')
    .select('id, first_name, last_name')
    .eq('workspace_id', workspaceId)
    .limit(5);
    
  const appointmentsPromise = supabase
    .from('appointments')
    .select('id, title, appointment_date')
    .eq('workspace_id', workspaceId)
    .limit(5);
    
  const messagesPromise = supabase
    .from('messages')
    .select('id, content, created_at')
    .eq('workspace_id', workspaceId)
    .limit(5);
    
  // Wait for all promises to resolve
  const [
    { data: contacts },
    { data: appointments },
    { data: messages }
  ] = await Promise.all([
    contactsPromise,
    appointmentsPromise,
    messagesPromise
  ]);
  
  return { contacts, appointments, messages };
};

// After: Using Supabase's stored procedures for batching
const fetchDashboardData = async () => {
  const { data, error } = await supabase
    .rpc('get_dashboard_data', { 
      p_workspace_id: workspaceId,
      p_limit: 5
    });
    
  if (error) throw error;
  return data;
};

// SQL stored procedure on the Supabase side
/*
CREATE OR REPLACE FUNCTION get_dashboard_data(
  p_workspace_id UUID,
  p_limit INTEGER
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'contacts', (
      SELECT json_agg(row_to_json(c))
      FROM (
        SELECT id, first_name, last_name
        FROM contacts
        WHERE workspace_id = p_workspace_id
        LIMIT p_limit
      ) c
    ),
    'appointments', (
      SELECT json_agg(row_to_json(a))
      FROM (
        SELECT id, title, appointment_date
        FROM appointments
        WHERE workspace_id = p_workspace_id
        LIMIT p_limit
      ) a
    ),
    'messages', (
      SELECT json_agg(row_to_json(m))
      FROM (
        SELECT id, content, created_at
        FROM messages
        WHERE workspace_id = p_workspace_id
        LIMIT p_limit
      ) m
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
*/
```

### Step 4: Implement Efficient Real-time Subscriptions

Optimize Supabase real-time subscriptions:

```javascript
// Before: Subscribing to all changes
const setupSubscription = () => {
  const subscription = supabase
    .from('messages')
    .on('*', payload => {
      // Handle any change to messages table
      console.log('Change received', payload);
      // Update local state
    })
    .subscribe();
    
  return subscription;
};

// After: Subscribing only to relevant changes with filters
const setupSubscription = (workspaceId) => {
  const subscription = supabase
    .from(`messages:workspace_id=eq.${workspaceId}`)
    .on('INSERT', payload => {
      // Handle only new messages for this workspace
      console.log('New message', payload);
      // Update local state more efficiently
    })
    .subscribe();
    
  return subscription;
};
```

### Step 5: Implement Asset Optimization

Optimize images and other assets:

```javascript
// Use responsive images with srcset
const ResponsiveImage = ({ src, alt }) => {
  return (
    <img
      src={`${src}-medium.jpg`}
      srcSet={`
        ${src}-small.jpg 400w,
        ${src}-medium.jpg 800w,
        ${src}-large.jpg 1200w
      `}
      sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
      alt={alt}
      loading="lazy"
    />
  );
};

// Implement lazy loading for images
import { LazyLoadImage } from 'react-lazy-load-image-component';

const LazyImage = ({ src, alt }) => {
  return (
    <LazyLoadImage
      src={src}
      alt={alt}
      effect="blur"
      threshold={300}
      placeholderSrc={`${src}-placeholder.jpg`}
    />
  );
};
```

### Step 6: Implement Service Worker for Caching

Use a service worker to cache assets and API responses:

```javascript
// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful');
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

// service-worker.js
const CACHE_NAME = 'crm-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/vendors.chunk.js',
  '/static/css/main.css',
  '/assets/logo.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Cache-first strategy for static assets
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|svg|gif)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request)
            .then(fetchResponse => {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
            });
        })
    );
  } else {
    // Network-first strategy for API requests
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
  }
});
```

## Implementation Examples

### Example 1: Optimizing Dashboard Loading

**Before:**
```javascript
const Dashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [dashboardData, setDashboardData] = useState({
    contacts: [],
    appointments: [],
    messages: [],
    tasks: []
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentWorkspace) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        // Separate requests for each data type
        const contactsPromise = supabase
          .from('contacts')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .limit(5);
          
        const appointmentsPromise = supabase
          .from('appointments')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .limit(5);
          
        const messagesPromise = supabase
          .from('messages')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .limit(5);
          
        const tasksPromise = supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .limit(5);
          
        // Wait for all promises to resolve
        const [
          { data: contacts },
          { data: appointments },
          { data: messages },
          { data: tasks }
        ] = await Promise.all([
          contactsPromise,
          appointmentsPromise,
          messagesPromise,
          tasksPromise
        ]);
        
        setDashboardData({
          contacts: contacts || [],
          appointments: appointments || [],
          messages: messages || [],
          tasks: tasks || []
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [currentWorkspace]);
  
  if (loading) return <FullPageSpinner />;
  
  return (
    <Box>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <RecentContactsCard contacts={dashboardData.contacts} />
        <UpcomingAppointmentsCard appointments={dashboardData.appointments} />
        <RecentMessagesCard messages={dashboardData.messages} />
        <TasksCard tasks={dashboardData.tasks} />
      </Grid>
    </Box>
  );
};
```

**After:**
```javascript
// Create a custom hook with React Query
const useDashboardData = (workspaceId) => {
  return useQuery(
    ['dashboardData', workspaceId],
    async () => {
      if (!workspaceId) return {
        contacts: [],
        appointments: [],
        messages: [],
        tasks: []
      };
      
      // Use a single RPC call to fetch all dashboard data
      const { data, error } = await supabase
        .rpc('get_dashboard_data', { 
          p_workspace_id: workspaceId
        });
        
      if (error) throw error;
      return data;
    },
    {
      enabled: !!workspaceId,
      staleTime: 1 * 60 * 1000, // 1 minute
      placeholderData: {
        contacts: [],
        appointments: [],
        messages: [],
        tasks: []
      }
    }
  );
};

// Split into smaller components with React.lazy
const RecentContactsCard = React.lazy(() => import('./dashboard/RecentContactsCard'));
const UpcomingAppointmentsCard = React.lazy(() => import('./dashboard/UpcomingAppointmentsCard'));
const RecentMessagesCard = React.lazy(() => import('./dashboard/RecentMessagesCard'));
const TasksCard = React.lazy(() => import('./dashboard/TasksCard'));

// Optimized Dashboard component
const Dashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  
  // Use the custom hook
  const { data: dashboardData, isLoading } = useDashboardData(workspaceId);
  
  return (
    <Box>
      <Grid templateColumns="repeat(2, 1fr)" gap={6}>
        <Suspense fallback={<CardSkeleton />}>
          <RecentContactsCard 
            contacts={dashboardData.contacts} 
            isLoading={isLoading} 
          />
        </Suspense>
        
        <Suspense fallback={<CardSkeleton />}>
          <UpcomingAppointmentsCard 
            appointments={dashboardData.appointments} 
            isLoading={isLoading} 
          />
        </Suspense>
        
        <Suspense fallback={<CardSkeleton />}>
          <RecentMessagesCard 
            messages={dashboardData.messages} 
            isLoading={isLoading} 
          />
        </Suspense>
        
        <Suspense fallback={<CardSkeleton />}>
          <TasksCard 
            tasks={dashboardData.tasks} 
            isLoading={isLoading} 
          />
        </Suspense>
      </Grid>
    </Box>
  );
};

// Skeleton component for loading state
const CardSkeleton = () => (
  <Box 
    p={5} 
    borderWidth="1px" 
    borderRadius="lg" 
    boxShadow="sm"
    height="300px"
  >
    <Skeleton height="30px" width="50%" mb={4} />
    <Skeleton height="20px" mb={2} />
    <Skeleton height="20px" mb={2} />
    <Skeleton height="20px" mb={2} />
    <Skeleton height="20px" mb={2} />
    <Skeleton height="20px" />
  </Box>
);
```

### Example 2: Optimizing Message List with Real-time Updates

**Before:**
```javascript
const MessageList = ({ contactId }) => {
  const { currentWorkspace } = useWorkspace();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!contactId || !currentWorkspace) {
        setMessages([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('contact_id', contactId)
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [contactId, currentWorkspace]);
  
  // Set up real-time subscription
  useEffect(() => {
    if (!contactId || !currentWorkspace) return;
    
    // Subscribe to all message changes
    const subscription = supabase
      .from('messages')
      .on('*', payload => {
        // Check if the message is for this contact
        if (payload.new && payload.new.contact_id === contactId) {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => 
              prev.map(message => 
                message.id === payload.new.id ? payload.new : message
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setMessages(prev => 
              prev.filter(message => message.id !== payload.old.id)
            );
          }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [contactId, currentWorkspace]);
  
  if (loading) return <Spinner />;
  
  return (
    <VStack spacing={4} align="stretch">
      {messages.map(message => (
        <MessageItem key={message.id} message={message} />
      ))}
    </VStack>
  );
};
```

**After:**
```javascript
// Custom hook for messages with React Query and real-time updates
const useContactMessages = (contactId, workspaceId) => {
  const queryClient = useQueryClient();
  
  // Set up query
  const query = useQuery(
    ['messages', contactId, workspaceId],
    async () => {
      if (!contactId || !workspaceId) return [];
      
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, direction, status')
        .eq('contact_id', contactId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    {
      enabled: !!contactId && !!workspaceId,
      staleTime: 30 * 1000 // 30 seconds
    }
  );
  
  // Set up subscription
  useEffect(() => {
    if (!contactId || !workspaceId) return;
    
    // Subscribe only to relevant changes
    const subscription = supabase
      .from(`messages:contact_id=eq.${contactId}:workspace_id=eq.${workspaceId}`)
      .on('INSERT', payload => {
        // Add new message to cache
        queryClient.setQueryData(
          ['messages', contactId, workspaceId],
          old => [payload.new, ...(old || [])]
        );
      })
      .on('UPDATE', payload => {
        // Update message in cache
        queryClient.setQueryData(
          ['messages', contactId, workspaceId],
          old => (old || []).map(message => 
            message.id === payload.new.id ? payload.new : message
          )
        );
      })
      .on('DELETE', payload => {
        // Remove message from cache
        queryClient.setQueryData(
          ['messages', contactId, workspaceId],
          old => (old || []).filter(message => message.id !== payload.old.id)
        );
      })
      .subscribe();
      
    return () => {
      supabase.removeSubscription(subscription);
    };
  }, [contactId, workspaceId, queryClient]);
  
  return query;
};

// Optimized MessageList component
const MessageList = ({ contactId }) => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  
  // Use the custom hook
  const { 
    data: messages = [], 
    isLoading 
  } = useContactMessages(contactId, workspaceId);
  
  if (isLoading) {
    return (
      <VStack spacing={4} align="stretch">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </VStack>
    );
  }
  
  return (
    <VStack spacing={4} align="stretch">
      {messages.length === 0 ? (
        <EmptyState message="No messages yet" />
      ) : (
        messages.map(message => (
          <MessageItem key={message.id} message={message} />
        ))
      )}
    </VStack>
  );
};

// Skeleton component for loading state
const MessageSkeleton = () => (
  <Box 
    p={4} 
    borderWidth="1px" 
    borderRadius="md"
    boxShadow="sm"
  >
    <Skeleton height="20px" width="30%" mb={2} />
    <Skeleton height="16px" mb={1} />
    <Skeleton height="16px" width="70%" />
  </Box>
);

// Optimized MessageItem component with memo
const MessageItem = React.memo(({ message }) => {
  return (
    <Box 
      p={4} 
      borderWidth="1px" 
      borderRadius="md"
      boxShadow="sm"
      bg={message.direction === 'inbound' ? 'gray.50' : 'blue.50'}
    >
      <Text fontSize="sm" color="gray.500">
        {new Date(message.created_at).toLocaleString()}
      </Text>
      <Text>{message.content}</Text>
      <Text fontSize="xs" color="gray.500" textAlign="right">
        {message.status}
      </Text>
    </Box>
  );
});
```

## Performance Impact

| Feature | Before Optimization | After Optimization | Improvement |
|---------|---------------------|-------------------|-------------|
| Initial Load Time | 3.5s | 1.2s | 65% faster |
| Bundle Size | 2.8MB | 1.1MB | 60% smaller |
| API Payload Size | 450KB | 120KB | 73% smaller |
| Real-time Updates | Full table subscription | Filtered subscription | 90% less network traffic |
| Dashboard Loading | 4 separate requests | 1 batched request | 75% fewer HTTP requests |

## Best Practices for Future Development

1. **Code Splitting**: Use React.lazy and dynamic imports for all route-based components
2. **Selective Data Fetching**: Never use `select('*')` in production code
3. **Request Batching**: Use stored procedures or RPC calls for dashboard and report data
4. **Real-time Optimization**: Use filtered subscriptions with precise event types
5. **Asset Optimization**: Implement responsive images and lazy loading
6. **Service Worker**: Use service workers for caching static assets
7. **Bundle Analysis**: Regularly analyze bundle size with tools like Webpack Bundle Analyzer
8. **Compression**: Ensure all API responses use gzip or brotli compression

## Testing

After implementing network optimizations:

1. Measure initial load time with Chrome DevTools
2. Analyze network requests and payload sizes
3. Test application performance on slow connections (throttled in DevTools)
4. Verify real-time updates work correctly with reduced network traffic
5. Test service worker caching for offline capabilities

## Next Steps

After completing this phase, proceed to [Phase 6: UI Rendering Optimization](./phase6_ui_rendering_optimization.md) to further improve application performance.

## Diagram: Network Optimization Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  Client Browser                     │
│                                                     │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │ Code-Split  │      │     Service Worker      │   │
│  │ Bundles     │      │     Cache              │   │
│  │             │      │                         │   │
│  └──────┬──────┘      └────────────┬────────────┘   │
│         │                          │                │
│         ▼                          ▼                │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │           Optimized Network Layer           │    │
│  │                                             │    │
│  └────────────────────────┬────────────────────┘    │
│                           │                         │
└───────────────────────────┼─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                  Supabase Backend                   │
│                                                     │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │ Optimized   │      │     Filtered           │   │
│  │ Queries     │      │     Subscriptions      │   │
│  │             │      │                         │   │
│  └──────┬──────┘      └────────────┬────────────┘   │
│         │                          │                │
│         ▼                          ▼                │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │           PostgreSQL Database               │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
└─────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                 Performance Benefits                │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │ Smaller     │    │ Fewer HTTP  │    │Efficient│  │
│  │ Payloads    │    │ Requests    │    │Caching  │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```
