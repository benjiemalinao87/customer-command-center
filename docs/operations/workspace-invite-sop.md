# Workspace Invitation System - Standard Operating Procedure

## Overview

This document outlines the complete workflow for inviting new members to a workspace within the LiveChat application. The system uses a direct user creation approach that generates credentials for new users and provides direct workspace access, removing the need for email-based invitations.

> **Updated:** The system now uses a robust multi-layered approach to user creation with proper error handling and fallback mechanisms.

## Table of Contents

1. [Files Involved](#files-involved)
2. [Database Tables](#database-tables)
3. [Key Functions](#key-functions)
4. [Frontend Flow](#frontend-flow)
5. [Backend Flow](#backend-flow)
6. [User Flow](#user-flow)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)
9. [Recent Updates](#recent-updates)

## Files Involved

### Frontend Files

1. **frontend/src/components/windows/SettingsWindow.js**
   - Contains the UI for the member invitation system
   - Manages team member display, invitation modal, and credential display
   - Handles copy-to-clipboard functionality for sharing credentials

2. **frontend/src/services/workspace.js**
   - Implements the invitation functionality through the `inviteToWorkspace` function
   - Handles adding members to workspaces
   - Manages workspace membership and permissions

3. **frontend/src/pages/auth/signup.js**
   - Handles the signup flow for users who have been invited
   - Processes invitation tokens if a user follows a legacy invitation link

4. **frontend/src/pages/auth/check-email.js**
   - Confirmation page shown after a user signs up

5. **frontend/src/pages/invite.js**
   - Landing page for legacy invitation links
   - Redirects to signup with appropriate parameters

6. **frontend/src/App.js** and **frontend/src/AppRoutes.js**
   - Handle routing for invitation links
   - Contain redirect logic for invite links

### Backend Files

1. **backend/migrations/12_update_workspace_invites_table.sql**
   - SQL migration that created the workspace_invites table structure
   - Defines the RPC functions for handling invites

2. **supabase/migrations/add_direct_user_creation.sql**
   - SQL migration that created the function for direct user creation

## Database Tables

1. **auth.users** (Supabase Auth)
   - Core user authentication records
   - Contains email, password hash, and basic user information
   - Created automatically when a new user is invited

2. **workspace_members**
   - Primary table linking users to workspaces
   - Contains workspace_id, user_id, and role information
   - Key fields:
     - `workspace_id`: Foreign key to workspaces table
     - `user_id`: Foreign key to auth.users (UUID)
     - `role`: Text field with values 'admin' or 'agent'
     - `created_at`: Timestamp
     - `updated_at`: Timestamp

3. **workspace_invites**
   - Tracks invitation information
   - Used for record-keeping and for the legacy invitation link system
   - Key fields:
     - `id`: Primary key (UUID)
     - `workspace_id`: Foreign key to workspaces (UUID format)
     - `text_workspace_id`: Text version of workspace ID
     - `email`: Email address of invitee
     - `role`: Intended role (admin or agent)
     - `token`: Unique invitation token
     - `expires_at`: Timestamp when invitation expires
     - `created_at`: Timestamp

4. **user_profiles**
   - Stores additional user profile information
   - Connected to auth.users through user_id

5. **user_profiles_with_workspace**
   - View or related table joining user profiles with workspace information

## Key Functions

### Frontend Functions

1. **inviteToWorkspace** (`workspace.js`)
   ```javascript
   async inviteToWorkspace(workspaceId, email, role)
   ```
   - Primary function for inviting users
   - Generates a secure password for new users
   - Multi-layered approach to user creation:
     1. First tries Admin API to check if user exists
     2. If user doesn't exist, creates them with Admin API
     3. Falls back to using the public signup endpoint if Admin API is unavailable
   - Adds the user to the workspace
   - Returns credentials for new users

2. **handleAddMember** (`SettingsWindow.js`)
   ```javascript
   const handleAddMember = async () => { ... }
   ```
   - UI handler for adding members
   - Calls the inviteToWorkspace function
   - Displays credentials modal when successful

3. **copyCredentials** (`SettingsWindow.js`)
   ```javascript
   const copyCredentials = (text) => { ... }
   ```
   - Copies credentials to clipboard for easy sharing

### Backend Functions

1. **create_workspace_user** (SQL function)
   ```sql
   CREATE OR REPLACE FUNCTION create_workspace_user(
     p_email TEXT,
     p_workspace_id TEXT,
     p_role TEXT DEFAULT 'agent'
   ) RETURNS JSON
   ```
   - Generates credentials and handles user creation
   - Returns JSON with user information and credentials

2. **accept_workspace_invite** (SQL function)
   ```sql
   CREATE OR REPLACE FUNCTION accept_workspace_invite(
     p_token TEXT, 
     p_user_id UUID
   ) RETURNS BOOLEAN
   ```
   - Legacy function for the old invitation system
   - Accepts an invitation token and adds the user to workspace

3. **check_invite_by_token** (SQL function)
   ```sql
   CREATE OR REPLACE FUNCTION check_invite_by_token(
     p_token TEXT
   ) RETURNS TABLE (...)
   ```
   - Checks if an invitation token is valid
   - Returns invitation details including workspace name

## Frontend Flow

```
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ SettingsWindow  │────▶│ Add Member Modal   │────▶│ addWorkspaceMember │
│ (Team Section)  │     │ (Email, Role Form) │     │   (Workspace.js)   │
│                 │     │                    │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ Display         │◀────│ Generate User      │◀────│ inviteToWorkspace  │
│ Credentials     │     │ Credentials        │     │   (Create User)    │
│ to Admin        │     │                    │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
```

## Backend Flow

```
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ inviteToWorkspace│────▶│Check if User Exists│────▶│ Create User Account│
│ Function Called │     │ (Admin API)        │     │ (If not exists)    │
│                 │     │                    │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ Return          │◀────│ Add Member to      │◀────│ Fallback to Signup │
│ Credentials     │     │ workspace_members  │     │ API if needed      │
│                 │     │                    │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
```

## User Flow

```
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ Admin invites   │────▶│ System creates     │────▶│ Admin receives     │
│ new user        │     │ user account       │     │ user credentials   │
│                 │     │                    │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐     ┌────────────────────┐     ┌────────────────────┐
│                 │     │                    │     │                    │
│ User logs in    │◀────│ Admin shares       │◀────│ Admin copies       │
│ with credentials│     │ credentials        │     │ credentials        │
│                 │     │ with user          │     │                    │
└─────────────────┘     └────────────────────┘     └────────────────────┘
                                │
                                ▼
┌────────────────────────────────────────────────┐
│                                                │
│ User has immediate access to workspace         │
│ with the assigned role (admin or agent)        │
│                                                │
└────────────────────────────────────────────────┘
```

## Troubleshooting

### Common Issues

1. **Credentials Not Displayed**
   - Problem: After inviting a user, no credentials are displayed
   - Solution: Check if the user already exists in the system. Existing users don't generate new credentials.
   - Verification: Check the auth.users table to see if the email exists

2. **User Cannot Access Workspace**
   - Problem: User logs in but doesn't see the workspace
   - Solution: Verify that the user was properly added to workspace_members table
   - Query: 
     ```sql
     SELECT * FROM workspace_members 
     WHERE user_id = '[USER_UUID]';
     ```

3. **Admin API Not Available Error**
   - Problem: Error about Admin API not being available
   - Solution: The system falls back to using RPC functions to create users directly in the database. 
     If this fails as well, it will generate temporary credentials and store them in workspace_invites.
   - Verification: Check the logs for any errors related to user creation.

4. **Invalid Login Credentials Error**
   - Problem: User tries to log in with the provided credentials but gets "Invalid login credentials"
   - Solution: This issue has been fixed in the latest version. The system now:
     - Uses Admin API directly for user creation
     - Has a fallback to the public signup endpoint if Admin API is unavailable
     - Properly sets user passwords during creation
     - Includes comprehensive error handling
   - Verification: Check if the user exists in auth.users table before attempting login

5. **Frontend Shows "Already Member" Error**
   - Problem: Error message indicating user is already in another workspace
   - Reason: The system enforces one workspace per user
   - Solution: User must use a different email address or be removed from their current workspace

### RPC Functions

The system uses the following RPC functions to handle user creation and workspace membership:

1. **create_workspace_user**
   - Purpose: Create a user and add them to a workspace in one operation
   - Parameters:
     - p_email: The user's email address
     - p_workspace_id: The workspace ID
     - p_role: The user's role (admin or agent)
   - Returns: JSON with user credentials and workspace information

2. **create_user**
   - Purpose: Fallback function to create a user directly in auth.users
   - Parameters:
     - email_param: The user's email address
     - password_param: The generated password
     - is_admin: Whether the user should be an admin
   - Returns: JSON with user ID and creation timestamp

## Security Considerations

1. **Password Security**
   - Generated passwords use a combination of lowercase, uppercase, and special characters
   - Recommend users change their password after first login
   - Passwords are never stored in plaintext in the database

2. **Credential Sharing**
   - Credentials are only displayed once to the admin
   - Advise admins to use secure channels for sharing credentials
   - Consider implementing a secure credential sharing system in future updates

3. **Workspace Access Control**
   - Roles (admin, agent) control what users can access
   - Row-level security policies in Supabase enforce access control
   - Users can only see data from their own workspace

## Implementation Notes for Developers

1. The system uses direct user creation instead of email-based invites to avoid redirect issues and simplify the user onboarding flow.

2. Legacy code for handling invitation links is maintained for backward compatibility but may be removed in future updates.

3. The system depends on Supabase Auth and Database services. Changes to these systems may require updates to the invitation workflow.

4. Consider future enhancements:
   - Email notification system for new users
   - Self-service password reset flow
   - Temporary credential expiration 

## Recent Updates

### May 2023 System Improvements

1. **Robust User Creation Process**
   - Implemented a multi-layered approach for creating users:
     - Primary: Supabase Admin API for direct user creation and password setting
     - Secondary: Fallback to public signup endpoint if Admin API is unavailable
   - Removed dependency on RPC functions that were causing password encryption issues

2. **Enhanced Error Handling**
   - Added proper error catching and logging at each step of the process
   - Improved user feedback for various error scenarios
   - Fixed "Invalid login credentials" issues by ensuring passwords are correctly set

3. **User Verification Improvements**
   - Enhanced the way we check for existing users using the Admin API
   - More reliable user ID extraction for existing users
   - Better handling of edge cases like duplicate accounts

4. **Security Enhancements**
   - Improved password generation with better entropy
   - More secure credential handling
   - Cleaner code with fewer security vulnerabilities

### Technical Implementation Details

The updated invitation system now follows this sequence:

1. Generate a secure password with lowercase, uppercase, and special characters
2. Check if user exists using Supabase Admin API's listUsers method
3. If user doesn't exist, create them using createUser Admin API method
4. If Admin API is unavailable, fall back to public signup endpoint
5. Add user to workspace once account is created
6. Return credentials only for new users

This approach ensures higher reliability while maintaining security and simplicity of the user onboarding experience. 