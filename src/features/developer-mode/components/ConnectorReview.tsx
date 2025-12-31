/**
 * Connector Review Panel Component
 * 
 * This component allows platform administrators to review and manage
 * connector submissions for the marketplace. Admins can:
 * 
 * - View all connector submissions with status filtering
 * - Test connector execution (dry run)
 * - View connector configuration
 * - Approve connectors for marketplace publication
 * - Reject connectors with reason
 * 
 * @file components/ConnectorReview.tsx
 * @component ConnectorReview
 * @module developer-mode/components
 * 
 * Data Flow:
 * 1. Component mounts → loadConnectors() called
 * 2. Fetches data from developerModeApi.getConnectors()
 * 3. Displays connectors in cards with pricing and status
 * 4. Admin can test, approve, or reject connectors
 * 5. List refreshes after actions
 */

import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Search, Play, FileText, DollarSign, Package } from 'lucide-react';
import { developerModeApi } from '../services/developerModeApi';
import type { ConnectorSubmission } from '../types/developerMode';

/**
 * Status filter type for connector marketplace status
 */
type StatusFilter = 'all' | 'pending_review' | 'approved' | 'rejected' | 'suspended';

/**
 * ConnectorReview Component
 * 
 * Main component for reviewing connector marketplace submissions.
 * 
 * @returns JSX.Element - The connector review interface
 */
