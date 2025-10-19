# Campaign Management SOP

## Overview

This document outlines the standard operating procedures (SOP) for campaign management in the LiveChat application. It covers the relationship between contacts, boards, and campaigns, as well as the technical implementation details.

## Table of Contents

1. [Introduction](#introduction)
2. [Campaign Types](#campaign-types)
3. [Database Schema](#database-schema)
4. [User Flow](#user-flow)
5. [Technical Implementation](#technical-implementation)
6. [Frontend-Backend Flow](#frontend-backend-flow)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

## Introduction

Campaigns in the LiveChat application allow users to organize and manage marketing efforts for their contacts. Campaigns can be associated with specific boards or can be global (workspace-wide). This dual approach provides flexibility in how marketing campaigns are structured and targeted.

## Campaign Types

### 1. Global Campaigns

- **Scope**: Available to all contacts within a workspace
- **Use Case**: Broad marketing initiatives that apply to all contacts regardless of their board assignment
- **Access Control**: Managed at the workspace level
- **Example**: "Holiday Promotion" that applies to all contacts

### 2. Board-Specific Campaigns

- **Scope**: Available only to contacts assigned to a specific board
- **Use Case**: Targeted marketing initiatives for specific segments or pipelines
- **Access Control**: Managed at the board level
- **Example**: "New Customer Onboarding" campaign specific to the "New Customers" board

## Database Schema

The campaign system relies on the following database tables:

### `campaigns` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workspace_id | TEXT | Foreign key to workspace |
| name | TEXT | Campaign name |
| description | TEXT | Campaign description |
| status | TEXT | Campaign status (draft, active, completed, etc.) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| created_by | UUID | User who created the campaign |
| board_id | UUID | Board ID (null for global campaigns) |
| campaign_type | TEXT | Type of campaign (sequence, broadcast, etc.) |
| settings | JSONB | Campaign settings |
| metadata | JSONB | Additional metadata |
| audience_criteria | JSONB | Targeting criteria |

### `campaign_contact_status` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| campaign_id | UUID | Foreign key to campaign |
| contact_id | UUID | Foreign key to contact |
| workspace_id | TEXT | Foreign key to workspace |
| status | TEXT | Subscription status (subscribed, unsubscribed, etc.) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| metadata | JSONB | Additional metadata |

### `boards` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workspace_id | TEXT | Foreign key to workspace |
| name | TEXT | Board name |
| description | TEXT | Board description |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| created_by | UUID | User who created the board |

### `board_contacts` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| board_id | UUID | Foreign key to board |
| contact_id | UUID | Foreign key to contact |
| workspace_id | TEXT | Foreign key to workspace |
| column_id | UUID | Column within the board |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

## User Flow

```
┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│                 │     │                   │     │                    │
│  Select Contact ├────►│ View Contact Info ├────►│ Manage Campaigns   │
│                 │     │                   │     │                    │
└─────────────────┘     └───────────────────┘     └────────────────────┘
                                                           │
                                                           │
                                                           ▼
┌─────────────────┐     ┌───────────────────┐     ┌────────────────────┐
│                 │     │                   │     │                    │
│  Unsubscribe    │◄────┤ View Subscriptions│◄────┤ Subscribe to       │
│  from Campaign  │     │                   │     │ Campaign           │
│                 │     │                   │     │                    │
└─────────────────┘     └───────────────────┘     └────────────────────┘
```

### User Flow Steps:

1. **Select Contact**: User selects a contact from the contact list or board view
2. **View Contact Info**: System displays contact details including current campaign subscriptions
3. **Manage Campaigns**: User can view available campaigns and manage subscriptions
4. **Subscribe to Campaign**: User can add the contact to a campaign
   - System checks if contact is on a board
   - If yes, shows board-specific campaigns + global campaigns
   - If no, shows only global campaigns
5. **View Subscriptions**: User can see which campaigns the contact is subscribed to
6. **Unsubscribe from Campaign**: User can remove the contact from a campaign

## Technical Implementation

### Frontend Components

1. **ContactDetails.js** (`/frontend/src/components/livechat2/ContactDetails.js`)
   - Displays contact information
   - Shows campaign subscriptions
   - Provides UI for subscribing/unsubscribing from campaigns

2. **Board Components** (`/frontend/src/components/board/`)
   - Manages board view and contact assignments
   - Integrates with campaign management for board-specific campaigns

### Backend Services

1. **livechatService.js** (`/frontend/src/services/livechatService.js`)
   - Provides API functions for campaign management:
     - `getCampaigns(workspaceId, boardId)`: Get campaigns for workspace/board
     - `getContactCampaigns(contactId, workspaceId)`: Get campaigns a contact is subscribed to
     - `subscribeToCampaign(contactId, campaignId, workspaceId)`: Subscribe contact to campaign
     - `unsubscribeFromCampaign(contactId, campaignId, workspaceId)`: Unsubscribe contact from campaign
     - `getBoardForContact(contactId, workspaceId)`: Check if contact is assigned to a board

## Frontend-Backend Flow

```
┌───────────────┐     ┌───────────────────┐     ┌───────────────────┐
│               │     │                   │     │                   │
│   Frontend    │     │  livechatService  │     │     Supabase      │
│   Components  │     │                   │     │     Database      │
│               │     │                   │     │                   │
└───────┬───────┘     └─────────┬─────────┘     └────────┬──────────┘
        │                       │                        │
        │  1. User Action       │                        │
        │ (Select Contact)      │                        │
        ├──────────────────────►│                        │
        │                       │                        │
        │                       │  2. Check Board        │
        │                       │  Assignment            │
        │                       ├───────────────────────►│
        │                       │                        │
        │                       │  3. Return Board ID    │
        │                       │  (if any)              │
        │                       │◄───────────────────────┤
        │                       │                        │
        │                       │  4. Fetch Campaigns    │
        │                       │  (Global + Board)      │
        │                       ├───────────────────────►│
        │                       │                        │
        │                       │  5. Return Campaigns   │
        │                       │◄───────────────────────┤
        │                       │                        │
        │  6. Display           │                        │
        │  Available Campaigns  │                        │
        │◄──────────────────────┤                        │
        │                       │                        │
        │  7. User Subscribes   │                        │
        │  Contact to Campaign  │                        │
        ├──────────────────────►│                        │
        │                       │  8. Create             │
        │                       │  Subscription          │
        │                       ├───────────────────────►│
        │                       │                        │
        │                       │  9. Confirm            │
        │                       │  Subscription          │
        │                       │◄───────────────────────┤
        │  10. Update UI        │                        │
        │◄──────────────────────┤                        │
        │                       │                        │
└───────┴───────┘     └─────────┴─────────┘     └────────┴──────────┘
```

## API Reference

### `getCampaigns(workspaceId, boardId = null)`

Fetches campaigns available for a workspace and optionally filtered by board.

```javascript
/**
 * Get campaigns for a workspace, optionally filtered by board
 * @param {string} workspaceId - The workspace ID
 * @param {string|null} boardId - Optional board ID to filter campaigns
 * @returns {Promise<{data, error}>} - Campaigns data or error
 */
export const getCampaigns = async (workspaceId, boardId = null) => {
  try {
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('workspace_id', workspaceId);
    
    if (boardId) {
      // If boardId is provided, get board-specific campaigns and global campaigns
      query = query.or(`board_id.eq.${boardId},board_id.is.null`);
    } else {
      // If no boardId, only get global campaigns
      query = query.is('board_id', null);
    }
    
    const { data, error } = await query;
    return { data, error };
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return { data: null, error };
  }
};
```

### `getBoardForContact(contactId, workspaceId)`

Checks if a contact is assigned to a board.

```javascript
/**
 * Check if a contact is assigned to a board
 * @param {string} contactId - The contact ID
 * @param {string} workspaceId - The workspace ID
 * @returns {Promise<{data, error}>} - Board data or error
 */
export const getBoardForContact = async (contactId, workspaceId) => {
  try {
    const { data, error } = await supabase
      .from('board_contacts')
      .select('board_id')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
    
    return { data, error };
  } catch (error) {
    console.error('Error checking board for contact:', error);
    return { data: null, error };
  }
};
```

### Updated Contact Campaign Management

```javascript
// In ContactDetails.js
useEffect(() => {
  const fetchCampaigns = async () => {
    if (!enhancedContact?.id || !enhancedContact?.workspace_id) return;
    
    setLoadingCampaigns(true);
    try {
      // Check if contact is assigned to a board
      const { data: boardData } = await getBoardForContact(
        enhancedContact.id, 
        enhancedContact.workspace_id
      );
      
      // Fetch available campaigns based on board assignment
      const boardId = boardData?.board_id || null;
      const { data: campaignsData, error: campaignsError } = await getCampaigns(
        enhancedContact.workspace_id,
        boardId
      );
      
      if (campaignsError) throw campaignsError;
      setAvailableCampaigns(campaignsData || []);
      
      // Fetch contact's subscribed campaigns
      const { data: contactCampaignsData, error: contactCampaignsError } = 
        await getContactCampaigns(enhancedContact.id, enhancedContact.workspace_id);
      
      if (contactCampaignsError) throw contactCampaignsError;
      
      // Update the contact with subscribed campaigns
      if (onContactUpdate && contactCampaignsData) {
        onContactUpdate({
          ...enhancedContact,
          campaigns: contactCampaignsData
        });
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error fetching campaigns',
        description: error.message,
        status: 'error',
        duration: 3000
      });
    } finally {
      setLoadingCampaigns(false);
    }
  };
  
  fetchCampaigns();
}, [enhancedContact?.id, enhancedContact?.workspace_id]);
```

## Troubleshooting

### Common Issues and Solutions

1. **Campaigns not showing for a contact**
   - Check if the contact is assigned to a board
   - Verify that campaigns exist for the workspace
   - Ensure proper workspace_id is being used in queries

2. **Unable to subscribe a contact to a campaign**
   - Check if the campaign is active
   - Verify the contact and campaign belong to the same workspace
   - Check for any existing subscription records

3. **Board-specific campaigns showing for all contacts**
   - Verify the board_id field is properly set in the campaigns table
   - Check that the query is correctly filtering based on board_id

4. **Performance issues with campaign queries**
   - Ensure proper indexes exist on the database tables
   - Consider implementing caching for frequently accessed campaign data
   - Optimize queries to fetch only necessary fields

## Implementation Plan

1. **Phase 1: Database Updates**
   - Ensure proper relationships between contacts, boards, and campaigns
   - Add necessary indexes for performance optimization

2. **Phase 2: Backend Service Updates**
   - Update livechatService.js to support board-specific campaign queries
   - Implement getBoardForContact function

3. **Phase 3: Frontend Updates**
   - Modify ContactDetails.js to fetch and display campaigns based on board assignment
   - Update UI to clearly indicate global vs. board-specific campaigns

4. **Phase 4: Testing and Validation**
   - Test with various scenarios (contacts with/without board assignments)
   - Verify performance with large datasets
   - Ensure proper error handling

5. **Phase 5: Documentation and Training**
   - Update developer documentation
   - Create user guides for campaign management
