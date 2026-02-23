# SOP: Workspace MCP Access for Staff

Document owner: Operations + Platform Engineering
Last updated: 2026-02-23
Applies to: Staff using MCP tools to manage client workspaces

## 1) Purpose

This SOP explains how staff access and use the Workspace MCP server safely.
It defines:
- Who gets read vs write access
- How access is granted per workspace
- How requests flow from frontend/backend to data
- What to do when access fails

## 2) Scope

In scope:
- Workspace MCP API key usage
- Read and write permission model
- Supported tool usage patterns
- Operational troubleshooting and escalation

Out of scope:
- Supabase schema changes
- Cloudflare infrastructure changes unrelated to MCP auth

## 3) Roles and Responsibilities

- Platform Admin
  - Creates and rotates MCP API keys
  - Manages per-workspace `read`/`write` in Command Center `MCP Access`
  - Controls global write switch and Worker config
- Team Lead
  - Approves staff write access requests
  - Reviews quarterly access posture
- Staff User
  - Uses only assigned workspace access
  - Follows read-first workflow unless write is required

## 4) Access Model (Source of Truth)

Worker permission source mode:
- `MCP_PERMISSION_SOURCE=auto|db|env` (production uses `auto`)

Primary runtime source (recommended):
- Supabase tables:
  - `mcp_api_keys`
  - `mcp_workspace_permissions`
- Managed from Command Center UI:
  - Sidebar: `Admin` -> `MCP Access`

Global write switch:
- `MCP_ENABLE_WRITE_TOOLS=true|false`

Fallback source (legacy env mode):
- `MCP_API_KEYS`
- `MCP_WORKSPACE_PERMISSIONS_JSON`
- `MCP_WORKSPACE_SCOPE_JSON` (read-only fallback)

### DB role model

`mcp_api_keys`:
- `default_role`: `none | read | write`
- `wildcard_role`: `read | write | null`
- `is_active`: key enabled/disabled

`mcp_workspace_permissions`:
- per key + workspace exact role: `read | write`

Role resolution order:
1. Exact workspace role (`mcp_workspace_permissions`)
2. Wildcard role (`mcp_api_keys.wildcard_role`)
3. Default role (`mcp_api_keys.default_role`)
4. Deny

## 5) Authorization State Machine (ASCII)

```
+--------------------+
| MCP Request Arrives|
+---------+----------+
          |
          v
+----------------------------------------------+
| Resolve permission source (auto/db/env mode) |
+-----------+----------------------------------+
            |
            v
+-------------------------------+
| API key valid in active source|
+-----------+-------------------+
            |yes                              no
            v                             v
+-----------------------------+    +------------------+
| tools/call requires         |    | DENY (403)       |
| workspace_id for this tool? |    | invalid API key  |
+-----------+-----------------+    +------------------+
            |yes                          |
            v                             |
+-----------------------------+           |
| workspace_id provided ?     |<----------+
+-----------+-----------------+
            |yes                          no
            v                             v
+-----------------------------+    +-----------------------------+
| Resolve role:               |    | DENY (400)                 |
| exact -> wildcard -> default|    | missing required workspace |
+-----------+-----------------+    +-----------------------------+
            |
            v
+-----------------------------+
| Tool access type?           |
| read or write               |
+-----------+-----------------+
            |read                          write
            v                              v
+-----------------------------+    +------------------------------+
| role is read or write ?     |    | MCP_ENABLE_WRITE_TOOLS=true? |
+-----------+-----------------+    +-----------+------------------+
            |yes                          |yes             no
            v                             v                v
+-----------------------------+    +------------------+  +------------------+
| ALLOW (execute tool)        |    | role is write ?  |  | DENY (403)       |
+-----------------------------+    +--------+---------+  | write disabled   |
                                           |yes     no   +------------------+
                                           v        v
                                  +----------------+ +------------------+
                                  | ALLOW          | | DENY (403)       |
                                  | execute tool   | | write forbidden  |
                                  +----------------+ +------------------+
```

## 6) Frontend/Backend Data Flow (ASCII)

```
[Staff User]
    |
    | action in internal app / assistant
    v
[Frontend or Internal Client]
    |
    | HTTPS JSON-RPC + Authorization: Bearer <api_key>
    v
[Workspace MCP Worker (Cloudflare)]
    |
    | 1) resolve permission source (auto/db/env)
    | 2) validate key
    | 3) resolve workspace role
    | 4) enforce read/write policy + global write switch
    v
[Tool Handler]
    |
    | Supabase service-role query/update (workspace-scoped)
    v
[Supabase Postgres]
    |
    +--> returns rows / update result

Response path:
Supabase -> MCP Worker -> Frontend/Internal Client -> Staff User
```

