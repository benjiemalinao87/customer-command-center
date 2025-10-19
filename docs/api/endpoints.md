# Queue Service API Endpoints

Base URL: `https://cc.automate8.com`

## Authentication

### JWT Authentication
- **Header**: `Authorization: Bearer <jwt_token>`
- **Use Case**: Frontend applications, authenticated users
- **Rate Limit**: 100 requests per minute

### API Key Authentication  
- **Header**: `Authorization: Bearer <api_key>` OR `X-API-Key: <api_key>`
- **Use Case**: External integrations, third-party applications
- **Rate Limit**: 50 requests per minute
- **Format**: `crm_live_<key>_<checksum>`

---

## Pipeline Management API Endpoints

### Pipeline Management

#### List All Pipelines
- **URL**: `/api/pipeline/pipelines`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**: None (workspace inferred from auth)

```javascript
// Example response
{
  "success": true,
  "data": [
    {
      "id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "name": "Sales Pipeline",
      "description": "Main sales process from lead to customer",
      "workspace_id": "15213",
      "is_default": true,
      "is_active": true,
      "created_at": "2025-05-29T08:24:35.511961+00:00",
      "updated_at": "2025-05-29T08:24:35.511961+00:00",
      "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
      "opportunity_count": 12,
      "total_value": 450000,
      "stages": [
        {
          "id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
          "name": "New",
          "position": 1,
          "color": "#4299E1",
          "default_probability": 10,
          "opportunity_count": 5
        },
        {
          "id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
          "name": "Pending",
          "position": 2,
          "color": "#F6AD55",
          "default_probability": 50,
          "opportunity_count": 4
        },
        {
          "id": "7c8d2f9e-b4a1-4567-8901-234567890abc",
          "name": "Done",
          "position": 3,
          "color": "#48BB78",
          "default_probability": 90,
          "is_won_stage": true,
          "opportunity_count": 3
        }
      ]
    },
    {
      "id": "project-pipeline-uuid",
      "name": "Project Management Pipeline",
      "description": "Track renovation projects from planning to completion",
      "workspace_id": "15213",
      "is_default": false,
      "is_active": true,
      "opportunity_count": 8,
      "total_value": 320000,
      "stages": [...]
    }
  ]
}
```

#### Create New Pipeline
- **URL**: `/api/pipeline/pipelines`
- **Method**: `POST`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body
{
  "name": "Customer Service Pipeline",
  "description": "Manage post-completion customer complaints and warranty claims"
}

// Response
{
  "success": true,
  "data": {
    "id": "new-pipeline-uuid",
    "name": "Customer Service Pipeline",
    "description": "Manage post-completion customer complaints and warranty claims",
    "workspace_id": "15213",
    "is_default": false,
    "is_active": true,
    "created_at": "2025-05-29T10:15:20.123456+00:00",
    "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "stages": [
      {
        "id": "stage-new-id",
        "name": "New",
        "position": 1,
        "color": "#4299E1",
        "default_probability": 10,
        "is_won_stage": false,
        "is_lost_stage": false
      },
      {
        "id": "stage-pending-id",
        "name": "Pending",
        "position": 2,
        "color": "#F6AD55",
        "default_probability": 50,
        "is_won_stage": false,
        "is_lost_stage": false
      },
      {
        "id": "stage-done-id",
        "name": "Done",
        "position": 3,
        "color": "#48BB78",
        "default_probability": 90,
        "is_won_stage": true,
        "is_lost_stage": false
      }
    ]
  }
}
```

#### Update Pipeline
- **URL**: `/api/pipeline/pipelines/:id`
- **Method**: `PUT`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body (all fields optional)
{
  "name": "Enhanced Sales Pipeline",
  "description": "Updated sales process with better tracking and automation",
  "is_active": true
}

// Response
{
  "success": true,
  "data": {
    "id": "pipeline-uuid",
    "name": "Enhanced Sales Pipeline",
    "description": "Updated sales process with better tracking and automation",
    "workspace_id": "15213",
    "is_default": false,
    "is_active": true,
    "updated_at": "2025-05-29T11:30:45.789012+00:00"
  }
}
```

#### Delete Pipeline (Soft Delete)
- **URL**: `/api/pipeline/pipelines/:id`
- **Method**: `DELETE`
- **Authentication**: JWT or API Key

```javascript
// Success response
{
  "success": true,
  "message": "Pipeline 'Customer Service Pipeline' has been deactivated successfully"
}

// Error response (pipeline has opportunities)
{
  "success": false,
  "error": "Cannot delete pipeline with active opportunities. Move or delete 12 opportunities first.",
  "opportunity_count": 12
}
```

### Opportunities Management

#### Get Opportunities
- **URL**: `/api/pipeline/opportunities`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `workspace_id` (optional): Workspace identifier (inferred from auth if not provided)
  - `pipeline_id` (optional): Filter by specific pipeline
  - `stage_id` (optional): Filter by pipeline stage
  - `contact_id` (optional): Filter by associated contact
  - `priority` (optional): Filter by priority ("low", "medium", "high")
  - `is_closed` (optional): Filter by closed status (boolean)
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Items per page (default: 50, max: 100)
  - `offset` (optional): Number of items to skip (alternative to page)
  - `search` (optional): Search term for title/description
  - `min_amount` (optional): Minimum opportunity value
  - `max_amount` (optional): Maximum opportunity value
  - `expected_close_date_from` (optional): Filter by close date range (YYYY-MM-DD)
  - `expected_close_date_to` (optional): Filter by close date range (YYYY-MM-DD)

