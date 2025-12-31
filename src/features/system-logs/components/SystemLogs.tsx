/**
 * System Logs Component
 * Unified view of system activities (SMS, Email, etc.) with stats and pagination
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Info, AlertTriangle, AlertCircle, Phone, Mail, 
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'ERROR' | 'WARN';
  category: string;
  phone_or_email: string | null;
  message: string;
  workspace_id: string;
  metadata: Record<string, any>;
  source_type: string;
}

interface LogStats {
  total: number;
  info: number;
  warn: number;
  error: number;
  infoPercent: number;
  warnPercent: number;
  errorPercent: number;
}

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<LogStats>({
    total: 0,
    info: 0,
    warn: 0,
    error: 0,
    infoPercent: 0,
    warnPercent: 0,
    errorPercent: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState('today');
  const pageSize = 20;

  useEffect(() => {
    loadStats();
    loadLogs();
  }, [filterLevel, filterCategory, dateRange, currentPage]);

  // Calculate date range start time
  const getDateRangeStart = (range: string): Date => {
    const now = new Date();
    const start = new Date();
    
    switch (range) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'yesterday':
        start.setDate(now.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        break;
      case '2days':
        start.setDate(now.getDate() - 2);
        start.setHours(0, 0, 0, 0);
        break;
      case '7days':
        start.setDate(now.getDate() - 7);
        break;
      case '1month':
        start.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        start.setMonth(now.getMonth() - 3);
        break;
      default:
        start.setHours(0, 0, 0, 0);
    }
    
    return start;
  };

  const loadStats = async () => {
    try {
      const startTime = getDateRangeStart(dateRange);
      
      let query = supabase
        .from('system_logs_view')
        .select('level', { count: 'exact' })
        .gte('timestamp', startTime.toISOString());

      if (filterCategory) {
        query = query.ilike('category', `%${filterCategory}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading stats:', error);
        return;
      }

      const allLogs = data || [];
      const total = allLogs.length;
      const info = allLogs.filter((l: any) => l.level === 'INFO').length;
      const warn = allLogs.filter((l: any) => l.level === 'WARN').length;
      const error = allLogs.filter((l: any) => l.level === 'ERROR').length;

      setStats({
        total,
        info,
        warn,
        error,
        infoPercent: total > 0 ? Math.round((info / total) * 100) : 0,
        warnPercent: total > 0 ? Math.round((warn / total) * 100) : 0,
        errorPercent: total > 0 ? Math.round((error / total) * 100) : 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const startTime = getDateRangeStart(dateRange);
      const offset = (currentPage - 1) * pageSize;
      
      let query = supabase
        .from('system_logs_view')
        .select('*', { count: 'exact' })
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filterLevel) {
        query = query.eq('level', filterLevel);
      }

      if (filterCategory) {
        query = query.ilike('category', `%${filterCategory}%`);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error loading system logs:', error);
        setLogs([]);
        setTotalCount(0);
        return;
      }

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading system logs:', error);
      setLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadLogs()]);
    setRefreshing(false);
  };

  const handleDateRangeChange = (newRange: string) => {
    setDateRange(newRange);
    setCurrentPage(1); // Reset to first page when changing date range
  };

  const handleLevelFilter = (level: string) => {
    setFilterLevel(filterLevel === level ? '' : level);
    setCurrentPage(1); // Reset to first page when changing filter
  };

  const toggleDetails = (id: string) => {
    if (expandedLogId === id) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(id);
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'INFO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <Info className="w-3.5 h-3.5" />
            INFO
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5" />
            WARN
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {level}
          </span>
        );
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category.includes('SMS') || category.includes('TEXT')) return <MessageSquare className="w-4 h-4" />;
    if (category.includes('EMAIL')) return <Mail className="w-4 h-4" />;
    if (category.includes('CALL')) return <Phone className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  // Client-side search filtering
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.message?.toLowerCase().includes(term) ||
      log.category?.toLowerCase().includes(term) ||
      log.phone_or_email?.toLowerCase().includes(term) ||
      log.workspace_id?.toLowerCase().includes(term)
    );
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'SMS', label: 'SMS' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'INBOUND', label: 'Inbound' },
    { value: 'OUTBOUND', label: 'Outbound' }
  ];

  const dateRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: '2days', label: '2 Days' },
    { value: '7days', label: 'Last 7 Days' },
    { value: '1month', label: '1 Month' },
    { value: '3months', label: '3 Months' }
  ];

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Logs</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Unified view of system activities, messages, and errors
        </p>
      </div>

      {/* Stats Cards with Percentages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => handleLevelFilter('INFO')}
          className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-md ${
            filterLevel === 'INFO'
              ? 'border-blue-500 dark:border-blue-400 shadow-md'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">INFO</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.info}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                {stats.infoPercent}%
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleLevelFilter('WARN')}
          className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-md ${
            filterLevel === 'WARN'
              ? 'border-yellow-500 dark:border-yellow-400 shadow-md'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">WARN</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.warn}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                {stats.warnPercent}%
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => handleLevelFilter('ERROR')}
          className={`bg-white dark:bg-gray-800 rounded-xl border p-4 transition-all hover:shadow-md ${
            filterLevel === 'ERROR'
              ? 'border-red-500 dark:border-red-400 shadow-md'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">ERROR</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.error}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                {stats.errorPercent}%
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0">
          
          {/* Time Range */}
          <select
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {dateRangeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-32">Level</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-48">Phone / Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                // Loading Skeleton
                [...Array(pageSize)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
                    <td className="px-6 py-4"><div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28"></div></td>
                    <td className="px-6 py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div></td>
                    <td className="px-6 py-4"></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    No logs found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`
                        group transition-colors cursor-pointer
                        ${expandedLogId === log.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}
                      `}
                      onClick={() => toggleDetails(log.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-mono text-sm text-gray-600 dark:text-gray-300">
                          <span className="opacity-50">🕒</span>
                          {formatDate(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getLevelBadge(log.level)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="text-gray-400 dark:text-gray-500">{getCategoryIcon(log.category)}</span>
                          {log.category.replace(/_/g, ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {log.phone_or_email || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white truncate max-w-md" title={log.message}>
                          {log.message}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center justify-end gap-1 w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDetails(log.id);
                          }}
                        >
                          View Details
                          {expandedLogId === log.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expandable Details Row */}
                    {expandedLogId === log.id && (
                      <tr className="bg-gray-50/80 dark:bg-gray-800/50">
                        <td colSpan={6} className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Log Details</h4>
                              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                                  <span className="text-gray-500">Log ID</span>
                                  <span className="font-mono text-xs">{log.id}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                                  <span className="text-gray-500">Source Type</span>
                                  <span className="capitalize">{log.source_type}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-1">
                                  <span className="text-gray-500">Workspace ID</span>
                                  <span className="font-mono text-xs">{log.workspace_id}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Metadata & Payload</h4>
                              <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-x-auto max-h-40">
                                <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            </div>
                            
                            <div className="md:col-span-2">
                              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Full Message</h4>
                              <div className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-800 dark:text-gray-200">
                                {log.message}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startRecord} to {endRecord} of {totalCount} logs
          </span>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400 px-3">
              Page {currentPage} of {totalPages || 1}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
