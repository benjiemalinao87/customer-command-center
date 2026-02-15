# Application Whole Architecture (Supabase ER Diagram)

This document provides a comprehensive, up-to-date entity-relationship (ER) diagram of **all tables** in the Supabase database for this application. It is designed for debugging, onboarding, and architectural review.

---

## Legend
- 🔑 = Primary Key
- 🗝️ = Foreign Key
- 🟣 = Composite Unique Constraint
- 🟩 = workspace_id (multi-tenant boundary)
- 🔒 = RLS enabled

---

## Mermaid ER Diagram

```mermaid
erDiagram
    %% =================== AUTH SCHEMA ===================
    users {
        text id 🔑
        text email
        text phone
        timestamptz created_at
        timestamptz updated_at
        %% ...other columns
    }
    user_profiles {
        text id 🔑🗝️ (users.id)
        text full_name
        text avatar_url
        %% ...other columns
    }
    admins {
        text id 🔑🗝️ (users.id)
        text role
    }

    %% =================== WORKSPACE CORE ===================
    workspaces {
        text id 🔑
        text name
        timestamptz created_at
        timestamptz updated_at
    }
    workspace_members {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text user_id 🗝️ (users.id)
        text role
        timestamptz joined_at
        %% 🟣 UNIQUE (workspace_id, user_id)
    }

    %% =================== CONTACTS & CRM ===================
    contacts {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text firstname
        text lastname
        text email
        text phone_number
        text lead_source
        text lead_status
        timestamptz created_at
        timestamptz updated_at
        %% ...other columns
    }
    contact_notes {
        uuid id 🔑
        uuid contact_id 🗝️ (contacts.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text note
        timestamptz created_at
        %% 🟣 UNIQUE (contact_id, workspace_id)
    }

    %% =================== STATUS MANAGEMENT ===================
    status_categories {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text name
        text created_by 🗝️ (users.id)
        timestamptz created_at
    }
    status_options {
        uuid id 🔑
        uuid category_id 🗝️ (status_categories.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text label
        text color
        int display_order
        text created_by 🗝️ (users.id)
        timestamptz created_at
    }

    %% =================== LIVECHAT & MESSAGING ===================
    livechat_messages {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        uuid contact_id 🗝️ (contacts.id)
        text sender_id 🗝️ (users.id)
        text message
        timestamptz sent_at
        text channel
        text status
    }

    %% =================== FLOW BUILDER & AUTOMATION ===================
    flow_folders {
        uuid id 🔑
        text name
        text workspace_id 🟩🗝️ (workspaces.id)
        timestamptz created_at
        timestamptz updated_at
    }
    flows {
        uuid id 🔑
        text name
        uuid folder_id 🗝️ (flow_folders.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        jsonb nodes
        jsonb edges
        timestamptz created_at
        timestamptz updated_at
    }
    flow_executions {
        uuid id 🔑
        uuid flow_id 🗝️ (flows.id)
        uuid contact_id 🗝️ (contacts.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text status
        timestamptz started_at
        timestamptz finished_at
        text error_message
        int execution_time
        text source
        jsonb metadata
    }
    execution_steps {
        uuid id 🔑
        uuid execution_id 🗝️ (flow_executions.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text step_type
        text status
        timestamptz started_at
        timestamptz finished_at
        text error_message
        jsonb metadata
    }
    dead_letter_queue {
        uuid id 🔑
        uuid execution_id 🗝️ (flow_executions.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text reason
        jsonb payload
        timestamptz created_at
    }
    flow_monitoring_alerts {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text alert_type
        text threshold
        text notification_settings
        timestamptz created_at
    }

    %% =================== WEBHOOKS ===================
    webhooks {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text url
        text event_type
        text preprocessing_updated_by 🗝️ (users.id)
        timestamptz created_at
    }
    webhook_logs {
        uuid id 🔑
        uuid webhook_id 🗝️ (webhooks.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text event
        jsonb payload
        timestamptz created_at
    }
    field_mappings {
        uuid id 🔑
        uuid webhook_id 🗝️ (webhooks.id)
        text workspace_id 🟩🗝️ (workspaces.id)
        text source_field
        text target_field
    }
    webhook_templates {
        uuid id 🔑
        text name
        text description
        jsonb template
        timestamptz created_at
    }

    %% =================== TWILIO & INTEGRATIONS ===================
    workspace_twilio_config {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text webhook_type
        text webhook_url
        boolean is_configured
        text account_sid
        text auth_token
        timestamptz created_at
    }
    twilio_numbers {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text phone_number
        text friendly_name
        boolean is_active
        timestamptz created_at
    }

    %% =================== A2P 10DLC REGISTRATION ===================
    a2p_brands {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text brand_name
        text ein
        text status
        text twilio_brand_sid
        timestamptz created_at
        timestamptz updated_at
    }
    a2p_campaigns {
        uuid id 🔑
        text workspace_id 🟩🗝️ (workspaces.id)
        text brand_id 🗝️ (a2p_brands.id)
        text campaign_name
        text campaign_type
        text use_case
        text status
        text twilio_campaign_sid
        timestamptz created_at
        timestamptz updated_at
    }

    %% =================== RELATIONSHIPS ===================
    %% Users
    user_profiles ||--|| users : "id"
    admins ||--|| users : "id"
    workspace_members ||--o{ users : "user_id"
    workspace_members ||--o{ workspaces : "workspace_id"
    %% Contacts
    contacts ||--o{ workspaces : "workspace_id"
    contact_notes ||--o{ contacts : "contact_id"
    contact_notes ||--o{ workspaces : "workspace_id"
    %% Status
    status_categories ||--o{ workspaces : "workspace_id"
    status_categories ||--o{ users : "created_by"
    status_options ||--o{ status_categories : "category_id"
    status_options ||--o{ workspaces : "workspace_id"
    status_options ||--o{ users : "created_by"
    %% Livechat
    livechat_messages ||--o{ contacts : "contact_id"
    livechat_messages ||--o{ workspaces : "workspace_id"
    livechat_messages ||--o{ users : "sender_id"
    %% Flow
    flow_folders ||--o{ workspaces : "workspace_id"
    flows ||--o{ flow_folders : "folder_id"
    flows ||--o{ workspaces : "workspace_id"
    flow_executions ||--o{ flows : "flow_id"
    flow_executions ||--o{ contacts : "contact_id"
    flow_executions ||--o{ workspaces : "workspace_id"
    execution_steps ||--o{ flow_executions : "execution_id"
    execution_steps ||--o{ workspaces : "workspace_id"
    dead_letter_queue ||--o{ flow_executions : "execution_id"
    dead_letter_queue ||--o{ workspaces : "workspace_id"
    flow_monitoring_alerts ||--o{ workspaces : "workspace_id"
    %% Webhooks
    webhooks ||--o{ workspaces : "workspace_id"
    webhooks ||--o{ users : "preprocessing_updated_by"
    webhook_logs ||--o{ webhooks : "webhook_id"
    webhook_logs ||--o{ workspaces : "workspace_id"
    field_mappings ||--o{ webhooks : "webhook_id"
    field_mappings ||--o{ workspaces : "workspace_id"
    %% Twilio
    workspace_twilio_config ||--o{ workspaces : "workspace_id"
    twilio_numbers ||--o{ workspaces : "workspace_id"
    %% A2P
    a2p_brands ||--o{ workspaces : "workspace_id"
    a2p_campaigns ||--o{ a2p_brands : "brand_id"
    a2p_campaigns ||--o{ workspaces : "workspace_id"
```

---

## Debugging Notes
- All tables with workspace_id are multi-tenant and subject to workspace isolation (see 🔟-tenant architecture).
- RLS policies are enabled on most business tables (🔒), enforcing row-level security.
- Foreign keys are enforced on all relationships; composite keys are noted in the diagram.
- For SQL debugging, use the table and column names as shown here for precise queries.

---

## How to Use This Diagram
- Paste the Mermaid code block above into [Mermaid Live Editor](https://mermaid.live) or compatible Markdown viewers (e.g., Notion, GitHub).
- Use the legend for quick reference.
- For onboarding, debugging, or schema review, refer to this file as the source of truth.

---

_Last updated: 2025-04-20 13:18:09 +10:00_
