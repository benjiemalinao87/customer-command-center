# Email Implementation Plan with Resend

## Overview
This document outlines a plan for implementing Resend email API with the existing LiveChat email functionality, following our CRM's architecture and development guidelines. The implementation will support multi-tenant workspaces with proper data isolation, including email scheduling capabilities.

## Implementation Summary

We have successfully implemented an email system with the following components:

### 1. Database Schema
- Created `email_activities` table to track all sent and scheduled emails
- Created `workspace_email_config` table for workspace-specific email settings
- Created `email_templates` table for reusable email templates
- Added proper indexes for performance optimization
- Ensured compatibility with existing workspace and contact data structures

### 2. Backend Services
- Implemented `emailService.js` for handling email operations with Resend
- Created REST API endpoints for sending emails and retrieving email history
- Added proper error handling and logging
- Integrated with the multi-tenant workspace system
- Added support for email scheduling using Resend's scheduledAt feature

### 3. Frontend Integration
- Updated LiveChat component to send emails through the API
- Added email history display in UserDetails component
- Implemented email composition UI with subject and body fields
- Added proper error handling and success notifications

### 4. Deployment Preparation
- Updated package.json to include Resend dependency
- Created deployment script for database setup
- Used ES modules syntax to ensure compatibility with existing codebase
- Prepared idempotent database creation scripts with IF NOT EXISTS

### 5. Multi-tenant Support
- Implemented proper workspace isolation for all email operations
- Added workspace-specific configuration for email settings
- Ensured data privacy between different workspaces

## Database Schema Design (First Priority)

Based on the existing schema analysis, we need to create the following tables:

### Email Activities Table
```sql
-- Create email_activities table
CREATE TABLE email_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) NOT NULL,
    contact_id UUID REFERENCES contacts(id) NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    message_id TEXT,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add necessary indexes
CREATE INDEX idx_email_activities_workspace_id ON email_activities(workspace_id);
CREATE INDEX idx_email_activities_contact_id ON email_activities(contact_id);
CREATE INDEX idx_email_activities_status ON email_activities(status);
CREATE INDEX idx_email_activities_scheduled_for ON email_activities(scheduled_for);
```

### Workspace Email Config Table
```sql
-- Create workspace_email_config table
CREATE TABLE workspace_email_config (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id),
    from_email TEXT NOT NULL,
    from_name TEXT,
    reply_to TEXT,
    resend_api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for quick lookups
CREATE INDEX idx_workspace_email_config_is_active ON workspace_email_config(is_active);
```

### Email Templates Table
```sql
-- Create email_templates table
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID REFERENCES workspaces(id) NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Add index for quick lookups
CREATE INDEX idx_email_templates_workspace_id ON email_templates(workspace_id);
CREATE INDEX idx_email_templates_is_active ON email_templates(is_active);
```

## Integration Points

