import { useState } from 'react';
import { Activity, AlertTriangle, Check, ChevronDown, Loader2, Mail, Workflow, X } from 'lucide-react';
import { type WorkspaceNode } from '../utils/workspaceLayout';
import { type Tier, TIER_CONFIG, getEffectiveLimit } from '../hooks/useWorkspaceHealth';
import { supabase } from '../../../lib/supabase';

interface WorkspaceDetailPanelProps {
  workspace: WorkspaceNode;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}

function getUsageBarColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-orange-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-blue-500';
}

export function WorkspaceDetailPanel({ workspace: ws, onClose, onRefresh }: WorkspaceDetailPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [customLimit, setCustomLimit] = useState<string>(ws.customLimit?.toString() || '');

  const limit = getEffectiveLimit(ws);
  const usagePercent = limit > 0 ? Math.round((ws.stats.running / limit) * 100) : 0;

  const handleTierChange = async (newTier: Tier) => {
    setSaving(true);
    setSaveError(null);
    try {
      const settingsValue: Record<string, unknown> = { tier: newTier };
      if (newTier === 'custom') {
        const parsedLimit = Number.parseInt(customLimit, 10);
        if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > 400) {
          setSaveError('Custom limit must be between 1 and 400.');
          return;
        }
        settingsValue.concurrencyLimit = parsedLimit;
      }

      const { error } = await supabase
        .from('workspace_settings')
        .upsert(
          { workspace_id: ws.workspace_id, settings_key: 'QUEUE_TIER', settings_value: settingsValue },
          { onConflict: 'workspace_id,settings_key' },
        );
      if (error) {
        throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await onRefresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save workspace tier.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      data-no-pan="true"
      className="absolute top-16 right-4 z-40 w-72 rounded-xl border border-slate-700/80 bg-slate-900/95 text-slate-200 shadow-2xl backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-slate-800">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 truncate">{ws.workspace_name}</h3>
          <p className="text-[10px] font-mono text-slate-500">{ws.workspace_id}</p>
        </div>
        <button
          type="button"
          data-no-pan="true"
          onClick={onClose}
          className="shrink-0 w-6 h-6 rounded-md border border-slate-700 bg-slate-800 hover:bg-slate-700 flex items-center justify-center"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Tier selector */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Tier</div>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <select
                value={ws.tier}
                onChange={(e) => handleTierChange(e.target.value as Tier)}
                disabled={saving}
                className="w-full appearance-none rounded-md border border-slate-700 bg-slate-800 px-2 py-1 pr-7 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="standard">Standard ({TIER_CONFIG.standard.limit})</option>
                <option value="premium">Premium ({TIER_CONFIG.premium.limit})</option>
                <option value="enterprise">Enterprise ({TIER_CONFIG.enterprise.limit})</option>
                <option value="custom">Custom...</option>
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
            </div>
            {ws.tier === 'custom' && (
              <input
                type="number"
                value={customLimit}
                onChange={(e) => setCustomLimit(e.target.value)}
                onBlur={() => {
                  if (customLimit) {
                    void handleTierChange('custom');
                  }
                }}
                placeholder="Limit"
                className="w-16 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            )}
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            {saved && <Check className="w-3.5 h-3.5 text-green-400" />}
          </div>
          {saveError && (
            <p className="mt-1 text-[10px] text-red-400">
              {saveError}
            </p>
          )}
        </div>

        {/* Usage bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Usage</span>
            <span className="text-xs font-semibold text-slate-300">{ws.stats.running} / {limit}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getUsageBarColor(usagePercent)}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <div className="text-right mt-0.5">
            <span className="text-[10px] text-slate-500">{usagePercent}%</span>
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">
            Usage tracks active queue slots only
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <Activity className="w-3 h-3 text-emerald-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-emerald-400">{ws.stats.active}</div>
            <div className="text-[9px] text-slate-500">Active</div>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <Loader2 className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-blue-400">{ws.stats.inDelay}</div>
            <div className="text-[9px] text-slate-500">Waiting</div>
          </div>
          <div className="rounded-lg bg-slate-800/60 px-2 py-1.5 text-center">
            <Workflow className="w-3 h-3 text-amber-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-amber-400">{ws.stats.queued}</div>
            <div className="text-[9px] text-slate-500">Queued</div>
          </div>
        </div>

        {/* 24h stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Check className="w-3 h-3 text-green-400" />
            <span className="text-xs text-slate-300">{ws.stats.completed24h}</span>
            <span className="text-[10px] text-slate-500">done 24h</span>
          </div>
          {ws.stats.failed24h > 0 && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-xs text-red-400">{ws.stats.failed24h}</span>
              <span className="text-[10px] text-slate-500">failed 24h</span>
            </div>
          )}
        </div>

        {/* Active items */}
        {ws.stats.activeItems.length > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
              Active Flows & Sequences
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
              {ws.stats.activeItems.map((item, i) => (
                <div
                  key={i}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                    item.type === 'flow'
                      ? 'bg-blue-900/20 text-blue-400 border-blue-800'
                      : 'bg-purple-900/20 text-purple-400 border-purple-800'
                  }`}
                >
                  {item.type === 'flow' ? (
                    <Workflow className="w-2.5 h-2.5" />
                  ) : (
                    <Mail className="w-2.5 h-2.5" />
                  )}
                  <span className="max-w-[140px] truncate">{item.name}</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${
                    item.type === 'flow'
                      ? 'bg-blue-800 text-blue-200'
                      : 'bg-purple-800 text-purple-200'
                  }`}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
