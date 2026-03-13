"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line } from 'recharts';
import { Users, TrendingUp, Target, DollarSign, Filter, X, Calendar, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { getSalesLeads } from '@/lib/api';
import CalendarRangePicker from '@/components/CalendarRangePicker';

const toShortNum = (id: string) => {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = clean.slice(-6);
  let n = 0;
  for (let i = 0; i < tail.length; i++) n = (n * 36 + parseInt(tail[i], 36)) % 100000;
  return String(n).padStart(4, '0');
};

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

interface ClientEngagementDashboardProps {
  productFilter?: string;
  startDate?: string;
  endDate?: string;
  onRangeChange?: (start: string, end: string) => void;
  initialAction?: { type: string; id?: string } | null;
  changeTab?: (tab: string, context?: any) => void;
}

const ClientEngagementDashboard = ({ productFilter = 'all', startDate, endDate, onRangeChange, initialAction, changeTab }: ClientEngagementDashboardProps) => {
  const [salesLeads, setSalesLeads] = useState<any[]>([]);
  const [allTimeLeads, setAllTimeLeads] = useState<any[]>([]);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [isRestored, setIsRestored] = useState(true);
  
  // Local filters
  const [localProductFilter, setLocalProductFilter] = useState('all');
  const [revenueOp, setRevenueOp] = useState('>');
  const [revenueAmount, setRevenueAmount] = useState('');
  const [localStartDate, setLocalStartDate] = useState(startDate || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [localEndDate, setLocalEndDate] = useState(endDate || format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [salesRes, allRes] = await Promise.all([
          getSalesLeads(productFilter, localStartDate, localEndDate),
          getSalesLeads(productFilter)
        ]);
        
        if (salesRes?.leads) {
          setSalesLeads(salesRes.leads);
          setPipelineValue(salesRes.leads.reduce((sum: number, l: any) => sum + (l.estimated_revenue || 0), 0));
        }
        if (allRes?.leads) {
          setAllTimeLeads(allRes.leads);
        }
      } catch (e) {
        console.error("Failed to fetch sales data", e);
      }
    };
    fetchData();
  }, [productFilter, localStartDate, localEndDate]);

  const handleRestore = () => {
    console.log("Restoring Sales defaults...");
    setLocalStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    setLocalEndDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRestored(true);
  };

  useEffect(() => {
    if (initialAction?.type === 'show_sales_leads' && salesLeads.length > 0) {
      if (initialAction.id) {
        const lead = salesLeads.find(l => l.call_id === initialAction.id || l.lead_id === initialAction.id);
        if (lead) setSelectedLead(lead);
      } else {
        setSelectedLead(salesLeads[0]);
      }
      // Scroll to opportunities table
      const el = document.getElementById('sales-opportunities-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [initialAction, salesLeads]);

  const filteredLeads = salesLeads.filter((l: any) => {
    // Product Filter (Local & Global)
    const effectiveProduct = localProductFilter !== 'all' ? localProductFilter : productFilter;
    if (effectiveProduct !== 'all' && l.product !== effectiveProduct) return false;

    // Revenue Filter
    if (revenueAmount !== '') {
      const amt = parseFloat(revenueAmount);
      if (!isNaN(amt)) {
        if (revenueOp === '>' && !(l.estimated_revenue > amt)) return false;
        if (revenueOp === '<' && !(l.estimated_revenue < amt)) return false;
        if (revenueOp === '==' && !(l.estimated_revenue === amt)) return false;
      }
    }

    return true;
  });

  const filteredPipeline = filteredLeads.reduce((sum: number, l: any) => sum + (l.estimated_revenue || 0), 0);

  const funnelData = [
    { stage: 'VISITORS', count: 12500, label: 'Website Traffic' },
    { stage: 'VOICE AI', count: 4200, label: 'Interactions' },
    { stage: 'QUALIFIED', count: filteredLeads.length > 0 ? filteredLeads.length * 370 : 1850, label: 'MQLs' },
    { stage: 'PIPELINE', count: filteredLeads.length > 0 ? filteredLeads.length * 168 : 840, label: 'Opportunities' },
    { stage: 'DEALS', count: filteredLeads.length > 0 ? filteredLeads.length * 64 : 320, label: 'Conversions' }
  ];

  const revenueTrend = [
    { day: 'Mon', revenue: 64000, target: 60000 },
    { day: 'Tue', revenue: 48000, target: 60000 },
    { day: 'Wed', revenue: 22000, target: 60000 },
    { day: 'Thu', revenue: 28000, target: 60000 },
    { day: 'Fri', revenue: 52000, target: 60000 },
    { day: 'Sat', revenue: 49000, target: 60000 },
    { day: 'Sun', revenue: 58000, target: 60000 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-base-900">Sales & Engagement</h2>
            <p className="text-sm text-base-500 mt-0.5">Revenue attribution & lead intelligence</p>
          </div>
          <div className="h-8 w-px bg-base-100 hidden md:block" />
          <CalendarRangePicker 
            startDate={localStartDate} 
            endDate={localEndDate}
            onChange={(start: string, end: string) => {
              setLocalStartDate(start);
              setLocalEndDate(end);
              setIsRestored(false);
              onRangeChange?.(start, end);
            }}
          />
          <button
            onClick={handleRestore}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border relative z-10 cursor-pointer active:scale-95 ${
              isRestored 
                ? 'bg-primary-50 text-primary-600 border-primary-200 shadow-inner' 
                : 'bg-white text-base-500 border-base-200 hover:bg-base-50 hover:border-base-300'
            }`}
            title="Show all-time totals on cards"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isRestored ? 'animate-pulse' : ''}`} />
            Restore Defaults
          </button>
        </div>
        {productFilter !== 'all' && (
          <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
            <Filter className="w-3 h-3" />
            {PRODUCT_LABELS[productFilter] || productFilter}
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Qualified Leads",  val: (isRestored ? allTimeLeads.length : filteredLeads.length).toString(), trend: isRestored ? "Till date" : "Range", icon: Users,      color: "text-primary-600", bg: "bg-primary-50",  tooltip: "Total unique buying signals detected across all voice transcripts." },
          { label: "Conversion Rate",  val: "2.5%",                                                                trend: "All-time",  icon: TrendingUp, color: "text-success-600", bg: "bg-success-50",  tooltip: "Voice interactions that resulted in a qualified sales lead." },
          { label: "Pipeline Value",   val: `$${(isRestored ? allTimeLeads.reduce((s,l)=>s+(l.estimated_revenue||0),0) : filteredPipeline).toLocaleString()}`, trend: isRestored ? "Total pipeline" : "Filtered", icon: DollarSign, color: "text-warning-600", bg: "bg-warning-50",  tooltip: "Total potential revenue from AI-detected upsell opportunities." },
          { label: "Campaign ROI",     val: "324%",                                                                trend: "+12%",   icon: Target,     color: "text-primary-600", bg: "bg-primary-50",  tooltip: "Return on investment against platform costs and detected revenue growth." }
        ].map((stat, idx) => (
          <div key={idx} className="classic-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.trend.startsWith('+') ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'
              }`}>{stat.trend}</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-base-900">{stat.val}</div>
              <div className="flex items-center gap-1 group cursor-help relative mt-0.5">
                <span className="text-sm text-base-500">{stat.label}</span>
                <span className="w-3.5 h-3.5 rounded-full border border-base-300 flex items-center justify-center text-[9px] text-base-400">?</span>
                <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl">
                  {stat.tooltip}
                  <div className="absolute top-full left-4 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <div className="classic-card p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-base-900">Sales Funnel Analysis</h3>
              <p className="text-xs text-base-500 mt-0.5">Conversion efficiency</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                <Tooltip
                  cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#475569' }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Trends */}
        <div className="classic-card p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-base-900">Weekly Revenue Trends</h3>
              <p className="text-xs text-base-500 mt-0.5">Actual vs target performance</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tickMargin={8} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  itemStyle={{ color: '#475569' }}
                  formatter={(value: any) => [`$${(value || 0).toLocaleString()}`, "Actual Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="none" fill="url(#lineAreaGradient)" />
                <Line type="monotone" name="Actual Revenue" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3, fill: "#ffffff", strokeWidth: 2, stroke: "#2563eb" }} activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }} />
                <Line type="monotone" name="Target" dataKey="target" stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Opportunities Quick-View */}
      <div id="sales-opportunities-section" className="classic-card p-5 flex flex-col" style={{ maxHeight: '500px' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <h3 className="text-base font-bold text-base-900">Sales Opportunities</h3>
            <p className="text-xs text-base-500 mt-0.5">AI-detected upsell signals · click for detail</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
             {/* Revenue Filter */}
             <div className="flex items-center gap-1 bg-base-50 border border-base-200 rounded-lg px-2 py-1">
                <span className="text-[10px] font-black text-base-400 uppercase tracking-tighter mr-1">Revenue</span>
                <select 
                  value={revenueOp} 
                  onChange={(e) => setRevenueOp(e.target.value)}
                  className="bg-transparent text-xs font-bold text-base-700 outline-none cursor-pointer"
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value="==">==</option>
                </select>
                <input 
                  type="number"
                  placeholder="Amount"
                  value={revenueAmount}
                  onChange={(e) => setRevenueAmount(e.target.value)}
                  className="bg-transparent text-xs font-bold text-base-700 outline-none w-16 placeholder:font-normal placeholder:text-base-300"
                />
             </div>

             {/* Product Filter */}
             <select 
                value={localProductFilter} 
                onChange={(e) => setLocalProductFilter(e.target.value)}
                className="bg-base-50 border border-base-200 rounded-lg px-3 py-1.5 text-xs font-bold text-base-700 outline-none cursor-pointer"
             >
                <option value="all">All Products</option>
                {Object.entries(PRODUCT_LABELS).map(([val, label]) => (
                  val !== 'all' && <option key={val} value={val}>{label}</option>
                ))}
             </select>

             <div className="h-8 w-px bg-base-100 hidden md:block" />

             <div className="bg-success-600 rounded-xl px-4 py-2 flex items-center gap-3 shadow-lg shadow-success-100/50">
                <div>
                <p className="text-[10px] text-success-100 font-medium">Total Pipeline</p>
                <p className="text-lg font-bold text-white tabular-nums">${filteredPipeline.toLocaleString()}</p>
                </div>
                <DollarSign className="w-5 h-5 text-success-300 opacity-60" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="min-w-full inline-block align-middle">
            <div className="overflow-hidden border border-base-100 rounded-xl">
              <table className="min-w-full divide-y divide-base-100">
                <thead className="bg-base-50/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-base-400 uppercase tracking-widest">Sales_ID</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-base-400 uppercase tracking-widest">Opportunity</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-base-400 uppercase tracking-widest">Date</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-base-400 uppercase tracking-widest">Confidence</th>
                    <th scope="col" className="px-4 py-3 text-left text-[10px] font-black text-base-400 uppercase tracking-widest">Product</th>
                    <th scope="col" className="px-4 py-3 text-right text-[10px] font-black text-base-400 uppercase tracking-widest">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-base-50">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-sm text-base-300 italic text-center">No opportunities detected yet</td>
                    </tr>
                  ) : filteredLeads.map((lead: any, i: number) => (
                    <tr 
                      key={i} 
                      onClick={() => setSelectedLead(lead)}
                      className={`transition-all cursor-pointer group border-l-4 ${
                        selectedLead?.lead_id === lead.lead_id || selectedLead?.call_id === lead.call_id
                          ? 'bg-success-50 border-success-600 shadow-inner translate-x-1' 
                          : 'hover:bg-success-50/30 border-transparent'
                      }`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-bold text-base-500 font-mono tracking-tight bg-base-50 px-2 py-1 rounded">
                          {lead.lead_id ? lead.lead_id.replace(/^(lead|sales|lead_|sales_)/i, 'SALES-').replace(/--/g, '-').toUpperCase() : lead.call_id ? `SALES-${lead.call_id.slice(-4).toUpperCase()}` : 'SALES-0000'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-success-50 text-success-600 flex items-center justify-center shrink-0 group-hover:bg-success-100 transition-all">
                            <DollarSign className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-base-800">{lead.opportunity}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-[11px] font-medium text-base-500">
                          {lead.detected_at ? new Date(lead.detected_at).toLocaleDateString() : 'Mar 12, 2026'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          lead.confidence === 'high' ? 'bg-success-50 text-success-600' :
                          lead.confidence === 'medium' ? 'bg-warning-50 text-warning-600' :
                          'bg-base-100 text-base-500'
                        }`}>
                          {lead.confidence}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-bold text-base-500">{PRODUCT_LABELS[lead.product] || lead.product}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <span className="text-sm font-black text-base-900">${lead.estimated_revenue?.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Lead Detail Panel */}
      <AnimatePresence>
        {selectedLead && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-success-200 bg-success-50">
              <div>
                <h3 className="text-base font-bold text-base-900">Sales Opportunity</h3>
                <p className="text-sm text-success-700 font-medium mt-0.5 font-mono">
                  {selectedLead.lead_id || 'LEAD-DETECTED'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (selectedLead.call_id) {
                      changeTab?.('performance', { type: 'show_call_detail', id: selectedLead.call_id });
                    }
                  }}
                  className="px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  View Conversation
                </button>
                <button onClick={() => setSelectedLead(null)} className="p-2 hover:bg-success-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-success-800" />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 border-b border-base-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Confidence</dt>
                  <dd className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedLead.confidence === 'high' ? 'bg-success-50 text-success-600' :
                    selectedLead.confidence === 'medium' ? 'bg-warning-50 text-warning-600' :
                    'bg-base-100 text-base-600'
                  }`}>{selectedLead.confidence}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Est. Revenue</dt>
                  <dd className="font-bold text-lg text-success-600">${selectedLead.estimated_revenue?.toLocaleString() || '0'}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Product</dt>
                  <dd className="font-semibold text-base-900 text-sm">{PRODUCT_LABELS[selectedLead.product] || selectedLead.product}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Detection Date</dt>
                  <dd className="text-sm font-semibold text-base-700">
                    {selectedLead.detected_at
                      ? new Date(selectedLead.detected_at).toLocaleDateString()
                      : new Date().toLocaleDateString()}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-2">Customer Details</dt>
                <dd 
                   onClick={() => {
                     if (selectedLead.user_id) {
                       changeTab?.('customers', { type: 'show_user', id: selectedLead.user_id });
                     }
                   }}
                   className="bg-primary-50 p-4 rounded-xl border border-primary-100 cursor-pointer hover:border-primary-300 transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-base-900">{selectedLead.user_name || 'Individual Customer'}</p>
                      <p className="text-xs text-primary-600 font-medium">{selectedLead.user_company || 'Independent Account'}</p>
                    </div>
                    <div className="bg-white p-1.5 rounded-lg border border-primary-100 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      <span className="text-[10px] font-bold uppercase px-1">View Profile</span>
                    </div>
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-2">Opportunity Type</dt>
                <dd className="text-sm font-bold text-base-900 bg-base-50 p-3 rounded-lg border border-base-100">
                  {selectedLead.opportunity}
                </dd>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-base-900 border-b border-base-100 pb-2">
                <Target className="w-4 h-4 text-primary-500" />
                AI Detection Logic
              </div>
              <div className="p-4 rounded-xl border border-base-100 bg-base-50">
                <p className="text-xs font-bold uppercase tracking-wider text-base-400 mb-2">Intent Analysis</p>
                <p className="text-sm text-base-700 italic">
                  Detected via the Post-Call Intelligence Agent. User expressed specific interest in {selectedLead.opportunity?.toLowerCase()} during the support session.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-primary-100 bg-primary-50">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">Recommended Next Step</p>
                <p className="text-sm text-primary-800">
                  {selectedLead.confidence === 'high' ? 'Have an Account Executive call the customer within 24 hours to present a formal quote.' :
                   selectedLead.confidence === 'medium' ? 'Email the customer with technical specifications and pricing for this upgrade tier.' :
                   'Keep as a discovery note for the next quarterly business review.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClientEngagementDashboard;
