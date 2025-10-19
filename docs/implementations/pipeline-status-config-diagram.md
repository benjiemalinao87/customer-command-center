# Pipeline Status Configuration - Component Diagram

## Component Hierarchy

```
Admin
├── StatusConfiguration (new)
│   ├── StatusCategoryTabs
│   ├── StatusOptionsList
│   │   └── StatusOptionItem
│   ├── StatusOptionEditor
│   │   └── ColorPicker
│   └── StatusOptionDragList
│
Contact Page
├── ContactDetail
│   ├── ContactHeader
│   ├── PipelineProgressBar (new)
│   ├── ContactStatusSection (new)
│   │   ├── LeadStatusSelect
│   │   ├── AppointmentStatusSelect
│   │   └── AppointmentResultSelect
│   └── ... (existing components)
│
LiveChat
├── ChatContainer
│   └── UserDetails
│       ├── ProfileHeader
│       ├── StatusInformation (new)
│       │   ├── LeadStatusSelect
│       │   ├── AppointmentStatusSelect
│       │   └── AppointmentResultSelect
│       ├── TagsSection
│       └── ... (existing sections)
│
Opportunities
└── OpportunityCreator
    └── ... (using dynamic status options)
```

## Data Flow

```
┌─────────────────┐      ┌───────────────────┐      ┌─────────────────┐
│                 │      │                   │      │                 │
│  Admin Config   │─────▶│  Status Service   │◀─────│  Contact Page   │
│     Interface   │      │                   │      │                 │
│                 │      │                   │      │                 │
└─────────────────┘      └───────────────────┘      └─────────────────┘
                                   ▲                         ▲
                                   │                         │
                                   │                         │
                                   │                         │
                                   ▼                         │
                          ┌─────────────────┐                │
                          │                 │                │
                          │   Supabase DB   │                │
                          │                 │                │
                          │                 │                │
                          └─────────────────┘                │
                                   ▲                         │
                                   │                         │
                                   │                         │
                                   │                         │
                                   ▼                         ▼
                          ┌─────────────────┐      ┌─────────────────┐
                          │                 │      │                 │
                          │  LiveChat UI   │      │  Opportunities  │
                          │                 │      │                 │
                          │                 │      │                 │
                          └─────────────────┘      └─────────────────┘
```

## Status Data Structure

```typescript
// Status Category
interface StatusCategory {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// Status Option
interface StatusOption {
  id: number;
  category_id: number;
  name: string;
  description: string;
  color: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Contact with Status Information
interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  // ... other existing fields
  
  // New status fields
  lead_status_id: number | null;
  appointment_status_id: number | null;
  appointment_result_id: number | null;
  
  // Populated status information (for UI)
  lead_status?: StatusOption;
  appointment_status?: StatusOption;
  appointment_result?: StatusOption;
}
```

## UI Mockup - Admin Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Status Configuration                                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌────────────────┐ ┌───────────────────┐        │
│ │Lead     │ │Appointment     │ │Appointment        │        │
│ │Status   │ │Status          │ │Result             │        │
│ └─────────┘ └────────────────┘ └───────────────────┘        │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │Status Options                                 [+ Add]   │ │
│ │┌───────────────────────────────────────────────────────┐│ │
│ ││ ≡  Lead            #4285F4   Default   [Edit] [Delete]││ │
│ │└───────────────────────────────────────────────────────┘│ │
│ │┌───────────────────────────────────────────────────────┐│ │
│ ││ ≡  Contacted       #34A853             [Edit] [Delete]││ │
│ │└───────────────────────────────────────────────────────┘│ │
│ │┌───────────────────────────────────────────────────────┐│ │
│ ││ ≡  Qualified       #FBBC05             [Edit] [Delete]││ │
│ │└───────────────────────────────────────────────────────┘│ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## UI Mockup - Status Section in UserDetails

```
┌───────────────────────────────────────────┐
│ Status Information                         │
├───────────────────────────────────────────┤
│ Lead Status                                │
│ ┌─────────────────────────────────────┐   │
│ │ Lead                              ▼ │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ Appointment Status                        │
│ ┌─────────────────────────────────────┐   │
│ │ Scheduled                         ▼ │   │
│ └─────────────────────────────────────┘   │
│                                           │
│ Appointment Result                        │
│ ┌─────────────────────────────────────┐   │
│ │ Select result                     ▼ │   │
│ └─────────────────────────────────────┘   │
│                                           │
└───────────────────────────────────────────┘
```

## Pipeline Visualization

```
┌───────────────────────────────────────────────────────────────────────┐
│                                                                       │
│  ┌─────────┐    ┌───────────┐    ┌──────────┐    ┌──────────────────┐ │
│  │         │    │           │    │          │    │                  │ │
│  │  Lead   │───▶│ Scheduled │───▶│Confirmed │───▶│ Issued           │ │
│  │         │    │           │    │          │    │                  │ │
│  └─────────┘    └───────────┘    └──────────┘    └──────────────────┘ │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```
