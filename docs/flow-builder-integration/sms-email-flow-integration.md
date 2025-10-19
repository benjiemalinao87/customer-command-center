# SMS and Email Flow Integration Plan

## Overview

This document outlines the plan to integrate our Flow Builder UI with SMS and email functionality using our queue services. The integration will transform the current visual-only flow builder into a fully functional workflow automation system.

## System Architecture Diagram

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Flow Builder   │────▶│  Queue Service  │────▶│  SMS/Email      │
│  (Frontend)     │     │  (Middleware)   │     │  Providers      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Flow Storage   │     │  Queue Status   │     │  Delivery       │
│  (Supabase)     │     │  Tracking       │     │  Reporting      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘

## User Journey

1. **Flow Creation**:
   - User creates a flow in the Flow Builder UI
   - Adds SMS, Email, Condition, and Delay nodes
   - Configures message content, recipients, and timing

2. **Flow Testing**:
   - User tests the flow with sample data
   - Receives preview of messages without actual sending
   - Validates flow logic and content

3. **Flow Activation**:
   - User activates the flow for production use
   - Flow is stored in Supabase with active status
   - Ready to be triggered by events or schedules

4. **Flow Execution**:
   - Flow is triggered (manually, scheduled, or event-based)
   - Each node is processed sequentially
   - Messages are queued via Queue Service
   - Delivery status is tracked and reported

5. **Flow Monitoring**:
   - User monitors flow performance in dashboard
   - Views success/failure rates and delivery metrics
   - Makes adjustments based on performance data

## Implementation Plan

### Phase 1: Database Schema Updates (Week 1) [COMPLETED]

1. **Flow Definition Tables**:
   ```sql
   -- flows table
   CREATE TABLE flows (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     name TEXT NOT NULL,
     description TEXT,
     nodes JSONB NOT NULL,
     edges JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     created_by UUID REFERENCES auth.users(id),
     workspace_id TEXT NOT NULL,
     status TEXT DEFAULT 'draft'
   );

   -- flow_executions table
   CREATE TABLE flow_executions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     flow_id UUID REFERENCES flows(id) ON DELETE CASCADE,
     contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
     workspace_id TEXT NOT NULL,
     status TEXT NOT NULL,
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     result JSONB
   );

   -- flow_execution_steps table
   CREATE TABLE flow_execution_steps (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     execution_id UUID REFERENCES flow_executions(id) ON DELETE CASCADE,
     node_id TEXT NOT NULL,
     node_type TEXT NOT NULL,
     queue_job_id TEXT,
     status TEXT NOT NULL,
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     result JSONB
   );

   -- Index for flow_executions table
   CREATE INDEX idx_flow_executions_flow_id ON flow_executions(flow_id);

   -- Index for flow_execution_steps table
   CREATE INDEX idx_flow_execution_steps_execution_id ON flow_execution_steps(execution_id);
   ```

### Phase 2: Queue Service Integration (Week 1-2) [COMPLETED]

1. **Create QueueService.js**:
   ```javascript
   // services/QueueService.js
   import axios from 'axios';
   import config from '../utils/config';
   import logger from '../utils/logger';

   const QUEUE_API_URL = 'https://secivres-eueuq.customerconnects.app/api';

   export const scheduleEmail = async (emailData, delayMs = 0, workspaceId) => {
     try {
       const response = await axios.post(`${QUEUE_API_URL}/schedule-email`, {
         to: emailData.to,
         subject: emailData.subject,
         html: emailData.body,
         contactId: emailData.contactId,
         workspaceId: workspaceId,
         delay: delayMs,
         metadata: emailData.metadata || {}
       });
       
       return { 
         success: true, 
         jobId: response.data.jobId,
         scheduledTime: new Date(Date.now() + delayMs)
       };
     } catch (error) {
       logger.error('Error scheduling email:', error);
       return { success: false, error: error.message };
     }
   };

   export const scheduleSMS = async (smsData, delayMs = 0, workspaceId) => {
     try {
       const response = await axios.post(`${QUEUE_API_URL}/schedule-sms`, {
         to: smsData.to,
         message: smsData.message,
         contactId: smsData.contactId,
         workspaceId: workspaceId,
         delay: delayMs,
         metadata: smsData.metadata || {}
       });
       
       return { 
         success: true, 
         jobId: response.data.jobId,
         scheduledTime: new Date(Date.now() + delayMs)
       };
     } catch (error) {
       logger.error('Error scheduling SMS:', error);
       return { success: false, error: error.message };
     }
   };

   export const checkJobStatus = async (jobId) => {
     try {
       const response = await axios.get(`${QUEUE_API_URL}/job-status/${jobId}`);
       return { 
         success: true, 
         status: response.data.status,
         result: response.data.result 
       };
     } catch (error) {
       logger.error('Error checking job status:', error);
       return { success: false, error: error.message };
     }
   };
   ```

### Phase 3: Flow Execution Engine (Week 2) [COMPLETED]

