# Microsoft Teams Integration Implementation Plan

> **Created**: December 28, 2025
> **Status**: Planning Complete - Ready for Implementation
> **Estimated Time**: 7-8 hours total

---

## Executive Summary

This document outlines a comprehensive plan for implementing Microsoft Teams integration into the application. The integration enables sending automated notifications to both **Team channels** and **group chats** using rich Adaptive Cards.

### Key Decision: Bot Framework + OAuth Hybrid Approach

Due to Microsoft's API limitations (Graph API does not support `ChatMessage.Send` with application permissions), we use a **Bot Framework** approach that enables automated notifications without requiring user login at send time.

---

## Table of Contents

1. [Why Bot Framework?](#1-why-bot-framework)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites - Azure Setup](#3-prerequisites---azure-setup)
4. [Database Schema](#4-database-schema)
5. [Backend Implementation](#5-backend-implementation)
6. [Frontend Implementation](#6-frontend-implementation)
7. [Integration with Existing Features](#7-integration-with-existing-features)
8. [Security Considerations](#8-security-considerations)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Why Bot Framework?

### Microsoft's API Limitations

| Approach | Group Chats | Channels | Automated (No Login) | Notes |
|----------|-------------|----------|---------------------|-------|
| Graph API (App Permissions) | ❌ | ❌ | ❌ | Only for data migration |
| Graph API (Delegated) | ✅ | ✅ | ❌ | Requires user login |
| Incoming Webhooks | ❌ | ✅ | ✅ | Channels only, being deprecated |
| Power Automate Workflows | ❌ | ✅ | ✅ | Channels only |
| **Bot Framework** | ✅ | ✅ | ✅ | **Recommended** |

### How Bot Framework Works

```
1. ONE-TIME SETUP (User does once):
   ├── User authenticates via OAuth
   ├── User adds bot to their Teams channels/group chats
   └── App stores "conversation references" for each destination

2. AUTOMATED NOTIFICATIONS (No user interaction):
   ├── Event triggers in your app (lead created, etc.)
   ├── Backend calls teamsService.sendProactiveMessage()
   ├── Bot Framework sends to stored conversation references
   └── Message appears in Teams automatically
```

---

## 2. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR APPLICATION                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  FRONTEND (React)                    BACKEND (Node.js/Express)          │
│  ┌──────────────────────┐           ┌──────────────────────────────┐   │
│  │ TeamsSetupWizard     │           │ teamsRoutes.js               │   │
│  │ - Connect button     │──────────▶│ - GET /oauth/authorize       │   │
│  │ - Channel picker     │           │ - GET /oauth/callback        │   │
│  │ - Test notification  │           │ - POST /bot/messages         │   │
│  └──────────────────────┘           │ - POST /send                 │   │
│                                     └──────────────────────────────┘   │
│                                              │                          │
│                                              ▼                          │
│                                     ┌──────────────────────────────┐   │
│                                     │ teamsService.js              │   │
│                                     │ - OAuth token management     │   │
│                                     │ - Bot Framework adapter      │   │
│                                     │ - Proactive messaging        │   │
│                                     │ - Adaptive Card templates    │   │
│                                     └──────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌───────────────────┐              ┌───────────────────────┐
        │ Microsoft OAuth   │              │ Azure Bot Service     │
        │ (login.microsoft) │              │ (Bot Framework)       │
        └───────────────────┘              └───────────────────────┘
                                                      │
                                                      ▼
                                           ┌───────────────────┐
                                           │ Microsoft Teams   │
                                           │ - Channels        │
                                           │ - Group Chats     │
                                           └───────────────────┘
```

### Data Flow for Sending Notifications

```
1. Trigger Event (lead created, status change, etc.)
                    │
                    ▼
2. Backend receives event → teamsService.sendNotification()
                    │
                    ▼
3. Load encrypted tokens from database
                    │
                    ▼
4. Check token expiry → refresh if needed
                    │
                    ▼
5. Retrieve conversation references for selected destinations
                    │
                    ▼
6. For each target:
   - Build Adaptive Card with notification content
   - Bot sends proactive message using conversation reference
                    │
                    ▼
7. Log delivery status to teams_message_logs
```

---

## 3. Prerequisites - Azure Setup

### Step 1: Create Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - **Name**: `YourApp Teams Integration`
   - **Supported account types**: "Accounts in any organizational directory and personal Microsoft accounts"
   - **Redirect URI**: `https://your-app.com/api/teams/oauth/callback` (Web)
4. After creation, note the **Application (client) ID**
5. Go to "Certificates & secrets" → New client secret → Copy the **secret value**
6. Go to "API permissions" → Add permissions → Microsoft Graph:
   - `User.Read` (delegated)
   - `Team.ReadBasic.All` (delegated)
   - `Channel.ReadBasic.All` (delegated)
   - `Chat.Read` (delegated)
   - `Chat.ReadWrite` (delegated)
   - `ChannelMessage.Send` (delegated) - Requires admin consent
7. Click "Grant admin consent" (requires Azure AD admin)

### Step 2: Create Azure Bot Service

1. Go to Azure Portal → Create a resource → Search "Azure Bot"
2. Click Create and configure:
   - **Bot handle**: `yourapp-teams-bot`
   - **Subscription**: Select your subscription
   - **Resource group**: Create new or use existing
   - **Pricing tier**: Standard (or Free for testing)
   - **Microsoft App ID**: "Use existing app registration" → paste App ID from Step 1
3. After creation, go to the bot resource
4. Go to "Configuration":
   - **Messaging endpoint**: `https://your-app.com/api/teams/bot/messages`
5. Go to "Channels" → Click Microsoft Teams → Enable → Save

### Step 3: Create Teams App Manifest (Optional)

For easier bot installation, create a Teams app package:

```json
// manifest.json
{
  "$schema": "https://developer.microsoft.com/en-us/json-schemas/teams/v1.16/MicrosoftTeams.schema.json",
  "manifestVersion": "1.16",
  "version": "1.0.0",
  "id": "<YOUR-APP-ID>",
  "packageName": "com.yourapp.teamsbot",
  "developer": {
    "name": "Your Company",
    "websiteUrl": "https://your-app.com",
    "privacyUrl": "https://your-app.com/privacy",
    "termsOfUseUrl": "https://your-app.com/terms"
  },
  "name": {
    "short": "YourApp Notifications",
    "full": "YourApp Teams Notifications Bot"
  },
  "description": {
    "short": "Receive notifications from YourApp",
    "full": "This bot sends automated notifications from YourApp to your Teams channels and group chats."
  },
  "icons": {
    "outline": "outline.png",
    "color": "color.png"
  },
  "accentColor": "#5059C9",
  "bots": [
    {
      "botId": "<YOUR-BOT-ID>",
      "scopes": ["team", "groupchat"],
      "supportsFiles": false,
      "isNotificationOnly": true
    }
  ],
  "permissions": ["identity", "messageTeamMembers"],
  "validDomains": ["your-app.com"]
}
```

### Environment Variables

Add to your `.env`:

```bash
# Microsoft Teams Integration
TEAMS_APP_ID=<Azure AD Application (client) ID>
TEAMS_APP_SECRET=<Azure AD Client Secret>
TEAMS_BOT_ID=<Same as TEAMS_APP_ID for single-tenant>
TEAMS_TENANT_ID=common
TEAMS_OAUTH_REDIRECT_URI=https://your-app.com/api/teams/oauth/callback
TEAMS_BOT_ENDPOINT=https://your-app.com/api/teams/bot/messages

# Encryption key for storing tokens (generate with: openssl rand -hex 32)
INTEGRATION_ENCRYPTION_KEY=<32-byte-hex-string>
```

---

## 4. Database Schema

### Migration File: `supabaseSchema/migrations/xxx_teams_integration.sql`

```sql
-- ============================================
-- Microsoft Teams Integration Tables
-- ============================================

-- Teams OAuth connections per workspace
CREATE TABLE teams_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),

    -- Microsoft tenant and app info
    tenant_id VARCHAR(100) NOT NULL,
    bot_app_id VARCHAR(100) NOT NULL,

    -- OAuth tokens (encrypted with AES-256-CBC)
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- User info from Microsoft
    microsoft_user_id VARCHAR(100),
    microsoft_user_email VARCHAR(255),
    microsoft_user_name VARCHAR(255),

    -- Status: active, expired, revoked
    status VARCHAR(20) DEFAULT 'active',
    last_token_refresh TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One connection per workspace per tenant
    UNIQUE(workspace_id, tenant_id)
);

-- Conversation references for proactive messaging
-- Stores the Bot Framework conversation reference needed to send messages
CREATE TABLE teams_conversation_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES teams_connections(id) ON DELETE CASCADE,

    -- Conversation identity
    conversation_id VARCHAR(500) NOT NULL,
    conversation_type VARCHAR(20) NOT NULL CHECK (conversation_type IN ('channel', 'groupChat')),

    -- Bot Framework conversation reference (complete JSON structure)
    conversation_reference JSONB NOT NULL,

    -- Human-readable info for UI
    display_name VARCHAR(255),
    team_id VARCHAR(100),
    team_name VARCHAR(255),
    channel_id VARCHAR(100),
    channel_name VARCHAR(255),

    -- Bot framework service URL (varies by region)
    service_url VARCHAR(500) NOT NULL,
    bot_id VARCHAR(100) NOT NULL,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    last_message_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- One reference per conversation per connection
    UNIQUE(connection_id, conversation_id)
);

-- Message delivery logs
CREATE TABLE teams_message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES teams_connections(id) ON DELETE CASCADE,
    conversation_ref_id UUID REFERENCES teams_conversation_references(id) ON DELETE SET NULL,

    -- Message details
    message_type VARCHAR(50) NOT NULL CHECK (message_type IN ('adaptive_card', 'text', 'notification')),
    adaptive_card_payload JSONB,
    text_content TEXT,

    -- What triggered this message
    trigger_type VARCHAR(50), -- 'lead_created', 'status_change', 'manual', 'workflow'
    trigger_reference_id UUID,
    trigger_reference_type VARCHAR(50), -- 'lead', 'contact', 'appointment'

    -- Delivery status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    error_message TEXT,
    error_code VARCHAR(50),

    -- Microsoft response
    microsoft_message_id VARCHAR(255),
    activity_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX idx_teams_connections_workspace ON teams_connections(workspace_id);
CREATE INDEX idx_teams_connections_status ON teams_connections(status);
CREATE INDEX idx_teams_connections_tenant ON teams_connections(tenant_id);

CREATE INDEX idx_teams_conv_refs_connection ON teams_conversation_references(connection_id);
CREATE INDEX idx_teams_conv_refs_type ON teams_conversation_references(conversation_type);
CREATE INDEX idx_teams_conv_refs_active ON teams_conversation_references(is_active) WHERE is_active = true;

CREATE INDEX idx_teams_message_logs_connection ON teams_message_logs(connection_id);
CREATE INDEX idx_teams_message_logs_status ON teams_message_logs(status);
CREATE INDEX idx_teams_message_logs_created ON teams_message_logs(created_at DESC);
CREATE INDEX idx_teams_message_logs_trigger ON teams_message_logs(trigger_type, trigger_reference_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE teams_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_conversation_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_message_logs ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace's Teams connections
CREATE POLICY "teams_connections_select" ON teams_connections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = teams_connections.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- Only admins can manage Teams connections
CREATE POLICY "teams_connections_manage" ON teams_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = teams_connections.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

-- Conversation references follow connection permissions
CREATE POLICY "teams_conv_refs_select" ON teams_conversation_references
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams_connections tc
            JOIN workspace_members wm ON wm.workspace_id = tc.workspace_id
            WHERE tc.id = teams_conversation_references.connection_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "teams_conv_refs_manage" ON teams_conversation_references
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teams_connections tc
            JOIN workspace_members wm ON wm.workspace_id = tc.workspace_id
            WHERE tc.id = teams_conversation_references.connection_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

-- Message logs are viewable by workspace members
CREATE POLICY "teams_message_logs_select" ON teams_message_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM teams_connections tc
            JOIN workspace_members wm ON wm.workspace_id = tc.workspace_id
            WHERE tc.id = teams_message_logs.connection_id
            AND wm.user_id = auth.uid()
        )
    );

-- ============================================
-- Triggers for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_connections_updated_at
    BEFORE UPDATE ON teams_connections
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at();

CREATE TRIGGER teams_conv_refs_updated_at
    BEFORE UPDATE ON teams_conversation_references
    FOR EACH ROW EXECUTE FUNCTION update_teams_updated_at();
```

---

## 5. Backend Implementation

### 5.1 Install Dependencies

```bash
npm install botbuilder botframework-connector @azure/msal-node
```

### 5.2 Teams Service (`backend/src/services/teamsService.js`)

```javascript
/**
 * Microsoft Teams Integration Service
 *
 * Handles OAuth2 authentication, token management, and message sending
 * via Bot Framework for proactive messaging.
 */

import { BotFrameworkAdapter, TurnContext, MessageFactory, CardFactory } from 'botbuilder';
import { MicrosoftAppCredentials } from 'botframework-connector';
import axios from 'axios';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

class TeamsService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    this.encryptionKey = process.env.INTEGRATION_ENCRYPTION_KEY;
    this.appId = process.env.TEAMS_APP_ID;
    this.appSecret = process.env.TEAMS_APP_SECRET;
    this.redirectUri = process.env.TEAMS_OAUTH_REDIRECT_URI;

    // Initialize Bot Framework adapter for proactive messaging
    this.adapter = new BotFrameworkAdapter({
      appId: this.appId,
      appPassword: this.appSecret
    });
  }

  // ==========================================
  // OAuth2 Methods
  // ==========================================

  /**
   * Generate OAuth2 authorization URL for Microsoft login
   */
  getAuthorizationUrl(workspaceId, state) {
    const scopes = [
      'openid',
      'profile',
      'email',
      'offline_access', // Required for refresh tokens
      'User.Read',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All',
      'Chat.Read',
      'Chat.ReadWrite',
      'ChannelMessage.Send'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.appId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: scopes,
      state: JSON.stringify({ workspaceId, nonce: state }),
      prompt: 'consent' // Force consent to get refresh token
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async exchangeCodeForTokens(code) {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(encryptedRefreshToken) {
    const refreshToken = this.decrypt(encryptedRefreshToken);

    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: this.appId,
        client_secret: this.appSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    return response.data;
  }

  /**
   * Get user info from Microsoft Graph
   */
  async getUserInfo(accessToken) {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  }

  /**
   * Get valid connection, refreshing token if needed
   */
  async getValidConnection(workspaceId) {
    const { data: connection, error } = await this.supabase
      .from('teams_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'active')
      .single();

    if (error || !connection) {
      return null;
    }

    // Check if token is expired or expiring soon (within 5 minutes)
    const expiresAt = new Date(connection.token_expires_at);
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      // Refresh the token
      try {
        const tokens = await this.refreshTokens(connection.encrypted_refresh_token);

        await this.supabase
          .from('teams_connections')
          .update({
            encrypted_access_token: this.encrypt(tokens.access_token),
            encrypted_refresh_token: this.encrypt(tokens.refresh_token),
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            last_token_refresh: new Date().toISOString()
          })
          .eq('id', connection.id);

        connection.encrypted_access_token = this.encrypt(tokens.access_token);
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);

        // Mark connection as expired
        await this.supabase
          .from('teams_connections')
          .update({ status: 'expired' })
          .eq('id', connection.id);

        throw new Error('Teams token expired. Please reconnect.');
      }
    }

    return connection;
  }

  // ==========================================
  // Microsoft Graph API Methods
  // ==========================================

  /**
   * Get user's joined teams
   */
  async getJoinedTeams(accessToken) {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/joinedTeams',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data.value;
  }

  /**
   * Get channels for a team
   */
  async getTeamChannels(accessToken, teamId) {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data.value;
  }

  /**
   * Get user's group chats
   */
  async getUserChats(accessToken) {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/chats?$filter=chatType eq \'group\'&$expand=members',
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data.value;
  }

  // ==========================================
  // Bot Framework Methods
  // ==========================================

  /**
   * Store conversation reference when bot is added to a chat/channel
   * This is called from the bot webhook handler
   */
  async storeConversationReference(connectionId, activity) {
    const conversationRef = TurnContext.getConversationReference(activity);

    const conversationType = activity.conversation.conversationType === 'channel'
      ? 'channel'
      : 'groupChat';

    const { data, error } = await this.supabase
      .from('teams_conversation_references')
      .upsert({
        connection_id: connectionId,
        conversation_id: conversationRef.conversation.id,
        conversation_type: conversationType,
        conversation_reference: conversationRef,
        display_name: activity.conversation.name || 'Unknown',
        team_id: activity.channelData?.team?.id,
        team_name: activity.channelData?.team?.name,
        channel_id: activity.channelData?.channel?.id,
        channel_name: activity.channelData?.channel?.name,
        service_url: conversationRef.serviceUrl,
        bot_id: conversationRef.bot.id,
        is_active: true
      }, {
        onConflict: 'connection_id,conversation_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to store conversation reference:', error);
      throw error;
    }

    return data;
  }

  /**
   * Send proactive message to a stored conversation
   * This is the main method for sending notifications
   */
  async sendProactiveMessage(conversationRefId, messagePayload) {
    // Get conversation reference from database
    const { data: convRef, error } = await this.supabase
      .from('teams_conversation_references')
      .select('*, teams_connections(*)')
      .eq('id', conversationRefId)
      .single();

    if (error || !convRef) {
      throw new Error('Conversation reference not found');
    }

    if (!convRef.is_active) {
      throw new Error('Conversation reference is inactive');
    }

    // Create log entry
    const { data: logEntry } = await this.supabase
      .from('teams_message_logs')
      .insert({
        connection_id: convRef.connection_id,
        conversation_ref_id: conversationRefId,
        message_type: messagePayload.type || 'adaptive_card',
        adaptive_card_payload: messagePayload.adaptiveCard,
        text_content: messagePayload.text,
        trigger_type: messagePayload.triggerType,
        trigger_reference_id: messagePayload.triggerReferenceId,
        trigger_reference_type: messagePayload.triggerReferenceType,
        status: 'pending'
      })
      .select()
      .single();

    try {
      // Trust the service URL (required for Bot Framework)
      MicrosoftAppCredentials.trustServiceUrl(convRef.service_url);

      // Create the activity (message)
      let activity;
      if (messagePayload.adaptiveCard) {
        const card = CardFactory.adaptiveCard(messagePayload.adaptiveCard);
        activity = MessageFactory.attachment(card);
      } else {
        activity = MessageFactory.text(messagePayload.text || 'Notification');
      }

      // Send proactive message using the stored conversation reference
      let messageId;
      await this.adapter.continueConversation(
        convRef.conversation_reference,
        async (context) => {
          const response = await context.sendActivity(activity);
          messageId = response?.id;
        }
      );

      // Update log with success
      await this.supabase
        .from('teams_message_logs')
        .update({
          status: 'sent',
          microsoft_message_id: messageId,
          activity_id: messageId,
          sent_at: new Date().toISOString()
        })
        .eq('id', logEntry.id);

      // Update last message timestamp on conversation reference
      await this.supabase
        .from('teams_conversation_references')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationRefId);

      return { success: true, logId: logEntry.id, messageId };

    } catch (sendError) {
      console.error('Failed to send proactive message:', sendError);

      // Update log with failure
      await this.supabase
        .from('teams_message_logs')
        .update({
          status: 'failed',
          error_message: sendError.message,
          error_code: sendError.code || 'UNKNOWN'
        })
        .eq('id', logEntry.id);

      throw sendError;
    }
  }

  /**
   * Send to multiple conversations
   */
  async sendToMultipleConversations(conversationRefIds, messagePayload) {
    const results = await Promise.allSettled(
      conversationRefIds.map(refId =>
        this.sendProactiveMessage(refId, messagePayload)
      )
    );

    return {
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      total: conversationRefIds.length,
      details: results
    };
  }

  // ==========================================
  // Encryption Methods
  // ==========================================

  /**
   * Encrypt sensitive data (tokens) using AES-256-CBC
   */
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(text) {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(this.encryptionKey, 'hex'),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // ==========================================
  // Adaptive Card Templates
  // ==========================================

  /**
   * Create Adaptive Card for lead notifications
   */
  createLeadNotificationCard(lead, options = {}) {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'ColumnSet',
              columns: [
                {
                  type: 'Column',
                  width: 'auto',
                  items: [
                    {
                      type: 'Image',
                      url: options.iconUrl || 'https://adaptivecards.io/content/pending.png',
                      size: 'Small',
                      style: 'Person'
                    }
                  ]
                },
                {
                  type: 'Column',
                  width: 'stretch',
                  items: [
                    {
                      type: 'TextBlock',
                      text: options.title || '🎯 New Lead Alert',
                      weight: 'Bolder',
                      size: 'Large',
                      color: 'Accent'
                    },
                    {
                      type: 'TextBlock',
                      text: new Date().toLocaleString(),
                      size: 'Small',
                      color: 'Default',
                      isSubtle: true
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          type: 'Container',
          items: [
            {
              type: 'FactSet',
              facts: [
                { title: 'Name', value: lead.name || 'N/A' },
                { title: 'Email', value: lead.email || 'N/A' },
                { title: 'Phone', value: lead.phone || 'N/A' },
                { title: 'Address', value: lead.address || 'N/A' },
                { title: 'Source', value: lead.source || 'N/A' },
                { title: 'Status', value: lead.status || 'New' },
                ...(lead.market ? [{ title: 'Market', value: lead.market }] : []),
                ...(lead.appointmentDate ? [{ title: 'Appointment', value: lead.appointmentDate }] : [])
              ].filter(f => f.value !== 'N/A')
            }
          ]
        },
        ...(lead.notes ? [{
          type: 'Container',
          items: [
            {
              type: 'TextBlock',
              text: 'Notes:',
              weight: 'Bolder',
              size: 'Small'
            },
            {
              type: 'TextBlock',
              text: lead.notes,
              wrap: true,
              size: 'Small'
            }
          ]
        }] : [])
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'View Lead',
          url: `${process.env.FRONTEND_URL}/leads/${lead.id}`
        },
        ...(lead.livechatUrl ? [{
          type: 'Action.OpenUrl',
          title: 'Open LiveChat',
          url: lead.livechatUrl
        }] : [])
      ]
    };
  }

  /**
   * Create Adaptive Card for status updates
   */
  createStatusUpdateCard(data) {
    const statusColors = {
      success: 'Good',
      warning: 'Warning',
      error: 'Attention',
      info: 'Accent'
    };

    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: data.style || 'default',
          items: [
            {
              type: 'TextBlock',
              text: data.title,
              weight: 'Bolder',
              size: 'Medium',
              color: statusColors[data.type] || 'Default'
            },
            {
              type: 'TextBlock',
              text: data.message,
              wrap: true
            },
            ...(data.details ? [{
              type: 'FactSet',
              facts: Object.entries(data.details).map(([key, value]) => ({
                title: key,
                value: String(value)
              }))
            }] : [])
          ]
        }
      ],
      ...(data.actionUrl ? {
        actions: [{
          type: 'Action.OpenUrl',
          title: data.actionLabel || 'View Details',
          url: data.actionUrl
        }]
      } : {})
    };
  }

  /**
   * Create Adaptive Card for appointment notifications
   */
  createAppointmentCard(appointment) {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: [
        {
          type: 'Container',
          style: 'emphasis',
          items: [
            {
              type: 'TextBlock',
              text: '📅 Self Scheduled Appointment',
              weight: 'Bolder',
              size: 'Large',
              color: 'Accent'
            }
          ]
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Name', value: appointment.name },
            { title: 'Address', value: appointment.address },
            { title: 'Phone Number', value: appointment.phone },
            { title: 'Date/Time', value: appointment.dateTime },
            { title: 'Market', value: appointment.market }
          ]
        }
      ],
      actions: [
        {
          type: 'Action.OpenUrl',
          title: 'Click Here',
          url: appointment.livechatUrl
        }
      ]
    };
  }
}

// Export singleton instance
export default new TeamsService();
```

### 5.3 Teams Routes (`backend/src/routes/teamsRoutes.js`)

```javascript
/**
 * Microsoft Teams Integration Routes
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import teamsService from '../services/teamsService.js';
import crypto from 'crypto';

const router = express.Router();

// ==========================================
// OAuth Routes
// ==========================================

/**
 * GET /api/teams/oauth/authorize
 * Initiate OAuth flow - returns authorization URL
 */
router.get('/oauth/authorize', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;
    const state = crypto.randomBytes(16).toString('hex');

    // Store state for CSRF protection (use Redis in production)
    // For now, we'll verify the workspace_id in the callback

    const authUrl = teamsService.getAuthorizationUrl(workspace_id, state);

    res.json({
      success: true,
      data: { authorizationUrl: authUrl }
    });
  } catch (error) {
    console.error('Teams OAuth init error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate OAuth flow',
      message: error.message
    });
  }
});

/**
 * GET /api/teams/oauth/callback
 * OAuth callback - exchanges code for tokens and stores connection
 */
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, error_description);
      return res.redirect(
        `${process.env.FRONTEND_URL}/integrations/teams?error=${encodeURIComponent(error_description || error)}`
      );
    }

    // Parse state to get workspace ID
    let parsedState;
    try {
      parsedState = JSON.parse(state);
    } catch (e) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/integrations/teams?error=Invalid%20state%20parameter`
      );
    }

    const { workspaceId } = parsedState;

    // Exchange code for tokens
    const tokens = await teamsService.exchangeCodeForTokens(code);

    // Get user info from Microsoft
    const userInfo = await teamsService.getUserInfo(tokens.access_token);

    // Extract tenant ID from ID token
    const tokenParts = tokens.id_token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const tenantId = payload.tid;

    // Store connection in database
    await teamsService.supabase
      .from('teams_connections')
      .upsert({
        workspace_id: workspaceId,
        user_id: userInfo.id,
        tenant_id: tenantId,
        bot_app_id: process.env.TEAMS_APP_ID,
        encrypted_access_token: teamsService.encrypt(tokens.access_token),
        encrypted_refresh_token: teamsService.encrypt(tokens.refresh_token),
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        microsoft_user_id: userInfo.id,
        microsoft_user_email: userInfo.mail || userInfo.userPrincipalName,
        microsoft_user_name: userInfo.displayName,
        status: 'active',
        last_token_refresh: new Date().toISOString()
      }, {
        onConflict: 'workspace_id,tenant_id'
      });

    // Redirect to frontend with success
    res.redirect(`${process.env.FRONTEND_URL}/integrations/teams?success=true`);

  } catch (error) {
    console.error('Teams OAuth callback error:', error);
    res.redirect(
      `${process.env.FRONTEND_URL}/integrations/teams?error=${encodeURIComponent(error.message)}`
    );
  }
});

// ==========================================
// Bot Webhook Route
// ==========================================

/**
 * POST /api/teams/bot/messages
 * Bot Framework messages endpoint - receives events when bot is added/messaged
 */
router.post('/bot/messages', async (req, res) => {
  try {
    await teamsService.adapter.processActivity(req, res, async (context) => {
      const activity = context.activity;

      switch (activity.type) {
        case 'conversationUpdate':
          // Bot was added to a conversation
          if (activity.membersAdded) {
            for (const member of activity.membersAdded) {
              // Check if the bot itself was added
              if (member.id === activity.recipient.id) {
                const tenantId = activity.conversation.tenantId;

                // Find the connection for this tenant
                const { data: connection } = await teamsService.supabase
                  .from('teams_connections')
                  .select('id')
                  .eq('tenant_id', tenantId)
                  .eq('status', 'active')
                  .single();

                if (connection) {
                  // Store conversation reference for future messaging
                  await teamsService.storeConversationReference(
                    connection.id,
                    activity
                  );

                  // Send welcome message
                  await context.sendActivity(
                    '✅ Connected! I\'ll send notifications from your app to this chat.'
                  );
                } else {
                  await context.sendActivity(
                    '⚠️ Please connect this bot through the app first at ' + process.env.FRONTEND_URL
                  );
                }
              }
            }
          }
          break;

        case 'message':
          // Bot received a message (we're notification-only, so just acknowledge)
          await context.sendActivity(
            'I\'m a notification bot and don\'t respond to messages. ' +
            'Notifications will appear here automatically.'
          );
          break;

        case 'installationUpdate':
          // Bot was installed or uninstalled
          if (activity.action === 'remove') {
            // Mark conversation reference as inactive
            const tenantId = activity.conversation.tenantId;
            const conversationId = activity.conversation.id;

            await teamsService.supabase
              .from('teams_conversation_references')
              .update({ is_active: false })
              .eq('conversation_id', conversationId);
          }
          break;
      }
    });
  } catch (error) {
    console.error('Bot webhook error:', error);
    res.status(500).send();
  }
});

// ==========================================
// API Routes
// ==========================================

/**
 * GET /api/teams/status
 * Get Teams connection status for workspace
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;

    const { data: connection, error } = await teamsService.supabase
      .from('teams_connections')
      .select(`
        id,
        status,
        microsoft_user_name,
        microsoft_user_email,
        token_expires_at,
        created_at,
        teams_conversation_references (
          id,
          display_name,
          conversation_type,
          team_name,
          channel_name,
          is_active,
          last_message_at
        )
      `)
      .eq('workspace_id', workspace_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: {
        isConnected: !!connection && connection.status === 'active',
        connection: connection ? {
          id: connection.id,
          status: connection.status,
          userName: connection.microsoft_user_name,
          userEmail: connection.microsoft_user_email,
          tokenExpiresAt: connection.token_expires_at,
          createdAt: connection.created_at,
          conversationRefs: connection.teams_conversation_references?.filter(r => r.is_active) || []
        } : null
      }
    });
  } catch (error) {
    console.error('Teams status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Teams status'
    });
  }
});

/**
 * GET /api/teams/teams
 * Get user's joined teams and their channels
 */
router.get('/teams', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;

    const connection = await teamsService.getValidConnection(workspace_id);
    if (!connection) {
      return res.status(401).json({
        success: false,
        error: 'Teams not connected'
      });
    }

    const accessToken = teamsService.decrypt(connection.encrypted_access_token);
    const teams = await teamsService.getJoinedTeams(accessToken);

    // Get channels for each team in parallel
    const teamsWithChannels = await Promise.all(
      teams.map(async (team) => {
        try {
          const channels = await teamsService.getTeamChannels(accessToken, team.id);
          return { ...team, channels };
        } catch (e) {
          console.error(`Failed to get channels for team ${team.id}:`, e.message);
          return { ...team, channels: [] };
        }
      })
    );

    res.json({
      success: true,
      data: teamsWithChannels
    });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get teams'
    });
  }
});

