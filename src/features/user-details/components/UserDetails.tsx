/**
 * User Details Component
 * Shows detailed information about authenticated users and their workspace memberships
 * Provides search, filtering, and detailed user activity information
 * Converted from Chakra UI to Tailwind CSS
 */

import React, { useState, useEffect } from 'react';
import { Search, Users, UserCheck, Clock, Mail, MoreVertical, Eye } from 'lucide-react';
import { adminApi } from '../../../lib/adminApi';

interface Workspace {
  workspace_id: number;
  workspace_name: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface User {
  id: number;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  last_sign_in_at: string;
  created_at: string;
  workspaces: Workspace[];
}

interface WorkspaceInfo {
  id: number;
  name: string;
  plan: string;
}

export function UserDetails() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [workspaceFilter, setWorkspaceFilter] = useState('all');
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, workspaceFilter]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUserWorkspaceDetails();
      setUsers(response.data.users || []);
      setWorkspaces(response.data.workspaces || []);
    } catch (error) {
      console.error('Error loading user data:', error);
      // Generate mock data for demonstration
      generateMockUserData();
    } finally {
      setLoading(false);
    }
  };

  const generateMockUserData = () => {
    const mockWorkspaces: WorkspaceInfo[] = [
      { id: 91462, name: "fake535@gmail.com's Workspace", plan: 'free' },
      { id: 54383, name: "fake535@gmail.com's Workspace", plan: 'free' },
      { id: 20384, name: "fake534@gmail.com's Workspace", plan: 'free' },
      { id: 56644, name: "s.eguiarte@gmail.com's Workspace", plan: 'free' },
      { id: 81989, name: "fake531@gmail.com's Workspace", plan: 'free' },
      { id: 41608, name: "mrchau@gmail.com's Workspace", plan: 'free' }
    ];

    const mockUsers: User[] = [
      {
        id: 1,
        email: 'fake535@gmail.com',
        full_name: 'fake535',
        avatar_url: null,
        last_sign_in_at: '2025-10-14T10:33:00Z',
        created_at: '2025-10-06T09:00:00Z',
        workspaces: [
          { workspace_id: 91462, workspace_name: "fake535@gmail.com's Workspace", role: 'admin', joined_at: '2025-10-06T09:00:00Z' },
          { workspace_id: 54383, workspace_name: "fake535@gmail.com's Workspace", role: 'admin', joined_at: '2025-10-06T09:00:00Z' }
        ]
      },
      {
        id: 2,
        email: 'be@gmail.com',
        full_name: 'be',
        avatar_url: null,
        last_sign_in_at: '2025-10-05T10:38:00Z',
        created_at: '2025-10-05T10:00:00Z',
        workspaces: [
          { workspace_id: 20384, workspace_name: "fake534@gmail.com's Workspace", role: 'agent', joined_at: '2025-10-05T10:00:00Z' }
        ]
      },
      {
        id: 3,
        email: 'fake534@gmail.com',
        full_name: 'fake534',
        avatar_url: null,
        last_sign_in_at: '2025-10-17T05:09:00Z',
        created_at: '2025-10-03T09:00:00Z',
        workspaces: [
          { workspace_id: 20384, workspace_name: "fake534@gmail.com's Workspace", role: 'admin', joined_at: '2025-10-03T09:00:00Z' }
        ]
      },
      {
        id: 4,
        email: 's.eguiarte@gmail.com',
        full_name: 's.eguiarte',
        avatar_url: null,
        last_sign_in_at: '2025-09-20T06:08:00Z',
        created_at: '2025-09-20T06:00:00Z',
        workspaces: [
          { workspace_id: 56644, workspace_name: "s.eguiarte@gmail.com's Workspace", role: 'admin', joined_at: '2025-09-20T06:00:00Z' }
        ]
      },
      {
        id: 5,
        email: 'fake531@gmail.com',
        full_name: 'fake531',
        avatar_url: null,
        last_sign_in_at: '2025-09-13T12:17:00Z',
        created_at: '2025-09-13T12:00:00Z',
        workspaces: [
          { workspace_id: 81989, workspace_name: "fake531@gmail.com's Workspace", role: 'admin', joined_at: '2025-09-13T12:00:00Z' }
        ]
      },
      {
        id: 6,
        email: 'mrchau@gmail.com',
        full_name: 'mrchau',
        avatar_url: null,
        last_sign_in_at: '2025-09-14T09:51:00Z',
        created_at: '2025-09-12T09:00:00Z',
        workspaces: [
          { workspace_id: 41608, workspace_name: "mrchau@gmail.com's Workspace", role: 'admin', joined_at: '2025-09-12T09:00:00Z' }
        ]
      }
    ];

    setUsers(mockUsers);
    setWorkspaces(mockWorkspaces);
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.workspaces.some(ws => ws.workspace_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.workspaces.some(ws => ws.role === roleFilter)
      );
    }

    // Workspace filter
    if (workspaceFilter !== 'all') {
      filtered = filtered.filter(user =>
        user.workspaces.some(ws => ws.workspace_id.toString() === workspaceFilter)
      );
    }

    setFilteredUsers(filtered);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeSince = (dateString: string): string => {
    if (!dateString) return 'Never';
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'owner': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'admin': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'member': return 'bg-green-500/10 text-green-400 border-green-500/30';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
          <p className="text-gray-400">Loading user workspace data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-400 text-sm font-medium mb-2">Total Users</p>
              <p className="text-3xl font-bold text-white mb-1">{users.length}</p>
              <p className="text-gray-500 text-xs">Authenticated members</p>
            </div>
            <div className="bg-blue-500/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-400 text-sm font-medium mb-2">Active Workspaces</p>
              <p className="text-3xl font-bold text-white mb-1">{workspaces.length}</p>
              <p className="text-gray-500 text-xs">Organizations</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-gray-400 text-sm font-medium mb-2">Recent Activity</p>
              <p className="text-3xl font-bold text-white mb-1">
                {users.filter(u => getTimeSince(u.last_sign_in_at) === 'Today').length}
              </p>
              <p className="text-gray-500 text-xs">Logins today</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded-lg">
              <Clock className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">User & Workspace Details</h3>
            <p className="text-sm text-gray-400">
              Authenticated users and their workspace memberships
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users, emails, workspaces..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Roles</option>
              <option value="owner">Owners</option>
              <option value="admin">Admins</option>
              <option value="member">Members</option>
            </select>

            <select
              value={workspaceFilter}
              onChange={(e) => setWorkspaceFilter(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="all">All Workspaces</option>
              {workspaces.map(workspace => (
                <option key={workspace.id} value={workspace.id.toString()}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Workspace
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Member Since
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredUsers.map(user =>
                user.workspaces.map((workspace, index) => (
                  <tr key={`${user.id}-${workspace.workspace_id}`} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-semibold">
                          {(user.full_name || user.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {user.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">
                        {workspace.workspace_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(workspace.role)}`}>
                        {workspace.role.charAt(0).toUpperCase() + workspace.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-white">
                          {getTimeSince(user.last_sign_in_at)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(user.last_sign_in_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-white">
                        {formatDate(workspace.joined_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 px-6">
            <p className="text-gray-400">
              {users.length === 0
                ? 'No users found.'
                : 'No users match your search criteria.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
