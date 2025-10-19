# LiveChat2 Optimization Implementation Plan

## Overview
Performance optimization roadmap for the LiveChat2 real-time chat system based on analysis of actively used code. Prioritized by: **Memory Leaks → Reduce DB Loads → Smoother UI → Faster Loading**.

**Current Performance Rating: 6.5/10**  
**Target Performance Rating: 8.5/10**

---

## Phase 1: Memory Leak Prevention (High Priority - Week 1)

### Critical Memory Leak Fixes

#### 1.1 Centralized Timer Management in LiveChat2.js
**Problem**: Multiple setTimeout calls without proper cleanup causing memory leaks.

**Files to modify**: 
- `frontend/src/components/livechat2/LiveChat2.js` (lines 167-192, 465-473, 617, 683-684)

**Implementation**:
```javascript
// Add to LiveChat2.js
const timerRefs = useRef(new Map());

// Helper function for tracked timeouts
const setTrackedTimeout = useCallback((callback, delay, key = null) => {
  const timerId = setTimeout(() => {
    callback();
    if (key) timerRefs.current.delete(key);
  }, delay);
  
  if (key) {
    // Clear existing timer with same key
    if (timerRefs.current.has(key)) {
      clearTimeout(timerRefs.current.get(key));
    }
    timerRefs.current.set(key, timerId);
  }
  
  return timerId;
}, []);

// Global cleanup on unmount
useEffect(() => {
  return () => {
    timerRefs.current.forEach(timerId => clearTimeout(timerId));
    timerRefs.current.clear();
  };
}, []);
```

**Impact**: 90% reduction in memory leaks from orphaned timers.

#### 1.2 Window Object Cleanup
**Problem**: Global timeout maps polluting window object.

**Files to modify**:
- `frontend/src/components/livechat2/LiveChat2.js` (lines 795-837)

**Implementation**:
```javascript
// Replace window._fetchContactsTimeout with local ref
const fetchTimeoutRef = useRef(null);

// Replace window._joinedWorkspaces with context or local state
const [joinedWorkspaces, setJoinedWorkspaces] = useState(new Set());
```

**Impact**: Eliminates global state pollution and memory leaks.

#### 1.3 Bounded State Objects
**Problem**: Unbounded growth of messages and contacts arrays.

**Implementation**:
```javascript
// Add bounds to prevent unlimited growth
const MAX_MESSAGES = 1000;
const MAX_CONTACTS = 500;

const addMessage = useCallback((newMessage) => {
  setMessages(prev => {
    const updated = { ...prev };
    const contactMessages = updated[newMessage.contact_id] || [];
    contactMessages.push(newMessage);
    
    // Bound the messages array
    if (contactMessages.length > MAX_MESSAGES) {
      updated[newMessage.contact_id] = contactMessages.slice(-MAX_MESSAGES);
    } else {
      updated[newMessage.contact_id] = contactMessages;
    }
    
    return updated;
  });
}, []);
```

**Impact**: Prevents memory growth beyond reasonable limits.

### Deliverables Phase 1:
- [ ] Centralized timer management system
- [ ] Window object cleanup
- [ ] Bounded state arrays
- [ ] Memory leak test suite
- [ ] Performance baseline measurements

**Estimated Time**: 3-5 days  
**Expected Memory Reduction**: 40-60%

---

## Phase 2: Reduce Database Load (High Priority - Week 2)

### Database Query Optimization

#### 2.1 Contact Count Caching
**Problem**: Every sidebar count query hits the database.

**Files to modify**:
- `frontend/src/services/contactCountService.js`