Admin management flow:

```
[SaaS Owner]
    |
    | Command Center -> Admin -> MCP Access
    v
[Admin API /api/admin/mcp-permissions/*]
    |
    | create/update key + workspace grants
    v
[Supabase tables]
  - mcp_api_keys
  - mcp_workspace_permissions
    |
    +--> Worker reads live permissions (no redeploy required for grant changes)
```

## 7) Daily Operating Procedure for Staff

1. Confirm target `workspace_id` before running any tool.
2. Start with read tools first (`get_*` style tools).
3. Use write tools only for approved workspace actions.
4. For write actions, capture change context in ticket/task notes.
5. If denied, do not retry with alternate keys unless approved by admin.

## 8) Access Request Procedure

### Read access request
1. Staff submits request with:
   - Workspace ID(s)
   - Business reason
   - Duration (temporary or permanent)
2. Team Lead approves.
3. Platform Admin updates access in Command Center `MCP Access`.

### Write access request
1. Include all read request fields plus:
   - Exact operations needed
   - Risk/rollback plan
2. Team Lead + Platform approval required.
3. Platform Admin grants `write` for required workspace(s) in `MCP Access`.

## 9) Change Management for Admins

1. Open Command Center -> `Admin` -> `MCP Access`.
2. Create or select MCP key.
3. Set `default_role` and optional `wildcard_role`.
4. Set exact workspace roles (`read` or `write`).
5. Save changes.
6. Run quick checks:
   - read key can read expected workspace
   - read key cannot write
   - write key can write when switch is true
   - write key blocked when switch is false
7. Record change in audit log/ticket.

Notes:
- In DB mode, workspace grant changes are live immediately (no Worker deploy needed).
- Worker deploy is only needed for code/config changes (for example changing `MCP_PERMISSION_SOURCE` or `MCP_ENABLE_WRITE_TOOLS` var).

## 10) Break-Glass Controls

- To stop all writes immediately:
  - Set `MCP_ENABLE_WRITE_TOOLS=false`
  - Deploy config
- Expected effect:
  - All write tools return `403`
  - Read tools continue to work

## 11) Troubleshooting

- Error: `403 invalid API key`
  - Key is not active in current source (`mcp_api_keys` in DB mode, or `MCP_API_KEYS` in env mode)
- Error: `400 missing workspace_id`
  - Tool requires `workspace_id` argument
- Error: `403 read/write denied`
  - Role resolution did not permit requested action
- Error: `403 write disabled`
  - `MCP_ENABLE_WRITE_TOOLS=false`
- Error: `MCP_PERMISSION_TABLES_MISSING`
  - Missing `mcp_api_keys`/`mcp_workspace_permissions` tables
  - Apply migration and retry
- Error: malformed permissions JSON (env mode only)
  - Fix `MCP_WORKSPACE_PERMISSIONS_JSON` syntax and redeploy

## 12) Security and Compliance Notes

- API keys are secrets. Store only in restricted internal docs (like this SOP); do not paste into tickets, public chat, or external docs.
- Command Center displays full key only at creation time. Copy/store securely immediately.
- Use least privilege: default `none`, explicit workspace grants.
- Prefer temporary write access for high-risk operations.
- Review key and workspace access at least quarterly.

## 13) Quick Reference

Read-only tools:
- `list_workspaces`, `resolve_nl_prompt`, `get_analytics_dashboard`, `get_contact_counts`, `get_contacts_filtered`, `get_custom_field_catalog`, `get_contacts`, `get_livechat_messages`, `get_flows`, `get_flow_sequences`, `get_flow_sequence_executions`, `get_appointments`, `get_contact_field_changes`, `get_contact_custom_fields`, `get_link_clicks`, `get_email_engagement`, `get_workspace_data_footprint`

Write tools:
- `update_contact_fields`, `update_flow_sequence_status`, `update_appointment_status`, `upsert_contact_custom_field`

Complete MCP tool catalog (`tools/list`):
- `list_workspaces` | `read` | workspace required: `no`
- `resolve_nl_prompt` | `read` | workspace required: `no`
- `get_analytics_dashboard` | `read` | workspace required: `yes`
- `get_contact_counts` | `read` | workspace required: `yes`
- `get_contacts_filtered` | `read` | workspace required: `yes`
- `get_custom_field_catalog` | `read` | workspace required: `yes`
- `get_contacts` | `read` | workspace required: `yes`
- `update_contact_fields` | `write` | workspace required: `yes`
- `get_livechat_messages` | `read` | workspace required: `yes`
- `get_flows` | `read` | workspace required: `yes`
- `get_flow_sequences` | `read` | workspace required: `yes`
- `update_flow_sequence_status` | `write` | workspace required: `yes`
- `get_flow_sequence_executions` | `read` | workspace required: `yes`
- `get_appointments` | `read` | workspace required: `yes`
- `update_appointment_status` | `write` | workspace required: `yes`
- `get_contact_field_changes` | `read` | workspace required: `yes`
- `get_contact_custom_fields` | `read` | workspace required: `yes`
- `upsert_contact_custom_field` | `write` | workspace required: `yes`
- `get_link_clicks` | `read` | workspace required: `yes`
- `get_email_engagement` | `read` | workspace required: `yes`
- `get_workspace_data_footprint` | `read` | workspace required: `yes`

