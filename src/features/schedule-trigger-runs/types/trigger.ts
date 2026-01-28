export interface ScheduleTriggerRun {
  id: string;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  contactsProcessed: number;
  workflowsTriggered: number;
  workflowInstanceIds: string[];
  errorMessage: string | null;
  triggerName: string;
  flowName: string;
  frequencyType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom' | 'one_time';
  targetMode: 'no_contacts' | 'all_contacts' | 'filtered_contacts';
  timezone: string;
  workspaceId?: string;
  workspaceName?: string;
}

export interface ScheduleTrigger {
  id: string;
  triggerId: string;
  triggerName: string;
  flowId: string;
  flowName: string;
  frequencyType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom' | 'one_time';
  timeOfDay: string | null;
  daysOfWeek: number[] | null;
  daysOfMonth: number[] | null;
  timezone: string;
  targetMode: 'no_contacts' | 'all_contacts' | 'filtered_contacts';
  isActive: boolean;
  lastExecutedAt: string | null;
  nextExecutionAt: string | null;
  executionCount: number;
  createdAt: string;
  workspaceId?: string;
  workspaceName?: string;
  // Custom frequency fields
  customIntervalValue?: number;
  customIntervalUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  // One-time fields
  startDate?: string;
  isOneTimeExecuted?: boolean;
}

export interface ScheduleRunsResponse {
  success: boolean;
  data: ScheduleTriggerRun[];
  pagination?: {
    limit: number;
    offset: number;
    total: number | null;
  };
  error?: string;
}

export interface SchedulesResponse {
  success: boolean;
  data: ScheduleTrigger[];
  error?: string;
}

export interface RunStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  totalContacts: number;
  totalWorkflows: number;
}
