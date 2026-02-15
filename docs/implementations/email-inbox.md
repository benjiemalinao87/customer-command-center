# Implementation Document: Email Inbox Feature

## 1. Overview

*   **Purpose & Scope**: This document outlines the implementation details for the Email Inbox feature. The feature provides a Mac OS-styled email client interface within the application, allowing users to manage, view, compose, and reply to emails associated with their current workspace. Key goals include a familiar user experience, integration with a backend email service (via `emailService.js`, with plans for Cloudflare Workers), and contextual email management within workspaces. Advanced email automation or complex CRM integrations beyond basic contact association are out of scope for the initial versions described here.
*   **Stakeholders**: 
    *   End-users: Utilize the email inbox for their daily communications.
    *   Frontend Developers: Implement and maintain the UI and client-side logic.
    *   Backend Developers: Provide and maintain the APIs for email sending, fetching, and management.

## 2. What It Does (Capabilities)

*   **Folder Navigation**: Users can select and view emails from predefined folders (Inbox, Sent, Starred, Archive, Trash).
*   **Email Listing**: Displays a list of emails for the selected folder, showing sender, subject, preview, and timestamp.
*   **Email Viewing**: Allows users to select an email from the list to view its full content.
*   **Search**: Users can search for emails (currently client-side with mock data, planned for backend integration).
*   **Email Actions**:
    *   Mark emails as read/unread (client-side state update, needs backend sync).
    *   Star/unstar emails.
    *   Archive emails (move to Archive folder).
    *   Delete emails (move to Trash folder).
*   **Email Composition**:
    *   Compose new emails with To, CC, BCC, Subject, and Body fields.
    *   Reply, Reply All, and Forward existing emails, with context (recipient, subject, quoted original message).
*   **Attachments**: Placeholder for handling file attachments (planned).
*   **Drafts**: Placeholder for saving email drafts (planned).
*   **Refresh**: Manually refresh the email list (planned to connect to backend service).
*   **Workspace Context**: Operates within the `workspaceId` provided by `useWorkspace` hook, ensuring emails are managed in the correct tenant context.

## 3. User Flow

*   **Mermaid Diagram**:
    ```mermaid
    graph TD
        A[User opens Email Inbox] --> B{Select Folder};
        B -- Inbox --> C[View Email List];
        B -- Sent --> C;
        B -- Starred --> C;
        B -- Archive --> C;
        B -- Trash --> C;
        C --> D{Select Email};
        D -- Email Selected --> E[View Email Content];
        E --> F{Perform Action on Email};
        F -- Reply --> G[Open Compose Modal with Reply Context];
        F -- Reply All --> G;
        F -- Forward --> G;
        F -- Star --> C;
        F -- Archive --> C;
        F -- Delete --> C;
        A --> H[Click Compose New Email];
        H --> I[Open Compose Modal (New Email)];
        G --> J{Fill Email Details};
        I --> J;
        J --> K[Click Send];
        K --> L[Email Sent via Service];
        L --> A;
        C --> M[Search Emails];
        M --> C;
        A --> N[Refresh Email List];
        N --> C;
    ```

*   **ASCII Diagram**:
    ```
    User opens Email Inbox
        |
        v
    Select Folder (Inbox, Sent, Starred, Archive, Trash)
        |
        v
    View Email List
        |
        v
    Select Email
        |
        v
    View Email Content
        |
        v
    Perform Action on Email
    / | \                (User can also directly compose new email)
   /  |  \                     |
  /   |   \                    v
 v    v    v            Open Compose Modal (New Email)
Reply/  Star/                     |
ReplyAll/ Archive/                  v
Forward   Delete              Fill Email Details
 |      |                       |
 v      v                       v
Open     Update               Click Send
Compose   Email List                |
Modal                             v
(with context)              Email Sent via Service
 |                                |
 v                                v
Fill Email Details        Return to Email Inbox
 |                                
 v                                
Click Send
 |                                
 v                                
Email Sent via Service
 |                                
 v                                
Return to Email Inbox
    ```

