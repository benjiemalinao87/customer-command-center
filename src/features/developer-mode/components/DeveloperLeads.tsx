/**
 * Developer Leads Panel Component
 *
 * This component displays and manages leads from the Developer Program
 * landing page (/developers). These are people interested in becoming
 * developers but haven't signed up yet.
 *
 * Different from DeveloperApplications which handles workspace applications.
 *
 * Features:
 * - View all leads with status filtering
 * - Search leads by name, email, or company
 * - Update lead status (pending, contacted, approved, rejected)
 * - View lead details including intended use
 * - Send emails directly to leads
 */

import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  ExternalLink,
  Mail,
  Globe,
  FileText,
  Users,
  RefreshCw,
  Phone,
  Building2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface DeveloperLead {
  id: string;
  developer_name: string;
  developer_email: string;
  company?: string;
  website?: string;
  experience?: string;
  intended_use: string;
  phone?: string;
  referral_code?: string;
  status?: string;
  created_at: string;
  updated_at?: string;
}

// Valid statuses from DB constraint: pending, contacted, approved, rejected
type StatusFilter = 'all' | 'pending' | 'contacted' | 'approved' | 'rejected';

export function DeveloperLeads() {
  const [leads, setLeads] = useState<DeveloperLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<DeveloperLead | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('developer_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading developer leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    setActionLoading(leadId);
    try {
      const { error } = await supabase
        .from('developer_leads')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;
      await loadLeads();
      setSelectedLead(null);
    } catch (error) {
      console.error('Error updating lead status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    const effectiveStatus = status || 'pending';
    const badges = {
      pending: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
          <Clock className="w-3 h-3" />
          PENDING
        </span>
      ),
      contacted: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          <Mail className="w-3 h-3" />
          CONTACTED
        </span>
      ),
      approved: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle2 className="w-3 h-3" />
          APPROVED
        </span>
      ),
      rejected: (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <XCircle className="w-3 h-3" />
          REJECTED
        </span>
      )
    };
    return badges[effectiveStatus as keyof typeof badges] || badges.pending;
  };

  const filteredLeads = leads.filter(lead => {
    const effectiveStatus = lead.status || 'pending';
    const matchesFilter = statusFilter === 'all' || effectiveStatus === statusFilter;

    if (!matchesFilter) return false;
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      lead.developer_name?.toLowerCase().includes(query) ||
      lead.developer_email?.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query)
    );
  });

  const statusCounts = {
    pending: leads.filter(l => !l.status || l.status === 'pending').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    approved: leads.filter(l => l.status === 'approved').length,
    rejected: leads.filter(l => l.status === 'rejected').length
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysAgo === 0) return 'Today';
    if (daysAgo === 1) return '1 day ago';
    return `${daysAgo} days ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Developer Program Leads
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage signups from the developer program landing page
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadLeads}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{leads.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Contacted</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.contacted}</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.approved}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setStatusFilter('all')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'all'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          All ({leads.length})
        </button>
        <button
          onClick={() => setStatusFilter('pending')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'pending'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Pending ({statusCounts.pending})
        </button>
        <button
          onClick={() => setStatusFilter('contacted')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'contacted'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Contacted ({statusCounts.contacted})
        </button>
        <button
          onClick={() => setStatusFilter('approved')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'approved'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Approved ({statusCounts.approved})
        </button>
        <button
          onClick={() => setStatusFilter('rejected')}
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === 'rejected'
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Rejected ({statusCounts.rejected})
        </button>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {searchQuery || statusFilter !== 'all'
                ? 'No leads match your filters'
                : 'No developer leads yet'}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Leads will appear when developers sign up on the landing page
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {lead.developer_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {lead.developer_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {lead.developer_email}
                      </p>
                    </div>
                    {getStatusBadge(lead.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {lead.company && (
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span>{lead.company}</span>
                      </div>
                    )}

                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{lead.phone}</span>
                      </div>
                    )}

                    {lead.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {lead.website}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {lead.experience && (
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{lead.experience}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      What they want to build:
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border-l-4 border-blue-500">
                      {lead.intended_use}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Submitted {formatRelativeDate(lead.created_at)}</span>
                    {lead.referral_code && (
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        Referral: {lead.referral_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <a
                    href={`mailto:${lead.developer_email}?subject=Your Customer Connect Developer Application`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                  >
                    <Mail className="w-4 h-4" />
                    Email
                  </a>

                  {(!lead.status || lead.status === 'pending') && (
                    <>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'contacted')}
                        disabled={actionLoading === lead.id}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                      >
                        <Mail className="w-4 h-4" />
                        Mark Contacted
                      </button>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'approved')}
                        disabled={actionLoading === lead.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'rejected')}
                        disabled={actionLoading === lead.id}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg font-medium transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}

                  {lead.status === 'contacted' && (
                    <>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'approved')}
                        disabled={actionLoading === lead.id}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'rejected')}
                        disabled={actionLoading === lead.id}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-300 dark:border-red-600 rounded-lg font-medium transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