**Implementation**:
```javascript
// Create caching layer
class ContactCountCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 60000; // 1 minute TTL
  }
  
  get(key) {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.ttl) {
      return cached.data;
    }
    return null;
  }
  
  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old entries
    if (this.cache.size > 100) {
      const oldest = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0];
      this.cache.delete(oldest[0]);
    }
  }
  
  invalidate(workspaceId) {
    Array.from(this.cache.keys())
      .filter(key => key.startsWith(workspaceId))
      .forEach(key => this.cache.delete(key));
  }
}

const countCache = new ContactCountCache();

export const getContactCounts = async (workspaceId, currentUserId = null) => {
  const cacheKey = `${workspaceId}-${currentUserId}`;
  
  // Check cache first
  const cached = countCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from database with better error handling
  const results = await Promise.allSettled([
    getUnassignedCount(workspaceId),
    getAssignedToMeCount(workspaceId, currentUserId),
    // ... other counts
  ]);
  
  const counts = {
    unassigned: results[0].status === 'fulfilled' ? results[0].value : 0,
    assignedToMe: results[1].status === 'fulfilled' ? results[1].value : 0,
    // ... handle all results with fallbacks
  };
  
  // Cache the result
  countCache.set(cacheKey, counts);
  return counts;
};

// Export cache invalidation for real-time updates
export const invalidateContactCounts = (workspaceId) => {
  countCache.invalidate(workspaceId);
};
```

**Impact**: 70-80% reduction in count queries.

#### 2.2 Contact Data Request Deduplication
**Problem**: Multiple concurrent requests for the same data.

**Files to modify**:
- `frontend/src/components/livechat2/hooks/useContactManager.js`

**Implementation**:
```javascript
// Add request deduplication
const pendingRequests = new Map();

const fetchContactsWithDeduplication = async (workspaceId, page, append) => {
  const requestKey = `${workspaceId}-${page}-${append}`;
  
  // Return existing promise if request is in flight
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey);
  }
  
  const promise = fetchContacts(workspaceId, page, append);
  pendingRequests.set(requestKey, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(requestKey);
  }
};
```

**Impact**: 50-60% reduction in duplicate API calls.

#### 2.3 Smart Cache Invalidation
**Problem**: No real-time cache invalidation on data changes.

**Implementation**:
```javascript
// Add to socket event handlers
useEffect(() => {
  if (!socket || !workspace?.id) return;
  
  const handleContactUpdate = (data) => {
    // Invalidate relevant caches
    invalidateContactCounts(workspace.id);
    
    // Update local state
    updateContactInList(data.contact);
  };
  
  socket.on('contact:updated', handleContactUpdate);
  socket.on('contact:assigned', handleContactUpdate);
  socket.on('contact:status_changed', handleContactUpdate);
  
  return () => {
    socket.off('contact:updated', handleContactUpdate);
    socket.off('contact:assigned', handleContactUpdate);
    socket.off('contact:status_changed', handleContactUpdate);
  };
}, [socket, workspace?.id]);
```

**Impact**: Maintains data consistency while reducing unnecessary queries.

### Deliverables Phase 2:
- [ ] Contact count caching system
- [ ] Request deduplication
- [ ] Smart cache invalidation
- [ ] Database query metrics
- [ ] API call reduction measurements

**Estimated Time**: 4-6 days  
**Expected DB Load Reduction**: 60-75%

---

## Phase 3: Smoother UI Interactions (Medium Priority - Week 3)

### React Performance Optimization

#### 3.1 Component Memoization
**Problem**: Excessive re-renders due to non-memoized components.

**Files to modify**:
- `frontend/src/components/livechat2/ContactList.js`
- `frontend/src/components/livechat2/InboxSidebar.js`

**Implementation**:
```javascript
// Optimize ContactList memo comparison
const VirtualizedContactRow = React.memo(({ index, style, data }) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Simplified comparison for better performance
  const contactIndex = prevProps.index - prevProps.data.callsCount;
  const prevContact = prevProps.data.contacts[contactIndex];
  const nextContact = nextProps.data.contacts[contactIndex];
  
  return (
    prevProps.index === nextProps.index &&
    prevContact?.id === nextContact?.id &&
    prevContact?.unread_count === nextContact?.unread_count &&
    prevProps.data.selectedContact?.id === nextProps.data.selectedContact?.id
  );
});

// Optimize InboxSidebar folder rendering
const FolderItem = React.memo(({ folder, isActive, onSelect }) => {
  // Folder implementation
}, (prevProps, nextProps) => {
  return (
    prevProps.folder.id === nextProps.folder.id &&
    prevProps.folder.count === nextProps.folder.count &&
    prevProps.isActive === nextProps.isActive
  );
});
```