## 4. Front-end & Back-end Flow

*   **Mermaid Sequence Diagram (Example: Replying to an Email)**:
    ```mermaid
    sequenceDiagram
        participant User
        participant EmailInboxWindow (React)
        participant EmailViewer (React)
        participant ComposeModal (React)
        participant emailService (JS)
        participant BackendAPI (e.g., /api/email/send)

        User->>EmailViewer: Clicks 'Reply' on an email
        EmailViewer->>EmailInboxWindow: onReply({email, type: 'reply'})
        EmailInboxWindow->>EmailInboxWindow: Sets replyContext, sets isComposeOpen=true
        EmailInboxWindow->>ComposeModal: Renders with reply context (to, subject, original email for quote)

        User->>ComposeModal: Fills reply body, Clicks 'Send'
        ComposeModal->>EmailInboxWindow: onSend(replyEmailData)
        EmailInboxWindow->>emailService: sendReply(originalEmail, replyEmailData)
        emailService->>emailService: findOrCreateContact(originalEmail.from.email, workspaceId) # Assumed step
        emailService->>BackendAPI: (Potentially GET/POST to /api/contacts to resolve contactId)
        BackendAPI-->>emailService: contactId
        emailService->>emailService: formatReplyContent(replyBody, originalEmail)
        emailService->>emailService: sendEmail(formattedReplyData) # Internal call
        emailService->>BackendAPI: POST /api/email/send with payload (to, subject, html, contactId, workspaceId, etc.)
        BackendAPI-->>emailService: {success: true} or error
        emailService-->>EmailInboxWindow: Promise resolves with API response
        EmailInboxWindow->>ComposeModal: onClose()
        EmailInboxWindow->>EmailInboxWindow: (Optionally) handleRefresh() to update email list
    ```

*   **ASCII Equivalent (Example: Replying to an Email)**:
    ```
    User          EmailInboxWindow      EmailViewer     ComposeModal    emailService      BackendAPI
     |                                 |-(Clicks Reply)-->|
     |                 |<-(onReply)----------------------|
     |                 |-(Sets context, opens modal)---->|
     |                                                 |-(Fills, Clicks Send)-->|
     |                 |<-(onSend)----------------------------------------------|
     |                 |------------------------------->|-(sendReply)----------->|
     |                 |                                |-(findOrCreateContact)->| (Assumed)
     |                 |                                |<-(contactId)-----------|
     |                 |                                |-(formatReplyContent)--|
     |                 |                                |-(sendEmail)---------->|
     |                 |                                |----------------------->| POST /api/email/send
     |                 |                                |<-(Success/Error)-------|
     |                 |<-(Promise resolves)------------|
     |                 |-(Closes modal, maybe refreshes)-|
    ```

## 5. File Structure

```
frontend/src/
├── components/
│   └── email-inbox/
│       ├── EmailInboxWindow.js       # Main container: orchestrates UI, state, and interactions.
│       ├── components/
│       │   ├── ComposeModal.js       # Modal for writing new emails, replies, or forwards.
│       │   ├── EmailList.js          # Renders the list of emails for a selected folder.
│       │   ├── EmailSidebar.js       # Navigation panel for email folders (Inbox, Sent, etc.).
│       │   └── EmailViewer.js        # Displays the content of a selected email.
│       └── IMPLEMENTATION_DOC_EMAIL_INBOX.md # This document.
└── services/
    └── emailService.js           # Client-side service for interacting with backend email APIs.
```

## 6. Data & Logic Artifacts

