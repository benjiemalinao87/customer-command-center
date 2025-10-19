# Appointment Tracking System

The appointment tracking system allows users to manage appointments with contacts and track follow-up tasks.

## Database Structure

The appointment tracking system consists of the following tables:

### 1. `appointments` Table
Stores information about scheduled appointments with contacts.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workspace_id | TEXT | Foreign key to workspaces table |
| contact_id | UUID | Foreign key to contacts table |
| title | TEXT | Title of the appointment |
| description | TEXT | Description of the appointment |
| scheduled_at | TIMESTAMP WITH TIME ZONE | Date and time of the appointment |
| appointment_status_id | INTEGER | Foreign key to status_options table |
| appointment_result_id | INTEGER | Foreign key to status_options table |
| created_by | UUID | Foreign key to auth.users table |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_by | UUID | Foreign key to auth.users table |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

### 2. `appointment_follow_ups` Table
Stores information about follow-up tasks related to appointments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| workspace_id | TEXT | Foreign key to workspaces table |
| contact_id | UUID | Foreign key to contacts table |
| appointment_id | UUID | Foreign key to appointments table (optional) |
| appointment_title | TEXT | Title of the related appointment |
| action_type | TEXT | Type of follow-up action (Call, Email, etc.) |
| description | TEXT | Description of the follow-up task |
| due_date | TIMESTAMP WITH TIME ZONE | Due date for the follow-up task |
| is_completed | BOOLEAN | Whether the task is completed |
| completed_at | TIMESTAMP WITH TIME ZONE | When the task was completed |
| assigned_to | UUID | Foreign key to auth.users table |
| created_by | UUID | Foreign key to auth.users table |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_by | UUID | Foreign key to auth.users table |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

### 3. `status_categories` Table
Stores categories for different types of statuses.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Name of the category |
| description | TEXT | Description of the category |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

### 4. `status_options` Table
Stores options for each status category.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| category_id | INTEGER | Foreign key to status_categories table |
| name | TEXT | Name of the status option |
| description | TEXT | Description of the status option |
| color | TEXT | Color code for the status option |
| display_order | INTEGER | Order for display |
| is_default | BOOLEAN | Whether this is the default option |
| created_at | TIMESTAMP WITH TIME ZONE | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | Last update timestamp |

## Frontend Components

The appointment tracking system includes the following frontend components:

### 1. `AppointmentHistory.js`
Displays a list of appointments for a contact.

### 2. `AppointmentFollowUps.js`
Displays and manages follow-up tasks for a contact.

### 3. `AppointmentScheduler.js`
Allows users to schedule new appointments.

## API Services

The appointment tracking system includes the following API services:

### 1. `appointmentService.js`
Provides functions for interacting with the appointment-related tables in the database.

## Integration

The appointment tracking system is integrated into the contact detail view, with tabs for:
- Appointment History: Shows past and upcoming appointments
- Follow-up Tasks: Shows tasks related to appointments

## Status Categories

The system includes two status categories:

### 1. Appointment Status
Options include:
- Scheduled
- Confirmed
- Completed
- Cancelled
- No-show

### 2. Appointment Result
Options include:
- Successful
- Needs Follow-up
- Rescheduled
- Not Interested
- Converted

## Future Enhancements

Potential future enhancements for the appointment tracking system:

1. Calendar view for appointments
2. Email/SMS reminders for appointments
3. Integration with external calendar systems (Google Calendar, etc.)
4. Recurring appointments
5. Appointment templates
6. Team scheduling and availability management
