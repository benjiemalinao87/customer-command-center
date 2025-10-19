# Auto-Loading Demo Data on Workspace Creation

This document provides a step-by-step guide for implementing a system that automatically loads fake contacts and livechat messages when a new workspace is created, based on the existing implementation in the Customer Connect application.

## Overview

When a new workspace is created, the system automatically populates it with demo contacts and associated livechat messages to provide users with sample data to explore the application's features.

## Implementation Steps

### 1. Create Database Tables

First, ensure you have these tables in your database:

```sql
-- Track which workspaces have demo data loaded
CREATE TABLE demo_data_status (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  contacts_loaded BOOLEAN DEFAULT FALSE,
  loaded_at TIMESTAMPTZ,
  created_by UUID
);

-- Ensure you have tables for contacts and messages
-- These should already exist in your application
-- contacts (or similar table)
-- livechat_messages (or similar table)
```

### 2. Create the Demo Data Loading Function

This is the core function that will insert all demo data:

```sql
CREATE OR REPLACE FUNCTION load_demo_contacts(p_workspace_id UUID, p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_contact_ids UUID[] := '{}';
  v_result JSONB;
  v_contact_id UUID;
  v_thread_id UUID;
  v_now TIMESTAMPTZ := NOW();
  v_days_ago_1 TIMESTAMPTZ := NOW() - INTERVAL '1 day';
  v_days_ago_2 TIMESTAMPTZ := NOW() - INTERVAL '2 days';
  v_days_ago_3 TIMESTAMPTZ := NOW() - INTERVAL '3 days';
  v_days_ago_7 TIMESTAMPTZ := NOW() - INTERVAL '7 days';
  -- Add more time variables as needed
  
  -- Variables for status IDs (if you're using status categories)
  v_lead_status_id INTEGER;
  v_contacted_status_id INTEGER;
BEGIN
  -- Check if demo data already loaded for this workspace
  IF EXISTS (SELECT 1 FROM demo_data_status WHERE workspace_id = p_workspace_id AND contacts_loaded = TRUE) THEN
    RETURN jsonb_build_object('success', FALSE, 'message', 'Demo contacts already loaded for this workspace');
  END IF;

  -- Create status categories if needed (optional, depends on your app)
  -- This example creates a 'Lead Status' category with various statuses
  DECLARE v_lead_category_id INTEGER;
  BEGIN
    INSERT INTO status_categories (workspace_id, name, description, created_by) 
    VALUES (p_workspace_id, 'Lead Status', 'Track lead progression', p_user_id)
    RETURNING id INTO v_lead_category_id;
    
    -- Insert statuses within this category
    INSERT INTO statuses (category_id, name, color, position, workspace_id, created_by)
    VALUES 
      (v_lead_category_id, 'New', '#3498db', 1, p_workspace_id, p_user_id) RETURNING id INTO v_lead_status_id,
      (v_lead_category_id, 'Contacted', '#f1c40f', 2, p_workspace_id, p_user_id) RETURNING id INTO v_contacted_status_id;
    -- Add more statuses as needed
  END;
  
  -- Insert demo contacts
  -- Example for first contact:
  INSERT INTO contacts (
    workspace_id, first_name, last_name, email, phone, 
    status_id, status_name, notes, tags, created_at, updated_at, 
    created_by, is_active, last_contacted_at, source, source_detail,
    is_subscribed, is_verified, metadata
  ) VALUES (
    p_workspace_id, 'John', 'Smith', 'john.smith@example.com', '+15551234567',
    v_lead_status_id, 'New Lead', 'Interested in our premium plan',
    '["sales", "premium"]'::jsonb, v_days_ago_2, v_now,
    p_user_id, TRUE, v_days_ago_1, 'website', 'contact form',
    TRUE, TRUE, '{"company": "Acme Inc", "position": "Manager"}'::jsonb
  ) RETURNING id INTO v_contact_id;
  
  v_contact_ids := array_append(v_contact_ids, v_contact_id);
  
  -- Insert livechat messages for this contact
  INSERT INTO livechat_messages (
    contact_id, workspace_id, direction, body, sender, 
    created_at, status, is_read, msg_type, message_type
  ) VALUES
  (v_contact_id, p_workspace_id, 'inbound', 'Hi, I\'m interested in your services.', 'contact', 
   v_days_ago_2, 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'outbound', 'Hello John! Thanks for reaching out. How can we help you today?', 'agent', 
   v_days_ago_2 + INTERVAL '30 minutes', 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'inbound', 'I\'d like to know more about your premium plan pricing.', 'contact', 
   v_days_ago_1, 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'outbound', 'I\'d be happy to discuss our premium plans with you. Would you be available for a quick call tomorrow?', 'agent', 
   v_days_ago_1 + INTERVAL '15 minutes', 'delivered', false, 'text', 'text');
  
  -- Add more contacts with their messages
  -- Example for second contact:
  INSERT INTO contacts (
    workspace_id, first_name, last_name, email, phone, 
    status_id, status_name, notes, tags, created_at, updated_at, 
    created_by, is_active, last_contacted_at, source, source_detail,
    is_subscribed, is_verified, metadata
  ) VALUES (
    p_workspace_id, 'Sarah', 'Johnson', 'sarah.j@example.org', '+15559876543',
    v_contacted_status_id, 'Contacted', 'Following up after initial demo',
    '["enterprise", "demo"]'::jsonb, v_days_ago_7, v_now,
    p_user_id, TRUE, v_days_ago_3, 'referral', 'existing client',
    TRUE, TRUE, '{"company": "Tech Solutions", "position": "Director"}'::jsonb
  ) RETURNING id INTO v_contact_id;
  
  v_contact_ids := array_append(v_contact_ids, v_contact_id);
  
  -- Insert livechat messages for second contact
  INSERT INTO livechat_messages (
    contact_id, workspace_id, direction, body, sender, 
    created_at, status, is_read, msg_type, message_type
  ) VALUES
  (v_contact_id, p_workspace_id, 'inbound', 'Hello, I was referred by one of your clients. Can we schedule a demo?', 'contact', 
   v_days_ago_7, 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'outbound', 'Hi Sarah! We\'d be delighted to set up a demo for you. What time works best for you?', 'agent', 
   v_days_ago_7 + INTERVAL '1 hour', 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'inbound', 'Would next Tuesday at 2pm work?', 'contact', 
   v_days_ago_3, 'delivered', true, 'text', 'text'),
  (v_contact_id, p_workspace_id, 'outbound', 'Tuesday at 2pm works perfectly. I\'ll send you a calendar invite shortly.', 'agent', 
   v_days_ago_3 + INTERVAL '20 minutes', 'delivered', true, 'text', 'text');
  
  -- Create demo data status record
  INSERT INTO demo_data_status (workspace_id, contacts_loaded, loaded_at, created_by) 
  VALUES (p_workspace_id, TRUE, v_now, p_user_id)
  ON CONFLICT (workspace_id) DO UPDATE 
  SET contacts_loaded = TRUE, loaded_at = v_now;
  
  RETURN jsonb_build_object(
    'success', TRUE, 
    'message', 'Demo contacts with complete message interactions loaded successfully', 
    'contacts_count', array_length(v_contact_ids, 1), 
    'contact_ids', v_contact_ids
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM, 'message', 'Failed to load demo contacts');
END;
$$ LANGUAGE plpgsql;
```