*   **React Components:**
    *   `EmailInboxWindow` (`email-inbox/EmailInboxWindow.js`):
        *   Purpose: Main UI orchestrator. Manages overall state (selected folder/email, search, compose modal visibility), email data (currently mock), and interactions between sub-components.
        *   Inputs: `onClose` (prop to handle closing the inbox window).
        *   State: `selectedFolder`, `selectedEmail`, `searchQuery`, `isComposeOpen`, `isLoading`, `replyContext`, `emails`, `folders`.
    *   `EmailSidebar` (`email-inbox/components/EmailSidebar.js`):
        *   Purpose: Renders navigable list of email folders with unread counts.
        *   Inputs: `folders` (array), `selectedFolder` (string), `onFolderSelect` (callback).
    *   `EmailList` (`email-inbox/components/EmailList.js`):
        *   Purpose: Displays emails for the active folder. Handles email selection and item-level actions (star, archive, delete).
        *   Inputs: `emails` (array), `selectedEmail` (object), `onEmailSelect` (callback), `onEmailAction` (callback).
    *   `EmailViewer` (`email-inbox/components/EmailViewer.js`):
        *   Purpose: Shows full content of the selected email. Provides reply, forward, and other action buttons.
        *   Inputs: `email` (object), `onReply` (callback), `onAction` (callback).
    *   `ComposeModal` (`email-inbox/components/ComposeModal.js`):
        *   Purpose: Modal for composing new emails or drafting replies/forwards.
        *   Inputs: `isOpen` (boolean), `onClose` (callback), `onSend` (callback), `replyTo` (optional email object for context).
*   **Service Module:**
    *   `emailService` (`services/emailService.js`):
        *   Purpose: Abstraction layer for backend API communication related to emails.
        *   Functions: `sendEmail`, `scheduleEmail`, `sendReply`, `sendReplyAll`, `forwardEmail`, `formatReplyContent`, `formatForwardContent`, `findOrCreateContact`, `extractReplyAllRecipients`.
        *   Inputs: Email data, workspace ID, original email context.
        *   Outputs: Promises resolving with API responses.
*   **Key State Variables (primarily in `EmailInboxWindow.js`):**
    *   `emails`: Array of email objects. Structure per mock: `{ id, from: { name, email }, subject, preview, timestamp, isRead, isStarred, folder, priority, content }`.
    *   `folders`: Array of folder objects. Structure per mock: `{ id, name, icon, count, color }`.
    *   `selectedEmail`: The full email object currently being viewed.
    *   `replyContext`: Stores `{ originalEmail, type, replyTo, cc }` for compose modal.
*   **Backend API Endpoints (as defined in `emailService.js`):**
    *   `POST /api/email/send`: Sends an email immediately.
        *   Payload: `{ contactId, subject, content (html), workspaceId, cc?, bcc?, attachments? }`
    *   `POST /api/schedule-email`: Schedules an email.
        *   Payload: `{ to, subject, html, contactId, workspaceId, scheduledAt, metadata }`

## 7. User Stories

1.  As a user, I want to see a list of my email folders (e.g., Inbox, Sent) so that I can organize and navigate my emails.
2.  As a user, I want to view emails within a selected folder, showing key information like sender, subject, and date, so I can quickly scan messages.
3.  As a user, I want to open and read the full content of an email when I select it from the list.
4.  As a user, I want to compose a new email by specifying recipients (To, CC, BCC), subject, and body, so I can send new communications.
5.  As a user, I want to reply to an email, with the recipient and subject pre-filled and the original message quoted, for efficient responses.
6.  As a user, I want to reply to all recipients of an email to ensure everyone in the original conversation receives my response.
7.  As a user, I want to forward an email, including its original content and attachments, to a new recipient to share information.
8.  As a user, I want to mark important emails with a star so I can easily find them later in a 'Starred' folder or view.
9.  As a user, I want to archive emails I've dealt with to keep my inbox clean but retain the messages for future reference.
10. As a user, I want to delete unwanted emails, moving them to a 'Trash' folder, from which they might be permanently deleted later.

## 8. Implementation Stages

*   **Phase 1: MVP - UI Shell & Mock Data (Largely Current State)**
    *   Deliverables: Functional UI components (`EmailSidebar`, `EmailList`, `EmailViewer`, `ComposeModal`) with Mac OS styling. Folder navigation, display of mock emails, selection for viewing. Basic compose, reply, forward functionality in `ComposeModal` using mock data and updating local state only. Client-side email actions (star, archive, delete) on mock data.
    *   Dependencies: Chakra UI, Lucide Icons, Framer Motion.
    *   Effort: Mostly complete.
