"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  User, X, Phone, Star, Clock, Tag, ChevronRight, Filter, Search, 
  Cpu, Building2, Mail, ExternalLink, CalendarCheck, DollarSign, 
  AlertCircle, MessageSquare, ArrowUpRight, RefreshCw, TrendingUp, Trophy, Zap, ShieldAlert, FileText
} from 'lucide-react';
import { getCustomerProfiles, getCustomerDetail, getCallDetail, getCustomerInsights } from '@/lib/api';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

const CSAT_COLORS: Record<number, string> = {
  1: 'text-red-500', 2: 'text-orange-500', 3: 'text-amber-500',
  4: 'text-emerald-400', 5: 'text-emerald-600'
};

const toShortNum = (id: string) => {
  if (!id) return "XXXX";
  if (id.startsWith('Call_ID') || id.startsWith('Ticket_ID') || id.startsWith('Sales_ID')) return id;
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = clean.slice(-6);
  let n = 0;
  for (let i = 0; i < tail.length; i++) n = (n * 36 + parseInt(tail[i], 36)) % 100000;
  return String(n).padStart(4, '0');
};

interface ProfileSummary {
  profile_id: string;
  name: string;
  email: string;
  company: string;
  last_active: string;
  products: string[];
  calls_count: number;
  tickets_count: number;
  avg_csat: number | null;
  status: string;
}

interface CustomerProfilesProps {
  productFilter?: string;
  changeTab?: (tab: string, context?: any) => void;
  initialAction?: { type: string; id?: string } | null;
}

