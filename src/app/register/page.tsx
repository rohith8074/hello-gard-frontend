"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, UserPlus } from 'lucide-react';
import { registerUser } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: '', name: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await registerUser(form.username.trim(), form.name.trim(), form.password);
      setDone(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm classic-card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-base-900 mb-2">Request submitted</h2>
          <p className="text-sm text-base-500 mb-8">
            Your account is pending admin approval. You'll be able to sign in once approved.
          </p>
          <a href="/login" className="inline-block w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors text-center">
            Back to Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-base-900 leading-tight">HelloGard</h1>
            <p className="text-xs text-base-500 font-medium tracking-wide">ENTERPRISE PLATFORM</p>
          </div>
        </div>

        <div className="classic-card p-8">
          <h2 className="text-xl font-bold text-base-900 mb-1">Request access</h2>
          <p className="text-sm text-base-500 mb-7">Your account will be reviewed by an admin</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-lg border border-base-200 bg-white text-sm text-base-900 placeholder-base-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={e => set('username', e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-base-200 bg-white text-sm text-base-900 placeholder-base-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-base-200 bg-white text-sm text-base-900 placeholder-base-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600" tabIndex={-1}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-base-700 mb-1.5">Confirm password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-base-200 bg-white text-sm text-base-900 placeholder-base-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                placeholder="Repeat password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors mt-1"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? 'Submitting...' : 'Request access'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-base-500">
            Already have an account?{' '}
            <a href="/login" className="text-primary-600 font-semibold hover:underline">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
