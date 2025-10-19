# Phase 7: Performance Monitoring

## Overview

Implementing a robust performance monitoring system is essential for maintaining application performance over time. This phase focuses on setting up tools and processes to continuously monitor, analyze, and improve application performance as the codebase evolves.

## Problem Statement

Common performance monitoring challenges in our application:

1. Lack of visibility into real-world performance metrics
2. Difficulty identifying performance regressions
3. Inconsistent performance across different devices and network conditions
4. No established performance budgets or thresholds
5. Inability to correlate code changes with performance impacts

## Implementation Guide

### Step 1: Implement Web Vitals Monitoring

Set up monitoring for Core Web Vitals:

```javascript
// Install web-vitals
// npm install web-vitals

// In your main application file
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // You can send to your analytics service of choice
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(metric);
  } else {
    // In production, send to your analytics service
    // Example: fetch('/analytics', {
    //   method: 'POST',
    //   body: JSON.stringify(metric),
    // });
  }
}

// Report Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getLCP(sendToAnalytics);
getFCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Step 2: Implement Performance Monitoring HOC

Create a Higher-Order Component for monitoring component performance:

```javascript
// performanceMonitor.js
import React, { Component } from 'react';

export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return class PerformanceMonitor extends Component {
    constructor(props) {
      super(props);
      this.displayName = `withPerformanceMonitoring(${componentName})`;
      this.renderCount = 0;
      this.lastRenderTime = 0;
    }
    
    componentDidMount() {
      this.logMount();
    }
    
    componentDidUpdate() {
      this.logUpdate();
    }
    
    logMount() {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Performance] ${componentName} mounted`);
      }
    }
    
    logUpdate() {
      if (process.env.NODE_ENV !== 'production') {
        this.renderCount++;
        const now = performance.now();
        const renderTime = this.lastRenderTime ? (now - this.lastRenderTime) : 0;
        
        console.log(`[Performance] ${componentName} re-rendered (#${this.renderCount}) - ${renderTime.toFixed(2)}ms`);
        
        if (renderTime > 16) { // 60fps threshold (16.67ms)
          console.warn(`[Performance Warning] ${componentName} render time exceeded 16ms threshold`);
        }
        
        this.lastRenderTime = now;
      }
    }
    
    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
};

// Usage example
import { withPerformanceMonitoring } from './performanceMonitor';

const ContactList = ({ contacts }) => {
  // Component implementation
};

export default withPerformanceMonitoring(ContactList, 'ContactList');
```

### Step 3: Implement Custom Performance Hooks

Create custom hooks for measuring performance:

```javascript
// useRenderTimer.js
import { useRef, useEffect } from 'react';

export const useRenderTimer = (componentName) => {
  const renderCount = useRef(0);
  const startTime = useRef(performance.now());
  
  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    renderCount.current++;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Performance] ${componentName} rendered in ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
      
      if (renderTime > 16) {
        console.warn(`[Performance Warning] ${componentName} render time exceeded 16ms threshold`);
      }
    }
    
    // Reset start time for next render
    startTime.current = performance.now();
  });
};

// useDataFetchTimer.js
import { useRef, useEffect } from 'react';

export const useDataFetchTimer = (queryKey, isLoading, isError) => {
  const startTime = useRef(null);
  
  useEffect(() => {
    if (isLoading && !startTime.current) {
      startTime.current = performance.now();
    } else if (!isLoading && startTime.current) {
      const fetchTime = performance.now() - startTime.current;
      
      if (process.env.NODE_ENV !== 'production') {
        if (isError) {
          console.error(`[Performance] Query "${queryKey}" failed after ${fetchTime.toFixed(2)}ms`);
        } else {
          console.log(`[Performance] Query "${queryKey}" completed in ${fetchTime.toFixed(2)}ms`);
          
          if (fetchTime > 1000) {
            console.warn(`[Performance Warning] Query "${queryKey}" took over 1 second to complete`);
          }
        }
      }
      
      startTime.current = null;
    }
  }, [isLoading, isError, queryKey]);
};
```

### Step 4: Set Up Performance Budgets

Define and monitor performance budgets:

```javascript
// performanceBudgets.js
export const PERFORMANCE_BUDGETS = {
  // Time to First Byte (TTFB)
  ttfb: 200, // ms
  
  // First Contentful Paint (FCP)
  fcp: 1000, // ms
  
  // Largest Contentful Paint (LCP)
  lcp: 2500, // ms
  
  // First Input Delay (FID)
  fid: 100, // ms
  
  // Cumulative Layout Shift (CLS)
  cls: 0.1, // score
  
  // Total Bundle Size
  totalBundleSize: 250 * 1024, // 250KB
  
  // Initial JS Bundle Size
  initialJsBundleSize: 120 * 1024, // 120KB
  
  // Initial CSS Bundle Size
  initialCssBundleSize: 20 * 1024, // 20KB
  
  // Component Render Time
  componentRenderTime: 16, // ms (60fps)
  
  // API Response Time
  apiResponseTime: 500 // ms
};

