/**
 * API Config Step Component
 * 
 * Second step in the connector builder wizard.
 * Configures API endpoint details: URL, method, headers, authentication, and request body.
 * 
 * @file connector-builder/ApiConfigStep.tsx
 */

import React, { useState } from 'react';
import { Globe, Plus, X, Eye, EyeOff, Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { developerModeApi } from '../../services/developerModeApi';

interface ApiConfigStepProps {
  data: {
    config: {
      method?: string;
      url?: string;
      headers?: Array<{ key: string; value: string }>;
      auth?: {
        type: string;
        credentials?: Record<string, string>;
      };
      body?: string;
      params?: Array<{ key: string; value: string }>;
    };
    testResponse?: unknown;
    selectedField?: string;
  };
  onChange: (data: Partial<ApiConfigStepProps['data']>) => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const AUTH_TYPES = [
  { value: 'none', label: 'No Authentication' },
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];

// Interactive JSON Viewer Component
interface InteractiveJsonViewerProps {
  data: unknown;
  onFieldClick: (path: string) => void;
  path?: string;
  level?: number;
}

function InteractiveJsonViewer({ data, onFieldClick, path = '', level = 0 }: InteractiveJsonViewerProps) {
  const indent = '  '.repeat(level);

  if (data === null || data === undefined) {
    return <span className="text-gray-500">null</span>;
  }

  if (typeof data === 'string') {
    const currentPath = path;
    return (
      <button
        type="button"
        onClick={() => onFieldClick(currentPath)}
        className="text-green-400 hover:bg-green-900/30 px-1 rounded cursor-pointer transition-colors"
        title={`Click to map: ${currentPath}`}
      >
        "{data}"
      </button>
    );
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    const currentPath = path;
    return (
      <button
        type="button"
        onClick={() => onFieldClick(currentPath)}
        className="text-yellow-400 hover:bg-yellow-900/30 px-1 rounded cursor-pointer transition-colors"
        title={`Click to map: ${currentPath}`}
      >
        {String(data)}
      </button>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-500">[]</span>;
    }

    return (
      <span>
        <span className="text-gray-500">[</span>
        <div className="ml-4">
          {data.slice(0, 3).map((item, index) => (
            <div key={index}>
              <InteractiveJsonViewer
                data={item}
                onFieldClick={onFieldClick}
                path={`${path}[${index}]`}
                level={level + 1}
              />
              {index < Math.min(data.length, 3) - 1 && <span className="text-gray-500">,</span>}
            </div>
          ))}
          {data.length > 3 && (
            <div className="text-gray-500 italic">... {data.length - 3} more items</div>
          )}
        </div>
        <span className="text-gray-500">]</span>
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    
    if (entries.length === 0) {
      return <span className="text-gray-500">{'{}'}</span>;
    }

    return (
      <span>
        <span className="text-gray-500">{'{'}</span>
        <div className="ml-4">
          {entries.map(([key, value], index) => {
            const fieldPath = path ? `${path}.${key}` : key;
            return (
              <div key={key} className="my-0.5">
                <span className="text-blue-400">"{key}"</span>
                <span className="text-gray-500">: </span>
                <InteractiveJsonViewer
                  data={value}
                  onFieldClick={onFieldClick}
                  path={fieldPath}
                  level={level + 1}
                />
                {index < entries.length - 1 && <span className="text-gray-500">,</span>}
              </div>
            );
          })}
        </div>
        <span className="text-gray-500">{'}'}</span>
      </span>
    );
  }

  return <span className="text-gray-500">{String(data)}</span>;
}

export function ApiConfigStep({ data, onChange }: ApiConfigStepProps) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);
  const [clickedField, setClickedField] = useState<string | null>(null);
  const config = data.config || {};

  const updateConfig = (updates: Partial<typeof config>) => {
    onChange({
      config: {
        ...config,
        ...updates,
      },
    });
  };

  const handleTestApi = async () => {
    if (!config.url) {
      setTestError('Please enter an API URL first');
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestSuccess(false);

    try {
      const result = await developerModeApi.testConnector(config);
      
      if (result.success) {
        // Store the test response for field mapping
        onChange({
          config,
          testResponse: result.response,
        });
        setTestSuccess(true);
      } else {
        setTestError(result.error || 'API test failed');
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to test API');
    } finally {
      setIsTesting(false);
    }
  };

  const addHeader = () => {
    const headers = config.headers || [];
    updateConfig({
      headers: [...headers, { key: '', value: '' }],
    });
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const headers = [...(config.headers || [])];
    headers[index] = { ...headers[index], [field]: value };
    updateConfig({ headers });
  };

  const removeHeader = (index: number) => {
    const headers = [...(config.headers || [])];
    headers.splice(index, 1);
    updateConfig({ headers });
  };

  const addParam = () => {
    const params = config.params || [];
    updateConfig({
      params: [...params, { key: '', value: '' }],
    });
  };

  const updateParam = (index: number, field: 'key' | 'value', value: string) => {
    const params = [...(config.params || [])];
    params[index] = { ...params[index], [field]: value };
    updateConfig({ params });
  };

  const removeParam = (index: number) => {
    const params = [...(config.params || [])];
    params.splice(index, 1);
    updateConfig({ params });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            API Configuration
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            Configure the API endpoint that this connector will call.
          </p>
        </div>
      </div>

      {/* Method & URL */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          API Endpoint <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <select
            value={config.method || 'GET'}
            onChange={(e) => updateConfig({ method: e.target.value })}
            className="w-32 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
          >
            {HTTP_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <input
            type="url"
            value={config.url || ''}
            onChange={(e) => updateConfig({ url: e.target.value })}
            placeholder="https://api.example.com/v1/endpoint"
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
            required
          />
        </div>
      </div>

      {/* URL Parameters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            URL Parameters
          </label>
          <button
            type="button"
            onClick={addParam}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Parameter
          </button>
        </div>
        {config.params && config.params.length > 0 ? (
          <div className="space-y-2">
            {config.params.map((param, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={param.key}
                  onChange={(e) => updateParam(index, 'key', e.target.value)}
                  placeholder="Parameter name"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) => updateParam(index, 'value', e.target.value)}
                  placeholder="{{variable}} or static value"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => removeParam(index)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No parameters added yet
          </p>
        )}
      </div>

      {/* Authentication */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Authentication
        </label>
        <select
          value={config.auth?.type || 'none'}
          onChange={(e) => updateConfig({ auth: { type: e.target.value, credentials: {} } })}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
        >
          {AUTH_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        {config.auth?.type && config.auth.type !== 'none' && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Authentication credentials will be collected from users during installation
              </p>
              <button
                type="button"
                onClick={() => setShowSecrets(!showSecrets)}
                className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Headers */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom Headers
          </label>
          <button
            type="button"
            onClick={addHeader}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Header
          </button>
        </div>
        {config.headers && config.headers.length > 0 ? (
          <div className="space-y-2">
            {config.headers.map((header, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={header.key}
                  onChange={(e) => updateHeader(index, 'key', e.target.value)}
                  placeholder="Header name"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                />
                <input
                  type="text"
                  value={header.value}
                  onChange={(e) => updateHeader(index, 'value', e.target.value)}
                  placeholder="Header value"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => removeHeader(index)}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">
            No custom headers added yet
          </p>
        )}
      </div>

      {/* Request Body (for POST, PUT, PATCH) */}
      {config.method && ['POST', 'PUT', 'PATCH'].includes(config.method) && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Request Body (JSON)
          </label>
          <textarea
            value={config.body || ''}
            onChange={(e) => updateConfig({ body: e.target.value })}
            placeholder='{\n  "field": "{{variable}}",\n  "static": "value"\n}'
            rows={6}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 font-mono text-sm resize-none"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Use {"{{variable}}"} syntax for dynamic values
          </p>
        </div>
      )}

      {/* Test API Section */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Test API Connection
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Test the endpoint to preview the response for field mapping
            </p>
          </div>
          <button
            type="button"
            onClick={handleTestApi}
            disabled={isTesting || !config.url}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Test API
              </>
            )}
          </button>
        </div>

        {/* Test Error */}
        {testError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Test Failed</p>
              <p className="text-sm text-red-700 dark:text-red-300">{testError}</p>
            </div>
          </div>
        )}

        {/* Test Success */}
        {testSuccess && data.testResponse && (
          <div className="space-y-3">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900 dark:text-green-100">API Test Successful!</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Response received. You can now map fields in the next step.
                </p>
              </div>
            </div>

            {/* Response Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Response Preview
              </label>
              <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
                <InteractiveJsonViewer 
                  data={data.testResponse} 
                  onFieldClick={(path) => {
                    // Store the selected field for the next step
                    setClickedField(path);
                    onChange({
                      config,
                      testResponse: data.testResponse,
                      selectedField: path,
                    });
                  }}
                />
              </div>
              {clickedField && (
                <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      Selected: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded font-mono">{clickedField}</code>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setClickedField(null)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                💡 Click on any value to select it for field mapping in the next step
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
