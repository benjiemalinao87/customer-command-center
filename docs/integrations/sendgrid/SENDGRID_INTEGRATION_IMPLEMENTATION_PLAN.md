# SendGrid Integration - Implementation Plan

## Executive Summary

This document outlines a comprehensive, modular, and reusable implementation plan for integrating SendGrid with the existing email system. The integration will coexist with the current Resend-based email implementation, allowing workspaces to choose their preferred email provider.

**Key Objectives:**
- ✅ Modular and reusable architecture
- ✅ Coexistence with existing Resend integration
- ✅ Support for custom domains
- ✅ Inbound and outbound email functionality
- ✅ Event tracking and webhooks
- ✅ Follows existing codebase patterns (Twilio integration as reference)

---

## 1. Analysis of Existing Architecture

### 1.1 Current Email System (Resend)

**Locations:**
- **Backend Service:** `/backend/src/services/emailService.js`
- **Backend Routes:** `/backend/src/routes/email.js`
- **Database Config:** `workspace_email_config` table

**Current Implementation Pattern:**
```javascript
// Per-workspace configuration stored in workspace_email_config
{
  workspace_id: text,
  from_email: text,
  from_name: text,
  reply_to: text,
  resend_api_key: text,  // Provider-specific field
  is_active: boolean
}
```

**Key Features:**
- ✅ Workspace-scoped configuration
- ✅ Send email via `/api/email/send`
- ✅ Email history tracking
- ✅ Saves to both `livechat_messages` and `email_messages` tables
- ✅ Support for attachments (fetched from URLs)
- ✅ Scheduled email support

### 1.2 Integration Pattern Reference (Twilio)

**Database Structure:**
```sql
-- workspace_twilio_config table
{
  id: uuid,
  workspace_id: text,
  account_sid: text,          -- Provider credentials
  auth_token: text,           -- Provider credentials
  webhook_url: text,
  webhook_type: text,
  is_configured: boolean,
  api_key_sid: text,          -- Additional credentials
  api_key_secret: text,
  twiml_app_sid: text
}
```

**Frontend Components:**
- `/frontend/src/components/settings/IntegrationsDashboard.js` - Main integration UI
- `/frontend/src/components/settings/TwilioConfigCard.js` - Configuration card component
- `/frontend/src/config/integrationsConfig.js` - Integration metadata

**Backend Routes:**
- Phone number sync
- Webhook configuration
- Connection testing

### 1.3 Database Schema Analysis

**Existing Email Tables:**
- ✅ `email_accounts` - Email account configurations (SMTP/IMAP/OAuth)
- ✅ `email_messages` - Individual email messages
- ✅ `email_folders` - Folder organization
- ✅ `email_threads` - Conversation threading
- ✅ `email_attachments` - Attachment storage
- ✅ `email_templates` - Reusable templates
- ✅ `email_signatures` - Email signatures
- ✅ `workspace_email_config` - Current provider configuration

**Integration Tables:**
- ✅ `workspace_integrations` - Generic integration catalog
- ✅ `integration_logs` - Integration activity logs
- ✅ `integration_usage_stats` - Usage analytics

---

## 2. SendGrid Integration Architecture

### 2.1 Design Principles

1. **Provider Abstraction:** Abstract email provider interface to support multiple providers
2. **Backward Compatibility:** Existing Resend functionality remains unchanged
3. **Workspace Choice:** Workspaces can select their preferred email provider
4. **Modular Components:** Reusable components for future integrations
5. **Security First:** API keys encrypted, webhook verification

### 2.2 Database Schema Design

#### Option A: Extend Existing Table (Recommended for MVP)

**Modify `workspace_email_config` table:**
```sql
ALTER TABLE workspace_email_config
ADD COLUMN provider VARCHAR(50) DEFAULT 'resend',
ADD COLUMN sendgrid_api_key TEXT,
ADD COLUMN sendgrid_domain TEXT,
ADD COLUMN sendgrid_verified_domain BOOLEAN DEFAULT false,
ADD COLUMN provider_config JSONB DEFAULT '{}'::jsonb;

-- Provider can be: 'resend', 'sendgrid', 'smtp', etc.
-- provider_config stores provider-specific settings as JSON
```

**Pros:**
- ✅ Minimal schema changes
- ✅ Easy migration path
- ✅ Single source of truth per workspace
- ✅ Quick implementation

**Cons:**
- ⚠️ Table grows with each provider
- ⚠️ Less flexible for complex provider settings

#### Option B: Dedicated Integration Table (Recommended for Scale)

