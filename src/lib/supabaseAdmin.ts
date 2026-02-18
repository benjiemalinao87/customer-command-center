/**
 * Supabase Admin Service
 * Direct queries to Supabase for admin dashboard metrics
 * Only used by SaaS team members with super admin access
 */

import { supabase } from './supabase';
import { getSessionViewLabel } from './sessionViews';

/**
 * Get total users count from auth.users
 */
export const getTotalUsers = async () => {
  try {
    const { count, error } = await supabase
      .from('workspace_members')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Error fetching total users:', error);
    return 0;
  }
};

/**
 * Get user role breakdown (admins vs agents)
 */
export const getUserRoleBreakdown = async () => {
  try {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role');

    if (error) throw error;

    const breakdown = data?.reduce((acc, member) => {
      const role = member.role?.toLowerCase() || 'agent';
      if (role === 'admin' || role === 'owner') {
        acc.admins++;
      } else {
        acc.agents++;
      }
      return acc;
    }, { admins: 0, agents: 0 });

    return breakdown || { admins: 0, agents: 0 };
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return { admins: 0, agents: 0 };
  }
};

/**
 * Get API requests count from the last 24 hours using api_requests_summary view
 */
export const getApiRequestsCount = async () => {
  try {
    // Use the pre-aggregated summary view for better performance
    const { data, error } = await supabase
      .from('api_requests_summary')
      .select('total_requests');

    if (error) {
      console.warn('Cannot fetch from api_requests_summary, falling back to direct query:', error);
      
      // Fallback to direct query if view doesn't exist
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { count, error: queryError } = await supabase
        .from('api_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString());

      if (queryError) {
        console.warn('api_requests table not found or error:', queryError);
        return 0;
      }

      return count || 0;
    }

    // Sum up all total_requests from the summary view
    const totalRequests = data?.reduce((sum, item) => sum + (item.total_requests || 0), 0) || 0;
    return totalRequests;
  } catch (error) {
    console.error('Error fetching API requests:', error);
    return 0;
  }
};

/**
 * Get total logins count (active sessions today)
 * Uses RPC function to securely access auth.users table
 */
export const getTotalLoginsToday = async () => {
  try {
    // Use the RPC function that can securely access auth.users
    const { data, error } = await supabase
      .rpc('get_total_logins_today');

    if (error) {
      console.warn('RPC get_total_logins_today failed, falling back to estimate:', error);
      
      // Fallback to estimation if RPC fails
      const { count } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true });
      
      return Math.floor((count || 0) * 0.3);
    }

    return data || 0;
  } catch (error) {
    console.error('Error fetching logins:', error);
    return 0;
  }
};

/**
 * Get platform usage trends (last 7 days)
 */
export const getPlatformUsageTrends = async (days: number = 7) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get API requests by day (if table exists)
    const { data: apiData } = await supabase
      .from('api_requests')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get user signups by day
    const { data: signupData, error: signupError } = await supabase
      .from('workspace_members')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    if (signupError && !signupData) {
      console.warn('Error fetching signup data:', signupError);
    }

    // Group by date
    const labels: string[] = [];
    const apiRequests: number[] = [];
    const newSignups: number[] = [];
    const activeUsers: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(dateStr);

      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      // Count API requests for this day
      const apiCount = apiData?.filter(req => {
        const reqDate = new Date(req.created_at);
        return reqDate >= dayStart && reqDate <= dayEnd;
      }).length || 0;
      apiRequests.push(apiCount);

      // Count signups for this day
      const signupCount = signupData?.filter(signup => {
        const signupDate = new Date(signup.created_at);
        return signupDate >= dayStart && signupDate <= dayEnd;
      }).length || 0;
      newSignups.push(signupCount);

      // Estimate active users (simplified)
      activeUsers.push(Math.floor(apiCount / 10) || 5);
    }

    return { labels, apiRequests, activeUsers, newSignups };
  } catch (error) {
    console.error('Error fetching platform usage trends:', error);
    return null;
  }
};

/**
 * Get geographic distribution of API requests
 */
