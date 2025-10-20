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

## Entity-Relationship Diagram (ASCII Format)

### AUTH SCHEMA
```
┌──────────────────────────┐
│ users                    │
├──────────────────────────┤
│ 🔑 id (text)             │
│    email                 │
│    phone                 │
│    created_at            │
│    updated_at            │
└────────┬─────────────────┘
         │
         │ 1:1
         ├─────────────────────────┐
         │                         │
         ▼                         ▼
┌──────────────────────┐  ┌──────────────────────┐
│ user_profiles        │  │ admins               │
├──────────────────────┤  ├──────────────────────┤
│ 🔑🗝️ id (users.id)   │  │ 🔑🗝️ id (users.id)   │
│    full_name         │  │    role              │
│    avatar_url        │  └──────────────────────┘
└──────────────────────┘
```

### WORKSPACE CORE
```
┌────────────────────────┐           ┌──────────────────────────────┐
│ workspaces             │           │ workspace_members            │
├────────────────────────┤           ├──────────────────────────────┤
│ 🔑 id (text)           │◄──────────┤ 🔑 id (uuid)                 │
│    name                │   1:N     │ 🟩🗝️ workspace_id (ref)      │
│    created_at          │           │ 🗝️ user_id (users.id)        │
│    updated_at          │           │    role                      │
└────────────────────────┘           │    joined_at                 │
                                     │ 🟣 UNIQUE (workspace_id,     │
                                     │           user_id)           │
                                     └──────────────────────────────┘
```

### CONTACTS & CRM
```
┌─────────────────────────┐          ┌──────────────────────────┐
│ contacts                │          │ contact_notes            │
├─────────────────────────┤          ├──────────────────────────┤
│ 🔑 id (uuid)            │◄─────────┤ 🔑 id (uuid)             │
│ 🟩🗝️ workspace_id       │   1:N    │ 🗝️ contact_id (ref)      │
│    firstname            │          │ 🟩🗝️ workspace_id        │
│    lastname             │          │    note                  │
│    email                │          │    created_at            │
│    phone_number         │          │ 🟣 UNIQUE (contact_id,   │
│    lead_source          │          │           workspace_id)  │
│    lead_status          │          └──────────────────────────┘
│    created_at           │
│    updated_at           │
└─────────────────────────┘
```

### STATUS MANAGEMENT
```
┌──────────────────────────┐         ┌───────────────────────────┐
│ status_categories        │         │ status_options            │
├──────────────────────────┤         ├───────────────────────────┤
│ 🔑 id (uuid)             │◄────────┤ 🔑 id (uuid)              │
│ 🟩🗝️ workspace_id        │   1:N   │ 🗝️ category_id (ref)      │
│    name                  │         │ 🟩🗝️ workspace_id         │
│ 🗝️ created_by (users.id) │         │    label                  │
│    created_at            │         │    color                  │
└──────────────────────────┘         │    display_order          │
                                     │ 🗝️ created_by (users.id)  │
                                     │    created_at             │
                                     └───────────────────────────┘
```

### LIVECHAT & MESSAGING
```
┌──────────────────────────┐
│ livechat_messages        │
├──────────────────────────┤
│ 🔑 id (uuid)             │
│ 🟩🗝️ workspace_id        │
│ 🗝️ contact_id (contacts) │
│ 🗝️ sender_id (users)     │
│    message               │
│    sent_at               │
│    channel               │
│    status                │
└──────────────────────────┘
```