1. **Create FlowExecutionService.js**:
   ```javascript
   // services/FlowExecutionService.js
   import { supabase } from './supabase';
   import { scheduleSMS, scheduleEmail, scheduleJob } from './QueueService';
   import logger from '../utils/logger';

   /**
    * Flow Execution Service for handling workflow automation
    */
   class FlowExecutionService {
     /**
      * Execute a flow for a specific contact
      * @param {string} flowId - The ID of the flow to execute
      * @param {string} contactId - The ID of the contact to execute the flow for
      * @param {string} workspaceId - The workspace ID
      * @param {Object} options - Execution options
      * @returns {Promise<Object>} Execution details
      */
     async executeFlow(flowId, contactId, workspaceId, options = {}) {
       const { immediate = false } = options;
       
       try {
         // Validate parameters
         if (!flowId || !contactId || !workspaceId) {
           throw new Error('Missing required parameters for flow execution');
         }

         // Create execution record
         const { data: execution, error: execError } = await supabase
           .from('flow_executions')
           .insert({
             flow_id: flowId,
             contact_id: contactId,
             workspace_id: workspaceId,
             status: 'running'
           })
           .select()
           .single();
           
         if (execError) throw execError;
         
         // Load flow definition
         const { data: flow, error: flowError } = await supabase
           .from('flows')
           .select('*')
           .eq('id', flowId)
           .eq('workspace_id', workspaceId)
           .single();
           
         if (flowError) throw flowError;
         
         // Load contact data
         const { data: contact, error: contactError } = await supabase
           .from('contacts')
           .select('*')
           .eq('id', contactId)
           .eq('workspace_id', workspaceId)
           .single();
           
         if (contactError) throw contactError;
         
         // Parse flow definition
         const nodes = flow.nodes;
         const edges = flow.edges;
         
         // Find start node
         const startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));
         
         if (!startNode) {
           await this._updateExecutionStatus(execution.id, 'failed', { error: 'No start node found' });
           throw new Error('No start node found in flow');
         }
         
         if (immediate) {
           // For immediate execution needs (webhooks, triggers)
           // Execute the flow synchronously up to the first "heavy" node
           const result = await this._executeFlowSynchronously(
             startNode, nodes, edges, contact, execution.id, workspaceId
           );
           return { success: true, executionId: execution.id, result };
         } else {
           // For standard execution, queue the flow execution
           await this._queueNodeExecution(startNode.id, flowId, contactId, workspaceId, execution.id);
           return { 
             success: true, 
             executionId: execution.id, 
             status: 'queued',
             message: 'Flow execution has been queued'
           };
         }
       } catch (error) {
         logger.error('Error executing flow:', error);
         return { success: false, error: error.message };
       }
     }

     // Execute flow synchronously up to the first "heavy" node
     async _executeFlowSynchronously(node, allNodes, edges, contact, executionId, workspaceId) {
       // Execute "light" nodes synchronously (conditions, data transformations)
       // When hitting a "heavy" node (SMS, email, long delay), queue it and stop
       
       if (this._isHeavyNode(node)) {
         // Queue this node and return
         await this._queueNodeExecution(node.id, flow.id, contact.id, workspaceId, executionId);
         return { queued: true, nodeId: node.id };
       }
       
       // Execute this node synchronously
       const result = await this._executeNode(node, allNodes, edges, contact, executionId, workspaceId);
       
       // Find and execute next nodes synchronously if they're "light"
       const outgoingEdges = edges.filter(edge => edge.source === node.id);
       
       for (const edge of outgoingEdges) {
         const nextNode = allNodes.find(n => n.id === edge.target);
         if (nextNode) {
           await this._executeFlowSynchronously(
             nextNode, allNodes, edges, contact, executionId, workspaceId
           );
         }
       }
       
       return result;
     }

     // Determine if a node is "heavy" (should be queued) or "light" (can run synchronously)
     _isHeavyNode(node) {
       const heavyNodeTypes = ['send-message', 'send-email', 'delay'];
       return heavyNodeTypes.includes(node.type);
     }

     // Queue a node execution as a separate job
     async _queueNodeExecution(nodeId, flowId, contactId, workspaceId, executionId) {
       // Create a job in the queue service to execute this specific node
       return scheduleJob({
         type: 'EXECUTE_FLOW_NODE',
         data: {
           nodeId,
           flowId,
           contactId,
           workspaceId,
           executionId
         },
         callbackEndpoint: '/api/flow-node-completed'
       });
     }

     // Other methods remain the same...
   }

   // Export singleton instance
   export const flowExecutionService = new FlowExecutionService();
   ```

### Phase 3.1: Scalable Flow Execution Architecture (Week 2-3) [COMPLETED]

1. **Hybrid Execution Model**:
   
   The flow execution engine implements a hybrid approach to handle both immediate execution needs and long-running workflows:

   - **Synchronous Execution**: For simple operations like condition checks and data transformations
   - **Asynchronous Execution**: For time-consuming operations like sending messages or long delays
   - **Event-Driven Architecture**: Each node execution can trigger subsequent node executions

2. **Queue Service Enhancements**:

   The Queue Service has been enhanced to support the hybrid execution model with a new `scheduleJob` method that allows for flexible scheduling of any type of job, not just SMS and email messages. This provides a unified interface for all asynchronous operations in the flow execution process.

   ```javascript
   /**
    * Schedule a generic job
    * @param {Object} jobData Job data including type, data, and callback endpoint
    * @param {number} delayMs Delay in milliseconds
    * @returns {Promise<Object>} Job details including jobId
    */
   async scheduleJob(jobData, delayMs = 0) {
     try {
       if (!jobData.type) {
         throw new QueueServiceError(
           QueueErrorTypes.INVALID_PARAMETERS,
           'Job type is required'
         );
       }

       if (!jobData.data) {
         throw new QueueServiceError(
           QueueErrorTypes.INVALID_PARAMETERS,
           'Job data is required'
         );
       }

       // Ensure workspaceId is included
       if (!jobData.data.workspaceId) {
         throw new QueueServiceError(
           QueueErrorTypes.INVALID_PARAMETERS,
           'Workspace ID is required in job data'
         );
       }

       const response = await this.client.post('/api/schedule-job', {
         type: jobData.type,
         data: jobData.data,
         callbackEndpoint: jobData.callbackEndpoint || '/api/job-completed',
         delay: delayMs
       });

       return {
         success: true,
         jobId: response.data.jobId,
         scheduledTime: new Date(Date.now() + delayMs).toISOString()
       };
     } catch (error) {
       throw this._handleError(error);
     }
   }
   ```

   **Key Benefits of the Enhanced Queue Service:**

   - **Unified Interface**: Provides a consistent way to schedule any type of job
   - **Robust Error Handling**: Implements comprehensive error validation and handling
   - **Workspace Isolation**: Enforces workspace ID validation for multi-tenant security
   - **Flexible Callbacks**: Supports customizable callback endpoints for different job types
   - **Delay Support**: Allows scheduling jobs with specific delays for time-based workflows
   - **Job Tracking**: Returns job IDs and scheduled times for monitoring and management

   This enhancement allows the Flow Execution Service to efficiently manage both immediate execution needs and long-running workflows while maintaining proper isolation between workspaces.

