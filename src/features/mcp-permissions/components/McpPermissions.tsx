import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';

type DefaultRole = 'none' | 'read' | 'write';
type WorkspaceRole = 'read' | 'write';
type OptionalWorkspaceRole = WorkspaceRole | 'none';

interface StaffMemberOption {
  id: string;
  email: string;
  full_name: string | null;
}

interface WorkspaceOption {
  id: string;
  name: string;
}

interface KeyPermission {
  id?: string;
  workspace_id: string;
  workspace_name: string;
  role: WorkspaceRole;
}

interface McpKey {
  id: string;
  staff_member_id: string | null;
  label: string;
  key_prefix: string;
  default_role: DefaultRole;
  wildcard_role: WorkspaceRole | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  permissions: KeyPermission[];
}

interface DraftKeySettings {
  label: string;
  staff_member_id: string;
  default_role: DefaultRole;
  wildcard_role: OptionalWorkspaceRole;
  is_active: boolean;
}

interface McpPermissionsResponse {
  success: boolean;
  data?: {
    staff?: StaffMemberOption[];
    workspaces?: WorkspaceOption[];
    keys?: McpKey[];
  };
}

interface CreateKeyResponse {
  success: boolean;
  data?: {
    apiKey?: string;
  };
}

const defaultCreateForm = {
  label: '',
  staffMemberId: '',
  defaultRole: 'none' as DefaultRole,
  wildcardRole: 'none' as OptionalWorkspaceRole,
};

function getEffectiveAccessSummary(
  defaultRole: DefaultRole,
  wildcardRole: OptionalWorkspaceRole,
  exactWorkspaceGrantCount: number
): { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' } {
  if (wildcardRole === 'write') {
    return { label: 'Global write on all workspaces (wildcard=write)', tone: 'danger' };
  }

  if (wildcardRole === 'read') {
    return { label: 'Global read on all workspaces (wildcard=read)', tone: 'warning' };
  }

  if (defaultRole === 'write') {
    return { label: 'Fallback write for all unspecified workspaces (default=write)', tone: 'danger' };
  }

  if (defaultRole === 'read') {
    return { label: 'Fallback read for all unspecified workspaces (default=read)', tone: 'warning' };
  }

  if (exactWorkspaceGrantCount > 0) {
    return {
      label: `Restricted to ${exactWorkspaceGrantCount} explicit workspace grant${exactWorkspaceGrantCount === 1 ? '' : 's'}`,
      tone: 'success',
    };
  }

  return { label: 'No access yet (assign workspaces to grant access)', tone: 'neutral' };
}

function summaryToneClasses(tone: 'neutral' | 'success' | 'warning' | 'danger'): string {
  if (tone === 'success') {
    return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
  }

  if (tone === 'warning') {
    return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  }

  if (tone === 'danger') {
    return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800';
  }

  return 'bg-gray-50 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
}