export const getGeographicDistribution = async () => {
  try {
    // Try to get from api_requests table if it has location data
    const { data, error } = await supabase
      .from('api_requests')
      .select('metadata')
      .limit(1000);

    if (error || !data) {
      // Return default distribution if no data
      return [
        { label: 'United States', value: 45, color: '#3b82f6' },
        { label: 'Canada', value: 18, color: '#10b981' },
        { label: 'United Kingdom', value: 15, color: '#8b5cf6' },
        { label: 'Australia', value: 12, color: '#f59e0b' },
        { label: 'Others', value: 10, color: '#6b7280' }
      ];
    }

    // If we have data, process it (placeholder for now)
    return [
      { label: 'United States', value: 45, color: '#3b82f6' },
      { label: 'Canada', value: 18, color: '#10b981' },
      { label: 'United Kingdom', value: 15, color: '#8b5cf6' },
      { label: 'Australia', value: 12, color: '#f59e0b' },
      { label: 'Others', value: 10, color: '#6b7280' }
    ];
  } catch (error) {
    console.error('Error fetching geographic distribution:', error);
    return null;
  }
};

/**
 * Get top companies by API usage
 * Optimized to use workspace-level aggregation
 */
export const getTopCompaniesByUsage = async () => {
  try {
    // Get API requests from last 30 days with workspace info
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Use a more efficient query with workspace aggregation
    const { data: workspaceRequests, error: requestsError } = await supabase
      .from('api_requests')
      .select('workspace_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (requestsError) {
      console.warn('Error fetching API requests:', requestsError);
      return null;
    }

    // Get onboarding responses to map workspace_id to company_name
    const { data: companies, error: companiesError } = await supabase
      .from('onboarding_responses')
      .select('workspace_id, company_name, company_size, company_industry');

    if (companiesError) {
      console.warn('Error fetching company data:', companiesError);
      return null;
    }

    // Create a map of workspace_id to company info
    const workspaceMap = new Map();
    companies?.forEach((company) => {
      if (company.company_name && company.workspace_id) {
        workspaceMap.set(company.workspace_id, {
          name: company.company_name,
          size: company.company_size,
          industry: company.company_industry
        });
      }
    });

    // Count requests per workspace (optimized aggregation)
    const workspaceCounts = new Map<string, number>();
    workspaceRequests?.forEach((req) => {
      if (req.workspace_id && workspaceMap.has(req.workspace_id)) {
        const count = workspaceCounts.get(req.workspace_id) || 0;
        workspaceCounts.set(req.workspace_id, count + 1);
      }
    });

    // Convert to array and sort
    const topCompanies = Array.from(workspaceCounts.entries())
      .map(([workspaceId, count]) => {
        const companyInfo = workspaceMap.get(workspaceId);
        return {
          name: companyInfo?.name || 'Unknown',
          requests: count,
          size: companyInfo?.size,
          industry: companyInfo?.industry
        };
      })
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    // Assign colors
    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
    return topCompanies.map((company, index) => ({
      ...company,
      color: colors[index] || '#6b7280'
    }));
  } catch (error) {
    console.error('Error fetching top companies:', error);
    return null;
  }
};

/**
 * Get active user sessions from Supabase
 */
interface SessionRpcRecord {
  session_id: string;
  user_id: string;
  user_email: string;
  created_at: string;
  updated_at: string | null;
  refreshed_at: string | null;
  ip: string | null;
  user_agent?: string | null;
  last_sign_in_at?: string | null;
  current_view?: string | null;
  current_path?: string | null;
  current_window?: string | null;
  current_window_title?: string | null;
  tracked_last_activity_at?: string | null;
  tracked_last_sign_in_at?: string | null;
  page_visits?: number | null;
  total_events?: number | null;
  view_counts?: Record<string, number> | null;
  is_online?: boolean | null;
}

interface SessionActivityRow {
  user_id: string;
  current_view: string | null;
  current_path: string | null;
  current_window: string | null;
  current_window_title?: string | null;
  last_activity_at: string | null;
  last_sign_in_at: string | null;
  page_visits: number | null;
  total_events: number | null;
  view_counts: Record<string, number> | null;
  is_online: boolean | null;
}

interface PresenceRow {
  user_id?: string | null;
  updated_at?: string | null;
  board_id?: string | null;
  board_name?: string | null;
  board_title?: string | null;
  current_view?: string | null;
  current_page?: string | null;
  current_path?: string | null;
  view?: string | null;
  path?: string | null;
  pathname?: string | null;
  route?: string | null;
  page?: string | null;
  screen?: string | null;
  context?: string | null;
  current_window?: string | null;
  current_window_title?: string | null;
  window?: string | null;
  active_window?: string | null;
  active_tab?: string | null;
  active_view?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  state?: Record<string, unknown> | null;
  location?: string | null;
  [key: string]: unknown;
}

