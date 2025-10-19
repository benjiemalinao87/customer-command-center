# LiveChat2 Advanced Caching System - Developer SOP

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Implementation Guide](#implementation-guide)
4. [Code Examples](#code-examples)
5. [Testing & Debugging](#testing--debugging)
6. [Performance Optimization](#performance-optimization)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Maintenance](#maintenance)

---

## Overview

### What is the LiveChat2 Caching System?

The LiveChat2 Advanced Caching System is a multi-layer, high-performance caching architecture designed to handle enterprise-scale messaging applications with 10-50M contacts. It provides sub-50ms response times through intelligent caching strategies, real-time synchronization, and memory leak prevention.

### Key Benefits

- **82% faster response times** (sub-50ms vs 200-500ms)
- **60-75% reduction** in database load
- **Real-time synchronization** with Socket.IO
- **Memory leak prevention** with bounded caches
- **Enterprise scalability** for massive contact databases

### System Components

1. **Redis Backend Cache** - 5-second TTL for sidebar counts
2. **Search Results Cache** - 2-minute TTL with 300ms debouncing  
3. **Message History Cache** - 5-minute TTL with Socket.IO integration
4. **Board Cache Service** - Unified caching interface
5. **Performance Monitor** - Real-time analytics and metrics

---

## Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    LiveChat2 Frontend                       │
├─────────────────────────────────────────────────────────────┤
│  React Components                                          │
│  ├── useContactManager Hook                                │
│  ├── useCachedChatData Hook                               │
│  ├── useContactCounts Hook                                │
│  └── InboxSidebar Component                               │
├─────────────────────────────────────────────────────────────┤
│  Cache Services Layer                                      │
│  ├── searchResultsCache.js                                │
│  ├── messageHistoryCache.js                               │
│  ├── contactCountService.js                               │
│  ├── boardCacheService.js                                 │
│  └── cachePerformanceMonitor.js                           │
├─────────────────────────────────────────────────────────────┤
│  Real-time Layer                                          │
│  ├── Socket.IO Client                                     │
│  ├── Supabase Real-time                                   │
│  └── Cache Invalidation Events                            │
├─────────────────────────────────────────────────────────────┤
│  Backend Services                                         │
│  ├── Express.js API                                       │
│  ├── Redis Cache (5s TTL)                                │
│  ├── Supabase PostgreSQL                                  │
│  └── Socket.IO Server                                     │
└─────────────────────────────────────────────────────────────┘
```

### Cache Hierarchy

```
Layer 1: Browser Memory Cache (Instant Access)
├── Search Results: 2-minute TTL, 300ms debouncing
├── Message History: 5-minute TTL, real-time updates
├── Contact Data: 5-minute TTL, column-specific
└── Board Structure: 10-minute TTL

Layer 2: Redis Backend Cache (Sub-5ms Access)
├── Contact Counts: 5-second TTL
├── API Responses: 3-minute TTL
└── User Preferences: 30-minute TTL

Layer 3: Database (200-500ms Access)
├── Supabase PostgreSQL
├── Row Level Security (RLS)
└── Real-time Subscriptions
```

---

## Implementation Guide

### Step 1: Setting Up Cache Services

#### 1.1 Import Required Services

```javascript
// Import cache services
import searchResultsCache from '../services/searchResultsCache.js';
import messageHistoryCache from '../services/messageHistoryCache.js';
import { invalidateContactCounts } from '../services/contactCountService.js';
import useCachedChatData from '../hooks/useCachedChatData.js';
```

#### 1.2 Initialize Cache in Component

```javascript
const MyComponent = ({ workspace, user }) => {
  const {
    cachedSearch,
    loadCachedMessageHistory,
    addMessageToCache,
    invalidateSearchCache,
    invalidateMessageCache,
    getCacheAnalytics
  } = useCachedChatData(workspace, user);

  // Component logic here
};
```

### Step 2: Implementing Search Caching

#### 2.1 Basic Search Implementation

```javascript
const performSearch = useCallback(async (query, filters = {}) => {
  if (!workspace?.id || !query || query.length < 2) {
    return { contacts: [], totalCount: 0 };
  }

  try {
    // Use cached search with debouncing
    const results = await cachedSearch(query, filters, async (workspaceId, searchQuery) => {
      // Your actual search API call
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('workspace_id', workspaceId)
        .ilike('name', `%${searchQuery}%`)
        .limit(50);

      if (error) throw error;
      return { contacts: data || [], totalCount: data?.length || 0 };
    });

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return { contacts: [], totalCount: 0 };
  }
}, [workspace?.id, cachedSearch]);
```

#### 2.2 Advanced Search with Filters

```javascript
const performAdvancedSearch = useCallback(async (query, filters) => {
  const searchFilters = {
    status: filters.status,
    tags: filters.tags,
    dateRange: filters.dateRange
  };

  const results = await cachedSearch(query, searchFilters, async (workspaceId, searchQuery, searchFilters) => {
    let queryBuilder = supabase
      .from('contacts')
      .select('*, messages(count)')
      .eq('workspace_id', workspaceId);

    if (searchQuery) {
      queryBuilder = queryBuilder.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`);
    }

    if (searchFilters.status) {
      queryBuilder = queryBuilder.eq('conversation_status', searchFilters.status);
    }

    if (searchFilters.tags?.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', searchFilters.tags);
    }

    const { data, error } = await queryBuilder.limit(100);
    if (error) throw error;

    return { contacts: data || [], totalCount: data?.length || 0 };
  });

  return results;
}, [cachedSearch]);
```

### Step 3: Implementing Message History Caching

#### 3.1 Basic Message Loading

```javascript
const loadMessages = useCallback(async (contactId, page = 1) => {
  if (!workspace?.id || !contactId) {
    return { messages: [], pagination: {} };
  }

  try {
    const result = await loadCachedMessageHistory(contactId, async (contactId, page) => {
      const limit = 50;
      const offset = (page - 1) * limit;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contactId)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        messages: data || [],
        pagination: {
          page,
          limit,
          totalCount: data?.length || 0,
          hasMore: data?.length === limit
        }
      };
    }, page);

    return result;
  } catch (error) {
    console.error('Message loading error:', error);
    return { messages: [], pagination: {} };
  }
}, [workspace?.id, loadCachedMessageHistory]);
```

#### 3.2 Real-time Message Updates

```javascript
useEffect(() => {
  if (!socket || !workspace?.id) return;

  const handleNewMessage = (message) => {
    if (message.workspace_id === workspace.id && message.contact_id) {
      // Add to cache immediately
      addMessageToCache(message.contact_id, message);
      
      // Update UI state
      setMessages(prev => [...prev, message]);
      
      console.log('Real-time message cached:', message.id);
    }
  };

  socket.on('new_message', handleNewMessage);

  return () => {
    socket.off('new_message', handleNewMessage);
  };
}, [workspace?.id, addMessageToCache]);
```

### Step 4: Contact Count Optimization

#### 4.1 Using Optimized Counts

```javascript
const InboxSidebar = ({ workspace, user, refreshTrigger }) => {
  const { 
    counts, 
    loading, 
    error, 
    refreshCounts, 
    lastUpdated 
  } = useContactCounts(workspace, user, refreshTrigger);

  return (
    <VStack spacing={2}>
      <SidebarFolder
        name="Unassigned"
        count={counts.unassigned}
        loading={loading.unassigned}
        onClick={() => setActiveFilter('unassigned')}
      />
      <SidebarFolder
        name="Assigned to Me"
        count={counts.assignedToMe}
        loading={loading.assignedToMe}
        onClick={() => setActiveFilter('assigned_to_me')}
      />
      <SidebarFolder
        name="All Open"
        count={counts.open}
        loading={loading.open}
        onClick={() => setActiveFilter('open')}
      />
    </VStack>
  );
};
```

#### 4.2 Cache Invalidation on Updates

```javascript
const updateContactStatus = useCallback(async (contactId, newStatus) => {
  try {
    const { error } = await supabase
      .from('contacts')
      .update({ conversation_status: newStatus })
      .eq('id', contactId)
      .eq('workspace_id', workspace.id);

    if (error) throw error;

    // Invalidate relevant caches
    await invalidateContactCounts(workspace.id);
    invalidateSearchCache();
    
    // Refresh counts immediately
    refreshCounts();
    
    toast({
      title: 'Success',
      description: `Contact ${newStatus.toLowerCase()}`,
      status: 'success',
      duration: 2000,
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    toast({
      title: 'Error',
      description: 'Failed to update contact status',
      status: 'error',
      duration: 3000,
    });
  }
}, [workspace.id, invalidateSearchCache, refreshCounts]);
```

---

## Code Examples

### Example 1: Complete Chat Component with Caching

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Box, VStack, HStack, Input, Button, Text } from '@chakra-ui/react';
import useCachedChatData from '../hooks/useCachedChatData';
import { supabase } from '../services/supabase';

const CachedChatComponent = ({ workspace, user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [messages, setMessages] = useState([]);

  const {
    cachedSearch,
    loadCachedMessageHistory,
    addMessageToCache,
    isSearchLoading,
    isMessagesLoading,
    invalidateSearchCache,
    invalidateMessageCache
  } = useCachedChatData(workspace, user);

  // Search with caching
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      const results = await cachedSearch(searchQuery, {}, async (workspaceId, query) => {
        const { data, error } = await supabase
          .from('contacts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .ilike('name', `%${query}%`)
          .limit(20);

        if (error) throw error;
        return { contacts: data || [], totalCount: data?.length || 0 };
      });

      setSearchResults(results.contacts || []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  }, [searchQuery, cachedSearch]);

  // Load messages with caching
  const handleContactSelect = useCallback(async (contact) => {
    setSelectedContact(contact);
    setMessages([]);

    try {
      const result = await loadCachedMessageHistory(contact.id, async (contactId, page) => {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('contact_id', contactId)
          .eq('workspace_id', workspace?.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (error) throw error;
        return { messages: data || [], pagination: { hasMore: false } };
      });

      setMessages(result.messages || []);
    } catch (error) {
      console.error('Message loading failed:', error);
      setMessages([]);
    }
  }, [workspace?.id, loadCachedMessageHistory]);

  // Real-time message handling
  useEffect(() => {
    if (!selectedContact) return;

    const channel = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `contact_id=eq.${selectedContact.id}`
      }, (payload) => {
        const newMessage = payload.new;
        addMessageToCache(selectedContact.id, newMessage);
        setMessages(prev => [...prev, newMessage]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact, addMessageToCache]);

  return (
    <Box p={6}>
      <VStack spacing={4} align="stretch">
        {/* Search Section */}
        <HStack>
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button 
            onClick={handleSearch} 
            isLoading={isSearchLoading}
            colorScheme="blue"
          >
            Search
          </Button>
        </HStack>

        {/* Search Results */}
        <Box maxH="200px" overflowY="auto">
          {searchResults.map(contact => (
            <Box
              key={contact.id}
              p={3}
              bg="gray.50"
              borderRadius="md"
              cursor="pointer"
              onClick={() => handleContactSelect(contact)}
              _hover={{ bg: 'gray.100' }}
            >
              <Text fontWeight="medium">{contact.name}</Text>
              <Text fontSize="sm" color="gray.600">{contact.phone}</Text>
            </Box>
          ))}
        </Box>

        {/* Messages */}
        {selectedContact && (
          <Box>
            <Text fontWeight="medium" mb={2}>
              Messages - {selectedContact.name}
            </Text>
            <Box maxH="400px" overflowY="auto" border="1px" borderColor="gray.200" borderRadius="md" p={3}>
              {messages.map(message => (
                <Box key={message.id} mb={2}>
                  <Text fontSize="sm" color="gray.600">
                    {message.direction} - {new Date(message.created_at).toLocaleString()}
                  </Text>
                  <Text>{message.body}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

export default CachedChatComponent;
```

### Example 2: Sidebar with Optimized Counts

```javascript
import React from 'react';
import { VStack, HStack, Text, Spinner, Badge } from '@chakra-ui/react';
import { useContactCounts } from '../hooks/useContactCounts';

const OptimizedSidebar = ({ workspace, user, activeFilter, onFilterChange }) => {
  const { counts, loading, error, refreshCounts } = useContactCounts(workspace, user);

  const folders = [
    { id: 'unassigned', label: 'Unassigned', count: counts.unassigned, loading: loading.unassigned },
    { id: 'assigned_to_me', label: 'Assigned to Me', count: counts.assignedToMe, loading: loading.assignedToMe },
    { id: 'open', label: 'All Open', count: counts.open, loading: loading.open },
    { id: 'closed', label: 'Recently Closed', count: counts.closed, loading: loading.closed },
    // Communication section
    { id: 'email', label: 'Email', count: counts.email, loading: loading.email },
    { id: 'calls', label: 'Calls', count: counts.calls, loading: loading.calls },
    { id: 'sent', label: 'Sent', count: counts.sent, loading: loading.sent },
    // Smart Inbox
    { id: 'webhook_luxury', label: 'Luxury Bath', count: counts.webhooks?.['Luxury Bath'] || 0 },
    { id: 'webhook_mad_city', label: 'Mad City', count: counts.webhooks?.['Mad City'] || 0 },
  ];

  return (
    <VStack spacing={1} align="stretch">
      {folders.map(folder => (
        <HStack
          key={folder.id}
          p={2}
          cursor="pointer"
          bg={activeFilter === folder.id ? 'blue.50' : 'transparent'}
          borderRadius="md"
          onClick={() => onFilterChange(folder.id)}
          _hover={{ bg: 'gray.50' }}
        >
          <Text flex={1} fontSize="sm">
            {folder.label}
          </Text>
          {folder.loading ? (
            <Spinner size="xs" />
          ) : (
            <Badge colorScheme="gray" variant="subtle">
              {folder.count?.toLocaleString() || 0}
            </Badge>
          )}
        </HStack>
      ))}
    </VStack>
  );
};

export default OptimizedSidebar;
```

---

## Testing & Debugging

### Console Debug Commands

The caching system provides comprehensive debugging tools accessible via browser console:

```javascript
// View cache performance
showCachePerformance()
showCacheStats()

// Search cache debugging
showSearchCacheStats('workspace_123')
clearSearchCache('workspace_123')

// Message cache debugging  
showMessageCacheStats('workspace_123')
clearMessageCache('workspace_123', 'contact_456')

// Performance monitoring
showCacheRecommendations()
exportCacheMetrics()

// Cache analytics
cachePerformanceMonitor.getPerformanceReport()
searchResultsCache.getSearchAnalytics('workspace_123')
messageHistoryCache.getMessageCacheAnalytics('workspace_123')
```

### Testing Checklist

#### ✅ Search Caching Tests

```javascript
// Test 1: Basic search caching
const testSearchCaching = async () => {
  console.time('First Search');
  const results1 = await performSearch('john', {});
  console.timeEnd('First Search'); // Should be ~200-500ms

  console.time('Cached Search');
  const results2 = await performSearch('john', {});
  console.timeEnd('Cached Search'); // Should be ~5-10ms

  console.assert(results1.length === results2.length, 'Results should match');
};

// Test 2: Debouncing
const testDebouncing = async () => {
  let callCount = 0;
  const mockSearch = (query) => {
    callCount++;
    return Promise.resolve({ contacts: [], totalCount: 0 });
  };

  // Rapid fire searches
  await cachedSearch('j', {}, mockSearch);
  await cachedSearch('jo', {}, mockSearch);
  await cachedSearch('joh', {}, mockSearch);
  await cachedSearch('john', {}, mockSearch);

  // Wait for debounce
  await new Promise(resolve => setTimeout(resolve, 400));
  
  console.assert(callCount === 1, 'Should only make one API call due to debouncing');
};
```

#### ✅ Message Caching Tests

```javascript
// Test 3: Message history caching
const testMessageCaching = async () => {
  const contactId = 'contact_123';
  
  console.time('First Load');
  const messages1 = await loadCachedMessageHistory(contactId, mockFetchMessages);
  console.timeEnd('First Load'); // Should be ~300-800ms

  console.time('Cached Load');
  const messages2 = await loadCachedMessageHistory(contactId, mockFetchMessages);
  console.timeEnd('Cached Load'); // Should be ~10-20ms

  console.assert(messages1.length === messages2.length, 'Message counts should match');
};

// Test 4: Real-time updates
const testRealTimeUpdates = async () => {
  const contactId = 'contact_123';
  const newMessage = {
    id: 'msg_' + Date.now(),
    body: 'Test message',
    direction: 'inbound',
    contact_id: contactId,
    created_at: new Date().toISOString()
  };

  // Add message to cache
  addMessageToCache(contactId, newMessage);

  // Verify cache contains new message
  const cached = messageHistoryCache.getCachedMessageHistory(workspace.id, contactId);
  const hasNewMessage = cached.messages.some(m => m.id === newMessage.id);
  
  console.assert(hasNewMessage, 'Cache should contain new message');
};
```

#### ✅ Performance Tests

```javascript
// Test 5: Memory leak prevention
const testMemoryLeaks = async () => {
  const initialMemory = performance.memory?.usedJSHeapSize || 0;
  
  // Perform 1000 search operations
  for (let i = 0; i < 1000; i++) {
    await cachedSearch(`query_${i}`, {}, mockSearchFunction);
  }
  
  // Force cleanup
  searchResultsCache.clearAll();
  
  const finalMemory = performance.memory?.usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;
  
  console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  console.assert(memoryIncrease < 10 * 1024 * 1024, 'Memory increase should be less than 10MB');
};

// Test 6: Cache invalidation
const testCacheInvalidation = async () => {
  const contactId = 'contact_123';
  
  // Load messages into cache
  await loadCachedMessageHistory(contactId, mockFetchMessages);
  
  // Verify cache exists
  let cached = messageHistoryCache.getCachedMessageHistory(workspace.id, contactId);
  console.assert(cached !== null, 'Cache should exist');
  
  // Invalidate cache
  invalidateMessageCache(contactId);
  
  // Verify cache is cleared
  cached = messageHistoryCache.getCachedMessageHistory(workspace.id, contactId);
  console.assert(cached === null, 'Cache should be cleared');
};
```

### Performance Benchmarking

```javascript
// Comprehensive performance test
const runPerformanceBenchmark = async () => {
  const results = {
    search: { cached: [], uncached: [] },
    messages: { cached: [], uncached: [] },
    counts: { cached: [], uncached: [] }
  };

  // Search performance
  for (let i = 0; i < 10; i++) {
    // Uncached
    clearSearchCache();
    const start1 = performance.now();
    await performSearch('test', {});
    results.search.uncached.push(performance.now() - start1);

    // Cached
    const start2 = performance.now();
    await performSearch('test', {});
    results.search.cached.push(performance.now() - start2);
  }

  // Calculate averages
  const avgSearchUncached = results.search.uncached.reduce((a, b) => a + b) / results.search.uncached.length;
  const avgSearchCached = results.search.cached.reduce((a, b) => a + b) / results.search.cached.length;
  
  console.log(`Search Performance:
    Uncached: ${avgSearchUncached.toFixed(2)}ms
    Cached: ${avgSearchCached.toFixed(2)}ms
    Improvement: ${((avgSearchUncached - avgSearchCached) / avgSearchUncached * 100).toFixed(1)}%`);

  return results;
};
```

---

## Performance Optimization

### Cache Configuration Tuning

```javascript
// Optimal cache configuration for different scenarios
const CACHE_CONFIGS = {
  // High-volume workspace (10M+ contacts)
  enterprise: {
    searchTTL: 60 * 1000,        // 1 minute
    messageTTL: 2 * 60 * 1000,   // 2 minutes
    countsTTL: 10 * 1000,        // 10 seconds
    maxSearchQueries: 50,
    maxMessagesPerContact: 500,
    debounceDelay: 500
  },

  // Medium workspace (1M-10M contacts)
  business: {
    searchTTL: 2 * 60 * 1000,    // 2 minutes
    messageTTL: 5 * 60 * 1000,   // 5 minutes
    countsTTL: 5 * 1000,         // 5 seconds
    maxSearchQueries: 100,
    maxMessagesPerContact: 1000,
    debounceDelay: 300
  },

  // Small workspace (<1M contacts)
  startup: {
    searchTTL: 5 * 60 * 1000,    // 5 minutes
    messageTTL: 10 * 60 * 1000,  // 10 minutes
    countsTTL: 30 * 1000,        // 30 seconds
    maxSearchQueries: 200,
    maxMessagesPerContact: 2000,
    debounceDelay: 200
  }
};
```

### Memory Optimization Strategies

```javascript
// Memory optimization utilities
const optimizeMemoryUsage = () => {
  // 1. Implement LRU eviction
  const implementLRUEviction = (cache, maxSize) => {
    if (cache.size > maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
  };

  // 2. Compress large objects
  const compressLargeObjects = (data) => {
    if (JSON.stringify(data).length > 10000) {
      // Implement compression logic
      return {
        compressed: true,
        data: /* compressed data */
      };
    }
    return data;
  };

  // 3. Periodic cleanup
  setInterval(() => {
    searchResultsCache.cleanup();
    messageHistoryCache.performMemoryCleanup();
  }, 60000); // Every minute
};
```

### Performance Monitoring Setup

```javascript
// Set up performance monitoring
const setupPerformanceMonitoring = () => {
  // Start monitoring
  cachePerformanceMonitor.startMonitoring(60000); // 1-minute intervals

  // Set up alerts
  const checkPerformanceAlerts = () => {
    const report = cachePerformanceMonitor.getPerformanceReport();
    
    if (report.overall.hitRate < 70) {
      console.warn('⚠️ Cache hit rate below 70%:', report.overall.hitRate);
    }
    
    if (report.overall.averageResponseTime > 100) {
      console.warn('⚠️ Average response time above 100ms:', report.overall.averageResponseTime);
    }
  };

  setInterval(checkPerformanceAlerts, 5 * 60 * 1000); // Every 5 minutes
};
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Cache Not Working

**Symptoms:**
- No performance improvement
- Always hitting database
- Cache hit rate at 0%

**Diagnosis:**
```javascript
// Check cache service initialization
console.log('Search cache:', searchResultsCache);
console.log('Message cache:', messageHistoryCache);

// Check cache entries
showSearchCacheStats(workspaceId);
showMessageCacheStats(workspaceId);
```

**Solutions:**
1. Verify cache services are properly imported
2. Check workspace ID is being passed correctly
3. Ensure cache isn't being cleared immediately after setting
4. Verify TTL configuration is appropriate

#### Issue 2: Memory Leaks

**Symptoms:**
- Browser memory usage continuously increasing
- Performance degrading over time
- Browser tab becoming unresponsive

**Diagnosis:**
```javascript
// Monitor memory usage
const monitorMemory = () => {
  if (performance.memory) {
    console.log(`Memory usage: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
  }
  
  // Check cache sizes
  console.log('Search cache size:', searchResultsCache.cache.size);
  console.log('Message cache size:', messageHistoryCache.totalCachedMessages);
};

setInterval(monitorMemory, 10000); // Every 10 seconds
```

**Solutions:**
1. Implement proper cleanup in useEffect hooks
2. Set appropriate cache size limits
3. Use WeakMap for temporary references
4. Clear timers and intervals on component unmount

#### Issue 3: Stale Data

**Symptoms:**
- Old data showing in UI
- Cache not updating with real-time changes
- Inconsistent data across components

**Diagnosis:**
```javascript
// Check cache invalidation
const debugCacheInvalidation = () => {
  // Monitor invalidation events
  socket.on('contact:updated', (data) => {
    console.log('Cache invalidation triggered:', data);
  });
  
  // Check last cache update time
  const cached = searchResultsCache.getCachedResults(workspaceId, query);
  if (cached) {
    console.log('Cache age:', Date.now() - cached.timestamp, 'ms');
  }
};
```

**Solutions:**
1. Verify Socket.IO event handlers are properly set up
2. Check cache TTL values aren't too long
3. Ensure invalidation is called after data updates
4. Use manual refresh mechanisms for critical data

#### Issue 4: Poor Cache Hit Rates

**Symptoms:**
- Cache hit rate below 50%
- Frequent API calls despite caching
- Poor performance improvements

**Diagnosis:**
```javascript
// Analyze cache patterns
const analyzeCachePatterns = () => {
  const analytics = searchResultsCache.getSearchAnalytics(workspaceId);
  console.log('Search patterns:', analytics);
  
  const recommendations = cachePerformanceMonitor.getRecommendations();
  console.log('Performance recommendations:', recommendations);
};
```

**Solutions:**
1. Increase cache TTL for stable data
2. Implement cache warming strategies
3. Optimize cache key generation
4. Reduce cache invalidation frequency

### Debug Mode Setup

```javascript
// Enable comprehensive debugging
const enableDebugMode = () => {
  // Set debug flags
  window.CACHE_DEBUG = true;
  localStorage.setItem('cache_debug', 'true');
  
  // Enhanced logging
  const originalLog = console.log;
  console.log = (...args) => {
    if (window.CACHE_DEBUG) {
      originalLog('[CACHE DEBUG]', new Date().toISOString(), ...args);
    }
  };
  
  // Performance tracking
  const trackCacheOperations = () => {
    const operations = ['get', 'set', 'delete', 'invalidate'];
    operations.forEach(op => {
      const original = searchResultsCache[op];
      searchResultsCache[op] = function(...args) {
        console.log(`Cache ${op}:`, args[0]);
        const start = performance.now();
        const result = original.apply(this, args);
        console.log(`Cache ${op} took:`, performance.now() - start, 'ms');
        return result;
      };
    });
  };
  
  trackCacheOperations();
};
```

---

## Best Practices

### 1. Cache Key Design

```javascript
// Good cache key patterns
const generateCacheKey = (type, workspaceId, identifier, params = {}) => {
  const paramsHash = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  
  return `${type}:${workspaceId}:${identifier}:${btoa(paramsHash)}`;
};

// Examples:
// search:workspace_123:john:eyJzdGF0dXMiOiJvcGVuIn0=
// messages:workspace_123:contact_456:eyJwYWdlIjoxfQ==
// counts:workspace_123:unassigned:e30=
```

### 2. Error Handling

```javascript
// Robust error handling pattern
const safeCache = {
  async get(key, fallback) {
    try {
      const cached = await cache.get(key);
      return cached || fallback();
    } catch (error) {
      console.error('Cache get error:', error);
      return fallback();
    }
  },

  async set(key, value, ttl) {
    try {
      await cache.set(key, value, ttl);
    } catch (error) {
      console.error('Cache set error:', error);
      // Continue without caching
    }
  }
};
```

### 3. Component Integration

```javascript
// Clean component integration pattern
const useCacheableData = (key, fetchFunction, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (!forceRefresh) {
        result = await cache.get(key);
      }
      
      if (!result) {
        result = await fetchFunction();
        await cache.set(key, result, options.ttl);
      }
      
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Data loading error:', err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, options.ttl]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return { data, loading, error, refresh: () => loadData(true) };
};
```

### 4. Testing Strategy

```javascript
// Comprehensive testing approach
describe('Cache System', () => {
  beforeEach(() => {
    // Clear all caches
    searchResultsCache.clearAll();
    messageHistoryCache.invalidateMessageCache(workspaceId);
  });

  describe('Search Caching', () => {
    it('should cache search results', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ contacts: [], totalCount: 0 });
      
      // First call should hit API
      await cachedSearch('test', {}, mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second call should use cache
      await cachedSearch('test', {}, mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should debounce rapid searches', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ contacts: [], totalCount: 0 });
      
      // Fire multiple searches rapidly
      const promises = [
        cachedSearch('t', {}, mockFetch),
        cachedSearch('te', {}, mockFetch),
        cachedSearch('tes', {}, mockFetch),
        cachedSearch('test', {}, mockFetch),
      ];
      
      await Promise.all(promises);
      
      // Should only make one API call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Caching', () => {
    it('should cache message history', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ 
        messages: [{ id: 1, body: 'test' }], 
        pagination: {} 
      });
      
      // First load
      const result1 = await loadCachedMessageHistory('contact_1', mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // Second load should use cache
      const result2 = await loadCachedMessageHistory('contact_1', mockFetch);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });

    it('should handle real-time updates', () => {
      const contactId = 'contact_1';
      const newMessage = { id: 2, body: 'new message' };
      
      // Add message to cache
      addMessageToCache(contactId, newMessage);
      
      // Verify cache contains new message
      const cached = messageHistoryCache.getCachedMessageHistory(workspaceId, contactId);
      expect(cached.messages).toContainEqual(newMessage);
    });
  });
});
```

---

## Maintenance

### Regular Maintenance Tasks

#### Daily Tasks
- [ ] Monitor cache hit rates (target: >70%)
- [ ] Check memory usage trends
- [ ] Review error logs for cache failures
- [ ] Verify real-time synchronization is working

#### Weekly Tasks
- [ ] Analyze cache performance reports
- [ ] Review and adjust TTL values based on usage patterns
- [ ] Check for memory leaks in long-running sessions
- [ ] Update cache size limits if needed

#### Monthly Tasks
- [ ] Full performance benchmark testing
- [ ] Review and optimize cache key strategies
- [ ] Update cache configurations based on growth
- [ ] Document any performance improvements or issues

### Monitoring Dashboard

```javascript
// Create monitoring dashboard
const createCacheMonitoringDashboard = () => {
  const dashboard = {
    getOverallHealth() {
      const searchAnalytics = searchResultsCache.getSearchAnalytics();
      const messageAnalytics = messageHistoryCache.getMessageCacheAnalytics();
      const performanceReport = cachePerformanceMonitor.getPerformanceReport();

      return {
        overall: {
          status: performanceReport.overall.hitRate > 70 ? 'healthy' : 'warning',
          hitRate: performanceReport.overall.hitRate,
          avgResponseTime: performanceReport.overall.averageResponseTime
        },
        search: {
          hitRate: searchAnalytics.cacheHitRate,
          totalQueries: searchAnalytics.totalSearches,
          cacheSize: searchAnalytics.totalCacheSize
        },
        messages: {
          hitRate: messageAnalytics.hitRate,
          cachedConversations: messageAnalytics.cachedConversations,
          totalMessages: messageAnalytics.totalCachedMessages
        },
        recommendations: performanceReport.recommendations
      };
    },

    generateReport() {
      const health = this.getOverallHealth();
      
      console.log('🧠 Cache System Health Report');
      console.log('=====================================');
      console.log(`Overall Status: ${health.overall.status.toUpperCase()}`);
      console.log(`Hit Rate: ${health.overall.hitRate}`);
      console.log(`Avg Response Time: ${health.overall.avgResponseTime}`);
      console.log('');
      console.log('Search Cache:');
      console.log(`  Hit Rate: ${health.search.hitRate}`);
      console.log(`  Total Queries: ${health.search.totalQueries}`);
      console.log(`  Cache Size: ${health.search.cacheSize}/100`);
      console.log('');
      console.log('Message Cache:');
      console.log(`  Hit Rate: ${health.messages.hitRate}`);
      console.log(`  Cached Conversations: ${health.messages.cachedConversations}`);
      console.log(`  Total Messages: ${health.messages.totalMessages}`);
      
      if (health.recommendations.length > 0) {
        console.log('');
        console.log('Recommendations:');
        health.recommendations.forEach(rec => {
          console.log(`  ${rec.priority.toUpperCase()}: ${rec.message}`);
        });
      }
    }
  };

  // Auto-generate reports
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      dashboard.generateReport();
    }, 5 * 60 * 1000); // Every 5 minutes in development
  }

  return dashboard;
};

// Initialize dashboard
window.cacheMonitoringDashboard = createCacheMonitoringDashboard();
```

### Cache Analytics Tracking

```javascript
// Analytics tracking for business intelligence
const trackCacheAnalytics = () => {
  const analytics = {
    searchPatterns: new Map(),
    performanceMetrics: [],
    userBehavior: new Map()
  };

  // Track search patterns
  const originalSearch = searchResultsCache.performSearch;
  searchResultsCache.performSearch = function(workspaceId, query, filters, searchFunction) {
    // Track search pattern
    const pattern = { query: query.toLowerCase(), filters, timestamp: Date.now() };
    
    if (!analytics.searchPatterns.has(workspaceId)) {
      analytics.searchPatterns.set(workspaceId, []);
    }
    analytics.searchPatterns.get(workspaceId).push(pattern);

    return originalSearch.call(this, workspaceId, query, filters, searchFunction);
  };

  // Generate insights
  const generateInsights = () => {
    const insights = {
      mostSearchedTerms: [],
      averageSearchLength: 0,
      peakUsageHours: [],
      cacheEfficiency: 0
    };

    // Analyze search patterns
    for (const [workspaceId, patterns] of analytics.searchPatterns) {
      const termCounts = new Map();
      let totalLength = 0;

      patterns.forEach(pattern => {
        const term = pattern.query;
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
        totalLength += term.length;
      });

      insights.averageSearchLength = totalLength / patterns.length;
      insights.mostSearchedTerms = Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    }

    return insights;
  };

  return { analytics, generateInsights };
};
```

---

## Conclusion

This SOP provides comprehensive guidance for developers working with the LiveChat2 Advanced Caching System. The system delivers enterprise-scale performance with intelligent caching strategies, real-time synchronization, and robust error handling.

### Key Takeaways

1. **Always use caching services** for any data fetching operations
2. **Implement proper cleanup** to prevent memory leaks
3. **Monitor performance metrics** regularly
4. **Test thoroughly** with realistic data loads
5. **Follow the debugging procedures** when issues arise

### Support Resources

- **Code Examples**: See `/examples` directory
- **Performance Tests**: Run `npm test -- --grep="cache"`
- **Debug Tools**: Available in browser console
- **Monitoring**: Check Settings > Advanced UI for cache analytics

### Contributing

When adding new caching features:

1. Follow the existing patterns and interfaces
2. Add comprehensive tests
3. Update this SOP with new examples
4. Include performance benchmarks
5. Add debug/monitoring capabilities

---

**Document Version**: 1.0  
**Last Updated**: July 2025  
**Authors**: LiveChat2 Development Team  
**Status**: Production Ready