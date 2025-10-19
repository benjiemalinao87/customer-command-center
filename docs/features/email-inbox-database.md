# Email Inbox Database System

## Overview

The Email Inbox Database System provides a comprehensive foundation for email management within the CRM platform. It supports multiple email accounts per workspace, folder organization, email threading, contact integration, and workspace-aware isolation following the `company_name@customerconnects.app` sender format.

## Database Architecture

### Core Tables

#### 1. `email_accounts`
Stores email account configurations for each workspace with SMTP/IMAP and OAuth support.

**Key Features:**
- Multiple accounts per workspace
- SMTP/IMAP configuration with encrypted passwords
- OAuth support for Gmail/Outlook
- Account status and sync management
- Workspace isolation via `workspace_id`

**Example Email Sender Generation:**
- Company: "ScaleMatch" → Email: `scalematch@customerconnects.app`
- Company: "CHAU" → Email: `chau@customerconnects.app`

#### 2. `email_folders`
Email folder organization supporting both system and custom folders.

**System Folders (auto-created):**
- Inbox (`inbox`)
- Sent (`sent`) 
- Drafts (`drafts`)
- Starred (`starred`)
- Archive (`archive`)
- Trash (`trash`)

**Features:**
- Custom folder support
- Icon and color customization
- Sort ordering
- Visibility controls

#### 3. `emails`
Individual email messages with full CRM integration.

**Key Integrations:**
- **Contact Linking**: Automatic linking via `contact_id` to `contacts.id`
- **Thread Support**: Groups related emails via `thread_id`
- **Folder Organization**: Organized via `folder_id`
- **Priority & Labels**: Support for email prioritization and custom labels
- **Attachments**: Linked via `email_attachments` table

**Email Status Tracking:**
- Read/Unread status
- Starred/Important flags
- Draft/Sent status
- Priority levels (low, normal, high, urgent)

#### 4. `email_threads`
Groups related emails together for conversation views.

**Features:**
- Subject-based grouping
- Thread status aggregation
- Participant tracking
- Last message timestamps

#### 5. `email_attachments`
Handles email attachments with security scanning.

**Features:**
- File metadata and storage paths
- Inline attachment support
- Security scanning status
- Multiple storage providers (Supabase, S3, local)

### Supporting Tables

- **`email_actions`**: Tracks user actions for analytics and undo functionality
- **`email_templates`**: Reusable email templates with usage tracking
- **`email_signatures`**: Account-specific email signatures

## Workspace Integration

### Email Sender Generation

The system automatically generates email senders using the format:
```
{sanitized_company_name}@customerconnects.app
```

**Process:**
1. Extract company name from `onboarding_responses.response->>'company_name'`
2. Sanitize: lowercase, remove special chars, remove spaces
3. Append `@customerconnects.app` domain
4. Store in `workspaces.email_sender`

**Examples from Production Data:**
```sql
-- Workspace ID: 90941, Company: "ScaleMatch"
-- Generated: scalematch@customerconnects.app

-- Workspace ID: 75783, Company: "CHAU" 
-- Generated: chau@customerconnects.app
```

### Workspace Isolation

All tables implement Row Level Security (RLS) with workspace-aware policies:

```sql
CREATE POLICY "Workspace access" ON emails FOR ALL USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);
```

## Contact Integration

### Automatic Contact Linking

The system automatically links emails to CRM contacts using:

1. **Direct Email Match**: `contacts.email = emails.from_email`
2. **Recipient Match**: `contacts.email` matches any email in `to_emails` array
3. **Workspace Scoped**: Only matches within the same workspace

**Trigger Implementation:**
```sql
CREATE TRIGGER link_email_to_contact_trigger 
    AFTER INSERT ON emails 
    FOR EACH ROW EXECUTE FUNCTION link_email_to_contact();
```

### Contact Data Structure Reference

Based on the existing `contacts` table:
- **Primary Key**: `id` (UUID)
- **Email Field**: `email` (text, nullable)
- **Workspace Isolation**: `workspace_id` (text)
- **Name Fields**: `name`, `firstname`, `lastname`
- **Additional CRM Fields**: Lead status, priority, tags, etc.

## Performance Optimizations

### Indexes

```sql
-- Core performance indexes
CREATE INDEX idx_emails_workspace_account ON emails(workspace_id, email_account_id);
CREATE INDEX idx_emails_folder_received ON emails(folder_id, received_at DESC);
CREATE INDEX idx_emails_contact ON emails(contact_id) WHERE contact_id IS NOT NULL;

-- Status-based indexes
CREATE INDEX idx_emails_unread ON emails(workspace_id, is_read) WHERE is_read = false;
CREATE INDEX idx_emails_starred ON emails(workspace_id, is_starred) WHERE is_starred = true;

-- Search indexes (for future full-text search)
CREATE INDEX idx_emails_from_email ON emails(from_email);
```

### Useful Views

#### `email_list_view`
Comprehensive email list with contact and folder information:
```sql
SELECT 
    e.*,
    f.name as folder_name,
    f.folder_type,
    c.name as contact_name,
    w.email_sender as workspace_sender
FROM emails e
LEFT JOIN email_folders f ON e.folder_id = f.id
LEFT JOIN email_accounts ea ON e.email_account_id = ea.id
LEFT JOIN contacts c ON e.contact_id = c.id
LEFT JOIN workspaces w ON e.workspace_id = w.id;
```

