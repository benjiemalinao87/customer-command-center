# Dynamic Texting Integration Design

## Overview
This document outlines the design for a flexible, multi-provider texting integration system that operates at both workspace and user levels. The system is designed to support multiple messaging providers (Twilio, Telnyx, etc.) while maintaining security, scalability, and ease of use.

## Database Schema

### 1. Workspace Integrations Table
```sql
create table workspace_integrations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references workspaces(id) not null,
  provider_type text not null, -- 'twilio', 'telnyx', etc.
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users(id),
  
  -- Encrypted credentials (use Supabase Vault or similar)
  credentials jsonb,
  
  -- Provider-specific settings
  settings jsonb,
  
  -- Constraints
  unique(workspace_id, provider_type)
);

-- RLS Policies
alter table workspace_integrations enable row level security;

-- Only workspace admins can manage integrations
create policy "Workspace admins can manage integrations"
  on workspace_integrations
  for all
  using (
    auth.uid() in (
      select user_id 
      from workspace_members 
      where workspace_id = workspace_integrations.workspace_id 
      and role = 'admin'
    )
  );
```

### 2. Integration Phone Numbers Table
```sql
create table integration_phone_numbers (
  id uuid primary key default uuid_generate_v4(),
  integration_id uuid references workspace_integrations(id) not null,
  phone_number text not null,
  friendly_name text,
  capabilities jsonb, -- e.g., {sms: true, voice: true, whatsapp: true}
  is_default boolean default false,
  status text not null, -- 'active', 'pending', 'inactive'
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  unique(integration_id, phone_number)
);
```

### 3. User Integration Settings Table
```sql
create table user_integration_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  integration_id uuid references workspace_integrations(id) not null,
  default_phone_number_id uuid references integration_phone_numbers(id),
  settings jsonb, -- User-specific settings for this integration
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Constraints
  unique(user_id, integration_id)
);
```

## Integration Flow

### Admin Setup Flow
1. Admin logs into workspace
2. Navigates to Integration Settings
3. Selects provider (e.g., Twilio)
4. Enters provider credentials
5. System validates credentials
6. On success:
   - Encrypts and stores credentials
   - Fetches available phone numbers
   - Allows admin to configure default settings
   - Enables texting features for workspace

### Agent Usage Flow
1. Agent logs into workspace
2. System checks workspace integrations
3. If active integration exists:
   - Loads available phone numbers
   - Applies user-specific settings
   - Enables texting features in UI
4. Agent can:
   - Send/receive messages
   - View message history
   - Change their default phone number
   - Configure personal settings

## Security Considerations

### Credential Storage
- Store encrypted credentials in Supabase Vault
- Never expose credentials in frontend code
- Implement key rotation mechanism
- Log all credential access attempts

### Access Control
- Workspace-level permissions
  - Only admins can manage integrations
  - Only admins can view/modify credentials
- User-level permissions
  - Users can only access assigned phone numbers
  - Users can only modify their own settings

## Provider Abstraction Layer

### Integration Provider Interface
```typescript
interface MessageProvider {
  type: string;                 // 'twilio', 'telnyx', etc.
  capabilities: string[];       // ['sms', 'voice', 'whatsapp']
  
  // Core Methods
  initialize(credentials: any): Promise<void>;
  sendMessage(params: SendMessageParams): Promise<MessageResponse>;
  receiveMessage(webhook: WebhookData): Promise<InboundMessage>;
  
  // Phone Number Management
  listPhoneNumbers(): Promise<PhoneNumber[]>;
  purchasePhoneNumber(params: PurchaseParams): Promise<PhoneNumber>;
  releasePhoneNumber(phoneId: string): Promise<void>;
  
  // Utility Methods
  validateCredentials(credentials: any): Promise<boolean>;
  getUsageMetrics(params: MetricsParams): Promise<UsageMetrics>;
}
```

## Implementation Phases

### Phase 1: Basic Integration
- Implement workspace-level Twilio integration
- Basic phone number management
- Simple send/receive functionality

### Phase 2: Enhanced Features
- Add user-specific settings
- Implement phone number assignment
- Add message templates
- Add scheduled messages

### Phase 3: Multi-Provider Support
- Add Telnyx integration
- Implement provider abstraction layer
- Add provider switching capability

### Phase 4: Advanced Features
- Add bulk messaging
- Implement failover between providers
- Add analytics and reporting
- Add cost management features

## Migration Strategy
For existing systems with hardcoded Twilio credentials:
1. Create migration script to move credentials to new schema
2. Create default workspace integration
3. Associate existing phone numbers with new integration
4. Update all existing code to use new integration layer
5. Implement graceful fallback for legacy code

## Monitoring and Maintenance
- Monitor message delivery rates
- Track provider costs
- Monitor API usage and limits
- Regular credential rotation
- Automated provider health checks

## Future Considerations
- Support for more providers (MessageBird, Vonage, etc.)
- Multi-workspace support
- Load balancing between providers
- Cost optimization features
- Advanced analytics and reporting
- Integration with CRM systems