/**
 * GET /api/teams/chats
 * Get user's group chats
 */
router.get('/chats', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;

    const connection = await teamsService.getValidConnection(workspace_id);
    if (!connection) {
      return res.status(401).json({
        success: false,
        error: 'Teams not connected'
      });
    }

    const accessToken = teamsService.decrypt(connection.encrypted_access_token);
    const chats = await teamsService.getUserChats(accessToken);

    res.json({
      success: true,
      data: chats
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chats'
    });
  }
});

/**
 * GET /api/teams/conversation-refs
 * Get stored conversation references for workspace
 */
router.get('/conversation-refs', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;

    const { data: connection } = await teamsService.supabase
      .from('teams_connections')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('status', 'active')
      .single();

    if (!connection) {
      return res.json({ success: true, data: [] });
    }

    const { data: refs } = await teamsService.supabase
      .from('teams_conversation_references')
      .select('*')
      .eq('connection_id', connection.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: refs || []
    });
  } catch (error) {
    console.error('Get conversation refs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation references'
    });
  }
});

/**
 * POST /api/teams/send-test
 * Send a test message to a conversation
 */
router.post('/send-test', authenticate, async (req, res) => {
  try {
    const { conversationRefId } = req.body;

    if (!conversationRefId) {
      return res.status(400).json({
        success: false,
        error: 'conversationRefId is required'
      });
    }

    const result = await teamsService.sendProactiveMessage(conversationRefId, {
      type: 'adaptive_card',
      adaptiveCard: teamsService.createStatusUpdateCard({
        title: '✅ Test Message',
        message: 'Your Microsoft Teams integration is working correctly!',
        type: 'success',
        details: {
          'Sent At': new Date().toLocaleString(),
          'Source': 'Integration Test'
        }
      }),
      triggerType: 'manual_test'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Send test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test message',
      message: error.message
    });
  }
});

