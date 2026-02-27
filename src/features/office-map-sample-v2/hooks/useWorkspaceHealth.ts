import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

export type Tier = 'standard' | 'premium' | 'enterprise' | 'custom';

export const TIER_CONFIG: Record<Tier, { label: string; limit: number }> = {
  standard: { label: 'Standard', limit: 200 },
  premium: { label: 'Premium', limit: 30 },
  enterprise: { label: 'Enterprise', limit: 50 },
  custom: { label: 'Custom', limit: 100 },
};

export interface ActiveItem {
  name: string;
  count: number;
  type: 'flow' | 'sequence';
}

export interface WorkspaceHealthStats {
  running: number;
  active: number;
  inDelay: number;
  queued: number;
  completed24h: number;
  failed24h: number;
  activeItems: ActiveItem[];
}

export interface WorkspaceHealthData {
  workspace_id: string;
  workspace_name: string;
  tier: Tier;
  customLimit: number | null;
  stats: WorkspaceHealthStats;
}

export function getEffectiveLimit(ws: { tier: Tier; customLimit: number | null }): number {
  if (ws.tier === 'custom' && ws.customLimit) return ws.customLimit;
  return TIER_CONFIG[ws.tier]?.limit ?? 15;
}

interface UseWorkspaceHealthOptions {
  enabled?: boolean;
  refreshIntervalMs?: number;
}

interface UseWorkspaceHealthReturn {
  workspaces: WorkspaceHealthData[];
  loading: boolean;
  error: string | null;
  lastUpdatedAt: Date | null;
  refresh: () => Promise<void>;
}

