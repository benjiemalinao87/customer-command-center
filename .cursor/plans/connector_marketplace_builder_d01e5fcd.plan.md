---
name: Connector Marketplace Builder
overview: Add the ability to create official connector templates and publish them to the marketplace directly from the Command Center. This will allow SaaS admins to create platform-native connectors that appear alongside developer-submitted ones.
todos:
  - id: update-types
    content: Add ConnectorTemplate interface to types file
    status: completed
  - id: update-api
    content: Add CRUD methods for official connector templates to developerModeApi
    status: completed
  - id: create-builder
    content: Create multi-step ConnectorBuilder component with wizard steps
    status: completed
  - id: create-management
    content: Create ConnectorManagement component with list/create UI
    status: completed
  - id: add-tab
    content: Add Marketplace tab to DeveloperMode component
    status: completed
  - id: test-flow
    content: "Test the complete flow: create, edit, publish connector"
    status: completed
---

# Connector Marketplace Builder for Command Center

## Architecture

The implementation adds a new "Marketplace" tab to the existing Developer Mode feature. This tab will allow admins to:

1. Create official connector templates
2. Manage existing official connectors 
3. Publish connectors directly to the marketplace (bypassing review)

## Key Files to Create/Modify

### New Components

- `src/features/developer-mode/components/ConnectorManagement.tsx` - Main management UI with list view
- `src/features/developer-mode/components/ConnectorBuilder.tsx` - Multi-step wizard for creating connectors
- `src/features/developer-mode/components/connector-builder/BasicInfoStep.tsx` - Name, icon, category, type
- `src/features/developer-mode/components/connector-builder/ApiConfigStep.tsx` - URL, headers, params, auth
- `src/features/developer-mode/components/connector-builder/FieldMappingStep.tsx` - Response field mappings
- `src/features/developer-mode/components/connector-builder/SettingsStep.tsx` - Pricing, tags, advanced settings

### Modified Files

- [`src/features/developer-mode/components/DeveloperMode.tsx`](src/features/developer-mode/components/DeveloperMode.tsx) - Add "Marketplace" tab
- [`src/features/developer-mode/services/developerModeApi.ts`](src/features/developer-mode/services/developerModeApi.ts) - Add CRUD methods for connector templates
- [`src/features/developer-mode/types/developerMode.ts`](src/features/developer-mode/types/developerMode.ts) - Add `ConnectorTemplate` interface

## Database Operations (via Supabase)

Uses existing `connector_templates` table with `is_official = true` flag for platform connectors. Admins create templates with `marketplace_status = 'approved'` directly.

## UI/UX Flow

1. **List View**: Shows all official connectors with search/filter, create button, and actions (edit/delete/toggle visibility)
2. **Builder Wizard**: 4-step form (Basic Info → API Config → Field Mapping → Settings)
3. **Preview & Test**: Test API calls before publishing
4. **Publish**: Direct publish (no review needed for official connectors)