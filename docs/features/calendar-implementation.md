# Calendar Integration with Contact Follow-ups

## Overview
This document outlines the implementation of the integration between the follow-up scheduling functionality from the LiveChat2 contact details with the Calendar component. The goal is to create a bidirectional sync where:
1. Follow-ups created in contact details appear in the calendar
2. Events created or modified in the calendar can be linked to contacts as follow-ups

## Implementation Structure

### File Structure
```
frontend/
├── src/
│   ├── components/
│   │   ├── calendar/
│   │   │   ├── Calendar.js                 # Main calendar component
│   │   │   ├── CalendarContainer.js        # Container for calendar layout
│   │   │   ├── CalendarSidebar.js          # Sidebar with filters and upcoming events
│   │   │   ├── CalendarImplementation.md   # This implementation document
│   │   │   └── calendar_events_migration.sql # SQL to create standalone events table
│   │   │
│   │   └── livechat2/
│   │       └── ContactDetails.js           # Modified to use eventsService
│   │
│   ├── services/
│   │   └── eventsService.js                # Shared service for calendar/follow-up integration
│   │
│   ├── utils/
│   │   └── urlUtils.js                     # Used for formatting chat URLs
│   │
│   └── lib/
│       └── supabaseUnified.js              # Supabase client for DB operations
│
└── migrations/
    └── calendar_events.sql                 # Same as calendar_events_migration.sql
```

### Database Schema

**Existing tables used:**
- `contacts` - Contains follow-up data in the `follow_up_date` field

**New tables (future implementation):**
- `calendar_events` - For standalone calendar events

```sql
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  type TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES contacts(id),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_all_day BOOLEAN DEFAULT FALSE,
  location TEXT,
  metadata JSONB
);
```

## User Flow

```
┌───────────────┐        ┌────────────────────┐        ┌──────────────────┐
│               │        │                    │        │                  │
│  Contact      │───────▶│  Contact Details   │───────▶│  Follow-up       │
│  List         │        │  Panel             │        │  Modal           │
│               │        │                    │        │                  │
└───────────────┘        └────────────────────┘        └──────────────────┘
                                                                │
                                                                │ Set Follow-up
                                                                ▼
┌───────────────┐        ┌────────────────────┐        ┌──────────────────┐
│               │        │                    │        │                  │
│  Calendar     │◀───────│  Calendar          │◀───────│  Database Update │
│  View         │        │  Container         │        │  (contacts table)│
│               │        │                    │        │                  │
└───────────────┘        └────────────────────┘        └──────────────────┘
       │                                                        ▲
       │                                                        │
       │                  ┌────────────────────┐                │
       └────────────────▶│  Event             │────────────────┘
                         │  Creation/Edit     │
                         │  Modal             │
                         └────────────────────┘
```

## Frontend to Backend Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                  │     │                  │     │                  │
│  UI Components   │────▶│  Events Service  │────▶│  Supabase Client │
│  (React)         │     │  (JavaScript)    │     │                  │
│                  │     │                  │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
       ▲                        │                         │
       │                        │                         │
       └────────────────────────┘                         ▼
                                               ┌──────────────────┐
                                               │                  │
                                               │  Database        │
                                               │  (PostgreSQL)    │
                                               │                  │
                                               └──────────────────┘
```

## Data Flow

```
┌────────────────┐         ┌────────────────┐          ┌────────────────┐
│                │         │                │          │                │
│ ContactDetails │────────▶│ eventsService  │─────────▶│  Database      │
│ Follow-up Form │         │ API functions  │          │  contacts table│
│                │         │                │          │                │
└────────────────┘         └────────────────┘          └────────────────┘
                                    ▲                         │
                                    │                         │
                                    │                         │
┌────────────────┐         ┌────────────────┐                 │
│                │         │                │                 │
│ Calendar       │◀────────│ Events         │◀────────────────┘
│ Components     │         │ Transformation │
│                │         │                │
└────────────────┘         └────────────────┘
       │                            ▲
       │                            │
       ▼                            │
