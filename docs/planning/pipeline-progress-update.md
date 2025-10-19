## 2025-02-28: Pipeline Configuration and Appointment Tabs Implementation

### Completed:
- Added Pipeline Configuration tab in ConfigureBoard component to control visibility of appointment pipelines
- Added Appointment History and Appointment Result tabs to ContactDetailView
- Implemented conditional rendering of appointment tabs based on board settings
- Created database view for backward compatibility between `status_options` and `statuses` tables
- Added database migration to add `show_appointment_status` and `show_appointment_result` columns to the boards table

### Technical Details:
- **Database Changes**:
  - Added `show_appointment_status` and `show_appointment_result` boolean columns to the boards table
  - Default values set to TRUE for backward compatibility with existing boards
  - Created a safe migration script that checks for column existence before adding

- **UI Implementation**:
  - Added toggle switches in ConfigureBoard for controlling pipeline visibility
  - Implemented conditional rendering in ContactDetailView based on board settings
  - Maintained Lead Status pipeline as always visible (cannot be disabled)
  - Added placeholder content for Appointment History and Result tabs

- **State Management**:
  - Added board settings state in ContactDetailView to track visibility settings
  - Implemented fetch logic to retrieve settings when a contact is loaded
  - Used default values when settings cannot be retrieved to ensure graceful degradation

### Next Steps:
- Implement actual appointment status and result pipelines
- Add functionality to track and display appointment history
- Create UI for managing appointment statuses and results
- Add data migration for existing appointments
