# Pipeline API Documentation

Base URL: `https://cc.automate8.com` (Production) or `http://localhost:5000` (Development)

## Authentication

```http
X-API-Key: crm_your_api_key_here
X-Workspace-Id: your_workspace_id
```

## Opportunities Endpoints

### 1. Get All Opportunities

**GET** `/api/pipeline/opportunities`

**Query Parameters:**
- `limit` (integer, optional): Number of opportunities to return (default: 50, max: 100)
- `offset` (integer, optional): Number of opportunities to skip (default: 0)
- `stage_id` (uuid, optional): Filter by specific stage
- `status` (string, optional): Filter by status ("active", "won", "lost")
- `search` (string, optional): Search in title and description
- `sort` (string, optional): Sort field (default: "created_at")
- `order` (string, optional): Sort order "asc" or "desc" (default: "desc")

**Sample Request:**
```http
GET /api/pipeline/opportunities?limit=20&status=active&sort=amount&order=desc
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "opp_123456789",
      "title": "Enterprise Software Deal",
      "description": "Large enterprise customer looking for CRM solution",
      "amount": 50000.00,
      "currency": "USD",
      "probability": 75,
      "expected_close_date": "2024-03-15",
      "priority": "high",
      "is_closed": false,
      "is_won": false,
      "tags": ["enterprise", "software"],
      "stage": {
        "id": "stage_456",
        "name": "Proposal",
        "position": 3,
        "color": "#F6AD55",
        "pipeline_id": "pipeline_789"
      },
      "contact": {
        "id": "contact_321",
        "firstname": "John",
        "lastname": "Doe",
        "email": "john.doe@enterprise.com",
        "phone_number": "+1234567890"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z"
    }
  ],
  "pagination": {
    "total": 85,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2. Get Opportunity by ID

**GET** `/api/pipeline/opportunities/{opportunity_id}`

**Sample Request:**
```http
GET /api/pipeline/opportunities/opp_123456789
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "opp_123456789",
    "title": "Enterprise Software Deal",
    "description": "Large enterprise customer looking for CRM solution",
    "amount": 50000.00,
    "currency": "USD",
    "probability": 75,
    "expected_close_date": "2024-03-15",
    "priority": "high",
    "is_closed": false,
    "is_won": false,
    "tags": ["enterprise", "software"],
    "stage": {
      "id": "stage_456",
      "name": "Proposal",
      "position": 3,
      "color": "#F6AD55",
      "pipeline_id": "pipeline_789"
    },
    "contact": {
      "id": "contact_321",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@enterprise.com",
      "phone_number": "+1234567890"
    },
    "company": {
      "id": "company_123",
      "name": "Enterprise Corp"
    },
    "appointments": [
      {
        "id": "apt_789",
        "appointment": {
          "id": "apt_789",
          "title": "Demo Call",
          "start_time": "2024-01-25T15:00:00Z",
          "end_time": "2024-01-25T16:00:00Z"
        }
      }
    ],
    "activities": [
      {
        "id": "activity_456",
        "type": "email",
        "description": "Sent proposal document",
        "created_at": "2024-01-20T10:00:00Z"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:45:00Z"
  }
}
```

### 3. Create Opportunity

**POST** `/api/pipeline/opportunities`

**Sample Request:**
```http
POST /api/pipeline/opportunities
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "title": "New Sales Opportunity",
  "description": "Potential customer interested in our premium package",
  "contact_id": "contact_321",
  "stage_id": "stage_123",
  "value": 25000,
  "currency": "USD",
  "expected_close_date": "2024-04-30",
  "priority": "medium",
  "tags": ["premium", "new_customer"]
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "opp_987654321",
    "title": "New Sales Opportunity",
    "description": "Potential customer interested in our premium package",
    "amount": 25000.00,
    "currency": "USD",
    "probability": null,
    "expected_close_date": "2024-04-30",
    "priority": "medium",
    "is_closed": false,
    "is_won": false,
    "tags": ["premium", "new_customer"],
    "stage": {
      "id": "stage_123",
      "name": "Initial Contact",
      "position": 1,
      "color": "#4299E1",
      "pipeline_id": "pipeline_789"
    },
    "contact": {
      "id": "contact_321",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@enterprise.com",
      "phone_number": "+1234567890"
    },
    "created_at": "2024-01-25T16:00:00Z",
    "updated_at": "2024-01-25T16:00:00Z"
  }
}
```

### 4. Update Opportunity

**PUT** `/api/pipeline/opportunities/{opportunity_id}`

**Sample Request:**
```http
PUT /api/pipeline/opportunities/opp_123456789
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "title": "Enterprise Software Deal - Updated",
  "stage_id": "stage_789",
  "value": 75000,
  "probability": 85,
  "priority": "high",
  "tags": ["enterprise", "software", "hot_lead"]
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "opp_123456789",
    "title": "Enterprise Software Deal - Updated",
    "description": "Large enterprise customer looking for CRM solution",
    "amount": 75000.00,
    "currency": "USD",
    "probability": 85,
    "expected_close_date": "2024-03-15",
    "priority": "high",
    "is_closed": false,
    "is_won": false,
    "tags": ["enterprise", "software", "hot_lead"],
    "stage": {
      "id": "stage_789",
      "name": "Negotiation",
      "position": 4,
      "color": "#ED8936",
      "pipeline_id": "pipeline_789"
    },
    "contact": {
      "id": "contact_321",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@enterprise.com",
      "phone_number": "+1234567890"
    },
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-25T17:30:00Z"
  }
}
```

### 5. Move Opportunity

**PUT** `/api/pipeline/opportunities/{opportunity_id}/move`

**Sample Request:**
```http
PUT /api/pipeline/opportunities/opp_123456789/move
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "stage_id": "stage_won",
  "probability": 100,
  "status": "won"
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "opp_123456789",
    "title": "Enterprise Software Deal - Updated",
    "stage_id": "stage_won",
    "is_closed": true,
    "is_won": true,
    "probability": 100,
    "updated_at": "2024-01-25T18:00:00Z"
  }
}
```

### 6. Delete Opportunity

**DELETE** `/api/pipeline/opportunities/{opportunity_id}`

**Sample Request:**
```http
DELETE /api/pipeline/opportunities/opp_123456789
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Opportunity deleted successfully"
}
```

## Pipeline Management Endpoints

### 7. Get All Pipelines

**GET** `/api/pipeline/pipelines`

**Sample Request:**
```http
GET /api/pipeline/pipelines
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "pipeline_789",
      "name": "Sales Pipeline",
      "description": "Main sales process",
      "is_default": true,
      "is_active": true,
      "stages": [
        {
          "id": "stage_123",
          "name": "Initial Contact",
          "position": 1,
          "color": "#4299E1",
          "default_probability": 10,
          "is_won_stage": false,
          "is_lost_stage": false
        },
        {
          "id": "stage_456",
          "name": "Proposal",
          "position": 2,
          "color": "#F6AD55",
          "default_probability": 50,
          "is_won_stage": false,
          "is_lost_stage": false
        },
        {
          "id": "stage_won",
          "name": "Won",
          "position": 3,
          "color": "#48BB78",
          "default_probability": 100,
          "is_won_stage": true,
          "is_lost_stage": false
        }
      ],
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 8. Create Pipeline

