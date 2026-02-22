/**
 * Admin API Service
 * Connects to deepseek-test-livechat backend (/api/admin/*)
 * Handles SaaS owner operations: workspace management, subscriptions, monitoring
 */

import { getAccessToken } from './supabase';

// Backend URL - update this to match your deepseek-test-livechat backend
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_URL || 'https://cc.automate8.com/api/admin';

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
 * Make authenticated request to admin API
 */
const makeAdminRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = await getAuthToken();

  if (!token) {
    console.error('🔴 No auth token found - user may not be logged in');
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
    console.error('❌ API Error:', errorData);
    const detailBits = [errorData.error, errorData.details, errorData.code]
      .filter((value) => Boolean(value))
      .map((value) => String(value));
    throw new Error(detailBits.join(' | ') || `API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

/**
 * Admin API Methods
 */
export const adminApi = {
  /**
   * Check if current user has admin access
   */
  async checkAdminAccess(): Promise<boolean> {
    try {
      const response = await makeAdminRequest('/dashboard');
      return response.success === true;
    } catch (error) {
      console.error('Admin access check failed:', error);
      return false;
    }
  },

  /**
   * Get dashboard overview statistics
   */
  async getDashboardOverview() {
    return makeAdminRequest('/dashboard');
  },

  /**
   * Get all workspaces with subscription details
   */
  async getWorkspaces() {
    return makeAdminRequest('/workspaces');
  },

  /**
   * Update workspace subscription plan
   */
  async updateWorkspaceSubscription(workspaceId: string, planName: string, reason: string) {
    return makeAdminRequest(`/workspaces/${workspaceId}/subscription`, {
      method: 'PUT',
      body: JSON.stringify({ planName, reason }),
    });
  },

  /**
   * Get workspace usage statistics
   */
  async getWorkspaceUsage(workspaceId: string) {
    return makeAdminRequest(`/workspaces/${workspaceId}/usage`);
  },

  /**
   * Get feature rollout catalog for beta widget controls
   */
  async getFeatureRolloutCatalog() {
    return makeAdminRequest('/feature-rollouts/catalog');
  },

  /**
   * Create a feature catalog item for rollout controls
   */
  async createFeatureRolloutCatalogItem(payload: {
    id?: string;
    title: string;
    badge?: string;
    description?: string;
    ctaLabel?: string;
    formTitle?: string;
    formDescription?: string;
    formEmailLabel?: string;
    formEmailHint?: string;
  }) {
    return makeAdminRequest('/feature-rollouts/catalog', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get current feature rollout state for a workspace
   */
  async getWorkspaceFeatureRollout(workspaceId: string) {
    return makeAdminRequest(`/workspaces/${workspaceId}/feature-rollout`);
  },

  /**
   * Update feature rollout state for a workspace
   */
  async updateWorkspaceFeatureRollout(
    workspaceId: string,
    payload: { enabled: boolean; featureId: string | null }
  ) {
    return makeAdminRequest(`/workspaces/${workspaceId}/feature-rollout`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get feature rollout signup demand for a workspace
   */
  async getWorkspaceFeatureRolloutSignups(
    workspaceId: string,
    featureId?: string,
    limit: number = 100
  ) {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    if (featureId) {
      params.append('featureId', featureId);
    }

    return makeAdminRequest(`/workspaces/${workspaceId}/feature-rollout/signups?${params.toString()}`);
  },

  /**
   * Get aggregate feature rollout signup demand across workspaces
   */
  async getFeatureRolloutSignups(options?: {
    workspaceIds?: string[];
    featureId?: string;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    params.append('limit', String(options?.limit ?? 100));

    if (options?.featureId) {
      params.append('featureId', options.featureId);
    }

    if (options?.workspaceIds && options.workspaceIds.length > 0) {
      params.append('workspaceIds', options.workspaceIds.join(','));
    }

    return makeAdminRequest(`/feature-rollouts/signups?${params.toString()}`);
  },

  /**
   * Get all subscription plans
   */
  async getSubscriptionPlans() {
    return makeAdminRequest('/subscription-plans');
  },

  /**
   * Update subscription plan configuration
   */
  async updateSubscriptionPlan(planId: string, updates: any) {
    return makeAdminRequest(`/subscription-plans/${planId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Get admin action audit logs
   */
  async getAdminLogs(limit?: number, actionType?: string) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (actionType) params.append('action_type', actionType);

    const query = params.toString() ? `?${params}` : '';
    return makeAdminRequest(`/logs${query}`);
  },

  /**
   * Get user activity data for charts
   */
  async getUserActivity(timeRange: string = '7days') {
    return makeAdminRequest(`/user-activity?timeRange=${timeRange}`);
  },

  /**
   * Get user-workspace relationship details
   */
  async getUserWorkspaceDetails() {
    return makeAdminRequest('/user-workspace-details');
  },

  /**
   * Get API request summary
   */
  async getApiRequestSummary(timeRange: string = '24hours') {
    return makeAdminRequest(`/api-requests/summary?timeRange=${timeRange}`);
  },

  /**
   * Get endpoint usage for a workspace
   */
  async getEndpointUsage(workspaceId: string, timeRange: string = '24hours') {
    return makeAdminRequest(`/workspaces/${workspaceId}/endpoint-usage?timeRange=${timeRange}`);
  },

  /**
   * Get API key usage for a workspace
   */
  async getApiKeyUsage(workspaceId: string, timeRange: string = '24hours') {
    return makeAdminRequest(`/workspaces/${workspaceId}/api-key-usage?timeRange=${timeRange}`);
  },

  /**
   * Get rate limit violations
   */
  async getRateLimitViolations(workspaceId?: string, timeRange: string = '24hours') {
    const params = new URLSearchParams({ timeRange });
    if (workspaceId) params.append('workspaceId', workspaceId);

    return makeAdminRequest(`/rate-limit-violations?${params}`);
  },

  /**
   * Get MCP key + workspace permission management bundle
   */
  async getMcpPermissions() {
    return makeAdminRequest('/mcp-permissions');
  },

  /**
   * Create a new MCP API key
   */
  async createMcpApiKey(payload: {
    label: string;
    staffMemberId?: string | null;
    defaultRole?: 'none' | 'read' | 'write';
    wildcardRole?: 'read' | 'write' | null;
  }) {
    return makeAdminRequest('/mcp-permissions/keys', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing MCP API key's metadata
   */
  async updateMcpApiKey(
    keyId: string,
    payload: {
      label?: string;
      staffMemberId?: string | null;
      defaultRole?: 'none' | 'read' | 'write';
      wildcardRole?: 'read' | 'write' | null;
      isActive?: boolean;
    }
  ) {
    return makeAdminRequest(`/mcp-permissions/keys/${keyId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Replace workspace permissions for a key
   */
  async setMcpWorkspacePermissions(
    keyId: string,
    permissions: Array<{ workspaceId: string; role: 'read' | 'write' }>
  ) {
    return makeAdminRequest(`/mcp-permissions/keys/${keyId}/workspaces`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },

  /**
   * Delete an MCP key
   */
  async deleteMcpApiKey(keyId: string) {
    return makeAdminRequest(`/mcp-permissions/keys/${keyId}`, {
      method: 'DELETE',
    });
  },
};