```javascript
// Example response
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Kitchen Renovation - Smith Family",
      "description": "Complete kitchen remodel including cabinets, countertops, and appliances",
      "contact_id": "456e7890-e89b-12d3-a456-426614174001",
      "company_id": "789e0123-e89b-12d3-a456-426614174002",
      "workspace_id": "15213",
      "stage_id": "abc1234-e89b-12d3-a456-426614174003",
      "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "amount": 45000.00,
      "currency": "USD",
      "probability": 75,
      "priority": "high",
      "expected_close_date": "2025-08-15T00:00:00.000Z",
      "tags": ["kitchen", "renovation", "high-value"],
      "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
      "assigned_to": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
      "created_at": "2025-05-29T10:30:00.000Z",
      "updated_at": "2025-05-29T14:20:00.000Z",
      "is_closed": false,
      "is_won": null,
      "stage": {
        "id": "abc1234-e89b-12d3-a456-426614174003",
        "name": "Proposal Sent",
        "color": "#F6AD55",
        "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674"
      },
      "contact": {
        "id": "456e7890-e89b-12d3-a456-426614174001",
        "firstname": "John",
        "lastname": "Smith",
        "email": "john.smith@email.com",
        "phone_number": "+1234567890"
      },
      "company": {
        "id": "789e0123-e89b-12d3-a456-426614174002",
        "name": "Smith Residence"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

#### Get Single Opportunity
- **URL**: `/api/pipeline/opportunities/:id`
- **Method**: `GET`
- **Authentication**: JWT or API Key

```javascript
// Example response
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Kitchen Renovation - Smith Family",
    "description": "Complete kitchen remodel including cabinets, countertops, and appliances",
    "contact_id": "456e7890-e89b-12d3-a456-426614174001",
    "company_id": "789e0123-e89b-12d3-a456-426614174002",
    "workspace_id": "15213",
    "stage_id": "abc1234-e89b-12d3-a456-426614174003",
    "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
    "amount": 45000.00,
    "currency": "USD",
    "probability": 75,
    "priority": "high",
    "expected_close_date": "2025-08-15T00:00:00.000Z",
    "tags": ["kitchen", "renovation", "high-value"],
    "notes": "Customer is very interested. Awaiting final approval from spouse.",
    "source": "referral",
    "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "assigned_to": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "created_at": "2025-05-29T10:30:00.000Z",
    "updated_at": "2025-05-29T14:20:00.000Z",
    "is_closed": false,
    "is_won": null,
    "closed_at": null,
    "stage": {
      "id": "abc1234-e89b-12d3-a456-426614174003",
      "name": "Proposal Sent",
      "color": "#F6AD55",
      "default_probability": 50,
      "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674"
    },
    "pipeline": {
      "id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "name": "Sales Pipeline",
      "description": "Main sales process"
    },
    "contact": {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "firstname": "John",
      "lastname": "Smith",
      "email": "john.smith@email.com",
      "phone_number": "+1234567890",
      "company": "Smith Residence"
    },
    "company": {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "name": "Smith Residence",
      "industry": "Residential"
    },
    "activities": [
      {
        "id": "activity-uuid-1",
        "type": "note",
        "content": "Initial consultation completed",
        "created_at": "2025-05-29T12:00:00.000Z",
        "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38"
      }
    ]
  }
}
```

#### Create Opportunity
- **URL**: `/api/pipeline/opportunities`
- **Method**: `POST`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body
{
  "title": "Bathroom Renovation - Johnson Family",
  "description": "Master bathroom complete remodel with walk-in shower",
  "contact_id": "456e7890-e89b-12d3-a456-426614174001", // optional
  "company_id": "789e0123-e89b-12d3-a456-426614174002", // optional
  "stage_id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48", // required
  "value": 28000.00, // optional
  "currency": "USD", // optional, defaults to USD
  "probability": 50, // optional, defaults to stage default
  "priority": "high", // optional: "low", "medium", "high"
  "expected_close_date": "2025-08-01", // optional, YYYY-MM-DD format
  "tags": ["bathroom", "renovation", "high-value"], // optional
  "notes": "Customer is ready to start immediately", // optional
  "source": "website" // optional
}

// Response
{
  "success": true,
  "data": {
    "id": "new-opportunity-uuid",
    "title": "Bathroom Renovation - Johnson Family",
    "description": "Master bathroom complete remodel with walk-in shower",
    "stage_id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
    "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
    "amount": 28000.00,
    "currency": "USD",
    "probability": 50,
    "priority": "high",
    "expected_close_date": "2025-08-01T00:00:00.000Z",
    "tags": ["bathroom", "renovation", "high-value"],
    "workspace_id": "15213",
    "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "assigned_to": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "created_at": "2025-05-29T15:30:00.000Z",
    "updated_at": "2025-05-29T15:30:00.000Z",
    "is_closed": false,
    "is_won": null
  }
}
```

#### Update Opportunity
- **URL**: `/api/pipeline/opportunities/:id`
- **Method**: `PUT`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body (all fields optional)
{
  "title": "Updated Bathroom Renovation - Johnson Family",
  "description": "Master bathroom complete remodel with walk-in shower and heated floors",
  "amount": 32000.00,
  "probability": 80,
  "priority": "high",
  "expected_close_date": "2025-07-15",
  "tags": ["bathroom", "renovation", "luxury", "high-value"],
  "notes": "Added heated floors to project scope"
}

// Response
{
  "success": true,
  "data": {
    "id": "opportunity-uuid",
    "title": "Updated Bathroom Renovation - Johnson Family",
    "description": "Master bathroom complete remodel with walk-in shower and heated floors",
    "amount": 32000.00,
    "probability": 80,
    "priority": "high",
    "expected_close_date": "2025-07-15T00:00:00.000Z",
    "tags": ["bathroom", "renovation", "luxury", "high-value"],
    "notes": "Added heated floors to project scope",
    "updated_at": "2025-05-29T16:45:00.000Z",
    // ... rest of opportunity object
  }
}
```

#### Move Opportunity Between Stages
- **URL**: `/api/pipeline/opportunities/:id/move`
- **Method**: `PUT`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body
{
  "stage_id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b"
}

// Response
{
  "success": true,
  "data": {
    "id": "opportunity-uuid",
    "stage_id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
    "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
    "probability": 50, // Updated to stage default
    "updated_at": "2025-05-29T17:00:00.000Z",
    "stage": {
      "id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
      "name": "Pending",
      "color": "#F6AD55",
      "default_probability": 50
    }
  },
  "history": {
    "id": "history-uuid",
    "opportunity_id": "opportunity-uuid",
    "field_changed": "stage_id",
    "old_value": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
    "new_value": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
    "changed_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38",
    "changed_at": "2025-05-29T17:00:00.000Z"
  }
}
```

#### Delete Opportunity
- **URL**: `/api/pipeline/opportunities/:id`
- **Method**: `DELETE`
- **Authentication**: JWT or API Key

```javascript
// Response
{
  "success": true,
  "message": "Opportunity 'Kitchen Renovation - Smith Family' deleted successfully"
}
```

### Pipeline Stages Management

#### Get Pipeline Stages
- **URL**: `/api/pipeline/stages`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `pipeline_id` (optional): Filter stages by specific pipeline

```javascript
// Response (all stages)
{
  "success": true,
  "data": [
    {
      "id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
      "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "workspace_id": "15213",
      "name": "New",
      "description": "Initial stage for new opportunities",
      "position": 1,
      "color": "#4299E1",
      "default_probability": 10,
      "is_won_stage": false,
      "is_lost_stage": false,
      "opportunity_count": 8,
      "total_value": 120000.00,
      "created_at": "2025-05-29T08:24:35.000Z",
      "updated_at": "2025-05-29T08:24:35.000Z",
      "pipeline": {
        "id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
        "name": "Sales Pipeline"
      }
    },
    {
      "id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
      "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "workspace_id": "15213",
      "name": "Pending",
      "description": "Opportunities under review",
      "position": 2,
      "color": "#F6AD55",
      "default_probability": 50,
      "is_won_stage": false,
      "is_lost_stage": false,
      "opportunity_count": 5,
      "total_value": 87500.00,
      "created_at": "2025-05-29T08:24:35.000Z",
      "updated_at": "2025-05-29T08:24:35.000Z",
      "pipeline": {
        "id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
        "name": "Sales Pipeline"
      }
    }
  ]
}
```

#### Create Pipeline Stage
- **URL**: `/api/pipeline/stages`
- **Method**: `POST`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body
{
  "name": "Proposal Review",
  "description": "Customer reviewing our proposal", // optional
  "color": "#9333EA", // optional, defaults to #3B82F6
  "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674", // required
  "default_probability": 65, // optional, defaults to 50
  "position": 3, // optional, auto-calculated if not provided
  "is_won_stage": false, // optional, defaults to false
  "is_lost_stage": false // optional, defaults to false
}