┌────────────────┐         ┌────────────────┐
│                │         │                │
│ Event Edit     │─────────▶ Events Saving  │
│ Modal          │         │ Logic          │
│                │         │                │
└────────────────┘         └────────────────┘
```

## Core Components and Their Functions

### 1. eventsService.js
- Central service managing all calendar-related operations
- Functions:
  - `fetchContactFollowUps`: Fetches follow-ups from contacts table
  - `updateContactFollowUp`: Updates a contact's follow-up date and notes
  - `removeContactFollowUp`: Removes a follow-up from a contact
  - `fetchCalendarEvents`: Fetches all calendar events (including follow-ups)
  - `createCalendarEvent`: Creates a new calendar event
  - `updateCalendarEvent`: Updates an existing calendar event
  - `deleteCalendarEvent`: Deletes a calendar event
  - `searchContacts`: Searches for contacts to link to events

### 2. Calendar.js
- Main calendar display using FullCalendar
- Loads events from the eventsService
- Handles event creation, editing, and deletion
- Features:
  - Month, week, day, and list views
  - Event creation by clicking on dates
  - Event editing and deletion
  - Contact search and linking
  - Event filtering by type

### 3. CalendarSidebar.js
- Shows upcoming events
- Provides filter checkboxes by event type
- Displays event counts by type
- Shows contact information for follow-ups

### 4. CalendarContainer.js
- Layout container for Calendar and Sidebar
- Manages filter state
- Handles workspace ID retrieval from params or props

### 5. ContactDetails.js (Modified)
- Updated to use eventsService for follow-up management
- Ensures consistent follow-up data handling

## Use Cases

### 1. Setting a Follow-up from Contact Details
**Primary Actor:** Admin/Customer Support
**Precondition:** User is viewing a contact's details
**Steps:**
1. User clicks on "Follow-up" button in contact details
2. User selects date/time for follow-up
3. User adds optional notes about the follow-up
4. User clicks "Set Follow-up"
5. System saves follow-up to contacts table
6. System shows confirmation message

### 2. Viewing All Follow-ups in Calendar
**Primary Actor:** Admin/Team Lead
**Precondition:** User has access to calendar view
**Steps:**
1. User navigates to calendar section
2. System fetches all contacts with follow-ups
3. System displays follow-ups as green events in calendar
4. User can switch between month/week/day views

### 3. Creating a Follow-up from Calendar
**Primary Actor:** Admin/Customer Support
**Precondition:** User is viewing calendar
**Steps:**
1. User clicks on a date in calendar
2. System shows event creation modal
3. User fills in event details
4. User searches for and selects a contact
5. System automatically sets event type to "follow-up"
6. User clicks "Add" button
7. System creates follow-up in contacts table
8. Calendar refreshes to show new follow-up

### 4. Modifying a Follow-up
**Primary Actor:** Admin/Customer Support
**Precondition:** User is viewing calendar with existing follow-ups
**Steps:**
1. User clicks on an existing follow-up event
2. System displays event edit modal
3. User changes date, time, or notes
4. User clicks "Update" button
5. System updates follow-up in contacts table
6. Calendar refreshes to show updated follow-up

### 5. Deleting a Follow-up
**Primary Actor:** Admin/Customer Support
**Precondition:** User is viewing calendar with existing follow-ups
**Steps:**
1. User clicks on an existing follow-up event
2. System displays event edit modal
3. User clicks "Delete" button
4. System removes follow-up from contact
5. Calendar refreshes to remove follow-up event

### 6. Filtering Calendar Events
**Primary Actor:** Admin/Team Lead
**Precondition:** User is viewing calendar
**Steps:**
1. User checks/unchecks event type filters in sidebar
2. System filters displayed events based on selection
3. Calendar updates to show only selected event types

### 7. Viewing Upcoming Events in Sidebar
**Primary Actor:** Admin/Customer Support
**Precondition:** User is viewing calendar
**Steps:**
1. System fetches next 5 upcoming events
2. System displays events in sidebar with date/time and contact
3. User can click on contact icon to open chat with contact

## User Stories

1. **As an admin**, I want to set follow-up dates for contacts so that I don't forget to reach out to them at the appropriate time.

2. **As a sales team lead**, I want to see all follow-ups in a calendar view so that I can better manage my team's schedule and workload.

3. **As a customer support agent**, I want to quickly see my upcoming follow-ups for the day so that I can plan my work effectively.

4. **As an admin**, I want to be able to edit follow-up details directly from the calendar so that I don't have to navigate back to the contact details page.

5. **As a sales representative**, I want to be able to search for a contact while creating a calendar event so that I can quickly set follow-ups during planning.

6. **As a team lead**, I want to filter calendar events by type so that I can focus on specific activities like follow-ups or meetings.

7. **As a customer support manager**, I want to see which follow-ups are associated with which contacts so that I can ensure proper customer engagement.

8. **As an admin**, I want follow-ups created in contact details to automatically appear in the calendar so that all scheduling information is consistent.

9. **As a sales representative**, I want to click on a contact in the calendar sidebar to quickly open their chat so that I can prepare before a follow-up call.

10. **As a team member**, I want visual differentiation between regular calendar events and contact follow-ups so that I can quickly identify the nature of each event.

## Future Enhancements

1. **Standalone Calendar Events**
   - Implement the calendar_events table for events not tied to contacts
   - Create UI for distinguishing between follow-ups and standalone events
   - Support team events not related to specific contacts

2. **Recurring Events**
   - Add support for recurring follow-ups and events
   - Configure recurrence patterns (daily, weekly, monthly)
   - Handle exceptions to recurring events

3. **Notifications System**
   - Create notifications for upcoming follow-ups
   - Support email and in-app notifications
   - Allow configuring notification timing (15 min before, 1 hour before, etc.)

4. **Calendar Sharing**
   - Implement team calendar viewing
   - Create permissions for viewing/editing events
   - Support calendar visibility settings

5. **Mobile Support**
   - Enhance calendar components for mobile responsiveness
   - Optimize touch interactions for mobile devices
   - Create compact view for small screens

## Technical Implementation Notes

1. **Data Synchronization Strategy**
   - Contacts table is the source of truth for follow-ups
   - Events are transformed to calendar format in eventsService
   - Changes made in calendar update the contacts table directly

2. **ID Mapping & Reference Pattern**
   - Follow-up events IDs use format: `contact-followup-${contactId}`
   - This allows identifying the source of the event and the related contact

3. **Error Handling**
   - All async operations include try/catch with error toasts
   - Loading states during data fetching
   - Retry mechanisms for failed operations

4. **Performance Considerations**
   - Lazy loading of events based on visible date range (future enhancement)
   - Optimistic UI updates for improved user experience
   - Efficient event transformation and filtering 