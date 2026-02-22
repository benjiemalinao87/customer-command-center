/**
 * Session view mapping helpers shared by tracking and analytics UI.
 */

const SESSION_VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  visitors: 'Logins',
  'user-activity': 'User Activity',
  'user-details': 'Users',
  'api-monitoring': 'API Monitoring',
  'activity-logs': 'Audit Logs',
  'message-error-logs': 'Message Error Logs',
  'system-logs': 'System Logs',
  'cache-system': 'Cache',
  documentation: 'Documentation',
  'webhook-analytics': 'Webhook Analytics',
  'connection-analytics': 'Connection Analytics',
  admin: 'Admin',
  'developer-mode': 'Developer Mode',
  'template-management': 'Template Management',
  'schedule-trigger-runs': 'Schedule Trigger Runs',
  'staff-management': 'Staff Management',
  'mcp-permissions': 'MCP Access',
  'frontend-infrastructure': 'Frontend Infrastructure',
  'feature-rollouts': 'Feature Rollouts',
};

const normalizeViewValue = (value: string | null | undefined): string => {
  if (!value) {
    return 'dashboard';
  }

  const trimmed = value.trim().replace(/^\/+/, '');
  if (!trimmed) {
    return 'dashboard';
  }

  if (trimmed.includes('/')) {
    const [firstSegment] = trimmed.split('/');
    return firstSegment || 'dashboard';
  }

  return trimmed;
};

const titleCase = (value: string): string =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const getSessionViewLabel = (value: string | null | undefined): string => {
  const normalized = normalizeViewValue(value);
  return SESSION_VIEW_LABELS[normalized] || titleCase(normalized);
};

export const getSessionViewPath = (value: string | null | undefined): string => {
  const normalized = normalizeViewValue(value);
  return `/${normalized}`;
};