export function useWorkspaceHealth(options: UseWorkspaceHealthOptions = {}): UseWorkspaceHealthReturn {
  const { enabled = true, refreshIntervalMs = 300000 } = options;
  const [workspaces, setWorkspaces] = useState<WorkspaceHealthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      // Staleness cutoff: executions "running" but not updated in 2h are likely orphaned
      const stalenessCutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const nowIso = new Date().toISOString();

      const [wsResult, tierResult, activeFlowsResult, waitingFlowsResult, queuedResult, completedResult, failedResult, activeSeqResult, waitingSeqResult] = await Promise.all([
        supabase.from('workspaces').select('id, name').order('name'),
        supabase.from('workspace_settings').select('workspace_id, settings_value').eq('settings_key', 'QUEUE_TIER'),
        // Active flows: running, recently updated, NOT waiting for a future time (excludes orphans)
        supabase.from('flow_executions').select('id, workspace_id, flow_id')
          .eq('status', 'running').gte('updated_at', stalenessCutoff)
          .or(`next_execution_at.is.null,next_execution_at.lte.${nowIso}`),
        // Waiting flows: running with a future scheduled time (no staleness filter — multi-day waits are legit)
        supabase.from('flow_executions').select('id, workspace_id, flow_id')
          .eq('status', 'running').gt('next_execution_at', nowIso),
        supabase.from('flow_executions').select('workspace_id').in('status', ['pending', 'queued']),
        supabase.from('flow_executions').select('workspace_id').eq('status', 'completed').gte('updated_at', twentyFourHoursAgo),
        supabase.from('flow_executions').select('workspace_id').eq('status', 'failed').gte('updated_at', twentyFourHoursAgo),
        // Active sequences: same split
        supabase.from('flow_sequence_executions').select('workspace_id, sequence_id')
          .eq('status', 'running').gte('updated_at', stalenessCutoff)
          .or(`next_execution_at.is.null,next_execution_at.lte.${nowIso}`),
        // Waiting sequences
        supabase.from('flow_sequence_executions').select('workspace_id, sequence_id')
          .eq('status', 'running').gt('next_execution_at', nowIso),
      ]);

      if (wsResult.error) throw wsResult.error;
      if (!wsResult.data) return;

      // Collect flow IDs from both active and waiting for name lookups
      const uniqueFlowIds = new Set<string>();
      const uniqueSeqIds = new Set<string>();
      const allFlowRows = [...(activeFlowsResult.data || []), ...(waitingFlowsResult.data || [])];
      const allSeqRows = [...(activeSeqResult.data || []), ...(waitingSeqResult.data || [])];
      const activeFlowRows = [...(activeFlowsResult.data || [])];
      const activeSeqRows = [...(activeSeqResult.data || [])];

      for (const row of allFlowRows) {
        if (row.flow_id) uniqueFlowIds.add(row.flow_id);
      }
      for (const row of allSeqRows) {
        if (row.sequence_id) uniqueSeqIds.add(row.sequence_id);
      }

      const [flowNamesResult, seqNamesResult] = await Promise.all([
        uniqueFlowIds.size > 0
          ? supabase.from('flows').select('id, name').in('id', Array.from(uniqueFlowIds))
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        uniqueSeqIds.size > 0
          ? supabase.from('flow_sequences').select('id, name').in('id', Array.from(uniqueSeqIds))
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      const flowNameMap = new Map<string, string>();
      if (flowNamesResult.data) {
        for (const f of flowNamesResult.data) flowNameMap.set(f.id, f.name || 'Unnamed Flow');
      }

      const seqNameMap = new Map<string, string>();
      if (seqNamesResult.data) {
        for (const s of seqNamesResult.data) seqNameMap.set(s.id, s.name || 'Unnamed Sequence');
      }

      const tierMap = new Map<string, { tier: Tier; customLimit: number | null }>();
      if (tierResult.data) {
        for (const row of tierResult.data) {
          tierMap.set(row.workspace_id, {
            tier: (row.settings_value?.tier || 'standard') as Tier,
            customLimit: row.settings_value?.concurrencyLimit || null,
          });
        }
      }

      const countByWorkspace = (data: { workspace_id: string }[] | null) => {
        const map = new Map<string, number>();
        if (data) {
          for (const row of data) {
            map.set(row.workspace_id, (map.get(row.workspace_id) || 0) + 1);
          }
        }
        return map;
      };

      // Build active items list from actively executing flows/sequences only
      const buildActiveItems = (workspaceId: string): ActiveItem[] => {
        const itemCounts = new Map<string, { name: string; count: number; type: 'flow' | 'sequence' }>();

        for (const row of activeFlowRows) {
          if (row.workspace_id !== workspaceId || !row.flow_id) continue;
          const key = `flow:${row.flow_id}`;
          const existing = itemCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            itemCounts.set(key, {
              name: flowNameMap.get(row.flow_id) || `Flow ${row.flow_id.slice(0, 8)}...`,
              count: 1,
              type: 'flow',
            });
          }
        }

        for (const row of activeSeqRows) {
          if (row.workspace_id !== workspaceId || !row.sequence_id) continue;
          const key = `seq:${row.sequence_id}`;
          const existing = itemCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            itemCounts.set(key, {
              name: seqNameMap.get(row.sequence_id) || `Sequence ${row.sequence_id.slice(0, 8)}...`,
              count: 1,
              type: 'sequence',
            });
          }
        }

        return Array.from(itemCounts.values()).sort((a, b) => b.count - a.count);
      };

      const queuedCounts = countByWorkspace(queuedResult.data);
      const completedCounts = countByWorkspace(completedResult.data);
      const failedCounts = countByWorkspace(failedResult.data);

      // Active and waiting are already split at the query level
      const activeByWorkspace = countByWorkspace(
        [...(activeFlowsResult.data || []), ...(activeSeqResult.data || [])],
      );
      const waitingByWorkspace = countByWorkspace(
        [...(waitingFlowsResult.data || []), ...(waitingSeqResult.data || [])],
      );

      const rows: WorkspaceHealthData[] = wsResult.data.map((ws) => {
        const tierInfo = tierMap.get(ws.id);
        const active = activeByWorkspace.get(ws.id) || 0;
        const waiting = waitingByWorkspace.get(ws.id) || 0;
        const totalRunning = active;
        return {
          workspace_id: ws.id,
          workspace_name: ws.name || ws.id,
          tier: tierInfo?.tier || 'standard',
          customLimit: tierInfo?.customLimit || null,
          stats: {
            running: totalRunning,
            active,
            inDelay: waiting,
            queued: queuedCounts.get(ws.id) || 0,
            completed24h: completedCounts.get(ws.id) || 0,
            failed24h: failedCounts.get(ws.id) || 0,
            activeItems: buildActiveItems(ws.id),
          },
        };
      });

      rows.sort((a, b) => (b.stats.running + b.stats.queued) - (a.stats.running + a.stats.queued));

      // Filter out test/fake workspaces
      const filtered = rows.filter((ws) => {
        const name = ws.workspace_name.toLowerCase();
        return !name.includes('test') && !name.includes('fake');
      });

      setWorkspaces(filtered);
      setError(null);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchWorkspaces();
    }

    const interval = setInterval(fetchWorkspaces, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [enabled, fetchWorkspaces, refreshIntervalMs]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      hasFetchedRef.current = false;
    }
  }, [enabled]);

  return { workspaces, loading, error, lastUpdatedAt, refresh: fetchWorkspaces };
}