// Response
{
  "success": true,
  "data": {
    "id": "new-stage-uuid",
    "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
    "workspace_id": "15213",
    "name": "Proposal Review",
    "description": "Customer reviewing our proposal",
    "position": 3,
    "color": "#9333EA",
    "default_probability": 65,
    "is_won_stage": false,
    "is_lost_stage": false,
    "opportunity_count": 0,
    "total_value": 0.00,
    "created_at": "2025-05-29T18:00:00.000Z",
    "updated_at": "2025-05-29T18:00:00.000Z",
    "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38"
  }
}
```

#### Update Pipeline Stage
- **URL**: `/api/pipeline/stages/:id`
- **Method**: `PUT`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

```javascript
// Request body (all fields optional)
{
  "name": "Contract Under Review",
  "description": "Legal review of contract terms",
  "color": "#8B5CF6",
  "default_probability": 80,
  "position": 4,
  "is_won_stage": false,
  "is_lost_stage": false
}

// Response
{
  "success": true,
  "data": {
    "id": "stage-uuid",
    "name": "Contract Under Review",
    "description": "Legal review of contract terms",
    "color": "#8B5CF6",
    "default_probability": 80,
    "position": 4,
    "updated_at": "2025-05-29T18:30:00.000Z",
    // ... rest of stage object
  }
}
```

#### Delete Pipeline Stage
- **URL**: `/api/pipeline/stages/:id`
- **Method**: `DELETE`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `moveToStageId` (optional): Stage ID to move opportunities to before deletion

```javascript
// Success response (no opportunities)
{
  "success": true,
  "message": "Pipeline stage 'Proposal Review' deleted successfully"
}

// Success response (with opportunity migration)
{
  "success": true,
  "message": "Pipeline stage 'Proposal Review' deleted successfully. 5 opportunities moved to 'Pending'",
  "opportunities_moved": 5,
  "target_stage": "Pending"
}

// Error response (stage has opportunities and no target specified)
{
  "success": false,
  "error": "Cannot delete stage with active opportunities. Specify moveToStageId parameter or move opportunities first.",
  "opportunity_count": 5
}
```

### Pipeline Metrics

#### Get Comprehensive Pipeline Metrics
- **URL**: `/api/pipeline/metrics`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `pipeline_id` (optional): Filter metrics by specific pipeline
  - `startDate` (optional): Start date for metrics (YYYY-MM-DD)
  - `endDate` (optional): End date for metrics (YYYY-MM-DD)
  - `stageId` (optional): Filter by specific stage

```javascript
// Response (all pipelines)
{
  "success": true,
  "data": {
    "summary": {
      "total_opportunities": 156,
      "total_value": 2450000.00,
      "won_opportunities": 23,
      "won_value": 485000.00,
      "lost_opportunities": 12,
      "lost_value": 89000.00,
      "win_rate": 65.71,
      "loss_rate": 34.29,
      "average_deal_size": 15641.03,
      "total_pipeline_value": 1876000.00,
      "weighted_pipeline_value": 1204000.00
    },
    "by_pipeline": [
      {
        "pipeline_id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
        "pipeline_name": "Sales Pipeline",
        "total_opportunities": 89,
        "total_value": 1420000.00,
        "win_rate": 72.5,
        "active_value": 1050000.00
      },
      {
        "pipeline_id": "project-pipeline-uuid",
        "pipeline_name": "Project Management Pipeline",
        "total_opportunities": 67,
        "total_value": 1030000.00,
        "win_rate": 58.2,
        "active_value": 826000.00
      }
    ],
    "by_stage": [
      {
        "stage_id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
        "stage_name": "New",
        "pipeline_name": "Sales Pipeline",
        "count": 45,
        "total_value": 675000.00,
        "average_value": 15000.00,
        "conversion_rate": 78.2,
        "avg_time_in_stage_days": 5.3
      },
      {
        "stage_id": "1b46199a-e3ae-4e15-86a3-a46a57acce8b",
        "stage_name": "Pending",
        "pipeline_name": "Sales Pipeline",
        "count": 32,
        "total_value": 512000.00,
        "average_value": 16000.00,
        "conversion_rate": 84.4,
        "avg_time_in_stage_days": 8.7
      }
    ],
    "conversion_funnel": [
      {
        "from_stage": "New",
        "to_stage": "Pending",
        "pipeline_name": "Sales Pipeline",
        "conversion_rate": 78.2,
        "opportunities_moved": 25,
        "total_opportunities": 32,
        "average_time_days": 7.2
      },
      {
        "from_stage": "Pending",
        "to_stage": "Done",
        "pipeline_name": "Sales Pipeline",
        "conversion_rate": 84.4,
        "opportunities_moved": 19,
        "total_opportunities": 22,
        "average_time_days": 12.5
      }
    ],
    "trends": [
      {
        "period": "2025-05",
        "new_opportunities": 25,
        "closed_won": 8,
        "closed_lost": 3,
        "revenue": 125000.00,
        "pipeline_value": 450000.00
      },
      {
        "period": "2025-04",
        "new_opportunities": 22,
        "closed_won": 6,
        "closed_lost": 5,
        "revenue": 98000.00,
        "pipeline_value": 385000.00
      }
    ]
  }
}