/**
 * POST /api/teams/send
 * Send notification to one or more conversations
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const {
      conversationRefIds,
      adaptiveCard,
      text,
      triggerType,
      triggerReferenceId,
      triggerReferenceType
    } = req.body;

    if (!conversationRefIds || !Array.isArray(conversationRefIds) || conversationRefIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'conversationRefIds array is required'
      });
    }

    const result = await teamsService.sendToMultipleConversations(conversationRefIds, {
      type: adaptiveCard ? 'adaptive_card' : 'text',
      adaptiveCard,
      text,
      triggerType,
      triggerReferenceId,
      triggerReferenceType
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send notification'
    });
  }
});

/**
 * POST /api/teams/send-lead-notification
 * Send lead notification (convenience endpoint)
 */
router.post('/send-lead-notification', authenticate, async (req, res) => {
  try {
    const { conversationRefIds, lead, options } = req.body;

    const adaptiveCard = teamsService.createLeadNotificationCard(lead, options);

    const result = await teamsService.sendToMultipleConversations(conversationRefIds, {
      type: 'adaptive_card',
      adaptiveCard,
      triggerType: 'lead_notification',
      triggerReferenceId: lead.id,
      triggerReferenceType: 'lead'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Send lead notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send lead notification'
    });
  }
});

/**
 * DELETE /api/teams/disconnect
 * Disconnect Teams integration
 */