### 3. Create Trigger Functions

Create functions that will be triggered when a new workspace is created:

```sql
-- First trigger function
CREATE OR REPLACE FUNCTION load_demo_data_on_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any status categories already exist for this workspace
  IF NOT EXISTS (
    SELECT 1 FROM status_categories WHERE workspace_id = NEW.id
  ) THEN
    -- Call the demo contacts loading function
    -- Use the creator's user_id as the demo data creator
    PERFORM load_demo_contacts(NEW.id, NEW.created_by);
  END IF;
  
  -- Return the NEW record to complete the trigger
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent workspace creation
    RAISE WARNING 'Error loading demo data for workspace %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Second trigger function (backup/alternative approach)
CREATE OR REPLACE FUNCTION auto_load_demo_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if any status categories already exist for this workspace
  IF NOT EXISTS (
    SELECT 1 FROM status_categories WHERE workspace_id = NEW.id
  ) THEN
    -- Call the enhanced demo contacts loading function
    -- Use the creator's user_id as the demo data creator
    PERFORM load_demo_contacts(NEW.id, NEW.created_by);
  END IF;
  
  -- Return the NEW record to complete the trigger
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 4. Create Database Triggers

Create triggers that will execute the functions when a new workspace is created:

```sql
-- Primary trigger
CREATE TRIGGER load_demo_data_trigger
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION load_demo_data_on_workspace_creation();

-- Backup trigger (ensures demo data is loaded)
CREATE TRIGGER trigger_auto_load_demo_data
AFTER INSERT ON workspaces
FOR EACH ROW
EXECUTE FUNCTION auto_load_demo_data();
```

## Customization

When adapting this system to your application:

1. Adjust the table and column names to match your database schema
2. Customize the demo data to be relevant to your application's domain
3. Add more contacts and more complex conversation flows as needed
4. Consider adding other types of demo data (tasks, appointments, etc.)
5. Ensure proper error handling to prevent workspace creation failures

## Maintenance

To maintain this system:

1. Periodically update the demo data to reflect new features
2. Monitor for any errors in the trigger execution
3. Consider adding an admin option to manually trigger demo data loading

## Conclusion

This implementation provides a seamless way to populate new workspaces with realistic demo data, enhancing the user onboarding experience. Users can immediately see how the application works with realistic data instead of starting with an empty workspace.

## Lessons Learned

- Using database triggers for demo data loading keeps the logic centralized in the database
- The tracking table prevents duplicate data loading
- Realistic conversation flows help users understand the messaging functionality
- Varied timestamps create a more authentic demo experience
