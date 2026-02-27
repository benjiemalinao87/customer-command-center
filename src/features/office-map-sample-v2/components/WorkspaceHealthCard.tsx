import { Activity, AlertTriangle, Loader2, Pin, Workflow } from 'lucide-react';
import { type WorkspaceNode } from '../utils/workspaceLayout';
import { TIER_CONFIG, getEffectiveLimit } from '../hooks/useWorkspaceHealth';

interface WorkspaceHealthCardProps {
  node: WorkspaceNode;
  isSelected: boolean;
  isSearchMatch: boolean;
  isDimmed: boolean;
  density: 'comfortable' | 'compact';
  onSelect: (workspaceId: string) => void;
  onCenter: (workspaceId: string) => void;
  onTogglePin: (workspaceId: string) => void;
  isPinned: boolean;
}

function getUsageBarColor(percent: number): string {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-orange-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-blue-500';
}

function getUsageBadgeClasses(percent: number): string {
  if (percent >= 90) return 'bg-red-900/60 text-red-300';
  if (percent >= 70) return 'bg-orange-900/60 text-orange-300';
  if (percent >= 50) return 'bg-amber-900/60 text-amber-300';
  return 'bg-slate-800 text-cyan-300';
}

export function WorkspaceHealthCard({
  node,
  isSelected,
  isSearchMatch,
  isDimmed,
  density,
  onSelect,
  onCenter,
  onTogglePin,
  isPinned,
}: WorkspaceHealthCardProps) {
  const limit = getEffectiveLimit(node);
  const usagePercent = limit > 0 ? Math.round((node.stats.running / limit) * 100) : 0;
  const tierConfig = TIER_CONFIG[node.tier];
  const isCompact = density === 'compact';
  const cardSizeClass = node.status === 'critical'
    ? (isCompact ? 'w-48 sm:w-52' : 'w-56 sm:w-60')
    : node.status === 'warning'
    ? (isCompact ? 'w-44 sm:w-48' : 'w-52 sm:w-56')
    : (isCompact ? 'w-36 sm:w-40' : 'w-40 sm:w-44');

  const cardToneClass = node.status === 'critical'
    ? 'bg-red-950/26'
    : node.status === 'warning'
    ? 'bg-amber-950/22'
    : 'bg-slate-900/90';
  const showExtended = node.status !== 'healthy' || isSelected || isSearchMatch;

  const borderClass = isSearchMatch
    ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/40'
    : isSelected
    ? 'border-cyan-300 shadow-cyan-500/20'
    : node.status === 'critical'
    ? 'border-red-600/70 shadow-red-500/20'
    : node.status === 'warning'
    ? 'border-amber-500/60 shadow-amber-500/20'
    : 'border-slate-700';

  return (
    <button
      type="button"
      data-no-pan="true"
      data-workspace-node="true"
      onClick={() => onSelect(node.workspace_id)}
      onDoubleClick={() => onCenter(node.workspace_id)}
      onContextMenu={(event) => {
        event.preventDefault();
        onTogglePin(node.workspace_id);
      }}
      className={`absolute -translate-x-1/2 -translate-y-1/2 text-left group focus:outline-none ${cardSizeClass} transition-opacity duration-300`}
      style={{ left: `${node.x}%`, top: `${node.y}%`, opacity: isDimmed ? 0.15 : 1 }}
      title={`${node.workspace_name} (${node.workspace_id})`}
    >
      <div
        className={`relative rounded-xl border ${borderClass} ${cardToneClass} px-2.5 py-2 shadow-lg group-hover:-translate-y-0.5 group-hover:shadow-xl transition-all ${node.status === 'critical' ? 'animate-[pulse_3.6s_ease-in-out_infinite]' : ''}`}
      >
        {isPinned && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-500/30 text-cyan-200">
            <Pin className="h-2.5 w-2.5" />
          </span>
        )}

        {/* Row 1: Tier badge + name + usage */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide text-white ${node.accentClass}`}>
              {tierConfig.label.slice(0, 3)}
            </span>
            <p className="text-xs font-semibold text-slate-100 leading-tight truncate">
              {node.workspace_name}
            </p>
          </div>
          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${getUsageBadgeClasses(usagePercent)}`}>
            {node.stats.running}/{limit}
          </span>
        </div>

        {/* Row 2: Workspace ID */}
        <p className="text-[9px] font-mono text-slate-500 mt-0.5">{node.workspace_id}</p>

        {/* Row 3: Stats */}
        <div className={`flex items-center gap-2 mt-1.5 ${showExtended ? '' : 'opacity-70'}`}>
          <div className="flex items-center gap-0.5">
            <Activity className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-[10px] text-emerald-400 font-medium">{node.stats.active}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Loader2 className="w-2.5 h-2.5 text-blue-400" />
            <span className="text-[10px] text-blue-400 font-medium">{node.stats.inDelay}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Workflow className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[10px] text-amber-400 font-medium">{node.stats.queued}</span>
          </div>
          {node.stats.failed24h > 0 && (
            <div className="flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5 text-red-400" />
              <span className="text-[10px] text-red-400 font-medium">{node.stats.failed24h}</span>
            </div>
          )}
        </div>

        {/* Row 4: Usage bar */}
        <div className={`mt-1.5 ${showExtended ? '' : 'opacity-60'}`}>
          <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getUsageBarColor(usagePercent)}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Row 5: 24h stats (comfortable only) */}
        {!isCompact && showExtended && (
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[9px] text-slate-500">
              24h: <span className="text-slate-400">{node.stats.completed24h}</span> done
            </span>
            {node.stats.failed24h > 0 && (
              <span className="text-[9px] text-red-400">
                {node.stats.failed24h} failed
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}
