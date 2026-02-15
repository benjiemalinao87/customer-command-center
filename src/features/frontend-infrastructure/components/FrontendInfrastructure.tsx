import { useState, useEffect, useCallback } from 'react';
import { Server, Globe, HardDrive, RefreshCw, CheckCircle, XCircle, AlertTriangle, ExternalLink, Clock, Wifi } from 'lucide-react';

interface HealthData {
  status: 'operational' | 'degraded';
  origins: {
    railway: 'healthy' | 'unhealthy';
    pages: 'healthy' | 'unhealthy' | 'not_configured';
    r2: 'available' | 'empty' | 'not_configured';
  };
  timestamp: string;
}

interface DomainCheck {
  domain: string;
  servedFrom: string | null;
  statusCode: number | null;
  responseTime: number | null;
  error: string | null;
  gateway: boolean;
  note?: string;
}

const HEALTH_URL = 'https://cc1.automate8.com/_gateway/health';
const DOMAINS = [
  { url: 'https://cc1.automate8.com', gateway: true },
  { url: 'https://dash.customerconnects.app', gateway: true },
  { url: 'https://app2.channelautomation.com', gateway: false, note: 'Direct Railway origin (no gateway)' },
];

export function FrontendInfrastructure() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [domainChecks, setDomainChecks] = useState<DomainCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(HEALTH_URL);
      const data: HealthData = await res.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
    }
    if (isManual) setRefreshing(false);
    setLoading(false);
  }, []);

  const checkDomains = useCallback(async () => {
    const checks: DomainCheck[] = await Promise.all(
      DOMAINS.map(async (d) => {
        // Non-gateway domains (direct Railway origin) can't be fetched cross-origin
        if (!d.gateway) {
          return {
            domain: d.url,
            servedFrom: null,
            statusCode: null,
            responseTime: null,
            error: null,
            gateway: false,
            note: d.note,
          };
        }
        const start = performance.now();
        try {
          const res = await fetch(d.url, { method: 'HEAD', mode: 'cors' });
          const elapsed = Math.round(performance.now() - start);
          return {
            domain: d.url,
            servedFrom: res.headers.get('x-served-from'),
            statusCode: res.status,
            responseTime: elapsed,
            error: null,
            gateway: true,
          };
        } catch (err: any) {
          return {
            domain: d.url,
            servedFrom: null,
            statusCode: null,
            responseTime: null,
            error: err.message || 'Failed to reach',
            gateway: true,
          };
        }
      })
    );
    setDomainChecks(checks);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([fetchHealth(true), checkDomains()]);
  }, [fetchHealth, checkDomains]);

  useEffect(() => {
    fetchHealth();
    checkDomains();
  }, [fetchHealth, checkDomains]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealth();
      checkDomains();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth, checkDomains]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'available':
      case 'operational':
        return 'text-green-500';
      case 'unhealthy':
      case 'degraded':
        return 'text-red-500';
      case 'empty':
        return 'text-yellow-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'available':
      case 'operational':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'unhealthy':
      case 'degraded':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'empty':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'available':
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'unhealthy':
      case 'degraded':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'empty':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getServedFromBadge = (source: string | null) => {
    if (!source) return null;
    const colors: Record<string, string> = {
      railway: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      'pages-fallback': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      'r2-fallback': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      'gateway-maintenance': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[source] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
        {source}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  const overallStatus = health?.status || 'unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Frontend Infrastructure</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            3-tier failover: Railway &rarr; Cloudflare Pages &rarr; R2 Emergency Cache
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status Banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${getStatusBg(overallStatus)}`}>
        <div className="flex items-center gap-3">
          {getStatusIcon(overallStatus)}
          <div>
            <p className={`text-lg font-semibold ${getStatusColor(overallStatus)}`}>
              {overallStatus === 'operational' ? 'All Systems Operational' : overallStatus === 'degraded' ? 'Degraded Performance' : 'Status Unknown'}
            </p>
            {lastChecked && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <a
          href="https://cc1.automate8.com/_gateway/health"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
        >
          Raw JSON <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Origin Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Railway */}
        <div className={`rounded-xl border p-5 ${getStatusBg(health?.origins.railway || 'unknown')}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Railway</h3>
            </div>
            {getStatusIcon(health?.origins.railway || 'unknown')}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Primary Origin</p>
          <p className={`text-sm font-medium ${getStatusColor(health?.origins.railway || 'unknown')}`}>
            {health?.origins.railway || 'Unknown'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-500">Timeout: 3s</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Replicas: 2</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Restart: ALWAYS</p>
          </div>
        </div>

        {/* Cloudflare Pages */}
        <div className={`rounded-xl border p-5 ${getStatusBg(health?.origins.pages || 'unknown')}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Cloudflare Pages</h3>
            </div>
            {getStatusIcon(health?.origins.pages || 'unknown')}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Auto-Fallback</p>
          <p className={`text-sm font-medium ${getStatusColor(health?.origins.pages || 'unknown')}`}>
            {health?.origins.pages || 'Unknown'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-500">Timeout: 2s</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Deploy: GitHub Action</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Sync: Every push</p>
          </div>
        </div>

        {/* R2 Emergency */}
        <div className={`rounded-xl border p-5 ${getStatusBg(health?.origins.r2 || 'unknown')}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-yellow-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">R2 Emergency</h3>
            </div>
            {getStatusIcon(health?.origins.r2 || 'unknown')}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Resort Cache</p>
          <p className={`text-sm font-medium ${getStatusColor(health?.origins.r2 || 'unknown')}`}>
            {health?.origins.r2 || 'Unknown'}
          </p>
          <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-500">Durability: 11 nines</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Update: Manual upload</p>
            <p className="text-xs text-gray-500 dark:text-gray-500">Bucket: frontend-builds</p>
          </div>
        </div>
      </div>

      {/* Domain Status Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Domain Health
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Domain</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Served From</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Response Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {domainChecks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    Checking domains...
                  </td>
                </tr>
              ) : (
                domainChecks.map((check) => (
                  <tr key={check.domain} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-5 py-3">
                      <a
                        href={check.domain}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {new URL(check.domain).hostname}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {check.note && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{check.note}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {!check.gateway ? (
                        <span className={`inline-flex items-center gap-1 text-sm ${health?.origins.railway === 'healthy' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {health?.origins.railway === 'healthy' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          {health?.origins.railway === 'healthy' ? 'Healthy' : 'Unhealthy'}
                        </span>
                      ) : check.error ? (
                        <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                          <XCircle className="w-4 h-4" /> Error
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" /> {check.statusCode}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {!check.gateway ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200">
                          direct origin
                        </span>
                      ) : check.error ? (
                        <span className="text-sm text-gray-400">{check.error}</span>
                      ) : (
                        getServedFromBadge(check.servedFrom)
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {check.responseTime !== null ? (
                        <span className={`text-sm font-mono ${check.responseTime < 500 ? 'text-green-600 dark:text-green-400' : check.responseTime < 1500 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                          {check.responseTime}ms
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Failover Architecture</h3>
        <div className="flex flex-col items-center gap-2">
          {/* User */}
          <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
            User Browser
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

          {/* Gateway */}
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Cloudflare DNS (proxied)
          </div>
          <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

          <div className="w-full max-w-lg border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-900/10">
            <p className="text-center text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3">
              frontend-gateway (Cloudflare Worker)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${health?.origins.railway === 'healthy'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}>
                  1. Railway
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">3s timeout</p>
              </div>
              <div className="text-center">
                <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${health?.origins.pages === 'healthy'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}>
                  2. CF Pages
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">2s timeout</p>
              </div>
              <div className="text-center">
                <div className={`px-3 py-2 rounded-lg border text-xs font-medium ${health?.origins.r2 === 'available'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                  }`}>
                  3. R2 Cache
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">last resort</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