// Check if metrics exceed budgets
export const checkPerformanceBudget = (metricName, value) => {
  if (!PERFORMANCE_BUDGETS[metricName]) {
    console.warn(`[Performance] No budget defined for metric "${metricName}"`);
    return true;
  }
  
  const budget = PERFORMANCE_BUDGETS[metricName];
  const exceeds = value > budget;
  
  if (exceeds && process.env.NODE_ENV !== 'production') {
    console.warn(`[Performance Budget Exceeded] ${metricName}: ${value} (budget: ${budget})`);
  }
  
  return !exceeds;
};
```

### Step 5: Implement Performance Monitoring Dashboard

Create a developer-only performance dashboard:

```javascript
// PerformanceDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Button,
  useDisclosure
} from '@chakra-ui/react';
import { PERFORMANCE_BUDGETS } from './performanceBudgets';

// Only render in development
const PerformanceDashboard = () => {
  const { isOpen, onToggle } = useDisclosure();
  const [metrics, setMetrics] = useState({
    webVitals: {},
    componentRenders: {},
    apiCalls: {}
  });
  
  // Collect metrics from window.__PERFORMANCE_DATA__
  useEffect(() => {
    const timer = setInterval(() => {
      if (window.__PERFORMANCE_DATA__) {
        setMetrics(window.__PERFORMANCE_DATA__);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  if (!isOpen) {
    return (
      <Button
        position="fixed"
        bottom="20px"
        right="20px"
        zIndex={9999}
        colorScheme="teal"
        onClick={onToggle}
      >
        Show Performance Dashboard
      </Button>
    );
  }
  
  return (
    <Box
      position="fixed"
      bottom="0"
      right="0"
      width="80%"
      height="70%"
      bg="white"
      boxShadow="lg"
      zIndex={9999}
      p={4}
      overflowY="auto"
    >
      <Heading size="md" mb={4}>
        Performance Dashboard
        <Button size="sm" ml={4} onClick={onToggle}>
          Close
        </Button>
      </Heading>
      
      <Tabs>
        <TabList>
          <Tab>Web Vitals</Tab>
          <Tab>Component Renders</Tab>
          <Tab>API Calls</Tab>
          <Tab>Bundle Size</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Box display="flex" flexWrap="wrap">
              {Object.entries(metrics.webVitals).map(([name, value]) => (
                <Stat key={name} flex="1" minWidth="200px" p={4}>
                  <StatLabel>{name}</StatLabel>
                  <StatNumber>
                    {value}
                    {name === 'cls' ? '' : 'ms'}
                  </StatNumber>
                  <StatHelpText>
                    <Badge
                      colorScheme={
                        value <= PERFORMANCE_BUDGETS[name] ? 'green' : 'red'
                      }
                    >
                      Budget: {PERFORMANCE_BUDGETS[name]}
                      {name === 'cls' ? '' : 'ms'}
                    </Badge>
                  </StatHelpText>
                </Stat>
              ))}
            </Box>
          </TabPanel>
          
          <TabPanel>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Component</Th>
                  <Th>Render Count</Th>
                  <Th>Last Render Time</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(metrics.componentRenders).map(([name, data]) => (
                  <Tr key={name}>
                    <Td>{name}</Td>
                    <Td>{data.renderCount}</Td>
                    <Td>{data.lastRenderTime.toFixed(2)}ms</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          data.lastRenderTime <= PERFORMANCE_BUDGETS.componentRenderTime
                            ? 'green'
                            : 'red'
                        }
                      >
                        {data.lastRenderTime <= PERFORMANCE_BUDGETS.componentRenderTime
                          ? 'Good'
                          : 'Slow'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
          
          <TabPanel>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>API Call</Th>
                  <Th>Response Time</Th>
                  <Th>Status</Th>
                  <Th>Last Called</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(metrics.apiCalls).map(([name, data]) => (
                  <Tr key={name}>
                    <Td>{name}</Td>
                    <Td>{data.responseTime.toFixed(2)}ms</Td>
                    <Td>
                      <Badge
                        colorScheme={
                          data.responseTime <= PERFORMANCE_BUDGETS.apiResponseTime
                            ? 'green'
                            : 'red'
                        }
                      >
                        {data.responseTime <= PERFORMANCE_BUDGETS.apiResponseTime
                          ? 'Good'
                          : 'Slow'}
                      </Badge>
                    </Td>
                    <Td>{new Date(data.timestamp).toLocaleTimeString()}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>
          
          <TabPanel>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Bundle</Th>
                  <Th>Size</Th>
                  <Th>Budget</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>Total JS</Td>
                  <Td>{(metrics.bundleSize?.total / 1024).toFixed(2)} KB</Td>
                  <Td>{PERFORMANCE_BUDGETS.totalBundleSize / 1024} KB</Td>
                  <Td>
                    <Badge
                      colorScheme={
                        metrics.bundleSize?.total <= PERFORMANCE_BUDGETS.totalBundleSize
                          ? 'green'
                          : 'red'
                      }
                    >
                      {metrics.bundleSize?.total <= PERFORMANCE_BUDGETS.totalBundleSize
                        ? 'Within Budget'
                        : 'Over Budget'}
                    </Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td>Initial JS</Td>
                  <Td>{(metrics.bundleSize?.initial / 1024).toFixed(2)} KB</Td>
                  <Td>{PERFORMANCE_BUDGETS.initialJsBundleSize / 1024} KB</Td>
                  <Td>
                    <Badge
                      colorScheme={
                        metrics.bundleSize?.initial <= PERFORMANCE_BUDGETS.initialJsBundleSize
                          ? 'green'
                          : 'red'
                      }
                    >
                      {metrics.bundleSize?.initial <= PERFORMANCE_BUDGETS.initialJsBundleSize
                        ? 'Within Budget'
                        : 'Over Budget'}
                    </Badge>
                  </Td>
                </Tr>
                <Tr>
                  <Td>CSS</Td>
                  <Td>{(metrics.bundleSize?.css / 1024).toFixed(2)} KB</Td>
                  <Td>{PERFORMANCE_BUDGETS.initialCssBundleSize / 1024} KB</Td>
                  <Td>
                    <Badge
                      colorScheme={
                        metrics.bundleSize?.css <= PERFORMANCE_BUDGETS.initialCssBundleSize
                          ? 'green'
                          : 'red'
                      }
                    >
                      {metrics.bundleSize?.css <= PERFORMANCE_BUDGETS.initialCssBundleSize
                        ? 'Within Budget'
                        : 'Over Budget'}
                    </Badge>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default PerformanceDashboard;
```

### Step 6: Implement Automated Performance Testing

Set up automated performance testing with Lighthouse CI:

```javascript
// lighthouse-config.js
module.exports = {
  ci: {
    collect: {
      // Add URLs to test
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/contacts',
        'http://localhost:3000/messages'
      ],
      // Set number of runs
      numberOfRuns: 3,
      // Use desktop configuration
      settings: {
        preset: 'desktop'
      }
    },
    upload: {
      // Upload results to temporary storage
      target: 'temporary-public-storage'
    },
    assert: {
      // Set performance score thresholds
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }]
      }
    }
  }
};
```

## Implementation Examples

### Example 1: Monitoring Component Performance

**Before:**
```javascript
// No performance monitoring
const ContactList = ({ contacts }) => {
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};

export default ContactList;
```

**After:**
```javascript
import { useRenderTimer } from '../../utils/useRenderTimer';

const ContactList = ({ contacts }) => {
  // Add performance monitoring in development
  if (process.env.NODE_ENV !== 'production') {
    useRenderTimer('ContactList');
  }
  
  return (
    <VStack spacing={4}>
      {contacts.map(contact => (
        <ContactCard key={contact.id} contact={contact} />
      ))}
    </VStack>
  );
};

// Create a performance-tracked version for development
const ContactListWithPerformanceTracking = process.env.NODE_ENV !== 'production'
  ? withPerformanceMonitoring(ContactList, 'ContactList')
  : ContactList;

export default ContactListWithPerformanceTracking;
```

### Example 2: Monitoring API Performance

**Before:**
```javascript
// No performance monitoring for API calls
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
      enabled: !!workspaceId
    }
  );
};
```

**After:**
```javascript
import { useDataFetchTimer } from '../../utils/useDataFetchTimer';

// With performance monitoring
const useContacts = (workspaceId) => {
  const queryKey = ['contacts', workspaceId];
  
  const query = useQuery(
    queryKey,
    async () => {
      const startTime = performance.now();
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .eq('workspace_id', workspaceId);
        
      if (error) throw error;
      
      // Log performance metrics in development
      if (process.env.NODE_ENV !== 'production') {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Store in global performance data object
        if (!window.__PERFORMANCE_DATA__) {
          window.__PERFORMANCE_DATA__ = { apiCalls: {} };
        }
        
        window.__PERFORMANCE_DATA__.apiCalls[`contacts_${workspaceId}`] = {
          responseTime: duration,
          timestamp: Date.now(),
          dataSize: JSON.stringify(data).length
        };
        
        // Check against budget
        if (duration > 500) {
          console.warn(`[Performance Warning] API call "contacts_${workspaceId}" took ${duration.toFixed(2)}ms`);
        }
      }
      
      return data;
    },
    {
      enabled: !!workspaceId
    }
  );
  
  // Use the timer hook in development
  if (process.env.NODE_ENV !== 'production') {
    useDataFetchTimer(`contacts_${workspaceId}`, query.isLoading, query.isError);
  }
  
  return query;
};
```

## Performance Impact

| Feature | Before Monitoring | After Monitoring | Benefit |
|---------|-------------------|------------------|---------|
| Performance Visibility | Limited visibility | Comprehensive metrics | Early detection of issues |
| Performance Regression | Manual testing | Automated testing | Prevents performance degradation |
| Developer Awareness | Low awareness | High awareness | Performance-conscious development |
| User Experience | Inconsistent | Consistently monitored | Improved user satisfaction |
| Performance Budgets | None | Clearly defined | Prevents performance creep |

## Best Practices for Future Development

1. **Performance Budgets**: Adhere to established performance budgets for all new features
2. **Automated Testing**: Run Lighthouse CI tests for all pull requests
3. **Component Monitoring**: Add performance monitoring to all new components
4. **API Monitoring**: Track and optimize all API calls
5. **Regular Audits**: Conduct monthly performance audits
6. **User-Centric Metrics**: Focus on metrics that impact user experience
7. **Mobile Performance**: Test on low-end mobile devices
8. **Documentation**: Document performance considerations for each feature

## Testing

After implementing performance monitoring:

1. Verify that performance metrics are being collected correctly
2. Test the performance dashboard in development mode
3. Run Lighthouse CI tests to establish baseline metrics
4. Verify that performance budgets are being enforced
5. Test monitoring on different devices and network conditions

## Ongoing Maintenance

1. **Regular Reviews**: Review performance metrics weekly
2. **Update Budgets**: Adjust performance budgets as needed
3. **Refine Monitoring**: Improve monitoring tools based on team feedback
4. **Performance Reports**: Generate monthly performance reports
5. **Optimization Sprints**: Schedule dedicated performance optimization sprints

## Diagram: Performance Monitoring Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│             Performance Monitoring System           │
│                                                     │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │ Web Vitals  │      │     Component           │   │
│  │ Monitoring  │      │     Performance         │   │
│  │             │      │                         │   │
│  └──────┬──────┘      └────────────┬────────────┘   │
│         │                          │                │
│         ▼                          ▼                │
│  ┌─────────────────────────────────────────────┐    │
│  │                                             │    │
│  │           Performance Data Store            │    │
│  │                                             │    │
│  └────────────────────────┬────────────────────┘    │
│                           │                         │
│                           ▼                         │
│  ┌─────────────┐      ┌─────────────────────────┐   │
│  │             │      │                         │   │
│  │ Performance │      │     Lighthouse CI       │   │
│  │ Dashboard   │      │     Testing             │   │
│  │             │      │                         │   │
│  └─────────────┘      └─────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│                                                     │
│                 Performance Benefits                │
│                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │ Early Issue │    │ Consistent  │    │Improved │  │
│  │ Detection   │    │ Performance │    │UX       │  │
│  └─────────────┘    └─────────────┘    └─────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Conclusion

Performance monitoring is an ongoing process that requires continuous attention and refinement. By implementing these monitoring tools and practices, we can ensure that our application maintains high performance standards as it evolves and grows. Regular reviews of performance metrics will help identify issues early and guide optimization efforts, ultimately providing a better experience for our users.

## Next Steps

After implementing all phases of the performance optimization strategy, continue to:

1. Regularly review performance metrics
2. Conduct periodic performance audits
3. Update optimization documentation as new techniques are discovered
4. Train new team members on performance best practices
5. Continuously refine and improve the monitoring system