Flow/sequence filter quick guide:
- `get_analytics_dashboard`: when `include_appointment_details=true`, use `limit` + `details_offset` for paged detail rows.
- `get_flows`: supports `search` (flow name contains)
- `get_flow_sequences`: supports `search` (sequence name contains)
- `get_appointments` attribution filters:
  - Sequence: `sequence_id`, `sequence_name`
  - Campaign alias: `campaign_name` (maps to sequence name semantics)
  - Flow Builder: `flow_id`, `flow_name` (mapped to related sequence enrollment)
- When any of `sequence_*`, `campaign_name`, or `flow_*` is provided, MCP uses sequence attribution scope (`attribution_type=sequence`) and `attributed_only=true` unless explicitly overridden.
- If both flow and sequence filters are provided together, MCP narrows to the intersection (prevents mixed attribution inflation).
- `get_contacts_filtered` is cursor-based and returns:
  - `page.next_cursor` (use for next page)
  - `notes.non_archived_only=true` (archived contacts are excluded by RPC design)
  - no total matched count in MVP

Contact-focused tool quick workflow:
1. Discover fields first:
   - `/tool get_custom_field_catalog {"workspace_id":"15213","object_type":"contact","active_only":true,"search":"arrival","limit":200}`
2. Run advanced filtered contact query:
   - `/tool get_contacts_filtered {"workspace_id":"15213","limit":50,"filters":{"lead_status":{"operator":"in","values":["Prospect Arrival","Appointment Set"]},"appointments":{"has":"any"}}}`
3. Pull fast totals/breakdowns:
   - `/tool get_contact_counts {"workspace_id":"15213","include_lead_status_breakdown":true}`

## 14) Business Metrics Prompt Library (Owner / Manager / Admin)

Use these natural-language prompts in MCP Chat. Replace `15213` with your target workspace.

Owner perspective (business health + KPI snapshot):
- `business metrics overview for workspace 15213`
- `analytics dashboard for workspace 15213`
- `/analytics-dashboard workspace 15213`
- `executive KPI summary for workspace 15213 this month`
- `email engagement KPI for workspace 15213 last 30 days`
- `link click performance for workspace 15213 this week`
- `show me 10 future appointments for workspace 15213`
- `lead status breakdown for workspace 15213`
- `workspace data footprint for workspace 15213`
- `show conversion proxy using leads and appointments for workspace 15213`

Manager perspective (pipeline + operations):
- `show top 25 contacts in workspace 15213`
- `lead status breakdown for workspace 15213`
- `how many leads in workspace 15213`
- `contact counts for workspace 15213`
- `show me 5 upcoming appointments in workspace 15213`
- `show contacts in sequence 738d6d85-9fa3-4b60-856d-28ffab3f6574 with appointments in workspace 15213`
- `show contacts with lead score > 50 in workspace 15213`
- `show contacts with keyword "vip" in workspace 15213 messages`
- `appointments for workspace 15213 next 14 days`
- `show me prospect arrival flow in workspace 15213`
- `show me count of appointments for Prospect Arrival flow in workspace 15213`
- `show me count of appointments for Prospect Arrival sequence in workspace 15213`
- `livechat messages for workspace 15213 last 7 days limit 30`
- `email open and click rates for workspace 15213 this week`
- `sequence executions for workspace 15213 limit 25`
- `flow sequences for workspace 15213 status active`

Admin perspective (access + data integrity + volume):
- `list workspaces`
- `workspace data footprint for workspace 15213`
- `contact field change history for workspace 15213 last 7 days`
- `link clicks for workspace 15213 today`
- `sendgrid open and click events for workspace 15213 this month`
- `show contacts in workspace 15213 limit 50`
- `list custom fields for workspace 15213`
- `custom field catalog for workspace 15213 search "arrival"`
- `field id for Prospect Arrival in workspace 15213`
- `appointments in workspace 15213 from 2026-02-01 to 2026-02-29`

