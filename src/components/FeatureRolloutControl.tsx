import { useEffect, useMemo, useState } from 'react';
import { Rocket, Save, Users } from 'lucide-react';
import { adminApi } from '../lib/adminApi';

interface Workspace {
  id: string;
  name: string;
}

interface FeatureCatalogItem {
  id: string;
  badge?: string;
  title: string;
  description?: string;
  ctaLabel?: string;
}

interface NewFeatureDraft {
  id: string;
  title: string;
  badge: string;
  description: string;
  ctaLabel: string;
}

interface FeatureRolloutConfig {
  enabled: boolean;
  featureId: string | null;
  featureSnapshot?: FeatureCatalogItem | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

interface FeatureSignupSummary {
  totalSignups: number;
  byFeature: Array<{
    featureId: string;
    title: string;
    count: number;
  }>;
  recentSignups: Array<{
    id: string;
    workspace_id?: string;
    feature_id: string;
    feature_name: string;
    email: string;
    source: string;
    created_at: string;
  }>;
  scope?: {
    allWorkspaces?: boolean;
    workspaceIds?: string[];
  };
}

const EMPTY_ROLLOUT: FeatureRolloutConfig = {
  enabled: false,
  featureId: null,
  featureSnapshot: null,
};

const EMPTY_NEW_FEATURE: NewFeatureDraft = {
  id: '',
  title: '',
  badge: 'COMING SOON',
  description: '',
  ctaLabel: 'Early access',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

const formatEmailPreview = (email: string) => {
  const [localPart, domain] = String(email || '').split('@');
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) return `${localPart[0] || '*'}*@${domain}`;
  return `${localPart.slice(0, 2)}***@${domain}`;
};

export function FeatureRolloutControl() {
  const [loading, setLoading] = useState(true);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [catalog, setCatalog] = useState<FeatureCatalogItem[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [rolloutConfig, setRolloutConfig] = useState<FeatureRolloutConfig>(EMPTY_ROLLOUT);
  const [draftEnabled, setDraftEnabled] = useState(false);
  const [draftFeatureId, setDraftFeatureId] = useState('');
  const [creatingFeature, setCreatingFeature] = useState(false);
  const [newFeature, setNewFeature] = useState<NewFeatureDraft>(EMPTY_NEW_FEATURE);
  const [signupSummary, setSignupSummary] = useState<FeatureSignupSummary | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [workspaces, selectedWorkspaceId]
  );

  const filteredWorkspaces = useMemo(() => {
    const query = workspaceSearch.trim().toLowerCase();
    if (!query) return workspaces;

    return workspaces.filter((workspace) => (
      workspace.name.toLowerCase().includes(query)
      || workspace.id.toLowerCase().includes(query)
    ));
  }, [workspaces, workspaceSearch]);

  const activeFeature = useMemo(() => {
    const id = rolloutConfig.featureId;
    if (!id) return null;
    const fromCatalog = catalog.find((feature) => feature.id === id);
    return fromCatalog || rolloutConfig.featureSnapshot || null;
  }, [catalog, rolloutConfig]);

  const signupScopeMessage = useMemo(() => {
    if (selectedWorkspaceIds.length === 1) return 'Showing signups for selected workspace only.';
    if (selectedWorkspaceIds.length > 1) {
      return `Showing signups across ${selectedWorkspaceIds.length} selected bulk target workspace${selectedWorkspaceIds.length === 1 ? '' : 's'}.`;
    }
    return 'Showing signups across all workspaces.';
  }, [selectedWorkspaceIds]);

  useEffect(() => {
    let isMounted = true;

    const loadBaseData = async () => {
      try {
        setLoading(true);
        setStatusMessage(null);

        const [workspacesResponse, catalogResponse] = await Promise.all([
          adminApi.getWorkspaces(),
          adminApi.getFeatureRolloutCatalog(),
        ]);

        if (!isMounted) return;

        const workspaceRows = (workspacesResponse?.data || [])
          .map((workspace: any) => ({ id: String(workspace.id), name: String(workspace.name || workspace.id) }))
          .filter((workspace: Workspace) => workspace.id && workspace.name);

        const catalogRows = (catalogResponse?.data || [])
          .map((feature: any) => ({
            id: String(feature.id),
            badge: feature.badge ? String(feature.badge) : undefined,
            title: String(feature.title || feature.id),
            description: feature.description ? String(feature.description) : undefined,
            ctaLabel: feature.ctaLabel ? String(feature.ctaLabel) : undefined,
          }))
          .filter((feature: FeatureCatalogItem) => feature.id && feature.title);

        setWorkspaces(workspaceRows);
        setCatalog(catalogRows);

      } catch (error: any) {
        if (!isMounted) return;
        setStatusMessage({
          type: 'error',
          text: error?.message || 'Failed to load feature rollout data.',
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadBaseData();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadWorkspaceRollout = async () => {
      if (!selectedWorkspaceId) {
        setRolloutConfig(EMPTY_ROLLOUT);
        setDraftEnabled(false);
        setDraftFeatureId('');
        return;
      }

      try {
        const rolloutResponse = await adminApi.getWorkspaceFeatureRollout(selectedWorkspaceId);

        if (!isMounted) return;

        const rollout = rolloutResponse?.data || EMPTY_ROLLOUT;
        setRolloutConfig({
          enabled: Boolean(rollout.enabled),
          featureId: rollout.featureId ? String(rollout.featureId) : null,
          featureSnapshot: rollout.featureSnapshot || null,
          updatedAt: rollout.updatedAt || null,
          updatedBy: rollout.updatedBy || null,
        });
        setDraftEnabled(Boolean(rollout.enabled));
        setDraftFeatureId(rollout.featureId ? String(rollout.featureId) : '');
      } catch (error: any) {
        if (!isMounted) return;
        setStatusMessage({
          type: 'error',
          text: error?.message || 'Failed to load workspace rollout.',
        });
      }
    };

    loadWorkspaceRollout();
    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceId]);

  useEffect(() => {
    let isMounted = true;

    const loadSignupDemand = async () => {
      try {
        const targetWorkspaceIds = Array.from(new Set(selectedWorkspaceIds));
        const signupResponse = targetWorkspaceIds.length === 1
          ? await adminApi.getWorkspaceFeatureRolloutSignups(targetWorkspaceIds[0])
          : await adminApi.getFeatureRolloutSignups({
            workspaceIds: targetWorkspaceIds.length > 0 ? targetWorkspaceIds : undefined,
          });

        if (!isMounted) return;
        setSignupSummary(signupResponse?.data || null);
      } catch (error: any) {
        if (!isMounted) return;
        setSignupSummary(null);
        setStatusMessage({
          type: 'error',
          text: error?.message || 'Failed to load workspace beta signups.',
        });
      }
    };

    loadSignupDemand();
    return () => {
      isMounted = false;
    };
  }, [selectedWorkspaceIds]);

  useEffect(() => {
    if (workspaces.length === 0) {
      setSelectedWorkspaceId('');
      setSelectedWorkspaceIds([]);
      return;
    }

    setSelectedWorkspaceIds((current) => (
      current.filter((workspaceId) => workspaces.some((workspace) => workspace.id === workspaceId))
    ));
  }, [workspaces]);

  useEffect(() => {
    if (selectedWorkspaceIds.length === 1) {
      setSelectedWorkspaceId((current) => (
        current === selectedWorkspaceIds[0] ? current : selectedWorkspaceIds[0]
      ));
      return;
    }

    setSelectedWorkspaceId((current) => (current ? '' : current));
  }, [selectedWorkspaceIds]);

  const toggleWorkspaceSelection = (workspaceId: string) => {
    setSelectedWorkspaceIds((current) => (
      current.includes(workspaceId)
        ? current.filter((id) => id !== workspaceId)
        : [...current, workspaceId]
    ));
  };

  const selectFilteredWorkspaces = () => {
    setSelectedWorkspaceIds((current) => {
      const merged = new Set(current);
      filteredWorkspaces.forEach((workspace) => merged.add(workspace.id));
      return Array.from(merged);
    });
  };

  const clearWorkspaceSelection = () => {
    setSelectedWorkspaceIds([]);
  };

  const createCatalogFeature = async () => {
    const normalizedTitle = newFeature.title.trim();
    if (!normalizedTitle) {
      setStatusMessage({
        type: 'error',
        text: 'Feature title is required.',
      });
      return;
    }

    try {
      setCreatingFeature(true);
      setStatusMessage(null);

      const response = await adminApi.createFeatureRolloutCatalogItem({
        id: newFeature.id.trim() || undefined,
        title: normalizedTitle,
        badge: newFeature.badge.trim() || undefined,
        description: newFeature.description.trim() || undefined,
        ctaLabel: newFeature.ctaLabel.trim() || undefined,
      });

      const created = response?.data;
      if (!created?.id) {
        throw new Error('Catalog item was created but response payload was empty.');
      }

      const mapped: FeatureCatalogItem = {
        id: String(created.id),
        badge: created.badge ? String(created.badge) : undefined,
        title: String(created.title || created.id),
        description: created.description ? String(created.description) : undefined,
        ctaLabel: created.ctaLabel ? String(created.ctaLabel) : undefined,
      };

      setCatalog((current) => {
        const withoutOld = current.filter((item) => item.id !== mapped.id);
        return [...withoutOld, mapped].sort((a, b) => a.title.localeCompare(b.title));
      });
      setDraftFeatureId(mapped.id);
      setDraftEnabled(true);
      setNewFeature(EMPTY_NEW_FEATURE);
      setStatusMessage({
        type: 'success',
        text: `Feature catalog item "${mapped.title}" added.`,
      });
    } catch (error: any) {
      setStatusMessage({
        type: 'error',
        text: error?.message || 'Failed to create feature catalog item.',
      });
    } finally {
      setCreatingFeature(false);
    }
  };

  const saveBulkRollout = async () => {
    const targetWorkspaceIds = Array.from(new Set(selectedWorkspaceIds));

    if (targetWorkspaceIds.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Select at least one workspace for bulk rollout.',
      });
      return;
    }

    if (draftEnabled && !draftFeatureId) {
      setStatusMessage({
        type: 'error',
        text: 'Select a feature before enabling rollout.',
      });
      return;
    }

    try {
      setBulkSaving(true);
      setStatusMessage(null);

      const results = await Promise.allSettled(
        targetWorkspaceIds.map((workspaceId) => (
          adminApi.updateWorkspaceFeatureRollout(workspaceId, {
            enabled: draftEnabled,
            featureId: draftEnabled ? draftFeatureId : null,
          })
        ))
      );

      const failed = results
        .map((result, index) => ({ result, workspaceId: targetWorkspaceIds[index] }))
        .filter((entry) => entry.result.status === 'rejected');
      const successCount = targetWorkspaceIds.length - failed.length;

      if (selectedWorkspaceId && targetWorkspaceIds.includes(selectedWorkspaceId)) {
        const rolloutResponse = await adminApi.getWorkspaceFeatureRollout(selectedWorkspaceId);

        const rollout = rolloutResponse?.data || EMPTY_ROLLOUT;
        setRolloutConfig({
          enabled: Boolean(rollout.enabled),
          featureId: rollout.featureId ? String(rollout.featureId) : null,
          featureSnapshot: rollout.featureSnapshot || null,
          updatedAt: rollout.updatedAt || null,
          updatedBy: rollout.updatedBy || null,
        });
        setDraftEnabled(Boolean(rollout.enabled));
        setDraftFeatureId(rollout.featureId ? String(rollout.featureId) : '');
      }

      if (failed.length === 0) {
        setStatusMessage({
          type: 'success',
          text: draftEnabled
            ? `Feature published to ${successCount} workspace${successCount === 1 ? '' : 's'}.`
            : `Feature rollout disabled for ${successCount} workspace${successCount === 1 ? '' : 's'}.`,
        });
      } else {
        const sampleFailure = failed[0]?.result;
        const sampleMessage = sampleFailure && sampleFailure.status === 'rejected'
          ? sampleFailure.reason?.message || 'Unknown error'
          : 'Unknown error';
        setStatusMessage({
          type: 'error',
          text: `Bulk update completed with issues. Success: ${successCount}, Failed: ${failed.length}. Example error: ${sampleMessage}`,
        });
      }
    } catch (error: any) {
      setStatusMessage({
        type: 'error',
        text: error?.message || 'Failed to apply bulk rollout.',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feature Rollout Control</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Push beta widgets workspace-wide and monitor early access signups.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          <Rocket className="w-4 h-4" />
          Mission Control
        </div>
      </div>

      {statusMessage && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-600 dark:text-gray-400">Loading rollout controls...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search workspace</label>
              <input
                value={workspaceSearch}
                onChange={(event) => setWorkspaceSearch(event.target.value)}
                placeholder="Search by workspace name, email, or ID..."
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Showing {filteredWorkspaces.length} of {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Publish beta widget</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Enables the feature card on MainContent for selected workspaces.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDraftEnabled((previous) => !previous)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    draftEnabled ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      draftEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Feature</label>
                <select
                  value={draftFeatureId}
                  disabled={!draftEnabled}
                  onChange={(event) => setDraftFeatureId(event.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Select feature...</option>
                  {catalog.map((feature) => (
                    <option key={feature.id} value={feature.id}>
                      {feature.title}
                    </option>
                  ))}
                </select>
                {draftEnabled && draftFeatureId && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {catalog.find((item) => item.id === draftFeatureId)?.description || 'No description provided.'}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add feature to catalog</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Feature title *</label>
                    <input
                      value={newFeature.title}
                      onChange={(event) => setNewFeature((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Voice QA Copilot"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Feature ID (optional)</label>
                    <input
                      value={newFeature.id}
                      onChange={(event) => setNewFeature((current) => ({ ...current, id: event.target.value }))}
                      placeholder="voice-qa-copilot"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Badge</label>
                    <input
                      value={newFeature.badge}
                      onChange={(event) => setNewFeature((current) => ({ ...current, badge: event.target.value }))}
                      placeholder="COMING SOON"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CTA label</label>
                    <input
                      value={newFeature.ctaLabel}
                      onChange={(event) => setNewFeature((current) => ({ ...current, ctaLabel: event.target.value }))}
                      placeholder="Join waitlist"
                      className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                  <input
                    value={newFeature.description}
                    onChange={(event) => setNewFeature((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short value prop for the widget card"
                    className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={createCatalogFeature}
                  disabled={creatingFeature}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {creatingFeature ? 'Adding feature...' : 'Add feature'}
                </button>
              </div>

              <div className="pt-4 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Bulk target workspaces ({selectedWorkspaceIds.length})
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={selectFilteredWorkspaces}
                      className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Select filtered
                    </button>
                    <button
                      type="button"
                      onClick={clearWorkspaceSelection}
                      className="px-2.5 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-900/20 p-2 space-y-1">
                  {filteredWorkspaces.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                      No workspace matches your search.
                    </p>
                  ) : (
                    filteredWorkspaces.map((workspace) => (
                      <label
                        key={`bulk-${workspace.id}`}
                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkspaceIds.includes(workspace.id)}
                          onChange={() => toggleWorkspaceSelection(workspace.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                          {workspace.name} ({workspace.id})
                        </span>
                      </label>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={saveBulkRollout}
                  disabled={bulkSaving || selectedWorkspaceIds.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {bulkSaving
                    ? `Applying to ${selectedWorkspaceIds.length}...`
                    : `Bulk apply to ${selectedWorkspaceIds.length} workspace${selectedWorkspaceIds.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Current State</p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Workspace: <span className="font-semibold">{selectedWorkspace?.name || '—'}</span>
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                Status:{' '}
                <span className={`font-semibold ${rolloutConfig.enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {rolloutConfig.enabled ? 'Published' : 'Disabled'}
                </span>
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                Feature: <span className="font-semibold">{activeFeature?.title || '—'}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Updated: {formatDateTime(rolloutConfig.updatedAt)}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                By: {rolloutConfig.updatedBy || '—'}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">Signup Demand</p>
                <div className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                  <Users className="w-4 h-4" />
                  {signupSummary?.totalSignups || 0}
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {signupScopeMessage}
              </p>

              <div className="mt-3 space-y-2">
                {(signupSummary?.byFeature || []).slice(0, 4).map((entry) => (
                  <div key={entry.featureId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{entry.title}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.count}</span>
                  </div>
                ))}

                {(!signupSummary || (signupSummary.byFeature || []).length === 0) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No signups yet.</p>
                )}
              </div>

              {(signupSummary?.recentSignups || []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold mb-2">Recent</p>
                  <div className="space-y-1.5 text-sm">
                    {signupSummary!.recentSignups.slice(0, 3).map((signup) => (
                      <div key={signup.id} className="flex items-center justify-between gap-3">
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatEmailPreview(signup.email)}
                          {!selectedWorkspaceId && signup.workspace_id ? ` · ${signup.workspace_id}` : ''}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{formatDateTime(signup.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeatureRolloutControl;