### 1. LiveChat Integration
```javascript
// backend/src/services/emailService.js
const { createClient } = require('@supabase/supabase-js')
const { Resend } = require('resend')

class EmailService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    this.resend = null // Will be initialized per workspace
  }

  async getWorkspaceConfig(workspaceId) {
    const { data, error } = await this.supabase
      .from('workspace_email_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single()

    if (error) throw new Error(`Failed to get workspace email config: ${error.message}`)
    if (!data) throw new Error(`No email configuration found for workspace: ${workspaceId}`)
    
    return data
  }

  async initResend(workspaceId) {
    const config = await this.getWorkspaceConfig(workspaceId)
    this.resend = new Resend(config.resend_api_key)
    return config
  }

  async sendFromChat(workspaceId, contactId, emailData) {
    const config = await this.initResend(workspaceId)

    // Get contact email
    const { data: contact, error: contactError } = await this.supabase
      .from('contacts')
      .select('email, name')
      .eq('id', contactId)
      .single()

    if (contactError) throw new Error(`Failed to get contact: ${contactError.message}`)
    if (!contact.email) throw new Error(`Contact does not have an email address`)

    // Send email
    const { data, error } = await this.resend.emails.send({
      from: `${config.from_name || 'CRM'} <${config.from_email}>`,
      to: [contact.email],
      subject: emailData.subject,
      html: emailData.content,
      reply_to: config.reply_to || config.from_email,
      scheduledAt: emailData.scheduledFor
    })

    if (error) throw new Error(`Failed to send email: ${error.message}`)

    // Record in email_activities
    const { data: activity, error: activityError } = await this.supabase
      .from('email_activities')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        subject: emailData.subject,
        content: emailData.content,
        status: emailData.scheduledFor ? 'scheduled' : 'sent',
        message_id: data.id,
        from_email: config.from_email,
        to_email: contact.email,
        scheduled_for: emailData.scheduledFor || null,
        sent_at: emailData.scheduledFor ? null : new Date().toISOString()
      })
      .select('id')
      .single()

    if (activityError) {
      console.error(`Failed to record email activity: ${activityError.message}`)
    }

    return {
      id: data.id,
      activityId: activity?.id
    }
  }
}

module.exports = new EmailService()
```

### 2. Email REST API Endpoints
```javascript
// backend/src/routes/email.js
const express = require('express')
const router = express.Router()
const emailService = require('../services/emailService')
const { workspaceAuth } = require('../middleware/auth')

// Send email endpoint
router.post('/send', workspaceAuth, async (req, res) => {
  try {
    const { workspaceId } = req.workspace
    const { contactId, subject, content, scheduledFor } = req.body

    if (!contactId || !subject || !content) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const result = await emailService.sendFromChat(workspaceId, contactId, {
      subject,
      content,
      scheduledFor
    })

    res.json(result)
  } catch (error) {
    console.error('Error sending email:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get email history for a contact
router.get('/history/:contactId', workspaceAuth, async (req, res) => {
  try {
    const { workspaceId } = req.workspace
    const { contactId } = req.params
    const { page = 0, size = 10 } = req.query

    const { data, error, count } = await emailService.getEmailHistory(
      workspaceId,
      contactId,
      { page: parseInt(page), size: parseInt(size) }
    )

    if (error) throw new Error(error.message)

    res.json({
      data,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total: count
      }
    })
  } catch (error) {
    console.error('Error getting email history:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
```

## Implementation Steps

### 1. Database Setup
- Create required tables in Supabase:
  - `email_activities`
  - `workspace_email_config`
  - `email_templates`
- Add necessary indexes

### 2. Backend Implementation
- Create email service:
  - `emailService.js` with Resend integration
  - Email sending functionality
  - Email history/tracking
  - Workspace isolation
- Create API routes:
  - Email sending endpoint
  - Email history endpoint
  - Email template endpoints
- Update Express backend:
  - Register routes
  - Add middleware
  - Error handling

### 3. LiveChat Integration
- Update LiveChat component to use email service:
  - Implement email composition UI
  - Add scheduling UI
  - Show email history
  - Error handling

### 4. Testing
- Test with Resend test API keys
- Verify email sending works with scheduling
- Verify emails are tracked in database
- Test workspace isolation

### 5. Deployment
- Deploy SQL migrations
- Update backend with new code
- Configure environment variables on Railway

## Success Criteria
- Emails can be sent from LiveChat
- Emails can be scheduled
- Email history is tracked per contact
- Proper workspace isolation

## Future Enhancements
- Email templates system
- Rich text editor
- Email analytics
- Bulk sending
- Recurring emails

## Resources
- [Resend Documentation](https://resend.com/docs)
- [Express Integration Guide](https://resend.com/docs/send-with-express)
- [Resend API Reference](https://resend.com/docs/api-reference)
- [Resend Scheduling Documentation](https://resend.com/docs/dashboard/emails/schedule-email) 