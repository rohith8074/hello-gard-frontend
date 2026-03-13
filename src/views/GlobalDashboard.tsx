"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Activity, ShieldCheck, HeadphonesIcon, Cpu, AlertTriangle, RefreshCw, Filter, X, ExternalLink, Clock, Tag, ChevronRight, Zap, TrendingUp, CalendarCheck, Calendar, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { refreshDashboard, getRefreshStatus, getFleetStatus, getEscalationTickets, getSalesLeads, getDashboardMetrics, getDashboardSummary, getActiveCalls, getSecurityEvents } from '@/lib/api';
import CalendarRangePicker from '@/components/CalendarRangePicker';

const toShortNum = (id: string) => {
  if (!id) return '0000';
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = clean.slice(-6);
  let n = 0;
  for (let i = 0; i < tail.length; i++) n = (n * 36 + parseInt(tail[i], 36)) % 100000;
  return String(n).padStart(4, '0').toUpperCase();
};

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

// Maps event_type → destination tab + label + button style
const SOURCE_MAP: Record<string, { tab: string; label: string; description: string; color: string; action?: string; idField?: string }> = {
  call_analyzed:        { tab: 'performance', label: 'Conversation Metrics', description: 'View this call in Conversation Metrics',            color: 'bg-primary-600 hover:bg-primary-700 text-white', action: 'show_call_detail', idField: 'call_id' },
  escalation_created:   { tab: 'performance', label: 'Conversation Metrics', description: 'View escalation ticket in Conversation Metrics',    color: 'bg-danger-600 hover:bg-danger-700 text-white', action: 'show_escalations', idField: 'ticket_id' },
  sales_lead_detected:  { tab: 'engagement',  label: 'Sales & Engagement', description: 'View sales lead in Sales & Engagement',      color: 'bg-success-600 hover:bg-success-700 text-white', action: 'show_sales_leads', idField: 'lead_id' },
  threat_detected:      { tab: 'fleet',       label: 'Fleet Operations',   description: 'View threat details in Fleet Operations',    color: 'bg-danger-600 hover:bg-danger-700 text-white' },
  alarm_triggered:      { tab: 'fleet',       label: 'Fleet Operations',   description: 'View alarm in Fleet Operations',             color: 'bg-warning-600 hover:bg-warning-700 text-white' },
  maintenance_required: { tab: 'fleet',       label: 'Fleet Operations',   description: 'View maintenance schedule in Fleet Ops',     color: 'bg-warning-600 hover:bg-warning-700 text-white' },
  robot_offline:        { tab: 'fleet',       label: 'Fleet Operations',   description: 'View offline robot in Fleet Operations',     color: 'bg-danger-600 hover:bg-danger-700 text-white' },
  login_attempt:        { tab: 'overview',    label: 'Global Overview',    description: 'Review login events in Global Overview',     color: 'bg-base-700 hover:bg-base-800 text-white' },
  session_started:      { tab: 'performance', label: 'Conversation Metrics', description: 'View session details in Conversation Metrics', color: 'bg-primary-600 hover:bg-primary-700 text-white', action: 'show_call_detail', idField: 'call_id' },
};

interface GlobalDashboardProps {
  productFilter?: string;
  dateRange?: number;
  startDate?: string;
  endDate?: string;
  onRangeChange?: (start: string, end: string) => void;
  changeTab?: (tab: string, context?: any) => void;
}