**POST** `/api/pipeline/pipelines`

**Sample Request:**
```http
POST /api/pipeline/pipelines
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "name": "Marketing Pipeline",
  "description": "Pipeline for marketing qualified leads"
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "pipeline_new123",
    "name": "Marketing Pipeline",
    "description": "Pipeline for marketing qualified leads",
    "is_default": false,
    "is_active": true,
    "stages": [
      {
        "id": "stage_new1",
        "name": "New",
        "position": 1,
        "color": "#4299E1",
        "default_probability": 10,
        "pipeline_id": "pipeline_new123"
      },
      {
        "id": "stage_new2",
        "name": "Pending",
        "position": 2,
        "color": "#F6AD55",
        "default_probability": 50,
        "pipeline_id": "pipeline_new123"
      },
      {
        "id": "stage_new3",
        "name": "Done",
        "position": 3,
        "color": "#48BB78",
        "default_probability": 90,
        "is_won_stage": true,
        "pipeline_id": "pipeline_new123"
      }
    ],
    "created_at": "2024-01-25T18:30:00Z"
  }
}
```

## Stage Management Endpoints

### 9. Get Pipeline Stages

**GET** `/api/pipeline/stages`

**Query Parameters:**
- `pipeline_id` (uuid, optional): Filter stages by pipeline ID

