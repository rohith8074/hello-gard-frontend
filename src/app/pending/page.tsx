"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Clock, LogOut } from 'lucide-react';
import { getStoredUser, clearAuth } from '@/lib/auth';

export default function PendingPage() {
  const router = useRouter();
  const user = getStoredUser();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.status === 'active') {
      router.replace('/');
    }
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-base-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-base-900 leading-tight">HelloGard</h1>
            <p className="text-xs text-base-500 font-medium tracking-wide">ENTERPRISE PLATFORM</p>
          </div>
        </div>

        <div className="classic-card p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-base-900 mb-2">Awaiting approval</h2>
          <p className="text-sm text-base-500 mb-2">
            Hi <span className="font-semibold text-base-700">{user?.name}</span>, your account has been created.
          </p>
          <p className="text-sm text-base-500 mb-8">
            An admin needs to approve your access before you can use the platform. This usually happens within a few hours.
          </p>

          <div className="flex items-center gap-2 justify-center text-xs text-base-400 bg-base-50 border border-base-100 rounded-lg py-3 px-4 mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Pending admin review
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 mx-auto text-sm text-base-500 hover:text-base-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
