/**
 * Developer Mode Feature - TypeScript Type Definitions
 * 
 * This file contains all TypeScript interfaces used throughout the Developer Mode feature.
 * These types ensure type safety and provide IntelliSense support in the IDE.
 * 
 * @file types/developerMode.ts
 * @module developer-mode/types
 */

/**
 * Developer Application Interface
 * 
 * Represents a workspace's application to enable Developer Mode.
 * This is the data structure for applications pending admin review.
 * 
 * @interface DeveloperApplication
 */
export interface DeveloperApplication {
  /** Unique identifier for the application record */
  id: string;
  
  /** Workspace ID that submitted the application */
  workspace_id: string;
  
  /** Display name of the workspace */
  workspace_name: string;
  
  /** Current approval status - determines visibility and actions available */
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  
  /** Name of the developer/contact person */
  developer_name: string;
  
  /** Email address of the developer */
  developer_email: string;
  
  /** Optional website URL for the developer */
  developer_website?: string;
  
  /** Optional bio/description of the developer */
  developer_bio?: string;
  
  /** Description of how they plan to use Developer Mode */
  intended_use: string;
  
  /** Admin user ID who approved the application (if approved) */
  approved_by?: string;
  
  /** Timestamp when application was approved */
  approved_at?: string;
  
  /** Reason provided when application was rejected */
  rejection_reason?: string;
  
  /** Timestamp when application was created */
  created_at: string;
}

/**
 * Connector Submission Interface
 * 
 * Represents a connector that has been submitted to the marketplace.
 * Connectors must be reviewed and approved by admins before being published.
 * 
 * @interface ConnectorSubmission
 */
export interface ConnectorSubmission {
  /** Unique identifier for the connector */
  id: string;

  /** Display name of the connector */
  name: string;

  /** Detailed description of what the connector does */
  description: string;

  /** Category for marketplace organization (e.g., "E-commerce", "Marketing") */
  category: string;

  /** Emoji or icon identifier for visual representation */
  icon: string;

  /** Workspace ID of the developer who created this connector */
  developer_workspace_id: string;

  /** Name of the developer/workspace */
  developer_name: string;

  /** Current status in the approval workflow */
  marketplace_status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

  /** Pricing model for the connector */
  pricing_type: 'free' | 'one_time' | 'subscription';

  /** Base price in USD (0 for free connectors) */
  base_price: number;

  /** Billing interval for subscription-based connectors */
  subscription_interval?: 'monthly' | 'annual';

  /** Admin user ID who reviewed the connector */
  reviewed_by?: string;

  /** Timestamp when connector was reviewed */
  reviewed_at?: string;

  /** Reason provided if connector was rejected */
  rejection_reason?: string;

  /** Number of times this connector has been installed */
  install_count: number;

  /** Timestamp when connector was created */
  created_at: string;

  /** API configuration (method, url, headers, body, auth settings) */
  config?: Record<string, unknown>;

  /** Input schema defining required credentials/parameters */
  input_schema?: Record<string, unknown>;

  /** Tags for search and categorization */
  tags?: string[];

  /** Field mappings for response data transformation */
  field_mappings?: Array<{
    source_path: string;
    target_field: string;
  }>;
}

/**
 * Developer Workspace Interface
 *
 * Represents a workspace that has been approved for Developer Mode.
 * Contains usage statistics, revenue data, and Stripe Connect information.
 *
 * NOTE: This interface matches the flat structure returned by the admin-api
 * Cloudflare Worker at /admin-api/workspaces
 *
 * @interface DeveloperWorkspace
 */
export interface DeveloperWorkspace {
  /** Unique identifier for the developer config record */
  id: string;

  /** Workspace ID (foreign key to workspaces table) */
  workspace_id: string;

  /** Display name of the workspace */
  workspace_name: string;

  /** Name of the primary developer contact */
  developer_name: string;

  /** Email address of the developer */
  developer_email: string;

  /** Current approval status */
  approval_status: 'approved' | 'suspended';

  /** Timestamp when workspace was approved */
  approved_at?: string;

  /** Whether Stripe Connect onboarding is complete */
  stripe_onboarding_complete: boolean;

  /** Number of SMS messages sent this period */
  sms_sent: number;

  /** Number of emails sent this period */
  emails_sent: number;

  /** Current number of contacts stored */
  contacts_count: number;

  /** Total API calls made */
  api_calls_count: number;

  /** Number of connectors published to marketplace */
  published_connectors: number;

  /** Total revenue generated from connector sales (in USD) */
  total_revenue: number;

  /** Timestamp when workspace was created */
  created_at: string;
}

/**
 * Revenue Statistics Interface
 * 
 * Aggregated revenue data for the platform, including breakdowns by
 * connectors and developers. Used for the Revenue Dashboard.
 * 
 * @interface RevenueStats
 */
export interface RevenueStats {
  /** Total revenue from all connector sales (in USD) */
  total_revenue: number;
  
  /** Platform's share of revenue (30% of total) */
  platform_revenue: number;
  
  /** Total amount paid out to developers (70% of total) */
  developer_payouts: number;
  
  /** Start of the reporting period (ISO 8601 timestamp) */
  period_start: string;
  
  /** End of the reporting period (ISO 8601 timestamp) */
  period_end: string;
  
  /** Top performing connectors by revenue */
  top_connectors: Array<{
    /** Connector ID */
    id: string;
    
    /** Connector name */
    name: string;
    
    /** Total revenue generated (in USD) */
    revenue: number;
    
    /** Number of installations */
    installs: number;
  }>;
  
  /** Top earning developers by revenue */
  top_developers: Array<{
    /** Workspace ID */
    workspace_id: string;
    
    /** Workspace name */
    workspace_name: string;
    
    /** Total revenue generated (in USD) */
    revenue: number;
    
    /** Number of connectors published */
    connector_count: number;
  }>;
}