export function ConnectorReview() {
  const [connectors, setConnectors] = useState<ConnectorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnector, setSelectedConnector] = useState<ConnectorSubmission | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [testingConnector, setTestingConnector] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loadingConnectorDetails, setLoadingConnectorDetails] = useState(false);

  useEffect(() => {
    loadConnectors();
  }, [statusFilter]);

  /**
   * Fetch full connector details including config, input_schema, and field_mappings
   * The list endpoint doesn't return these fields, so we need to fetch individually
   */
  const loadConnectorDetails = async (connectorId: string) => {
    setLoadingConnectorDetails(true);
    try {
      const fullConnector = await developerModeApi.getConnector(connectorId);
      setSelectedConnector(fullConnector);
      setModalMode('view');
    } catch (error) {
      console.error('Error loading connector details:', error);
      // Fallback to the list data if full fetch fails
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        setSelectedConnector(connector);
        setModalMode('view');
      }
    } finally {
      setLoadingConnectorDetails(false);
    }
  };

  const loadConnectors = async () => {
    setLoading(true);
    try {
      const { connectors: data } = await developerModeApi.getConnectors(
        statusFilter === 'all' ? undefined : statusFilter,
        undefined, // category
        undefined, // search - handled client-side
        1, // page
        100 // limit
      );
      setConnectors(data);
    } catch (error) {
      console.error('Error loading connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (connectorId: string) => {
    setActionLoading(connectorId);
    try {
      await developerModeApi.approveConnector(connectorId);
      await loadConnectors();
      setSelectedConnector(null);
    } catch (error) {
      console.error('Error approving connector:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (connectorId: string, reason: string) => {
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setActionLoading(connectorId);
    try {
      await developerModeApi.rejectConnector(connectorId, reason);
      await loadConnectors();
      setSelectedConnector(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting connector:', error);
    } finally {
      setActionLoading(null);
    }
  };

  // TODO: Implement connector testing when backend endpoint is available
  const handleTest = async (connectorId: string) => {
    setTestingConnector(connectorId);
    setTestResult(null);
    try {
      // Simulated test - will be replaced with actual API call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTestResult('Connector test completed successfully (simulated)');
    } catch (error) {
      setTestResult('Test failed: ' + (error as Error).message);
    } finally {
      setTestingConnector(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pending_review: (
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
      ),
      draft: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
          DRAFT
        </span>
      )
    };
    return badges[status as keyof typeof badges] || badges.pending_review;
  };

  const getPricingBadge = (pricingType: string, price: number) => {
    if (pricingType === 'free') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          FREE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <DollarSign className="w-3 h-3" />
        ${price.toFixed(2)}
        {pricingType === 'subscription' ? '/mo' : ''}
      </span>
    );
  };

  const filteredConnectors = connectors.filter(connector => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      connector.name.toLowerCase().includes(query) ||
      connector.description.toLowerCase().includes(query) ||
      connector.category.toLowerCase().includes(query) ||
      connector.developer_name.toLowerCase().includes(query)
    );
  });

  const statusCounts = {
    pending_review: connectors.filter(c => c.marketplace_status === 'pending_review').length,
    approved: connectors.filter(c => c.marketplace_status === 'approved').length,
    rejected: connectors.filter(c => c.marketplace_status === 'rejected').length,
    suspended: connectors.filter(c => c.marketplace_status === 'suspended').length
  };

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
            Connector Marketplace Review
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Review and approve connectors for marketplace publication
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search connectors..."
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
          All ({connectors.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending_review')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'pending_review'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Pending ({statusCounts.pending_review})
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

      {/* Connectors List */}
      <div className="space-y-4">
        {filteredConnectors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">
              No connectors found
            </p>
          </div>
        ) : (
          filteredConnectors.map((connector) => (
            <div
              key={connector.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{connector.icon}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {connector.name}
                    </h3>
                    {getPricingBadge(connector.pricing_type, connector.base_price)}
                    {getStatusBadge(connector.marketplace_status)}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">by:</span>
                      <span>{connector.developer_name}</span>
                      <span className="text-gray-500 dark:text-gray-500">(Developer)</span>
                    </div>

                    <div>
                      <span className="font-medium">Category:</span> {connector.category}
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 mt-2">
                      {connector.description}
                    </p>

                    {connector.install_count > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Package className="w-4 h-4" />
                        <span>{connector.install_count} installs</span>
                      </div>
                    )}

                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                      Submitted {formatDate(connector.created_at)}
                    </div>

                    {connector.rejection_reason && (
                      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-md border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          <span className="font-medium">Rejection Reason:</span> {connector.rejection_reason}
                        </p>
                      </div>
                    )}

                    {testResult && testingConnector === connector.id && (
                      <div className={`mt-2 p-3 rounded-md border ${
                        testResult.includes('success') 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}>
                        <p className={`text-sm ${
                          testResult.includes('success')
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-red-800 dark:text-red-200'
                        }`}>
                          <span className="font-medium">Test Result:</span> {testResult}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {connector.marketplace_status === 'pending_review' && (
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleTest(connector.id)}
                      disabled={testingConnector === connector.id}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      <Play className={`w-4 h-4 ${testingConnector === connector.id ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                    <button
                      onClick={() => loadConnectorDetails(connector.id)}
                      disabled={loadingConnectorDetails}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors disabled:opacity-50"
                    >
                      <FileText className={`w-4 h-4 ${loadingConnectorDetails ? 'animate-pulse' : ''}`} />
                      View Config
                    </button>
                    <button
                      onClick={() => handleApprove(connector.id)}
                      disabled={actionLoading === connector.id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedConnector(connector);
                        setModalMode('reject');
                      }}
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

      {/* View Config Modal */}
      {selectedConnector && modalMode === 'view' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedConnector.icon}</span>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    {selectedConnector.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    by {selectedConnector.developer_name} • {selectedConnector.category}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedConnector(null);
                  setModalMode(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Description</h4>
                <p className="text-gray-600 dark:text-gray-400">{selectedConnector.description}</p>
              </div>

              {/* Pricing Info */}
              <div className="flex gap-4">
                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Pricing Type</h4>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedConnector.pricing_type}</p>
                </div>
                <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Price</h4>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedConnector.pricing_type === 'free' ? 'Free' : `$${selectedConnector.base_price}`}
                  </p>
                </div>
              </div>

              {/* API Configuration */}
              {selectedConnector.config && Object.keys(selectedConnector.config).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">API Configuration</h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedConnector.config, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Input Schema */}
              {selectedConnector.input_schema && Object.keys(selectedConnector.input_schema).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Input Schema (Required Credentials)</h4>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-blue-400 font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedConnector.input_schema, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Field Mappings */}
              {selectedConnector.field_mappings && selectedConnector.field_mappings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Field Mappings</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-600">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Source Path</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">→</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Target Field</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedConnector.field_mappings.map((mapping, idx) => (
                          <tr key={idx} className="border-t border-gray-200 dark:border-gray-600">
                            <td className="px-4 py-2 font-mono text-gray-800 dark:text-gray-200">{mapping.source_path}</td>
                            <td className="px-4 py-2 text-gray-500">→</td>
                            <td className="px-4 py-2 font-mono text-gray-800 dark:text-gray-200">{mapping.target_field}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedConnector.tags && selectedConnector.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConnector.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setSelectedConnector(null);
                  setModalMode(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Close
              </button>
              {selectedConnector.marketplace_status === 'pending_review' && (
                <>
                  <button
                    onClick={() => handleApprove(selectedConnector.id)}
                    disabled={actionLoading === selectedConnector.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => setModalMode('reject')}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4 inline mr-2" />
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {selectedConnector && modalMode === 'reject' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Reject: {selectedConnector.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {selectedConnector.description}
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
                  setSelectedConnector(null);
                  setModalMode(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedConnector.id, rejectReason)}
                disabled={!rejectReason.trim() || actionLoading === selectedConnector.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors"
              >
                Reject Connector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

