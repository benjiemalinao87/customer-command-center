# Webhook Testing Guide

This document provides instructions and sample commands for testing the webhook implementation.

## Prerequisites

- A webhook configured in the UI with proper field mappings
- The webhook ID and workspace ID
- Access to the terminal or a tool like Postman

## Testing with curl

### 1. Test Webhook Processing

This command simulates an external system sending data to your webhook:

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "email": "john.smith@example.com",
    "phone": "+14155552671",
    "source": "Landing Page",
    "company": "Acme Corp",
    "message": "Interested in your services",
    "lastname": "Smith",
    "firstname": "John"
  }'
```

### 2. Test Webhook Simulation

This command tests the webhook mapping without creating a contact:

```bash
curl -X POST "https://cc.automate8.com/api/webhooks/YOUR_WEBHOOK_ID/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "payload": {
      "email": "john.smith@example.com",
      "phone": "+14155552671",
      "source": "Landing Page",
      "company": "Acme Corp",
      "message": "Interested in your services",
      "lastname": "Smith",
      "firstname": "John"
    }
  }'
```

### 3. Get Webhook Logs

This command retrieves the logs for a specific webhook:

```bash
curl -X GET "https://cc.automate8.com/api/webhooks/YOUR_WEBHOOK_ID/logs" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### 4. Update Field Mappings

This command updates the field mappings for a webhook:

```bash
curl -X PUT "https://cc.automate8.com/api/webhooks/YOUR_WEBHOOK_ID/mappings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "mappings": {
      "email": "email",
      "phone_number": "phone",
      "lead_source": "source",
      "city": "company",
      "state": "message",
      "lastname": "lastname",
      "firstname": "firstname"
    }
  }'
```

## Testing Different Payload Formats

### Nested JSON Structure

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "contact": {
      "personal": {
        "email": "john.smith@example.com",
        "phone": "+14155552671",
        "name": {
          "first": "John",
          "last": "Smith"
        }
      },
      "business": {
        "company": "Acme Corp",
        "source": "Landing Page"
      },
      "message": "Interested in your services"
    }
  }'
```

For this nested structure, your field mappings would be:
- `firstname`: `contact.personal.name.first`
- `lastname`: `contact.personal.name.last`
- `email`: `contact.personal.email`
- `phone_number`: `contact.personal.phone`
- `lead_source`: `contact.business.source`
- `city`: `contact.business.company`
- `state`: `contact.message`

### Array Structure

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "leads": [
      {
        "email": "john.smith@example.com",
        "phone": "+14155552671",
        "source": "Landing Page",
        "company": "Acme Corp",
        "message": "Interested in your services",
        "lastname": "Smith",
        "firstname": "John"
      }
    ]
  }'
```

For this array structure, your field mappings would be:
- `firstname`: `leads.0.firstname`
- `lastname`: `leads.0.lastname`
- `email`: `leads.0.email`
- `phone_number`: `leads.0.phone`
- `lead_source`: `leads.0.source`
- `city`: `leads.0.company`
- `state`: `leads.0.message`

## Testing Edge Cases

### Missing Required Fields

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "email": "john.smith@example.com",
    "source": "Landing Page",
    "company": "Acme Corp",
    "message": "Interested in your services"
  }'
```

This should return an error indicating missing required fields (phone_number, firstname, lastname).

### Invalid JSON

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "email": "john.smith@example.com",
    "phone": "+14155552671",
    "source": "Landing Page",
    "company": "Acme Corp",
    "message": "Interested in your services",
    "lastname": "Smith",
    "firstname": "John"
  '
```

This should return an error indicating invalid JSON format.

### Custom Fields

If you've created custom fields and mapped them, you can test them like this:

```bash
curl -X POST "https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -H "x-workspace-id: YOUR_WORKSPACE_ID" \
  -d '{
    "email": "john.smith@example.com",
    "phone": "+14155552671",
    "source": "Landing Page",
    "company": "Acme Corp",
    "message": "Interested in your services",
    "lastname": "Smith",
    "firstname": "John",
    "custom_field1": "Custom Value 1",
    "custom_field2": "Custom Value 2"
  }'
```

## Testing with the Node.js Script

We've also provided a Node.js script for testing the webhook implementation. To use it:

1. Navigate to the test directory:
```bash
cd test
```

2. Install dependencies:
```bash
npm install
```

3. Update the configuration in test_webhook.js:
```javascript
const config = {
  webhookUrl: 'https://cc.automate8.com/webhooks/YOUR_WEBHOOK_ID',
  workspaceId: 'YOUR_WORKSPACE_ID',
  apiToken: 'YOUR_API_TOKEN',
  testUrl: 'https://cc.automate8.com/api/webhooks/YOUR_WEBHOOK_ID/test',
  logsUrl: 'https://cc.automate8.com/api/webhooks/YOUR_WEBHOOK_ID/logs'
};
```

4. Run the script:
```bash
node test_webhook.js
```

## Verifying Results

After sending a webhook request, you can verify the results in several ways:

1. **Check the Response**: The webhook endpoint should return a JSON response with a success message and the contact ID.

2. **Check the Logs**: Use the logs endpoint to see the webhook execution details, including the payload, result, and any errors.

3. **Check the Contact**: Verify that a contact was created or updated with the correct field values.

4. **Check Custom Fields**: If you mapped custom fields, verify that they appear in the contact's metadata.

## Troubleshooting

If you encounter issues when testing webhooks, check the following:

1. **Webhook ID and Workspace ID**: Ensure you're using the correct IDs in your requests.

2. **Field Mappings**: Verify that your field mappings match the structure of your JSON payload.

3. **Required Fields**: Ensure all required fields (firstname, lastname, phone_number) are included in your payload or mapped correctly.

4. **JSON Format**: Ensure your JSON payload is properly formatted.

5. **Authorization**: For API endpoints, ensure your authorization token is valid.

6. **Logs**: Check the webhook logs for detailed error messages.

7. **Railway Deployment**: Ensure that your changes have been deployed successfully to Railway. You can check the deployment status at https://railway.app/dashboard.

## Next Steps

After successfully testing your webhook implementation, consider:

1. Setting up automated tests for your webhooks
2. Creating webhook templates for common services
3. Implementing rate limiting to prevent abuse
4. Adding retry mechanisms for failed webhook calls
5. Enhancing the webhook UI with additional features 