*   **Phase 2: Core Backend Integration - Sending & Receiving**
    *   Deliverables: Integrate `emailService.js` with live backend APIs for:
        *   Fetching actual emails for the selected folder and workspace.
        *   Sending new emails (`sendEmail`).
        *   Sending replies and forwards (`sendReply`, `sendReplyAll`, `forwardEmail`).
        *   Implementing `findOrCreateContact` if necessary for backend CRM.
        *   Basic error handling for API calls.
    *   Dependencies: Backend APIs for fetching and sending emails, authentication, workspace context.
    *   Effort: Medium-Large.
*   **Phase 3: Full Backend Integration - Email Management Actions**
    *   Deliverables: Persist email state changes via backend APIs:
        *   Marking emails as read/unread.
        *   Starring/unstarring emails.
        *   Archiving emails.
        *   Moving emails to trash (soft delete).
        *   (If applicable) Hard delete from trash.
        *   Implement attachment uploading and inclusion in sent emails.
        *   Implement saving drafts to the backend.
    *   Dependencies: Backend APIs for all email management actions.
    *   Effort: Medium.
*   **Phase 4: Advanced Features & Polish**
    *   Deliverables: 
        *   Backend-powered search functionality.
        *   Email list filtering (by read status, date, etc.).
        *   User settings for email (e.g., signature).
        *   Notifications for new emails.
        *   Robust rich text editor in `ComposeModal`.
        *   Comprehensive error display and user feedback.
    *   Dependencies: Stable backend APIs, potentially a notification service.
    *   Effort: Large.

## 9. Future Roadmap

*   **Enhancements:**
    *   Advanced search syntax (e.g., `from:user@example.com subject:meeting`).
    *   Email templates for common responses.
    *   Snooze email functionality.
    *   Calendar integration (create event from email).
    *   Threaded conversation view.
    *   Bulk actions (select multiple emails to archive, delete, etc.).
    *   Support for multiple email accounts per workspace.
*   **Performance Optimizations:**
    *   Virtual scrolling/windowing for `EmailList` to handle thousands of emails.
    *   Optimistic UI updates for actions like starring or archiving.
    *   Efficient server-side pagination and filtering for email fetching.
    *   Client-side caching of emails/folders (e.g., using React Query, SWR).
*   **Scalability & Multi-Region:**
    *   Ensure backend email infrastructure (e.g., Cloudflare Workers, email provider APIs) is horizontally scalable.
    *   Database design for email storage must support efficient querying for large workspaces and many users.
    *   Consider asynchronous processing for email sending at scale (e.g., using message queues).
*   **Refactor Ideas:**
    *   If state logic in `EmailInboxWindow` becomes overly complex, extract into custom hooks or a dedicated state management solution (e.g., Zustand, Redux Toolkit).
    *   Further componentize elements within `EmailViewer` or `ComposeModal` if they grow in complexity.

**Scalability & Optimization Notes:**
*   The current frontend uses mock data, so performance is client-bound. Real-world performance will depend heavily on backend API response times and efficient data fetching.
*   `emailService.js` uses `fetch`. The backend APIs it calls must be scalable. Cloudflare Workers, if used as planned for the backend, offer good scalability.
*   For large email lists, client-side rendering without virtualization will degrade performance. Implementing virtual scrolling for `EmailList` will be crucial.
*   API design should support pagination and filtering to limit data transfer and processing.
*   Error handling in `emailService.js` is basic. For production, more robust strategies like retries with exponential backoff or circuit breakers could be beneficial for critical operations like sending email.

**References:**
*   Chakra UI: [https://chakra-ui.com/](https://chakra-ui.com/)
*   Lucide React Icons: [https://lucide.dev/guide/packages/lucide-react](https://lucide.dev/guide/packages/lucide-react)
*   Framer Motion: [https://www.framer.com/motion/](https://www.framer.com/motion/)
*   (Assumed) Backend API documentation for `/api/email/send`, `/api/schedule-email`, and any email fetching/management endpoints.