#### `folder_unread_counts`
Real-time folder statistics:
```sql
SELECT 
    f.id as folder_id,
    f.name as folder_name,
    COUNT(e.id) as unread_count,
    COUNT(e.id) FILTER (WHERE e.is_starred = true) as starred_count
FROM email_folders f
LEFT JOIN emails e ON f.id = e.folder_id AND e.is_read = false
GROUP BY f.id, f.name, f.folder_type;
```

## Automated Functionality

### Default Folder Creation

When an email account is created, the system automatically creates standard folders:

```sql
-- Triggered on email_accounts INSERT
PERFORM create_default_email_folders(NEW.workspace_id, NEW.id);
```

### Thread Status Updates

Email thread status automatically updates when individual emails change:
- Thread read status = ALL emails in thread are read
- Thread starred status = ANY email in thread is starred
- Last message timestamp = MAX(sent_at) of all emails

### Email Sender Updates

Workspace email senders automatically update when onboarding responses change:

```sql
CREATE TRIGGER update_workspace_email_sender_trigger
    AFTER INSERT OR UPDATE ON onboarding_responses
    FOR EACH ROW EXECUTE FUNCTION update_workspace_email_sender();
```

## Security Features

### Row Level Security (RLS)

All tables implement workspace-aware RLS policies ensuring:
- Users only access emails within their workspace memberships
- Complete data isolation between workspaces
- Secure contact linking within workspace boundaries

### Attachment Security

Email attachments include security scanning:
- `is_scanned`: Boolean flag for scan completion
- `scan_result`: 'clean', 'threat', or 'pending'
- File type validation via `content_type`

## Integration Points

### Frontend Integration

The database supports the existing email inbox UI components:
- **EmailInboxWindow.js**: Main container queries `email_list_view`
- **EmailSidebar.js**: Uses `folder_unread_counts` for badges
- **EmailList.js**: Displays emails with contact information
- **EmailViewer.js**: Shows email content with attachment support

### API Integration Points

Ready for future Cloudflare Email Worker integration:
- **Inbound Email Processing**: Parse and store via `emails` table
- **Contact Auto-linking**: Automatic CRM integration
- **Folder Organization**: Automatic folder assignment
- **Thread Grouping**: Subject-based conversation threading

### CRM Integration

Deep integration with existing CRM functionality:
- **Contact Records**: Bidirectional linking with contact management
- **Lead Tracking**: Email history visible in contact profiles  
- **Activity Logging**: Email actions tracked via `email_actions`
- **Template System**: Reusable templates for common communications

## Monitoring and Analytics

### Email Actions Tracking

All user interactions are logged in `email_actions`:
- Read/unread actions
- Star/unstar operations
- Archive/delete actions
- Folder moves and label changes
- Old/new value tracking for undo functionality

### Usage Analytics

Template usage tracking:
- `usage_count`: Number of times template used
- `last_used_at`: Most recent usage timestamp
- Category-based organization

## Future Enhancements

### Planned Features

1. **Full-Text Search**: 
   - GIN indexes on subject and body
   - Advanced search capabilities

2. **Email Scheduling**:
   - Draft scheduling for future sending
   - Follow-up reminders

3. **Advanced Threading**:
   - Cross-account thread linking
   - Smart conversation detection

4. **AI Integration**:
   - Auto-categorization
   - Response suggestions
   - Sentiment analysis

### Cloudflare Email Worker Integration

Database ready for:
- Incoming email parsing and storage
- Automatic contact creation/linking
- Real-time email processing
- Webhook-based notifications

## Verification Queries

### Check Email Sender Generation
```sql
SELECT 
    w.id,
    w.email_sender,
    or1.response->>'company_name' as company_name
FROM workspaces w
LEFT JOIN onboarding_responses or1 ON w.id = or1.workspace_id
WHERE w.email_sender IS NOT NULL
LIMIT 5;
```

### Verify Table Structure
```sql
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'email_%'
ORDER BY table_name;
```

### Test Contact Integration
```sql
SELECT 
    c.id,
    c.email,
    c.name,
    COUNT(e.id) as email_count
FROM contacts c
LEFT JOIN emails e ON c.id = e.contact_id
WHERE c.workspace_id = 'YOUR_WORKSPACE_ID'
GROUP BY c.id, c.email, c.name;
```

## Summary

The Email Inbox Database System provides a robust, scalable foundation for email management within the CRM platform. Key achievements:

✅ **Workspace Isolation**: Complete data separation with RLS policies  
✅ **Contact Integration**: Automatic linking with existing CRM contacts  
✅ **Email Sender Generation**: Automated `company@customerconnects.app` format  
✅ **Performance Optimized**: Strategic indexes for fast queries  
✅ **Security Focused**: Attachment scanning and secure policies  
✅ **Frontend Ready**: Supports existing UI components  
✅ **Future Proof**: Designed for Cloudflare Email Worker integration  

The system is now ready for frontend integration and Cloudflare email worker implementation. 