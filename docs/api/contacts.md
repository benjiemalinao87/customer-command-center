# Contacts API Documentation

Base URL: `https://cc.automate8.com` (Production) or `http://localhost:5000` (Development)

## Authentication

```http
X-API-Key: crm_your_api_key_here
X-Workspace-Id: your_workspace_id
```

## Endpoints

### 1. Get All Contacts

**GET** `/api/contacts`

**Query Parameters:**
- `limit` (integer, optional): Number of contacts to return (default: 50, max: 100)
- `offset` (integer, optional): Number of contacts to skip (default: 0)
- `search` (string, optional): Search term for name, email, or phone
- `sort` (string, optional): Sort field (default: "created_at")
- `order` (string, optional): Sort order "asc" or "desc" (default: "desc")
- `board_id` (uuid, optional): Filter by board ID
- `tags` (string, optional): Comma-separated list of tags

**Sample Request:**
```http
GET /api/contacts?limit=20&search=john&sort=firstname&order=asc
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "tags": ["lead", "qualified"],
      "custom_fields": {
        "company": "Acme Corp",
        "source": "website"
      },
      "board_id": "550e8400-e29b-41d4-a716-446655440001",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### 2. Get Contact by ID

**GET** `/api/contacts/{contact_id}`

**Sample Request:**
```http
GET /api/contacts/550e8400-e29b-41d4-a716-446655440000
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstname": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "phone_number": "+1234567890",
    "tags": ["lead", "qualified"],
    "custom_fields": {
      "company": "Acme Corp",
      "source": "website",
      "annual_revenue": 50000
    },
    "board_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "messages": [
      {
        "id": "msg_123",
        "content": "Hello John!",
        "direction": "outbound",
        "created_at": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

### 3. Create Contact

**POST** `/api/contacts`

**Sample Request:**
```http
POST /api/contacts
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane.smith@example.com",
  "phone_number": "+1987654321",
  "tags": ["prospect"],
  "custom_fields": {
    "company": "Tech Solutions Inc",
    "source": "referral",
    "job_title": "CTO"
  },
  "board_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "firstname": "Jane",
    "lastname": "Smith",
    "email": "jane.smith@example.com",
    "phone_number": "+1987654321",
    "tags": ["prospect"],
    "custom_fields": {
      "company": "Tech Solutions Inc",
      "source": "referral",
      "job_title": "CTO"
    },
    "board_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2024-01-15T12:00:00Z",
    "updated_at": "2024-01-15T12:00:00Z"
  }
}
```

### 4. Update Contact

**PUT** `/api/contacts/{contact_id}`

**Sample Request:**
```http
PUT /api/contacts/550e8400-e29b-41d4-a716-446655440000
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "lastname": "Johnson",
  "email": "john.johnson@example.com",
  "tags": ["lead", "qualified", "hot"],
  "custom_fields": {
    "company": "Acme Corp",
    "source": "website",
    "annual_revenue": 75000,
    "last_contact_date": "2024-01-15"
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstname": "John",
    "lastname": "Johnson",
    "email": "john.johnson@example.com",
    "phone_number": "+1234567890",
    "tags": ["lead", "qualified", "hot"],
    "custom_fields": {
      "company": "Acme Corp",
      "source": "website",
      "annual_revenue": 75000,
      "last_contact_date": "2024-01-15"
    },
    "board_id": "550e8400-e29b-41d4-a716-446655440001",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T13:00:00Z"
  }
}
```

### 5. Delete Contact

**DELETE** `/api/contacts/{contact_id}`

**Sample Request:**
```http
DELETE /api/contacts/550e8400-e29b-41d4-a716-446655440000
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Contact deleted successfully"
}
```

### 6. Enhanced Contact Search

**POST** `/api/contacts/search`

**Sample Request:**
```http
POST /api/contacts/search
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "query": "john",
  "filters": {
    "tags": ["lead", "qualified"],
    "custom_fields": {
      "company": "Acme Corp"
    },
    "created_after": "2024-01-01",
    "created_before": "2024-12-31"
  },
  "sort": {
    "field": "created_at",
    "order": "desc"
  },
  "limit": 25,
  "offset": 0
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstname": "John",
      "lastname": "Doe",
      "email": "john.doe@example.com",
      "phone_number": "+1234567890",
      "tags": ["lead", "qualified"],
      "custom_fields": {
        "company": "Acme Corp",
        "source": "website"
      },
      "relevance_score": 0.95,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 25,
    "offset": 0,
    "hasMore": false
  }
}
```

### 7. Create Contact Without Phone

**POST** `/api/contacts/create-no-phone`

**Sample Request:**
```http
POST /api/contacts/create-no-phone
X-API-Key: crm_your_api_key_here
X-Workspace-Id: 12345678-1234-1234-1234-123456789012
Content-Type: application/json

{
  "firstname": "Alex",
  "lastname": "Wilson",
  "email": "alex.wilson@example.com",
  "tags": ["newsletter_subscriber"],
  "custom_fields": {
    "subscription_source": "landing_page",
    "interests": ["technology", "software"]
  }
}
```

**Sample Response:**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "firstname": "Alex",
    "lastname": "Wilson",
    "email": "alex.wilson@example.com",
    "phone_number": null,
    "tags": ["newsletter_subscriber"],
    "custom_fields": {
      "subscription_source": "landing_page",
      "interests": ["technology", "software"]
    },
    "created_at": "2024-01-15T14:00:00Z",
    "updated_at": "2024-01-15T14:00:00Z"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Email address is required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Contact not found"
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": "Contact with this email already exists"
}
```

## Field Validation

### Required Fields
- `firstname` or `lastname` (at least one required)
- `email` (must be valid email format)

### Optional Fields
- `phone_number` (must be in E.164 format: +1234567890)
- `tags` (array of strings)
- `custom_fields` (object with key-value pairs)
- `board_id` (must be valid UUID)

### Custom Fields
Custom fields can store any JSON-serializable data:
- Strings: `"company": "Acme Corp"`
- Numbers: `"annual_revenue": 50000`
- Booleans: `"is_active": true`
- Arrays: `"interests": ["tech", "business"]`
- Objects: `"address": {"city": "New York", "state": "NY"}`