router.delete('/disconnect', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;

    // Mark connection as revoked (keep data for audit trail)
    await teamsService.supabase
      .from('teams_connections')
      .update({ status: 'revoked' })
      .eq('workspace_id', workspace_id);

    // Mark all conversation references as inactive
    const { data: connection } = await teamsService.supabase
      .from('teams_connections')
      .select('id')
      .eq('workspace_id', workspace_id)
      .single();

    if (connection) {
      await teamsService.supabase
        .from('teams_conversation_references')
        .update({ is_active: false })
        .eq('connection_id', connection.id);
    }

    res.json({
      success: true,
      message: 'Teams integration disconnected'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect'
    });
  }
});

/**
 * GET /api/teams/logs
 * Get message delivery logs
 */
router.get('/logs', authenticate, async (req, res) => {
  try {
    const { workspace_id } = req.user;
    const { limit = 50, offset = 0, status } = req.query;

    const { data: connection } = await teamsService.supabase
      .from('teams_connections')
      .select('id')
      .eq('workspace_id', workspace_id)
      .single();

    if (!connection) {
      return res.json({ success: true, data: [], total: 0 });
    }

    let query = teamsService.supabase
      .from('teams_message_logs')
      .select('*, teams_conversation_references(display_name, conversation_type)', { count: 'exact' })
      .eq('connection_id', connection.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, count } = await query;

    res.json({
      success: true,
      data: logs || [],
      total: count || 0
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get logs'
    });
  }
});