export default function CustomerProfiles({ productFilter = 'all', changeTab, initialAction }: CustomerProfilesProps) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  
  // Detailed View State
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Nested Detail State (for opening a specific call/ticket from the user profile)
  const [nestedItem, setNestedItem] = useState<{type: 'call' | 'ticket' | 'lead', data: any} | null>(null);
  const [loadingNested, setLoadingNested] = useState(false);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomerProfiles(productFilter, 100, search, undefined, undefined, segment);
      setProfiles(res.profiles || []);
    } catch (e) {
      console.error('Failed to fetch customer data', e);
    } finally {
      setLoading(false);
    }
  }, [productFilter, search, segment]);

  useEffect(() => { 
    const debounce = setTimeout(fetchProfiles, 300);
    return () => clearTimeout(debounce);
  }, [fetchProfiles]);
  
  // Handle deep-linking from initialAction
  useEffect(() => {
    if (initialAction?.type === 'show_user' && initialAction.id) {
      handleSelectUser(initialAction.id);
    }
  }, [initialAction]);

  const handleSelectUser = async (userId: string) => {
    setSelectedUserId(userId);
    setLoadingDetail(true);
    setUserDetail(null);
    setNestedItem(null);
    try {
      const res = await getCustomerDetail(userId);
      if (res.success) setUserDetail(res);
    } catch (e) {
      console.error('Failed to fetch user detail', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openNestedDetail = async (type: 'call' | 'ticket' | 'lead', item: any) => {
    setLoadingNested(true);
    setNestedItem({ type, data: item });
    
    if (type === 'call') {
      try {
        const full = await getCallDetail(item.call_id);
        setNestedItem({ type, data: { ...item, ...full } });
      } catch (e) {
        console.error("Failed to fetch full call detail", e);
      }
    }
    setLoadingNested(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-base-900 flex items-center gap-2">
            <User className="w-5 h-5 text-primary-600" />
            Customer Profiles
          </h2>
          <p className="text-sm text-base-500 mt-0.5">Manage customer relationships and persona data</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-base-200 rounded-xl w-64 shadow-sm focus-within:ring-2 ring-primary-500/10 transition-all text-base-800">
                <Search className="w-4 h-4 text-base-400 shrink-0" />
                <input
                    type="text"
                    placeholder="Search users, company..."
                    className="bg-transparent border-none outline-none text-sm w-full"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-white border border-base-200 rounded-xl shadow-sm hover:border-base-300 transition-all">
                <Filter className="w-3.5 h-3.5 text-base-400" />
                <select 
                  className="bg-transparent border-none outline-none text-xs font-bold text-base-700 cursor-pointer"
                  value={segment}
                  onChange={(e) => setSegment(e.target.value)}
                >
                  <option value="all">All Segments</option>
                  <option value="platinum">Platinum</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="at-risk">At-Risk</option>
                </select>
            </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-base-100 pt-6">
        <h3 className="text-sm font-black uppercase tracking-widest text-base-400">Customer Directory</h3>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase text-base-400 px-2 py-1 rounded bg-base-50">{profiles.length} Results</span>
        </div>
      </div>

      {/* Grid of User Cards */}
      <div>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-56 bg-base-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="classic-card py-24 text-center">
          <div className="w-16 h-16 bg-base-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-base-300" />
          </div>
          <p className="text-base font-medium text-base-500">No matching user profiles found</p>
          <button onClick={() => setSearch('')} className="mt-4 text-primary-600 font-bold text-sm hover:underline">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {profiles.map((p, i) => (
            <motion.div
              key={p.profile_id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleSelectUser(p.profile_id)}
              className={`classic-card p-5 cursor-pointer transition-all group flex flex-col gap-4 bg-white ${
                selectedUserId === p.profile_id 
                  ? 'ring-2 ring-primary-600 border-primary-200 shadow-xl scale-[1.02] bg-primary-50/20 z-10' 
                  : selectedUserId 
                    ? 'opacity-40 grayscale-[50%] hover:opacity-60 scale-95' 
                    : 'hover:border-primary-300 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-primary-600 group-hover:text-white transition-colors uppercase">
                  {p.name.charAt(0)}
                </div>
                   <div className="flex flex-col items-end gap-1.5">
                    {(() => {
                        const score = (p.calls_count > 10 ? 40 : p.calls_count * 4) + 
                                     ((p.avg_csat || 0) * 10) + 
                                     (p.products.length * 5);
                        const tier = score >= 80 ? { label: 'Platinum', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' } :
                                     score >= 60 ? { label: 'Gold', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' } :
                                     score >= 40 ? { label: 'Silver', color: 'bg-amber-50 text-amber-600 border-amber-100' } :
                                     { label: 'At-Risk', color: 'bg-rose-50 text-rose-600 border-rose-100' };
                        return (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shadow-sm ${tier.color}`}>
                            {tier.label}
                          </span>
                        );
                    })()}
                    <div className="flex gap-1 justify-end">
                      {p.products.slice(0, 2).map(prod => (
                          <div key={prod} className="w-5 h-5 rounded-lg bg-base-100 flex items-center justify-center border border-base-200" title={PRODUCT_LABELS[prod]}>
                              <Cpu className="w-3 h-3 text-base-400" />
                          </div>
                      ))}
                    </div>
                   </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-base-900 group-hover:text-primary-700 transition-colors">{p.name}</h3>
                <p className="text-xs text-base-500 flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3" /> {p.company}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-base-100">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-base-400 uppercase tracking-tighter">Interactions</span>
                    <span className="text-sm font-bold text-base-800">{p.calls_count} calls</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-base-400 uppercase tracking-tighter">Satisfaction</span>
                    <span className={`text-sm font-bold ${p.avg_csat ? CSAT_COLORS[Math.round(p.avg_csat)] : 'text-base-400'}`}>
                        {p.avg_csat ? `${p.avg_csat}/5` : 'N/A'}
                    </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-auto">
                 <span className="text-[10px] text-base-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 
                    {p.last_active ? new Date(p.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                 </span>
                 <ChevronRight className="w-4 h-4 text-base-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </div>

      {/* Slide-out User Profile Detail Panel */}
      <AnimatePresence>
        {selectedUserId && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-[650px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.15)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            {loadingDetail ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm text-base-400 font-medium">Loading persona data...</p>
                </div>
            ) : userDetail && (
                <>
                {/* Profile Header */}
                <div className="px-8 py-8 border-b border-base-100 bg-base-50/50">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-5">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-primary-600 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-primary-100 border-4 border-white uppercase">
                                {userDetail.user.name.charAt(0)}
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-base-900 tracking-tight">{userDetail.user.name}</h1>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                    {(() => {
                                        const score = (userDetail.metrics.total_calls > 10 ? 40 : userDetail.metrics.total_calls * 4) + 
                                                     ((userDetail.metrics.avg_csat || 0) * 10) + 
                                                     (userDetail.user.products_owned?.length * 5 || 0);
                                        const tier = score >= 80 ? { label: 'Platinum', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' } :
                                                     score >= 60 ? { label: 'Gold', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' } :
                                                     score >= 40 ? { label: 'Silver', color: 'bg-amber-50 text-amber-600 border-amber-100' } :
                                                     { label: 'At-Risk', color: 'bg-rose-50 text-rose-600 border-rose-100' };
                                        return (
                                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-sm uppercase ${tier.color}`}>
                                            {tier.label}
                                          </span>
                                        );
                                    })()}
                                    <span className="text-sm font-bold text-base-600 flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5 text-base-400" /> {userDetail.user.company}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-base-300" />
                                    <span className="text-sm font-bold text-primary-600 flex items-center gap-1">
                                        <User className="w-3.5 h-3.5 text-primary-400" /> ID: {userDetail.user.user_id}
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-base-300" />
                                    <span className="text-sm font-medium text-base-500 flex items-center gap-1">
                                        <Mail className="w-3.5 h-3.5 text-base-400" /> {userDetail.user.email}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setSelectedUserId(null)} className="p-2.5 hover:bg-white hover:shadow-sm rounded-2xl border border-transparent hover:border-base-200 transition-all">
                            <X className="w-6 h-6 text-base-400" />
                        </button>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-5 gap-3 mt-8">
                        {[
                            { label: 'Total Calls', val: userDetail.metrics.total_calls, icon: Phone, color: 'text-primary-600', bg: 'bg-primary-50' },
                            { label: 'Avg CSAT', val: `${userDetail.metrics.avg_csat}/5`, icon: Star, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Knowledge Trust', val: `${Math.round(userDetail.metrics.avg_rag * 100)}%`, icon: Cpu, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { label: 'Open Tickets', val: userDetail.metrics.open_tickets, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                            { label: 'Sales Value', val: `$${userDetail.metrics.pipeline_value.toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-3.5 rounded-2xl border border-base-200/60 shadow-sm flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                                    <stat.icon size={18} />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-base-400 uppercase tracking-widest leading-none mb-1">{stat.label}</div>
                                    <div className="text-sm font-black text-base-900 leading-none">{stat.val}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Profile Detail Navigation */}
                <div className="sticky top-0 bg-white z-20 px-8 py-3 border-b border-base-100 flex gap-4">
                    {[
                        { id: 'overview', label: 'Overview', icon: User, show: true },
                        { id: 'interactions', label: 'Conversations', icon: MessageSquare, count: userDetail.activities.calls.length, show: userDetail.activities.calls.length > 0 },
                        { id: 'tickets', label: 'Tickets', icon: AlertCircle, count: userDetail.activities.tickets.length, show: userDetail.activities.tickets.length > 0 },
                        { id: 'sales', label: 'Sales Leads', icon: DollarSign, count: userDetail.activities.leads.length, show: userDetail.activities.leads.length > 0 },
                    ].filter(tab => tab.show).map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                const el = document.getElementById(`section-${tab.id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-base-50 text-base-500 hover:text-primary-600"
                        >
                            <tab.icon size={14} />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className="ml-1 bg-base-100 text-base-400 px-1.5 py-0.5 rounded-md text-[10px]">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Detailed Activities */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10 bg-white">
                    <div id="section-overview" className="scroll-mt-4">
                        <section>
                            <h4 className="flex items-center gap-2 text-xs font-black text-base-400 uppercase tracking-[0.15em] mb-4">
                                <Cpu size={14} className="text-base-300" /> Products in Use
                            </h4>
                            <div className="flex flex-wrap gap-2.5">
                                {userDetail.user.products_owned?.map((prod: string) => (
                                    <div key={prod} className="px-4 py-2.5 bg-base-50 border border-base-200 rounded-xl flex items-center gap-2.5 hover:border-primary-200 transition-colors cursor-default">
                                        <div className="w-7 h-7 rounded-lg bg-white border border-base-100 flex items-center justify-center shadow-xs">
                                            <Cpu className="w-4 h-4 text-primary-500" />
                                        </div>
                                        <span className="text-sm font-bold text-base-800">{PRODUCT_LABELS[prod] || prod}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Conversations & Demos */}
                    {userDetail.activities.calls.length > 0 && (
                        <section id="section-interactions" className="scroll-mt-4">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-base-400 uppercase tracking-[0.15em]">
                                    <MessageSquare size={14} className="text-base-300" /> Recent Interactions
                                </h4>
                                {userDetail.metrics.demo_requests > 0 && (
                                    <span className="bg-purple-50 text-purple-600 text-[10px] font-black px-2.5 py-1 rounded-full border border-purple-100 uppercase tracking-wider">
                                        {userDetail.metrics.demo_requests} Demo Request{userDetail.metrics.demo_requests > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {userDetail.activities.calls.map((call: any) => (
                                    <div 
                                        key={call.call_id} 
                                        onClick={() => openNestedDetail('call', call)}
                                        className="p-4 rounded-2xl border border-base-100 hover:border-primary-200 hover:bg-base-50 transition-all cursor-pointer group flex items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${call.outcome === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-base-100 text-base-500'}`}>
                                                <Phone size={18} />
                                            </div>
                                            <div className="truncate">
                                                <div className="text-sm font-bold text-base-900 capitalize leading-snug truncate">
                                                    {call.primary_topic?.replace(/_/g, ' ') || 'General Support'}
                                                </div>
                                                <div className="text-[11px] text-base-500 mt-0.5 flex items-center gap-2">
                                                    <span className="font-mono font-bold text-base-400">{new Date(call.processed_at).toLocaleDateString()}</span>
                                                    <div className="w-1 h-1 rounded-full bg-base-300" />
                                                    <span>{call.duration_seconds}s</span>
                                                    {call.predicted_csat && (
                                                        <span className={`flex items-center gap-0.5 ${CSAT_COLORS[Math.round(call.predicted_csat)]}`}>
                                                            <Star size={10} fill="currentColor" /> {call.predicted_csat}/5
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-mono font-bold text-base-400 bg-base-100 px-2 py-1 rounded-lg">
                                                {call.call_id.startsWith('Call_ID') ? call.call_id : `CALL-${toShortNum(call.call_id)}`}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border ${call.outcome === 'resolved' ? 'border-emerald-100 text-emerald-600 bg-emerald-50' : 'border-base-100 text-base-400 bg-base-50'}`}>
                                                {call.outcome}
                                            </span>
                                            <ArrowUpRight size={16} className="text-base-300 group-hover:text-primary-500 transition-colors" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className={`grid ${userDetail.activities.tickets.length > 0 && userDetail.activities.leads.length > 0 ? 'grid-cols-2' : 'grid-cols-1'} gap-8`}>
                        {/* Escalation Tickets */}
                        {userDetail.activities.tickets.length > 0 && (
                            <section id="section-tickets" className="scroll-mt-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-base-400 uppercase tracking-[0.15em] mb-4">
                                    <AlertCircle size={14} className="text-base-300" /> Tickets
                                </h4>
                                <div className="space-y-3">
                                    {userDetail.activities.tickets.map((t: any) => (
                                        <div 
                                            key={t.ticket_id} 
                                            onClick={() => openNestedDetail('ticket', t)}
                                            className="p-3.5 rounded-2xl border border-base-100 hover:border-red-200 transition-all cursor-pointer group bg-white shadow-sm"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-[10px] font-mono font-black text-base-400">#TCK-{toShortNum(t.ticket_id)}</span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${t.status === 'open' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-base-50 text-base-500 border border-base-100'}`}>
                                                    {t.status}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-base-800 line-clamp-2 leading-snug">{t.concern || t.description}</p>
                                            <div className="mt-3 text-[10px] text-base-400 font-bold flex justify-between">
                                                <span>{t.product.toUpperCase()}</span>
                                                <span className="flex items-center gap-1">Open Detail <ArrowUpRight size={10} /></span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Revenue Signals */}
                        {userDetail.activities.leads.length > 0 && (
                            <section id="section-sales" className="scroll-mt-4">
                                <h4 className="flex items-center gap-2 text-xs font-black text-base-400 uppercase tracking-[0.15em] mb-4">
                                    <DollarSign size={14} className="text-base-300" /> Sales Leads
                                </h4>
                                <div className="space-y-3">
                                    {userDetail.activities.leads.map((l: any) => (
                                        <div 
                                            key={l.lead_id} 
                                            onClick={() => openNestedDetail('lead', l)}
                                            className="p-3.5 rounded-2xl border border-indigo-50 bg-indigo-50/20 hover:border-indigo-200 transition-all cursor-pointer group shadow-sm"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.confidence === 'high' ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                                                    {l.confidence} Confidence
                                                </div>
                                                <DollarSign size={14} className="text-indigo-400" />
                                            </div>
                                            <p className="text-sm font-bold text-base-800 line-clamp-2 leading-snug">{l.opportunity}</p>
                                            <div className="mt-3 flex justify-between items-center">
                                                <span className="text-xs font-black text-indigo-700">${l.estimated_revenue.toLocaleString()}</span>
                                                <ArrowUpRight size={14} className="text-indigo-300 group-hover:text-indigo-600" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
                </>
            )}

            {/* NESTED Overlay Panel (The "Sub-Detail") */}
            <AnimatePresence>
                {nestedItem && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute inset-x-8 bottom-8 top-32 bg-white rounded-3xl shadow-[0_30px_90px_rgba(0,0,0,0.3)] border border-base-200 z-[70] overflow-hidden flex flex-col"
                    >
                        {/* Overlay Header */}
                        <div className={`px-6 py-4 flex items-center justify-between border-b ${
                            nestedItem.type === 'call' ? 'bg-primary-600 text-white' : 
                            nestedItem.type === 'ticket' ? 'bg-red-600 text-white' : 
                            'bg-indigo-600 text-white'
                        }`}>
                            <div className="flex items-center gap-3">
                                {nestedItem.type === 'call' ? <Phone size={20} /> : nestedItem.type === 'ticket' ? <AlertCircle size={20} /> : <DollarSign size={20} />}
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-[0.2em]">Detailed Record</h3>
                                    <p className="text-[10px] font-bold opacity-80 font-mono">
                                        {nestedItem.type === 'call' ? (nestedItem.data.call_id?.startsWith('Call_ID') ? nestedItem.data.call_id : `CALL-${toShortNum(nestedItem.data.call_id)}`) : 
                                         nestedItem.type === 'ticket' ? (nestedItem.data.ticket_id?.startsWith('Ticket_ID') ? nestedItem.data.ticket_id : `ESC-${toShortNum(nestedItem.data.ticket_id)}`) : 
                                         (nestedItem.data.lead_id?.startsWith('Sales_ID') ? nestedItem.data.lead_id : `Sales_ID${toShortNum(nestedItem.data.lead_id)}`)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => {
                                        if (nestedItem.type === 'call') {
                                            changeTab?.('performance', { type: 'show_call_detail', id: nestedItem.data.call_id });
                                        } else if (nestedItem.type === 'ticket') {
                                            changeTab?.('performance', { type: 'show_escalations', id: nestedItem.data.ticket_id });
                                        } else if (nestedItem.type === 'lead') {
                                            changeTab?.('engagement', { type: 'show_sales_leads', id: nestedItem.data.lead_id });
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                >
                                    {nestedItem.type === 'call' || nestedItem.type === 'ticket' ? "Show in Conversation Metrics" : "Show in Sales & Engagement"} <ExternalLink size={12} />
                                </button>
                                <button onClick={() => setNestedItem(null)} className="p-1.5 hover:bg-black/10 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Overlay Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            {loadingNested ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-base-300">
                                    <RefreshCw size={24} className="animate-spin" />
                                    <p className="text-xs font-bold uppercase tracking-widest">Hydrating data...</p>
                                </div>
                            ) : (
                                <>
                                {nestedItem.type === 'call' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-6 pb-6 border-b border-base-100">
                                            <div className="bg-base-50 p-4 rounded-2xl border border-base-100">
                                                <h5 className="text-[9px] font-black text-base-400 uppercase mb-2">Intent Summary</h5>
                                                <p className="text-sm font-bold text-base-800 italic leading-relaxed">"{nestedItem.data.summary || 'Summary not processed for this call.'}"</p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-base-50 p-3 rounded-2xl">
                                                    <span className="text-[8px] font-black text-base-400 uppercase block mb-1">Satisfaction</span>
                                                    <span className="text-base font-black text-primary-600">{nestedItem.data.predicted_csat || '—'}/5</span>
                                                </div>
                                                <div className="bg-base-50 p-3 rounded-2xl">
                                                    <span className="text-[8px] font-black text-base-400 uppercase block mb-1">Duration</span>
                                                    <span className="text-base font-black text-base-800">{nestedItem.data.duration_seconds}s</span>
                                                </div>
                                                <div className="bg-base-50 p-3 rounded-2xl col-span-2 capitalize">
                                                    <span className="text-[8px] font-black text-base-400 uppercase block mb-1">Outcome</span>
                                                    <span className="text-xs font-black text-emerald-600">{nestedItem.data.outcome}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* RAG Performance Section */}
                                        {nestedItem.data.rag_performance && (
                                           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
                                              <div className="flex items-center justify-between mb-3">
                                                 <div className="flex items-center gap-2">
                                                    <Cpu className="w-4 h-4 text-indigo-500" />
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Knowledge Trust</h4>
                                                 </div>
                                                 <div className="bg-white border border-slate-100 px-2 py-0.5 rounded-full shadow-sm text-[10px] font-black text-emerald-600 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    {Math.round((nestedItem.data.rag_performance.avg_kb_confidence || 0) * 100)}% Match
                                                 </div>
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                 {nestedItem.data.rag_performance.citation_list?.map((cite: string, i: number) => (
                                                    <div key={i} className="px-2.5 py-1 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-2 shadow-sm">
                                                       <FileText className="w-3 h-3 text-indigo-400" />
                                                       {cite.split('|')[0]?.replace('1CenoBots ', '').replace('.pdf', '')} ({cite.split('|')[1]?.trim()})
                                                    </div>
                                                 ))}
                                              </div>
                                           </div>
                                        )}

                                        <div>
                                            <h5 className="text-[9px] font-black text-base-400 uppercase mb-4 tracking-widest">Full Transcript Context</h5>
                                            <div className="space-y-4">
                                                {nestedItem.data.transcript?.length > 0 ? nestedItem.data.transcript.map((msg: any, i: number) => (
                                                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                                        <span className="text-[8px] font-black text-base-300 uppercase mb-1 mx-1">{msg.role}</span>
                                                        <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                                                            msg.role === 'user' ? 'bg-base-100 text-base-800 rounded-tr-none' : 'bg-primary-50 text-primary-900 border border-primary-100 rounded-tl-none'
                                                        }`}>
                                                            {msg.text || msg.content}
                                                        </div>
                                                    </div>
                                                )) : (
                                                    <p className="text-xs text-base-300 italic text-center py-10">Transcript not found or available.</p>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {nestedItem.type === 'ticket' && (
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                                                <AlertCircle size={32} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-black text-base-900 leading-none mb-2">Escalation Ticket</h4>
                                                <div className="flex gap-2">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-base-100 text-base-600 uppercase">High Priority</span>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-50 text-red-600 uppercase border border-red-100">{nestedItem.data.status}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-base-50 p-6 rounded-3xl border border-base-100 italic text-base-800 leading-relaxed shadow-inner">
                                            {nestedItem.data.concern || nestedItem.data.description}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-2xl border border-base-100">
                                                <h6 className="text-[9px] font-black text-base-400 uppercase mb-1">Associated Asset</h6>
                                                <p className="text-sm font-bold text-base-800 tracking-tight">{PRODUCT_LABELS[nestedItem.data.product] || nestedItem.data.product}</p>
                                            </div>
                                            <div className="p-4 rounded-2xl border border-base-100">
                                                <h6 className="text-[9px] font-black text-base-400 uppercase mb-1">Created At</h6>
                                                <p className="text-sm font-bold text-base-800 tracking-tight">{new Date(nestedItem.data.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {nestedItem.type === 'lead' && (
                                    <div className="space-y-8">
                                        <div className="text-center pb-6 border-b border-base-100">
                                            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                                                <DollarSign size={28} />
                                            </div>
                                            <h4 className="text-xl font-black text-base-900 mb-1">AI Detected Sales Signal</h4>
                                            <p className="text-sm text-indigo-600 font-bold uppercase tracking-widest">${nestedItem.data.estimated_revenue.toLocaleString()} Revenue Value</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <h6 className="text-[10px] font-black text-base-400 uppercase tracking-widest">Confidence Score</h6>
                                                <div className="h-4 bg-base-100 rounded-full overflow-hidden border border-base-200">
                                                    <div 
                                                        className={`h-full ${nestedItem.data.confidence === 'high' ? 'bg-indigo-600' : 'bg-indigo-300'}`} 
                                                        style={{ width: nestedItem.data.confidence === 'high' ? '95%' : '60%' }} 
                                                    />
                                                </div>
                                                <p className="text-[10px] text-base-500 font-bold">The AI is <b>{nestedItem.data.confidence === 'high' ? 'highly' : 'somewhat'}</b> certain about this purchase intent.</p>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-base-50 border border-base-100">
                                                <h6 className="text-[9px] font-black text-base-400 uppercase mb-2">Intent Description</h6>
                                                <p className="text-sm font-bold text-base-800 leading-relaxed italic">"{nestedItem.data.opportunity}"</p>
                                            </div>

                                            <div className="p-5 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-100">
                                                <h6 className="text-[9px] font-black opacity-60 uppercase mb-2 tracking-widest">Next Sales Action</h6>
                                                <p className="text-sm font-black italic">"Dispatch proactive upgrade offer based on the user's specific performance bottlenecks mentioned in the interaction."</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