// Response (specific pipeline)
{
  "success": true,
  "data": {
    "pipeline_info": {
      "id": "9c9f6e28-a106-4c10-89f5-6deae846b674",
      "name": "Sales Pipeline",
      "description": "Main sales process"
    },
    "summary": {
      "total_opportunities": 89,
      "total_value": 1420000.00,
      "won_opportunities": 15,
      "won_value": 285000.00,
      "lost_opportunities": 7,
      "lost_value": 52000.00,
      "win_rate": 68.2,
      "loss_rate": 31.8,
      "average_deal_size": 15955.06,
      "active_pipeline_value": 1083000.00,
      "weighted_pipeline_value": 693950.00
    },
    "by_stage": [
      {
        "stage_id": "2d5e039d-c552-45d0-b7ee-1fe869bf2a48",
        "stage_name": "New",
        "count": 25,
        "total_value": 375000.00,
        "average_value": 15000.00,
        "conversion_rate": 80.0,
        "avg_time_in_stage_days": 4.5
      }
    ],
    "forecast": {
      "next_30_days": {
        "expected_revenue": 145000.00,
        "weighted_revenue": 108750.00,
        "best_case": 165000.00,
        "worst_case": 87000.00,
        "opportunities_closing": 9
      },
      "next_90_days": {
        "expected_revenue": 425000.00,
        "weighted_revenue": 318750.00,
        "best_case": 485000.00,
        "worst_case": 256000.00,
        "opportunities_closing": 24
      }
    }
  }
}
```

#### Get Pipeline Overview (Legacy Endpoint)
- **URL**: `/api/pipeline/metrics/overview`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `workspace_id` (required): Workspace identifier
  - `date_from` (optional): Start date for metrics
  - `date_to` (optional): End date for metrics

```javascript
// Response
{
  "success": true,
  "data": {
    "totalOpportunities": 150,
    "totalValue": 2500000.00,
    "avgDealSize": 16666.67,
    "wonOpportunities": 25,
    "wonValue": 450000.00,
    "winRate": 16.67,
    "stageDistribution": [
      {
        "stage_id": "stage-uuid-1",
        "stage_name": "Prospecting",
        "count": 45,
        "value": 750000.00
      },
      {
        "stage_id": "stage-uuid-2", 
        "stage_name": "Qualified",
        "count": 30,
        "value": 600000.00
      }
    ]
  }
}
```

#### Get Conversion Rates (Legacy Endpoint)
- **URL**: `/api/pipeline/metrics/conversion`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `workspace_id` (required): Workspace identifier
  - `date_from` (optional): Start date for analysis
  - `date_to` (optional): End date for analysis

```javascript
// Response
{
  "success": true,
  "data": {
    "conversionRates": [
      {
        "from_stage": "Prospecting",
        "to_stage": "Qualified",
        "conversion_rate": 65.5,
        "opportunities_moved": 42,
        "total_opportunities": 64
      },
      {
        "from_stage": "Qualified",
        "to_stage": "Proposal",
        "conversion_rate": 78.3,
        "opportunities_moved": 29,
        "total_opportunities": 37
      }
    ],
    "avgTimeInStage": [
      {
        "stage_name": "Prospecting",
        "avg_days": 12.5
      },
      {
        "stage_name": "Qualified", 
        "avg_days": 8.2
      }
    ]
  }
}
```

#### Get Performance Metrics (Legacy Endpoint)
- **URL**: `/api/pipeline/metrics/performance`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `workspace_id` (required): Workspace identifier
  - `period` (optional): 'week', 'month', 'quarter', 'year' (default: 'month')

```javascript
// Response
{
  "success": true,
  "data": {
    "period": "month",
    "forecast": {
      "expected_revenue": 185000.00,
      "weighted_revenue": 142500.00,
      "best_case": 210000.00,
      "worst_case": 98000.00
    },
    "trends": [
      {
        "period": "2025-01",
        "new_opportunities": 25,
        "closed_won": 8,
        "closed_lost": 3,
        "revenue": 125000.00
      },
      {
        "period": "2024-12",
        "new_opportunities": 22,
        "closed_won": 6,
        "closed_lost": 5,
        "revenue": 98000.00
      }
    ]
  }
}
```

---

## API Key Management Endpoints

### List API Keys
- **URL**: `/api/api-keys`
- **Method**: `GET`
- **Authentication**: JWT only (API keys cannot list themselves)
- **Query Parameters**:
  - `workspace_id` (required): Workspace identifier

```javascript
// Response
{
  "success": true,
  "data": [
    {
      "id": "api-key-uuid-1",
      "name": "Integration Key",
      "key_prefix": "crm_live_abc123",
      "key_full": "crm_live_abc123def456ghi789_xyz789", // Full key for copying
      "permissions": {
        "pipelines": ["read", "write"],
        "opportunities": ["read", "write", "delete"],
        "stages": ["read"],
        "analytics": ["read"]
      },
      "last_used_at": "2025-01-25T10:30:00.000Z",
      "expires_at": "2025-12-31T23:59:59.000Z",
      "is_active": true,
      "created_at": "2025-01-20T14:00:00.000Z",
      "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38"
    }
  ]
}
```

### Generate API Key
- **URL**: `/api/api-keys`
- **Method**: `POST`
- **Authentication**: JWT only
- **Content-Type**: `application/json`

```javascript
// Request body
{
  "name": "Mobile App Integration",
  "permissions": {
    "pipelines": ["read", "write"],
    "opportunities": ["read", "write", "delete"],
    "stages": ["read"],
    "contacts": ["read", "write"],
    "analytics": ["read", "export"]
  },
  "expires_at": "2025-12-31T23:59:59.000Z", // optional
  "prefix": "crm_live_" // optional, defaults to crm_live_
}

// Response (key shown only once)
{
  "success": true,
  "data": {
    "id": "new-api-key-uuid",
    "name": "Mobile App Integration",
    "key": "crm_live_abc123def456ghi789_xyz789", // ONLY SHOWN ONCE
    "key_full": "crm_live_abc123def456ghi789_xyz789", // ONLY SHOWN ONCE
    "key_prefix": "crm_live_abc123",
    "permissions": {
      "pipelines": ["read", "write"],
      "opportunities": ["read", "write", "delete"],
      "stages": ["read"],
      "contacts": ["read", "write"],
      "analytics": ["read", "export"]
    },
    "expires_at": "2025-12-31T23:59:59.000Z",
    "is_active": true,
    "created_at": "2025-01-27T15:30:00.000Z",
    "created_by": "8dd372cd-8b39-43c8-b344-aa0544a83f38"
  },
  "warning": "This API key will only be shown once. Please save it securely."
}
```

### Update API Key
- **URL**: `/api/api-keys/:id`
- **Method**: `PUT`
- **Authentication**: JWT only
- **Content-Type**: `application/json`

```javascript
// Request body (all fields optional)
{
  "name": "Updated Key Name",
  "permissions": {
    "pipelines": ["read", "write", "delete"],
    "opportunities": ["read", "write"],
    "stages": ["read"],
    "analytics": ["read", "export"]
  },
  "is_active": false,
  "expires_at": "2026-12-31T23:59:59.000Z"
}

// Response
{
  "success": true,
  "data": {
    "id": "api-key-uuid",
    "name": "Updated Key Name",
    "key_prefix": "crm_live_abc123",
    "permissions": {
      "pipelines": ["read", "write", "delete"],
      "opportunities": ["read", "write"],
      "stages": ["read"],
      "analytics": ["read", "export"]
    },
    "is_active": false,
    "expires_at": "2026-12-31T23:59:59.000Z",
    "updated_at": "2025-01-27T16:00:00.000Z"
  }
}
```

### Regenerate API Key
- **URL**: `/api/api-keys/:id/regenerate`
- **Method**: `POST`
- **Authentication**: JWT only

```javascript
// Response (new key shown only once)
{
  "success": true,
  "data": {
    "id": "api-key-uuid",
    "name": "Mobile App Integration",
    "key": "crm_live_new123new456new789_new999", // NEW KEY - ONLY SHOWN ONCE
    "key_full": "crm_live_new123new456new789_new999", // NEW KEY - ONLY SHOWN ONCE
    "key_prefix": "crm_live_new123",
    "permissions": {
      "pipelines": ["read", "write"],
      "opportunities": ["read", "write", "delete"],
      "stages": ["read"],
      "analytics": ["read"]
    },
    "expires_at": "2025-12-31T23:59:59.000Z",
    "regenerated_at": "2025-01-27T16:30:00.000Z"
  },
  "warning": "This new API key will only be shown once. Please save it securely."
}
```

### Delete API Key
- **URL**: `/api/api-keys/:id`
- **Method**: `DELETE`
- **Authentication**: JWT only

```javascript
// Response
{
  "success": true,
  "message": "API key 'Mobile App Integration' deleted successfully"
}
```

---

## Contacts API Endpoints

### Create Contact
- **URL**: `/api/contacts`
- **Method**: `POST`
- **Authentication**: API Key with `contacts:write` permission
- **Content-Type**: `application/json`

**Required Fields:**
- `workspace_id` - Workspace ID
- `firstname` - Contact's first name
- `lastname` - Contact's last name
- `phone_number` - Contact's phone number

**Optional Fields:**
- `email` - Contact's email address
- `lead_status` - Status of the lead (e.g., "new", "qualified")
- `lead_source` - Source of the lead
- `product` - Product of interest
- `address` - Street address
- `city` - City
- `state` - State
- `zip` - ZIP/Postal code
- `notes` - Additional notes
- `tags` - Array of tags
- `priority` - Priority level (e.g., "low", "medium", "high")
- `opt_in_through` - How the contact opted in

```bash
curl -X POST https://cc.automate8.com/api/contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer crm_live_your_api_key" \
  -d '{
    "workspace_id": "05084",
    "firstname": "John",
    "lastname": "Smith",
    "phone_number": "+15551234567",
    "email": "john.smith@example.com",
    "lead_status": "new",
    "lead_source": "website",
    "tags": ["new", "website", "summer-campaign"],
    "notes": "Interested in kitchen renovation"
  }'