3. **Callback API Endpoint**:

   The callback API endpoint is a critical component of the flow execution architecture, handling the completion of flow node executions and orchestrating the next steps in the workflow.

   **Endpoint Details:**
   - **URL**: `/api/flow-node-completed`
   - **Method**: POST
   - **Implementation File**: `backend/src/routes/queueProxy.js`
   - **Purpose**: Receives callbacks from the queue service when a flow node execution is completed, updates the execution step status, and queues the next nodes in the flow.

   **Request Format:**
   ```json
   {
     "jobId": "string",          // ID of the completed queue job
     "result": "object",         // Result data from the node execution
     "nodeId": "string",         // ID of the completed node
     "executionId": "string",    // ID of the flow execution
     "flowId": "string",         // ID of the flow
     "contactId": "string",      // ID of the contact
     "workspaceId": "string"     // ID of the workspace
   }
   ```

   **Response Format:**
   ```json
   {
     "success": true,
     "message": "Flow node completed and next nodes queued",
     "executionId": "string",
     "nextNodes": [
       {
         "nodeId": "string",
         "jobId": "string",
         "type": "string"
       }
     ]
   }
   ```

   **Implementation Details:**
   
   The endpoint performs the following operations:
   
   1. **Validation**: Verifies that all required fields are present in the request.
   2. **Workspace Security**: Validates that the execution exists and belongs to the specified workspace.
   3. **Update Execution Step**: Updates the status of the completed execution step to 'completed' in the database.
   4. **Load Flow Definition**: Retrieves the flow definition from the database to determine the next steps.
   5. **Find Next Nodes**: Identifies the next nodes to execute based on the flow's edges.
   6. **Complete Execution**: If there are no more nodes to execute, marks the flow execution as completed.
   7. **Queue Next Nodes**: For each next node, creates an execution step record and schedules a job in the queue service.
   8. **Response**: Returns a success response with details about the queued next nodes.

   **Sequence Diagram:**
   ```
   ┌──────────────┐      ┌───────────────┐      ┌────────────────┐      ┌──────────────┐
   │ Queue Service│      │ Callback API  │      │   Database     │      │ Queue Service│
   │ (Completed   │      │   Endpoint    │      │  (Supabase)    │      │  (Next Job)  │
   └──────┬───────┘      └───────┬───────┘      └────────┬───────┘      └──────┬───────┘
          │                      │                       │                      │
          │   POST /api/flow-node-completed              │                      │
          │─────────────────────>│                       │                      │
          │                      │                       │                      │
          │                      │  Verify execution     │                      │
          │                      │─────────────────────>│                       │
          │                      │  exists in workspace  │                      │
          │                      │<─────────────────────│                       │
          │                      │                       │                      │
          │                      │  Update step status   │                      │
          │                      │─────────────────────>│                       │
          │                      │  to 'completed'       │                      │
          │                      │<─────────────────────│                       │
          │                      │                       │                      │
          │                      │  Load flow definition │                      │
          │                      │─────────────────────>│                       │
          │                      │                       │                      │
          │                      │<─────────────────────│                       │
          │                      │                       │                      │
          │                      │  Find next nodes      │                      │
          │                      │  based on edges       │                      │
          │                      │                       │                      │
          │                      │  For each next node:  │                      │
          │                      │  Create execution step│                      │
          │                      │─────────────────────>│                       │
          │                      │<─────────────────────│                       │
          │                      │                       │                      │
          │                       │   Schedule next node │
          │                      │────────────────────────────────────────────>│
          │                      │                       │                      │
          │                      │<───────────────────────────────────────────│
          │                      │                       │                      │
          │                      │  Update step with     │                      │
          │                      │  queue job ID         │                      │
          │                      │─────────────────────>│                       │
          │                      │<─────────────────────│                       │
          │                      │                       │                      │
          │    200 OK Response   │                       │                      │
          │<─────────────────────│                       │                      │
          │                      │                       │                      │
   ```

   **Error Handling:**
   
   The endpoint implements comprehensive error handling for various scenarios:
   
   - **Missing Fields**: Returns a 400 Bad Request response if required fields are missing.
   - **Execution Not Found**: Returns a 404 Not Found response if the execution doesn't exist or doesn't belong to the specified workspace.
   - **Database Errors**: Returns a 500 Internal Server Error response with details about the database error.
   - **Queue Service Errors**: Handles errors when scheduling next nodes, marking the corresponding steps as failed.
   
   **Security Considerations:**
   
   - **Workspace Isolation**: All database operations include workspace_id validation to ensure proper multi-tenant security.
   - **Input Validation**: Validates all input parameters before processing.
   - **Error Messages**: Ensures error messages don't expose sensitive information.

   **Monitoring and Logging:**
   
   - Logs detailed information about the callback processing.
   - Records the status of each step in the database for auditing and monitoring.
   - Provides detailed error logs for troubleshooting.

   This implementation ensures reliable and secure processing of flow node completions, maintaining proper isolation between workspaces.

