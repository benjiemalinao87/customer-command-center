import { useState } from 'react';
import { Pause, Play, Settings, RotateCcw, Loader2, AlertTriangle, Flame, Zap } from 'lucide-react';
import type { QueueInfo } from '../services/queueApi';

interface QueueStatusCardProps {
  queue: QueueInfo;
  onOverride: (name: string, limit: number) => Promise<void>;
  onReset: (name: string) => Promise<void>;
  onPause: (name: string) => Promise<void>;
  onResume: (name: string) => Promise<void>;
}

type AlertTier = 'idle' | 'normal' | 'warm' | 'hot' | 'critical';

function getAlertTier(usagePercent: number, running: number, queued: number): AlertTier {
  if (running === 0 && queued === 0) return 'idle';
  if (usagePercent >= 90) return 'critical';
  if (usagePercent >= 70) return 'hot';
  if (usagePercent >= 50) return 'warm';
  return 'normal';
}

const ENV_CONCURRENCY_LIMIT = 600;

export function QueueStatusCard({ queue, onOverride, onReset, onPause, onResume }: QueueStatusCardProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [overrideValue, setOverrideValue] = useState(String(queue.concurrencyLimit));
  const [loading, setLoading] = useState<string | null>(null);

  const effectiveLimit = queue.concurrencyLimitOverride ?? queue.concurrencyLimit;
  const hasExplicitLimit = effectiveLimit > 0;
  const displayLimit = hasExplicitLimit ? effectiveLimit : ENV_CONCURRENCY_LIMIT;
  const usagePercent = displayLimit > 0 ? Math.min((queue.running / displayLimit) * 100, 100) : 0;
  const isOverridden = queue.concurrencyLimitOverride != null;
  const tier = queue.paused ? 'idle' : getAlertTier(usagePercent, queue.running, queue.queued);

  const handleAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const handleOverrideSubmit = async () => {
    const val = parseInt(overrideValue, 10);
    if (isNaN(val) || val < 1) return;
    await handleAction('override', () => onOverride(queue.name, val));
    setShowOverride(false);
  };

  // --- Tier-based visual styles ---
  const cardStyles: Record<AlertTier, string> = {
    idle: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    normal: 'bg-white dark:bg-gray-800 border-emerald-300 dark:border-emerald-700',
    warm: 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-600',
    hot: 'bg-orange-50/60 dark:bg-orange-950/30 border-orange-500 dark:border-orange-500 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)] dark:shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]',
    critical: 'bg-red-50/60 dark:bg-red-950/30 border-red-500 dark:border-red-500 shadow-[0_0_20px_-3px_rgba(239,68,68,0.4)] dark:shadow-[0_0_20px_-3px_rgba(239,68,68,0.3)]',
  };

  const barColors: Record<AlertTier, string> = {
    idle: 'bg-gray-300 dark:bg-gray-600',
    normal: 'bg-emerald-500',
    warm: 'bg-amber-500',
    hot: 'bg-orange-500',
    critical: 'bg-red-500',
  };

  const runningTextColors: Record<AlertTier, string> = {
    idle: 'text-gray-400 dark:text-gray-500',
    normal: 'text-emerald-600 dark:text-emerald-400',
    warm: 'text-amber-600 dark:text-amber-400',
    hot: 'text-orange-600 dark:text-orange-400',
    critical: 'text-red-600 dark:text-red-400',
  };

  const queuedTextColors: Record<AlertTier, string> = {
    idle: 'text-gray-400 dark:text-gray-500',
    normal: 'text-gray-900 dark:text-gray-100',
    warm: 'text-amber-700 dark:text-amber-300',
    hot: 'text-orange-700 dark:text-orange-300',
    critical: 'text-red-700 dark:text-red-300',
  };

  const AlertIcon = () => {
    if (tier === 'critical') return <Flame className="w-4 h-4 text-red-500 animate-pulse" />;
    if (tier === 'hot') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    if (tier === 'warm') return <Zap className="w-4 h-4 text-amber-500" />;
    return null;
  };

  return (
    <div
      className={`relative rounded-xl border-2 p-5 transition-all duration-500 ${cardStyles[tier]} ${
        tier === 'critical' ? 'animate-[subtle-pulse_2s_ease-in-out_infinite]' : ''
      }`}
    >
      {/* Critical/Hot top strip */}
      {(tier === 'critical' || tier === 'hot') && (
        <div
          className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
            tier === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-orange-500'
          }`}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertIcon />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-mono">
            {queue.name}
          </h3>
          {isOverridden && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
              OVERRIDE
            </span>
          )}
          {queue.paused && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
              PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tier === 'critical' && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded animate-pulse uppercase tracking-wide">
              At Capacity
            </span>
          )}
          {tier === 'hot' && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded uppercase tracking-wide">
              High Load
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {queue.type}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <div className={`text-2xl font-bold transition-colors duration-300 ${runningTextColors[tier]}`}>
            {queue.running}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Running</div>
        </div>
        <div>
          <div className={`text-2xl font-bold transition-colors duration-300 ${
            queue.queued > 0 ? queuedTextColors[tier] : 'text-gray-900 dark:text-gray-100'
          }`}>
            {queue.queued}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Queued</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {hasExplicitLimit ? effectiveLimit : (
              <span className="text-gray-400 dark:text-gray-500 text-lg" title="Using environment limit">
                env
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Limit</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>
            {queue.running} / {displayLimit} slots used
            {!hasExplicitLimit && <span className="ml-1 opacity-60">(env)</span>}
          </span>
          <span className={`font-medium ${
            tier === 'critical' ? 'text-red-600 dark:text-red-400 font-bold' :
            tier === 'hot' ? 'text-orange-600 dark:text-orange-400' :
            ''
          }`}>
            {Math.round(usagePercent)}%
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColors[tier]} ${
              tier === 'critical' ? 'animate-[bar-pulse_1.5s_ease-in-out_infinite]' : ''
            }`}
            style={{ width: `${Math.max(usagePercent, queue.running > 0 ? 2 : 0)}%` }}
          />
        </div>
      </div>

      {/* Override Input */}
      {showOverride && (
        <div className="flex items-center gap-2 mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <input
            type="number"
            min="1"
            max="500"
            value={overrideValue}
            onChange={(e) => setOverrideValue(e.target.value)}
            className="w-20 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleOverrideSubmit()}
          />
          <button
            onClick={handleOverrideSubmit}
            disabled={loading === 'override'}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading === 'override' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
          </button>
          <button
            onClick={() => setShowOverride(false)}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowOverride(!showOverride)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          title="Override concurrency limit"
        >
          <Settings className="w-3.5 h-3.5" />
          Override
        </button>

        {isOverridden && (
          <button
            onClick={() => handleAction('reset', () => onReset(queue.name))}
            disabled={loading === 'reset'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            title="Reset to code-defined limit"
          >
            {loading === 'reset' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset
          </button>
        )}

        <button
          onClick={() =>
            handleAction('pause', () =>
              queue.paused ? onResume(queue.name) : onPause(queue.name)
            )
          }
          disabled={loading === 'pause'}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            queue.paused
              ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
              : 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
          }`}
          title={queue.paused ? 'Resume queue' : 'Pause queue'}
        >
          {loading === 'pause' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : queue.paused ? (
            <Play className="w-3.5 h-3.5" />
          ) : (
            <Pause className="w-3.5 h-3.5" />
          )}
          {queue.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes subtle-pulse {
          0%, 100% { box-shadow: 0 0 20px -3px rgba(239,68,68,0.4); }
          50% { box-shadow: 0 0 30px -3px rgba(239,68,68,0.6); }
        }
        @keyframes bar-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