**Create new table:**
```sql
CREATE TABLE workspace_sendgrid_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- SendGrid Credentials
    api_key TEXT NOT NULL,

    -- Domain Configuration
    verified_domain TEXT,
    is_domain_verified BOOLEAN DEFAULT false,
    domain_verified_at TIMESTAMP WITH TIME ZONE,

    -- Sender Configuration
    from_email TEXT NOT NULL,
    from_name TEXT,
    reply_to TEXT,

    -- Inbound Parse Configuration
    inbound_parse_enabled BOOLEAN DEFAULT false,
    inbound_parse_hostname TEXT, -- e.g., parse.customdomain.com
    inbound_parse_url TEXT,      -- Webhook URL for inbound emails
    inbound_parse_spam_check BOOLEAN DEFAULT true,

    -- Event Webhook Configuration
    event_webhook_enabled BOOLEAN DEFAULT false,
    event_webhook_url TEXT,
    event_webhook_signing_key TEXT,
    tracked_events JSONB DEFAULT '[]'::jsonb, -- ['delivered', 'opened', 'clicked', etc.]

    -- Status
    is_configured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    last_test_at TIMESTAMP WITH TIME ZONE,
    last_test_status VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    UNIQUE(workspace_id),
    CHECK (from_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_sendgrid_config_workspace ON workspace_sendgrid_config(workspace_id);
CREATE INDEX idx_sendgrid_config_active ON workspace_sendgrid_config(is_active) WHERE is_active = true;
```

**Update `workspace_email_config`:**
```sql
ALTER TABLE workspace_email_config
ADD COLUMN active_provider VARCHAR(50) DEFAULT 'resend',
ADD COLUMN CHECK (active_provider IN ('resend', 'sendgrid', 'smtp', 'gmail', 'outlook'));
```

**Pros:**
- ✅ Clean separation of concerns
- ✅ Follows Twilio pattern
- ✅ Easy to add provider-specific fields
- ✅ Better data modeling
- ✅ Easier to maintain

**Cons:**
- ⚠️ More tables to manage
- ⚠️ Slightly more complex queries

**RECOMMENDED:** Option B for long-term scalability

### 2.3 SendGrid Events Tracking Table

```sql
CREATE TABLE sendgrid_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(50) NOT NULL, -- 'processed', 'delivered', 'open', 'click', 'bounce', etc.
    email_id UUID REFERENCES email_messages(id) ON DELETE SET NULL,
    message_id TEXT, -- SendGrid message ID

    -- Event Data
    email_address TEXT,
    timestamp TIMESTAMP WITH TIME ZONE,
    smtp_id TEXT,

    -- Event-Specific Data
    event_payload JSONB, -- Full event data from SendGrid

    -- Processing
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes
    CHECK (event_type IN ('processed', 'dropped', 'delivered', 'bounce', 'deferred', 'open', 'click', 'spam_report', 'unsubscribe', 'group_unsubscribe', 'group_resubscribe'))
);

CREATE INDEX idx_sendgrid_events_workspace ON sendgrid_events(workspace_id, created_at DESC);
CREATE INDEX idx_sendgrid_events_email ON sendgrid_events(email_id);
CREATE INDEX idx_sendgrid_events_type ON sendgrid_events(event_type);
CREATE INDEX idx_sendgrid_events_unprocessed ON sendgrid_events(processed) WHERE processed = false;
```

---

## 3. Backend Implementation

### 3.1 Email Service Abstraction

**Create Provider Interface:**

```javascript
// /backend/src/services/email/EmailProvider.js (NEW)
/**
 * Abstract Email Provider Interface
 * All email providers must implement this interface
 */
class EmailProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Send an email
   * @param {Object} emailData - Email data (to, from, subject, content, etc.)
   * @returns {Promise<Object>} - Send result with message ID
   */
  async send(emailData) {
    throw new Error('send() must be implemented by provider');
  }

  /**
   * Test connection/credentials
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by provider');
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by provider');
  }

  /**
   * Verify webhook signature (if applicable)
   * @param {Object} payload
   * @param {string} signature
   * @returns {boolean}
   */
  verifyWebhookSignature(payload, signature) {
    return true; // Default: no verification
  }
}

module.exports = EmailProvider;
```

**Resend Provider Implementation:**

```javascript
// /backend/src/services/email/ResendProvider.js (NEW - refactor from existing)
const { Resend } = require('resend');
const EmailProvider = require('./EmailProvider');

class ResendProvider extends EmailProvider {
  constructor(config) {
    super(config);
    this.client = new Resend(config.resend_api_key || config.api_key);
  }

  async send(emailData) {
    const emailOptions = {
      from: `${emailData.from_name || 'LiveChat'} <${emailData.from_email}>`,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.content || emailData.html,
      reply_to: emailData.reply_to,
      scheduledAt: emailData.scheduledFor,
      attachments: emailData.attachments
    };

    const { data, error } = await this.client.emails.send(emailOptions);

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return {
      messageId: data?.id || `resend_${Date.now()}`,
      provider: 'resend',
      success: true
    };
  }

  async testConnection() {
    try {
      // Resend doesn't have a dedicated test endpoint,
      // so we'll just verify the client is initialized
      return !!this.client;
    } catch (error) {
      return false;
    }
  }

  getProviderName() {
    return 'resend';
  }
}

module.exports = ResendProvider;
```

**SendGrid Provider Implementation:**