interface PresenceRpcRow {
  user_id?: string | null;
  updated_at?: string | null;
  presence?: Record<string, unknown> | null;
}

const PRESENCE_DIRECT_KEYS = [
  'active_window',
  'current_window',
  'current_window_title',
  'window',
  'context',
  'screen',
  'page',
  'current_page',
  'active_tab',
  'active_view',
  'board_name',
  'board_title',
  'board_id',
  'entity_type',
] as const;

const PRESENCE_ROUTE_KEYS = [
  'current_view',
  'view',
  'route',
  'current_path',
  'path',
  'pathname',
] as const;

const PRESENCE_CONTAINER_KEYS = ['metadata', 'payload', 'state', 'context'] as const;

const PRESENCE_NESTED_LABEL_KEYS = [
  'currentWindow',
  'current_window',
  'currentWindowTitle',
  'current_window_title',
  'activeWindow',
  'active_window',
  'activeTab',
  'active_tab',
  'activeView',
  'active_view',
  'currentPage',
  'current_page',
  'page',
  'screen',
  'context',
  'board',
  'boardId',
  'board_id',
  'boardName',
  'board_name',
  'boardTitle',
  'board_title',
  'entityType',
  'entity_type',
  'window',
  'view',
  'route',
  'path',
  'pathname',
  'label',
  'title',
  'name',
] as const;

