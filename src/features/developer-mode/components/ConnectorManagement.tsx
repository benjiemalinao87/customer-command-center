/**
 * Connector Management Component
 * 
 * Admin interface for managing official connector templates.
 * Displays a list of all official connectors with actions to create,
 * edit, delete, and toggle visibility.
 * 
 * @file components/ConnectorManagement.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Star,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';
import { ConnectorBuilder } from './ConnectorBuilder';
import { developerModeApi } from '../services/developerModeApi';
import type { ConnectorTemplate } from '../types/developerMode';

type View = 'list' | 'create' | 'edit';

export function ConnectorManagement() {
  const [view, setView] = useState<View>('list');
  const [connectors, setConnectors] = useState<ConnectorTemplate[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorTemplate | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    loadConnectors();
  }, [selectedCategory]);

  const loadConnectors = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await developerModeApi.getOfficialConnectors(
        selectedCategory || undefined,
        undefined,
        1,
        100
      );
      setConnectors(result.connectors);
    } catch (err) {
      console.error('Error loading connectors:', err);
      setError(err instanceof Error ? err.message : 'Failed to load connectors');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedConnector(undefined);
    setView('create');
  };

  const handleEdit = (connector: ConnectorTemplate) => {
    setSelectedConnector(connector);
    setView('edit');
  };

  const handleSave = (connector: ConnectorTemplate) => {
    setView('list');
    loadConnectors();
  };

  const handleCancel = () => {
    setSelectedConnector(undefined);
    setView('list');
  };

  const handleDelete = async (connectorId: string) => {
    if (!confirm('Are you sure you want to delete this connector? This action cannot be undone.')) {
      return;
    }

    try {
      await developerModeApi.deleteOfficialConnector(connectorId);
      loadConnectors();
    } catch (err) {
      console.error('Error deleting connector:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete connector');
    }
  };

  const handleToggleVisibility = async (connector: ConnectorTemplate) => {
    try {
      await developerModeApi.toggleConnectorVisibility(connector.id, !connector.is_public);
      loadConnectors();
    } catch (err) {
      console.error('Error toggling visibility:', err);
      alert(err instanceof Error ? err.message : 'Failed to toggle visibility');
    }
  };

  // Filter connectors based on search query
  const filteredConnectors = connectors.filter((connector) => {
    const matchesSearch =
      searchQuery === '' ||
      connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Show builder view
  if (view === 'create' || view === 'edit') {
    return (
      <ConnectorBuilder
        connector={selectedConnector}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  // Show list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Official Connectors
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage platform-native connectors for the marketplace
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Connector
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search connectors..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
        >
          <option value="">All Categories</option>
          <option value="data-enrichment">Data Enrichment</option>
          <option value="communication">Communication</option>
          <option value="crm">CRM</option>
          <option value="marketing">Marketing</option>
          <option value="analytics">Analytics</option>
          <option value="payment">Payment</option>
          <option value="ai-ml">AI & ML</option>
          <option value="productivity">Productivity</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 dark:text-red-100">Error</p>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      ) : filteredConnectors.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No connectors found
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first official connector'}
          </p>
          {!searchQuery && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Connector
            </button>
          )}
        </div>
      ) : (
        /* Connectors Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConnectors.map((connector) => (
            <div
              key={connector.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{connector.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {connector.name}
                      </h3>
                      {connector.is_featured && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {connector.category.replace('-', ' ')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {connector.description}
              </p>

              {/* Tags */}
              {connector.tags && connector.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {connector.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-400 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {connector.tags.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                      +{connector.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span>{connector.install_count || 0} installs</span>
                <span>
                  {connector.pricing_type === 'free'
                    ? 'Free'
                    : `$${connector.base_price || 0}`}
                </span>
                <span className={connector.is_public ? 'text-green-600' : 'text-gray-500'}>
                  {connector.is_public ? 'Public' : 'Hidden'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEdit(connector)}
                  className="flex-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-sm font-medium flex items-center justify-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleVisibility(connector)}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  title={connector.is_public ? 'Hide from marketplace' : 'Show in marketplace'}
                >
                  {connector.is_public ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(connector.id)}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                  title="Delete connector"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
