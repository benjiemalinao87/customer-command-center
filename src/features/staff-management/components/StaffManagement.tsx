import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Building2, Search, ChevronDown, ChevronRight, Trash2, X as XIcon, RefreshCw } from 'lucide-react';
import { getStaffMembers, getAllWorkspaces, addStaffMember, removeStaffMember, assignToWorkspace, unassignFromWorkspace } from '../services/staffApi';
import { AddStaffModal } from './AddStaffModal';
import { AssignWorkspaceModal } from './AssignWorkspaceModal';
import type { StaffMember, WorkspaceOption } from '../types/staff';

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<StaffMember | null>(null);

  // Confirmation state
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove-roster' | 'unassign';
    staffMember: StaffMember;
    workspaceId?: string;
    workspaceName?: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffData, workspaceData] = await Promise.all([
        getStaffMembers(),
        getAllWorkspaces(),
      ]);
      setStaff(staffData);
      setWorkspaces(workspaceData);
    } catch (error) {
      console.error('Error loading staff data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStaff = async (email: string, fullName?: string, notes?: string) => {
    await addStaffMember(email, fullName, notes);
    await loadData();
  };

  const handleRemoveFromRoster = async () => {
    if (!confirmAction || confirmAction.type !== 'remove-roster') return;
    try {
      await removeStaffMember(confirmAction.staffMember.id);
      setConfirmAction(null);
      await loadData();
    } catch (error: any) {
      console.error('Error removing staff:', error);
      alert(error.message);
    }
  };

  const handleAssignToWorkspace = async (workspaceId: string) => {
    if (!assignTarget) throw new Error('No staff member selected');
    const result = await assignToWorkspace(assignTarget.email, workspaceId, assignTarget.id);
    await loadData();
    return result;
  };

  const handleUnassign = async () => {
    if (!confirmAction || confirmAction.type !== 'unassign' || !confirmAction.workspaceId) return;
    const userId = confirmAction.staffMember.user_id;
    if (!userId) return;
    try {
      await unassignFromWorkspace(userId, confirmAction.workspaceId);
      setConfirmAction(null);
      await loadData();
    } catch (error: any) {
      console.error('Error unassigning:', error);
      alert(error.message);
    }
  };

  // Filter staff by search
  const filtered = staff.filter(s => {
    const term = searchTerm.toLowerCase();
    return (
      s.email.toLowerCase().includes(term) ||
      (s.full_name || '').toLowerCase().includes(term)
    );
  });

  // Stats
  const totalStaff = staff.length;
  const totalAssignments = staff.reduce((sum, s) => sum + (s.workspace_assignments?.length || 0), 0);
  const workspacesCovered = new Set(staff.flatMap(s => s.workspace_assignments?.map(a => a.workspace_id) || [])).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Staff Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your team roster and workspace assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Staff" value={totalStaff} color="blue" />
        <StatCard icon={<Building2 className="w-5 h-5" />} label="Active Assignments" value={totalAssignments} color="purple" />
        <StatCard icon={<Building2 className="w-5 h-5" />} label="Workspaces Covered" value={workspacesCovered} color="green" />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            {staff.length === 0 ? (
              <div>
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No staff members yet</p>
                <p className="text-sm mt-1">Click "Add Staff" to get started</p>
              </div>
            ) : (
              <p>No results matching "{searchTerm}"</p>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8"></th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Workspaces</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Added</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map(member => {
                const isExpanded = expandedId === member.id;
                const assignments = member.workspace_assignments || [];
                return (
                  <StaffRow
                    key={member.id}
                    member={member}
                    assignments={assignments}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : member.id)}
                    onAssign={() => setAssignTarget(member)}
                    onUnassign={(workspaceId, workspaceName) =>
                      setConfirmAction({ type: 'unassign', staffMember: member, workspaceId, workspaceName })
                    }
                    onRemove={() =>
                      setConfirmAction({ type: 'remove-roster', staffMember: member })
                    }
                  />
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <AddStaffModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStaff}
      />

      {assignTarget && (
        <AssignWorkspaceModal
          isOpen={!!assignTarget}
          onClose={() => setAssignTarget(null)}
          staff={assignTarget}
          workspaces={workspaces}
          onAssign={handleAssignToWorkspace}
        />
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.type === 'remove-roster' ? 'Remove from Roster' : 'Unassign from Workspace'}
          message={
            confirmAction.type === 'remove-roster'
              ? `Remove ${confirmAction.staffMember.full_name || confirmAction.staffMember.email} from your staff roster? Their workspace assignments will NOT be removed.`
              : `Remove ${confirmAction.staffMember.full_name || confirmAction.staffMember.email}'s access to "${confirmAction.workspaceName}"? They will no longer be able to log into this workspace.`
          }
          confirmLabel={confirmAction.type === 'remove-roster' ? 'Remove' : 'Unassign'}
          onConfirm={confirmAction.type === 'remove-roster' ? handleRemoveFromRoster : handleUnassign}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ─── Sub-Components ───

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'blue' | 'purple' | 'green' }) {
  const colors = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StaffRow({
  member,
  assignments,
  isExpanded,
  onToggle,
  onAssign,
  onUnassign,
  onRemove,
}: {
  member: StaffMember;
  assignments: StaffMember['workspace_assignments'] & {};
  isExpanded: boolean;
  onToggle: () => void;
  onAssign: () => void;
  onUnassign: (workspaceId: string, workspaceName: string) => void;
  onRemove: () => void;
}) {
  const count = assignments.length;

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        {/* Expand toggle */}
        <td className="px-5 py-3.5">
          <button onClick={onToggle} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        {/* Name */}
        <td className="px-5 py-3.5">
          <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
            {member.full_name || '—'}
          </span>
          {member.notes && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[200px]">{member.notes}</p>
          )}
        </td>
        {/* Email */}
        <td className="px-5 py-3.5 text-sm text-gray-600 dark:text-gray-300">{member.email}</td>
        {/* Workspaces badge */}
        <td className="px-5 py-3.5">
          {count > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              <Building2 className="w-3 h-3" />
              {count} workspace{count !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">None</span>
          )}
        </td>
        {/* Added date */}
        <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">
          {new Date(member.created_at).toLocaleDateString()}
        </td>
        {/* Actions */}
        <td className="px-5 py-3.5 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onAssign}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              Assign
            </button>
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Remove from roster"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded row: workspace assignments */}
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 dark:bg-gray-900/30 px-5 py-4">
            {count === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                Not assigned to any workspace yet.{' '}
                <button onClick={onAssign} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                  Assign now
                </button>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Workspace Assignments
                </p>
                {assignments.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.workspace_name}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                          {a.role}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        since {new Date(a.created_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => onUnassign(a.workspace_id, a.workspace_name)}
                        className="text-xs px-2.5 py-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 font-medium"
                      >
                        Unassign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <button onClick={onCancel} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