```

**Success Response:**
```json
{
  "success": true,
  "message": "Contact created successfully",
  "data": {
    "id": "270f0450-cdb0-4a73-b916-fe0828d11c94",
    "phone_number": "+15551234567",
    "workspace_id": "05084",
    "name": "John Smith",
    "email": "john.smith@example.com",
    "created_at": "2025-06-02T10:17:11.081+00:00",
    "updated_at": "2025-06-02T10:17:11.081+00:00",
    "firstname": "John",
    "lastname": "Smith",
    "lead_source": "website",
    "lead_status": "new",
    "notes": "Interested in kitchen renovation",
    "tags": ["new", "website", "summer-campaign"]
  }
}
```

**Error Responses:**

*Missing Required Fields:*
```json
{
  "success": false,
  "error": "Missing required fields: firstname, lastname"
}
```

*Duplicate Contact:*
```json
{
  "success": false,
  "error": "A contact with this phone number already exists in this workspace",
  "contact_id": "existing-contact-uuid"
}
```

### Basic Search Contacts
- **URL**: `/api/contacts/search`
- **Method**: `GET`
- **Authentication**: API Key with `contacts:read` permission
- **Query Parameters**:
  - `workspace_id` (required) - Workspace ID
  - `id` (optional) - Contact ID
  - `phone` (optional) - Phone number
  - `email` (optional) - Email address
  - `firstname` (optional) - First name
  - `lastname` (optional) - Last name

```bash
curl -X GET "https://cc.automate8.com/api/contacts/search?workspace_id=05084&phone=+15551234567" \
  -H "Authorization: Bearer crm_live_your_api_key"
```

**Success Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "270f0450-cdb0-4a73-b916-fe0828d11c94",
      "phone_number": "+15551234567",
      "workspace_id": "05084",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "firstname": "John",
      "lastname": "Smith",
      "lead_status": "new",
      "tags": ["new", "website", "summer-campaign"]
    }
  ]
}
```

### Enhanced Search Contacts
- **URL**: `/api/contacts/enhanced-search`
- **Method**: `GET`
- **Authentication**: API Key with `contacts:read` permission
- **Query Parameters**:
  - `workspace_id` (required) - Workspace ID
  - `contact_id` (optional) - Contact ID
  - `phone_number` (optional) - Phone number
  - `lead_status` (optional) - Lead status
  - `tag` (optional) - Tag to search for
  - `follow_up_date` (optional) - Follow-up date
  - `webhook_name` (optional) - Webhook name
  - `from_date` (optional) - Filter by created_at >= from_date (ISO format)
  - `to_date` (optional) - Filter by created_at <= to_date (ISO format)
  - `limit` (optional) - Limit the number of results (default: 20, max: 100)
  - `offset` (optional) - Pagination offset

```bash
curl -X GET "https://cc.automate8.com/api/contacts/enhanced-search?workspace_id=05084&lead_status=new&tag=website&from_date=2025-01-01T00:00:00Z&limit=10" \
  -H "Authorization: Bearer crm_live_your_api_key"
```

**Success Response:**
```json
{
  "success": true,
  "count": 25,
  "data": [
    {
      "id": "270f0450-cdb0-4a73-b916-fe0828d11c94",
      "phone_number": "+15551234567",
      "workspace_id": "05084",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "created_at": "2025-06-02T10:17:11.081+00:00",
      "updated_at": "2025-06-02T10:17:11.081+00:00",
      "firstname": "John",
      "lastname": "Smith",
      "lead_source": "website",
      "lead_status": "new",
      "tags": ["new", "website", "summer-campaign"]
    },
    // Additional results...
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 25,
    "has_more": true
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "At least one search parameter is required: contact_id, phone_number, lead_status, tag, follow_up_date, or webhook_name"
}
```

---

## SMS Endpoints

### Send Immediate SMS
- **URL**: `/api/schedule-sms`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "phoneNumber": "+14345054099",
  "message": "Hello",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "metadata": {
    "source": "broadcast2"
  }
}
```

### Schedule Delayed SMS
- **URL**: `/api/schedule-sms`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "phoneNumber": "+14345054099",
  "message": "Hello",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "delay": 3600000, // 1 hour delay in milliseconds
  "metadata": {
    "source": "broadcast2",
    "campaignId": "campaign_id",
    "messageId": "message_id",
    "scheduledTime": "2025-03-27T00:20:00.182Z",
    "batchId": "batch_id"
  }
}
```

## Email Endpoints