4. **Scalability Benefits**:

   - **Handles Long-Running Flows**: Supports workflows that run for minutes or hours
   - **Resource Efficient**: Prevents memory issues and timeouts
   - **Fault Tolerant**: Each node execution is independent and can be retried
   - **Responsive to Triggers**: Immediate execution when needed for time-sensitive operations
   - **Horizontally Scalable**: Queue workers can be scaled independently

5. **Monitoring and Recovery**: [IN PROGRESS]

   - **Comprehensive Logging**: [COMPLETED]
     - Implemented structured logging with correlation IDs for traceability
     - Added different log levels (info, debug, error, warn) for better filtering
     - Included detailed context information in log entries
     - Logged both successful operations and errors with relevant details
     - Added performance timing information for key operations

   - **Retry Mechanisms**: [COMPLETED]
     - Implemented retry mechanisms for failed node executions
     - Configurable retry policies (backoff, max attempts)
     - Dead-letter queue for permanently failed executions
     - Tracking of retry attempts and success/failure status

   - **Monitoring Dashboard**: [PENDING]
     - Create dashboard for monitoring flow execution status
     - Implement real-time monitoring capabilities
     - Add performance metrics collection

   - **Alerting System**: [PENDING]
     - Implement detection of stalled or failed flows
     - Create notification system for critical failures
     - Add SLA monitoring and alerting

### Phase 4: UI Enhancements (Week 3) [PENDING]

1. **Update Node Components**:
   - Enhance `EmailNode` and `MessageNode` to support new scheduling and metadata fields
   - Add validation and user feedback for configuration errors

2. **Flow Monitoring Dashboard**:
   - Create a dashboard to track flow execution status and performance metrics
   - Implement filters and search capabilities for large datasets

### Phase 5: Testing and Rollout (Week 4) [NOT STARTED]

1. **Testing**:
   - Conduct unit and integration tests for all new functionality
   - Validate error handling and retry mechanisms

2. **Rollout**:
   - Deploy to staging and monitor system performance
   - Gather user feedback and make necessary adjustments
   - Roll out to production with phased approach

## Success Criteria

1. **Reliability**:
   - Zero message loss
   - Consistent delivery timing
   - Proper error handling

2. **Performance**:
   - Message scheduling < 500ms
   - Job status updates < 200ms
   - No impact on UI responsiveness

3. **Monitoring**:
   - Full visibility into queue status
   - Clear error reporting
   - Actionable alerts

4. **User Experience**:
   - Seamless campaign creation
   - Clear status indicators
   - Easy error recovery

## Risk Mitigation

1. **Data Loss**:
   - Implement job persistence
   - Add reconciliation processes
   - Create recovery procedures

2. **Performance Issues**:
   - Monitor queue sizes
   - Implement batch processing
   - Add performance metrics

3. **Integration Failures**:
   - Comprehensive error handling
   - Fallback mechanisms
   - Clear error reporting

## Documentation Requirements

1. **Technical Documentation**:
   - Architecture overview
   - API documentation
   - Error handling guide

2. **Operational Documentation**:
   - Monitoring procedures
   - Alert handling
   - Recovery processes

3. **User Documentation**:
   - Status descriptions
   - Error messages
   - Troubleshooting guide

## Flow Monitoring

### Flow Execution Details

The monitoring dashboard provides detailed insights into flow executions through the following components:

1. **Flow Execution Steps**:
   - Each step in a flow execution is tracked with detailed status and timing
   - Results are stored in the `flow_execution_steps` table as JSONB
   - Success results include relevant provider responses (e.g., message_id for SMS)
   - Error results contain structured error information:
     ```json
     {
       "error": "Error message describing the failure",
       "details": {
         // Additional context about the error
       }
     }
     ```

2. **Dead Letter Queue**:
   - Failed executions are moved to DLQ after retry attempts
   - Links to original flow execution for context
   - Supports manual retry and error investigation
   - Tracks retry history and final resolution

3. **Monitoring Dashboard UI**:
   - Mac OS-inspired design using Chakra UI
   - Real-time execution status updates
   - Expandable error details with formatted JSON display
   - Timeline view of execution steps
   - Quick filtering and search capabilities

### Database Schema

```sql
-- Flow Execution Steps
CREATE TABLE flow_execution_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES flow_executions(id),
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,  -- Stores success/error details
  retry_count INTEGER DEFAULT 0,
  final_failure BOOLEAN DEFAULT false,
  moved_to_dlq BOOLEAN DEFAULT false
);

-- Add appropriate indexes
CREATE INDEX idx_flow_execution_steps_execution_id ON flow_execution_steps(execution_id);
CREATE INDEX idx_flow_execution_steps_status ON flow_execution_steps(status);
```

## Monitoring Dashboard Implementation [COMPLETED]

The Flow Monitoring Dashboard has been completely implemented, providing a comprehensive interface for administrators to monitor, troubleshoot, and manage flow executions across the application.

### File Structure

```
/frontend/src/components/admin/
├── AdminLayout.js                            # Main layout container for admin pages
├── flow-monitoring/
│   ├── dashboard/
│   │   ├── FlowMonitoringDashboard.js        # Main dashboard view
│   │   ├── ExecutionStatusChart.js           # Pie chart for execution statuses
│   │   ├── RecentFailuresList.js             # List of recent failed executions
│   │   └── PerformanceMetrics.js             # Charts for execution times and metrics
│   ├── executions/
│   │   ├── ExecutionsList.js                 # Paginated list of all flow executions
│   │   └── ExecutionDetail.js                # Detailed view of a specific execution
│   ├── dlq/
│   │   └── DeadLetterQueue.js                # Interface for managing dead-letter queue
│   └── alerts/
│       └── AlertsConfig.js                   # Configuration for monitoring alerts
```

