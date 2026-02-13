import { useState, useEffect, useCallback } from 'react';
import {
  Link2, MousePointerClick, Building2, TrendingUp,
  RefreshCw, Monitor, Smartphone, ArrowLeft, ExternalLink
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkspaceStats {
  workspace_id: string;
  workspace_name: string;
  total_links: number;
  total_clicks: number;
  calendar_links: number;
  short_links: number;
  latest_link_created: string | null;
  latest_click: string | null;
}

interface ClickTrend {
  date: string;
  clicks: number;
  unique_links: number;
}

interface DeviceStats {
  device_type: string;
  browser: string;
  os: string;
  count: number;
}

type TimeRange = '7d' | '14d' | '30d';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDateThreshold(range: TimeRange): string {
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ title, value, icon: Icon, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorMap = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function ClickTrendBar({ trend, maxClicks }: { trend: ClickTrend; maxClicks: number }) {
  const pct = maxClicks > 0 ? (trend.clicks / maxClicks) * 100 : 0;
  const day = new Date(trend.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 text-gray-600 dark:text-gray-400 flex-shrink-0">{day}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
        <div
          className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
      <span className="w-16 text-right font-medium text-gray-900 dark:text-white flex-shrink-0">
        {trend.clicks.toLocaleString()}
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LinkGatewayAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('14d');
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceStats[]>([]);
  const [clickTrends, setClickTrends] = useState<ClickTrend[]>([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState<DeviceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const threshold = getDateThreshold(timeRange);

      // Query 1: Workspace summary from shortened_links
      // Since Supabase JS doesn't support GROUP BY, we fetch and aggregate client-side
      const workspaceQuery = supabase
        .from('shortened_links')
        .select('workspace_id, click_count, custom_field_name, created_at, last_clicked_at');

      const { data: linksData, error: linksError } = await workspaceQuery;

      if (linksError) {
        console.error('Error fetching links:', linksError);
        setWorkspaceStats([]);
      } else {
        // Aggregate per workspace
        const wsMap = new Map<string, {
          total_links: number;
          total_clicks: number;
          calendar_links: number;
          short_links: number;
          latest_link_created: string | null;
          latest_click: string | null;
        }>();

        for (const row of linksData || []) {
          const ws = wsMap.get(row.workspace_id) || {
            total_links: 0, total_clicks: 0, calendar_links: 0, short_links: 0,
            latest_link_created: null, latest_click: null,
          };
          ws.total_links++;
          ws.total_clicks += row.click_count || 0;
          if (row.custom_field_name?.startsWith('calendar_link_')) {
            ws.calendar_links++;
          } else {
            ws.short_links++;
          }
          if (!ws.latest_link_created || (row.created_at && row.created_at > ws.latest_link_created)) {
            ws.latest_link_created = row.created_at;
          }
          if (row.last_clicked_at && (!ws.latest_click || row.last_clicked_at > ws.latest_click)) {
            ws.latest_click = row.last_clicked_at;
          }
          wsMap.set(row.workspace_id, ws);
        }

        // Fetch workspace names
        const wsIds = Array.from(wsMap.keys());
        const { data: workspaces } = await supabase
          .from('workspaces')
          .select('id, name')
          .in('id', wsIds.map(id => parseInt(id)).filter(id => !isNaN(id)));

        const nameMap = new Map<string, string>();
        for (const w of workspaces || []) {
          nameMap.set(String(w.id), w.name);
        }

        const stats: WorkspaceStats[] = Array.from(wsMap.entries()).map(([wsId, data]) => ({
          workspace_id: wsId,
          workspace_name: nameMap.get(wsId) || `Workspace ${wsId}`,
          ...data,
        }));

        stats.sort((a, b) => b.total_clicks - a.total_clicks);
        setWorkspaceStats(stats);
      }

      // Query 2: Click trends (daily)
      let clicksQuery = supabase
        .from('short_link_clicks')
        .select('clicked_at, shortened_link_id')
        .gte('clicked_at', threshold)
        .order('clicked_at', { ascending: true });

      if (selectedWorkspace) {
        clicksQuery = clicksQuery.eq('workspace_id', selectedWorkspace);
      }

      const { data: clicksData, error: clicksError } = await clicksQuery;

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
        setClickTrends([]);
      } else {
        // Aggregate by date
        const dayMap = new Map<string, { clicks: number; linkIds: Set<string> }>();
        for (const row of clicksData || []) {
          if (!row.clicked_at) continue;
          const day = row.clicked_at.substring(0, 10);
          const entry = dayMap.get(day) || { clicks: 0, linkIds: new Set<string>() };
          entry.clicks++;
          if (row.shortened_link_id) entry.linkIds.add(row.shortened_link_id);
          dayMap.set(day, entry);
        }

        const trends: ClickTrend[] = Array.from(dayMap.entries())
          .map(([date, data]) => ({ date, clicks: data.clicks, unique_links: data.linkIds.size }))
          .sort((a, b) => a.date.localeCompare(b.date));

        setClickTrends(trends);
      }

      // Query 3: Device breakdown
      let deviceQuery = supabase
        .from('short_link_clicks')
        .select('device_type, browser, os')
        .gte('clicked_at', threshold);

      if (selectedWorkspace) {
        deviceQuery = deviceQuery.eq('workspace_id', selectedWorkspace);
      }

      const { data: deviceData, error: deviceError } = await deviceQuery;

      if (deviceError) {
        console.error('Error fetching device data:', deviceError);
        setDeviceBreakdown([]);
      } else {
        // Aggregate
        const devMap = new Map<string, number>();
        for (const row of deviceData || []) {
          const key = `${row.device_type || 'unknown'}|${row.browser || 'unknown'}|${row.os || 'unknown'}`;
          devMap.set(key, (devMap.get(key) || 0) + 1);
        }

        const breakdown: DeviceStats[] = Array.from(devMap.entries())
          .map(([key, count]) => {
            const [device_type, browser, os] = key.split('|');
            return { device_type, browser, os, count };
          })
          .sort((a, b) => b.count - a.count);

        setDeviceBreakdown(breakdown);
      }
    } catch (err) {
      console.error('LinkGatewayAnalytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange, selectedWorkspace]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300_000); // 5min auto-refresh
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived stats
  const totalLinks = workspaceStats.reduce((sum, ws) => sum + ws.total_links, 0);
  const totalClicks = workspaceStats.reduce((sum, ws) => sum + ws.total_clicks, 0);
  const activeWorkspaces = workspaceStats.filter(ws => ws.total_clicks > 0).length;
  const clickRate = totalLinks > 0 ? ((totalClicks / totalLinks) * 100).toFixed(1) : '0';

  const maxTrendClicks = Math.max(...clickTrends.map(t => t.clicks), 1);

  // Device aggregates
  const mobileClicks = deviceBreakdown.filter(d => d.device_type === 'mobile').reduce((s, d) => s + d.count, 0);
  const desktopClicks = deviceBreakdown.filter(d => d.device_type === 'desktop').reduce((s, d) => s + d.count, 0);
  const totalDeviceClicks = mobileClicks + desktopClicks || 1;

  // Top browsers
  const browserMap = new Map<string, number>();
  for (const d of deviceBreakdown) {
    browserMap.set(d.browser, (browserMap.get(d.browser) || 0) + d.count);
  }
  const topBrowsers = Array.from(browserMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Selected workspace info
  const selectedWsName = selectedWorkspace
    ? workspaceStats.find(ws => ws.workspace_id === selectedWorkspace)?.workspace_name || selectedWorkspace
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {selectedWorkspace && (
            <button
              onClick={() => setSelectedWorkspace(null)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
              title="Back to all workspaces"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {selectedWsName ? selectedWsName : 'Link Gateway'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {selectedWsName
                ? 'Per-workspace link and click analytics'
                : 'chauto.link gateway observability across all workspaces'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Time Range */}
          {(['7d', '14d', '30d'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}

          <button
            onClick={fetchData}
            disabled={loading}
            className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Total Links" value={formatNumber(totalLinks)} icon={Link2} color="blue" />
            <StatCard title="Total Clicks" value={formatNumber(totalClicks)} icon={MousePointerClick} color="green" />
            <StatCard title="Active Workspaces" value={String(activeWorkspaces)} icon={Building2} color="purple" />
            <StatCard title="Click Rate" value={`${clickRate}%`} icon={TrendingUp} color="orange" />
          </div>

          {/* Workspace Table (hidden when drilled into a workspace) */}
          {!selectedWorkspace && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Workspaces</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Workspace</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Links</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Calendar</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Short</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Clicks</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Rate</th>
                      <th className="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {workspaceStats.map(ws => {
                      const rate = ws.total_links > 0 ? ((ws.total_clicks / ws.total_links) * 100).toFixed(1) : '0';
                      const lastActivity = ws.latest_click || ws.latest_link_created;
                      return (
                        <tr
                          key={ws.workspace_id}
                          onClick={() => setSelectedWorkspace(ws.workspace_id)}
                          className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 dark:text-white">{ws.workspace_name}</span>
                              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">ID: {ws.workspace_id}</span>
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                            {ws.total_links.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                            {ws.calendar_links.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-400">
                            {ws.short_links.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-gray-900 dark:text-white">
                            {ws.total_clicks.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              parseFloat(rate) >= 100
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : parseFloat(rate) >= 50
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {timeAgo(lastActivity)}
                          </td>
                        </tr>
                      );
                    })}
                    {workspaceStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                          No link data found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Click Trends + Device Breakdown (side by side on large screens) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Click Trends (2/3 width) */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Daily Clicks {selectedWsName ? `(${selectedWsName})` : ''}
              </h3>
              {clickTrends.length > 0 ? (
                <div className="space-y-2">
                  {clickTrends.map(trend => (
                    <ClickTrendBar key={trend.date} trend={trend} maxClicks={maxTrendClicks} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No click data for the selected period
                </p>
              )}
            </div>

            {/* Device Breakdown (1/3 width) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Devices</h3>

              {/* Desktop vs Mobile */}
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Monitor className="w-4 h-4" />
                    <span>Desktop</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {desktopClicks.toLocaleString()} ({((desktopClicks / totalDeviceClicks) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-500 h-2.5 rounded-full"
                    style={{ width: `${(desktopClicks / totalDeviceClicks) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Smartphone className="w-4 h-4" />
                    <span>Mobile</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {mobileClicks.toLocaleString()} ({((mobileClicks / totalDeviceClicks) * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full"
                    style={{ width: `${(mobileClicks / totalDeviceClicks) * 100}%` }}
                  />
                </div>
              </div>

              {/* Top Browsers */}
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 mt-6">Top Browsers</h4>
              <div className="space-y-2">
                {topBrowsers.map(([browser, count]) => (
                  <div key={browser} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{browser}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{count.toLocaleString()}</span>
                  </div>
                ))}
                {topBrowsers.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm">No data</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
