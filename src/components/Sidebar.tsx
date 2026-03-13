"use client";

import React from 'react';
import {
  Activity,
  Database,
  Cpu,
  Users,
  HeadphonesIcon,
  LayoutDashboard,
  Mic,
  ShieldCheck,
  LogOut,
  CalendarDays,
  UserCircle,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AuthUser, clearAuth } from '@/lib/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: AuthUser | null;
}

const ALL_ITEMS = [
  { id: 'overview',     label: 'Dashboard',        icon: LayoutDashboard, adminOnly: true  },
  { id: 'terminal',     label: 'Voice Terminal',    icon: Mic,             adminOnly: false },
  { id: 'performance',  label: 'Conversation Metrics', icon: HeadphonesIcon,  adminOnly: true  },
  { id: 'knowledge',    label: 'Knowledge Base',    icon: Database,        adminOnly: true  },
  { id: 'fleet',        label: 'Fleet Operations',  icon: Cpu,             adminOnly: true  },
  { id: 'engagement',   label: 'Sales & Engagement',icon: Users,           adminOnly: true  },
  { id: 'calendar',     label: 'Activity Calendar', icon: CalendarDays,    adminOnly: true  },
  { id: 'customer-metrics', label: 'Customer Metrics', icon: TrendingUp,     adminOnly: true  },
  { id: 'customers',    label: 'Customer Profiles', icon: UserCircle,      adminOnly: true  },
  { id: 'users',        label: 'User Management',   icon: ShieldCheck,     adminOnly: true  },
];

const Sidebar = ({ activeTab, setActiveTab, user }: SidebarProps) => {
  const isAdmin = user?.role === 'admin';
  const menuItems = ALL_ITEMS.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/login';
  };

  return (
    <div className="w-64 h-screen fixed left-0 top-0 bg-white border-r border-base-200 flex flex-col pt-8 pb-6 shadow-sm">
      <div className="px-6 mb-12">
        <img 
          src="/FinalFile-HelloGard-Logo.avif" 
          alt="HelloGard Logo" 
          className="h-10 w-auto object-contain"
        />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <h2 className="px-3 text-xs font-semibold text-base-400 uppercase tracking-wider mb-4">
          {isAdmin ? 'Dashboards' : 'Workspace'}
        </h2>
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative text-sm font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-base-600 hover:bg-base-50 hover:text-base-900'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-primary-600' : 'text-base-400'}`} />
              {item.label}

              {isActive && (
                <motion.div
                  layoutId="sidebarActiveIndicator"
                  className="absolute left-0 w-1 h-5 bg-primary-600 rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 mt-auto pt-4 border-t border-base-100 space-y-2">
        {user && (
          <div className="px-3 py-2.5 rounded-lg bg-base-50 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-base-900 truncate">{user.name}</div>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  isAdmin ? 'bg-primary-100 text-primary-600' : 'bg-base-200 text-base-500'
                }`}>
                  {isAdmin ? 'Admin' : 'Operator'}
                </span>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-600 hover:bg-base-50 hover:text-base-900 transition-colors"
        >
          <LogOut className="w-4 h-4 text-base-400" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