export default router;
```

### 5.4 Register Routes (`backend/src/index.js` or `backend/src/app.js`)

Add to your main Express app:

```javascript
import teamsRoutes from './routes/teamsRoutes.js';

// ... other middleware and routes ...

app.use('/api/teams', teamsRoutes);
```

---

## 6. Frontend Implementation

### 6.1 Update Integrations Config

Update `frontend/src/config/integrationsConfig.js`:

```javascript
{
  key: 'microsoft-teams',
  name: 'Microsoft Teams',
  category: 'collaboration',
  icon: MessageSquare, // or use SiMicrosoftteams from react-icons/si
  iconColor: '#5059C9',
  description: 'Send notifications to Microsoft Teams channels and group chats',
  longDescription: 'Connect your workspace with Microsoft Teams for automated notifications. Send lead alerts, status updates, and custom messages to channels and group chats.',
  status: 'available',
  configureLabel: 'Connect',
  features: [
    'Channel notifications',
    'Group chat notifications',
    'Rich Adaptive Cards',
    'Lead alerts',
    'Status updates',
    'Delivery tracking'
  ],
  setupComplexity: 'hard',
  requiresAuth: true,
  authType: 'oauth2',
  documentationUrl: 'https://docs.microsoft.com/en-us/microsoftteams/',
  isPremium: true,
  customSetupComponent: 'TeamsSetupWizard'
}
```

### 6.2 Teams API Service (`frontend/src/services/teamsApi.js`)

```javascript
/**
 * Microsoft Teams API Service
 */

