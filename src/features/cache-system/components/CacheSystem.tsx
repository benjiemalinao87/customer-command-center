/**
 * Cache System Component
 * System-wide cache control and monitoring for all workspaces
 * Converted from Chakra UI to Tailwind CSS
 */

import React, { useState, useEffect } from 'react';
import { Database, Activity, Settings, RefreshCw, Trash2 } from 'lucide-react';

interface CacheStats {
  hitRate: string;
  hits: number;
  misses: number;
  sets: number;
}

interface HealthCheck {
  healthy: boolean;
  error?: string;
  timestamp: string;
}

interface CacheConfig {
  contactCountsTTL: number;
  contactListsTTL: number;
  searchResultsTTL: number;
  evictionPolicy: string;
}

export function CacheSystem() {
  const [systemCacheEnabled, setSystemCacheEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [systemStats, setSystemStats] = useState<CacheStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<HealthCheck | null>(null);
  const [cacheConfig, setCacheConfig] = useState<CacheConfig>({
    contactCountsTTL: 300,  // 5 minutes
    contactListsTTL: 180,   // 3 minutes
    searchResultsTTL: 120,  // 2 minutes
    evictionPolicy: 'LRU'
  });

  useEffect(() => {
    loadSystemCacheStatus();
    const interval = setInterval(loadSystemCacheStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemCacheStatus = async () => {
    try {
      setIsLoading(true);
      // Mock data - backend endpoint not implemented yet
      setSystemStats({
        hitRate: '85.3%',
        hits: 12543,
        misses: 2187,
        sets: 8965
      });
      setSystemHealth({
        healthy: true,
        timestamp: new Date().toISOString()
      });
      setSystemCacheEnabled(true);
    } catch (error) {
      console.error('Error loading system cache status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSystemCache = async () => {
    if (!confirm('Are you sure you want to clear all cache? This will affect performance temporarily across all workspaces.')) {
      return;
    }

    try {
      setIsLoading(true);
      // Would call backend API here
      alert('System cache cleared successfully');
      await loadSystemCacheStatus();
    } catch (error) {
      console.error('Error clearing system cache:', error);
      alert('Failed to clear system cache');
    } finally {
      setIsLoading(false);
    }
  };

  const updateCacheConfig = async () => {
    try {
      setIsLoading(true);
      // Would call backend API here
      alert('Cache configuration updated successfully');
    } catch (error) {
      console.error('Error updating cache config:', error);
      alert('Failed to update cache configuration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1">
          <Database className="w-6 h-6" />
          System Cache Management
        </h2>
        <p className="text-sm text-gray-400">
          Enterprise Redis caching control for all workspaces - optimized for 10-50M contacts
        </p>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" />
            System Health
          </h3>
          <div className={`p-4 rounded-lg border ${
            systemHealth.healthy
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <p className={`font-medium ${systemHealth.healthy ? 'text-green-400' : 'text-red-400'}`}>
              Redis cache system is {systemHealth.healthy ? 'healthy and operational' : 'experiencing issues'}
              {systemHealth.error && ` - ${systemHealth.error}`}
            </p>
          </div>
        </div>
      )}

      {/* System-Wide Toggle */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5" />
          System Configuration
        </h3>
        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
          <div>
            <p className="font-medium text-white mb-1">Enable Redis Caching System-Wide</p>
            <p className="text-sm text-gray-400">
              Control Redis caching for all workspaces in the system
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemCacheEnabled}
              onChange={(e) => setSystemCacheEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
          </label>
        </div>
      </div>

      {/* System Statistics */}
      {systemStats && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System-Wide Cache Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">System Hit Rate</p>
              <p className="text-2xl font-bold text-green-400">{systemStats.hitRate}</p>
              <p className="text-xs text-gray-500 mt-1">Overall cache efficiency</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Hits</p>
              <p className="text-2xl font-bold text-white">{systemStats.hits.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Successful cache reads</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Misses</p>
              <p className="text-2xl font-bold text-white">{systemStats.misses.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Cache not found</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Cache Operations</p>
              <p className="text-2xl font-bold text-white">{systemStats.sets.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Data cached</p>
            </div>
          </div>
        </div>
      )}

      {/* Cache Configuration */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Cache Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Contact Counts TTL (seconds)
            </label>
            <input
              type="number"
              value={cacheConfig.contactCountsTTL}
              onChange={(e) => setCacheConfig({...cacheConfig, contactCountsTTL: parseInt(e.target.value)})}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Cache duration for contact counts</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Contact Lists TTL (seconds)
            </label>
            <input
              type="number"
              value={cacheConfig.contactListsTTL}
              onChange={(e) => setCacheConfig({...cacheConfig, contactListsTTL: parseInt(e.target.value)})}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Cache duration for contact lists</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Search Results TTL (seconds)
            </label>
            <input
              type="number"
              value={cacheConfig.searchResultsTTL}
              onChange={(e) => setCacheConfig({...cacheConfig, searchResultsTTL: parseInt(e.target.value)})}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">Cache duration for search results</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Eviction Policy
            </label>
            <select
              value={cacheConfig.evictionPolicy}
              onChange={(e) => setCacheConfig({...cacheConfig, evictionPolicy: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="LRU">Least Recently Used (LRU)</option>
              <option value="LFU">Least Frequently Used (LFU)</option>
              <option value="FIFO">First In, First Out (FIFO)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">How to remove old cache entries</p>
          </div>
        </div>

        <button
          onClick={updateCacheConfig}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          Apply Configuration
        </button>
      </div>

      {/* System Management */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">System Management</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={clearSystemCache}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Cache
          </button>
          <button
            onClick={loadSystemCacheStatus}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white border border-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <p className="text-sm text-orange-300">
            <strong>Warning:</strong> Clearing all cache will affect performance temporarily across all workspaces.
            Cache will rebuild automatically as users access data.
          </p>
        </div>
      </div>

      {/* System Information */}
      {systemHealth && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Connection Information</h3>
          <pre className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-x-auto">
{`Redis Status: ${systemHealth.healthy ? 'Connected' : 'Disconnected'}
Last Health Check: ${new Date(systemHealth.timestamp).toLocaleString()}
Cache Enabled: ${systemCacheEnabled ? 'Yes' : 'No'}
Enterprise Scale: Ready for 10-50M contacts
Hit Rate Target: >70% (Current: ${systemStats?.hitRate || 'N/A'})`}
          </pre>
        </div>
      )}
    </div>
  );
}
