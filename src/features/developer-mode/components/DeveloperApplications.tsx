/**
 * Developer Applications Panel Component
 * 
 * This component allows platform administrators to review and manage
 * developer mode applications. Admins can:
 * 
 * - View all applications with status filtering
 * - Search applications by workspace name or developer email
 * - Approve applications (enables Developer Mode for workspace)
 * - Reject applications with reason
 * - View application details
 * 
 * @file components/DeveloperApplications.tsx
 * @component DeveloperApplications
 * @module developer-mode/components
 * 
 * Data Flow:
 * 1. Component mounts → loadApplications() called
 * 2. Fetches data from developerModeApi.getApplications()
 * 3. Displays applications in cards with status badges
 * 4. Admin actions (approve/reject) update backend via API
 * 5. List refreshes to show updated status
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Search, ExternalLink, Mail, Globe, FileText } from 'lucide-react';
import { developerModeApi } from '../services/developerModeApi';
import type { DeveloperApplication } from '../types/developerMode';

/**
 * Status filter type
 * Used to filter applications by their approval status
 */
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended';

/**
 * DeveloperApplications Component
 * 
 * Main component for managing developer mode applications.
 * 
 * @returns JSX.Element - The applications review interface
 */
export function DeveloperApplications() {
  // State Management
  // ============================================================================
  
  /** List of all applications (filtered by current status filter) */
  const [applications, setApplications] = useState<DeveloperApplication[]>([]);
  
  /** Loading state - true while fetching data from API */
  const [loading, setLoading] = useState(true);
  
  /** Current status filter - determines which applications to show */
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  /** Search query for filtering applications by name/email */
  const [searchQuery, setSearchQuery] = useState('');
  
  /** Currently selected application (for reject modal) */
  const [selectedApp, setSelectedApp] = useState<DeveloperApplication | null>(null);
  
  /** Workspace ID of application currently being processed (approve/reject) */
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  /** Rejection reason input for reject modal */
  const [rejectReason, setRejectReason] = useState('');

  // Effects
  // ============================================================================
  
  /**
   * Load applications when component mounts or status filter changes
   * Automatically refetches data when filter changes
   */
  useEffect(() => {
    loadApplications();
  }, [statusFilter]);

  // Functions
  // ============================================================================
  
  /**
   * Load applications from API
   *
   * Fetches applications based on current status filter.
   * Called on mount and when status filter changes.
   */
  const loadApplications = async () => {
    setLoading(true);
    try {
      // Fetch applications with optional status filter
      // If statusFilter is 'all', pass undefined to get all applications
      const { applications: data } = await developerModeApi.getApplications(
        statusFilter === 'all' ? undefined : statusFilter,
        undefined, // search - handled client-side for now
        1, // page
        100 // limit - get enough to work with
      );
      setApplications(data);
    } catch (error) {
      console.error('Error loading applications:', error);
      // TODO: Show error toast notification to user
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle application approval
   *
   * Approves a developer mode application, which will:
   * - Enable Developer Mode for the workspace
   * - Create $1/month subscription
   * - Assign shared Twilio config
   * - Send approval email to developer
   *
   * @param applicationId - The application ID to approve
   */
  const handleApprove = async (applicationId: string) => {
    setActionLoading(applicationId);
    try {
      await developerModeApi.approveApplication(applicationId);
      // Reload applications to show updated status
      await loadApplications();
      setSelectedApp(null);
      // TODO: Show success toast notification
    } catch (error) {
      console.error('Error approving application:', error);
      // TODO: Show error toast notification
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Handle application rejection
   *
   * Rejects a developer mode application with a provided reason.
   * The reason will be shown to the developer.
   *
   * @param applicationId - The application ID to reject
   * @param reason - Required reason for rejection
   */
  const handleReject = async (applicationId: string, reason: string) => {
    // Validate that reason is provided
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setActionLoading(applicationId);
    try {
      await developerModeApi.rejectApplication(applicationId, reason);
      // Reload applications to show updated status
      await loadApplications();
      setSelectedApp(null);
      setRejectReason('');
      // TODO: Show success toast notification
    } catch (error) {
      console.error('Error rejecting application:', error);
      // TODO: Show error toast notification
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Get status badge component
   *
   * Returns a styled badge component based on application status.
   * Used for visual status indication in the UI.
   *
   * @param status - The approval status string
   * @returns JSX.Element - Status badge component
   */
  const getStatusBadge = (status: string) => {
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3" />
          PENDING
        </span>
      ),
      approved: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      ),
      suspended: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          <XCircle className="w-3 h-3" />
          SUSPENDED
        </span>
      )
    };
    return badges[status as keyof typeof badges] || badges.pending;
  };

  /**
   * Filter applications by search query
   * 
   * Filters the applications list based on search query.
   * Searches in workspace name, developer name, and developer email.
   * 
   * @returns Filtered array of applications
   */
  const filteredApplications = applications.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      app.workspace_name.toLowerCase().includes(query) ||
      app.developer_name.toLowerCase().includes(query) ||
      app.developer_email.toLowerCase().includes(query)
    );
  });

  /**
   * Calculate status counts for tab badges
   * 
   * Counts applications in each status category to display
   * in the tab navigation (e.g., "Pending (5)")
   */
  const statusCounts = {
    pending: applications.filter(a => a.approval_status === 'pending').length,
    approved: applications.filter(a => a.approval_status === 'approved').length,
    rejected: applications.filter(a => a.approval_status === 'rejected').length,
    suspended: applications.filter(a => a.approval_status === 'suspended').length
  };

  /**
   * Format date to relative time string
   * 
   * Converts ISO timestamp to human-readable relative time
   * (e.g., "2 days ago", "Today")
   * 
   * @param dateString - ISO 8601 timestamp string
   * @returns Human-readable relative time string
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
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
            Developer Mode Applications
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve developer mode access requests
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

      {/* Status Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          All ({applications.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'pending'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'approved'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Approved ({statusCounts.approved})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'rejected'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Rejected ({statusCounts.rejected})
        </button>
      </div>

      {/* Applications List */}
      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No applications found
            </p>
          </div>
        ) : (
          filteredApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {app.workspace_name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      #{app.workspace_id}
                    </span>
                    {getStatusBadge(app.approval_status)}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span className="font-medium">{app.developer_name}</span>
                      <span>({app.developer_email})</span>
                    </div>

                    {app.developer_website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <a
                          href={app.developer_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {app.developer_website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    <div className="flex items-start gap-2 mt-3">
                      <FileText className="w-4 h-4 mt-0.5" />
                      <div>
                        <span className="font-medium">Intended Use:</span>
                        <p className="mt-1 text-gray-700 dark:text-gray-300">
                          {app.intended_use}
                        </p>
                      </div>
                    </div>

                    {app.developer_bio && (
                      <p className="mt-2 text-gray-700 dark:text-gray-300">
                        {app.developer_bio}
                      </p>
                    )}

                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Applied {formatDate(app.created_at)}
                    </div>

                    {app.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <span className="font-medium">Rejection Reason:</span> {app.rejection_reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {app.approval_status === 'pending' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={actionLoading === app.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Reject Application
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Rejecting application for <strong>{selectedApp.workspace_name}</strong>
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4"
              rows={4}
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => {
                  setSelectedApp(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedApp.id, rejectReason)}
                disabled={!rejectReason.trim() || actionLoading === selectedApp.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}