### Send Immediate Email
- **URL**: `/api/schedule-email`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Email content</p>",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "metadata": {
    "source": "broadcast2",
    "callbackEndpoint": "/api/email/send"
  }
}
```

### Schedule Delayed Email
- **URL**: `/api/schedule-email`
- **Method**: `POST`
- **Content-Type**: `application/json`

```javascript
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "html": "<p>Email content</p>",
  "contactId": "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
  "workspaceId": "66338",
  "delay": 3600000, // 1 hour delay in milliseconds
  "metadata": {
    "source": "broadcast2",
    "campaignId": "campaign_id",
    "messageId": "message_id",
    "scheduledTime": "2025-03-27T00:20:00.182Z",
    "batchId": "batch_id",
    "callbackEndpoint": "/api/email/send"
  }
}
```

## Response Format

### Success Response
```javascript
{
  "success": true,
  "jobId": "job_id",
  "message": "SMS/Email queued for immediate delivery" // or "SMS/Email scheduled successfully"
}
```

### Error Response
```javascript
{
  "success": false,
  "message": "Error message details"
}
```

## Important Notes

1. All endpoints are CORS-enabled
2. Required fields:
   - SMS: `phoneNumber`, `message`, `contactId`, `workspaceId`
   - Email: `to`, `subject`, `html`, `contactId`, `workspaceId`
3. Optional fields:
   - `delay`: Time in milliseconds to delay the sending
   - `metadata`: Additional information about the message
4. The same endpoint is used for both immediate and delayed sending:
   - Without `delay`: Message is sent immediately
   - With `delay`: Message is scheduled for later
5. Rate Limits:
   - SMS: 50 jobs per second
   - Email: 100 jobs per second

## Example Usage

```javascript
// Using fetch API
fetch('https://cc.automate8.com/api/schedule-sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: "+14345054099",
    message: "Hello",
    contactId: "3a0c1e05-4f82-4ae7-8644-97585cb5d80d",
    workspaceId: "66338",
    delay: 3600000,
    metadata: {
      source: "broadcast2",
      campaignId: "campaign_id"
    }
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

# Sequence API Endpoints

## Sequence Management

### Create Sequence
- **URL**: `/api/workspaces/:workspaceId/sequences`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authorization**: `Bearer token`

```javascript
{
  "name": "Follow-up Sequence",
  "messages": [
    {
      "text": "Thanks for reaching out! I'll follow up soon.",
      "timeValue": 5,
      "timeUnit": "minutes"
    },
    {
      "text": "Just checking in. Let me know if you have any questions.",
      "timeValue": 1,
      "timeUnit": "days",
      "subflow": "optional-subflow-id"
    }
  ]
}
```

### Update Sequence
- **URL**: `/api/workspaces/:workspaceId/sequences/:id`
- **Method**: `PUT`
- **Content-Type**: `application/json`
- **Authorization**: `Bearer token`

```javascript
{
  "name": "Updated Follow-up Sequence",
  "messages": [
    {
      "text": "Updated message content",
      "timeValue": 10,
      "timeUnit": "minutes"
    },
    {
      "text": "Second follow-up message",
      "timeValue": 2,
      "timeUnit": "days"
    }
  ]
}
```

### Get Sequence
- **URL**: `/api/workspaces/:workspaceId/sequences/:id`
- **Method**: `GET`
- **Authorization**: `Bearer token`

### List Sequences
- **URL**: `/api/workspaces/:workspaceId/sequences`
- **Method**: `GET`
- **Authorization**: `Bearer token`
- **Query Parameters**:
  - `status` (optional): Filter by status (`active` or `inactive`)

## Sequence Application

### Apply Sequence to Contacts
- **URL**: `/api/workspaces/:workspaceId/sequences/:id/apply`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authorization**: `Bearer token`

```javascript
{
  "contactIds": ["contact-uuid-1", "contact-uuid-2"]
}
```

### Get Sequence Execution Status
- **URL**: `/api/workspaces/:workspaceId/sequence-executions/:id`
- **Method**: `GET`
- **Authorization**: `Bearer token`

### Cancel Sequence Execution
- **URL**: `/api/workspaces/:workspaceId/sequence-executions/:id`
- **Method**: `DELETE`
- **Authorization**: `Bearer token`

### Get Active Sequences for Contact
- **URL**: `/api/workspaces/:workspaceId/contacts/:contactId/active-sequences`
- **Method**: `GET`
- **Authorization**: `Bearer token`

## Sequence Response Format

### Success Response - Create/Update Sequence
```javascript
{
  "success": true,
  "sequence": {
    "id": "sequence-uuid",
    "name": "Follow-up Sequence",
    "workspace_id": "workspace-id",
    "status": "active",
    "created_at": "2025-05-24T18:30:00.000Z",
    "updated_at": "2025-05-24T18:30:00.000Z"
  }
}
```

### Success Response - Apply Sequence
```javascript
{
  "success": true,
  "succeeded": [
    { "contactId": "contact-uuid-1", "executionId": "execution-uuid-1" },
    { "contactId": "contact-uuid-2", "executionId": "execution-uuid-2" }
  ],
  "failed": [
    { "contactId": "contact-uuid-3", "error": "Error message" }
  ]
}
```

### Success Response - Get Execution Status
```javascript
{
  "success": true,
  "execution": {
    "id": "execution-uuid",
    "sequence_id": "sequence-uuid",
    "contact_id": "contact-uuid",
    "status": "active",
    "started_at": "2025-05-24T18:30:00.000Z",
    "messageJobs": [
      {
        "id": "job-uuid",
        "message": { /* message details */ },
        "status": "pending",
        "scheduled_time": "2025-05-24T19:00:00.000Z"
      }
    ]
  }
}
```

### Error Response
```javascript
{
  "success": false,
  "error": "Error message details"
}
```

## Sequence API Notes

1. All sequence endpoints require authentication via Bearer token
2. Workspace access is enforced at the database level through RLS policies
3. Message timing is relative to the previous message or sequence start
4. Contact timezones are respected when scheduling messages:
   - Contact timezone from `metadata.timezone` is used if available
   - Falls back to workspace timezone
   - Defaults to UTC if neither is available
5. Maximum recommended sequence length: 20 messages
6. Batch processing for multiple contacts uses a queue to avoid rate limits
7. Sequence executions can be cancelled at any time before completion

# Trigger.dev Webhook Endpoints

## Contact Field Change Events

### Queue Single Field Change Event
- **URL**: `/api/triggers/webhooks/contact-field-changed`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: JWT or API Key

```javascript
// Request body
{
  "contactId": "contact-uuid",        // required: Contact ID
  "workspaceId": "workspace-uuid",    // required: Workspace ID
  "fieldName": "lead_status",         // required: Name of the changed field
  "oldValue": "new",                  // optional: Previous field value
  "newValue": "qualified",            // optional: New field value
  "changedAt": "2025-05-29T10:30:00.000Z"  // optional: Timestamp of change
}

// Success Response
{
  "success": true,
  "taskId": "task-uuid",
  "message": "Trigger processing queued successfully"
}

// Error Response
{
  "error": "Missing required fields: contactId, workspaceId, fieldName",
  "details": "Error details if available"
}
```

### Queue Bulk Field Changes
- **URL**: `/api/triggers/webhooks/bulk-field-changes`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Authentication**: JWT or API Key

```javascript
// Request body
{
  "changes": [
    {
      "contactId": "contact-uuid-1",
      "workspaceId": "workspace-uuid",
      "fieldName": "lead_status",
      "oldValue": "new",
      "newValue": "qualified",
      "changedAt": "2025-05-29T10:30:00.000Z"
    },
    {
      "contactId": "contact-uuid-2",
      "workspaceId": "workspace-uuid",
      "fieldName": "tags",
      "oldValue": ["lead"],
      "newValue": ["lead", "qualified"],
      "changedAt": "2025-05-29T10:30:00.000Z"
    }
  ]
}

// Success Response
{
  "success": true,
  "tasksQueued": 2,
  "taskIds": ["task-uuid-1", "task-uuid-2"]
}

// Error Response
{
  "error": "Failed to queue bulk trigger processing",
  "details": "Error details if available"
}
```

## Testing with cURL

### Test Single Field Change
```bash
curl -X POST https://your-api-url/api/triggers/webhooks/contact-field-changed \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "contactId": "contact-uuid",
    "workspaceId": "workspace-uuid",
    "fieldName": "lead_status",
    "oldValue": "new",
    "newValue": "qualified"
  }'
```

### Test Bulk Field Changes
```bash
curl -X POST https://your-api-url/api/triggers/webhooks/bulk-field-changes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "changes": [
      {
        "contactId": "contact-uuid-1",
        "workspaceId": "workspace-uuid",
        "fieldName": "lead_status",
        "oldValue": "new",
        "newValue": "qualified"
      },
      {
        "contactId": "contact-uuid-2",
        "workspaceId": "workspace-uuid",
        "fieldName": "tags",
        "oldValue": ["lead"],
        "newValue": ["lead", "qualified"]
      }
    ]
  }'
```

## Important Notes

1. All webhook endpoints require authentication
2. Field changes are processed asynchronously via Trigger.dev tasks
3. The `changedAt` field defaults to current timestamp if not provided
4. Bulk changes are processed in parallel with rate limiting
5. Task IDs can be used to monitor processing status in Trigger.dev dashboard
6. Maximum recommended batch size for bulk changes: 100 items

---

# Advanced Action System API Endpoints

## Tags Management

### List All Tags
- **URL**: `/api/tags`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `search` (optional): Search term for tag names
  - `color` (optional): Filter by color (green, blue, purple, orange, red, cyan, pink, teal)
  - `limit` (optional): Number of tags to return (1-100, default: 50)
  - `offset` (optional): Number of tags to skip (default: 0)

**Sample cURL Request:**
```bash
curl -X GET "https://cc.automate8.com/api/tags?search=lead&color=green&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213"
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "tag-uuid-1",
      "name": "Hot Lead",
      "color": "red",
      "description": "High priority prospects",
      "workspace_id": "15213",
      "usage_count": 25,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

### Create New Tag
- **URL**: `/api/tags`
- **Method**: `POST`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

**Request Body:**
```javascript
{
  "name": "VIP Customer",
  "color": "purple",
  "description": "High-value customers requiring special attention"
}
```

**Sample cURL Request:**
```bash
curl -X POST "https://cc.automate8.com/api/tags" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "VIP Customer",
    "color": "purple",
    "description": "High-value customers requiring special attention"
  }'
