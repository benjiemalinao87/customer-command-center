/**
 * Developer Mode API Service
 *
 * This service layer handles all API communication for the Developer Mode feature.
 * Connects to the admin-api Cloudflare Worker for all operations.
 *
 * Backend Location: cloudflare-workers/admin-api/
 * API Base URL: https://admin-api.benjiemalinao879557.workers.dev
 *
 * @file services/developerModeApi.ts
 * @module developer-mode/services
 */

import { getAccessToken } from '../../../lib/supabase';
import type {
  DeveloperApplication,
  ConnectorSubmission,
  DeveloperWorkspace,
  RevenueStats
} from '../types/developerMode';

/**
 * Admin API Base URL - Cloudflare Worker endpoint
 * This connects to the dedicated admin-api worker for Developer Mode management
 */
const ADMIN_API_BASE_URL = import.meta.env.VITE_DEVELOPER_MODE_API_URL || 'https://admin-api.benjiemalinao879557.workers.dev';

/**
 * API Response Types
 */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

interface ConnectorStats {
  total: number;
  pending_review: number;
  approved: number;
  rejected: number;
  suspended: number;
  categories: { name: string; count: number }[];
}

interface WorkspaceStats {
  total: number;
  active: number;
  suspended: number;
  total_revenue: number;
  total_connectors: number;
}

interface RevenueSummary {
  total_revenue: number;
  platform_revenue: number;
  developer_payouts: number;
  pending_payouts: number;
  total_transactions: number;
}

/**
 * Get JWT token from Supabase auth
 */
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await getAccessToken();
    if (!token) {
      console.error('No Supabase session found. User must be logged in.');
    }
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Make authenticated request to admin-api
 */
const makeAdminRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = await getAuthToken();

  if (!token) {
    console.error('No auth token found - user may not be logged in');
    throw new Error('Authentication required. Please log in.');
  }

  const url = `${ADMIN_API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('API Error:', errorData);

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (response.status === 403) {
      throw new Error('Admin access required. You do not have permission to access this resource.');
    }
    if (response.status === 404) {
      throw new Error(errorData.error || 'Resource not found.');
    }

    throw new Error(errorData.error || `API request failed: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Developer Mode API Service Object
 *
 * This object contains all API methods for interacting with the Developer Mode backend.
 * All methods connect to the admin-api Cloudflare Worker.
 *
 * Base URL: https://admin-api.benjiemalinao879557.workers.dev
 * Authentication: Requires admin JWT token in Authorization header
 */