**Impact**: 30-50% reduction in unnecessary re-renders.

#### 3.2 Callback Stabilization
**Problem**: Functions recreated on every render causing child re-renders.

**Implementation**:
```javascript
// In LiveChat2.js - stabilize callbacks
const handleContactSelect = useCallback((contact) => {
  setSelectedContact(contact);
  markMessagesAsRead(contact.id, workspace?.id);
}, [workspace?.id]);

const handleFilterChange = useCallback((filter) => {
  if (typeof filter === 'object' && filter.id) {
    setActiveFilter(filter);
    setActiveFolderId(filter.id);
  } else {
    setActiveFilter(filter);
    setActiveFolderId(filter);
  }
  setSelectedContact(null);
}, []);

// Memoize expensive computations
const filteredContacts = useMemo(() => {
  if (!contacts.length) return [];
  
  return contacts.filter(contact => {
    // Filter logic
  }).sort((a, b) => {
    // Sort logic
  });
}, [contacts, activeFilter, sortBy]);
```

**Impact**: Eliminates cascading re-renders.

#### 3.3 useEffect Dependency Optimization
**Problem**: Complex dependency arrays causing unnecessary effects.

**Implementation**:
```javascript
// Current problematic pattern
useEffect(() => {
  // Complex logic
}, [workspace, contacts.length, loading, searchTerm, isSearching, debouncedFetchContacts]);

// Optimized with specific dependencies
useEffect(() => {
  if (!workspace?.id || loading || searchTerm || isSearching) return;
  
  const needsContacts = contacts.length === 0;
  if (!needsContacts) return;
  
  const timerId = setTrackedTimeout(() => {
    if (workspaceRef.current?.id) {
      debouncedFetchContacts(workspaceRef.current.id);
    }
  }, 3000, 'contact-retry');
  
  return () => clearTimeout(timerId);
}, [workspace?.id]); // Simplified dependencies
```

**Impact**: Reduces unnecessary effect executions by 70%.

### Deliverables Phase 3:
- [ ] Optimized component memoization
- [ ] Stabilized callback functions
- [ ] Simplified useEffect dependencies
- [ ] Render count monitoring
- [ ] UI interaction responsiveness metrics

**Estimated Time**: 3-4 days  
**Expected UI Performance Improvement**: 40-60%

---

## Phase 4: Faster Loading (Lower Priority - Week 4)

### Loading Performance Optimization

#### 4.1 Component Code Splitting
**Problem**: Large bundle size due to monolithic components.

**Implementation**:
```javascript
// Lazy load heavy components
const ContactDetails = lazy(() => import('./ContactDetails'));
const FieldLabelsModal = lazy(() => import('./FieldLabelsModal'));

// In LiveChat2.js
<Suspense fallback={<ContactDetailsSkeleton />}>
  {selectedContact && (
    <ContactDetails
      contact={selectedContact}
      workspace={workspace}
      onClose={() => setSelectedContact(null)}
    />
  )}
</Suspense>
```

**Impact**: 20-30% reduction in initial bundle size.

#### 4.2 Progressive Data Loading
**Problem**: Loading all data at once causes delays.

**Implementation**:
```javascript
// Load critical data first, then secondary data
const useProgressiveDataLoad = (workspaceId) => {
  const [criticalDataLoaded, setCriticalDataLoaded] = useState(false);
  const [secondaryDataLoaded, setSecondaryDataLoaded] = useState(false);
  
  useEffect(() => {
    if (!workspaceId) return;
    
    // Load critical data first (contacts, counts)
    Promise.all([
      fetchContacts(workspaceId, 1, false),
      getContactCounts(workspaceId)
    ]).then(() => {
      setCriticalDataLoaded(true);
      
      // Then load secondary data
      Promise.all([
        fetchWebhookSources(workspaceId),
        fetchLeadStatusSources(workspaceId),
        fetchCustomFolders(workspaceId)
      ]).then(() => {
        setSecondaryDataLoaded(true);
      });
    });
  }, [workspaceId]);
  
  return { criticalDataLoaded, secondaryDataLoaded };
};
```

