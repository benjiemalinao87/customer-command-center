import { supabase } from '../../../lib/supabase';
import type { ScheduleTriggerRun, ScheduleTrigger, ScheduleRunsResponse, SchedulesResponse } from '../types/trigger';

const SCHEDULE_WORKER_URL = 'https://schedule-trigger-processor.benjiemalinao879557.workers.dev';

/**
 * Fetch schedule trigger runs across all workspaces (SaaS admin view)
 */
export async function getAllScheduleRuns(
  limit: number = 50,
  offset: number = 0,
  filters?: {
    status?: string;
    workspaceId?: string;
    frequencyType?: string;
  }
): Promise<{ runs: ScheduleTriggerRun[]; total: number }> {
  try {
    // Query executions without nested select (RLS-friendly)
    let query = supabase
      .from('scheduled_trigger_executions')
      .select('*', { count: 'exact' })
      .order('scheduled_for', { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.workspaceId && filters.workspaceId !== 'all') {
      query = query.eq('workspace_id', filters.workspaceId);
    }

    const { data: executions, error, count } = await query;

    if (error) {
      console.error('Error fetching schedule runs:', error);
      return { runs: [], total: 0 };
    }

    // Fetch scheduled_triggers separately to avoid nested select RLS issues
    const scheduledTriggerIds = [...new Set(executions?.map(e => e.scheduled_trigger_id).filter(Boolean))];
    let scheduledTriggerMap: Record<string, { frequency_type: string; target_mode: string; timezone: string; trigger_id: string }> = {};

    if (scheduledTriggerIds.length > 0) {
      const { data: scheduledTriggers } = await supabase
        .from('scheduled_triggers')
        .select('id, frequency_type, target_mode, timezone, trigger_id')
        .in('id', scheduledTriggerIds);

      scheduledTriggerMap = (scheduledTriggers || []).reduce((acc, st) => ({
        ...acc,
        [st.id]: { frequency_type: st.frequency_type, target_mode: st.target_mode, timezone: st.timezone, trigger_id: st.trigger_id }
      }), {});
    }

    // Fetch trigger and flow names
    const triggerIds = [...new Set(Object.values(scheduledTriggerMap).map(st => st.trigger_id).filter(Boolean))];
    let triggerMap: Record<string, { name: string; flowName: string }> = {};

    if (triggerIds.length > 0) {
      const { data: triggers } = await supabase
        .from('triggers')
        .select('id, name, flow_id')
        .in('id', triggerIds);

      const flowIds = [...new Set(triggers?.map(t => t.flow_id).filter(Boolean))];
      let flowMap: Record<string, string> = {};

      if (flowIds.length > 0) {
        const { data: flows } = await supabase
          .from('flows')
          .select('id, name')
          .in('id', flowIds);

        flowMap = (flows || []).reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {});
      }

      triggerMap = (triggers || []).reduce((acc, t) => ({
        ...acc,
        [t.id]: { name: t.name, flowName: flowMap[t.flow_id] || 'Unknown Flow' }
      }), {});
    }

    // Fetch workspace names
    const workspaceIds = [...new Set(executions?.map(e => e.workspace_id).filter(Boolean))];
    let workspaceMap: Record<string, string> = {};

    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      workspaceMap = (workspaces || []).reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {});
    }

    // Transform data
    const runs: ScheduleTriggerRun[] = (executions || []).map(exec => {
      const scheduledTrigger = scheduledTriggerMap[exec.scheduled_trigger_id] || {};
      const triggerId = scheduledTrigger.trigger_id;
      const triggerInfo = triggerMap[triggerId] || {};

      return {
        id: exec.id,
        scheduledFor: exec.scheduled_for,
        startedAt: exec.started_at,
        completedAt: exec.completed_at,
        status: exec.status,
        contactsProcessed: exec.contacts_processed || 0,
        workflowsTriggered: exec.workflows_triggered || 0,
        workflowInstanceIds: exec.workflow_instance_ids || [],
        errorMessage: exec.error_message,
        triggerName: triggerInfo.name || 'Unknown Trigger',
        flowName: triggerInfo.flowName || 'Unknown Flow',
        frequencyType: scheduledTrigger.frequency_type || 'daily',
        targetMode: scheduledTrigger.target_mode || 'no_contacts',
        timezone: scheduledTrigger.timezone || 'UTC',
        workspaceId: exec.workspace_id,
        workspaceName: workspaceMap[exec.workspace_id] || exec.workspace_id
      };
    });

    return { runs, total: count || 0 };
  } catch (error) {
    console.error('Exception fetching schedule runs:', error);
    return { runs: [], total: 0 };
  }
}