export const developerModeApi = {
  /**
   * ============================================================================
   * DEVELOPER APPLICATIONS API METHODS
   * ============================================================================
   */

  /**
   * Get list of developer mode applications
   *
   * Fetches all applications with optional status filter.
   * Used by DeveloperApplications component to display the list.
   *
   * @param status - Optional filter by approval status ('pending', 'approved', 'rejected', 'suspended')
   * @param search - Optional search term to filter by name/email
   * @param page - Page number for pagination (default: 1)
   * @param limit - Number of items per page (default: 20)
   * @returns Promise resolving to array of DeveloperApplication objects
   *
   * Backend Endpoint: GET /admin-api/applications
   */
  getApplications: async (
    status?: string,
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ applications: DeveloperApplication[]; pagination: ApiResponse<any>['pagination'] }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const query = params.toString() ? `?${params}` : '';
    const response = await makeAdminRequest<ApiResponse<DeveloperApplication[]>>(`/admin-api/applications${query}`);

    return {
      applications: response.data || [],
      pagination: response.pagination
    };
  },

  /**
   * Get a single application by ID
   *
   * @param applicationId - The application ID to fetch
   * @returns Promise resolving to DeveloperApplication object
   *
   * Backend Endpoint: GET /admin-api/applications/:id
   */
  getApplication: async (applicationId: string): Promise<DeveloperApplication> => {
    const response = await makeAdminRequest<ApiResponse<DeveloperApplication>>(`/admin-api/applications/${applicationId}`);
    return response.data;
  },

  /**
   * Get application statistics
   *
   * @returns Promise resolving to statistics object
   *
   * Backend Endpoint: GET /admin-api/applications/stats/summary
   */
  getApplicationStats: async (): Promise<ApplicationStats> => {
    const response = await makeAdminRequest<ApiResponse<ApplicationStats>>('/admin-api/applications/stats/summary');
    return response.data;
  },

  /**
   * Approve a developer mode application
   *
   * Approves a workspace's application to enable Developer Mode.
   * This will:
   * - Set approval_status to 'approved'
   * - Set is_developer_mode to true
   * - Record approved_by and approved_at
   *
   * @param applicationId - The application ID to approve
   * @param notes - Optional admin notes for the approval
   * @returns Promise that resolves when approval is complete
   *
   * Backend Endpoint: POST /admin-api/applications/:id/approve
   */
  approveApplication: async (applicationId: string, notes?: string): Promise<DeveloperApplication> => {
    const response = await makeAdminRequest<ApiResponse<DeveloperApplication>>(
      `/admin-api/applications/${applicationId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: notes }),
      }
    );
    return response.data;
  },

  /**
   * Reject a developer mode application
   *
   * Rejects a workspace's application with a provided reason.
   * This will:
   * - Set approval_status to 'rejected'
   * - Store rejection_reason
   *
   * @param applicationId - The application ID to reject
   * @param reason - Required reason for rejection (shown to developer)
   * @returns Promise that resolves when rejection is complete
   *
   * Backend Endpoint: POST /admin-api/applications/:id/reject
   */
  rejectApplication: async (applicationId: string, reason: string): Promise<DeveloperApplication> => {
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    const response = await makeAdminRequest<ApiResponse<DeveloperApplication>>(
      `/admin-api/applications/${applicationId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return response.data;
  },

  /**
   * Suspend a developer workspace
   *
   * Suspends an approved developer workspace, disabling Developer Mode access.
   * This is used for abuse prevention or policy violations.
   *
   * @param applicationId - The application ID to suspend
   * @param reason - Required reason for suspension
   * @returns Promise that resolves when suspension is complete
   *
   * Backend Endpoint: POST /admin-api/applications/:id/suspend
   */
  suspendApplication: async (applicationId: string, reason: string): Promise<DeveloperApplication> => {
    if (!reason || reason.trim() === '') {
      throw new Error('Suspension reason is required');
    }

    const response = await makeAdminRequest<ApiResponse<DeveloperApplication>>(
      `/admin-api/applications/${applicationId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return response.data;
  },

  /**
   * Unsuspend a developer workspace
   *
   * Restores a suspended developer workspace.
   *
   * @param applicationId - The application ID to unsuspend
   * @returns Promise that resolves when unsuspension is complete
   *
   * Backend Endpoint: POST /admin-api/applications/:id/unsuspend
   */
  unsuspendApplication: async (applicationId: string): Promise<DeveloperApplication> => {
    const response = await makeAdminRequest<ApiResponse<DeveloperApplication>>(
      `/admin-api/applications/${applicationId}/unsuspend`,
      {
        method: 'POST',
      }
    );
    return response.data;
  },

  /**
   * ============================================================================
   * CONNECTOR MARKETPLACE API METHODS
   * ============================================================================
   */

  /**
   * Get list of connector submissions
   *
   * Fetches all connectors submitted to the marketplace with optional status filter.
   * Used by ConnectorReview component to display the review queue.
   *
   * @param status - Optional filter by marketplace status ('pending_review', 'approved', 'rejected', 'suspended')
   * @param category - Optional filter by category
   * @param search - Optional search term
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Promise resolving to array of ConnectorSubmission objects
   *
   * Backend Endpoint: GET /admin-api/connectors
   */
  getConnectors: async (
    status?: string,
    category?: string,
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ connectors: ConnectorSubmission[]; pagination: ApiResponse<any>['pagination'] }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const query = params.toString() ? `?${params}` : '';
    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission[]>>(`/admin-api/connectors${query}`);

    return {
      connectors: response.data || [],
      pagination: response.pagination
    };
  },

  /**
   * Get a single connector by ID
   *
   * @param connectorId - The connector ID to fetch
   * @returns Promise resolving to ConnectorSubmission object
   *
   * Backend Endpoint: GET /admin-api/connectors/:id
   */
  getConnector: async (connectorId: string): Promise<ConnectorSubmission> => {
    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission>>(`/admin-api/connectors/${connectorId}`);
    return response.data;
  },

  /**
   * Get connector statistics
   *
   * @returns Promise resolving to statistics object
   *
   * Backend Endpoint: GET /admin-api/connectors/stats/summary
   */
  getConnectorStats: async (): Promise<ConnectorStats> => {
    const response = await makeAdminRequest<ApiResponse<ConnectorStats>>('/admin-api/connectors/stats/summary');
    return response.data;
  },

  /**
   * Get connector categories with counts
   *
   * @returns Promise resolving to category list
   *
   * Backend Endpoint: GET /admin-api/connectors/categories/list
   */
  getConnectorCategories: async (): Promise<{ name: string; count: number }[]> => {
    const response = await makeAdminRequest<ApiResponse<{ name: string; count: number }[]>>('/admin-api/connectors/categories/list');
    return response.data;
  },

  /**
   * Approve a connector for marketplace publication
   *
   * Approves a connector submission, making it visible in the marketplace.
   * This will:
   * - Set marketplace_status to 'approved'
   * - Set is_public to true
   * - Record reviewed_by and reviewed_at
   *
   * @param connectorId - The connector ID to approve
   * @param notes - Optional admin notes for the approval
   * @returns Promise that resolves when approval is complete
   *
   * Backend Endpoint: POST /admin-api/connectors/:id/approve
   */
  approveConnector: async (connectorId: string, notes?: string): Promise<ConnectorSubmission> => {
    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission>>(
      `/admin-api/connectors/${connectorId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ reason: notes }),
      }
    );
    return response.data;
  },

  /**
   * Reject a connector submission
   *
   * Rejects a connector submission with a provided reason.
   * This will:
   * - Set marketplace_status to 'rejected'
   * - Store rejection_reason
   *
   * @param connectorId - The connector ID to reject
   * @param reason - Required reason for rejection (shown to developer)
   * @returns Promise that resolves when rejection is complete
   *
   * Backend Endpoint: POST /admin-api/connectors/:id/reject
   */
  rejectConnector: async (connectorId: string, reason: string): Promise<ConnectorSubmission> => {
    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission>>(
      `/admin-api/connectors/${connectorId}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return response.data;
  },

  /**
   * Suspend an approved connector
   *
   * Removes a connector from the marketplace.
   *
   * @param connectorId - The connector ID to suspend
   * @param reason - Required reason for suspension
   * @returns Promise that resolves when suspension is complete
   *
   * Backend Endpoint: POST /admin-api/connectors/:id/suspend
   */
  suspendConnector: async (connectorId: string, reason: string): Promise<ConnectorSubmission> => {
    if (!reason || reason.trim() === '') {
      throw new Error('Suspension reason is required');
    }

    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission>>(
      `/admin-api/connectors/${connectorId}/suspend`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return response.data;
  },

  /**
   * Unsuspend a suspended connector
   *
   * Restores a suspended connector to the marketplace.
   *
   * @param connectorId - The connector ID to unsuspend
   * @returns Promise that resolves when unsuspension is complete
   *
   * Backend Endpoint: POST /admin-api/connectors/:id/unsuspend
   */
  unsuspendConnector: async (connectorId: string): Promise<ConnectorSubmission> => {
    const response = await makeAdminRequest<ApiResponse<ConnectorSubmission>>(
      `/admin-api/connectors/${connectorId}/unsuspend`,
      {
        method: 'POST',
      }
    );
    return response.data;
  },

  /**
   * ============================================================================
   * DEVELOPER WORKSPACES API METHODS
   * ============================================================================
   */

  /**
   * Get list of all developer workspaces
   *
   * Fetches all workspaces that have Developer Mode enabled.
   * Used by DeveloperWorkspaces component to display the management list.
   *
   * @param status - Optional filter by status ('approved', 'suspended')
   * @param search - Optional search term
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Promise resolving to array of DeveloperWorkspace objects
   *
   * Backend Endpoint: GET /admin-api/workspaces
   */
  getWorkspaces: async (
    status?: string,
    search?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ workspaces: DeveloperWorkspace[]; pagination: ApiResponse<any>['pagination'] }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const query = params.toString() ? `?${params}` : '';
    const response = await makeAdminRequest<ApiResponse<DeveloperWorkspace[]>>(`/admin-api/workspaces${query}`);

    return {
      workspaces: response.data || [],
      pagination: response.pagination
    };
  },

  /**
   * Get detailed information for a specific developer workspace
   *
   * Fetches comprehensive details for a single workspace including
   * usage stats, revenue, and configuration.
   *
   * @param workspaceId - The workspace ID to fetch details for
   * @returns Promise resolving to DeveloperWorkspace object
   *
   * Backend Endpoint: GET /admin-api/workspaces/:id
   */
  getWorkspaceDetails: async (workspaceId: string): Promise<DeveloperWorkspace> => {
    const response = await makeAdminRequest<ApiResponse<DeveloperWorkspace>>(`/admin-api/workspaces/${workspaceId}`);
    return response.data;
  },

  /**
   * Get workspace statistics
   *
   * @returns Promise resolving to statistics object
   *
   * Backend Endpoint: GET /admin-api/workspaces/stats/summary
   */
  getWorkspaceStats: async (): Promise<WorkspaceStats> => {
    const response = await makeAdminRequest<ApiResponse<WorkspaceStats>>('/admin-api/workspaces/stats/summary');
    return response.data;
  },

  /**
   * ============================================================================
   * REVENUE ANALYTICS API METHODS
   * ============================================================================
   */

  /**
   * Get platform revenue statistics
   *
   * Fetches aggregated revenue data for the specified time period.
   * Includes total revenue, platform share, developer payouts, and top performers.
   * Used by RevenueDashboard component.
   *
   * @param startDate - Start date for the period (ISO 8601 format)
   * @param endDate - End date for the period (ISO 8601 format)
   * @returns Promise resolving to RevenueStats object
   *
   * Backend Endpoint: GET /admin-api/revenue
   */
  getRevenueStats: async (startDate?: string, endDate?: string): Promise<RevenueStats> => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const query = params.toString() ? `?${params}` : '';
    const response = await makeAdminRequest<ApiResponse<RevenueStats>>(`/admin-api/revenue${query}`);
    return response.data;
  },

  /**
   * Get revenue trends
   *
   * Fetches revenue data points for charting.
   *
   * @param period - Aggregation period ('daily', 'weekly', 'monthly')
   * @param days - Number of days to look back
   * @returns Promise resolving to trend data
   *
   * Backend Endpoint: GET /admin-api/revenue/trends
   */
  getRevenueTrends: async (
    period: 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<{ date: string; revenue: number; transactions: number }[]> => {
    const params = new URLSearchParams();
    params.append('period', period);
    params.append('days', days.toString());

    const response = await makeAdminRequest<ApiResponse<{ date: string; revenue: number; transactions: number }[]>>(
      `/admin-api/revenue/trends?${params}`
    );
    return response.data;
  },

  /**
   * Get payout history
   *
   * Fetches developer payout records.
   *
   * @param status - Optional filter by payout status ('pending', 'completed', 'failed')
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @returns Promise resolving to payout records
   *
   * Backend Endpoint: GET /admin-api/revenue/payouts
   */
  getPayouts: async (
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ payouts: any[]; pagination: ApiResponse<any>['pagination'] }> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const query = params.toString() ? `?${params}` : '';
    const response = await makeAdminRequest<ApiResponse<any[]>>(`/admin-api/revenue/payouts${query}`);

    return {
      payouts: response.data || [],
      pagination: response.pagination
    };
  },

  /**
   * Get revenue summary statistics
   *
   * @returns Promise resolving to summary object
   *
   * Backend Endpoint: GET /admin-api/revenue/stats/summary
   */
  getRevenueSummary: async (): Promise<RevenueSummary> => {
    const response = await makeAdminRequest<ApiResponse<RevenueSummary>>('/admin-api/revenue/stats/summary');
    return response.data;
  },

  /**
   * Export revenue data as CSV
   *
   * Downloads revenue data for a specified period.
   *
   * @param startDate - Start date for export
   * @param endDate - End date for export
   * @returns Promise resolving to CSV string
   *
   * Backend Endpoint: GET /admin-api/revenue/export
   */
  exportRevenue: async (startDate?: string, endDate?: string): Promise<string> => {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const query = params.toString() ? `?${params}` : '';
    const response = await fetch(`${ADMIN_API_BASE_URL}/admin-api/revenue/export${query}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export revenue data');
    }

    return response.text();
  },

  /**
   * ============================================================================
   * HEALTH CHECK
   * ============================================================================
   */

  /**
   * Check API health status
   *
   * @returns Promise resolving to health status
   *
   * Backend Endpoint: GET /health
   */
  checkHealth: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await fetch(`${ADMIN_API_BASE_URL}/health`);
    return response.json();
  },
};
