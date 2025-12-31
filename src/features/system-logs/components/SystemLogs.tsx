/**
 * System Logs Component
 * Unified view of system activities (SMS, Email, etc.) matching the provided design.
 */

import React, { useState, useEffect } from 'react';
import { 
  Filter, Search, RefreshCw, ChevronDown, ChevronUp, 
  Info, AlertTriangle, AlertCircle, Phone, Mail, 
  MessageSquare, ArrowUpRight, ArrowDownLeft 
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

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [limit, setLimit] = useState(50);
  const [dateRange, setDateRange] = useState('24h');

  useEffect(() => {
    loadLogs();
  }, [filterLevel, filterCategory, limit, dateRange]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('system_logs_view')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (filterLevel) {
        query = query.eq('level', filterLevel);
      }

      if (filterCategory) {
        // Simple partial match or exact match depending on UI needs
        // For now, let's assume exact match if selected from dropdown
        query = query.ilike('category', `%${filterCategory}%`);
      }

      // Date range filtering
      if (dateRange !== 'all') {
        const now = new Date();
        let startTime = new Date();
        
        switch (dateRange) {
          case '1h': startTime.setHours(now.getHours() - 1); break;
          case '24h': startTime.setHours(now.getHours() - 24); break;
          case '7d': startTime.setDate(now.getDate() - 7); break;
          case '30d': startTime.setDate(now.getDate() - 30); break;
        }
        
        query = query.gte('timestamp', startTime.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading system logs:', error);
        setLogs([]);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error loading system logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
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
    // Format: 01/01/2026, 8:05:11 am
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
    return <RefreshCw className="w-4 h-4" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">System Logs</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Unified view of system activities, messages, and errors
        </p>
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
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Levels</option>
            <option value="INFO">INFO</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
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
                [...Array(5)].map((_, i) => (
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
        
        {/* Pagination Footer (Simple) */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing recent {filteredLogs.length} logs
          </span>
          
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg px-2 py-1 outline-none"
          >
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
            <option value={200}>200 rows</option>
            <option value={500}>500 rows</option>
          </select>
        </div>
      </div>
    </div>
  );
}
