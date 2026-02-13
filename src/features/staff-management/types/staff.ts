export interface StaffMember {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workspace_assignments?: WorkspaceAssignment[];
}

export interface WorkspaceAssignment {
  id: string;
  workspace_id: string;
  workspace_name: string;
  role: string;
  created_at: string;
}

export interface WorkspaceOption {
  id: string;
  name: string;
}
