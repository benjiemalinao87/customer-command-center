import { supabase, getAccessToken } from '../../../lib/supabase';
import type { StaffMember, WorkspaceAssignment, WorkspaceOption } from '../types/staff';

const BACKEND_URL = import.meta.env.VITE_ADMIN_API_URL?.replace('/api/admin', '') || 'https://cc.automate8.com';

/**
 * Make authenticated request to the backend workspace-members API
 */
async function makeBackendRequest(endpoint: string, options: RequestInit = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required');

  const url = `${BACKEND_URL}/api/workspace-members${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.statusText}`);
  }

  return data;
}

// ─── Read Operations (direct Supabase) ───

/**
 * Get all staff members with their workspace assignment counts
 */
export async function getStaffMembers(): Promise<StaffMember[]> {
  const { data: staff, error } = await supabase
    .from('staff_members')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching staff members:', error);
    return [];
  }

  if (!staff || staff.length === 0) return [];

  // Fetch workspace assignments for staff who have user_ids
  const userIds = staff.map(s => s.user_id).filter(Boolean) as string[];
  let assignmentMap: Record<string, WorkspaceAssignment[]> = {};

  if (userIds.length > 0) {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('id, user_id, workspace_id, role, created_at')
      .in('user_id', userIds);

    if (members && members.length > 0) {
      // Fetch workspace names
      const workspaceIds = [...new Set(members.map(m => m.workspace_id))];
      const { data: workspaces } = await supabase
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds);

      const workspaceNameMap: Record<string, string> = {};
      workspaces?.forEach(w => { workspaceNameMap[w.id] = w.name || w.id; });

      // Group by user_id
      members.forEach(m => {
        if (!assignmentMap[m.user_id]) assignmentMap[m.user_id] = [];
        assignmentMap[m.user_id].push({
          id: m.id,
          workspace_id: m.workspace_id,
          workspace_name: workspaceNameMap[m.workspace_id] || m.workspace_id,
          role: m.role,
          created_at: m.created_at,
        });
      });
    }
  }

  return staff.map(s => ({
    ...s,
    workspace_assignments: s.user_id ? (assignmentMap[s.user_id] || []) : [],
  }));
}

/**
 * Get all workspaces for the assignment dropdown
 */
export async function getAllWorkspaces(): Promise<WorkspaceOption[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching workspaces:', error);
    return [];
  }

  return (data || []).map(w => ({ id: w.id, name: w.name || w.id }));
}

// ─── Write Operations ───

/**
 * Add a staff member to the roster
 */
export async function addStaffMember(
  email: string,
  fullName?: string,
  notes?: string
): Promise<StaffMember> {
  // Check if user already exists in auth.users to populate user_id
  let userId: string | null = null;

  const { data: existingUsers } = await supabase
    .rpc('get_user_by_email', { user_email: email });

  if (existingUsers && existingUsers.length > 0) {
    userId = existingUsers[0].id;
  }

  const { data, error } = await supabase
    .from('staff_members')
    .insert({
      email: email.toLowerCase().trim(),
      full_name: fullName || null,
      notes: notes || null,
      user_id: userId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('This email is already in the staff roster');
    }
    throw new Error(error.message);
  }

  return { ...data, workspace_assignments: [] };
}

/**
 * Remove a staff member from the roster (soft delete)
 */
export async function removeStaffMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('staff_members')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Assign a staff member to a workspace (uses backend add-by-email)
 */
export async function assignToWorkspace(
  email: string,
  workspaceId: string,
  staffId: string
): Promise<{ isNewUser: boolean; credentials?: { email: string; password: string } }> {
  const result = await makeBackendRequest('/add-by-email', {
    method: 'POST',
    body: JSON.stringify({
      email,
      workspace_id: workspaceId,
      role: 'admin',
    }),
  });

  // If this was the first assignment and the user was just created, update staff_members.user_id
  if (result.data?.member?.user_id) {
    await supabase
      .from('staff_members')
      .update({ user_id: result.data.member.user_id, updated_at: new Date().toISOString() })
      .eq('id', staffId);
  }

  return {
    isNewUser: result.data?.isExistingUser === false,
    credentials: result.data?.credentials,
  };
}

/**
 * Unassign a staff member from a workspace
 * Uses POST instead of DELETE to avoid body-parsing issues with middleware
 */
export async function unassignFromWorkspace(
  userId: string,
  workspaceId: string
): Promise<void> {
  await makeBackendRequest(`/remove?workspace_id=${workspaceId}`, {
    method: 'DELETE',
    body: JSON.stringify({
      user_id: userId,
      workspace_id: workspaceId,
    }),
  });
}
