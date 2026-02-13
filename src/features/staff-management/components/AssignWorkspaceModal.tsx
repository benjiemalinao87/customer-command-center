import { useState, useEffect, useMemo } from 'react';
import { X, Building2, Search, Check, AlertCircle, Copy } from 'lucide-react';
import type { StaffMember, WorkspaceOption } from '../types/staff';

interface AssignWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMember;
  workspaces: WorkspaceOption[];
  onAssign: (workspaceId: string) => Promise<{ isNewUser: boolean; credentials?: { email: string; password: string } }>;
}

export function AssignWorkspaceModal({ isOpen, onClose, staff, workspaces, onAssign }: AssignWorkspaceModalProps) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedId('');
      setError('');
      setCredentials(null);
      setCopied(false);
    }
  }, [isOpen]);

  const assignedIds = useMemo(
    () => new Set(staff.workspace_assignments?.map(a => a.workspace_id) || []),
    [staff.workspace_assignments]
  );

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return workspaces.filter(w =>
      w.name.toLowerCase().includes(term) || w.id.includes(term)
    );
  }, [workspaces, search]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!selectedId) return;
    setError('');

    try {
      setLoading(true);
      const result = await onAssign(selectedId);
      if (result.isNewUser && result.credentials) {
        setCredentials(result.credentials);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!credentials) return;
    navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show credentials screen after successful new user creation
  if (credentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">New Account Created</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A new account was created for this staff member. Share these temporary credentials:
            </p>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 font-mono text-sm space-y-1">
              <div><span className="text-gray-500">Email:</span> <span className="text-gray-900 dark:text-gray-100">{credentials.email}</span></div>
              <div><span className="text-gray-500">Password:</span> <span className="text-gray-900 dark:text-gray-100">{credentials.password}</span></div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Assign {staff.full_name || staff.email} to Workspace
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              autoFocus
            />
          </div>

          {/* Workspace list */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No workspaces found</div>
            ) : (
              filtered.map(w => {
                const isAssigned = assignedIds.has(w.id);
                const isSelected = selectedId === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => !isAssigned && setSelectedId(w.id)}
                    disabled={isAssigned}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${
                      isAssigned
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                        : isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{w.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{w.id}</div>
                    </div>
                    {isAssigned && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                        Assigned
                      </span>
                    )}
                    {isSelected && !isAssigned && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Staff will be added as <span className="font-semibold">Admin</span> to the selected workspace.
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={!selectedId || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
