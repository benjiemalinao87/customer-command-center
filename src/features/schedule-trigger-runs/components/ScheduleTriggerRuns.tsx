/**
 * Schedule Trigger Runs Component
 * SaaS-wide view of scheduled trigger executions across all workspaces
 */

import React, { useState, useEffect } from 'react';
import {
  Search, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Calendar, Clock, Users, Play, CheckCircle, XCircle, AlertCircle, Loader
} from 'lucide-react';
import { getAllScheduleRuns, getWorkspacesWithSchedules } from '../services/triggerApi';
import type { ScheduleTriggerRun, RunStats } from '../types/trigger';

export function ScheduleTriggerRuns() {
  const [runs, setRuns] = useState<ScheduleTriggerRun[]>([]);
  const [stats, setStats] = useState<RunStats>({
    total: 0,
    completed: 0,
    failed: 0,
    running: 0,
    totalContacts: 0,
    totalWorkflows: 0
  });
  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterWorkspace, setFilterWorkspace] = useState<string>('');
  const [filterFrequency, setFilterFrequency] = useState<string>('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateRange, setDateRange] = useState('7days');
  const pageSize = 20;

  useEffect(() => {
    loadWorkspaces();
  }, []);

  useEffect(() => {
    loadRuns();
  }, [filterStatus, filterWorkspace, filterFrequency, dateRange, currentPage]);

  const loadWorkspaces = async () => {
    const data = await getWorkspacesWithSchedules();
    setWorkspaces(data);
  };

  const loadRuns = async () => {
    try {
      setLoading(true);
      const offset = (currentPage - 1) * pageSize;

      const { runs: data, total } = await getAllScheduleRuns(pageSize, offset, {
        status: filterStatus || undefined,
        workspaceId: filterWorkspace || undefined,
        frequencyType: filterFrequency || undefined
      });

      setRuns(data);
      setTotalCount(total);

      // Calculate stats from loaded data
      const completed = data.filter(r => r.status === 'completed').length;
      const failed = data.filter(r => r.status === 'failed').length;
      const running = data.filter(r => r.status === 'running').length;
      const totalContacts = data.reduce((sum, r) => sum + (r.contactsProcessed || 0), 0);
      const totalWorkflows = data.reduce((sum, r) => sum + (r.workflowsTriggered || 0), 0);

      setStats({
        total: data.length,
        completed,
        failed,
        running,
        totalContacts,
        totalWorkflows
      });
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRuns();
    setRefreshing(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedRunId(expandedRunId === id ? null : id);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'failed':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'running':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  const getFrequencyLabel = (type: string) => {
    const labels: Record<string, string> = {
      hourly: 'Every Hour',
      daily: 'Every Day',
      weekly: 'Every Week',
      monthly: 'Every Month'
    };
    return labels[type] || type;
  };

  const getTargetModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      no_contacts: 'No Contacts',
      all_contacts: 'All Contacts',
      filtered_contacts: 'Filtered'
    };
    return labels[mode] || mode;
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  // Filter runs by search term
  const filteredRuns = runs.filter(run => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      run.triggerName?.toLowerCase().includes(search) ||
      run.flowName?.toLowerCase().includes(search) ||
      run.workspaceName?.toLowerCase().includes(search) ||
      run.id?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-6 h-6 text-purple-500" />
          <h1 className="text-2xl font-bold text-white">Schedule Trigger Runs</h1>
        </div>
        <p className="text-gray-400">
          Monitor scheduled trigger executions across all workspaces
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Runs</div>
          <div className="text-2xl font-bold text-white">{totalCount}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Completed</div>
          <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Failed</div>
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Running</div>
          <div className="text-2xl font-bold text-blue-400">{stats.running}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
            <Users className="w-3 h-3" />
            Contacts
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalContacts}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-1 text-gray-400 text-sm mb-1">
            <Play className="w-3 h-3" />
            Workflows
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalWorkflows}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search triggers, flows, workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-64"
          />
        </div>

        <select
          value={dateRange}
          onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Status</option>
          <option value="completed">Completed</option>
          <option value="running">Running</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={filterFrequency}
          onChange={(e) => { setFilterFrequency(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Frequencies</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>

        <select
          value={filterWorkspace}
          onChange={(e) => { setFilterWorkspace(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="">All Workspaces</option>
          {workspaces.map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:border-purple-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Trigger / Flow</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Workspace</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Scheduled For</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Frequency</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Target</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Contacts</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Workflows</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader className="w-8 h-8 text-purple-500 animate-spin" />
                    <span className="text-gray-400">Loading runs...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRuns.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Calendar className="w-12 h-12 text-gray-600" />
                    <span className="text-gray-400 font-medium">No schedule runs found</span>
                    <span className="text-gray-500 text-sm">
                      Schedule runs will appear here when scheduled triggers execute
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRuns.map(run => (
                <React.Fragment key={run.id}>
                  <tr
                    className="hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => toggleExpand(run.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{run.triggerName}</div>
                      <div className="text-sm text-gray-400">{run.flowName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300">{run.workspaceName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-300">
                        <Clock className="w-3 h-3" />
                        <span className="text-sm">{formatDateTime(run.scheduledFor)}</span>
                      </div>
                      {run.timezone && (
                        <div className="text-xs text-gray-500">{run.timezone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusBadgeClass(run.status)}`}>
                        {getStatusIcon(run.status)}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full text-xs">
                        {getFrequencyLabel(run.frequencyType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-300 text-sm">{getTargetModeLabel(run.targetMode)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-white">{run.contactsProcessed}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-white">{run.workflowsTriggered}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {expandedRunId === run.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400 mx-auto" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400 mx-auto" />
                      )}
                    </td>
                  </tr>
                  {expandedRunId === run.id && (
                    <tr className="bg-gray-900/50">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Run ID:</span>
                            <div className="text-gray-300 font-mono text-xs">{run.id}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Started At:</span>
                            <div className="text-gray-300">{formatDateTime(run.startedAt)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Completed At:</span>
                            <div className="text-gray-300">{formatDateTime(run.completedAt)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Workspace ID:</span>
                            <div className="text-gray-300 font-mono text-xs">{run.workspaceId}</div>
                          </div>
                          {run.workflowInstanceIds && run.workflowInstanceIds.length > 0 && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-gray-500">Workflow Instance IDs:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {run.workflowInstanceIds.map((id, idx) => (
                                  <span key={idx} className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded text-xs font-mono">
                                    {id}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {run.errorMessage && (
                            <div className="col-span-2 md:col-span-4">
                              <span className="text-red-400">Error:</span>
                              <div className="mt-1 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-300 text-xs">
                                {run.errorMessage}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-900 border-t border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} runs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="text-gray-400 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