export function McpPermissions() {
  const [staff, setStaff] = useState<StaffMemberOption[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [keys, setKeys] = useState<McpKey[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftKeySettings>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKeyId, setSavingKeyId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(defaultCreateForm);
  const [creating, setCreating] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  const [workspaceEditorKey, setWorkspaceEditorKey] = useState<McpKey | null>(null);
  const [workspaceRoleDrafts, setWorkspaceRoleDrafts] = useState<Record<string, OptionalWorkspaceRole>>({});
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [savingWorkspacePermissions, setSavingWorkspacePermissions] = useState(false);

  const staffById = useMemo(() => new Map(staff.map((member) => [member.id, member])), [staff]);

  const hydrateDrafts = useCallback((nextKeys: McpKey[]) => {
    setDrafts((current) => {
      const next: Record<string, DraftKeySettings> = {};

      for (const key of nextKeys) {
        next[key.id] = current[key.id] || {
          label: key.label,
          staff_member_id: key.staff_member_id || '',
          default_role: key.default_role,
          wildcard_role: key.wildcard_role || 'none',
          is_active: key.is_active,
        };
      }

      return next;
    });
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = (await adminApi.getMcpPermissions()) as McpPermissionsResponse;
      const nextStaff = response.data?.staff || [];
      const nextWorkspaces = response.data?.workspaces || [];
      const nextKeys = response.data?.keys || [];

      setStaff(nextStaff);
      setWorkspaces(nextWorkspaces);
      setKeys(nextKeys);
      hydrateDrafts(nextKeys);
    } catch (loadError: any) {
      console.error('Failed to load MCP permissions:', loadError);
      setError(loadError?.message || 'Failed to load MCP permissions');
    } finally {
      setLoading(false);
    }
  }, [hydrateDrafts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateDraft = (keyId: string, patch: Partial<DraftKeySettings>) => {
    setDrafts((current) => ({
      ...current,
      [keyId]: {
        ...current[keyId],
        ...patch,
      },
    }));
  };

  const handleCreateKey = async () => {
    if (!createForm.label.trim()) {
      setError('Key label is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      const response = (await adminApi.createMcpApiKey({
        label: createForm.label.trim(),
        staffMemberId: createForm.staffMemberId || null,
        defaultRole: createForm.defaultRole,
        wildcardRole: createForm.wildcardRole === 'none' ? null : createForm.wildcardRole,
      })) as CreateKeyResponse;

      setCreatedApiKey(response.data?.apiKey || null);
      setCreateForm(defaultCreateForm);
      await loadData();
    } catch (createError: any) {
      console.error('Failed to create MCP key:', createError);
      setError(createError?.message || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCreatedKey = async () => {
    if (!createdApiKey) return;
    try {
      await navigator.clipboard.writeText(createdApiKey);
    } catch (copyError) {
      console.warn('Clipboard copy failed:', copyError);
    }
  };

  const handleSaveKey = async (key: McpKey) => {
    const draft = drafts[key.id];
    if (!draft) return;

    try {
      setSavingKeyId(key.id);
      setError(null);

      await adminApi.updateMcpApiKey(key.id, {
        label: draft.label.trim(),
        staffMemberId: draft.staff_member_id || null,
        defaultRole: draft.default_role,
        wildcardRole: draft.wildcard_role === 'none' ? null : draft.wildcard_role,
        isActive: draft.is_active,
      });

      await loadData();
    } catch (saveError: any) {
      console.error('Failed to save key:', saveError);
      setError(saveError?.message || 'Failed to save key');
    } finally {
      setSavingKeyId(null);
    }
  };

  const handleDeleteKey = async (key: McpKey) => {
    const confirmed = window.confirm(`Delete MCP key \"${key.label}\" (${key.key_prefix}...)?`);
    if (!confirmed) return;

    try {
      setDeletingKeyId(key.id);
      setError(null);
      await adminApi.deleteMcpApiKey(key.id);
      await loadData();
    } catch (deleteError: any) {
      console.error('Failed to delete key:', deleteError);
      setError(deleteError?.message || 'Failed to delete key');
    } finally {
      setDeletingKeyId(null);
    }
  };

  const openWorkspaceEditor = (key: McpKey) => {
    const nextDrafts: Record<string, OptionalWorkspaceRole> = {};
    for (const workspace of workspaces) {
      nextDrafts[workspace.id] = 'none';
    }

    for (const permission of key.permissions || []) {
      nextDrafts[permission.workspace_id] = permission.role;
    }

    setWorkspaceRoleDrafts(nextDrafts);
    setWorkspaceSearch('');
    setWorkspaceEditorKey(key);
  };

  const closeWorkspaceEditor = () => {
    setWorkspaceEditorKey(null);
    setWorkspaceRoleDrafts({});
    setWorkspaceSearch('');
  };

  const handleSaveWorkspacePermissions = async () => {
    if (!workspaceEditorKey) return;

    const permissions = Object.entries(workspaceRoleDrafts)
      .filter(([, role]) => role === 'read' || role === 'write')
      .map(([workspaceId, role]) => ({
        workspaceId,
        role: role as WorkspaceRole,
      }));

    try {
      setSavingWorkspacePermissions(true);
      setError(null);
      await adminApi.setMcpWorkspacePermissions(workspaceEditorKey.id, permissions);
      await loadData();
      closeWorkspaceEditor();
    } catch (saveError: any) {
      console.error('Failed to save workspace permissions:', saveError);
      setError(saveError?.message || 'Failed to save workspace permissions');
    } finally {
      setSavingWorkspacePermissions(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((workspace) => {
    const query = workspaceSearch.trim().toLowerCase();
    if (!query) return true;
    return workspace.name.toLowerCase().includes(query) || workspace.id.toLowerCase().includes(query);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">MCP Access Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage staff MCP keys and per-workspace read/write access.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {createdApiKey && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">New key created (copy now)</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                This full API key is only shown once.
              </p>
              <code className="mt-2 block break-all rounded bg-amber-100/80 dark:bg-amber-950/40 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
                {createdApiKey}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCreatedKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-600 text-white hover:bg-amber-700"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy
              </button>
              <button
                onClick={() => setCreatedApiKey(null)}
                className="p-1.5 rounded-md text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Create MCP Key</h3>
        </div>

        <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2.5 text-xs text-blue-800 dark:text-blue-200">
          Flow: 1) Create key and save defaults. 2) In Configured Keys click <span className="font-semibold">Assign Workspaces</span>. 3) Set each workspace to none/read/write.
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={createForm.label}
            onChange={(event) => setCreateForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Label (e.g. Sales Manager)"
            className="lg:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          />

          <select
            value={createForm.staffMemberId}
            onChange={(event) => setCreateForm((current) => ({ ...current, staffMemberId: event.target.value }))}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="">Unassigned staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name || member.email}
              </option>
            ))}
          </select>

          <select
            value={createForm.defaultRole}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, defaultRole: event.target.value as DefaultRole }))
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="none">Default: none</option>
            <option value="read">Default: read</option>
            <option value="write">Default: write</option>
          </select>

          <div className="flex items-center gap-3">
            <select
              value={createForm.wildcardRole}
              onChange={(event) =>
                setCreateForm((current) => ({ ...current, wildcardRole: event.target.value as OptionalWorkspaceRole }))
              }
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="none">Wildcard: none</option>
              <option value="read">Wildcard: read</option>
              <option value="write">Wildcard: write</option>
            </select>

            <button
              onClick={handleCreateKey}
              disabled={creating}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Configured Keys</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{keys.length} key{keys.length === 1 ? '' : 's'}</p>
        </div>

        {keys.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">No MCP keys configured yet.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {keys.map((key) => {
              const draft = drafts[key.id];
              const assignedStaff = key.staff_member_id ? staffById.get(key.staff_member_id) : null;
              const permissionCount = key.permissions?.length || 0;
              const isBusy = savingKeyId === key.id || deletingKeyId === key.id;

              if (!draft) return null;

              const effectiveAccess = getEffectiveAccessSummary(
                draft.default_role,
                draft.wildcard_role,
                permissionCount
              );

              return (
                <div key={key.id} className="px-5 py-4 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <input
                      type="text"
                      value={draft.label}
                      onChange={(event) => updateDraft(key.id, { label: event.target.value })}
                      className="lg:col-span-3 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    />

                    <select
                      value={draft.staff_member_id}
                      onChange={(event) => updateDraft(key.id, { staff_member_id: event.target.value })}
                      className="lg:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </option>
                      ))}
                    </select>

                    <select
                      value={draft.default_role}
                      onChange={(event) => updateDraft(key.id, { default_role: event.target.value as DefaultRole })}
                      className="lg:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="none">Default: none</option>
                      <option value="read">Default: read</option>
                      <option value="write">Default: write</option>
                    </select>

                    <select
                      value={draft.wildcard_role}
                      onChange={(event) => updateDraft(key.id, { wildcard_role: event.target.value as OptionalWorkspaceRole })}
                      className="lg:col-span-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
                    >
                      <option value="none">Wildcard: none</option>
                      <option value="read">Wildcard: read</option>
                      <option value="write">Wildcard: write</option>
                    </select>

                    <label className="lg:col-span-1 flex items-center gap-2 px-2 py-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={draft.is_active}
                        onChange={(event) => updateDraft(key.id, { is_active: event.target.checked })}
                      />
                      Active
                    </label>

                    <div className="lg:col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSaveKey(key)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save
                      </button>
                      <button
                        onClick={() => handleDeleteKey(key)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-200">
                      prefix: {key.key_prefix}
                    </span>
                    <span>{assignedStaff ? `staff: ${assignedStaff.full_name || assignedStaff.email}` : 'staff: unassigned'}</span>
                    <span>exact workspace grants: {permissionCount}</span>
                    <span>last used: {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'never'}</span>
                    <span className={`border px-2 py-1 rounded ${summaryToneClasses(effectiveAccess.tone)}`}>
                      {effectiveAccess.label}
                    </span>
                    <button
                      onClick={() => openWorkspaceEditor(key)}
                      className="ml-auto px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium"
                    >
                      Assign Workspaces
                    </button>
                  </div>

                  {key.permissions?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {key.permissions.map((perm) => (
                        <span
                          key={perm.workspace_id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            perm.role === 'write'
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {perm.workspace_name}
                          <span className="font-semibold">{perm.role}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {workspaceEditorKey && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Workspace Access: {workspaceEditorKey.label}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Set each workspace to none/read/write. This is where exact workspace access is assigned.
                </p>
              </div>
              <button
                onClick={closeWorkspaceEditor}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={workspaceSearch}
                  onChange={(event) => setWorkspaceSearch(event.target.value)}
                  placeholder="Search workspaces by name or ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {filteredWorkspaces.map((workspace) => (
                <div key={workspace.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{workspace.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">{workspace.id}</p>
                  </div>

                  <select
                    value={workspaceRoleDrafts[workspace.id] || 'none'}
                    onChange={(event) =>
                      setWorkspaceRoleDrafts((current) => ({
                        ...current,
                        [workspace.id]: event.target.value as OptionalWorkspaceRole,
                      }))
                    }
                    className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                  >
                    <option value="none">none</option>
                    <option value="read">read</option>
                    <option value="write">write</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Object.values(workspaceRoleDrafts).filter((role) => role !== 'none').length} workspace grants selected
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeWorkspaceEditor}
                  className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWorkspacePermissions}
                  disabled={savingWorkspacePermissions}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingWorkspacePermissions ? 'Saving...' : 'Save Workspace Access'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
