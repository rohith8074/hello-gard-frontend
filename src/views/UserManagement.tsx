"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { adminListUsers, adminApproveUser, adminToggleRole, adminToggleSuspend, adminRejectUser } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import { Users, CheckCircle2, ShieldCheck, Shield, Ban, RefreshCw, Clock, XCircle } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  status: 'pending' | 'active' | 'suspended';
  created_at: string | null;
  approved_by: string | null;
  daily_sessions_used: number;
  daily_session_limit: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-600 border-red-200',
};

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-primary-50 text-primary-700 border-primary-200',
  operator: 'bg-base-100 text-base-600 border-base-200',
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const currentUser = getStoredUser();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminListUsers();
      setUsers(data.users || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleReject = async (userId: string, username: string) => {
    if (!confirm(`Reject and permanently remove user "${username}"?`)) return;
    setActionLoading(userId + '_reject');
    try {
      await adminRejectUser(userId);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (userId: string) => {
    setActionLoading(userId + '_approve');
    try {
      await adminApproveUser(userId);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId: string) => {
    setActionLoading(userId + '_role');
    try {
      await adminToggleRole(userId);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleSuspend = async (userId: string) => {
    setActionLoading(userId + '_suspend');
    try {
      await adminToggleSuspend(userId);
      await fetchUsers();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'all' ? users : users.filter(u => u.status === filter);
  const counts = {
    all: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-base-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-600" />
            User Management
          </h2>
          <p className="text-sm text-base-500 mt-0.5">Approve access requests and manage roles</p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-base-600 hover:text-base-900 px-3 py-2 rounded-lg border border-base-200 hover:border-base-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-base-100 rounded-xl p-1 w-fit">
        {(['all', 'pending', 'active', 'suspended'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize flex items-center gap-1.5 ${
              filter === f ? 'bg-white text-base-900 shadow-sm' : 'text-base-500 hover:text-base-700'
            }`}
          >
            {f === 'pending' && counts.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="text-xs text-base-400">{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="classic-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-base-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-base-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No {filter !== 'all' ? filter : ''} users found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-base-100">
                <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-6 py-3">User</th>
                <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3">Joined</th>
                <th className="text-right text-xs font-semibold text-base-400 uppercase tracking-wider px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base-50">
              {filtered.map(u => {
                const isSelf = u.username === currentUser?.username;
                return (
                  <tr key={u.id} className="hover:bg-base-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-base-900 flex items-center gap-1.5">
                            {u.name}
                            {isSelf && <span className="text-[10px] bg-primary-50 text-primary-600 border border-primary-100 px-1.5 py-0.5 rounded-full font-medium">You</span>}
                          </div>
                          <div className="text-xs text-base-400">@{u.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border capitalize ${STATUS_STYLES[u.status]}`}>
                        {u.status === 'pending' && <Clock className="w-3 h-3" />}
                        {u.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                        {u.status === 'suspended' && <Ban className="w-3 h-3" />}
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border capitalize ${ROLE_STYLES[u.role]}`}>
                        {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs text-base-400">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        {/* Approve + Reject — only for pending users */}
                        {u.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(u.id)}
                              disabled={actionLoading === u.id + '_approve'}
                              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === u.id + '_approve' ? (
                                <span className="w-3 h-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(u.id, u.username)}
                              disabled={actionLoading === u.id + '_reject'}
                              className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {actionLoading === u.id + '_reject' ? (
                                <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              Reject
                            </button>
                          </>
                        )}

                        {/* Toggle admin — only for active users, not self */}
                        {u.status === 'active' && !isSelf && (
                          <button
                            onClick={() => handleToggleRole(u.id)}
                            disabled={actionLoading === u.id + '_role'}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                              u.role === 'admin'
                                ? 'bg-base-50 text-base-600 border-base-200 hover:bg-base-100'
                                : 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
                            }`}
                            title={u.role === 'admin' ? 'Remove admin access' : 'Grant admin access'}
                          >
                            {actionLoading === u.id + '_role' ? (
                              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                        )}

                        {/* Suspend / Unsuspend — not for pending, not for self */}
                        {u.status !== 'pending' && !isSelf && (
                          <button
                            onClick={() => handleToggleSuspend(u.id)}
                            disabled={actionLoading === u.id + '_suspend'}
                            className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                              u.status === 'suspended'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {actionLoading === u.id + '_suspend' ? (
                              <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            {u.status === 'suspended' ? 'Restore' : 'Suspend'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