### Component Details

1. **AdminLayout.js**
   - Serves as the container layout for all admin pages
   - Implements the sidebar navigation menu with links to all monitoring components
   - Uses Chakra UI for a Mac OS-inspired design aesthetic
   - Includes security checks to ensure only authorized users can access admin features
   - Handles responsive design for various screen sizes

2. **FlowMonitoringDashboard.js**
   - Serves as the main entry point for the monitoring dashboard
   - Displays an overview of all key performance indicators (KPIs)
   - Integrates ExecutionStatusChart, RecentFailuresList, and PerformanceMetrics components
   - Implements real-time data fetching from Supabase with appropriate workspace filtering
   - Includes time range filters for viewing metrics over different periods

3. **ExecutionStatusChart.js**
   - Displays a pie chart visualization of flow execution statuses
   - Shows distribution of completed, failed, running, and partial failure states
   - Uses Recharts library for data visualization
   - Includes interactive tooltips showing count and percentage for each status
   - Updates dynamically when data changes

4. **RecentFailuresList.js**
   - Shows a chronological list of recent execution failures
   - Displays key information about each failure (flow name, time, error message)
   - Includes quick links to view the detailed execution record
   - Implements lazy loading and pagination for performance
   - Includes filters for specific flows or failure types

5. **PerformanceMetrics.js**
   - Visualizes performance trends over time with line and bar charts
   - Displays metrics such as average execution time, success rates, and throughput
   - Allows comparison of different time periods
   - Shows performance broken down by flow type or specific flows
   - Identifies performance outliers and potential bottlenecks

6. **ExecutionsList.js**
   - Provides a comprehensive table view of all flow executions
   - Implements sorting, filtering, and pagination for large datasets
   - Displays key execution data (status, start/end times, duration, etc.)
   - Includes search functionality for finding specific executions
   - Features quick actions for retrying failed executions or viewing details

7. **ExecutionDetail.js**
   - Shows detailed information for a specific flow execution
   - Displays execution metadata, timeline, and execution path
   - Lists all execution steps with their individual statuses
   - Provides access to input/output data for each step for debugging
   - Includes retry functionality for failed executions or individual steps
   - Shows detailed error information and stack traces when available

8. **DeadLetterQueue.js**
   - Manages items that failed to process correctly and were moved to the DLQ
   - Displays comprehensive error information for each DLQ item
   - Provides retry, delete, and export functionality for DLQ entries
   - Includes filtering and search to find specific failed items
   - Shows trends in DLQ accumulation over time

9. **AlertsConfig.js**
   - Allows administrators to configure monitoring alerts
   - Supports multiple alert types: error rates, execution times, DLQ accumulation
   - Configures notification channels (email, webhook, Slack)
   - Includes threshold settings and alert frequency controls
   - Manages workspace-specific alert configurations

### Integration with App Routing

All monitoring dashboard components are integrated into the application's routing system under the `/admin` path, with access protected by authentication and authorization checks:

```javascript
// AppRoutes.js (edited)
<Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
  {/* Flow Monitoring Routes */}
  <Route path="flow-monitoring/dashboard" element={<FlowMonitoringDashboard />} />
  <Route path="flow-monitoring/executions" element={<ExecutionsList />} />
  <Route path="flow-monitoring/executions/:executionId" element={<ExecutionDetail />} />
  <Route path="flow-monitoring/dlq" element={<DeadLetterQueue />} />
  <Route path="flow-monitoring/alerts" element={<AlertsConfig />} />
  <Route index element={<Navigate to="flow-monitoring/dashboard" replace />} />
</Route>
```

### Data Models

The monitoring dashboard interfaces with several database tables:

1. **Flow Executions**
   - Primary table tracking each flow execution
   - Contains status, timestamps, and result metadata
   - Linked to specific flows and contacts

2. **Flow Execution Steps**
   - Tracks individual steps within each execution
   - Stores node type, status, input/output data
   - Contains error information for failed steps

3. **Flow Execution DLQ**
   - Stores failed message delivery attempts for retry
   - Includes complete context for troubleshooting
   - Tracks retry attempts and processing status

4. **Flow Monitoring Alerts**
   - Stores alert configurations per workspace
   - Defines thresholds, notification channels, and status
   - Supports workspace-specific customization

### Security and Multi-Tenant Considerations

The monitoring dashboard fully respects the multi-tenant architecture of the application:

1. **Row-Level Security**:
   - All database queries filter by the current workspace ID
   - RLS policies in Supabase enforce data isolation

2. **Access Control**:
   - Only users with administrative privileges can access the dashboard
   - Features are conditionally rendered based on user permissions

3. **Safe Data Display**:
   - Sensitive data is masked or excluded from logs and displays
   - Error messages are sanitized to prevent information leakage

### UI/UX Design Principles

The monitoring dashboard follows Mac OS design principles:

1. **Clean, Minimalist Interface**:
   - Ample white space and clear visual hierarchy
   - Rounded corners (12px radius) and subtle shadows
   - Consistent typography using SF Pro Display or Inter fonts

2. **Intuitive Navigation**:
   - Clear breadcrumbs showing current location
   - Consistent back buttons and navigation patterns
   - Logical grouping of related information

3. **Responsive Feedback**:
   - Loading states with appropriate spinners
   - Toast notifications for actions and errors
   - Empty states with helpful guidance

4. **Accessibility**:
   - Proper contrast ratios for text and UI elements
   - Keyboard navigation support
   - Screen reader compatible components

### Performance Optimizations

Several optimizations ensure the dashboard remains responsive:

1. **Pagination**:
   - All data-heavy lists implement server-side pagination
   - Results are loaded in manageable chunks