import api from './api'; // Your existing axios instance

const teamsApi = {
  // OAuth
  initiateOAuth: () => api.get('/api/teams/oauth/authorize'),

  // Status
  getStatus: () => api.get('/api/teams/status'),

  // Data
  getTeams: () => api.get('/api/teams/teams'),
  getChats: () => api.get('/api/teams/chats'),
  getConversationRefs: () => api.get('/api/teams/conversation-refs'),

  // Actions
  sendTest: (conversationRefId) => api.post('/api/teams/send-test', { conversationRefId }),
  sendNotification: (data) => api.post('/api/teams/send', data),
  sendLeadNotification: (data) => api.post('/api/teams/send-lead-notification', data),

  // Logs
  getLogs: (params) => api.get('/api/teams/logs', { params }),

  // Management
  disconnect: () => api.delete('/api/teams/disconnect')
};

export default teamsApi;
```

### 6.3 Teams Setup Wizard Component

Create `frontend/src/components/integrations/teams/TeamsSetupWizard.jsx` and `TeamsChannelPicker.jsx` components (see full implementation in section 5 of original plan).

---

## 7. Integration with Existing Features

### Example: Send Notification on Lead Creation

Add to your lead creation flow (e.g., in webhook handler or lead service):

```javascript
import teamsService from '../services/teamsService.js';