```

### Update Tag
- **URL**: `/api/tags/:id`
- **Method**: `PUT`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

**Sample cURL Request:**
```bash
curl -X PUT "https://cc.automate8.com/api/tags/tag-uuid-1" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tag Name",
    "color": "blue"
  }'
```

### Delete Tag
- **URL**: `/api/tags/:id`
- **Method**: `DELETE`
- **Authentication**: JWT or API Key

**Sample cURL Request:**
```bash
curl -X DELETE "https://cc.automate8.com/api/tags/tag-uuid-1" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213"
```

## Agents Management

### List All Agents
- **URL**: `/api/agents`
- **Method**: `GET`
- **Authentication**: JWT or API Key
- **Query Parameters**:
  - `role` (optional): Filter by role (admin, manager, agent, viewer)
  - `status` (optional): Filter by status (active, inactive, pending)
  - `search` (optional): Search by name or email
  - `include_assignments` (optional): Include active assignment counts (default: true)

**Sample cURL Request:**
```bash
curl -X GET "https://cc.automate8.com/api/agents?role=agent&include_assignments=true" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213"
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "user-uuid-1",
      "name": "John Smith",
      "email": "john@company.com",
      "role": "agent",
      "status": "active",
      "avatar": "https://example.com/avatar.jpg",
      "active_assignments": 5,
      "joined_at": "2024-01-15T00:00:00Z",
      "last_active": "2025-01-15T14:30:00Z"
    }
  ]
}
```

### Get Agent Details
- **URL**: `/api/agents/:id`
- **Method**: `GET`
- **Authentication**: JWT or API Key

**Sample cURL Request:**
```bash
curl -X GET "https://cc.automate8.com/api/agents/user-uuid-1" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213"
```

### Get Agent Statistics
- **URL**: `/api/agents/stats`
- **Method**: `GET`
- **Authentication**: JWT or API Key

**Sample cURL Request:**
```bash
curl -X GET "https://cc.automate8.com/api/agents/stats" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213"
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "total_agents": 10,
    "active_agents": 8,
    "by_role": {
      "admin": 2,
      "manager": 2,
      "agent": 5,
      "viewer": 1
    },
    "assignment_distribution": [
      {
        "agent_id": "user-uuid-1",
        "agent_name": "John Smith",
        "assignment_count": 15
      }
    ]
  }
}
```

## Action Execution API

### Execute Basic Action
- **URL**: `/api/actions/execute`
- **Method**: `POST`
- **Authentication**: JWT or API Key
- **Content-Type**: `application/json`

**Request Body:**
```javascript
{
  "action_type": "add_tag",
  "contact_id": "contact-uuid-1",
  "configuration": {
    "tagName": "Hot Lead",
    "color": "red",
    "description": "High priority prospect"
  },
  "execution_context": {
    "flow_id": "flow-uuid-1",
    "trigger_event": "form_submission"
  }
}
```

**Sample cURL Request:**
```bash
curl -X POST "https://cc.automate8.com/api/actions/execute" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "X-Workspace-ID: 15213" \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "add_tag",
    "contact_id": "contact-uuid-1",
    "configuration": {
      "tagName": "Hot Lead",
      "color": "red",
      "description": "High priority prospect"
    }
  }'
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "execution_id": "execution-uuid-1",
    "action_type": "add_tag",
    "status": "completed",
    "result": {
      "tag_added": true,
      "tag_id": "tag-uuid-1",
      "contact_id": "contact-uuid-1"
    },
    "executed_at": "2025-01-15T14:30:00Z",
    "duration_ms": 150
  }
}
```

## Rate Limiting

All Advanced Action System APIs implement rate limiting:

- **Tags API**: 100 requests per minute per IP
- **Agents API**: 100 requests per minute per IP
- **Action Execution**: 50 requests per minute per workspace

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

## Error Handling

All endpoints return consistent error responses:

```javascript
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE", // Optional
  "details": {} // Optional additional details
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `429`: Rate Limited
- `500`: Internal Server Error

## Authentication Scopes

API keys must have appropriate scopes for Advanced Action System endpoints:

- **Tags**: Requires `tags:read`, `tags:write`, `tags:delete` scopes
- **Agents**: Requires `workspace_members:read` scope
- **Actions**: Requires `actions:execute` scope

Add these scopes to your API key in the workspace settings or when creating new API keys through the API Keys management interface.

---

## Calendar Booking API (Cloudflare Worker)

Base URL: Deployed on Cloudflare Workers network

### Authentication
- **JWT Authentication**: Required for admin endpoints
- **API Key Authentication**: Required for admin endpoints  
- **Public Access**: Available for availability queries and user bookings

### Calendar Availability

#### Get Available Slots
- **URL**: `/api/calendar/availability`
- **Method**: `GET`
- **Authentication**: None (Public endpoint)
- **Query Parameters**:
  - `date` (required): Date in YYYY-MM-DD format
  - `admin_id` (optional): Filter slots by specific admin/agent

```bash
curl -X GET "https://your-worker-domain/api/calendar/availability?date=2025-07-15&admin_id=admin-uuid"
```

