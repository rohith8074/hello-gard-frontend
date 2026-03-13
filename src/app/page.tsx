"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import VoiceAgentDashboard from '../views/VoiceAgentDashboard';
import GlobalDashboard from '../views/GlobalDashboard';
import LiveVoiceTerminal from '../views/LiveVoiceTerminal';
import KnowledgeDashboard from '../views/KnowledgeDashboard';
import FleetDashboard from '../views/FleetDashboard';
import ClientEngagementDashboard from '../views/ClientEngagementDashboard';
import UserManagement from '../views/UserManagement';
import CalendarDashboard from '../views/CalendarDashboard';
import CustomerProfiles from '../views/CustomerProfiles';
import CustomerMetrics from '../views/CustomerMetrics';
import { format, subDays } from 'date-fns';
import { getActiveCalls, getMe } from '@/lib/api';
import { motion } from 'framer-motion';
import { Building2, Filter } from 'lucide-react';
import { getToken, getStoredUser, saveAuth, clearAuth, AuthUser } from '@/lib/auth';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [globalFilter, setGlobalFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7'); 
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tabContext, setTabContext] = useState<any>(null);
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(new Set(['overview']));

  // Auth check on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    // Verify token is still valid and get fresh user data
    getMe()
      .then((freshUser) => {
        const stored = getStoredUser();
        if (stored) {
          const updated: AuthUser = { ...stored, ...freshUser };
          saveAuth(token, updated);
          if (freshUser.status === 'pending') {
            router.replace('/pending');
          } else if (freshUser.status === 'suspended') {
            clearAuth();
            router.replace('/login');
          } else {
            setUser(updated);
            // Operators can only see terminal
            if (updated.role === 'operator') setActiveTab('terminal');
            setAuthChecked(true);
          }
        }
      })
      .catch(() => {
        clearAuth();
        router.replace('/login');
      });
  }, []);

  const handleTabChange = (tab: string, context: any = null) => {
    setActiveTab(tab);
    setTabContext(context);
    setMountedTabs(prev => new Set([...prev, tab]));
  };

  const isAdmin = user?.role === 'admin';

  const ActiveCallsCounter = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      const fetch = async () => {
        const res = await getActiveCalls();
        if (res?.success) setCount(res.count);
      };
      fetch();
      const interval = setInterval(fetch, 10000);
      return () => clearInterval(interval);
    }, []);

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 border border-primary-100">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-600"></span>
        </span>
        <span className="text-xs font-bold leading-none">{count} Live Calls</span>
      </div>
    );
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-base-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          <p className="text-sm text-base-400">Loading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full relative overflow-hidden bg-base-50">
      <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} user={user} />

      <main className="flex-1 ml-64 p-6 lg:p-8 xl:p-12 z-10 w-[calc(100%-16rem)] overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-base-200">
          <div>
            <h1 className="text-3xl font-bold text-base-900 flex items-center gap-2">
              HelloGard <span className="text-primary-600 font-normal">Platform</span>
            </h1>
            <p className="text-sm text-base-600 mt-1">Enterprise Fleet Operations & AI Support Manager</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-500/10 border border-success-500/20 text-success-500">
              <div className="w-2 h-2 rounded-full bg-success-500" />
              <span className="text-xs font-medium hide-on-mobile">All Systems Operational</span>
            </div>

            <ActiveCallsCounter />

            {isAdmin && (
              <div className="flex items-center gap-4 border-l border-base-200 pl-6">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-base-400" />
                  <select
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="bg-transparent text-sm font-semibold text-base-800 outline-none cursor-pointer hover:text-primary-600 transition-colors"
                    title="Global Hardware Filter"
                  >
                    <option value="all">Entire Fleet (All Products)</option>
                    <option value="sp50">CenoBots SP50</option>
                    <option value="w3">Keenon W3 Delivery</option>
                    <option value="v3">temi V3 Interactive</option>
                    <option value="k5">Knightscope K5 Security</option>
                    <option value="yarbo">Yarbo Outdoor</option>
                  </select>
                </div>


              </div>
            )}
          </div>
        </header>

        {/* Admin-only tabs */}
        {isAdmin && mountedTabs.has('overview') && (
          <div className={activeTab !== 'overview' ? 'hidden' : ''}>
            <GlobalDashboard 
              productFilter={globalFilter} 
              dateRange={Number(dateRange)}
              startDate={startDate}
              endDate={endDate}
              changeTab={handleTabChange} 
            />
          </div>
        )}

        {/* Voice Terminal — all roles */}
        {mountedTabs.has('terminal') && (
          <div className={activeTab !== 'terminal' ? 'hidden' : ''}>
            <LiveVoiceTerminal />
          </div>
        )}

        {isAdmin && mountedTabs.has('performance') && (
          <div className={activeTab !== 'performance' ? 'hidden' : ''}>
            <VoiceAgentDashboard 
              productFilter={globalFilter} 
              dateRange={Number(dateRange)}
              startDate={startDate}
              endDate={endDate}
              initialAction={activeTab === 'performance' ? tabContext : null}
              changeTab={handleTabChange}
            />
          </div>
        )}
        {isAdmin && mountedTabs.has('knowledge') && (
          <div className={activeTab !== 'knowledge' ? 'hidden' : ''}>
            <KnowledgeDashboard 
              productFilter={globalFilter} 
              startDate={startDate}
              endDate={endDate}
              changeTab={handleTabChange}
              initialAction={activeTab === 'knowledge' ? tabContext : null}
            />
          </div>
        )}
        {isAdmin && mountedTabs.has('fleet') && (
          <div className={activeTab !== 'fleet' ? 'hidden' : ''}>
            <FleetDashboard productFilter={globalFilter} />
          </div>
        )}
        {isAdmin && mountedTabs.has('engagement') && (
          <div className={activeTab !== 'engagement' ? 'hidden' : ''}>
            <ClientEngagementDashboard
              productFilter={globalFilter}
              startDate={startDate}
              endDate={endDate}
              initialAction={activeTab === 'engagement' ? tabContext : null}
              changeTab={handleTabChange}
            />
          </div>
        )}
        {isAdmin && mountedTabs.has('calendar') && (
          <div className={activeTab !== 'calendar' ? 'hidden' : ''}>
            <CalendarDashboard productFilter={globalFilter} changeTab={handleTabChange} />
          </div>
        )}
        {isAdmin && mountedTabs.has('customer-metrics') && (
          <div className={activeTab !== 'customer-metrics' ? 'hidden' : ''}>
            <CustomerMetrics 
              productFilter={globalFilter} 
              startDate={startDate}
              endDate={endDate}
              changeTab={handleTabChange}
            />
          </div>
        )}
        {isAdmin && mountedTabs.has('customers') && (
          <div className={activeTab !== 'customers' ? 'hidden' : ''}>
            <CustomerProfiles 
              productFilter={globalFilter || 'all'} 
              changeTab={handleTabChange} 
              initialAction={activeTab === 'customers' ? tabContext : null} 
            />
          </div>
        )}
        {isAdmin && mountedTabs.has('users') && (
          <div className={activeTab !== 'users' ? 'hidden' : ''}>
            <UserManagement />
          </div>
        )}
      </main>
    </div>
  );
}