const formatEventText = (text: string) => {
  if (!text) return '';
  // Format Lead IDs
  let formatted = text.replace(/lead_[a-f0-9]{24}/gi, (match) => `SALES-${toShortNum(match)}`);
  // Format Call IDs (handles both raw hex and session ids)
  formatted = formatted.replace(/(?:call_|session_)?([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi, (match) => {
    if (match.length < 10) return match;
    return `CALL-${toShortNum(match)}`;
  });
  // Format Ticket IDs
  formatted = formatted.replace(/ticket_[a-f0-9]{24}/gi, (match) => `ESC-${toShortNum(match)}`);
  return formatted;
};

const GlobalDashboard = ({ productFilter = 'all', dateRange = 7, startDate, endDate, onRangeChange, changeTab }: GlobalDashboardProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [refreshProgress, setRefreshProgress] = useState<{completed: number; total: number} | null>(null);
  const [localStartDate, setLocalStartDate] = useState(startDate || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [localEndDate, setLocalEndDate] = useState(endDate || format(new Date(), 'yyyy-MM-dd'));
  const [fleetSummary, setFleetSummary] = useState({ total: 15, online: 11, errors: 2, offline: 2 });
  const [ticketCount, setTicketCount] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [activeCalls, setActiveCalls] = useState(0);
  const [incidentFeed, setIncidentFeed] = useState<any[]>([]);
  const [feedTypeFilter, setFeedTypeFilter] = useState('all');
  const [feedProductFilter, setFeedProductFilter] = useState('all');
  const [activityData, setActivityData] = useState<any[]>([]);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [summaryData, setSummaryData] = useState({
      total_calls: 0,
      fcr_rate: 0,
      containment_rate: 0,
      avg_csat: 0,
      demo_meetings: 0
  });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [sumRes, metRes, fleetRes, activeRes, escRes, leadRes, eventRes] = await Promise.all([
          getDashboardSummary(productFilter, isRestored ? undefined : localStartDate, isRestored ? undefined : localEndDate),
          getDashboardMetrics(dateRange, productFilter, localStartDate, localEndDate),
          getFleetStatus(productFilter),
          getActiveCalls(),
          getEscalationTickets(productFilter, localStartDate, localEndDate),
          getSalesLeads(productFilter, localStartDate, localEndDate),
          getSecurityEvents(localStartDate, localEndDate)
        ]);

        if (fleetRes?.summary) setFleetSummary(fleetRes.summary);
        setSummaryData(sumRes);
        if (activeRes?.success) setActiveCalls(activeRes.count);
        if (escRes?.tickets) setTicketCount(escRes.tickets.filter((t: any) => t.status !== 'resolved').length);
        if (leadRes?.leads) setPipelineValue(leadRes.total_pipeline || 0);
        if (eventRes?.events) setIncidentFeed(eventRes.events);
        if (metRes?.metrics) {
          setMetricsData(metRes.metrics);
          const chartData = metRes.metrics.map((m: any) => ({
            day: new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            callsHandled: m.total_calls,
            alarmsEscalated: m.escalated_calls || 0
          }));
          setActivityData(chartData);
        }
      } catch (e) {
        console.error("Failed to fetch global data", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [productFilter, dateRange, localStartDate, localEndDate, isRestored]);

  const handleRestore = () => {
    console.log("Restoring defaults...");
    setLocalStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    setLocalEndDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRestored(true);
  };

  // SSE: real-time Priority Event Feed
  useEffect(() => {
    const isTodayIncluded = () => {
      const today = new Date().toISOString().split('T')[0];
      return localEndDate >= today;
    };

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const es = new EventSource(`${API_BASE}/dashboard/events/stream`);

    es.onmessage = (e) => {
      if (!isTodayIncluded()) return; // Ignore live events if viewing past range

      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'snapshot') {
          // If we just loaded via API, we might want to be careful about double loading
          // but for live view, snapshot is good for initial state if API hasn't run yet.
          // However, useEffect dashboard data also fetches this.
          // Let's only use SSE snapshot if incidentFeed is empty
          setIncidentFeed((prev) => prev.length === 0 ? [...msg.events].reverse() : prev);
        } else if (msg.type === 'event') {
          const event = msg.event;
          setIncidentFeed((prev) => [event, ...prev].slice(0, 50));
          
          // Real-time KPI Card Updates
          if (event.event_type === 'call_analyzed') {
            setSummaryData(prev => ({
              ...prev,
              total_calls: (prev.total_calls || 0) + 1,
              demo_meetings: (prev.demo_meetings || 0) + ([
                "scheduling_service", "scheduling service", "pricing_sales", "pricing sales",
                "demo_request", "demo request", "service_scheduling", "service scheduling",
                "appointment_booking", "appointment booking"
              ].includes(event.meta?.primary_topic) ? 1 : 0)
            }));
          } else if (event.event_type === 'escalation_created') {
            setTicketCount(prev => prev + 1);
          } else if (event.event_type === 'sales_lead_detected') {
            setPipelineValue(prev => prev + (event.meta?.estimated_revenue || 0));
          }
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => es.close();
    return () => es.close();
  }, [endDate]);

  const handleRefresh = async () => {
      setIsRefreshing(true);
      setRefreshProgress(null);
      try {
          const { job_id } = await refreshDashboard();

          await new Promise<void>((resolve, reject) => {
              const interval = setInterval(async () => {
                  try {
                      const job = await getRefreshStatus(job_id);
                      setRefreshProgress({ completed: job.completed ?? 0, total: job.total ?? 0 });
                      if (job.status === 'done' || job.status === 'failed') {
                          clearInterval(interval);
                          resolve();
                      }
                  } catch (e) {
                      clearInterval(interval);
                      reject(e);
                  }
              }, 2000);
          });

          const [fleetRes, summaryRes, activeRes, escRes, salesRes, metricsRes] = await Promise.all([
              getFleetStatus(productFilter),
              getDashboardSummary(productFilter),
              getActiveCalls(),
              getEscalationTickets(productFilter),
              getSalesLeads(productFilter),
              getDashboardMetrics(dateRange, productFilter),
          ]);
          if (fleetRes?.summary) setFleetSummary(fleetRes.summary);
          setSummaryData(summaryRes);
          if (activeRes?.success) setActiveCalls(activeRes.count);
          if (escRes?.tickets) setTicketCount(escRes.tickets.filter((t: any) => t.status !== 'resolved').length);
          if (salesRes?.leads) setPipelineValue(salesRes.total_pipeline || 0);
          if (metricsRes?.metrics) {
              const chartData = metricsRes.metrics.map((m: any) => ({
                  day: new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                  callsHandled: m.total_calls,
                  alarmsEscalated: m.escalated_calls || 0
              }));
              setActivityData(chartData);
          }
      } catch (err) {
          console.error('Refresh failed:', err);
      } finally {
          setIsRefreshing(false);
          setRefreshProgress(null);
      }
  };

  const fleetReadiness = fleetSummary.total > 0
      ? ((fleetSummary.online / fleetSummary.total) * 100).toFixed(1)
      : '0.0';

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-base-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-base-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-base-100 rounded-xl" />
          <div className="h-64 bg-base-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-base-900">Dashboard</h2>
            <p className="text-sm text-base-500 mt-0.5">
              {PRODUCT_LABELS[productFilter] || 'All Products'} · Live fleet intelligence
            </p>
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
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing
            ? refreshProgress && refreshProgress.total > 0
              ? `Analyzing ${refreshProgress.completed}/${refreshProgress.total}…`
              : 'Starting…'
            : 'Sync Now'}
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Calls",
            val: summaryData.total_calls.toLocaleString(),
            sub: isRestored ? "All time" : `${localStartDate} to ${localEndDate}`,
            icon: HeadphonesIcon,
            color: "text-primary-600",
            bg: "bg-primary-50",
            tooltip: "Total calls processed by HelloGard.",
            tab: "performance",
            context: { type: 'show_all_calls' }
          },
          {
            label: "Fleet Readiness",
            val: `${fleetReadiness}%`,
            sub: fleetSummary.errors > 0 ? `${fleetSummary.errors} error${fleetSummary.errors > 1 ? 's' : ''}` : 'All systems go',
            icon: Cpu,
            color: fleetSummary.errors > 0 ? "text-warning-600" : "text-success-600",
            bg: fleetSummary.errors > 0 ? "bg-warning-50" : "bg-success-50",
            tooltip: `${fleetSummary.online} online, ${fleetSummary.errors} errors, ${fleetSummary.offline} offline of ${fleetSummary.total} total.`,
            tab: "fleet"
          },
          {
            label: "Open Tickets",
            val: ticketCount.toString(),
            sub: isRestored ? "Active total" : "Filtered range",
            icon: AlertTriangle,
            color: ticketCount > 3 ? "text-danger-600" : "text-base-600",
            bg: ticketCount > 3 ? "bg-danger-50" : "bg-base-100",
            tooltip: "Unresolved escalation tickets in queue.",
            tab: "performance",
            context: { type: 'show_escalations' }
          },
          {
            label: "Sales Pipeline",
            val: `$${pipelineValue.toLocaleString()}`,
            sub: isRestored ? "Total pipeline" : "Filtered range",
            icon: TrendingUp,
            color: "text-primary-600",
            bg: "bg-primary-50",
            tooltip: "Total potential revenue from AI-detected upsell opportunities.",
            tab: "engagement",
            context: { type: 'show_sales_leads' }
          },
          {
            label: "Demo Requests",
            val: summaryData.demo_meetings?.toString() || "0",
            sub: isRestored ? "All time" : `${localStartDate} to ${localEndDate}`,
            icon: CalendarCheck,
            color: "text-purple-600",
            bg: "bg-purple-50",
            tooltip: "Total number of demo or meeting requests detected from conversations.",
            tab: "calendar"
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={() => changeTab && stat.tab && changeTab(stat.tab, (stat as any).context)}
            className={`classic-card p-5 flex flex-col gap-3 relative group/kpi ${changeTab && stat.tab ? 'cursor-pointer hover:border-primary-300 hover:shadow-md transition-all' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                stat.sub === 'All systems go' || stat.sub === 'Within threshold' ? 'bg-success-50 text-success-600' :
                stat.sub === 'Needs attention' ? 'bg-danger-50 text-danger-600' :
                'bg-base-100 text-base-500'
              }`}>{stat.sub}</span>
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
              {changeTab && stat.tab && (
                <ChevronRight size={12} className="absolute top-3 right-3 text-base-300 opacity-0 group-hover/kpi:opacity-100 group-hover/kpi:text-primary-400 transition-all" />
              )}
            </div>
          </div>
        ))}
      </div>



      {/* ── Row 1: Activity Chart + Demo Trends ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <div className="classic-card p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-bold text-base-900">System Activity</h3>
              <p className="text-xs text-base-500 mt-0.5">Interaction volume (Last {dateRange} days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block"/><span className="text-base-500">Calls</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"/><span className="text-base-500">Escalated</span></span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => {
                    try {
                      return val.split('-').slice(1).join('/');
                    } catch(e) { return val; }
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ border: 'none', borderRadius: '10px', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="total_calls" name="Total Calls" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                <Area type="monotone" dataKey="escalated_calls" name="Escalated" stroke="#f97316" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Demo / Meeting Trends */}
        <div className="classic-card p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-base-900">Demo & Meeting Trends</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100 uppercase">Growth Insights</span>
              </div>
              <p className="text-xs text-base-500 mt-0.5">High-intent requests over time</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"/><span className="text-base-500">Demos</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success-500 inline-block"/><span className="text-base-500">Sales</span></span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(val) => {
                    try {
                      return val.split('-').slice(1).join('/');
                    } catch(e) { return val; }
                  }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="demo_meetings" 
                  name="Demo/Meetings" 
                  stroke="#9333ea" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#9333ea" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sales_leads" 
                  name="Sales Leads" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#fff", strokeWidth: 2, stroke: "#10b981" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Performance Metrics */}
      <div className="classic-card p-6">
        <div className="mb-5">
          <h3 className="text-base font-bold text-base-900">AI Performance</h3>
          <p className="text-xs text-base-500 mt-0.5">FCR Rate, Containment &amp; Avg CSAT</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'FCR Rate',
              sub: 'First call resolution',
              pct: Math.min(summaryData.fcr_rate || 0, 100),
              display: summaryData.fcr_rate ? `${summaryData.fcr_rate.toFixed(1)}%` : '—',
              color: '#10b981',
              track: '#d1fae5',
            },
            {
              label: 'Containment',
              sub: 'AI-handled without escalation',
              pct: Math.min(summaryData.containment_rate || 0, 100),
              display: summaryData.containment_rate ? `${summaryData.containment_rate.toFixed(1)}%` : '—',
              color: '#6366f1',
              track: '#e0e7ff',
            },
            {
              label: 'Avg CSAT',
              sub: 'Customer satisfaction score',
              pct: summaryData.avg_csat ? (summaryData.avg_csat / 5) * 100 : 0,
              display: summaryData.avg_csat ? `${summaryData.avg_csat.toFixed(1)}/5` : '—',
              color: '#f59e0b',
              track: '#fef3c7',
            },
          ].map(({ label, sub, pct, display, color, track }) => {
            const r = 38;
            const circ = 2 * Math.PI * r;
            const filled = (pct / 100) * circ;
            return (
              <div key={label} className="flex flex-col items-center gap-3">
                <div className="relative">
                  <svg width="96" height="96" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r={r} fill="none" stroke={track} strokeWidth="8" />
                    <circle
                      cx="48" cy="48" r={r} fill="none"
                      stroke={color} strokeWidth="8"
                      strokeDasharray={`${filled} ${circ}`}
                      strokeDashoffset={0}
                      strokeLinecap="round"
                      transform="rotate(-90 48 48)"
                      style={{ transition: 'stroke-dasharray 0.9s ease' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-base-900">{display}</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs font-semibold text-base-700">{label}</div>
                  <div className="text-[10px] text-base-400 mt-0.5 leading-tight">{sub}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Row 2: Priority Event Feed — full-width table ── */}
      <div className="classic-card overflow-hidden">
        <div className="px-6 py-4 border-b border-base-100 bg-base-50/50 flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-base-900">Priority Event Feed</h3>
              <p className="text-xs text-base-500 mt-0.5">Real-time · cross-domain</p>
            </div>
            {incidentFeed.length > 0 && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-success-600 bg-success-50 px-2.5 py-1 rounded-full border border-success-200">
                <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse inline-block" />
                Live
              </span>
            )}
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-base-400" />
            <select
              value={feedTypeFilter}
              onChange={e => setFeedTypeFilter(e.target.value)}
              className="text-xs border border-base-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary-400 text-base-700 bg-white"
            >
              <option value="all">All Types</option>
              <option value="call_analyzed">Call Analyzed</option>
              <option value="escalation_created">Escalation</option>
              <option value="sales_lead_detected">Sales Lead</option>
              <option value="threat_detected">Threat</option>
              <option value="alarm_triggered">Alarm</option>
              <option value="maintenance_required">Maintenance</option>
              <option value="robot_offline">Robot Offline</option>
              <option value="session_started">Session Started</option>
            </select>
            <select
              value={feedProductFilter}
              onChange={e => setFeedProductFilter(e.target.value)}
              className="text-xs border border-base-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-primary-400 text-base-700 bg-white"
            >
              <option value="all">All Products</option>
              <option value="sp50">CenoBots SP50</option>
              <option value="w3">Keenon W3</option>
              <option value="v3">temi V3</option>
              <option value="k5">Knightscope K5</option>
              <option value="yarbo">Yarbo Outdoor</option>
            </select>
            {(feedTypeFilter !== 'all' || feedProductFilter !== 'all') && (
              <button
                onClick={() => { setFeedTypeFilter('all'); setFeedProductFilter('all'); }}
                className="text-xs px-2 py-1.5 rounded-lg bg-base-100 hover:bg-base-200 text-base-600 transition-colors flex items-center gap-1"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>
        </div>

        {incidentFeed.length === 0 ? (
          <div className="text-center text-sm text-base-400 py-16">No events yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-base-100">
                  <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-6 py-3 w-24">Level</th>
                  <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3">Event</th>
                  <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3 w-36">Type</th>
                  <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3 w-28">Date</th>
                  <th className="text-left text-xs font-semibold text-base-400 uppercase tracking-wider px-4 py-3 w-24">Time</th>
                  <th className="text-right text-xs font-semibold text-base-400 uppercase tracking-wider px-6 py-3 w-28">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-50">
                {incidentFeed
                  .filter((incident: any) => {
                    if (feedTypeFilter !== 'all' && incident.event_type !== feedTypeFilter) return false;
                    if (feedProductFilter !== 'all' && incident.product !== feedProductFilter) return false;
                    return true;
                  })
                  .map((incident: any, idx: number) => {
                  const isSelected = selectedEvent &&
                    selectedEvent.timestamp === incident.timestamp &&
                    selectedEvent.title === incident.title;
                  const level = incident.severity || incident.level || 'info';
                  const levelStyles = level === 'critical'
                    ? { dot: 'bg-danger-500', badge: 'bg-danger-50 text-danger-700 border-danger-200' }
                    : level === 'warning'
                    ? { dot: 'bg-warning-500', badge: 'bg-warning-50 text-warning-700 border-warning-200' }
                    : { dot: 'bg-base-300', badge: 'bg-base-100 text-base-500 border-base-200' };
                  const dest = SOURCE_MAP[incident.event_type];
                  return (
                    <tr
                      key={incident.event_id || incident.id || idx}
                      onClick={() => setSelectedEvent(isSelected ? null : incident)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-base-50'}`}
                    >
                      {/* Level */}
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border capitalize ${levelStyles.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${levelStyles.dot}`} />
                          {level}
                        </span>
                      </td>
                      {/* Event */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-sm font-medium text-base-800 truncate">
                          {formatEventText(incident.details || incident.title)}
                        </p>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-base-500 capitalize">{(incident.event_type || 'system').replace(/_/g, ' ')}</span>
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-base-400 whitespace-nowrap">
                          {incident.timestamp
                            ? new Date(incident.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                      {/* Time */}
                      <td className="px-4 py-3">
                        <span className="text-xs text-base-400 whitespace-nowrap">
                          {incident.timestamp
                            ? new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : incident.time || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {dest ? (
                          <button
                            onClick={e => { 
                              e.stopPropagation(); 
                              const context = dest.action ? { type: dest.action, id: dest.idField ? incident[dest.idField] : undefined } : undefined;
                              changeTab?.(dest.tab, context); 
                            }}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 transition-colors whitespace-nowrap"
                          >
                            {dest.label} →
                          </button>
                        ) : (
                          <ChevronRight size={13} className={`text-base-300 ml-auto ${isSelected ? 'text-primary-400 rotate-90' : ''}`} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Event Detail Slide-out Panel ── */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="fixed top-0 right-0 h-full w-[420px] bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            {/* Header */}
            {(() => {
              const level = selectedEvent.severity || selectedEvent.level || 'info';
              const headerBg = level === 'critical' ? 'bg-danger-50 border-danger-200' : level === 'warning' ? 'bg-warning-50 border-warning-200' : 'bg-base-50 border-base-200';
              const headerText = level === 'critical' ? 'text-danger-900' : level === 'warning' ? 'text-warning-900' : 'text-base-900';
              const subText = level === 'critical' ? 'text-danger-600' : level === 'warning' ? 'text-warning-600' : 'text-base-500';
              return (
                <div className={`flex items-start justify-between px-6 py-5 border-b ${headerBg}`}>
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {level === 'critical' && <AlertTriangle size={14} className="text-danger-500 shrink-0" />}
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${subText}`}>{level}</span>
                    </div>
                    <h3 className={`text-sm font-bold leading-snug ${headerText}`}>{selectedEvent.details || selectedEvent.title}</h3>
                  </div>
                  <button onClick={() => setSelectedEvent(null)} className="p-1.5 hover:bg-white/60 rounded-full transition-colors shrink-0">
                    <X size={16} className="text-base-500" />
                  </button>
                </div>
              );
            })()}

            {/* Details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-base-400 mb-1"><Clock size={10}/> Timestamp</div>
                  <p className="text-xs font-semibold text-base-800">
                    {selectedEvent.timestamp
                      ? new Date(selectedEvent.timestamp).toLocaleString()
                      : selectedEvent.time || '—'}
                  </p>
                </div>
                <div className="bg-base-50 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-base-400 mb-1"><Tag size={10}/> Event Type</div>
                  <p className="text-xs font-semibold text-base-800 capitalize">{(selectedEvent.event_type || 'system_event').replace(/_/g, ' ')}</p>
                </div>
              </div>

              <div className="bg-base-50 rounded-xl p-3.5">
                <div className="text-[10px] uppercase font-bold text-base-400 mb-1">Origin / Domain</div>
                <p className="text-xs font-semibold text-base-800">{selectedEvent.user || selectedEvent.origin || '—'}</p>
              </div>

              {selectedEvent.product && (
                <div className="bg-base-50 rounded-xl p-3.5">
                  <div className="text-[10px] uppercase font-bold text-base-400 mb-1">Product</div>
                  <p className="text-xs font-semibold text-base-800 uppercase">{selectedEvent.product}</p>
                </div>
              )}

              {selectedEvent.outcome && (
                <div className="bg-base-50 rounded-xl p-3.5">
                  <div className="text-[10px] uppercase font-bold text-base-400 mb-1">Call Outcome</div>
                  <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${selectedEvent.outcome === 'resolved' ? 'bg-success-50 text-success-600' : selectedEvent.outcome === 'escalated' ? 'bg-danger-50 text-danger-600' : 'bg-base-100 text-base-600'}`}>
                    {selectedEvent.outcome}
                  </span>
                </div>
              )}

              {selectedEvent.call_id && (
                <div className="bg-primary-50 rounded-xl p-3.5 border border-primary-100">
                  <div className="text-[10px] uppercase font-bold text-primary-400 mb-1">Linked Call ID</div>
                  <p 
                    className={`text-xs font-mono font-semibold ${selectedEvent.user_id ? 'text-primary-700 cursor-pointer hover:underline' : 'text-primary-700'}`}
                    onClick={() => {
                      if (selectedEvent.user_id) {
                        changeTab?.('customers', { type: 'show_user', id: selectedEvent.user_id });
                      }
                    }}
                  >
                    {selectedEvent.call_id.startsWith('Call_ID') ? selectedEvent.call_id : `CALL-${toShortNum(selectedEvent.call_id)}`}
                  </p>
                </div>
              )}

              {selectedEvent.ticket_id && (
                <div className="bg-warning-50 rounded-xl p-3.5 border border-warning-100">
                  <div className="text-[10px] uppercase font-bold text-warning-400 mb-1">Escalation Ticket</div>
                  <p 
                    className={`text-xs font-mono font-semibold ${selectedEvent.user_id ? 'text-warning-700 cursor-pointer hover:underline' : 'text-warning-700'}`}
                    onClick={() => {
                      if (selectedEvent.user_id) {
                        changeTab?.('customers', { type: 'show_user', id: selectedEvent.user_id });
                      }
                    }}
                  >
                    {selectedEvent.ticket_id.startsWith('Ticket_ID') ? selectedEvent.ticket_id : `ESC-${toShortNum(selectedEvent.ticket_id)}`}
                  </p>
                  {selectedEvent.priority && (
                    <p className="text-xs text-warning-600 mt-1 capitalize">Priority: {selectedEvent.priority}</p>
                  )}
                </div>
              )}

              {selectedEvent.lead_id && (
                <div className="bg-success-50 rounded-xl p-3.5 border border-success-100">
                  <div className="text-[10px] uppercase font-bold text-success-400 mb-1">Sales Lead</div>
                  <p 
                    className={`text-xs font-mono font-semibold ${selectedEvent.user_id ? 'text-success-700 cursor-pointer hover:underline' : 'text-success-700'}`}
                    onClick={() => {
                      if (selectedEvent.user_id) {
                        changeTab?.('customers', { type: 'show_user', id: selectedEvent.user_id });
                      }
                    }}
                  >
                    {selectedEvent.lead_id.startsWith('Sales_ID') ? selectedEvent.lead_id : `Sales_ID${toShortNum(selectedEvent.lead_id)}`}
                  </p>
                  {selectedEvent.estimated_revenue > 0 && (
                    <p className="text-xs text-success-600 mt-1">Est. Revenue: ${selectedEvent.estimated_revenue.toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Extra metadata */}
              {(() => {
                const knownKeys = new Set(['event_id','id','event_type','title','details','origin','user','level','severity','timestamp','time','call_id','ticket_id','lead_id','product','outcome','priority','estimated_revenue','source']);
                const extras = Object.entries(selectedEvent).filter(([k]) => !knownKeys.has(k) && typeof selectedEvent[k] !== 'object');
                if (!extras.length) return null;
                return (
                  <div className="bg-base-50 rounded-xl p-3.5">
                    <div className="text-[10px] uppercase font-bold text-base-400 mb-2">Additional Details</div>
                    <div className="space-y-2">
                      {extras.map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-base-500 capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="font-semibold text-base-700">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sticky "Go to Source" footer */}
            {(() => {
              const dest = SOURCE_MAP[selectedEvent.event_type];
              if (dest) {
                return (
                  <div className="border-t border-base-100 px-5 py-4 bg-white shrink-0">
                    <p className="text-[10px] uppercase font-bold text-base-400 mb-1">Go to Source</p>
                    <p className="text-xs text-base-500 mb-3">{dest.description}</p>
                    <button
                      onClick={() => {
                        const context = dest.action
                          ? { type: dest.action, id: dest.idField ? selectedEvent[dest.idField] : undefined }
                          : undefined;
                        changeTab?.(dest.tab, context);
                        setSelectedEvent(null);
                      }}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-colors ${dest.color}`}
                    >
                      <ExternalLink size={14} />
                      Open in {dest.label}
                    </button>
                  </div>
                );
              }
              // Fallback for unknown/legacy event types — still show a navigation button
              return (
                <div className="border-t border-base-100 px-5 py-4 bg-white shrink-0">
                  <p className="text-[10px] uppercase font-bold text-base-400 mb-1">Go to Source</p>
                  <p className="text-xs text-base-500 mb-3">Navigate to the relevant section for this event.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { changeTab?.('fleet'); setSelectedEvent(null); }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-medium text-xs bg-base-100 hover:bg-base-200 text-base-700 transition-colors"
                    >
                      <Cpu size={13} /> Fleet Ops
                    </button>
                    <button
                      onClick={() => { changeTab?.('performance'); setSelectedEvent(null); }}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-medium text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors"
                    >
                      <Activity size={13} /> Conversation Metrics
                    </button>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GlobalDashboard;