2. **Selective Data Loading**:
   - Only necessary fields are fetched from the database
   - Detailed information is loaded on demand

3. **Caching**:
   - Dashboard metrics are cached briefly to reduce database load
   - Cache invalidation occurs on relevant data changes

4. **Efficient Rendering**:
   - React memoization for expensive computations
   - Virtualized lists for large datasets

### Next Steps

While the monitoring dashboard implementation is complete, future enhancements could include:

1. **Advanced Analytics**:
   - Predictive analytics for failure prevention
   - Anomaly detection in execution patterns

2. **Expanded Alert Options**:
   - Additional notification channels (SMS, mobile push)
   - More sophisticated alert conditions and grouping

3. **Automation Rules**:
   - Automated responses to specific failure patterns
   - Self-healing workflows for common issues

4. **Extended Visualizations**:
   - Flow execution path visualization
   - Node-level performance heatmaps

### Dead-Letter Queue Recovery Options

To be designed and implemented after the monitoring dashboard is complete.

### Testing and Validation

To be designed and implemented after the monitoring dashboard is complete.

### Phase 5: Flow Monitoring Dashboard (Week 4-5) [COMPLETED]

#### Overview

The Flow Monitoring Dashboard provides a comprehensive interface for administrators to monitor, troubleshoot, and manage flow executions across the platform. It follows a Mac OS-inspired design aesthetic with a focus on usability and clear data presentation.

#### Purpose

- **Real-time Monitoring**: Track flow execution statuses and performance metrics
- **Troubleshooting**: Identify and resolve failed executions
- **Performance Analysis**: Monitor execution times and success rates
- **Alert Management**: Configure and manage alerts for critical flow issues
- **Dead Letter Queue Management**: Handle and retry failed message deliveries

#### System Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Dashboard UI   │◄───▶│  Supabase       │◄───▶│  Flow Execution │
│  (React/Chakra) │     │  (Database)     │     │  Engine         │
│                 │     │                 │     │                 │
└──────┬───────┘     └───────┬───────┘     └──────┬───────┘
        │                       ▲                       │
        │                       │                       │
        ▼                       │                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Alert          │     │  Dead Letter    │     │  Metrics        │
│  Configuration  │     │  Queue Mgmt     │     │  Visualization  │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Database Schema

The monitoring dashboard is supported by the following tables:

1. **flow_executions**: Tracks overall flow execution instances
   ```sql
   CREATE TABLE flow_executions (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
     contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
     workspace_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     completed_at TIMESTAMP WITH TIME ZONE,
     error_message TEXT,
     execution_time INTEGER, -- in milliseconds
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     source TEXT, -- 'manual', 'scheduled', 'webhook', etc.
     metadata JSONB
   );
   ```