```javascript
// /backend/src/services/email/SendGridProvider.js (NEW)
const sgMail = require('@sendgrid/mail');
const EmailProvider = require('./EmailProvider');
const crypto = require('crypto');

class SendGridProvider extends EmailProvider {
  constructor(config) {
    super(config);
    sgMail.setApiKey(config.sendgrid_api_key || config.api_key);
    this.client = sgMail;
  }

  async send(emailData) {
    const msg = {
      from: {
        email: emailData.from_email,
        name: emailData.from_name || 'LiveChat'
      },
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.content || emailData.html,
      text: emailData.text,
      replyTo: emailData.reply_to,
      attachments: this._formatAttachments(emailData.attachments),

      // SendGrid-specific features
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      },
      customArgs: {
        workspace_id: emailData.workspace_id,
        contact_id: emailData.contact_id
      }
    };

    // Handle scheduled send
    if (emailData.scheduledFor) {
      msg.sendAt = Math.floor(new Date(emailData.scheduledFor).getTime() / 1000);
    }

    const [response] = await this.client.send(msg);

    return {
      messageId: response.headers['x-message-id'] || `sendgrid_${Date.now()}`,
      provider: 'sendgrid',
      success: response.statusCode >= 200 && response.statusCode < 300,
      statusCode: response.statusCode
    };
  }

  async testConnection() {
    try {
      // Test by sending a validation request to SendGrid API
      const request = {
        url: '/v3/user/username',
        method: 'GET',
      };
      await this.client.request(request);
      return true;
    } catch (error) {
      console.error('SendGrid connection test failed:', error);
      return false;
    }
  }

  getProviderName() {
    return 'sendgrid';
  }

  /**
   * Verify SendGrid webhook signature
   * @see https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook#verify-event-webhook-signature
   */
  verifyWebhookSignature(payload, signature, timestamp, publicKey) {
    const timestampPayload = timestamp + JSON.stringify(payload);
    const expectedSignature = crypto
      .createHmac('sha256', publicKey)
      .update(timestampPayload)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Format attachments for SendGrid
   */
  _formatAttachments(attachments) {
    if (!attachments || !Array.isArray(attachments)) return [];

    return attachments.map(att => ({
      content: att.content.toString('base64'),
      filename: att.filename,
      type: att.contentType || att.type,
      disposition: att.disposition || 'attachment'
    }));
  }
}

module.exports = SendGridProvider;
```

**Provider Factory:**

```javascript
// /backend/src/services/email/EmailProviderFactory.js (NEW)
const ResendProvider = require('./ResendProvider');
const SendGridProvider = require('./SendGridProvider');

class EmailProviderFactory {
  /**
   * Create email provider instance based on configuration
   * @param {string} provider - Provider name ('resend', 'sendgrid')
   * @param {Object} config - Provider configuration
   * @returns {EmailProvider}
   */
  static createProvider(provider, config) {
    switch (provider.toLowerCase()) {
      case 'resend':
        return new ResendProvider(config);

      case 'sendgrid':
        return new SendGridProvider(config);

      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }
}

module.exports = EmailProviderFactory;
```

### 3.2 Refactored Email Service

```javascript
// /backend/src/services/emailService.js (REFACTOR)
const { createClient } = require('@supabase/supabase-js');
const EmailProviderFactory = require('./email/EmailProviderFactory');

class EmailService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.provider = null;
  }

  /**
   * Get workspace email configuration
   * Supports both Resend and SendGrid
   */
  async getWorkspaceConfig(workspaceId) {
    try {
      // Get the active provider configuration
      const { data: emailConfig, error } = await this.supabase
        .from('workspace_email_config')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single();

      if (error && error.code === 'PGRST116') {
        return this.createDefaultConfig(workspaceId);
      }

      // Get provider-specific config if using SendGrid
      if (emailConfig.active_provider === 'sendgrid') {
        const { data: sendgridConfig } = await this.supabase
          .from('workspace_sendgrid_config')
          .select('*')
          .eq('workspace_id', workspaceId)
          .single();

        return {
          ...emailConfig,
          ...sendgridConfig,
          provider: 'sendgrid'
        };
      }

      return {
        ...emailConfig,
        provider: emailConfig.active_provider || 'resend'
      };
    } catch (error) {
      console.error(`Error in getWorkspaceConfig: ${error.message}`);
      // Return default Resend config
      return this.createDefaultConfig(workspaceId);
    }
  }

  /**
   * Initialize email provider for workspace
   */
  async initProvider(workspaceId) {
    const config = await this.getWorkspaceConfig(workspaceId);
    this.provider = EmailProviderFactory.createProvider(config.provider, config);
    return config;
  }

  /**
   * Send email from chat
   */
  async sendFromChat(workspaceId, contactId, emailData) {
    try {
      console.log(`📧 Sending email for workspace ${workspaceId}, contact ${contactId}`);

      const config = await this.initProvider(workspaceId);

      // Get contact email
      const { data: contact } = await this.supabase
        .from('contacts')
        .select('email, name')
        .eq('id', contactId)
        .single();

      if (!contact?.email) {
        throw new Error('Contact does not have an email address');
      }

      // Prepare email data
      const emailPayload = {
        to: [contact.email],
        from_email: config.from_email,
        from_name: config.from_name,
        reply_to: config.reply_to || config.from_email,
        subject: emailData.subject,
        content: emailData.content,
        html: emailData.content,
        scheduledFor: emailData.scheduledFor,
        attachments: emailData.attachments,
        workspace_id: workspaceId,
        contact_id: contactId
      };

      // Send via provider
      const result = await this.provider.send(emailPayload);

      // Save to database (both tables)
      await this._saveEmailToDatabase(workspaceId, contactId, emailData, config, result);

      return {
        ...result,
        contact_email: contact.email
      };
    } catch (error) {
      console.error(`Error in sendFromChat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save email to database tables
   */
  async _saveEmailToDatabase(workspaceId, contactId, emailData, config, sendResult) {
    // Save to livechat_messages
    const { data: message } = await this.supabase
      .from('livechat_messages')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        sender: config.from_email,
        subject: emailData.subject,
        body: emailData.content,
        msg_type: 'EMAIL',
        message_type: 'email',
        direction: 'outbound',
        status: emailData.scheduledFor ? 'scheduled' : 'sent',
        is_read: true,
        metadata: {
          message_id: sendResult.messageId,
          provider: sendResult.provider,
          scheduled_for: emailData.scheduledFor,
          sent_at: emailData.scheduledFor ? null : new Date().toISOString(),
          attachments: emailData.attachments || []
        }
      })
      .select('id')
      .single();

    // Save to email_messages
    const { data: emailMessage } = await this.supabase
      .from('email_messages')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        subject: emailData.subject,
        body_html: emailData.content,
        sender_name: config.from_name,
        sender_email: config.from_email,
        to_recipients: [contact.email],
        folder: 'sent',
        is_read: true,
        is_outgoing: true,
        message_id_header: sendResult.messageId,
        sent_at: emailData.scheduledFor ? null : new Date().toISOString(),
        metadata: {
          provider: sendResult.provider
        }
      })
      .select('id')
      .single();

    return { message_id: message?.id, email_message_id: emailMessage?.id };
  }

  /**
   * Test provider connection
   */
  async testConnection(provider, config) {
    const emailProvider = EmailProviderFactory.createProvider(provider, config);
    return await emailProvider.testConnection();
  }
}