Question matrix (use this to form virtually all business-metric questions):
- Scope: `workspace <id>`
- Metric family:
  - `contacts/leads/pipeline`
  - `appointments/bookings/future schedule`
  - `email engagement (open/click/delivered)`
  - `link clicks (short link/click-to-text/SMS)`
  - `livechat message activity`
  - `flow/sequence operational activity`
  - `workspace data footprint`
- Shape:
  - `show top <N> ...`
  - `breakdown by ...`
  - `overview/summary/KPI ...`
  - `compare ... this week vs last week`
  - `trend ... last <N> days`
- Time window:
  - relative (`today`, `this week`, `last 30 days`, `next 14 days`)
  - absolute (`from YYYY-MM-DD to YYYY-MM-DD`)

Supported time phrases:
- `today`, `yesterday`, `tomorrow`
- `this week`, `last week`
- `this month`, `last month`
- `last N days`, `next N days`
- explicit dates: `YYYY-MM-DD` (one date or a start/end pair)

Planner behavior:
- MCP Chat now uses an LLM planner with a dedicated system prompt.
- For simple asks, MCP Chat uses a fast local parser first (no LLM round-trip).
- For complex/cross-metric asks, planner runs and may choose one tool or multi-tool workflow.
- For cross-metric asks (for example "owner KPI overview"), planner can run a multi-tool workflow and return a combined console output.
- For `/analytics-dashboard` prompts, MCP can use `get_analytics_dashboard` to return the same Client KPI V3 data model used by the dashboard UI.

## 15) Production Test Keys (Internal Restricted)

Do not share outside authorized internal staff.
If these are exposed, rotate immediately in Cloudflare Worker secrets.

- READ key (workspaces `76692` + `15213`, read only):
  - `1f23917af51cfbc0e6154e95b32e6a201f1ea548769a06f4`
- WRITE key (workspaces `76692` + `15213`, write enabled only when `MCP_ENABLE_WRITE_TOOLS=true`):
  - `50bc4b46ff486f9603f0f974ebb7e02d2d9e7055e7cb8472`

Current workspace scope (as of 2026-02-22):
- READ key:
  - `76692`: `read`
  - `15213`: `read`
- WRITE key:
  - `76692`: `write`
  - `15213`: `write`

Use in MCP clients:
- Header: `Authorization: Bearer <KEY>`

## 16) Claude Code Setup (Real Usage)

Use this when connecting staff keys to Claude Code.

### Prerequisites

1. Claude Code is installed and working.
2. You have:
   - MCP endpoint: `https://mcp.customerconnects.app/mcp`
   - A valid MCP key from Command Center (`Admin` -> `MCP Access`)

### A) Add branded server to Claude Code (recommended)
Run this in terminal:

```bash
claude mcp add --scope user --transport http customer-connect-mcp https://mcp.customerconnects.app/mcp --header "Authorization: Bearer <YOUR_MCP_KEY>"
```

Notes:
- Replace `<YOUR_MCP_KEY>` with the full key value.
- Do not commit keys to git or paste in public channels.
- Claude MCP names cannot contain spaces. Use letters/numbers/hyphens/underscores only.
- Branding standard in this SOP: `customer-connect-mcp`.

### B) Verify registration

```bash
claude mcp list
claude mcp get customer-connect-mcp
```

You should see an HTTP MCP server entry named `customer-connect-mcp`.

### C) If you already added `workspace-mcp`, rename it

```bash
claude mcp remove workspace-mcp
claude mcp add --scope user --transport http customer-connect-mcp https://mcp.customerconnects.app/mcp --header "Authorization: Bearer <YOUR_MCP_KEY>"
```

### D) Run a live permission test in Claude Code

1. Start Claude Code:

```bash
claude
```

2. In Claude Code, run:
   - `list_workspaces`
   - `get_contacts` with a known workspace, e.g. `workspace_id=15213`

3. Permission validation:
   - If using a READ key, any write tool (example: `update_contact_fields`) must return `403`.
   - If using a WRITE key and writes are globally enabled, write tools should succeed on allowed workspace(s).

### E) Rotate or revoke

1. In Command Center:
   - disable/delete old key
   - create replacement key
2. Update Claude Code config by removing and re-adding:

```bash
claude mcp remove customer-connect-mcp
claude mcp add --scope user --transport http customer-connect-mcp https://mcp.customerconnects.app/mcp --header "Authorization: Bearer <NEW_MCP_KEY>"
```

### F) Troubleshooting

- `403 invalid API key`:
  - key is wrong/inactive, or copied with extra spaces
- `403 write denied`:
  - key is read-only for that workspace, or write not granted
- `403 write disabled`:
  - global flag `MCP_ENABLE_WRITE_TOOLS=false`
- Server connects but no expected data:
  - run `list_workspaces` first to confirm this key can access target workspace