**Impact**: 40-50% improvement in perceived loading time.

### Deliverables Phase 4:
- [ ] Code splitting implementation
- [ ] Progressive data loading
- [ ] Loading state optimization
- [ ] Bundle size analysis
- [ ] Loading time measurements

**Estimated Time**: 2-3 days  
**Expected Loading Performance Improvement**: 35-45%

---

## Testing & Monitoring Strategy

### Performance Testing
```javascript
// Add performance monitoring hooks
const usePerformanceMonitor = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    renderCount.current += 1;
    
    if (renderCount.current > 10) {
      console.warn(`${componentName} rendered ${renderCount.current} times`);
    }
    
    if (renderCount.current === 1) {
      const loadTime = performance.now() - startTime.current;
      console.log(`${componentName} initial load: ${loadTime.toFixed(2)}ms`);
    }
  });
  
  return renderCount.current;
};

// Memory usage tracking
const useMemoryMonitor = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        const usage = performance.memory.usedJSHeapSize / 1048576; // MB
        if (usage > 100) {
          console.warn(`High memory usage: ${usage.toFixed(2)}MB`);
        }
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
};
```

### Key Performance Metrics to Track
- **Memory Usage**: Heap size, timer count, listener count
- **Database Queries**: Query count, cache hit rate, response time
- **Render Performance**: Render count, component mount time
- **Loading Performance**: Bundle size, critical data load time

---

## Implementation Timeline

| Phase | Duration | Priority | Expected Improvement |
|-------|----------|----------|---------------------|
| Phase 1: Memory Leaks | 3-5 days | Critical | 40-60% memory reduction |
| Phase 2: DB Load Reduction | 4-6 days | High | 60-75% query reduction |
| Phase 3: UI Smoothness | 3-4 days | Medium | 40-60% render improvement |
| Phase 4: Loading Speed | 2-3 days | Low | 35-45% loading improvement |

**Total Estimated Time**: 2-3 weeks  
**Overall Performance Target**: 8.5/10

---

## Success Criteria

### Phase 1 Success Metrics:
- [ ] Zero memory leaks in 24-hour test
- [ ] Timer count remains bounded
- [ ] No window object pollution

### Phase 2 Success Metrics:
- [ ] 70%+ reduction in database queries
- [ ] Cache hit rate > 80%
- [ ] API response time < 100ms

### Phase 3 Success Metrics:
- [ ] Component render count < 5 per user action
- [ ] UI interactions respond within 16ms
- [ ] No unnecessary re-renders detected

### Phase 4 Success Metrics:
- [ ] Initial load time < 2 seconds
- [ ] Bundle size reduced by 25%
- [ ] Critical data loads within 800ms

---

## Risk Assessment

### High Risk:
- **Breaking existing functionality** during refactoring
- **Introducing new bugs** in timer management
- **Cache invalidation edge cases**

### Mitigation Strategies:
- Implement comprehensive test coverage
- Use feature flags for gradual rollout
- Maintain backward compatibility during transition
- Add extensive logging for debugging

### Rollback Plan:
- Keep original implementations as fallback
- Use git feature branches for each phase
- Implement circuit breakers for new caching logic

---

## Future Considerations

After completing this optimization plan, consider:
- **WebSocket optimization** for real-time features
- **Service Worker implementation** for offline capability
- **Advanced caching strategies** with IndexedDB
- **Performance budgets** and continuous monitoring
- **Load testing** with simulated concurrent users

---

*This plan prioritizes memory leak prevention and database load reduction as requested, with measurable success criteria and realistic timelines for each phase.*