module.exports = new EmailService();
```

### 3.3 SendGrid-Specific Routes

```javascript
// /backend/src/routes/sendgrid.js (NEW)
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');
const SendGridProvider = require('../services/email/SendGridProvider');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Middleware for workspace authentication
const workspaceAuth = (req, res, next) => {
  const workspaceId = req.headers['x-workspace-id'] || req.query.workspace_id || req.body?.workspaceId;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID required' });
  }
  req.workspace = { workspaceId };
  next();
};

/**
 * POST /api/sendgrid/config
 * Save SendGrid configuration for workspace
 */
router.post('/config', workspaceAuth, async (req, res) => {
  try {
    const { workspaceId } = req.workspace;
    const {
      api_key,
      from_email,
      from_name,
      reply_to,
      verified_domain
    } = req.body;

    if (!api_key || !from_email) {
      return res.status(400).json({ error: 'API key and from_email are required' });
    }

    // Test the API key first
    sgMail.setApiKey(api_key);
    try {
      await sgMail.request({
        url: '/v3/user/username',
        method: 'GET',
      });
    } catch (testError) {
      return res.status(400).json({
        error: 'Invalid SendGrid API key',
        details: testError.message
      });
    }

    // Save configuration
    const { data, error } = await supabase
      .from('workspace_sendgrid_config')
      .upsert({
        workspace_id: workspaceId,
        api_key,
        from_email,
        from_name,
        reply_to,
        verified_domain,
        is_configured: true,
        last_test_at: new Date().toISOString(),
        last_test_status: 'success'
      })
      .select()
      .single();

    if (error) throw error;

    // Update active provider in workspace_email_config
    await supabase
      .from('workspace_email_config')
      .upsert({
        workspace_id: workspaceId,
        active_provider: 'sendgrid',
        from_email,
        from_name,
        reply_to,
        is_active: true
      });

    res.json({
      success: true,
      data,
      message: 'SendGrid configured successfully'
    });
  } catch (error) {
    console.error('Error configuring SendGrid:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sendgrid/config
 * Get SendGrid configuration for workspace
 */
router.get('/config', workspaceAuth, async (req, res) => {
  try {
    const { workspaceId } = req.workspace;

    const { data, error } = await supabase
      .from('workspace_sendgrid_config')
      .select('*')
      .eq('workspace_id', workspaceId)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.json({ configured: false });
    }

    if (error) throw error;

    // Don't send API key to frontend
    const { api_key, ...safeData } = data;

    res.json({
      configured: true,
      data: {
        ...safeData,
        api_key: api_key ? '••••••••' : null
      }
    });
  } catch (error) {
    console.error('Error getting SendGrid config:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sendgrid/test-connection
 * Test SendGrid API connection
 */
router.post('/test-connection', workspaceAuth, async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.status(400).json({ error: 'API key required' });
    }

    sgMail.setApiKey(api_key);
    await sgMail.request({
      url: '/v3/user/username',
      method: 'GET',
    });

    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Connection failed',
      details: error.message
    });
  }
});

/**
 * POST /api/sendgrid/webhook/inbound
 * Handle inbound emails from SendGrid Inbound Parse
 */
router.post('/webhook/inbound/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;

    console.log('📨 SendGrid inbound webhook received:', workspaceId);

    const {
      from,      // Sender email
      to,        // Recipient email
      subject,
      text,      // Plain text body
      html,      // HTML body
      attachments, // Number of attachments
      'attachment-info': attachmentInfo,
      headers,
      envelope
    } = req.body;

    // Parse sender info
    const fromEmail = from;
    const fromName = envelope?.from || fromEmail;

    // Find or create contact
    let { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', fromEmail)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!contact) {
      console.warn(`Email from unknown sender: ${fromEmail}`);
      // Could auto-create contact here or reject
      return res.status(400).json({
        error: 'Sender not found as contact'
      });
    }

    // Save to email_messages
    const { data: emailMessage, error } = await supabase
      .from('email_messages')
      .insert({
        workspace_id: workspaceId,
        contact_id: contact.id,
        subject: subject || '(No Subject)',
        body_html: html || text,
        body_text: text,
        sender_name: fromName,
        sender_email: fromEmail,
        to_recipients: [to],
        folder: 'inbox',
        is_read: false,
        is_outgoing: false,
        received_at: new Date().toISOString(),
        metadata: {
          provider: 'sendgrid',
          attachments: attachmentInfo ? JSON.parse(attachmentInfo) : [],
          headers: headers ? JSON.parse(headers) : {}
        }
      })
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Inbound email saved:', emailMessage.id);

    res.status(200).json({
      success: true,
      message_id: emailMessage.id
    });
  } catch (error) {
    console.error('❌ Error processing inbound email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sendgrid/webhook/events
 * Handle SendGrid event webhooks
 */
router.post('/webhook/events/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const events = Array.isArray(req.body) ? req.body : [req.body];

    console.log(`📊 SendGrid events received: ${events.length} events`);

    // Get webhook signing key for verification
    const { data: config } = await supabase
      .from('workspace_sendgrid_config')
      .select('event_webhook_signing_key')
      .eq('workspace_id', workspaceId)
      .single();

    // Verify signature if configured
    if (config?.event_webhook_signing_key) {
      const signature = req.headers['x-twilio-email-event-webhook-signature'];
      const timestamp = req.headers['x-twilio-email-event-webhook-timestamp'];

      const provider = new SendGridProvider(config);
      const isValid = provider.verifyWebhookSignature(
        req.body,
        signature,
        timestamp,
        config.event_webhook_signing_key
      );

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    // Process each event
    for (const event of events) {
      await supabase.from('sendgrid_events').insert({
        workspace_id: workspaceId,
        event_type: event.event,
        email_address: event.email,
        timestamp: new Date(event.timestamp * 1000).toISOString(),
        message_id: event.sg_message_id,
        smtp_id: event.smtp_id,
        event_payload: event,
        processed: false
      });

      // Update email_messages status if applicable
      if (event.sg_message_id) {
        const updateData = {};

        switch (event.event) {
          case 'delivered':
            updateData.delivery_status = 'delivered';
            break;
          case 'bounce':
          case 'dropped':
            updateData.delivery_status = 'failed';
            break;
          case 'open':
            updateData.is_read = true;
            break;
        }

        if (Object.keys(updateData).length > 0) {
          await supabase
            .from('email_messages')
            .update(updateData)
            .eq('message_id_header', event.sg_message_id);
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('❌ Error processing events:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sendgrid/config
 * Remove SendGrid configuration
 */
router.delete('/config', workspaceAuth, async (req, res) => {
  try {
    const { workspaceId } = req.workspace;

    await supabase
      .from('workspace_sendgrid_config')
      .delete()
      .eq('workspace_id', workspaceId);

    // Reset to Resend as default
    await supabase
      .from('workspace_email_config')
      .update({ active_provider: 'resend' })
      .eq('workspace_id', workspaceId);

    res.json({ success: true, message: 'SendGrid configuration removed' });
  } catch (error) {
    console.error('Error removing SendGrid config:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 4. Frontend Implementation

### 4.1 Update Integration Configuration

```javascript
// /frontend/src/config/integrationsConfig.js (UPDATE)

// Add to INTEGRATIONS array in Marketing & Email category
{
  key: 'sendgrid',
  name: 'SendGrid',
  category: 'marketing',
  icon: Mail,
  iconColor: '#1A82E2',
  description: 'Email delivery and marketing platform by Twilio',
  longDescription: 'Enterprise email delivery service with custom domain support, inbound email parsing, and comprehensive event tracking.',
  status: 'available',
  configureLabel: 'Connect',
  features: [
    'Custom domain sending',
    'Inbound email parsing',
    'Email event tracking',
    'Template management',
    'Advanced analytics'
  ],
  setupComplexity: 'medium',
  requiresAuth: true,
  authType: 'api_key',
  documentationUrl: 'https://www.twilio.com/docs/sendgrid',
  isPremium: false
}
```

### 4.2 SendGrid Configuration Component

```javascript
// /frontend/src/components/settings/SendGridConfigCard.js (NEW)
import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Switch,
  Badge,
  Alert,
  AlertIcon,
  Code,
  Divider,
  useToast
} from '@chakra-ui/react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function SendGridConfigCard({ workspaceId }) {
  const [config, setConfig] = useState({
    api_key: '',
    from_email: '',
    from_name: '',
    reply_to: '',
    verified_domain: ''
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadConfig();
  }, [workspaceId]);

  const loadConfig = async () => {
    try {
      const response = await fetch(`/api/sendgrid/config`, {
        headers: { 'x-workspace-id': workspaceId }
      });
      const data = await response.json();

      if (data.configured) {
        setConfig(data.data);
        setIsConfigured(true);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!config.api_key) {
      toast({
        title: 'API Key Required',
        description: 'Please enter your SendGrid API key',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch('/api/sendgrid/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify({ api_key: config.api_key })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Connection Successful',
          description: 'SendGrid API key is valid',
          status: 'success',
          duration: 3000
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: data.details || 'Invalid API key',
          status: 'error',
          duration: 5000
        });
      }
    } catch (error) {
      toast({
        title: 'Connection Error',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.api_key || !config.from_email) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in API key and from email',
        status: 'warning',
        duration: 3000
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/sendgrid/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': workspaceId
        },
        body: JSON.stringify(config)
      });

      const data = await response.json();

      if (data.success) {
        setIsConfigured(true);
        toast({
          title: 'Configuration Saved',
          description: 'SendGrid is now your active email provider',
          status: 'success',
          duration: 3000
        });
      } else {
        toast({
          title: 'Save Failed',
          description: data.error || 'Failed to save configuration',
          status: 'error',
          duration: 5000
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Remove SendGrid configuration? Email provider will revert to Resend.')) {
      return;
    }

    setIsLoading(true);
    try {
      await fetch('/api/sendgrid/config', {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId }
      });

      setConfig({
        api_key: '',
        from_email: '',
        from_name: '',
        reply_to: '',
        verified_domain: ''
      });
      setIsConfigured(false);

      toast({
        title: 'Configuration Removed',
        description: 'Reverted to Resend as email provider',
        status: 'info',
        duration: 3000
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        status: 'error',
        duration: 5000
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      bg="white"
      borderRadius="lg"
      boxShadow="md"
      p={6}
      borderWidth={1}
      _dark={{ bg: 'gray.800', borderColor: 'gray.700' }}
    >
      <VStack spacing={6} align="stretch">
        {isConfigured && (
          <Alert status="success" borderRadius="md">
            <AlertIcon as={CheckCircle} />
            <Text>SendGrid is configured and active</Text>
          </Alert>
        )}

        {/* API Key */}
        <FormControl isRequired>
          <FormLabel>SendGrid API Key</FormLabel>
          <Input
            type="password"
            placeholder="SG.xxxxxxxxxxxx"
            value={config.api_key}
            onChange={(e) => setConfig({ ...config, api_key: e.target.value })}
          />
          <FormHelperText>
            Get your API key from SendGrid Dashboard → Settings → API Keys
          </FormHelperText>
        </FormControl>

        <HStack>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTestConnection}
            isLoading={isTesting}
            loadingText="Testing..."
          >
            Test Connection
          </Button>
        </HStack>

        <Divider />

        {/* Sender Configuration */}
        <FormControl isRequired>
          <FormLabel>From Email</FormLabel>
          <Input
            type="email"
            placeholder="noreply@yourdomain.com"
            value={config.from_email}
            onChange={(e) => setConfig({ ...config, from_email: e.target.value })}
          />
          <FormHelperText>
            Must be from a verified domain in SendGrid
          </FormHelperText>
        </FormControl>

        <FormControl>
          <FormLabel>From Name</FormLabel>
          <Input
            placeholder="Your Company"
            value={config.from_name}
            onChange={(e) => setConfig({ ...config, from_name: e.target.value })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Reply-To Email</FormLabel>
          <Input
            type="email"
            placeholder="support@yourdomain.com"
            value={config.reply_to}
            onChange={(e) => setConfig({ ...config, reply_to: e.target.value })}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Verified Domain</FormLabel>
          <Input
            placeholder="yourdomain.com"
            value={config.verified_domain}
            onChange={(e) => setConfig({ ...config, verified_domain: e.target.value })}
          />
          <FormHelperText>
            Domain verified in SendGrid for authentication
          </FormHelperText>
        </FormControl>

        <Divider />

        {/* Webhook Configuration Info */}
        <Box>
          <Text fontWeight="bold" mb={2}>Webhook Endpoints</Text>
          <VStack align="stretch" spacing={2}>
            <Box>
              <Text fontSize="sm" color="gray.600">Inbound Parse URL:</Text>
              <Code fontSize="sm" p={2} borderRadius="md">
                https://your-domain.com/api/sendgrid/webhook/inbound/{workspaceId}
              </Code>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600">Event Webhook URL:</Text>
              <Code fontSize="sm" p={2} borderRadius="md">
                https://your-domain.com/api/sendgrid/webhook/events/{workspaceId}
              </Code>
            </Box>
          </VStack>
          <FormHelperText mt={2}>
            Configure these URLs in SendGrid Dashboard for inbound emails and event tracking
          </FormHelperText>
        </Box>

        {/* Action Buttons */}
        <HStack spacing={4}>
          <Button
            colorScheme="purple"
            onClick={handleSave}
            isLoading={isLoading}
            loadingText="Saving..."
          >
            Save Configuration
          </Button>
          {isConfigured && (
            <Button
              variant="ghost"
              onClick={handleClear}
              isDisabled={isLoading}
            >
              Remove Configuration
            </Button>
          )}
        </HStack>
      </VStack>
    </Box>
  );
}
```

### 4.3 Update IntegrationsDashboard

```javascript
// /frontend/src/components/settings/IntegrationsDashboard.js (UPDATE)

// Add import
import SendGridConfigCard from './SendGridConfigCard';

// Add to renderIntegrationConfig function
const renderSendGridConfig = () => {
  return (
    <Box>
      <Button
        leftIcon={<Box as="span">←</Box>}
        variant="ghost"
        onClick={handleBackToIntegrations}
        mb={4}
      >
        Back to Integrations
      </Button>
      <Heading size="lg" mb={6}>SendGrid Configuration</Heading>
      <SendGridConfigCard workspaceId={currentWorkspace.id} />
    </Box>
  );
};

// Update the main render to include sendgrid
if (activeConfig === 'sendgrid') {
  return renderSendGridConfig();
}
```

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1)
- ✅ Database schema creation (`workspace_sendgrid_config`, `sendgrid_events`)
- ✅ Provider abstraction layer (`EmailProvider`, `EmailProviderFactory`)
- ✅ SendGrid provider implementation
- ✅ Refactor existing `emailService.js` to use provider pattern
- ✅ Migration script for existing data

### Phase 2: Core Integration (Week 2)
- ✅ SendGrid configuration routes (`/api/sendgrid/*`)
- ✅ Connection testing
- ✅ Basic send functionality
- ✅ Frontend configuration component
- ✅ Integration with IntegrationsDashboard

### Phase 3: Webhooks & Events (Week 3)
- ✅ Inbound Parse webhook handler
- ✅ Event webhook handler
- ✅ Event processing and storage
- ✅ Email status updates
- ✅ Webhook signature verification

### Phase 4: Testing & Documentation (Week 4)
- ✅ Unit tests for providers
- ✅ Integration tests
- ✅ End-to-end testing
- ✅ User documentation
- ✅ API documentation
- ✅ Deployment guide

---

## 6. Testing Strategy

### 6.1 Unit Tests

```javascript
// /backend/tests/email/SendGridProvider.test.js
const SendGridProvider = require('../../src/services/email/SendGridProvider');

describe('SendGridProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new SendGridProvider({
      sendgrid_api_key: 'SG.test_key',
      from_email: 'test@example.com',
      from_name: 'Test Sender'
    });
  });

  test('should send email successfully', async () => {
    // Mock sgMail.send
    const result = await provider.send({
      to: ['recipient@example.com'],
      subject: 'Test Email',
      content: '<p>Test content</p>',
      from_email: 'test@example.com',
      from_name: 'Test Sender'
    });

    expect(result.provider).toBe('sendgrid');
    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  test('should verify webhook signature', () => {
    const isValid = provider.verifyWebhookSignature(
      { event: 'delivered' },
      'signature',
      '1234567890',
      'public_key'
    );

    expect(typeof isValid).toBe('boolean');
  });
});
```

### 6.2 Integration Tests

```javascript
// /backend/tests/integration/sendgrid.test.js
describe('SendGrid Integration', () => {
  test('POST /api/sendgrid/config should save configuration', async () => {
    const response = await request(app)
      .post('/api/sendgrid/config')
      .set('x-workspace-id', 'test-workspace')
      .send({
        api_key: 'SG.test_key',
        from_email: 'test@example.com',
        from_name: 'Test'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('POST /api/sendgrid/webhook/inbound should process email', async () => {
    const response = await request(app)
      .post('/api/sendgrid/webhook/inbound/test-workspace')
      .send({
        from: 'sender@example.com',
        to: 'receiver@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## 7. Security Considerations

### 7.1 API Key Storage
- ✅ Encrypt API keys at rest in database
- ✅ Never expose full API key in frontend
- ✅ Use environment variables for system keys

### 7.2 Webhook Security
- ✅ Verify SendGrid webhook signatures
- ✅ Validate workspace_id in webhook URLs
- ✅ Rate limiting on webhook endpoints
- ✅ HTTPS only for webhooks

### 7.3 Access Control
- ✅ Workspace isolation (RLS policies)
- ✅ Role-based permissions (admin/owner only can configure)
- ✅ API key rotation support

---

## 8. Migration Guide

### 8.1 Existing Workspaces

**Option 1: Manual Migration**
- Admin selects "Configure SendGrid" in Integrations
- Enters SendGrid API key and domain
- System automatically switches provider
- Previous Resend emails remain accessible

**Option 2: Gradual Migration**
- Keep both providers active
- Use feature flag to control which is used
- Migrate workspace by workspace

### 8.2 Database Migration Script

```sql
-- Migration script: add_sendgrid_support.sql

-- 1. Add provider column to existing table
ALTER TABLE workspace_email_config
ADD COLUMN IF NOT EXISTS active_provider VARCHAR(50) DEFAULT 'resend';

-- 2. Create SendGrid config table
CREATE TABLE IF NOT EXISTS workspace_sendgrid_config (
    -- Schema from section 2.2
    ...
);

-- 3. Create events table
CREATE TABLE IF NOT EXISTS sendgrid_events (
    -- Schema from section 2.3
    ...
);

-- 4. Update existing records to mark Resend as provider
UPDATE workspace_email_config
SET active_provider = 'resend'
WHERE active_provider IS NULL;
```

---

## 9. Monitoring & Analytics

### 9.1 Metrics to Track

```javascript
// Integration metrics
- Total emails sent per provider (Resend vs SendGrid)
- Delivery rates per provider
- Bounce rates
- Open rates (SendGrid only)
- Click rates (SendGrid only)
- API errors per provider
- Webhook processing time
- Configuration errors
```

### 9.2 Logging

```javascript
// Structured logging format
{
  timestamp: '2025-01-13T...',
  workspace_id: 'xxx',
  provider: 'sendgrid',
  action: 'send_email',
  status: 'success',
  message_id: 'sg_xxx',
  metadata: {
    to: 'recipient@example.com',
    subject: 'Email subject'
  }
}
```

---

## 10. Documentation Deliverables

### 10.1 User Documentation
- ✅ How to get SendGrid API key
- ✅ Domain verification setup
- ✅ Webhook configuration guide
- ✅ Custom domain setup
- ✅ Troubleshooting common issues

### 10.2 Developer Documentation
- ✅ Provider architecture overview
- ✅ Adding new email providers
- ✅ API endpoints reference
- ✅ Webhook payload examples
- ✅ Testing guide

---

## 11. Dependencies

### 11.1 NPM Packages

```json
{
  "dependencies": {
    "@sendgrid/mail": "^8.1.0",
    "@sendgrid/client": "^8.1.0"
  },
  "devDependencies": {
    "@types/sendgrid__mail": "^7.4.2"
  }
}
```

### 11.2 SendGrid Requirements
- ✅ SendGrid account with API access
- ✅ Verified sender identity or domain
- ✅ Webhook endpoint (HTTPS)
- ✅ MX records configured (for Inbound Parse)

---

## 12. Rollout Plan

### 12.1 Beta Testing (Week 5)
- Select 5-10 pilot workspaces
- Enable SendGrid integration
- Monitor for issues
- Gather feedback

### 12.2 Gradual Rollout (Week 6-7)
- Enable for 25% of workspaces
- Monitor metrics
- Address issues
- Enable for 50% of workspaces
- Full rollout if stable

### 12.3 Rollback Plan
- Keep Resend as fallback
- Ability to quickly disable SendGrid
- Automatic provider switching on errors

---

## 13. Success Criteria

✅ **Functional Requirements:**
- Users can configure SendGrid in UI
- Emails send successfully via SendGrid
- Inbound emails are received and processed
- Events are tracked and displayed
- Custom domains work correctly

✅ **Performance Requirements:**
- Email send time < 2 seconds
- Webhook processing < 500ms
- 99.9% delivery rate
- Zero data loss

✅ **Quality Requirements:**
- 90%+ code coverage
- All security tests pass
- Documentation complete
- No critical bugs in production

---

## 14. Future Enhancements

### Phase 2 Features (Future)
- 📧 Email template builder for SendGrid
- 📊 Advanced analytics dashboard
- 🎯 A/B testing support
- 🔄 Automated provider failover
- 📱 Push notification on email events
- 🌐 Multi-provider routing (intelligent routing)
- 🔐 DKIM/SPF configuration UI
- 📈 Cost optimization recommendations

---

## 15. Resources & References

### SendGrid Documentation
- [SendGrid Node.js Library](https://github.com/sendgrid/sendgrid-nodejs)
- [Inbound Parse Webhook](https://www.twilio.com/docs/sendgrid/for-developers/parsing-email/setting-up-the-inbound-parse-webhook)
- [Event Webhook](https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook)
- [API Reference](https://www.twilio.com/docs/sendgrid/api-reference)
- [Email Personalizations](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/personalizations)

### Codebase References
- Twilio Integration: `/frontend/src/components/settings/IntegrationsDashboard.js`
- Email Service: `/backend/src/services/emailService.js`
- Email Routes: `/backend/src/routes/email.js`
- Integration Config: `/frontend/src/config/integrationsConfig.js`

---

## 16. Next Steps

1. **Review & Approval**
   - [ ] Review plan with team
   - [ ] Get stakeholder approval
   - [ ] Finalize timeline

2. **Environment Setup**
   - [ ] Create SendGrid test account
   - [ ] Set up development webhooks (ngrok)
   - [ ] Configure test domain

3. **Development Kickoff**
   - [ ] Create feature branch
   - [ ] Set up project board
   - [ ] Assign tasks to team members

---

**Document Version:** 1.0
**Last Updated:** 2025-01-13
**Status:** Ready for Implementation
**Owner:** Development Team
