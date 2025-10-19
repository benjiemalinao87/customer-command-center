# Real-time Message Handling Extraction Plan
## Memory Leak Prevention & Best Practices

### 🚨 **Current Memory Leak Risks in ChatArea.js**

Based on the NestJS memory leak article, our current ChatArea.js has **high-risk patterns**:

#### 1. **Event Emitter Listeners (Socket.IO)**
```javascript
// CURRENT RISKY PATTERN in ChatArea.js:
useEffect(() => {
  socket.on('new_message', handleNewMessage);
  socket.on('message_update', handleMessageUpdate);
  // ❌ Missing proper cleanup in some cases
}, [contact?.id]);
```

#### 2. **Supabase Real-time Subscriptions**
```javascript
// CURRENT RISKY PATTERN:
const subscription = supabase
  .channel('messages')
  .on('postgres_changes', callback)
  .subscribe();
// ❌ Subscriptions may not be properly cleaned up
```

#### 3. **Timers and Intervals (Typing Indicators)**
```javascript
// CURRENT RISKY PATTERN:
const typingTimeout = setTimeout(() => {
  setIsTyping(false);
}, 2000);
// ❌ Timeouts may accumulate without cleanup
```

#### 4. **Unmanaged State and Caches**
```javascript
// CURRENT RISKY PATTERN:
const [messages, setMessages] = useState([]);
const [realTimeMessages, setRealTimeMessages] = useState([]);
// ❌ Message arrays can grow indefinitely
```

---

## 🎯 **Extraction Strategy: Memory-Safe Real-time Handler**

### **Phase 1: Create `useMessageRealtime` Custom Hook**

**File**: `ChatArea/hooks/useMessageRealtime.js`

```javascript
/**
 * Memory-safe real-time message handling hook
 * Implements best practices from NestJS memory leak prevention
 */
const useMessageRealtime = (contact, workspace, user) => {
  // 1. PROPER EVENT LISTENER CLEANUP
  useEffect(() => {
    if (!contact?.id) return;
    
    const cleanup = [];
    
    // Socket.IO with proper cleanup
    const handleNewMessage = (message) => { /* ... */ };
    socket.on('new_message', handleNewMessage);
    cleanup.push(() => socket.off('new_message', handleNewMessage));
    
    // Return cleanup function
    return () => {
      cleanup.forEach(fn => fn());
    };
  }, [contact?.id]);
  
  // 2. RXJS/SUPABASE SUBSCRIPTION CLEANUP  
  useEffect(() => {
    const subscriptions = [];
    
    const messageSubscription = supabase
      .channel(`messages:${contact?.id}`)
      .on('postgres_changes', handleChange)
      .subscribe();
    
    subscriptions.push(messageSubscription);
    
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [contact?.id]);
  
  // 3. TIMER MANAGEMENT
  const timerRefs = useRef(new Set());
  
  const createTimer = (callback, delay) => {
    const timer = setTimeout(() => {
      timerRefs.current.delete(timer);
      callback();
    }, delay);
    timerRefs.current.add(timer);
    return timer;
  };
  
  useEffect(() => {
    return () => {
      // Clear all timers on unmount
      timerRefs.current.forEach(timer => clearTimeout(timer));
      timerRefs.current.clear();
    };
  }, []);
  
  // 4. BOUNDED MESSAGE CACHE (LRU-style)
  const MAX_MESSAGES = 1000; // Prevent infinite growth
  const addMessage = useCallback((newMessage) => {
    setMessages(prev => {
      const updated = [...prev, newMessage];
      return updated.length > MAX_MESSAGES 
        ? updated.slice(-MAX_MESSAGES) // Keep only last 1000
        : updated;
    });
  }, []);
  
  return {
    messages,
    isConnected,
    connectionStatus,
    addMessage,
    // Expose cleanup functions for testing
    cleanup: () => {
      timerRefs.current.forEach(timer => clearTimeout(timer));
    }
  };
};
```

### **Phase 2: Memory Leak Prevention Features**

#### **A. Connection Health Monitoring**
```javascript
const useConnectionHealth = () => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Exponential backoff for reconnection
  const reconnectWithBackoff = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
    
    const timer = setTimeout(() => {
      // Reconnect logic
    }, delay);
    
    return () => clearTimeout(timer);
  }, [reconnectAttempts]);
};
```