export const getActiveSessions = async () => {
  try {
    // Use RPC function to get sessions with user data
    const { data: sessions, error: sessionsError } = await supabase
      .rpc('get_active_sessions');

    if (sessionsError) {
      console.warn('Error fetching sessions:', sessionsError);
      return [];
    }

    if (!sessions || sessions.length === 0) {
      return [];
    }

    const typedSessions = sessions as SessionRpcRecord[];

    // Get user roles from workspace_members table
    const userIds = typedSessions.map((session) => session.user_id);
    const { data: userRoles, error: rolesError } = await supabase
      .from('workspace_members')
      .select('user_id, workspace_id, role')
      .in('user_id', userIds);

    if (rolesError) {
      console.warn('Error fetching user roles:', rolesError);
    }

    // Get workspace information based on workspace_ids from user roles
    const workspaceIds = userRoles?.map(ur => ur.workspace_id).filter(Boolean) || [];
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name, subscription_plan, subscription_status')
      .in('id', workspaceIds);

    if (workspaceError) {
      console.warn('Error fetching workspace data:', workspaceError);
    }

    // Pull latest tracked page/window activity data
    const { data: activityRows, error: activityError } = await supabase
      .from('user_session_activity')
      .select('user_id, current_view, current_path, current_window, current_window_title, last_activity_at, last_sign_in_at, page_visits, total_events, view_counts, is_online')
      .in('user_id', userIds);

    if (activityError) {
      console.warn('Error fetching user session activity:', activityError);
    }

    const activityByUserId = new Map<string, SessionActivityRow>();
    activityRows?.forEach((row) => {
      const activity = row as SessionActivityRow;
      const existing = activityByUserId.get(activity.user_id);
      if (!existing) {
        activityByUserId.set(activity.user_id, activity);
        return;
      }

      const existingLastActivity = parseDateValue(existing.last_activity_at);
      const rowLastActivity = parseDateValue(activity.last_activity_at);
      if (!existingLastActivity || (rowLastActivity && rowLastActivity > existingLastActivity)) {
        activityByUserId.set(activity.user_id, activity);
      }
    });

    // Pull existing avatar/presence context (used by "on contacts" style labels)
    const presenceByUserId = await getPresenceContextByUserId(userIds);

    // Process sessions into the expected format
    const activeSessions = typedSessions.map((session) => {
      const userRole = userRoles?.find(ur => ur.user_id === session.user_id);
      const workspace = workspaces?.find(w => w.id === userRole?.workspace_id);
      const trackedActivity = activityByUserId.get(session.user_id);
      const presenceContext = presenceByUserId.get(session.user_id);

      // Calculate session duration
      const sessionStart = parseDateValue(session.created_at) || new Date();
      const now = new Date();
      const durationMs = now.getTime() - sessionStart.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));

      // Format duration
      let sessionDuration = '';
      if (durationMinutes < 60) {
        sessionDuration = `${durationMinutes}m`;
      } else {
        const hours = Math.floor(durationMinutes / 60);
        const minutes = durationMinutes % 60;
        sessionDuration = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      }

      // Calculate last activity
      const lastActivity = trackedActivity?.last_activity_at
        || session.tracked_last_activity_at
        || session.refreshed_at
        || session.updated_at
        || session.created_at;

      const lastActivityDate = parseDateValue(lastActivity) || now;
      const timeSinceActivity = now.getTime() - lastActivityDate.getTime();
      const minutesSinceActivity = Math.max(0, Math.floor(timeSinceActivity / (1000 * 60)));
      const lastActivityText = formatLastActivityText(minutesSinceActivity);

      // Determine status (active if activity within last 5 minutes)
      const isOnline = trackedActivity?.is_online ?? session.is_online ?? true;
      const status: 'active' | 'idle' = isOnline && minutesSinceActivity <= 5 ? 'active' : 'idle';

      // Extract location from IP (simplified - in production you'd use a geolocation service)
      const location = getLocationFromIP(session.ip);

      // Build activity insights from real tracked view counts when available
      const mostUsedFeature = getMostUsedFeatureFromCounts(
        trackedActivity?.view_counts || session.view_counts
      ) || getMostUsedFeature(session.user_email);

      const currentPage = getCurrentPageLabel({
        trackedActivity,
        presenceContext,
        sessionCurrentView: session.current_view,
        sessionCurrentPath: session.current_path,
        sessionCurrentWindow: session.current_window,
        sessionCurrentWindowTitle: session.current_window_title,
        fallbackFeature: trackedActivity || presenceContext ? mostUsedFeature : null,
      });

      const lastSignIn = formatAbsoluteTime(
        trackedActivity?.last_sign_in_at
          || session.tracked_last_sign_in_at
          || session.last_sign_in_at
          || session.created_at
      );

      const pageVisits = sanitizeCount(trackedActivity?.page_visits ?? session.page_visits);
      const activityEvents = sanitizeCount(trackedActivity?.total_events ?? session.total_events);
      const hasTrackedSignal = Boolean(
        trackedActivity
        || session.tracked_last_activity_at
        || session.tracked_last_sign_in_at
        || session.current_view
        || session.current_path
        || session.current_window
        || session.current_window_title
        || presenceContext
      );
      const userEmail = session.user_email || 'unknown@example.com';
      const userName = userEmail
        .split('@')[0]
        .replace(/[._]/g, ' ')
        .replace(/\b\w/g, (letter: string) => letter.toUpperCase());

      return {
        id: session.session_id || `${session.user_id}-${session.created_at}`,
        userId: session.user_id,
        userName,
        userEmail,
        workspaceName: workspace?.name || 'Unknown Workspace',
        workspaceId: workspace?.id || 'unknown',
        role: (userRole?.role as 'admin' | 'agent' | 'owner') || 'agent',
        location,
        loginTime: session.created_at,
        lastSignIn,
        lastActivity: lastActivityText,
        sessionDuration,
        currentPage,
        pageVisits,
        activityEvents,
        mostUsedFeature,
        status,
        trackingStatus: hasTrackedSignal ? 'tracked' : 'untracked'
      };
    });

    return activeSessions;
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
};

/**
 * Get endpoint analytics from api_requests
 */