**Sample Request:**
```http
GET /api/pipeline/stages?pipeline_id=pipeline_789
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stage_123",
      "name": "Initial Contact",
      "position": 1,
      "color": "#4299E1",
      "default_probability": 10,
      "is_won_stage": false,
      "is_lost_stage": false,
      "pipeline": {
        "id": "pipeline_789",
        "name": "Sales Pipeline"
      },
      "opportunities": {
        "count": 15
      }
    }
  ]
}
```

### 10. Create Stage

**POST** `/api/pipeline/stages`

**Sample Request:**
```http
POST /api/pipeline/stages
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "name": "Follow Up",
  "pipeline_id": "pipeline_789",
  "position": 2,
  "color": "#9F7AEA",
  "default_probability": 30,
  "is_won_stage": false,
  "is_lost_stage": false
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "stage_new456",
    "name": "Follow Up",
    "pipeline_id": "pipeline_789",
    "position": 2,
    "color": "#9F7AEA",
    "default_probability": 30,
    "is_won_stage": false,
    "is_lost_stage": false,
    "created_at": "2024-01-25T19:00:00Z"
  }
}
```

### 11. Reorder Stages

**PUT** `/api/pipeline/stages/reorder`

**Sample Request:**
```http
PUT /api/pipeline/stages/reorder
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "pipeline_id": "pipeline_789",
  "stage_orders": [
    {
      "stage_id": "stage_123",
      "position": 1
    },
    {
      "stage_id": "stage_new456",
      "position": 2
    },
    {
      "stage_id": "stage_456",
      "position": 3
    }
  ]
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Stages reordered successfully"
}
```

## Analytics Endpoints

### 12. Get Pipeline Metrics

**GET** `/api/pipeline/metrics`

**Query Parameters:**
- `pipeline_id` (uuid, optional): Filter by specific pipeline
- `startDate` (date, optional): Filter from date (YYYY-MM-DD)
- `endDate` (date, optional): Filter to date (YYYY-MM-DD)
- `stageId` (uuid, optional): Filter by specific stage

**Sample Request:**
```http
GET /api/pipeline/metrics?pipeline_id=pipeline_789&startDate=2024-01-01&endDate=2024-01-31
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "id": "stage_123",
        "name": "Initial Contact",
        "position": 1,
        "color": "#4299E1",
        "count": 25,
        "totalAmount": 125000.00,
        "weightedAmount": 12500.00,
        "opportunities": [...]
      }
    ],
    "totalCount": 85,
    "totalAmount": 450000.00,
    "weightedAmount": 287500.00
  }
}
```

### 13. Get Conversion Rates

**GET** `/api/pipeline/conversion-rates`

**Query Parameters:**
- `pipeline_id` (uuid, optional): Filter by specific pipeline
- `period` (string, optional): Time period ("30d", "90d", "1y")

**Sample Request:**
```http
GET /api/pipeline/conversion-rates?pipeline_id=pipeline_789&period=90d
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "overall_conversion_rate": 23.5,
    "average_deal_size": 32500.00,
    "average_sales_cycle_days": 45,
    "stage_conversions": [
      {
        "from_stage": "Initial Contact",
        "to_stage": "Proposal",
        "conversion_rate": 65.2,
        "opportunities_count": 46
      }
    ]
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Title and stage_id are required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Opportunity not found"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Invalid stage_id for this workspace"
}
```