/**
 * Fetch all schedule triggers across all workspaces
 */
export async function getAllScheduleTriggers(): Promise<ScheduleTrigger[]> {
  try {
    const { data: schedules, error } = await supabase
      .from('scheduled_triggers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedules:', error);
      return [];
    }

    // Fetch trigger and flow info
    const triggerIds = [...new Set(schedules?.map(s => s.trigger_id).filter(Boolean))];
    let triggerMap: Record<string, { name: string; flowId: string; flowName: string }> = {};

    if (triggerIds.length > 0) {
      const { data: triggers } = await supabase
        .from('triggers')
        .select('id, name, flow_id')
        .in('id', triggerIds);

      const flowIds = [...new Set(triggers?.map(t => t.flow_id).filter(Boolean))];
      let flowMap: Record<string, string> = {};

      if (flowIds.length > 0) {
        const { data: flows } = await supabase
          .from('flows')
          .select('id, name')
          .in('id', flowIds);

        flowMap = (flows || []).reduce((acc, f) => ({ ...acc, [f.id]: f.name }), {});
      }

      triggerMap = (triggers || []).reduce((acc, t) => ({
        ...acc,
        [t.id]: { name: t.name, flowId: t.flow_id, flowName: flowMap[t.flow_id] || 'Unknown' }
      }), {});
    }

    // Fetch workspace names
    const workspaceIds = [...new Set(schedules?.map(s => s.workspace_id).filter(Boolean))];
    let workspaceMap: Record<string, string> = {};

    if (workspaceIds.length > 0) {
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      workspaceMap = (workspaces || []).reduce((acc, w) => ({ ...acc, [w.id]: w.name }), {});
    }

    return (schedules || []).map(s => {
      const triggerInfo = triggerMap[s.trigger_id] || {};
      return {
        id: s.id,
        triggerId: s.trigger_id,
        triggerName: triggerInfo.name || 'Unknown',
        flowId: triggerInfo.flowId || '',
        flowName: triggerInfo.flowName || 'Unknown',
        frequencyType: s.frequency_type,
        timeOfDay: s.time_of_day,
        daysOfWeek: s.days_of_week,
        daysOfMonth: s.days_of_month,
        timezone: s.timezone,
        targetMode: s.target_mode,
        isActive: s.is_active,
        lastExecutedAt: s.last_executed_at,
        nextExecutionAt: s.next_execution_at,
        executionCount: s.execution_count || 0,
        createdAt: s.created_at,
        workspaceId: s.workspace_id,
        workspaceName: workspaceMap[s.workspace_id] || s.workspace_id
      };
    });
  } catch (error) {
    console.error('Exception fetching schedules:', error);
    return [];
  }
}

/**
 * Get unique workspaces that have schedule triggers
 */
export async function getWorkspacesWithSchedules(): Promise<{ id: string; name: string }[]> {
  try {
    const { data: schedules } = await supabase
      .from('scheduled_triggers')
      .select('workspace_id')
      .order('workspace_id');

    const workspaceIds = [...new Set(schedules?.map(s => s.workspace_id).filter(Boolean))];

    if (workspaceIds.length === 0) return [];

    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name')
      .in('id', workspaceIds);

    return (workspaces || []).map(w => ({ id: w.id, name: w.name || w.id }));
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }
}