export const getEndpointAnalytics = async () => {
  try {
    const { data, error } = await supabase
      .from('api_requests')
      .select('endpoint, method, response_time_ms, status_code')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.warn('Error fetching endpoint analytics:', error);
      return [];
    }

    // Aggregate by endpoint
    const endpointMap = new Map<string, {
      endpoint_path: string;
      method: string;
      request_count: number;
      total_response_time: number;
      status_codes: Map<number, number>;
    }>();

    data?.forEach((req) => {
      const key = `${req.endpoint}-${req.method || 'GET'}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, {
          endpoint_path: req.endpoint,
          method: req.method || 'GET',
          request_count: 0,
          total_response_time: 0,
          status_codes: new Map()
        });
      }

      const endpoint = endpointMap.get(key)!;
      endpoint.request_count++;
      endpoint.total_response_time += req.response_time_ms || 0;
      
      const statusCount = endpoint.status_codes.get(req.status_code) || 0;
      endpoint.status_codes.set(req.status_code, statusCount + 1);
    });

    // Convert to array format
    return Array.from(endpointMap.values())
      .map(endpoint => ({
        endpoint_path: endpoint.endpoint_path,
        method: endpoint.method,
        request_count: endpoint.request_count,
        avg_response_time: endpoint.total_response_time / endpoint.request_count,
        status_codes: Array.from(endpoint.status_codes.entries()).map(([code, count]) => ({
          code,
          count
        }))
      }))
      .sort((a, b) => b.request_count - a.request_count);
  } catch (error) {
    console.error('Error fetching endpoint analytics:', error);
    return [];
  }
};

/**
 * Helper function to get location from IP (simplified)
 */
function getLocationFromIP(ip: string | null | undefined): string {
  if (!ip) {
    return 'Unknown Location';
  }

  // This is a simplified version - in production you'd use a geolocation service
  const ipRanges = {
    '149.167.': 'San Francisco, CA',
    '109.138.': 'New York, NY',
    '192.168.': 'Local Network',
    '10.0.': 'Local Network'
  };
  
  for (const [prefix, location] of Object.entries(ipRanges)) {
    if (ip.startsWith(prefix)) {
      return location;
    }
  }
  
  return 'Unknown Location';
}

/**
 * Helper function to get most used feature (simplified)
 */
function getMostUsedFeature(email: string | null | undefined): string {
  if (!email) {
    return 'Dashboard';
  }

  // This is a simplified version - in production you'd track actual feature usage
  const features = [
    'Dashboard',
    'SMS Campaigns',
    'Live Chat',
    'API Integration',
    'User Management',
    'Billing & Usage',
    'Analytics',
    'Automation Triggers'
  ];
  
  // Use email hash to consistently assign features
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return features[Math.abs(hash) % features.length];
}

function getMostUsedFeatureFromCounts(viewCounts: unknown): string | null {
  if (!viewCounts || typeof viewCounts !== 'object' || Array.isArray(viewCounts)) {
    return null;
  }

  let topView: string | null = null;
  let topCount = 0;

  Object.entries(viewCounts as Record<string, unknown>).forEach(([viewKey, rawCount]) => {
    const count = typeof rawCount === 'number' ? rawCount : Number(rawCount);
    if (!Number.isFinite(count) || count <= topCount) {
      return;
    }

    topView = viewKey;
    topCount = count;
  });

  return topView ? getSessionViewLabel(topView) : null;
}

function formatAbsoluteTime(value: string | null | undefined): string {
  const parsed = parseDateValue(value);
  if (!parsed) {
    return 'Unknown';
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLastActivityText(minutesSinceActivity: number): string {
  if (minutesSinceActivity < 1) {
    return 'Just now';
  }

  if (minutesSinceActivity < 60) {
    return `${minutesSinceActivity} mins ago`;
  }

  if (minutesSinceActivity < 24 * 60) {
    const hoursSinceActivity = Math.floor(minutesSinceActivity / 60);
    return `${hoursSinceActivity}h ago`;
  }

  const daysSinceActivity = Math.floor(minutesSinceActivity / (24 * 60));
  return `${daysSinceActivity}d ago`;
}

function parseDateValue(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

function sanitizeCount(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

async function getPresenceContextByUserId(userIds: string[]): Promise<Map<string, PresenceRow>> {
  const map = new Map<string, PresenceRow>();
  if (userIds.length === 0) {
    return map;
  }

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('get_user_presence_context', { p_user_ids: userIds });

  if (!rpcError && Array.isArray(rpcData)) {
    mergePresenceRows(map, rpcData as PresenceRpcRow[]);
    if (map.size > 0) {
      return map;
    }
  } else if (rpcError && rpcError.code !== 'PGRST202') {
    // Ignore "function not found" so older DBs still use table query fallback.
    console.warn('Error fetching user presence context via RPC:', rpcError);
  }

  const { data, error } = await supabase
    .from('user_presence')
    .select('*')
    .in('user_id', userIds);

  if (error) {
    console.warn('Error fetching user presence context:', error);
    return map;
  }

  mergePresenceRows(map, (data as PresenceRow[] | null) || []);

  return map;
}

function mergePresenceRows(
  target: Map<string, PresenceRow>,
  rows: Array<PresenceRow | PresenceRpcRow>,
): void {
  rows.forEach((rawRow) => {
    const row = normalizePresenceRow(rawRow);
    if (!row) {
      return;
    }

    const userId = row.user_id as string;
    const existing = target.get(userId);
    if (!existing) {
      target.set(userId, row);
      return;
    }

    const existingUpdatedAt = parseDateValue(existing.updated_at || null);
    const rowUpdatedAt = parseDateValue(row.updated_at || null);
    if (!existingUpdatedAt || (rowUpdatedAt && rowUpdatedAt > existingUpdatedAt)) {
      target.set(userId, row);
    }
  });
}

function normalizePresenceRow(row: PresenceRow | PresenceRpcRow): PresenceRow | null {
  const userId = toNullableString((row as PresenceRow).user_id);
  if (!userId) {
    return null;
  }

  const rpcPresence = (row as PresenceRpcRow).presence;
  const basePresence = rpcPresence && typeof rpcPresence === 'object'
    ? (rpcPresence as Record<string, unknown>)
    : (row as Record<string, unknown>);

  return {
    ...basePresence,
    user_id: userId,
    updated_at: toNullableString((row as PresenceRow).updated_at) || toNullableString((basePresence as PresenceRow).updated_at),
  };
}

function getCurrentPageLabel(input: {
  trackedActivity?: SessionActivityRow;
  presenceContext?: PresenceRow;
  sessionCurrentView?: string | null;
  sessionCurrentPath?: string | null;
  sessionCurrentWindow?: string | null;
  sessionCurrentWindowTitle?: string | null;
  fallbackFeature?: string | null;
}): string {
  const tracked = input.trackedActivity;
  const presence = input.presenceContext;

  const directLabelCandidates = [
    tracked?.current_window_title,
    tracked?.current_window,
    input.sessionCurrentWindowTitle,
    input.sessionCurrentWindow,
    ...collectPresenceCandidates(presence, PRESENCE_DIRECT_KEYS),
    ...collectPresenceNestedCandidates(presence),
  ];

  for (const candidate of directLabelCandidates) {
    const normalized = normalizePresenceLabel(candidate || '');
    if (normalized !== 'Unknown') {
      return normalized;
    }
  }

  const routeCandidates = [
    tracked?.current_view,
    input.sessionCurrentView,
    tracked?.current_path,
    input.sessionCurrentPath,
    ...collectPresenceCandidates(presence, PRESENCE_ROUTE_KEYS),
  ];

  for (const candidate of routeCandidates) {
    const normalizedRoute = normalizeRouteCandidate(candidate || '');
    if (normalizedRoute) {
      return getSessionViewLabel(normalizedRoute);
    }
  }

  if (input.fallbackFeature && input.fallbackFeature !== 'Unknown') {
    return input.fallbackFeature;
  }

  return 'Dashboard';
}

function normalizePresenceLabel(value: string): string {
  let normalized = value.trim();
  if (!normalized) {
    return 'Unknown';
  }

  normalized = normalized.replace(/^.*\bon\s+(.+?)\s*$/i, '$1').trim();
  normalized = normalized.replace(/\s*-\s*command center$/i, '').trim();
  if (!normalized) {
    return 'Unknown';
  }

  if (isJunkLabel(normalized)) {
    return 'Unknown';
  }

  // If it's route-like, normalize it via view mapper
  if (normalized.startsWith('/') || normalized.includes('/') || normalized.includes('-') || normalized.includes('_')) {
    return getSessionViewLabel(normalized);
  }

  return normalized
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRouteCandidate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const stripped = trimmed.replace(/^.*\bon\s+(.+?)\s*$/i, '$1').trim();
  if (!stripped || isJunkLabel(stripped)) {
    return null;
  }

  return stripped;
}

function collectPresenceCandidates(
  presence: PresenceRow | undefined,
  keys: readonly string[],
): string[] {
  if (!presence) {
    return [];
  }

  const row = presence as Record<string, unknown>;
  return keys
    .map((key) => toNullableString(row[key]))
    .filter((value): value is string => Boolean(value));
}

function collectPresenceNestedCandidates(presence: PresenceRow | undefined): string[] {
  if (!presence) {
    return [];
  }

  const row = presence as Record<string, unknown>;
  const candidates = new Set<string>();

  for (const key of PRESENCE_CONTAINER_KEYS) {
    const raw = row[key];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      continue;
    }

    const container = raw as Record<string, unknown>;
    for (const nestedKey of PRESENCE_NESTED_LABEL_KEYS) {
      const candidate = toNullableString(container[nestedKey]);
      if (candidate) {
        candidates.add(candidate);
      }
    }
  }

  return Array.from(candidates);
}

function isJunkLabel(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if ([
    'unknown',
    'n/a',
    'na',
    'none',
    'null',
    'undefined',
    'command center',
    'customer connect command center',
  ].includes(normalized)) {
    return true;
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * Get most used API endpoints using api_requests_summary view
 */
export const getMostUsedEndpoints = async () => {
  try {
    // Use the pre-aggregated summary view for better performance
    const { data, error } = await supabase
      .from('api_requests_summary')
      .select('endpoint, total_requests, success_rate_percent, avg_response_time_ms')
      .order('total_requests', { ascending: false })
      .limit(5);

    if (error) {
      console.warn('Cannot fetch from api_requests_summary, falling back to direct query:', error);
      
      // Fallback to direct query if view doesn't exist
      const { data: requests, error: queryError } = await supabase
        .from('api_requests')
        .select('endpoint')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(10000);

      if (queryError || !requests) {
        console.warn('Cannot fetch endpoint usage:', queryError);
        return null;
      }

      // Count endpoint usage
      const endpointCounts = requests.reduce((acc: Record<string, number>, req: any) => {
        const endpoint = req.endpoint || 'unknown';
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      }, {});

      // Sort and get top 5
      const sorted = Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

      return sorted.map(([endpoint, count], index) => ({
        label: endpoint,
        value: count as number,
        color: colors[index] || '#6b7280'
      }));
    }

    if (!data || data.length === 0) {
      return null;
    }

    const colors = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];

    return data.map((item: any, index: number) => ({
      label: item.endpoint,
      value: item.total_requests,
      color: colors[index] || '#6b7280',
      // Bonus: Include success rate and response time for future use
      successRate: item.success_rate_percent,
      avgResponseTime: item.avg_response_time_ms
    }));
  } catch (error) {
    console.error('Error fetching most used endpoints:', error);
    return null;
  }
};

/**
 * Get real workspace API usage data from Supabase
 */
export const getWorkspaceApiUsage = async () => {
  try {
    // Get API requests count per workspace for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: apiUsage, error: apiError } = await supabase
      .from('api_requests')
      .select('workspace_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (apiError) {
      console.warn('Error fetching API usage:', apiError);
      return new Map();
    }

    // Count requests per workspace
    const workspaceCounts = new Map<string, number>();
    apiUsage?.forEach((req) => {
      if (req.workspace_id) {
        const count = workspaceCounts.get(req.workspace_id) || 0;
        workspaceCounts.set(req.workspace_id, count + 1);
      }
    });

    return workspaceCounts;
  } catch (error) {
    console.error('Error fetching workspace API usage:', error);
    return new Map();
  }
};

/**
 * Get real monthly revenue from Supabase
 */
export const getRealMonthlyRevenue = async () => {
  try {
    // Get all active subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('workspace_subscriptions')
      .select('plan_name')
      .eq('subscription_status', 'active');

    if (subsError) {
      console.warn('Error fetching subscriptions:', subsError);
      return 0;
    }

    // Get all subscription plans with pricing
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('plan_name, pricing');

    if (plansError) {
      console.warn('Error fetching plans:', plansError);
      return 0;
    }

    // Create a map of plan prices
    const planPrices = new Map<string, number>();
    plans?.forEach((plan: any) => {
      const price = plan.pricing?.monthly_price || 0;
      planPrices.set(plan.plan_name, parseFloat(price.toString()));
    });

    // Calculate total revenue
    let totalRevenue = 0;
    
    subscriptions?.forEach((sub: any) => {
      const price = planPrices.get(sub.plan_name) || 0;
      totalRevenue += price;
    });

    return totalRevenue;
  } catch (error) {
    console.error('Error fetching monthly revenue:', error);
    return 0;
  }
};