#### **B. Message Deduplication Service**
```javascript
const useMessageDeduplication = () => {
  const seenMessages = useRef(new Set());
  const CACHE_SIZE_LIMIT = 5000;
  
  const isDuplicate = useCallback((messageId) => {
    if (seenMessages.current.size > CACHE_SIZE_LIMIT) {
      // Clear old entries to prevent memory leak
      seenMessages.current.clear();
    }
    
    if (seenMessages.current.has(messageId)) {
      return true;
    }
    
    seenMessages.current.add(messageId);
    return false;
  }, []);
  
  return { isDuplicate };
};
```

#### **C. Typing Indicator Manager**
```javascript
const useTypingIndicator = () => {
  const typingTimers = useRef(new Map());
  
  const setTyping = useCallback((userId, isTyping) => {
    // Clear existing timer
    const existingTimer = typingTimers.current.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    if (isTyping) {
      // Set new timer with cleanup
      const timer = setTimeout(() => {
        setTypingUsers(prev => prev.filter(id => id !== userId));
        typingTimers.current.delete(userId);
      }, 3000);
      
      typingTimers.current.set(userId, timer);
    }
  }, []);
  
  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      typingTimers.current.forEach(timer => clearTimeout(timer));
      typingTimers.current.clear();
    };
  }, []);
};
```

---

## 🧪 **Testing Strategy for Memory Leaks**

### **1. Memory Leak Detection Tests**
```javascript
// Test file: useMessageRealtime.test.js
describe('Memory Leak Prevention', () => {
  test('cleans up all event listeners on unmount', () => {
    const { unmount } = renderHook(() => useMessageRealtime(contact));
    
    // Verify listeners are added
    expect(socket.listenerCount('new_message')).toBe(1);
    
    unmount();
    
    // Verify listeners are removed
    expect(socket.listenerCount('new_message')).toBe(0);
  });
  
  test('limits message cache size', () => {
    const { result } = renderHook(() => useMessageRealtime(contact));
    
    // Add more than MAX_MESSAGES
    for (let i = 0; i < 1500; i++) {
      result.current.addMessage({ id: i, body: `Message ${i}` });
    }
    
    expect(result.current.messages.length).toBeLessThanOrEqual(1000);
  });
  
  test('clears all timers on component unmount', () => {
    const { result, unmount } = renderHook(() => useMessageRealtime(contact));
    
    // Create some timers
    result.current.createTimer(() => {}, 1000);
    result.current.createTimer(() => {}, 2000);
    
    unmount();
    
    // Verify cleanup was called
    expect(result.current.timerRefs.current.size).toBe(0);
  });
});
```

### **2. Performance Monitoring**
```javascript
const usePerformanceMonitoring = () => {
  useEffect(() => {
    // Monitor memory usage in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        if (performance.memory) {
          console.log('Memory Usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          });
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, []);
};
```

---

## 📋 **Implementation Steps**

### **Step 1: Extract Real-time Logic** ⭐ **NEXT**
1. Create `useMessageRealtime` hook with proper cleanup
2. Implement bounded message cache
3. Add connection health monitoring
4. Extract from ChatArea.js (~200 lines)

### **Step 2: Add Memory Leak Prevention**
1. Implement timer management system
2. Add subscription cleanup patterns
3. Create message deduplication service
4. Add performance monitoring

### **Step 3: Testing & Validation**
1. Write memory leak detection tests
2. Add performance benchmarks
3. Test with long-running sessions
4. Validate cleanup on component unmount

### **Step 4: Documentation**
1. Document best practices for real-time features
2. Create troubleshooting guide for memory issues
3. Add monitoring recommendations

---

## 🎯 **Expected Benefits**

1. **Memory Safety**: Proper cleanup prevents leaks in long-running chat sessions
2. **Performance**: Bounded caches and efficient subscription management
3. **Maintainability**: Isolated real-time logic easier to debug and test
4. **Reliability**: Connection health monitoring and automatic recovery
5. **Code Reduction**: ~200 lines removed from ChatArea.js

---

## ❓ **Ready to proceed with Step 1?**

This extraction will address the **exact memory leak patterns** mentioned in the NestJS article while significantly improving ChatArea.js organization.

**Should we start with creating the `useMessageRealtime` hook?**