2. **execution_steps**: Records individual steps within a flow execution
   ```sql
   CREATE TABLE execution_steps (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     execution_id UUID NOT NULL REFERENCES flow_executions(id) ON DELETE CASCADE,
     node_id TEXT NOT NULL,
     node_type TEXT NOT NULL,
     workspace_id TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending',
     started_at TIMESTAMPTZ,
     completed_at TIMESTAMPTZ,
     execution_time INTEGER, -- in milliseconds
     error_message TEXT,
     input_data JSONB,
     output_data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

3. **dead_letter_queue**: Stores failed message delivery attempts for retry
   ```sql
   CREATE TABLE dead_letter_queue (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
     node_id TEXT NOT NULL,
     execution_id UUID REFERENCES flow_executions(id) ON DELETE SET NULL,
     contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
     workspace_id TEXT NOT NULL,
     error_message TEXT,
     payload JSONB,
     processed BOOLEAN DEFAULT FALSE,
     processed_at TIMESTAMPTZ,
     processing_result JSONB,
     retry_count INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

4. **flow_monitoring_alerts**: Configures alert thresholds and notification settings
   ```sql
   CREATE TABLE flow_monitoring_alerts (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     workspace_id TEXT NOT NULL,
     flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
     alert_type TEXT NOT NULL,
     threshold INTEGER NOT NULL,
     enabled BOOLEAN DEFAULT TRUE,
     notification_channel TEXT NOT NULL,
     notification_recipients TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     last_triggered_at TIMESTAMP WITH TIME ZONE,
     trigger_count INTEGER DEFAULT 0
   );
   ```

#### Component Structure

```
flow-monitoring/
├── alerts/
│   └── AlertsConfig.js       # Alert configuration management
├── dashboard/
│   └── FlowMonitoringDashboard.js  # Main dashboard view
├── dlq/
│   └── DeadLetterQueue.js    # Dead letter queue management
└── executions/
    ├── ExecutionDetail.js    # Detailed view of a single execution
    └── ExecutionsList.js     # List of all flow executions
```

#### Key Features

1. **Flow Execution Tracking**
   - Real-time status updates
   - Detailed execution history
   - Step-by-step execution visualization
   - Error reporting and diagnosis
   - Time-based filtering options (Last Hour, Last 24 Hours, Last 7 Days, Last 30 Days, All Time)
   - Auto-refresh functionality with configurable intervals (30 seconds, 1 minute, 5 minutes)

2. **Performance Metrics**
   - Average execution time
   - Success/failure rates
   - Volume metrics (executions per day/hour)
   - Node-specific performance analysis
   - Trend indicators showing performance changes over time
   - Interactive visualizations with filtering capabilities

3. **Dead Letter Queue Management**
   - View failed message delivery attempts
   - Retry capabilities
   - Error analysis and resolution
   - Bulk operations for queue management

4. **Alert Configuration**
   - Set up thresholds for critical metrics
   - Configure notification channels
   - Workspace-specific alert settings
   - Alert history and tracking

#### Implementation Details

All monitoring dashboard components follow these principles:

1. **Security**: Strict adherence to row-level security (RLS) policies ensuring workspace isolation
2. **Design**: Mac OS-inspired aesthetics using Chakra UI
3. **Performance**: Optimized queries with appropriate indexes
4. **User Experience**: Intuitive interface with clear visualizations
5. **Interactivity**: Click-to-filter functionality on charts and visualizations
6. **Responsiveness**: Optimized for both desktop and mobile viewing

#### Recent Enhancements

The Flow Monitoring Dashboard has been recently enhanced with the following features:

1. **Time-Based Filtering**
   - Users can now filter metrics by different time ranges (Last Hour, Last 24 Hours, Last 7 Days, Last 30 Days, All Time)
   - Time filters apply to all metrics and visualizations on the dashboard
   - The selected time range is clearly displayed on each metric card

2. **Auto-Refresh Functionality**
   - Dashboard can automatically refresh at configurable intervals (30 seconds, 1 minute, 5 minutes)
   - Last refreshed timestamp is displayed to indicate data freshness
   - Manual refresh option is still available for immediate updates

3. **Trend Indicators**
   - Each metric now displays a trend indicator showing the percentage change compared to the previous period
   - Color-coded indicators (green for improvement, red for decline) provide quick visual feedback
   - Trends help identify patterns and potential issues at a glance

4. **Interactive Visualizations**
   - Pie chart segments are now clickable to filter the Recent Executions table
   - Legend items can be clicked to toggle visibility of specific status types
   - Clear filter option allows users to reset to the default view
   - Tooltips provide additional context and details on hover

5. **Improved Table Layout**
   - Recent Executions table now uses Chakra UI's Table component for better structure
   - Table automatically filters based on selected status from the pie chart
   - Improved readability with proper spacing and alignment

These enhancements significantly improve the usability and effectiveness of the monitoring dashboard, allowing users to quickly identify issues, track performance trends, and make data-driven decisions about their workflow automations.

#### Code Example: FlowMonitoringDashboard.js
```javascript
import React, { useState, useEffect } from 'react';
import {
  Box, Flex, Heading, Text, Stat, StatLabel, StatNumber, StatHelpText,
  SimpleGrid, Card, CardHeader, CardBody, Spinner, useColorModeValue
} from '@chakra-ui/react';
import { supabase } from 'src/lib/supabase-client';
import { useWorkspace } from 'src/contexts/WorkspaceContext';
import { LineChart, BarChart } from 'src/components/charts';

const FlowMonitoringDashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Color mode values for theming
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!currentWorkspace?.id) return;

      try {
        setIsLoading(true);
        // Fetch summary metrics
        const { data: summaryData, error: summaryError } = await supabase
          .from('flow_executions')
          .select('status, count(*)')
          .eq('workspace_id', currentWorkspace.id)
          .group('status');

        if (summaryError) throw summaryError;

        // Fetch execution time metrics
        const { data: timeData, error: timeError } = await supabase
          .from('flow_executions')
          .select('execution_time, created_at')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (timeError) throw timeError;

        // Process and set metrics
        setMetrics({
          summary: processStatusSummary(summaryData),
          executionTimes: processExecutionTimes(timeData),
          // Additional metrics processing...
        });
      } catch (err) {
        console.error('Error fetching monitoring metrics:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [currentWorkspace?.id]);

  // Helper functions to process data for display
  const processStatusSummary = (data) => {
    // Process status summary data for visualization
    // ...
  };

  const processExecutionTimes = (data) => {
    // Process execution time data for visualization
    // ...
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" height="200px">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.50" color="red.500" borderRadius="md">
        <Text>Error loading monitoring data: {error}</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Heading size="lg" mb={6}>Flow Monitoring Dashboard</Heading>
      
      {/* Summary Statistics */}
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={6} mb={8}>
        <StatCard 
          label="Total Executions" 
          value={metrics.summary.total} 
          helpText="All time"
          color="blue.500"
        />
        <StatCard 
          label="Success Rate" 
          value={`${metrics.summary.successRate}%`} 
          helpText="Last 30 days"
          color="green.500"
        />
        <StatCard 
          label="Avg. Execution Time" 
          value={`${metrics.executionTimes.average}ms`} 
          helpText="Last 100 executions"
          color="purple.500"
        />
        <StatCard 
          label="Failed Executions" 
          value={metrics.summary.failed || 0} 
          helpText="Last 30 days"
          color="red.500"
        />
      </SimpleGrid>
      
      {/* Charts and detailed metrics */}
      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="md">Execution Volume</Heading>
          </CardHeader>
          <CardBody>
            {/* Execution volume chart */}
            <Box height="300px">
              <BarChart data={metrics.executionVolume} />
            </Box>
          </CardBody>
        </Card>
        
        <Card bg={cardBg} boxShadow="sm" borderColor={borderColor} borderWidth="1px">
          <CardHeader>
            <Heading size="md">Performance Trends</Heading>
          </CardHeader>
          <CardBody>
            {/* Performance trend chart */}
            <Box height="300px">
              <LineChart data={metrics.performanceTrends} />
            </Box>
          </CardBody>
        </Card>
      </SimpleGrid>
    </Box>
  );
};

// Helper component for stats
const StatCard = ({ label, value, helpText, color }) => (
  <Stat
    px={4}
    py={3}
    bg={useColorModeValue('white', 'gray.700')}
    shadow="sm"
    border="1px solid"
    borderColor={useColorModeValue('gray.200', 'gray.600')}
    rounded="md"
  >
    <StatLabel color="gray.500" fontSize="sm">{label}</StatLabel>
    <StatNumber fontSize="2xl" fontWeight="bold" color={color}>
      {value}
    </StatNumber>
    <StatHelpText fontSize="xs">{helpText}</StatHelpText>
  </Stat>
);

export default FlowMonitoringDashboard;
```

#### For Developers and Interns

1. **Getting Started**
   - All monitoring components are located in `frontend/src/components/admin/flow-monitoring/`
   - The database tables are defined in SQL scripts in `backend/migrations/`
   - Ensure you have the necessary permissions in Supabase to view monitoring data

2. **Adding New Metrics**
   - Extend existing components by adding new queries to Supabase
   - Follow the pattern of using the workspace context for data isolation
   - Add visualization components in the appropriate dashboard sections

3. **Debugging Common Issues**
   - Missing data: Verify that flow executions are being properly recorded
   - Performance issues: Check for missing indexes on frequently queried columns
   - UI rendering problems: Ensure data transformations handle all possible states

4. **Security Guidelines**
   - All database queries must include workspace_id filtering
   - Use RLS policies for all monitoring tables
   - Validate user permissions before rendering sensitive metrics

   #### Row Level Security (RLS) Implementation

   Each monitoring table has RLS policies implemented to ensure proper workspace isolation:

   ```sql
   -- flow_executions table RLS policy
   CREATE POLICY "Users can only access their workspace flow executions" 
   ON flow_executions
   FOR ALL
   USING (
     workspace_id IN (
       SELECT workspace_id 
       FROM workspace_members 
       WHERE user_id = auth.uid()
     )
   );

   -- execution_steps table RLS policy
   CREATE POLICY "Users can only access their workspace execution steps" 
   ON execution_steps
   FOR ALL
   USING (
     workspace_id IN (
       SELECT workspace_id 
       FROM workspace_members 
       WHERE user_id = auth.uid()
     )
   );

   -- dead_letter_queue table RLS policy
   CREATE POLICY "Users can only access their workspace dead letter queue" 
   ON dead_letter_queue
   FOR ALL
   USING (
     workspace_id IN (
       SELECT workspace_id 
       FROM workspace_members 
       WHERE user_id = auth.uid()
     )
   );

   -- flow_monitoring_alerts table RLS policy
   CREATE POLICY "Users can only access their workspace flow monitoring alerts" 
   ON flow_monitoring_alerts
   FOR ALL
   USING (
     workspace_id IN (
       SELECT workspace_id 
       FROM workspace_members 
       WHERE user_id = auth.uid()
     )
   );
   ```

   These policies ensure that users can only access data from workspaces they are members of, maintaining strict data isolation in the multi-tenant environment.

5. **Performance Considerations**
   - Limit data fetching to necessary time ranges
   - Implement pagination for large data sets
   - Use aggregate queries where possible to reduce data transfer
   - Consider caching frequently accessed metrics

This implementation provides a comprehensive monitoring solution that integrates with the existing flow execution system while maintaining security and performance standards.

## SMS/MMS Functionality Enhancements (April 3, 2025)

### Overview

We've enhanced the SMS node in the Flow Builder to support both SMS and MMS (Multimedia Messaging Service) messages. This allows users to include images alongside text in their automated messages, significantly expanding the communication capabilities of the platform.

### Implementation Details

#### Backend Changes

1. **Updated SMS Preview Endpoint**:
   - Modified `/backend/src/routes/preview.js` to properly handle media attachments
   - Fixed the `mediaUrl` parameter formatting for Twilio API compatibility
   - Changed from passing a string to passing an array: `messageOptions.mediaUrl = [mediaUrl]`
   - Added comprehensive logging for better debugging and monitoring
   - Enhanced error handling for media-related issues

```javascript
// Updated code in preview.js
// Prepare message options
const messageOptions = {
  body: message,
  to: formattedPhone,
  from: fromNumber,
};

// Add mediaUrl if provided
if (mediaUrl) {
  messageOptions.mediaUrl = [mediaUrl];
  console.log('Including media URL in SMS preview:', mediaUrl);
}

// Send message via Twilio
const twilioMessage = await client.messages.create(messageOptions);
```

#### Frontend Changes

1. **Enhanced MessageNode Component**:
   - Updated `/frontend/src/components/flow-builder/nodes/MessageNode.js` to support image URLs
   - Added the ability to include media URLs in test messages
   - Implemented a modal for entering test phone numbers if not already provided
   - Added variable replacement for placeholders in SMS content
   - Improved error handling and user feedback through toast notifications

```javascript
// Updated code in MessageNode.js
const response = await axios.post('https://cc.automate8.com/api/preview/send-sms', {
  phoneNumber: testPhoneNumber,
  workspaceId: currentWorkspace.id,
  previewText: messageText,
  mediaUrl: imageUrl // Include the image URL if available
});
```

### Testing and Verification

- Successfully tested sending MMS messages with image attachments
- Verified that the message SID changes from "SM" to "MM" when an MMS is successfully processed
- Confirmed proper display of images in received messages on mobile devices
- Tested with various image URLs and formats to ensure compatibility

### Technical Considerations

1. **Twilio API Requirements**:
   - Twilio requires the `mediaUrl` parameter to be passed as an array, even for a single image
   - Messages can include up to 10 media files with a total size of up to 5MB
   - Twilio automatically resizes images as necessary for successful delivery

2. **Deployment Process**:
   - Backend changes required deployment to Railway through GitHub integration
   - Local development changes need to be pushed to GitHub to trigger deployment

### User Experience Benefits

- Enhanced communication capabilities with rich media content
- Improved engagement through visual messaging
- More effective marketing and informational messages
- Consistent experience across both SMS and MMS message types

### Next Steps

- Consider adding support for multiple images in a single message
- Implement a media library for commonly used images
- Add image preview functionality in the MessageNode component
- Explore additional media types supported by MMS (video, audio)
