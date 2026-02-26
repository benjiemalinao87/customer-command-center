import { useState } from 'react';
import {
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Bug,
  Clock,
  Copy,
  Check,
  XCircle,
  CheckCircle2,
  Timer,
  Hash,
  Zap,
} from 'lucide-react';
import type { TriggerRunEvent, EventTreeNode, RunSummary } from '../types/triggerRun';
import {
  fetchRunEvents,
  buildEventTree,
  flattenTree,
  getDefaultExpanded,
  computeRunSummary,
  nanoToDate,
  formatDuration,
  formatTimestamp,
  formatFullTimestamp,
} from '../services/triggerDevApi';

export function RunDebugger() {
  const [runIdInput, setRunIdInput] = useState('');
  const [events, setEvents] = useState<TriggerRunEvent[]>([]);
  const [tree, setTree] = useState<EventTreeNode[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set());
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);
  const [copiedRunId, setCopiedRunId] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const handleLookup = async () => {
    const trimmed = runIdInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setEvents([]);
    setTree([]);
    setSummary(null);
    setSelectedSpanId(null);

    try {
      const response = await fetchRunEvents(trimmed);
      const evts = response.events || [];
      if (evts.length === 0) {
        setError('No events found for this run ID.');
        return;
      }
      setEvents(evts);
      const roots = buildEventTree(evts);
      setTree(roots);
      setExpandedSpans(getDefaultExpanded(roots));
      setSummary(computeRunSummary(evts, trimmed));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch run events.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLookup();
  };

  const toggleExpand = (spanId: string) => {
    setExpandedSpans((prev) => {
      const next = new Set(prev);
      if (next.has(spanId)) next.delete(spanId);
      else next.add(spanId);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (nodes: EventTreeNode[]) => {
      for (const node of nodes) {
        if (node.children.length > 0) {
          all.add(node.event.spanId);
          walk(node.children);
        }
      }
    };
    walk(tree);
    setExpandedSpans(all);
  };

  const collapseAll = () => {
    setExpandedSpans(new Set());
  };

  const copyRunId = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.runId);
    setCopiedRunId(true);
    setTimeout(() => setCopiedRunId(false), 2000);
  };

  const rootStartTime = tree.length > 0 ? Number(tree[0].event.startTime) : 0;
  const totalDuration = tree.length > 0 ? tree[0].event.duration : 1;

  // Compute log-scaled bar widths so short durations are still visible
  const allDurations = events.map((e) => e.duration).filter((d) => d > 0);
  const maxDuration = allDurations.length > 0 ? Math.max(...allDurations) : 1;
  const logBarWidth = (duration: number): number => {
    if (duration <= 0) return 3;
    const logVal = Math.log10(duration + 1);
    const logMax = Math.log10(maxDuration + 1);
    return Math.max(3, (logVal / logMax) * 100);
  };

  const visibleNodes = flattenTree(tree, expandedSpans);

  const filteredNodes =
    filterLevel === 'all'
      ? visibleNodes
      : filterLevel === 'errors'
        ? visibleNodes.filter((n) => n.event.isError)
        : visibleNodes.filter((n) => n.event.level === filterLevel);

  const statusColors: Record<string, string> = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
  };

  const selectedEvent = selectedSpanId ? events.find((e) => e.spanId === selectedSpanId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <Bug className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Run Debugger</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-1 ml-10">
          Inspect workflow run execution timelines
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={runIdInput}
              onChange={(e) => setRunIdInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="run_abc123def456xyz789..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
            />
          </div>
          <button
            onClick={handleLookup}
            disabled={loading || !runIdInput.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Lookup
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 ml-1">
          Paste a run ID to inspect its execution timeline
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Error</span>
          </div>
          <p className="mt-1 text-sm text-red-500 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-4 px-4 py-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Status
            </div>
            <div className="mt-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold ${statusColors[summary.status]}`}
              >
                {summary.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {summary.status === 'error' && <XCircle className="w-3.5 h-3.5" />}
                {summary.status === 'partial' && <Clock className="w-3.5 h-3.5" />}
                {summary.status === 'cancelled' && <XCircle className="w-3.5 h-3.5" />}
                {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Duration
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-blue-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {formatDuration(summary.totalDurationMs * 1_000_000)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Events
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Hash className="w-4 h-4 text-purple-500" />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                {summary.totalEvents}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Errors
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <AlertCircle
                className={`w-4 h-4 ${summary.errorCount > 0 ? 'text-red-500' : 'text-gray-400'}`}
              />
              <span
                className={`text-lg font-bold ${summary.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
              >
                {summary.errorCount}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Started
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {formatFullTimestamp(summary.startTime)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tree */}
      {summary && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Timeline Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Execution Timeline
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                {summary.runId}
              </span>
              <button
                onClick={copyRunId}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Copy run ID"
              >
                {copiedRunId ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="all">All levels</option>
                <option value="errors">Errors only</option>
                <option value="INFO">INFO</option>
                <option value="TRACE">TRACE</option>
                <option value="ERROR">ERROR</option>
              </select>
              <button
                onClick={expandAll}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              >
                Collapse All
              </button>
              <button
                onClick={handleLookup}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Column Headers */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-700/50 text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            <span className="w-5" />
            <span className="w-2" />
            <span className="flex-1">Event</span>
            <span className="w-32 text-center">Duration</span>
            <span className="w-16 text-right">Time</span>
            <span className="w-20 text-right">Timestamp</span>
          </div>

          {/* Event Rows */}
          <div className="max-h-[600px] overflow-y-auto">
            {filteredNodes.map((node) => {
              const barWidthPercent = logBarWidth(node.event.duration);

              const isSelected = selectedSpanId === node.event.spanId;

              return (
                <div key={node.event.spanId}>
                  <div
                    className={`flex items-center gap-2 py-1.5 border-b border-gray-50 dark:border-gray-700/30 cursor-pointer transition-colors ${
                      node.event.isError
                        ? 'bg-red-50/50 dark:bg-red-900/10 border-l-2 border-l-red-500'
                        : isSelected
                          ? 'bg-blue-50/50 dark:bg-blue-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'
                    }`}
                    style={{ paddingLeft: `${12 + node.depth * 20}px`, paddingRight: '16px' }}
                    onClick={() => setSelectedSpanId(isSelected ? null : node.event.spanId)}
                  >
                    {/* Expand/collapse */}
                    {node.children.length > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(node.event.spanId);
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                      >
                        {expandedSpans.has(node.event.spanId) ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </button>
                    ) : (
                      <span className="w-5 flex-shrink-0" />
                    )}

                    {/* Status dot */}
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        node.event.isError
                          ? 'bg-red-500'
                          : node.event.isCancelled
                            ? 'bg-gray-400'
                            : node.event.level === 'ERROR'
                              ? 'bg-red-500'
                              : node.event.level === 'WARN'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                      }`}
                    />

                    {/* Message */}
                    <span
                      className={`flex-1 text-sm truncate ${
                        node.event.isError
                          ? 'text-red-700 dark:text-red-400 font-medium'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {node.event.message}
                    </span>

                    {/* Duration bar */}
                    <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                      <div
                        className={`h-full rounded-full transition-all ${
                          node.event.isError
                            ? 'bg-gradient-to-r from-red-400 to-red-500'
                            : 'bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-400'
                        }`}
                        style={{ width: `${barWidthPercent}%` }}
                      />
                    </div>

                    {/* Duration text */}
                    <span className="w-16 text-right text-xs text-gray-500 dark:text-gray-400 font-mono flex-shrink-0">
                      {formatDuration(node.event.duration)}
                    </span>

                    {/* Timestamp */}
                    <span className="w-20 text-right text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
                      {formatTimestamp(nanoToDate(node.event.startTime))}
                    </span>
                  </div>

                  {/* Expanded detail panel */}
                  {isSelected && selectedEvent && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                            Span ID
                          </span>
                          <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {selectedEvent.spanId}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                            Level
                          </span>
                          <p className="mt-0.5">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                selectedEvent.level === 'ERROR'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : selectedEvent.level === 'WARN'
                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : selectedEvent.level === 'INFO'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                              }`}
                            >
                              {selectedEvent.level}
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                            Duration
                          </span>
                          <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {formatDuration(selectedEvent.duration)}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                            Start Time
                          </span>
                          <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                            {formatFullTimestamp(nanoToDate(selectedEvent.startTime))}
                          </p>
                        </div>
                        {selectedEvent.attemptNumber !== null && (
                          <div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                              Attempt
                            </span>
                            <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                              #{selectedEvent.attemptNumber}
                            </p>
                          </div>
                        )}
                        {selectedEvent.kind !== 'UNSPECIFIED' && (
                          <div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                              Kind
                            </span>
                            <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                              {selectedEvent.kind}
                            </p>
                          </div>
                        )}
                        {selectedEvent.parentId && (
                          <div>
                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase">
                              Parent Span
                            </span>
                            <p className="mt-0.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                              {selectedEvent.parentId}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Sub-events */}
                      {selectedEvent.events.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase mb-2">
                            Sub-events ({selectedEvent.events.length})
                          </h4>
                          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                                    Name
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                                    Time
                                  </th>
                                  <th className="text-left px-3 py-2 font-medium text-gray-500 dark:text-gray-400">
                                    Properties
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedEvent.events.map((subEvt, idx) => (
                                  <tr
                                    key={idx}
                                    className="border-t border-gray-100 dark:border-gray-700/50"
                                  >
                                    <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                                      {subEvt.name}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">
                                      {new Date(subEvt.time).toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true,
                                      })}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                      {Object.entries(subEvt.properties)
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(', ')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* TODO: Span Properties from Trace API — re-enable once Trigger.dev /trace endpoint returns data.properties */}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filteredNodes.length} of {events.length} events visible
            </span>
            <span className="text-xs flex items-center gap-1.5 animate-[heartbeat_2s_ease-in-out_infinite]">
              <Zap className="w-3 h-3 text-blue-400 dark:text-blue-300 drop-shadow-[0_0_4px_rgba(96,165,250,0.6)]" />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400 bg-clip-text text-transparent font-semibold tracking-wide bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite] drop-shadow-[0_0_6px_rgba(147,130,220,0.4)]">
                Customer Connect Engine
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-20">
          <Bug className="w-16 h-16 text-gray-300 dark:text-gray-600" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            Enter a run ID above to inspect its execution timeline
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 font-mono">
            Run IDs look like: run_abc123def456xyz789
          </p>
        </div>
      )}
    </div>
  );
}
