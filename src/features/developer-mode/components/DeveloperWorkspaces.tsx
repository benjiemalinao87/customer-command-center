/**
 * Developer Workspaces Panel Component
 * 
 * This component allows platform administrators to view and manage
 * all developer workspaces. Admins can:
 * 
 * - View all approved developer workspaces
 * - Monitor usage statistics (SMS, contacts, API calls)
 * - View revenue per workspace
 * - View published connectors count
 * - Suspend workspaces if needed
 * - View detailed workspace information
 * 
 * @file components/DeveloperWorkspaces.tsx
 * @component DeveloperWorkspaces
 * @module developer-mode/components
 * 
 * Data Flow:
 * 1. Component mounts → loadWorkspaces() called
 * 2. Fetches data from developerModeApi.getWorkspaces()
 * 3. Displays workspaces in cards with usage stats
 * 4. Admin can view details or suspend workspace
 */

import { useState, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, DollarSign, Package, MessageSquare, Users, Activity } from 'lucide-react';
import { developerModeApi } from '../services/developerModeApi';
import type { DeveloperWorkspace } from '../types/developerMode';

/**
 * DeveloperWorkspaces Component
 * 
 * Displays a list of all developer workspaces with their usage statistics,
 * revenue data, and management actions.
 * 
 * @returns JSX.Element - The workspaces management interface
 */
export function DeveloperWorkspaces() {
  // State Management
  // ============================================================================
  
  /** List of all developer workspaces */
  const [workspaces, setWorkspaces] = useState<DeveloperWorkspace[]>([]);
  
  /** Loading state - true while fetching data */
  const [loading, setLoading] = useState(true);
  
  /** Search query for filtering workspaces */
  const [searchQuery, setSearchQuery] = useState('');
  
  /** Currently selected workspace (for details modal) */
  const [selectedWorkspace, setSelectedWorkspace] = useState<DeveloperWorkspace | null>(null);

  // Effects
  // ============================================================================
  
  /**
   * Load workspaces when component mounts
   * Fetches all developer workspaces from the API
   */
  useEffect(() => {
    loadWorkspaces();
  }, []);

  // Functions
  // ============================================================================
  
  /**
   * Load all developer workspaces from API
   *
   * Fetches the complete list of developer workspaces including
   * usage statistics and revenue data.
   */
  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const { workspaces: data } = await developerModeApi.getWorkspaces(
        undefined, // status
        undefined, // search - handled client-side
        1, // page
        100 // limit
      );
      setWorkspaces(data);
    } catch (error) {
      console.error('Error loading workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter workspaces by search query
   * 
   * Searches in workspace name, developer name, email, and workspace ID
   */
  const filteredWorkspaces = workspaces.filter(ws => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ws.workspace_name.toLowerCase().includes(query) ||
      ws.developer_name.toLowerCase().includes(query) ||
      ws.developer_email.toLowerCase().includes(query) ||
      ws.workspace_id.toLowerCase().includes(query)
    );
  });

  /**
   * Calculate aggregate statistics
   *
   * Computes summary stats for the stats bar at the top:
   * - Active workspaces count
   * - Suspended workspaces count
   * - Total revenue across all workspaces
   */
  const stats = {
    active: workspaces.filter(w => w.approval_status === 'approved').length,
    suspended: workspaces.filter(w => w.approval_status === 'suspended').length,
    totalRevenue: workspaces.reduce((sum, w) => sum + (w.total_revenue || 0), 0)
  };

  /**
   * Format number as currency
   * 
   * Converts numeric amount to USD currency format
   * 
   * @param amount - Numeric amount in USD
   * @returns Formatted currency string (e.g., "$1,200.00")
   */
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  /**
   * Format date to readable string
   * 
   * Converts ISO timestamp to formatted date string
   * 
   * @param dateString - ISO 8601 timestamp
   * @returns Formatted date string (e.g., "Jan 15, 2025")
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Get status badge component
   * 
   * Returns styled badge based on workspace approval status
   * 
   * @param status - Approval status string
   * @returns JSX.Element - Status badge component
   */
  const getStatusBadge = (status: string) => {
    if (status === 'approved' || status === 'active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="w-3 h-3" />
          ACTIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
        <XCircle className="w-3 h-3" />
        SUSPENDED
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Developer Workspaces
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage developer mode workspaces and monitor usage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Suspended</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.suspended}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Workspaces List */}
      <div className="space-y-4">
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No developer workspaces found
            </p>
          </div>
        ) : (
          filteredWorkspaces.map((workspace) => (
            <div
              key={workspace.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {workspace.workspace_name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{workspace.workspace_id}
                    </span>
                    {getStatusBadge(workspace.approval_status)}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Package className="w-4 h-4" />
                        <span>Connectors</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {workspace.published_connectors || 0}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span>Revenue</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(workspace.total_revenue || 0)}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>SMS Sent</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {(workspace.sms_sent || 0).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span>Contacts</span>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {(workspace.contacts_count || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Developer:</span>
                      <span>{workspace.developer_name}</span>
                      <span>({workspace.developer_email})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      <span>API Calls: {(workspace.api_calls_count || 0).toLocaleString()}</span>
                    </div>
                    <div>
                      <span>Since: {formatDate(workspace.created_at)}</span>
                    </div>
                  </div>

                  {workspace.stripe_onboarding_complete && (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-green-50 dark:bg-green-900/20 rounded-md">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm text-green-800 dark:text-green-200">
                        Stripe Connect Enabled
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => setSelectedWorkspace(workspace)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Usage Stats
                  </button>
                  {workspace.approval_status === 'approved' && (
                    <button
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Details Modal */}
      {selectedWorkspace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Workspace Details
              </h3>
              <button
                onClick={() => setSelectedWorkspace(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Workspace Info</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p><span className="font-medium">Name:</span> {selectedWorkspace.workspace_name}</p>
                  <p><span className="font-medium">ID:</span> {selectedWorkspace.workspace_id}</p>
                  <p><span className="font-medium">Developer:</span> {selectedWorkspace.developer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedWorkspace.developer_email}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Usage Statistics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">SMS Sent</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedWorkspace.sms_sent || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Emails Sent</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedWorkspace.emails_sent || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Contacts</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedWorkspace.contacts_count || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">API Calls</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedWorkspace.api_calls_count || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Revenue & Connectors</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Total Revenue Generated</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(selectedWorkspace.total_revenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Published Connectors</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedWorkspace.published_connectors || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

