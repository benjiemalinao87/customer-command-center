# Supabase Public Schema: Function & Trigger-to-Table Relationships

## Overview
This document provides a detailed explanation and mapping of all user-defined functions (including triggers) in the `public` schema of your Supabase database, and the tables they interact with. It includes both direct business logic functions and trigger functions that are executed automatically on table events. A Mermaid diagram is included for visual reference.

---

## 1. Application Logic Functions (Direct Calls)
These functions are called explicitly by your application code or other functions, and perform business logic operations:

### `accept_workspace_invite`
- **Reads:** `workspace_invites`, `workspaces`
- **Writes:** `workspace_members` (inserts new member), `workspace_invites` (deletes invite)
- **Purpose:** Handles accepting a workspace invite by validating the token, adding the user to the workspace, and removing the invite.

### `add_user_to_workspace_from_metadata`
- **Reads:** `workspaces`
- **Writes:** `workspace_members`
- **Purpose:** Adds a user to a workspace based on metadata.

### `create_default_workspace_for_user`
- **Writes:** `workspaces`, `workspace_members`, `status_categories`, `status_options`, `user_profiles`
- **Purpose:** Creates a new workspace, default status categories/options, and links user profile.

### `assign_workspace_to_user`
- **Writes:** `workspaces`, `workspace_members`
- **Purpose:** Assigns a user to a newly created workspace.

### `complete_user_onboarding`
- **Writes:** `user_profiles` (updates onboarding status)
- **Purpose:** Marks onboarding as complete for a user.

### `handle_user_registration`
- **Calls:** `assign_workspace_to_user`, `complete_user_onboarding`
- **Purpose:** Orchestrates workspace assignment and onboarding on user registration.

---

## 2. Trigger Functions
These functions are executed automatically on table events (INSERT, UPDATE, DELETE). They typically enforce business rules, update timestamps, or maintain data integrity.

### Example Trigger Functions and Attachments

- **`set_activity_created_by`**: BEFORE INSERT on `activities`. Sets the `created_by` field.
- **`update_updated_at_column`**: BEFORE UPDATE on many tables (e.g., `admins`, `agents`, `status_categories`, etc.). Updates the `updated_at` timestamp.
- **`update_updated_at`**: BEFORE UPDATE on tables like `board_contacts`, `boards`. Updates the `updated_at` timestamp.
- **`update_board_settings_updated_at`**: BEFORE UPDATE on `board_settings`. Updates timestamp.
- **`update_workspace_labels_updated_at`**: BEFORE UPDATE on `workspace_labels`. Updates timestamp.
- **`update_broadcast_timestamp`**: BEFORE UPDATE on `broadcast_queue`. Updates timestamp.
- **`notify_queue_status_change`**: AFTER UPDATE on `broadcast_queue`. Notifies of status changes (may trigger notifications or downstream processes).
- **`notify_recipient_status_change`**: AFTER UPDATE on `broadcast_recipients`. Notifies of recipient status changes.
- **`update_broadcast_status_from_recipients`**: AFTER INSERT on `broadcast_recipients`. Updates parent broadcast status based on recipient events.
- **`check_single_workspace_membership`**: BEFORE INSERT on `workspace_members`. Enforces single workspace membership rule.
- **`enforce_single_workspace_membership`**: BEFORE INSERT on `workspace_members`. Enforces single membership per user.
- **`load_demo_data_on_workspace_creation`**: AFTER INSERT on `workspaces`. Loads demo data for new workspaces.
- **`auto_load_demo_data`**: AFTER INSERT on `workspaces`. Another demo data loader.
- **`handle_workspace_delete`**: AFTER DELETE on `workspaces`. Cleans up related data.
- **`setup_workspace_lead_status`**: AFTER INSERT on `workspaces`. Sets up default lead status for new workspaces.
- **`update_workspace_settings_timestamp`**: BEFORE UPDATE on `workspace_settings`. Updates timestamp.

**Note:** Many trigger functions are variants of timestamp updaters or integrity enforcers, and may be attached to multiple tables.

---

## 3. Mermaid Diagram

```
graph TD
  accept_workspace_invite --> workspace_invites
  accept_workspace_invite --> workspaces
  accept_workspace_invite --> workspace_members
  add_user_to_workspace_from_metadata --> workspaces
  add_user_to_workspace_from_metadata --> workspace_members
  create_default_workspace_for_user --> workspaces
  create_default_workspace_for_user --> workspace_members
  create_default_workspace_for_user --> status_categories
  create_default_workspace_for_user --> status_options
  create_default_workspace_for_user --> user_profiles
  assign_workspace_to_user --> workspaces
  assign_workspace_to_user --> workspace_members
  complete_user_onboarding --> user_profiles
  handle_user_registration --> assign_workspace_to_user
  handle_user_registration --> complete_user_onboarding
  set_activity_created_by --> activities
  update_updated_at_column --> admins
  update_updated_at_column --> agents
  update_updated_at_column --> status_categories
  update_updated_at_column --> status_options
  update_updated_at_column --> unread_messages
  update_updated_at --> board_contacts
  update_updated_at --> boards
  update_board_settings_updated_at --> board_settings
  update_workspace_labels_updated_at --> workspace_labels
  update_broadcast_timestamp --> broadcast_queue
  notify_queue_status_change --> broadcast_queue
  notify_recipient_status_change --> broadcast_recipients
  update_broadcast_status_from_recipients --> broadcast_recipients
  check_single_workspace_membership --> workspace_members
  enforce_single_workspace_membership --> workspace_members
  load_demo_data_on_workspace_creation --> workspaces
  auto_load_demo_data --> workspaces
  handle_workspace_delete --> workspaces
  setup_workspace_lead_status --> workspaces
  update_workspace_settings_timestamp --> workspace_settings
```

---

## 4. How to Use This Map
- Use the Mermaid diagram to visualize which functions (including triggers) interact with which tables.
- This helps in understanding data flow, debugging, and planning migrations or refactors.
- For more detail on what each trigger function does, review the function body in your Supabase SQL editor.

---

## 5. Notes
- This document only covers the `public` schema.
- Some trigger functions may update more than one table; check their source for full details.
- For a full cross-schema map, repeat this process for other schemas as needed.
