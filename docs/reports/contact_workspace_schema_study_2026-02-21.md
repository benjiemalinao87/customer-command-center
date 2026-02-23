# Contact Workspace Schema Study (2026-02-21)

This study maps the core tables for:
- Contacts
- Livechat messages
- Flows and sequences
- Appointments
- Custom field changes
- Link click tracking
- SendGrid/email open-click events

Source: Supabase metadata and SQL introspection on `2026-02-21`.

## 1) Core Tables by Domain

### Contacts and custom fields
- `public.contacts` (est ~160,221 rows)
  - Key columns: `id`, `workspace_id`, `name`, `email`, `phone_number`, `lead_status`, `conversation_status`, `appointment_*`, `last_*`, `tags`, `notes`
- `public.contact_custom_fields` (est ~358,050 rows)
  - Key columns: `contact_id`, `field_id`, `value (jsonb)`, audit timestamps
- `public.contact_field_changes` (est ~930,888 rows)
  - Key columns: `id`, `contact_id`, `workspace_id`, `field_name`, `old_value`, `new_value`, `changed_at`

### Livechat
- `public.livechat_messages` (partitioned parent)
  - Key columns: `id`, `workspace_id`, `contact_id`, `sender`, `direction`, `body`, `status`, `msg_type`, `created_at`
  - Monthly partitions exist from `livechat_messages_2025_04` through `livechat_messages_2026_12`

### Flows and sequences
- `public.flows` (est ~131 rows)
  - Key columns: `id`, `workspace_id`, `name`, `nodes`, `edges`, `settings`
- `public.flow_sequences` (est ~147 rows)
  - Key columns: `id`, `workspace_id`, `name`, `status`, `auto_stop_on_reply`, `settings`, `enrollment_rules`
- `public.flow_sequence_messages` (est ~1,085 rows)
  - Key columns: `id`, `sequence_id`, `order_index`, `message_type`, `text`, `subject`, `connector_id`, `flow_id`
- `public.flow_sequence_executions` (est ~32,843 rows)
  - Key columns: `id`, `workspace_id`, `sequence_id`, `contact_id`, `status`, `started_at`, `completed_at`

Legacy/auxiliary sequence tables still exist:
- `public.sequences`, `public.sequence_messages`, `public.sequence_recipients`, `public.sequence_analytics_cache`, `public.sequence_subscriptions_daily`

### Appointments
- `public.appointments` (est ~8,265 rows)
  - Key columns: `id`, `workspace_id`, `contact_id`, `appointment_date`, `status_id`, `result_id`, `deleted_at`, attribution fields
- `public.appointment_status_history`
  - Tracks status/result transitions and notes over time
- `public.appointment_results`
- `public.appointment_follow_ups`

### Link clicks
- `public.short_link_clicks` (est ~46,687 rows)
  - Key columns: `shortened_link_id`, `workspace_id`, `clicked_at`, geo/device fields
- `public.click_to_text_clicks` (est ~1 row)
- `public.click_to_text_links` (est ~3 rows)
- `public.analytics_sms_clicks_daily` (est ~5,155 rows)
  - Daily aggregated SMS click metrics by flow/message/link

### Email events (open/click)
- `public.sendgrid_events` (est ~111,647 rows)
  - Key columns: `workspace_id`, `event_type`, `timestamp`, `url`, `email_address`, `sg_message_id`
- `public.email_events` (est ~105,638 rows)
  - Key columns: `workspace_id`, `event_type`, `timestamp`, `url`, `email_address`, `message_id`

## 2) Event Type Distribution (Open/Click Focus)

### `sendgrid_events`
- `open`: 18,337
- `click`: 467
- Other major events: `processed`, `delivered`, `deferred`, `dropped`, `bounce`

### `email_events`
- `open`: 17,458
- `click`: 453
- Other major events: `processed`, `delivered`, `deferred`, `dropped`, `bounce`, `spamreport`

## 3) Key Relationships to Preserve in MCP Tools

- `appointments.contact_id -> contacts.id`
- `contact_custom_fields.contact_id -> contacts.id`
- `contact_custom_fields.field_id -> custom_fields.id`
- `flow_sequence_messages.sequence_id -> flow_sequences.id`
- `flow_sequence_messages.flow_id -> flows.id`
- `flow_sequence_executions.sequence_id -> flow_sequences.id`
- `short_link_clicks.shortened_link_id -> shortened_links.id`
- `click_to_text_clicks.link_id -> click_to_text_links.id`
- `analytics_sms_clicks_daily.workspace_id -> workspaces.id`

## 4) Operational Notes for MCP

- Many operational tables are workspace-scoped via `workspace_id`; enforce workspace guards in every MCP tool.
- `livechat_messages` is partitioned by month; query parent table with date predicates for efficient pruning.
- Keep write tools narrow and explicit (contact updates, sequence status changes, appointment status updates).
- Email open/click metrics should read both `sendgrid_events` and `email_events` for consistency.