**Response:**
```javascript
{
  "success": true,
  "slots": [
    {
      "id": "event-uuid-1",
      "start_time": "2025-07-15T09:00:00Z",
      "end_time": "2025-07-15T10:00:00Z",
      "is_booked": false,
      "admin_id": "admin-uuid",
      "title": "Consultation Slot",
      "description": "Available for product consultation",
      "location": "Virtual Meeting",
      "booking_type": "single",
      "max_bookings": 1
    }
  ],
  "date": "2025-07-15",
  "count": 1
}
```

### Appointment Management

#### Create/Update Event (Admin)
- **URL**: `/api/calendar/events`
- **Method**: `POST`
- **Authentication**: JWT or API Key (Admin required)
- **Content-Type**: `application/json`

```javascript
// Create new event
{
  "contact_id": "contact-uuid", // optional
  "admin_id": "admin-uuid", // optional  
  "workspace_id": "workspace-uuid", // required
  "event_title": "Product Consultation",
  "event_description": "Initial consultation meeting",
  "start_time": "2025-07-15T09:00:00Z", // required
  "end_time": "2025-07-15T10:00:00Z", // required
  "status": "scheduled",
  "location": "Virtual Meeting",
  "notes": "Customer interested in kitchen renovation"
}

// Update existing event (include id)
{
  "id": "appointment-uuid",
  "event_title": "Updated Consultation",
  "start_time": "2025-07-15T10:00:00Z",
  "end_time": "2025-07-15T11:00:00Z"
}
```

**Response:**
```javascript
{
  "success": true,
  "appointment": {
    "id": "appointment-uuid",
    "contact_id": "contact-uuid",
    "admin_id": "admin-uuid",
    "workspace_id": "workspace-uuid",
    "event_title": "Product Consultation",
    "event_description": "Initial consultation meeting",
    "start_time": "2025-07-15T09:00:00Z",
    "end_time": "2025-07-15T10:00:00Z",
    "status": "scheduled",
    "location": "Virtual Meeting",
    "notes": "Customer interested in kitchen renovation",
    "created_at": "2025-07-08T10:00:00Z",
    "updated_at": "2025-07-08T10:00:00Z"
  }
}
```

#### Delete Event (Admin)
- **URL**: `/api/calendar/events`
- **Method**: `DELETE`
- **Authentication**: JWT or API Key (Admin required)
- **Content-Type**: `application/json`

```javascript
{
  "id": "appointment-uuid"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Appointment deleted"
}
```

### User Booking

#### Create Booking
- **URL**: `/api/calendar/book`
- **Method**: `POST`
- **Authentication**: None (Public endpoint)
- **Content-Type**: `application/json`

```javascript
// Booking with existing contact
{
  "contact_id": "existing-contact-uuid",
  "workspace_id": "workspace-uuid", // required
  "event_title": "Kitchen Consultation",
  "event_description": "Discuss renovation plans",
  "start_time": "2025-07-15T09:00:00Z", // required
  "end_time": "2025-07-15T10:00:00Z", // required
  "location": "Customer's home",
  "notes": "Prefer morning appointments",
  "product_interest": "Kitchen Renovation"
}

// Booking with new contact (auto-creates contact)
{
  "workspace_id": "workspace-uuid", // required
  "contact_name": "John Smith", // required for new contacts
  "contact_email": "john@example.com", // required for new contacts
  "contact_phone": "+1234567890", // optional
  "event_title": "Bathroom Consultation",
  "event_description": "Initial consultation for bathroom remodel",
  "start_time": "2025-07-15T14:00:00Z", // required
  "end_time": "2025-07-15T15:00:00Z", // required
  "location": "Virtual Meeting",
  "product_interest": "Bathroom Renovation"
}
```

**Response:**
```javascript
{
  "success": true,
  "booking": {
    "id": "appointment-uuid",
    "contact_id": "contact-uuid",
    "workspace_id": "workspace-uuid",
    "created_by": "464cf603-5a10-4470-a100-331fc0766680",
    "title": "Kitchen Renovation - John Smith",
    "description": "Kitchen Renovation booking for John Smith (john@example.com)",
    "appointment_date": "2025-07-15T09:00:00Z",
    "duration_minutes": 60,
    "location": "Customer's home"
  },
  "message": "Booking created successfully"
}
```

### List Bookings (Admin)

#### Get Bookings
- **URL**: `/api/calendar/bookings`
- **Method**: `GET`
- **Authentication**: JWT or API Key (Admin required)
- **Query Parameters**:
  - `workspace_id` (optional): Filter by workspace
  - `contact_id` (optional): Filter by specific contact
  - `admin_id` (optional): Filter by admin/agent
  - `date` (optional): Filter by date (YYYY-MM-DD format)

```bash
curl -X GET "https://your-worker-domain/api/calendar/bookings?workspace_id=workspace-uuid&date=2025-07-15" \
  -H "Authorization: Bearer your-jwt-token"
```

**Response:**
```javascript
{
  "success": true,
  "bookings": [
    {
      "id": "appointment-uuid-1",
      "contact_id": "contact-uuid-1",
      "workspace_id": "workspace-uuid",
      "title": "Kitchen Consultation",
      "description": "Initial consultation meeting",
      "appointment_date": "2025-07-15T09:00:00Z",
      "duration_minutes": 60,
      "location": "Virtual Meeting",
      "created_at": "2025-07-08T10:00:00Z"
    },
    {
      "id": "appointment-uuid-2", 
      "contact_id": "contact-uuid-2",
      "workspace_id": "workspace-uuid",
      "title": "Bathroom Consultation",
      "description": "Follow-up consultation",
      "appointment_date": "2025-07-15T14:00:00Z",
      "duration_minutes": 60,
      "location": "Customer's home",
      "created_at": "2025-07-08T11:00:00Z"
    }
  ]
}
```

### Calendar API Features

#### Contact Management Integration
- **Auto-contact creation**: New bookings automatically create contacts if they don't exist
- **Contact matching**: Existing contacts are matched by email and workspace
- **Contact fields**: Supports firstname, lastname, email, phone_number, lead_source
- **Lead tracking**: Bookings are tagged with `calendar_booking` as lead source

#### Data Structure
- **Database tables**: Uses `appointments`, `contacts`, and `calendar_events` tables
- **Workspace isolation**: All data is scoped to workspaces via RLS policies
- **Flexible scheduling**: Supports variable duration appointments
- **Conflict detection**: Prevents double-booking for the same contact/time

#### Error Handling
All endpoints return consistent error responses:

```javascript
{
  "success": false,
  "error": "Error description",
  "details": "Additional error details" // Optional
}
```

#### CORS Support
- **Cross-origin requests**: Enabled for browser-based integrations
- **Preflight handling**: Automatic OPTIONS request handling
- **Headers**: Supports Authorization, Content-Type headers

#### Rate Limiting
- **Public endpoints**: No rate limiting on availability and booking endpoints
- **Admin endpoints**: Standard rate limiting applies per authentication

### Integration Notes

1. **Frontend Integration**: Designed to work with React calendar components
2. **Database Schema**: Compatible with existing CRM contact and appointment structures  
3. **Authentication**: Hybrid approach - public for bookings, authenticated for admin functions
4. **Deployment**: Runs on Cloudflare Workers for global edge distribution
5. **Performance**: Stateless design with direct Supabase integration
