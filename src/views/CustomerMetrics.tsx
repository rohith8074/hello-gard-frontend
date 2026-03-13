"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, BarChart, Bar
} from 'recharts';
import { 
  Users, Phone, Star, AlertCircle, DollarSign, Search,
  ChevronRight, CalendarCheck, ArrowUpRight, TrendingUp, RotateCcw,
  ChevronUp, ChevronDown, ChevronsUpDown, Cpu, Shield, HelpCircle, Package, Info
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { getCustomerProfiles } from '@/lib/api';
import CalendarRangePicker from '@/components/CalendarRangePicker';

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

const SEGMENT_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  'Platinum': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100' },
  'Gold': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
  'Silver': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
  'At-Risk': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
};

interface CustomerMetricsProps {
  productFilter?: string;
  startDate?: string;
  endDate?: string;
  changeTab?: (tab: string, context?: any) => void;
}

type SortField = 'name' | 'avg_csat' | 'calls_count' | 'tickets_count' | 'revenue' | 'last_sales_date' | 'products_count';
type SortDir = 'asc' | 'desc';

// Custom tooltip
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.12)] rounded-2xl px-4 py-3 border border-base-100">
      <p className="text-[10px] font-bold uppercase tracking-widest text-base-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="font-semibold text-base-600">{p.name}</span>
          <span className="font-black text-base-900 ml-auto">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function CustomerMetrics({ productFilter = 'all', startDate, endDate, changeTab }: CustomerMetricsProps) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isRestored, setIsRestored] = useState(true);
  const [localStartDate, setLocalStartDate] = useState(startDate || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [localEndDate, setLocalEndDate] = useState(endDate || format(new Date(), 'yyyy-MM-dd'));
  const [sortField, setSortField] = useState<SortField>('calls_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCustomerProfiles(productFilter, 100, search, isRestored ? undefined : localStartDate, isRestored ? undefined : localEndDate);
      setProfiles(res.profiles || []);
    } catch (e) {
      console.error('Failed to fetch customer metrics', e);
    } finally {
      setLoading(false);
    }
  }, [productFilter, search, localStartDate, localEndDate, isRestored]);

  useEffect(() => {
    const debounce = setTimeout(fetchMetrics, 300);
    return () => clearTimeout(debounce);
  }, [fetchMetrics]);

  const handleRestore = () => {
    setLocalStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    setLocalEndDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRestored(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const [segmentFilter, setSegmentFilter] = useState<string | null>(null);

  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => {
      let aVal = sortField === 'products_count' ? (a.products?.length || 0) : a[sortField];
      let bVal = sortField === 'products_count' ? (b.products?.length || 0) : b[sortField];
      const aNull = aVal == null;
      const bNull = bVal == null;
      if (aNull && bNull) return 0;
      if (aNull) return sortDir === 'asc' ? 1 : -1;
      if (bNull) return sortDir === 'asc' ? -1 : 1;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [profiles, sortField, sortDir]);

  // Apply segment filter on top of sort
  const displayProfiles = useMemo(() =>
    segmentFilter ? sortedProfiles.filter((p: any) => p.status === segmentFilter) : sortedProfiles,
  [sortedProfiles, segmentFilter]);

  // Aggregate stats from search-filtered profiles
  const totalCalls = profiles.reduce((sum, p) => sum + (p.calls_count || 0), 0);
  const totalEscalations = profiles.reduce((sum, p) => sum + (p.tickets_count || 0), 0);
  const totalSales = profiles.reduce((sum, p) => sum + (p.revenue || 0), 0);
  const avgCsat = profiles.filter(p => p.avg_csat).length > 0
    ? (profiles.reduce((sum, p) => sum + (p.avg_csat || 0), 0) / profiles.filter(p => p.avg_csat).length).toFixed(1)
    : '—';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown size={11} className="text-base-300 ml-1 shrink-0" />;
    return sortDir === 'asc'
      ? <ChevronUp size={11} className="text-primary-500 ml-1 shrink-0" />
      : <ChevronDown size={11} className="text-primary-500 ml-1 shrink-0" />;
  };

  // Segment distribution — always derived from current search-filtered profiles
  const SEGMENT_COLORS: Record<string, string> = {
    Platinum: '#7c3aed', Gold: '#d97706', Silver: '#64748b', 'At-Risk': '#e11d48'
  };
  const segmentData = useMemo(() => {
    const counts: Record<string, number> = { Platinum: 0, Gold: 0, Silver: 0, 'At-Risk': 0 };
    profiles.forEach((p: any) => { if (p.status && counts[p.status] !== undefined) counts[p.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: SEGMENT_COLORS[name] }));
  }, [profiles]);

  // Product distribution — derived from search-filtered profiles
  const productDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p: any) => {
      (p.products || []).forEach((prod: string) => {
        const label = (PRODUCT_LABELS[prod] || prod).toUpperCase();
        counts[label] = (counts[label] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [profiles]);

  // Top revenue — derived from search-filtered profiles
  const topRevenue = useMemo(() => {
    return [...profiles]
      .filter((p: any) => (p.revenue || 0) > 0)
      .sort((a: any, b: any) => (b.revenue || 0) - (a.revenue || 0))
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, revenue: p.revenue }));
  }, [profiles]);

  // Top multi-product customers (must have MORE than 1 product)
  const multiProductCustomers = useMemo(() => {
    return [...profiles]
      .filter(p => (p.products?.length || 0) > 1)
      .sort((a, b) => (b.products?.length || 0) - (a.products?.length || 0))
      .slice(0, 5);
  }, [profiles]);

  const [showSegmentInfo, setShowSegmentInfo] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="space-y-6"
    >
      {/* ── Header ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-base-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Customer Metrics
          </h2>
          <p className="text-sm text-base-500 mt-0.5">Visual performance data and relationship health</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleRestore}
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-base-500 hover:text-primary-600 bg-white border border-base-200 rounded-xl shadow-sm transition-all active:scale-95"
          >
            <RotateCcw size={14} />
            Restore
          </button>

          <div className="bg-white border border-base-200 rounded-xl shadow-sm">
            <CalendarRangePicker 
              startDate={localStartDate}
              endDate={localEndDate}
              onChange={(start: string, end: string) => {
                setLocalStartDate(start);
                setLocalEndDate(end);
                setIsRestored(false);
              }}
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-base-200 rounded-xl w-64 shadow-sm focus-within:ring-2 ring-primary-500/10 transition-all">
            <Search className="w-4 h-4 text-base-400 shrink-0" />
            <input
              type="text"
              placeholder="Filter by customer..."
              className="bg-transparent border-none outline-none text-sm w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Avg CSAT", val: avgCsat, sub: "out of 5.0", icon: Star, gradient: "from-amber-500 to-orange-600", lightBg: "bg-amber-50" },
          { label: "Total Calls", val: totalCalls.toLocaleString(), sub: "interactions", icon: Phone, gradient: "from-blue-600 to-indigo-700", lightBg: "bg-indigo-50" },
          { label: "Escalations", val: totalEscalations.toLocaleString(), sub: "tickets created", icon: AlertCircle, gradient: "from-rose-500 to-red-600", lightBg: "bg-rose-50" },
          { label: "Sales Value", val: `$${totalSales.toLocaleString()}`, sub: "pipeline revenue", icon: DollarSign, gradient: "from-emerald-500 to-teal-600", lightBg: "bg-emerald-50" }
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="classic-card overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="p-5 flex items-start gap-4">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${stat.gradient} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                <stat.icon size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.15em] text-base-400 mb-1">{stat.label}</div>
                <div className="text-2xl font-black text-base-900 leading-none mb-0.5 tabular-nums">{loading ? '...' : stat.val}</div>
                <div className="text-[10px] font-semibold text-base-400">{stat.sub}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Row 2: Loyalty Segments + Product Distribution + Top Revenue ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loyalty Segments */}
        <div className="classic-card p-6 relative">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" />
              <h3 className="text-sm font-bold text-base-900">Customer Segments</h3>
            </div>
            <button
              onClick={() => setShowSegmentInfo(!showSegmentInfo)}
              className="p-1.5 rounded-lg hover:bg-base-100 transition-colors text-base-400 hover:text-primary-600"
              title="How are segments calculated?"
            >
              <Info size={15} />
            </button>
          </div>

          {/* Segment Scoring Tooltip */}
          <AnimatePresence>
            {showSegmentInfo && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                className="absolute right-4 top-14 z-20 w-72 bg-white border border-base-200 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] p-4"
              >
                <div className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-3">Score Calculation</div>
                <div className="space-y-1.5 text-[11px]">
                  {[
                    { rule: 'Calls > 10', pts: '+20 pts' },
                    { rule: 'Calls > 2', pts: '+10 pts' },
                    { rule: 'Avg CSAT ≥ 4.5', pts: '+30 pts' },
                    { rule: 'Avg CSAT ≥ 3.5', pts: '+15 pts' },
                    { rule: 'Revenue > $5,000', pts: '+30 pts' },
                    { rule: 'Revenue > $500', pts: '+15 pts' },
                    { rule: 'Active this month', pts: '+20 pts' },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-base-600 font-medium">{r.rule}</span>
                      <span className="font-black text-primary-600 tabular-nums">{r.pts}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-base-100 space-y-1 text-[10px] font-bold">
                  <div className="flex justify-between"><span className="text-violet-600">Platinum</span><span className="text-base-500">≥ 80 pts</span></div>
                  <div className="flex justify-between"><span className="text-amber-600">Gold</span><span className="text-base-500">≥ 60 pts</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Silver</span><span className="text-base-500">≥ 40 pts</span></div>
                  <div className="flex justify-between"><span className="text-rose-500">At-Risk</span><span className="text-base-500">&lt; 40 pts</span></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {segmentData.map((seg: any, i: number) => {
              const total = segmentData.reduce((s: number, d: any) => s + d.value, 0) || 1;
              const pct = Math.round((seg.value / total) * 100);
              const style = SEGMENT_STYLES[seg.name] || SEGMENT_STYLES['Silver'];
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${style.border} ${style.bg}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-black uppercase tracking-wider ${style.text}`}>{seg.name}</span>
                      <span className="text-xs font-bold text-base-500">{seg.value} customers</span>
                    </div>
                    <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: seg.fill }}
                      />
                    </div>
                  </div>
                  <span className={`text-lg font-black tabular-nums ${style.text}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Product Distribution — Horizontal Bar */}
        <div className="classic-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Cpu className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-bold text-base-900">Product Ownership</h3>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 700 }} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Customers" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Revenue Customers */}
        <div className="classic-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-base-900">Top Revenue</h3>
          </div>
          <div className="space-y-2">
            {topRevenue.map((customer: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-base-50 border border-base-100 group hover:border-emerald-200 transition-colors">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                  i === 0 ? 'bg-emerald-600 text-white' : 'bg-base-200 text-base-500'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-base-800 truncate">{customer.name}</div>
                </div>
                <span className="text-sm font-black text-emerald-600 tabular-nums">${customer.revenue?.toLocaleString()}</span>
              </div>
            ))}
            {topRevenue.length === 0 && (
              <div className="text-xs text-base-400 italic text-center py-6">No revenue data</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Multi-Product Customers ── */}
      <div className="classic-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-base-900">Top Multi-Product Customers</h3>
          </div>
          <span className="text-[10px] font-bold text-base-400 uppercase tracking-widest">{multiProductCustomers.length} customers</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {multiProductCustomers.map((c: any, i: number) => (
            <div 
              key={i}
              onClick={() => changeTab?.('customers', { type: 'show_user', id: c.profile_id })}
              className="p-4 rounded-2xl border border-base-100 bg-base-50/50 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm' : 'bg-base-200 text-base-500'
                }`}>
                  <span className="text-xs font-black">{(c.products?.length || 0)}</span>
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-base-800 truncate group-hover:text-indigo-700 transition-colors">{c.name}</div>
                  <div className="text-[10px] text-base-400 font-medium truncate">{c.company}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(c.products || []).map((prod: string, j: number) => (
                  <span key={j} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-600 border border-indigo-200/50">
                    {PRODUCT_LABELS[prod] || prod}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {multiProductCustomers.length === 0 && (
            <div className="col-span-full text-xs text-base-400 italic text-center py-8">No product data available</div>
          )}
        </div>
      </div>

      {/* ── Detailed Table ── */}
      <div className="classic-card overflow-hidden">
        <div className="px-6 py-4 border-b border-base-100 bg-base-50/30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-base-400" />
              <h3 className="text-sm font-bold text-base-800">Customer Performance</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Segment filter pills */}
              {[null, 'Platinum', 'Gold', 'Silver', 'At-Risk'].map((seg) => {
                const active = segmentFilter === seg;
                const style = seg ? SEGMENT_STYLES[seg] : null;
                return (
                  <button
                    key={seg ?? 'all'}
                    onClick={() => setSegmentFilter(seg)}
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border transition-colors ${
                      active
                        ? (style ? `${style.bg} ${style.text} border-current/20` : 'bg-primary-600 text-white border-primary-600')
                        : 'bg-white text-base-400 border-base-200 hover:border-base-300'
                    }`}
                  >
                    {seg ?? 'All'}
                  </button>
                );
              })}
              <span className="text-[10px] font-bold text-base-400 uppercase tracking-widest ml-1">
                {displayProfiles.length} / {profiles.length}
              </span>
            </div>
          </div>
          {changeTab && (
            <p className="text-[10px] font-semibold text-primary-500 mt-1">Click row to view profile →</p>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-base-100 bg-base-50/50">
                {([
                  { key: 'name' as SortField, label: 'Customer', align: '' },
                  { key: 'products_count' as SortField, label: 'Products', align: 'text-center' },
                  { key: 'avg_csat' as SortField, label: 'CSAT', align: 'text-center' },
                  { key: 'calls_count' as SortField, label: 'Calls', align: 'text-center' },
                  { key: 'tickets_count' as SortField, label: 'Escalations', align: 'text-center' },
                  { key: 'revenue' as SortField, label: 'Revenue', align: 'text-right' },
                  { key: 'last_sales_date' as SortField, label: 'Last Activity', align: 'text-right' },
                ] as { key: SortField; label: string; align: string }[]).map((col) => (
                  <th 
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-base-400 cursor-pointer hover:text-primary-600 select-none transition-colors ${col.align}`}
                  >
                    <span className="inline-flex items-center">
                      {col.label}
                      <SortIcon field={col.key} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-50">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <div className="h-8 bg-base-100 rounded-lg animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : displayProfiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-base-400 italic">
                    No customers found matching your filters.
                  </td>
                </tr>
              ) : displayProfiles.map((p, idx) => (
                <motion.tr
                  key={p.profile_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  onClick={() => {
                    if (changeTab) {
                      changeTab('customers', { type: 'show_user', id: p.profile_id });
                    }
                  }}
                  className={`group transition-all ${changeTab ? 'cursor-pointer hover:bg-primary-50/40' : 'hover:bg-base-50'}`}
                >
                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shrink-0 group-hover:from-primary-500 group-hover:to-primary-600 transition-colors">
                        <span className="text-[10px] font-black text-primary-600 group-hover:text-white transition-colors uppercase">
                          {(p.name || 'U')[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-base-900 leading-none mb-1 truncate group-hover:text-primary-700 transition-colors">{p.name}</div>
                        <div className="text-[10px] font-semibold text-base-400 truncate">{p.company || p.profile_id}</div>
                      </div>
                    </div>
                  </td>

                  {/* Products */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {(p.products || []).length > 0 ? (p.products || []).map((prod: string, j: number) => (
                        <span key={j} className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 whitespace-nowrap">
                          {PRODUCT_LABELS[prod]?.split(' ')[0] || prod}
                        </span>
                      )) : (
                        <span className="text-xs font-black text-base-400 tabular-nums">0</span>
                      )}
                    </div>
                  </td>

                  {/* CSAT */}
                  <td className="px-6 py-4 text-center">
                    {p.avg_csat ? (
                      <div className="inline-flex items-center gap-1">
                        <Star size={12} className={p.avg_csat >= 4 ? 'text-amber-400 fill-amber-400' : p.avg_csat >= 3 ? 'text-amber-300' : 'text-base-300'} />
                        <span className={`text-xs font-black tabular-nums ${
                          p.avg_csat >= 4 ? 'text-amber-600' : p.avg_csat >= 3 ? 'text-amber-500' : 'text-base-500'
                        }`}>
                          {p.avg_csat}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-base-400 tabular-nums">0</span>
                    )}
                  </td>

                  {/* Calls */}
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-black text-base-700 tabular-nums">
                      {p.calls_count}
                    </span>
                  </td>

                  {/* Escalations */}
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-black tabular-nums ${p.tickets_count > 0 ? 'text-rose-600' : 'text-base-400'}`}>
                      {p.tickets_count}
                    </span>
                  </td>

                  {/* Revenue */}
                  <td className="px-6 py-4 text-right">
                    <span className={`text-sm font-black tabular-nums ${p.revenue > 0 ? 'text-emerald-600' : 'text-base-400'}`}>
                      {p.revenue > 0 ? `$${p.revenue.toLocaleString()}` : '$0'}
                    </span>
                  </td>

                  {/* Last Activity */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-xs font-semibold text-base-500">
                        {p.last_sales_date ? new Date(p.last_sales_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : p.last_active ? new Date(p.last_active).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                      </span>
                      {changeTab && (
                        <ChevronRight size={14} className="text-base-300 group-hover:text-primary-500 transition-colors" />
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