### FLOW BUILDER & AUTOMATION
```
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────┐
│ flow_folders     │       │ flows            │       │ flow_executions    │
├──────────────────┤       ├──────────────────┤       ├────────────────────┤
│ 🔑 id            │◄──────┤ 🔑 id            │◄──────┤ 🔑 id              │
│ 🟩🗝️ workspace_id│  1:N  │ 🗝️ folder_id     │  1:N  │ 🗝️ flow_id         │
│    name          │       │ 🟩🗝️ workspace_id│       │ 🗝️ contact_id      │
│    created_at    │       │    name          │       │ 🟩🗝️ workspace_id  │
│    updated_at    │       │    nodes (jsonb) │       │    status          │
└──────────────────┘       │    edges (jsonb) │       │    started_at      │
                           │    created_at    │       │    finished_at     │
                           │    updated_at    │       │    error_message   │
                           └──────────────────┘       │    execution_time  │
                                                      │    source          │
                                                      │    metadata (jsonb)│
                                                      └─────────┬──────────┘
                                                                │
                                                                │ 1:N
                               ┌────────────────────────────────┼────────────────┐
                               │                                │                │
                               ▼                                ▼                ▼
                    ┌──────────────────┐         ┌──────────────────┐  ┌───────────────────┐
                    │ execution_steps  │         │ dead_letter_queue│  │ flow_monitoring_  │
                    ├──────────────────┤         ├──────────────────┤  │ alerts            │
                    │ 🔑 id            │         │ 🔑 id            │  ├───────────────────┤
                    │ 🗝️ execution_id  │         │ 🗝️ execution_id  │  │ 🔑 id             │
                    │ 🟩🗝️ workspace_id│         │ 🟩🗝️ workspace_id│  │ 🟩🗝️ workspace_id │
                    │    step_type     │         │    reason        │  │    alert_type     │
                    │    status        │         │    payload       │  │    threshold      │
                    │    started_at    │         │    created_at    │  │    notification_  │
                    │    finished_at   │         └──────────────────┘  │    settings       │
                    │    error_message │                               │    created_at     │
                    │    metadata      │                               └───────────────────┘
                    └──────────────────┘
```

### WEBHOOKS
```
┌──────────────────────┐       ┌───────────────────┐
│ webhooks             │       │ webhook_logs      │
├──────────────────────┤       ├───────────────────┤
│ 🔑 id                │◄──────┤ 🔑 id             │
│ 🟩🗝️ workspace_id    │  1:N  │ 🗝️ webhook_id     │
│    url               │       │ 🟩🗝️ workspace_id │
│    event_type        │       │    event          │
│ 🗝️ preprocessing_    │       │    payload (jsonb)│
│    updated_by        │       │    created_at     │
│    created_at        │       └───────────────────┘
└──────┬───────────────┘
       │                        ┌───────────────────┐
       │ 1:N                    │ field_mappings    │
       └───────────────────────►├───────────────────┤
                                │ 🔑 id             │
                                │ 🗝️ webhook_id     │
┌──────────────────────┐        │ 🟩🗝️ workspace_id │
│ webhook_templates    │        │    source_field   │
├──────────────────────┤        │    target_field   │
│ 🔑 id                │        └───────────────────┘
│    name              │
│    description       │
│    template (jsonb)  │
│    created_at        │
└──────────────────────┘
```

### TWILIO & INTEGRATIONS
```
┌───────────────────────────┐         ┌──────────────────────┐
│ workspace_twilio_config   │         │ twilio_numbers       │
├───────────────────────────┤         ├──────────────────────┤
│ 🔑 id                     │         │ 🔑 id                │
│ 🟩🗝️ workspace_id         │         │ 🟩🗝️ workspace_id    │
│    webhook_type           │         │    phone_number      │
│    webhook_url            │         │    friendly_name     │
│    is_configured          │         │    is_active         │
│    account_sid            │         │    created_at        │
│    auth_token             │         └──────────────────────┘
│    created_at             │
└───────────────────────────┘
```

### A2P 10DLC REGISTRATION
```
┌──────────────────────┐         ┌──────────────────────┐
│ a2p_brands           │         │ a2p_campaigns        │
├──────────────────────┤         ├──────────────────────┤
│ 🔑 id                │◄────────┤ 🔑 id                │
│ 🟩🗝️ workspace_id    │   1:N   │ 🟩🗝️ workspace_id    │
│    brand_name        │         │ 🗝️ brand_id (ref)    │
│    ein               │         │    campaign_name     │
│    status            │         │    campaign_type     │
│    twilio_brand_sid  │         │    use_case          │
│    created_at        │         │    status            │
│    updated_at        │         │    twilio_campaign_  │
└──────────────────────┘         │    sid               │
                                 │    created_at        │
                                 │    updated_at        │
                                 └──────────────────────┘
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
