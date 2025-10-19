# Contact Synchronization Between Stores

## Overview

This document explains how contacts are synchronized between the two contact stores in the application:

1. `contactV2State.js` - Used by the ContactsPageV2 component
2. `contactState.js` - Used by the LiveChat component

## Problem

The application has two separate contact stores that don't automatically share data. When a contact is created in one store (e.g., through the ContactsPageV2 component), it doesn't automatically appear in the other store (e.g., in the LiveChat component).

## Solution

We've implemented a contact synchronization service (`contactSyncService.js`) that ensures contacts created in one store are available in the other. This service:

1. Periodically checks for contacts that exist in the V2 store but not in the original store
2. Converts contacts from the V2 format to the original format
3. Adds the missing contacts to the original store

## Implementation Details

### Contact Sync Service

The `contactSyncService.js` file provides:

- A `convertV2ContactToOriginal` function that transforms contacts from the V2 format to the original format
- A `useSyncContacts` hook that:
  - Runs on component mount
  - Sets up a periodic sync (every 30 seconds)
  - Compares contacts between stores and adds missing ones

### Integration Points

The sync service is integrated in:

1. **LiveChat Component**: Uses the `useSyncContacts` hook to ensure it has access to all contacts created in the V2 store
2. **ContactsPageV2 Component**: Has an additional effect to ensure contacts are loaded on mount

## Important Considerations

### Case Sensitivity in Conversation Status

The LiveChat component filters contacts based on their `conversation_status` field. It's important to note that:

1. The LiveChat component expects status values like 'Open', 'Closed', etc. (with uppercase first letter)
2. The ContactsPageV2 component might use lowercase values ('open', 'closed')

To ensure contacts appear in both components, the sync service converts the status to the correct case. When a contact is created in the ContactsPageV2 component, its `conversation_status` is set to 'Open' (uppercase) when synced to the LiveChat store.

### Filtering in LiveChat

By default, the LiveChat component may filter contacts to only show those with a specific conversation status (e.g., 'Open'). If a contact doesn't appear in LiveChat after being created, check:

1. The contact's `conversation_status` field
2. The current filter applied in the LiveChat component

## Data Flow

1. User creates a contact in ContactsPageV2
2. Contact is stored in the V2 store (contactV2State)
3. The sync service detects the new contact
4. The contact is converted to the original format
5. The contact is added to the original store (contactState)
6. The contact appears in both the ContactsPageV2 and LiveChat components

## Future Improvements

- Implement bidirectional sync (currently only syncs from V2 to original)
- Add real-time sync using Supabase subscriptions
- Consolidate the two stores into a single store with adapters for different components 