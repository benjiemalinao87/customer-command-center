import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Loader2, Check, AlertCircle, Workflow, Mail } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type Tier = 'standard' | 'premium' | 'enterprise' | 'custom';

const TIER_CONFIG: Record<Tier, { label: string; limit: number; bgClass: string; borderClass: string; textClass: string }> = {
  standard: {
    label: 'Standard',
    limit: 200,
    bgClass: 'bg-gray-50 dark:bg-gray-700',
    borderClass: 'border-gray-200 dark:border-gray-600',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  premium: {
    label: 'Premium',
    limit: 30,
    bgClass: 'bg-purple-50 dark:bg-purple-900/20',
    borderClass: 'border-purple-200 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-400',
  },
  enterprise: {
    label: 'Enterprise',
    limit: 50,
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    borderClass: 'border-blue-200 dark:border-blue-800',
    textClass: 'text-blue-700 dark:text-blue-400',
  },
  custom: {
    label: 'Custom',
    limit: 100,
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    borderClass: 'border-amber-200 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-400',
  },
};

interface ActiveItem {
  name: string;
  count: number;
  type: 'flow' | 'sequence';
}

interface WorkspaceStats {
  running: number;
  active: number;
  inDelay: number;
  queued: number;
  completed24h: number;
  failed24h: number;
  activeItems: ActiveItem[];
}

interface WorkspaceRowData {
  workspace_id: string;
  workspace_name: string;
  tier: Tier;
  customLimit: number | null;
  stats: WorkspaceStats;
}

export function WorkspaceTierTable() {
  const [workspaces, setWorkspaces] = useState<WorkspaceRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const PAGE_SIZE = 10;

  const fetchWorkspaces = useCallback(async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Parallel fetch: workspaces, tiers, running flows (with flow_id), queued, completed, failed, running sequences, delay steps
      // Note: Running queries have NO time filter — multi-day campaigns legitimately stay in 'running' status
      // while waiting between delay steps (wait.for, wait.until)
      const [wsResult, tierResult, runningResult, queuedResult, completedResult, failedResult, seqRunningResult, delayStepsResult] = await Promise.all([
        supabase.from('workspaces').select('id, name').order('name'),
        supabase.from('workspace_settings').select('workspace_id, settings_value').eq('settings_key', 'QUEUE_TIER'),
        supabase.from('flow_executions').select('id, workspace_id, flow_id').eq('status', 'running'),
        supabase.from('flow_executions').select('workspace_id').in('status', ['pending', 'queued']),
        supabase.from('flow_executions').select('workspace_id').eq('status', 'completed').gte('updated_at', twentyFourHoursAgo),
        supabase.from('flow_executions').select('workspace_id').eq('status', 'failed').gte('updated_at', twentyFourHoursAgo),
        supabase.from('flow_sequence_executions').select('workspace_id, sequence_id').eq('status', 'running'),
        // Execution IDs with a non-delay step actively running (consuming Trigger.dev slots)
        // Everything else with flow_executions.status='running' is waiting (delay, suspended between steps, etc.)
        supabase.from('flow_execution_steps').select('execution_id').eq('status', 'running').neq('node_type', 'delay'),
      ]);

      if (wsResult.error) throw wsResult.error;
      if (!wsResult.data) return;

      // Collect unique flow_ids and sequence_ids for name lookups
      const uniqueFlowIds = new Set<string>();
      const uniqueSeqIds = new Set<string>();

      if (runningResult.data) {
        for (const row of runningResult.data) {
          if (row.flow_id) uniqueFlowIds.add(row.flow_id);
        }
      }
      if (seqRunningResult.data) {
        for (const row of seqRunningResult.data) {
          if (row.sequence_id) uniqueSeqIds.add(row.sequence_id);
        }
      }

      // Batch lookup names (only if there are IDs to look up)
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

      // Build tier map
      const tierMap = new Map<string, { tier: Tier; customLimit: number | null }>();
      if (tierResult.data) {
        for (const row of tierResult.data) {
          tierMap.set(row.workspace_id, {
            tier: (row.settings_value?.tier || 'standard') as Tier,
            customLimit: row.settings_value?.concurrencyLimit || null,
          });
        }
      }

      // Count helper
      const countByWorkspace = (data: { workspace_id: string }[] | null) => {
        const map = new Map<string, number>();
        if (data) {
          for (const row of data) {
            map.set(row.workspace_id, (map.get(row.workspace_id) || 0) + 1);
          }
        }
        return map;
      };

      // Build per-workspace active items (flows + sequences with counts)
      const buildActiveItems = (workspaceId: string): ActiveItem[] => {
        const itemCounts = new Map<string, { name: string; count: number; type: 'flow' | 'sequence' }>();

        // Count running flows per flow_id
        if (runningResult.data) {
          for (const row of runningResult.data) {
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
        }

        // Count running sequences per sequence_id
        if (seqRunningResult.data) {
          for (const row of seqRunningResult.data) {
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
        }

        // Sort by count descending
        return Array.from(itemCounts.values()).sort((a, b) => b.count - a.count);
      };

      const runningCounts = countByWorkspace(runningResult.data);
      const queuedCounts = countByWorkspace(queuedResult.data);
      const completedCounts = countByWorkspace(completedResult.data);
      const failedCounts = countByWorkspace(failedResult.data);

      // Also count sequence running per workspace
      const seqRunningCounts = countByWorkspace(seqRunningResult.data);

      // Build set of execution_ids actively executing a non-delay step (consuming Trigger.dev slots)
      const activeExecutionIds = new Set<string>();
      if (delayStepsResult.data) {
        for (const row of delayStepsResult.data) {
          if (row.execution_id) activeExecutionIds.add(row.execution_id);
        }
      }

      // Cross-reference: count actively-executing executions per workspace
      // Everything else with status='running' is waiting (on delay, suspended between steps, etc.)
      const activeByWorkspace = new Map<string, number>();
      if (runningResult.data && activeExecutionIds.size > 0) {
        for (const row of runningResult.data) {
          if (row.id && activeExecutionIds.has(row.id)) {
            activeByWorkspace.set(row.workspace_id, (activeByWorkspace.get(row.workspace_id) || 0) + 1);
          }
        }
      }

      const rows: WorkspaceRowData[] = wsResult.data.map((ws) => {
        const tierInfo = tierMap.get(ws.id);
        const flowRunning = runningCounts.get(ws.id) || 0;
        const seqRunning = seqRunningCounts.get(ws.id) || 0;
        const totalRunning = flowRunning + seqRunning;
        const active = activeByWorkspace.get(ws.id) || 0;
        return {
          workspace_id: ws.id,
          workspace_name: ws.name || ws.id,
          tier: tierInfo?.tier || 'standard',
          customLimit: tierInfo?.customLimit || null,
          stats: {
            running: totalRunning,
            active,
            inDelay: Math.max(0, totalRunning - active),
            queued: queuedCounts.get(ws.id) || 0,
            completed24h: completedCounts.get(ws.id) || 0,
            failed24h: failedCounts.get(ws.id) || 0,
            activeItems: buildActiveItems(ws.id),
          },
        };
      });

      // Sort by total activity (running + queued) desc
      rows.sort((a, b) => (b.stats.running + b.stats.queued) - (a.stats.running + a.stats.queued));

      setWorkspaces(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces();
    const interval = setInterval(fetchWorkspaces, 30000);
    return () => clearInterval(interval);
  }, [fetchWorkspaces]);

  const handleTierChange = async (workspaceId: string, newTier: Tier, customLimit?: number) => {
    setSavingId(workspaceId);
    setError(null);
    try {
      const settingsValue: Record<string, unknown> = { tier: newTier };
      if (newTier === 'custom' && customLimit) {
        settingsValue.concurrencyLimit = customLimit;
      }

      const { error: upsertError } = await supabase
        .from('workspace_settings')
        .upsert(
          {
            workspace_id: workspaceId,
            settings_key: 'QUEUE_TIER',
            settings_value: settingsValue,
          },
          { onConflict: 'workspace_id,settings_key' }
        );

      if (upsertError) throw upsertError;

      setWorkspaces((prev) =>
        prev.map((ws) =>
          ws.workspace_id === workspaceId
            ? { ...ws, tier: newTier, customLimit: newTier === 'custom' ? (customLimit || null) : null }
            : ws
        )
      );
      setSuccessId(workspaceId);
      setTimeout(() => setSuccessId(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tier');
    } finally {
      setSavingId(null);
    }
  };

  const getEffectiveLimit = (ws: WorkspaceRowData) => {
    if (ws.tier === 'custom' && ws.customLimit) return ws.customLimit;
    return TIER_CONFIG[ws.tier]?.limit || 15;
  };

  // Filter + paginate
  const filteredWorkspaces = useMemo(() => {
    if (showOnlyActive) {
      return workspaces.filter(
        (ws) => ws.stats.running > 0 || ws.stats.queued > 0 || ws.stats.completed24h > 0 || ws.stats.failed24h > 0
      );
    }
    return workspaces;
  }, [workspaces, showOnlyActive]);

  const totalPages = Math.max(1, Math.ceil(filteredWorkspaces.length / PAGE_SIZE));
  const paginatedWorkspaces = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredWorkspaces.slice(start, start + PAGE_SIZE);
  }, [filteredWorkspaces, currentPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [showOnlyActive]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Workspace Tier Assignments
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Standard: 200/ws &middot; Premium: 30/ws &middot; Enterprise: 50/ws &middot; Custom: up to 100/ws
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active only toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">Active only</span>
          </label>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {filteredWorkspaces.length} of {workspaces.length}
          </span>
          <button
            onClick={fetchWorkspaces}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="w-6 px-2 py-3" />
              <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                Workspace
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                Tier
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                Limit
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                <span title="Actively executing right now (consuming Trigger.dev slots)">Active</span>
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                <span title="Waiting on delay/timer or suspended between steps (not consuming slots)">Waiting</span>
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                <span title="Waiting to execute (pending + queued)">Queued</span>
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                <span title="Successfully completed in last 24 hours">Done 24h</span>
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                <span title="Failed in last 24 hours">Failed 24h</span>
              </th>
              <th className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 py-3">
                Usage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {paginatedWorkspaces.map((ws) => (
              <WorkspaceRow
                key={ws.workspace_id}
                ws={ws}
                effectiveLimit={getEffectiveLimit(ws)}
                saving={savingId === ws.workspace_id}
                success={successId === ws.workspace_id}
                onTierChange={handleTierChange}
              />
            ))}
            {paginatedWorkspaces.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {workspaces.length === 0 ? 'No workspaces found' : 'No workspaces match the current filter'}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredWorkspaces.length)} of {filteredWorkspaces.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`min-w-[2rem] px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    page === currentPage
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkspaceRow({
  ws,
  effectiveLimit,
  saving,
  success,
  onTierChange,
}: {
  ws: WorkspaceRowData;
  effectiveLimit: number;
  saving: boolean;
  success: boolean;
  onTierChange: (id: string, tier: Tier, customLimit?: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState(ws.customLimit?.toString() || '');

  const tierConfig = TIER_CONFIG[ws.tier] || TIER_CONFIG.standard;
  // Usage % based on Active count (what actually consumes Trigger.dev concurrent slots)
  const usagePercent = effectiveLimit > 0 ? Math.round((ws.stats.active / effectiveLimit) * 100) : 0;
  const hasActiveItems = ws.stats.activeItems.length > 0;

  const handleSelectChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomInput(true);
      setCustomValue(ws.customLimit?.toString() || '50');
    } else {
      setShowCustomInput(false);
      onTierChange(ws.workspace_id, value as Tier);
    }
  };

  const handleCustomSubmit = () => {
    const limit = parseInt(customValue, 10);
    if (limit > 0 && limit <= 400) {
      onTierChange(ws.workspace_id, 'custom', limit);
      setShowCustomInput(false);
    }
  };

  return (
    <>
      <tr
        className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${hasActiveItems ? 'cursor-pointer' : ''}`}
        onClick={() => hasActiveItems && setExpanded(!expanded)}
      >
        {/* Expand chevron */}
        <td className="w-6 px-2 py-3 text-center">
          {hasActiveItems && (
            <ChevronRight
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          )}
        </td>

        {/* Workspace name + ID */}
        <td className="px-4 py-3">
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {ws.workspace_name}
            </span>
            <span className="block text-xs font-mono text-gray-400 dark:text-gray-500 mt-0.5">
              {ws.workspace_id}
            </span>
          </div>
        </td>

        {/* Tier selector — stop propagation so clicking dropdown doesn't toggle expand */}
        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center relative">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500 mx-auto" />
            ) : showCustomInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                  className="w-16 px-2 py-1 text-xs font-medium rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleCustomSubmit}
                  className="px-2 py-1 text-xs font-medium bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                >
                  Set
                </button>
                <button
                  onClick={() => setShowCustomInput(false)}
                  className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={ws.tier}
                  onChange={(e) => handleSelectChange(e.target.value)}
                  className={`appearance-none pl-3 pr-7 py-1.5 text-xs font-medium rounded-md border cursor-pointer transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${tierConfig.bgClass} ${tierConfig.borderClass} ${tierConfig.textClass}`}
                >
                  <option value="standard">Standard (200)</option>
                  <option value="premium">Premium (30)</option>
                  <option value="enterprise">Enterprise (50)</option>
                  <option value="custom">Custom...</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
              </div>
            )}
            {success && <Check className="w-4 h-4 text-green-500 ml-1" />}
          </div>
        </td>

        {/* Limit */}
        <td className="px-4 py-3 text-center">
          <span className={`text-sm font-semibold ${tierConfig.textClass}`}>
            {effectiveLimit}
          </span>
        </td>

        {/* Active — consuming Trigger.dev slots */}
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-semibold rounded-full ${
              ws.stats.active > 0
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {ws.stats.active}
          </span>
        </td>

        {/* Waiting — on delay/timer or suspended between steps, not consuming slots */}
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-semibold rounded-full ${
              ws.stats.inDelay > 0
                ? 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {ws.stats.inDelay}
          </span>
        </td>

        {/* Queued */}
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-semibold rounded-full ${
              ws.stats.queued > 0
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {ws.stats.queued}
          </span>
        </td>

        {/* Completed 24h */}
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-semibold rounded-full ${
              ws.stats.completed24h > 0
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {ws.stats.completed24h}
          </span>
        </td>

        {/* Failed 24h */}
        <td className="px-4 py-3 text-center">
          <span
            className={`inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 text-xs font-semibold rounded-full ${
              ws.stats.failed24h > 0
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {ws.stats.failed24h}
          </span>
        </td>

        {/* Usage bar */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  usagePercent >= 90
                    ? 'bg-red-500'
                    : usagePercent >= 70
                    ? 'bg-orange-500'
                    : usagePercent > 0
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
              {usagePercent}%
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded detail: active flows & sequences */}
      {expanded && hasActiveItems && (
        <tr>
          <td colSpan={10} className="bg-gray-50/50 dark:bg-gray-900/30 px-4 py-3">
            <div className="pl-8">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Active Flows & Sequences
              </div>
              <div className="flex flex-wrap gap-2">
                {ws.stats.activeItems.map((item, i) => (
                  <div
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                      item.type === 'flow'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800'
                    }`}
                  >
                    {item.type === 'flow' ? (
                      <Workflow className="w-3 h-3" />
                    ) : (
                      <Mail className="w-3 h-3" />
                    )}
                    <span className="max-w-[200px] truncate">{item.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.type === 'flow'
                        ? 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                        : 'bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200'
                    }`}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
