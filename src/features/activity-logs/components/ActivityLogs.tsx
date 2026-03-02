/**
 * Audit Logs Component
 * Shows user logins, logouts, and page navigations across the Command Center.
 * Queries the audit_logs Supabase table populated by auditLogger service.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Filter, LogIn, LogOut, Eye, Zap, Clock, RefreshCw, User,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getSessionViewLabel } from '../../../lib/sessionViews';

interface AuditLog {
  id: string;
  user_id: string;
  user_email: string | null;
  action: string;
  section: string | null;
  details: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: typeof LogIn; color: string }> = {
  login:     { label: 'Login',     icon: LogIn,  color: 'bg-green-500/10 text-green-400 border-green-500/30' },
  logout:    { label: 'Logout',    icon: LogOut,  color: 'bg-red-500/10 text-red-400 border-red-500/30' },
  page_view: { label: 'Page View', icon: Eye,     color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
  action:    { label: 'Action',    icon: Zap,     color: 'bg-orange-500/10 text-orange-400 border-orange-500/30' },
};

const DEFAULT_CONFIG = { label: 'Event', icon: Zap, color: 'bg-gray-500/10 text-gray-400 border-gray-500/30' };

const PAGE_SIZE = 20;

export function ActivityLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterAction, setFilterAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(PAGE_SIZE);

  // Stats (fetched separately so they reflect the full dataset, not just current page)
  const [stats, setStats] = useState({ total: 0, logins: 0, pageViews: 0, uniqueUsers: 0 });

  const getDateBounds = useCallback((): { from: string | null; to: string | null } => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return { from: startOfToday.toISOString(), to: null };
      case 'yesterday': {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        return { from: startOfYesterday.toISOString(), to: startOfToday.toISOString() };
      }
      case '7d': {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 7);
        return { from: d.toISOString(), to: null };
      }
      case '30d': {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 30);
        return { from: d.toISOString(), to: null };
      }
      case 'custom': {
        const from = fromDate ? new Date(fromDate).toISOString() : null;
        const to = toDate ? new Date(toDate + 'T23:59:59.999').toISOString() : null;
        return { from, to };
      }
      default:
        return { from: null, to: null };
    }
  }, [dateRange, fromDate, toDate]);

  const loadStats = useCallback(async () => {
    const { from, to } = getDateBounds();

    // Fetch all logs for stats (just id, action, user_email — lightweight)
    let query = supabase
      .from('audit_logs')
      .select('action, user_email');

    if (filterAction) query = query.eq('action', filterAction);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data } = await query;
    const rows = data || [];

    setStats({
      total: rows.length,
      logins: rows.filter(r => r.action === 'login').length,
      pageViews: rows.filter(r => r.action === 'page_view').length,
      uniqueUsers: new Set(rows.map(r => r.user_email).filter(Boolean)).size,
    });
  }, [filterAction, getDateBounds]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = getDateBounds();
      const offset = (currentPage - 1) * perPage;

      // Get total count for pagination
      let countQuery = supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      if (filterAction) countQuery = countQuery.eq('action', filterAction);
      if (from) countQuery = countQuery.gte('created_at', from);
      if (to) countQuery = countQuery.lte('created_at', to);

      const { count } = await countQuery;
      setTotalCount(count || 0);

      // Get paginated data
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + perPage - 1);

      if (filterAction) query = query.eq('action', filterAction);
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);

      const { data, error } = await query;

      if (error) {
        console.error('Error loading audit logs:', error);
        setLogs([]);
        return;
      }

      setLogs(data || []);
    } catch (err) {
      console.error('Error loading audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filterAction, currentPage, perPage, getDateBounds]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, dateRange, fromDate, toDate, perPage]);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLogs(), loadStats()]);
    setRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return '';
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hrs < 24) return `${hrs}h ago`;
    return `${days}d ago`;
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      log.user_email?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.section?.toLowerCase().includes(s) ||
      log.details?.toLowerCase().includes(s) ||
      getSessionViewLabel(log.section)?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const actionTypes = [
    { value: '', label: 'All Activity' },
    { value: 'login', label: 'Logins' },
    { value: 'logout', label: 'Logouts' },
    { value: 'page_view', label: 'Page Views' },
    { value: 'action', label: 'Actions' },
  ];

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4" />
          <p className="text-gray-400">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Audit Logs</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          User logins and activity across Command Center sections
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <LogIn className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Logins</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.logins}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Page Views</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pageViews}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <User className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Unique Users</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.uniqueUsers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <input
            type="text"
            placeholder="Search by user, section, details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          {actionTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="custom">Custom Range</option>
        </select>

        {dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        )}

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg border border-gray-300 dark:border-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Section
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.map((log) => {
                const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG;
                const Icon = config.icon;
                return (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {formatDate(log.created_at)}
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatRelativeTime(log.created_at)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {log.user_email || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {log.section ? getSessionViewLabel(log.section) : '-'}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate" title={log.details || ''}>
                        {log.details || '-'}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8 px-6">
            <p className="text-gray-500 dark:text-gray-400">
              {totalCount === 0
                ? 'No audit logs yet. Activity will appear here as users navigate the Command Center.'
                : 'No logs match your search criteria.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {totalCount === 0 ? 0 : (currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, totalCount)} of {totalCount} events
            </span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(parseInt(e.target.value))}
              className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