async function onLeadCreated(lead, workspaceId) {
  // Check if Teams is connected for this workspace
  const { data: connection } = await supabase
    .from('teams_connections')
    .select(`
      id,
      teams_conversation_references (id)
    `)
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
    .single();

  if (!connection || !connection.teams_conversation_references?.length) {
    return; // Teams not configured
  }

  // Get active conversation references
  const { data: refs } = await supabase
    .from('teams_conversation_references')
    .select('id')
    .eq('connection_id', connection.id)
    .eq('is_active', true);

  if (!refs?.length) return;

  // Send notification to all configured destinations
  const adaptiveCard = teamsService.createLeadNotificationCard({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    address: lead.address,
    source: lead.source,
    status: lead.status,
    market: lead.market,
    appointmentDate: lead.appointment_date,
    livechatUrl: `${process.env.FRONTEND_URL}/livechat/${lead.id}`
  });

  await teamsService.sendToMultipleConversations(
    refs.map(r => r.id),
    {
      type: 'adaptive_card',
      adaptiveCard,
      triggerType: 'lead_created',
      triggerReferenceId: lead.id,
      triggerReferenceType: 'lead'
    }
  );
}
```

---

## 8. Security Considerations

### Token Storage
- All OAuth tokens encrypted with AES-256-CBC
- Encryption key stored as environment variable
- Automatic token refresh before expiry

### Authentication
- OAuth state parameter prevents CSRF attacks
- Verify workspace ownership on callback
- Admin-only access to integration settings

### Data Protection
- Row Level Security (RLS) for workspace isolation
- No message content stored long-term (only metadata)
- Audit logging of all message sends

### Bot Security
- Validate Bot Framework requests
- Trust service URLs before sending
- Rate limiting on send endpoints

---

## 9. Testing Strategy

### Unit Tests
- Token encryption/decryption
- Adaptive Card template generation
- OAuth URL generation

### Integration Tests (with mocks)
- OAuth token exchange flow
- Bot Framework message handling
- Database operations

### Manual Testing Checklist
- [ ] OAuth flow completes successfully
- [ ] Bot can be added to a channel
- [ ] Bot can be added to a group chat
- [ ] Conversation references stored correctly
- [ ] Proactive messages reach channels
- [ ] Proactive messages reach group chats
- [ ] Adaptive Cards render correctly
- [ ] Token refresh works before expiry
- [ ] Disconnection clears active status
- [ ] Error messages displayed properly

---

## 10. Deployment Checklist

### Pre-Deployment
- [ ] Azure AD App Registration created
- [ ] Azure Bot Service created and configured
- [ ] Teams channel enabled on bot
- [ ] All environment variables set
- [ ] Database migration applied
- [ ] Bot messaging endpoint publicly accessible (HTTPS)

### Environment Variables
```bash
TEAMS_APP_ID=<azure-ad-app-id>
TEAMS_APP_SECRET=<azure-ad-app-secret>
TEAMS_BOT_ID=<same-as-app-id>
TEAMS_TENANT_ID=common
TEAMS_OAUTH_REDIRECT_URI=https://your-app.com/api/teams/oauth/callback
TEAMS_BOT_ENDPOINT=https://your-app.com/api/teams/bot/messages
INTEGRATION_ENCRYPTION_KEY=<32-byte-hex>
FRONTEND_URL=https://your-app.com
```

### Post-Deployment
- [ ] Test OAuth flow end-to-end
- [ ] Test bot installation in Teams
- [ ] Test sending notifications
- [ ] Monitor error logs
- [ ] Set up alerting for token refresh failures

---

## References

### Microsoft Documentation
- [Send chatMessage in a channel or chat](https://learn.microsoft.com/en-us/graph/api/chatmessage-post)
- [Send proactive messages - Teams](https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages)
- [Bot Framework SDK for Node.js](https://learn.microsoft.com/en-us/azure/bot-service/javascript/bot-builder-javascript-quickstart)
- [Adaptive Cards Designer](https://adaptivecards.io/designer/)
- [Microsoft Graph permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)

### Samples
- [Teams Conversation Bot (Node.js)](https://github.com/OfficeDev/Microsoft-Teams-Samples/tree/main/samples/bot-conversation/nodejs)
- [Proactive Messaging Sample](https://github.com/OfficeDev/Microsoft-Teams-Samples/tree/main/samples/bot-proactive-messaging/nodejs)
