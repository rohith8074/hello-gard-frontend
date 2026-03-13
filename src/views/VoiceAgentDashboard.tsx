"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  BarChart3, Clock, TrendingUp, Target, Users, PhoneCall, 
  CheckCircle2, Smile, Zap, RefreshCw, X, ArrowUpRight, 
  Phone, Star, Cpu, MessageSquare, AlertTriangle, Calendar,
  Wrench, ChevronRight, CalendarCheck, DollarSign, AlertCircle, Filter,
  User, FileText, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subDays, format } from 'date-fns';
import { getDashboardSummary, refreshDashboard, getRecentCalls, getDashboardMetrics, getCallDetail, getEscalationTickets } from '@/lib/api';
import CalendarRangePicker from '@/components/CalendarRangePicker';

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

const hourlyCalls = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  inbound: Math.floor(Math.random() * 50) + 10,
  outbound: Math.floor(Math.random() * 20) + 5,
  latency: Math.floor(Math.random() * 300) + 400
}));

const resolutionReasons = [
  { name: 'Hardware Triage', handled: 420 },
  { name: 'Software Glitch', handled: 310 },
  { name: 'Routine Maint.', handled: 280 },
  { name: 'General Query', handled: 150 },
  { name: 'Escalated', handled: 85 }
];

interface VoiceAgentDashboardProps {
  productFilter: string;
  dateRange: number;
  startDate?: string;
  endDate?: string;
  onRangeChange?: (start: string, end: string) => void;
  initialAction?: { type: string; id?: string } | null;
  changeTab?: (tab: string, context?: any) => void;
}

const toShortNum = (id: string) => {
  // Convert last 5 chars of ID to a 0-99999 number for display
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = clean.slice(-6);
  let n = 0;
  for (let i = 0; i < tail.length; i++) n = (n * 36 + parseInt(tail[i], 36)) % 100000;
  return String(n).padStart(4, '0');
};

const formatCallId = (id: string, userId?: string, changeTab?: (tab: string, context?: any) => void) => {
  if (!id) return 'N/A';
  const displayId = id.startsWith('Call_ID') ? id : `CALL-${toShortNum(id)}`;
  if (userId && changeTab) {
    return (
      <span 
        onClick={(e) => {
          e.stopPropagation();
          changeTab('customers', { type: 'show_user', id: userId });
        }}
        className="cursor-pointer hover:underline"
      >
        {displayId}
      </span>
    );
  }
  return displayId;
};

const formatTicketId = (id: string, userId?: string, changeTab?: (tab: string, context?: any) => void) => {
  if (!id) return 'N/A';
  const displayId = id.startsWith('Ticket_ID') ? id : `ESC-${toShortNum(id)}`;
  if (userId && changeTab) {
    return (
      <span 
        onClick={(e) => {
          e.stopPropagation();
          changeTab('customers', { type: 'show_user', id: userId });
        }}
        className="cursor-pointer hover:underline"
      >
        {displayId}
      </span>
    );
  }
  return displayId;
};



export default function VoiceAgentDashboard({ productFilter, dateRange, startDate, endDate, onRangeChange, initialAction, changeTab }: VoiceAgentDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRestored, setIsRestored] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCall, setSelectedCall] = useState<any>(null);
  const [audioStatus, setAudioStatus] = useState<'loading' | 'ready' | 'error' | 'idle'>('idle');
  const [callTranscript, setCallTranscript] = useState<any[]>([]);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [chartData, setChartData] = useState({ volume: hourlyCalls, resolutions: resolutionReasons });
  const [escalationTickets, setEscalationTickets] = useState<any[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [localStartDate, setLocalStartDate] = useState(startDate || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
  const [localEndDate, setLocalEndDate] = useState(endDate || format(new Date(), 'yyyy-MM-dd'));
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState<{type: 'distribution' | 'shift', value: string, title: string, colorClass: string} | null>(null);
  const [summaryData, setSummaryData] = useState({
      total_calls: 0,
      fcr_rate: 0,
      containment_rate: 0,
      avg_csat: 0,
      avg_handle_time: 0,
      active_calls: 0,
      demo_meetings: 0
  });

  const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
          const [summaryRes, callsRes, metricsRes, escRes] = await Promise.all([
              getDashboardSummary(productFilter, isRestored ? undefined : localStartDate, isRestored ? undefined : localEndDate),
              getRecentCalls(50, 0, productFilter, localStartDate, localEndDate),
              getDashboardMetrics(dateRange, productFilter, localStartDate, localEndDate),
              getEscalationTickets(productFilter, localStartDate, localEndDate),
          ]);

          setSummaryData(summaryRes);

          if (callsRes?.calls) setRecentCalls(callsRes.calls);

          if (metricsRes?.metrics && metricsRes.metrics.length > 0) {
              const metrics = metricsRes.metrics;
              const volume = metrics.map((m: any) => ({
                 time: m.date,
                 inbound: m.total_calls,
                 outbound: 0,
                 latency: 350 + Math.floor(Math.random() * 100)
              }));

              const latest = metrics[metrics.length - 1];
              const topics = latest.topic_counts || {};

              const resolutions = Object.keys(topics).map(k => {
                  const topicName = k.replace(/_/g, ' ');
                  const matchingCalls = (callsRes?.calls || []).filter((c: any) => c.primary_topic === k || c.primary_topic === topicName);
                  const productBreakdown: Record<string, number> = {};
                  matchingCalls.forEach((mc: any) => {
                      const prod = mc.product || 'unknown';
                      productBreakdown[prod] = (productBreakdown[prod] || 0) + 1;
                  });
                  return { name: topicName, handled: topics[k], breakdown: productBreakdown };
              });

              setChartData({ volume, resolutions: resolutions.length ? resolutions : resolutionReasons });
          }

          if (escRes?.tickets) setEscalationTickets(escRes.tickets);
      } catch (e) {
          console.error("Failed to load summary", e);
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchDashboardData();
  }, [productFilter, dateRange, localStartDate, localEndDate, isRestored]);

  const handleRestore = () => {
    console.log("Restoring Voice defaults...");
    setLocalStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    setLocalEndDate(format(new Date(), 'yyyy-MM-dd'));
    setIsRestored(true);
  };

  useEffect(() => {
    if (initialAction && !isLoading) {
      if (initialAction.type === 'show_all_calls') {
        setSelectedTopic({
          name: 'All Calls',
          title: 'All Calls',
          calls: [...recentCalls].sort((a: any, b: any) => b.processed_at?.localeCompare(a.processed_at || '') || 0),
        });
      } else if ((initialAction.type === 'show_call_detail' || initialAction.type === 'show_call') && initialAction.id) {
        // Deep link to a specific call
        const fetchAndSelectCall = async () => {
          setSelectedCall(null);
          setAudioStatus('idle');
          setCallTranscript([]);
          setLoadingTranscript(true);
          try {
            const call = await getCallDetail(initialAction.id!);
            if (call) {
              setSelectedCall(call);
              if (call.transcript) setCallTranscript(call.transcript);
            }
          } catch(e) { console.error(e); }
          finally { setLoadingTranscript(false); }
        };
        fetchAndSelectCall();
      } else if (initialAction.type === 'show_escalations') {
        if (initialAction.id) {
          const target = escalationTickets.find((t: any) => t.ticket_id === initialAction.id || t.call_id === initialAction.id);
          if (target) {
            setSelectedTicket(target);
            setTicketStatusFilter(target.status);
          }
        } else {
          setTicketStatusFilter('open');
          const firstOpen = escalationTickets.find((t: any) => t.status === 'open');
          if (firstOpen) setSelectedTicket(firstOpen);
        }
        
        const ticketElement = document.getElementById('escalations-section');
        if (ticketElement) ticketElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [initialAction, isLoading, recentCalls.length, escalationTickets.length]);

  const checkAudioAvailable = async (callId: string) => {
      try {
          const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
          const res = await fetch(`${base}/dashboard/calls/${callId}/audio`, { method: 'HEAD' });
          setAudioStatus(res.ok ? 'idle' : 'error');
      } catch {
          setAudioStatus('error');
      }
  };

  const refetchAudio = async (callId: string) => {
      // Use 'fetching' so the <audio> element does NOT mount while we wait for the POST
      setAudioStatus('fetching' as any);
      try {
          const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
          const res = await fetch(`${base}/dashboard/calls/${callId}/fetch-audio`, { method: 'POST' });
          if (res.ok) {
              setAudioStatus('idle'); // now mount the player — audio is in DB
          } else {
              setAudioStatus('error');
          }
      } catch {
          setAudioStatus('error');
      }
  };

  const handleSelectCall = async (call: any) => {
      setSelectedCall(call);
      setAudioStatus('idle');
      setCallTranscript([]);
      setLoadingTranscript(true);
      const callId = call.call_id || call.session_id;
      checkAudioAvailable(callId);
      try {
          const detail = await getCallDetail(callId);
          if (detail?.transcript) {
              setCallTranscript(detail.transcript);
          }
      } catch (e) {
          console.error("Failed to load call detail", e);
      } finally {
          setLoadingTranscript(false);
      }
  };

  const handleRefresh = async () => {
      setIsRefreshing(true);
      try {
          await refreshDashboard();
          await fetchDashboardData();
      } catch (err) {
          console.error('Refresh failed:', err);
      } finally {
          setIsRefreshing(false);
      }
  };

  const filteredCalls = recentCalls;

  const productFilteredTickets = productFilter === 'all'
      ? escalationTickets
      : escalationTickets.filter((t: any) => t.product === productFilter);
  const filteredTickets = ticketStatusFilter === 'all'
      ? productFilteredTickets
      : productFilteredTickets.filter((t: any) => t.status === ticketStatusFilter);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-base-100 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-base-100 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-base-100 rounded-xl" />
          <div className="h-64 bg-base-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-base-100 rounded-xl" />
          <div className="h-80 bg-base-100 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-base-900">Conversation Metrics</h2>
            <p className="text-sm text-base-500 mt-0.5">{PRODUCT_LABELS[productFilter] || 'All Products'} · Post-call intelligence</p>
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
          {isRefreshing ? 'Processing…' : 'Sync Now'}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Total Calls",
            value: summaryData.total_calls.toLocaleString(),
            icon: PhoneCall,
            color: "text-primary-600",
            bg: "bg-primary-50",
            sub: isRestored ? "Till date" : `${localStartDate} to ${localEndDate}`,
            tooltip: "Total number of voice support sessions processed and analyzed by HelloGard AI.",
            onClick: () => setSelectedTopic({
              name: 'All Calls',
              title: 'All Calls',
              calls: [...recentCalls].sort((a: any, b: any) => b.processed_at?.localeCompare(a.processed_at || '') || 0),
            }),
          },
          {
            label: "AI Containment",
            value: summaryData.containment_rate ? `${Number(summaryData.containment_rate).toFixed(1)}%` : '0%',
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            sub: "Resolved without escalation",
            tooltip: "Percentage of issues successfully resolved by the AI without requiring human intervention.",
            onClick: () => setSelectedTopic({
              name: 'AI Contained',
              title: 'AI Contained Calls (not escalated)',
              calls: recentCalls.filter((c: any) => c.outcome !== 'escalated'),
            }),
          },
          {
            label: "Avg CSAT Score",
            value: summaryData.avg_csat ? `${Number(summaryData.avg_csat).toFixed(1)} / 5` : '— / 5',
            icon: Smile,
            color: "text-amber-500",
            bg: "bg-amber-50",
            sub: "Customer satisfaction",
            tooltip: "Average customer satisfaction score derived from sentiment analysis during call closure.",
            onClick: () => setSelectedTopic({
              name: 'CSAT',
              title: 'Calls by CSAT Score (highest first)',
              calls: [...recentCalls]
                .filter((c: any) => (c.actual_csat ?? c.predicted_csat) > 0)
                .sort((a: any, b: any) => ((b.actual_csat ?? b.predicted_csat) || 0) - ((a.actual_csat ?? a.predicted_csat) || 0)),
            }),
          },
          {
            label: "Resolution Rate",
            value: summaryData.fcr_rate ? `${Number(summaryData.fcr_rate).toFixed(1)}%` : '0%',
            icon: Zap,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            sub: isRestored ? "All-time" : "Range",
            tooltip: "Percentage of tickets resolved on the first interaction, measuring AI's immediate effectiveness.",
            onClick: () => setSelectedTopic({
              name: 'Resolved',
              title: 'First-Call Resolved',
              calls: recentCalls.filter((c: any) => c.outcome === 'resolved'),
            }),
          },
          {
            label: "Avg Handle Time",
            value: summaryData.avg_handle_time ? `${summaryData.avg_handle_time}s` : '—',
            icon: Clock,
            color: "text-violet-600",
            bg: "bg-violet-50",
            sub: isRestored ? "Till date" : "Range",
            tooltip: "Average duration of AI-handled calls in seconds. Lower AHT with high FCR signals a highly efficient AI.",
            onClick: () => setSelectedTopic({
              name: 'Handle Time',
              title: 'Calls by Handle Time (longest first)',
              calls: [...recentCalls]
                .filter((c: any) => c.duration_seconds > 0)
                .sort((a: any, b: any) => (b.duration_seconds || 0) - (a.duration_seconds || 0)),
            }),
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            className="classic-card p-5 relative group cursor-pointer transition-all hover:border-primary-300 hover:shadow-md"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-base-900 tabular-nums mb-1">{stat.value}</div>
            <div className="text-sm font-medium text-base-600">{stat.label}</div>
            <div className="text-xs text-base-400 mt-0.5">{stat.sub}</div>

            {/* Tooltip */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full mb-8 w-56 p-3 bg-gray-900 text-white text-[10px] leading-relaxed rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl border border-gray-700 font-normal">
                {stat.tooltip}
                <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        ))}
      </div>


      {/* Chart + Recent Calls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume Trends */}
        <div className="lg:col-span-2 classic-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-base-900">Call Volume Trends</h3>
              <p className="text-xs text-base-400 mt-0.5">Daily inbound call count (last 7 days)</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-base-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block" />
                Inbound
              </span>
            </div>
          </div>
          {chartData.volume.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-base-300 italic">No data available</div>
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.volume} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="time"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    domain={[0, 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    name="Inbound"
                    dataKey="inbound"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#callGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent Calls */}
        <div className="classic-card flex flex-col overflow-hidden" style={{ height: '320px' }}>
          <div className="px-5 py-4 border-b border-base-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-base-900">Recent Calls</h3>
              <p className="text-xs text-base-400 mt-0.5">Click a call to view details</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse inline-block" />
              <span className="text-xs font-medium text-success-600">Live</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-base-100">
            {filteredCalls.length === 0 ? (
              <div className="p-8 text-center text-sm text-base-300 italic">No calls yet</div>
            ) : filteredCalls.map((call: any, i: number) => {
              const rawId = call.call_id || call.session_id || '';
              const displayId = formatCallId(rawId);
              const csat = call.actual_csat ?? call.predicted_csat;
              return (
                <div
                  key={i}
                  onClick={() => handleSelectCall(call)}
                  className={`px-5 py-3 hover:bg-base-50 transition-all cursor-pointer border-l-2 ${
                    selectedCall?.call_id === rawId || selectedCall?.session_id === rawId
                      ? 'bg-primary-50 border-primary-600 shadow-inner' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[11px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                      {formatCallId(rawId, call.user_id || call.caller_id, changeTab)}
                    </span>
                    {csat != null && csat > 0 && (
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <Smile className="w-3 h-3" />{csat}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-base-700 truncate">
                    {call.primary_topic?.replace(/_/g, ' ') || 'Support Interaction'}
                  </p>
                  <p className="text-xs text-base-400 truncate mt-0.5">
                    {call.summary || 'No summary available'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sentiment Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="classic-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Smile className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-base-900">Sentiment Distribution</h3>
          </div>
          <p className="text-xs text-base-400 mb-4">Customer sentiment across all calls</p>
          <div className="h-[200px]">
            {(() => {
              const sentimentCounts = { positive: 0, neutral: 0, frustrated: 0, angry: 0 };
              filteredCalls.forEach((call: any) => {
                const sent = (call.customer_sentiment || call.sentiment?.end || 'neutral').toLowerCase();
                if (sent === 'positive') sentimentCounts.positive++;
                else if (sent === 'negative' || sent === 'angry') sentimentCounts.angry++;
                else if (sent === 'frustrated') sentimentCounts.frustrated++;
                else sentimentCounts.neutral++;
              });
              if (filteredCalls.length === 0) { sentimentCounts.positive = 48; sentimentCounts.neutral = 30; sentimentCounts.frustrated = 15; sentimentCounts.angry = 7; }
              const data = [
                { name: 'Positive', value: sentimentCounts.positive, color: '#10b981' },
                { name: 'Neutral', value: sentimentCounts.neutral, color: '#64748b' },
                { name: 'Frustrated', value: sentimentCounts.frustrated, color: '#f59e0b' },
                { name: 'Angry', value: sentimentCounts.angry, color: '#ef4444' }
              ].filter(d => d.value > 0);
              const total = data.reduce((s, d) => s + d.value, 0);
              return (
                <div className="flex items-center gap-6 h-full">
                  <ResponsiveContainer width="50%" height="100%">
                    <PieChart>
                      <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" stroke="none">
                        {data.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="cursor-pointer"
                            onClick={() => setSelectedSentimentFilter({ type: 'distribution', value: entry.name.toLowerCase(), title: entry.name + ' Calls', colorClass: `text-base-600 bg-base-50` })}
                          />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-2">
                    {data.map((item) => (
                      <div
                        key={item.name}
                        onClick={() => setSelectedSentimentFilter({ type: 'distribution', value: item.name.toLowerCase(), title: item.name + ' Calls', colorClass: 'text-base-600 bg-base-50' })}
                        className="flex items-center gap-2 text-xs cursor-pointer hover:bg-base-50 rounded-lg px-1.5 py-1 transition-colors"
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-base-600 font-medium">{item.name}</span>
                        <span className="text-base-400 ml-auto pl-4 tabular-nums">{total > 0 ? Math.round(item.value / total * 100) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Sentiment Shifts */}
        <div className="classic-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-base-900">Sentiment Shifts</h3>
            </div>
          </div>
          <p className="text-xs text-base-400 mb-4">How customer sentiment changed during calls</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Neg → Pos', key: 'negative_to_positive', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Stable Pos', key: 'stable_positive', icon: <Smile className="w-3.5 h-3.5 text-emerald-500" />, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
              { label: 'Stable Neu', key: 'stable_neutral', icon: <Clock className="w-3.5 h-3.5 text-slate-500" />, color: 'bg-slate-50 text-slate-600 border-slate-100' },
              { label: 'Pos → Neg', key: 'positive_to_negative', icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />, color: 'bg-rose-50 text-rose-700 border-rose-100' },
              { label: 'Degraded', key: 'degraded', icon: <Zap className="w-3.5 h-3.5 text-amber-500" />, color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Stable', key: 'stable', icon: <Target className="w-3.5 h-3.5 text-blue-500" />, color: 'bg-blue-50 text-blue-700 border-blue-100' }
            ].map((item, idx) => {
              const count = (productFilter === 'all' && filteredCalls.length === 0)
                ? [12, 35, 22, 3, 5, 8][idx]
                : filteredCalls.filter((c: any) => c.sentiment?.shift === item.key).length;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedSentimentFilter({ type: 'shift', value: item.key, title: item.label + ' Calls', colorClass: item.color })}
                  className={`p-3 rounded-xl border ${item.color} flex flex-col gap-2 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all`}
                >
                  <div className="flex items-center justify-between">
                    {item.icon}
                    <span className="text-lg font-bold tabular-nums">{count}</span>
                  </div>
                  <span className="text-[11px] font-semibold">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Escalation Tickets */}
      <div id="escalations-section">
        <div className="classic-card p-5 flex flex-col" style={{ height: '420px' }}>
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-base-900">Escalation Tickets</h3>
              <p className="text-xs text-base-400 mt-0.5">Calls escalated to human agents</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-bold tabular-nums ${
                ticketStatusFilter === 'resolved' ? 'text-success-600' :
                ticketStatusFilter === 'in_progress' ? 'text-amber-600' :
                'text-rose-600'
              }`}>
                {ticketStatusFilter === 'all' 
                  ? productFilteredTickets.length 
                  : productFilteredTickets.filter((t: any) => t.status === ticketStatusFilter).length
                }
              </span>
              <p className={`text-xs font-medium capitalize ${
                ticketStatusFilter === 'resolved' ? 'text-success-500' :
                ticketStatusFilter === 'in_progress' ? 'text-amber-500' :
                'text-rose-500'
              }`}>
                {ticketStatusFilter === 'all' ? 'Total' : ticketStatusFilter.replace('_', ' ')}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-4 shrink-0">
            {(['all', 'open', 'in_progress', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setTicketStatusFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap border ${
                  ticketStatusFilter === s
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-base-500 border-base-200 hover:bg-base-50'
                }`}
              >
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredTickets.length === 0 ? (
              <div className="text-sm text-base-300 italic text-center py-10">No tickets found</div>
            ) : filteredTickets.map((ticket: any, i: number) => (
              <div
                key={i}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 rounded-xl border transition-all bg-white cursor-pointer ${
                  selectedTicket?.ticket_id === ticket.ticket_id 
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-100 shadow-md translate-x-1' 
                    : 'border-base-100 hover:border-primary-200 hover:bg-base-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${ticket.priority === 'critical' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    <span className="font-mono text-xs font-bold text-base-700">
                      {formatTicketId(ticket.ticket_id || '', ticket.user_id, changeTab)}
                    </span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    ticket.status === 'open' ? 'bg-rose-50 text-rose-600' :
                    ticket.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                    'bg-success-50 text-success-600'
                  }`}>{ticket.status?.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-base-600 line-clamp-2">{ticket.summary}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-base-400">{PRODUCT_LABELS[ticket.product] || ticket.product}</span>
                  <span className="text-xs text-base-400">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Slide-out Call Detail Panel */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
            className="fixed top-0 right-0 h-full w-[480px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-base-200 flex justify-between items-start bg-primary-50">
               <div>
                  <h3 className="text-base font-bold text-base-900">Call Detail</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-xs font-bold bg-primary-600 text-white px-2.5 py-1 rounded-lg">
                      {formatCallId(selectedCall.call_id || selectedCall.session_id || '', selectedCall.user_id || selectedCall.caller_id, changeTab)}
                    </span>
                    <span className="text-xs text-base-500 font-medium">{selectedCall.product ? PRODUCT_LABELS[selectedCall.product] || selectedCall.product : 'Unknown'}</span>
                  </div>
               </div>
               <button onClick={() => { setSelectedCall(null); setAudioStatus('idle'); }} className="p-2 hover:bg-base-100 rounded-full transition-colors text-base-400">
                  <X className="w-5 h-5" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

               {/* User Details */}
               <div 
                 onClick={() => {
                   const uid = selectedCall.user_id || selectedCall.caller_id;
                   if (uid) changeTab?.('customers', { type: 'show_user', id: uid });
                 }}
                 className="bg-primary-50 border border-primary-100 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-primary-300 transition-all group"
               >
                 <div className="w-8 h-8 rounded-full bg-primary-100 group-hover:bg-primary-600 transition-colors flex items-center justify-center shrink-0">
                   <User className="w-4 h-4 text-primary-600 group-hover:text-white transition-colors" />
                 </div>
                 <div className="flex-1 min-w-0">
                   <div className="text-xs font-bold text-base-800 group-hover:text-primary-700">
                     {selectedCall.user_name || selectedCall.caller_name || 'View User Profile'}
                   </div>
                   <div className="text-[10px] text-base-400 mt-0.5">
                     {selectedCall.user_id || selectedCall.caller_id || '—'} · {selectedCall.product ? PRODUCT_LABELS[selectedCall.product] || selectedCall.product : 'Unknown product'}
                   </div>
                 </div>
                 <div className="bg-white px-2 py-1 rounded-lg border border-primary-100 text-[9px] font-bold text-primary-600 uppercase group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    Profile →
                 </div>
               </div>

               {/* Meta grid */}
               <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Outcome', val: selectedCall.outcome === 'resolved' ? 'Resolved' : 'Escalated', color: selectedCall.outcome === 'resolved' ? 'text-success-600' : 'text-danger-600' },
                    { label: 'Duration', val: selectedCall.duration_seconds > 0 ? `${selectedCall.duration_seconds}s` : '—', color: 'text-base-800' },
                    { label: 'Sentiment', val: (selectedCall.sentiment?.end || selectedCall.customer_sentiment || 'Neutral'), color: 'text-primary-600' },
                    { label: 'CSAT Score', val: (selectedCall.actual_csat ?? selectedCall.predicted_csat) != null ? `${(selectedCall.actual_csat ?? selectedCall.predicted_csat)}/5` : '—', color: 'text-amber-500' }
                  ].map((meta, i) => (
                    <div key={i} className="bg-base-50 border border-base-100 rounded-xl p-3 flex items-center gap-2.5">
                       {meta.label === 'CSAT Score' && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                       <div>
                         <span className="text-[10px] font-semibold text-base-400 uppercase tracking-wider block mb-0.5">{meta.label}</span>
                         <div className={`text-xs font-bold ${meta.color} capitalize`}>{meta.val}</div>
                       </div>
                    </div>
                  ))}
               </div>

                {selectedCall.rag_performance && (
                   <div 
                      onClick={() => changeTab?.('knowledge', { type: 'show_knowledge', call: selectedCall })}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all group/rag"
                   >
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-indigo-500 group-hover/rag:scale-110 transition-transform" />
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Knowledge Insight</h4>
                         </div>
                         <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-0.5 rounded-full shadow-sm group-hover/rag:border-indigo-300 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-600">
                               {Math.round((selectedCall.rag_performance.avg_kb_confidence || 0) * 100)}% Match
                            </span>
                         </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                         {selectedCall.rag_performance.citation_list?.slice(0, 3).map((cite: string, i: number) => {
                            const parts = cite.split('|');
                            const doc = parts[0]?.replace('1CenoBots ', '').replace('.pdf', '').trim();
                            const pg = parts[1]?.replace('Page:', 'p.').trim();
                            return (
                               <div key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500 flex items-center gap-1.5 shadow-xs">
                                  <FileText className="w-3 h-3 text-indigo-400" />
                                  {doc} {pg}
                               </div>
                            );
                         })}
                         {selectedCall.rag_performance.total_citations > 3 && (
                            <div className="px-2 py-1 text-[10px] font-bold text-slate-400 italic">
                               +{selectedCall.rag_performance.total_citations - 3} more sources
                            </div>
                         )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                         <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Click to View Grounding Detail</span>
                         <ArrowUpRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover/rag:opacity-100 transition-opacity" />
                      </div>
                   </div>
                )}

               {/* Summary */}
               <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary-500" />
                    <h4 className="text-xs font-bold text-base-800 uppercase tracking-wider">Call Summary</h4>
                  </div>
                  <p className="text-sm text-base-700 leading-relaxed bg-base-50 rounded-xl p-4 border border-base-100 italic">
                      {selectedCall.summary || "No summary available for this call."}
                  </p>
               </div>

               {/* Call Audio */}
               {(selectedCall.call_id || selectedCall.session_id) && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <PhoneCall className="w-4 h-4 text-green-500" />
                      <h4 className="text-xs font-bold text-base-800 uppercase tracking-wider">Call Recording</h4>
                    </div>
                    {(audioStatus as string) === 'fetching' ? (
                        <div className="text-sm text-base-500 bg-base-50 px-4 py-3 rounded-xl border border-base-100 flex items-center gap-3">
                          <RotateCcw className="w-3.5 h-3.5 animate-spin shrink-0" />
                          <span className="font-medium italic">Fetching audio from Lyzr…</span>
                        </div>
                    ) : audioStatus === 'error' ? (
                        <div className="text-sm text-base-500 bg-base-50 px-4 py-3 rounded-xl border border-base-100 flex items-center justify-between gap-3">
                          <span className="font-medium italic">Audio not available yet for this call.</span>
                          <button
                            onClick={() => refetchAudio(selectedCall.call_id || selectedCall.session_id)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 px-2.5 py-1 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors shrink-0"
                          >
                            <RotateCcw className="w-3 h-3" /> Refresh
                          </button>
                        </div>
                    ) : (
                        <audio 
                          controls 
                          className="w-full h-10 outline-none rounded-xl"
                          src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/dashboard/calls/${selectedCall.call_id || selectedCall.session_id}/audio`} 
                          onLoadStart={() => {
                            setAudioStatus('loading');
                          }}
                          onCanPlay={() => {
                            setAudioStatus('ready');
                          }}
                          onError={(e) => {
                            console.error('Audio component: error fetching stream', e);
                            setAudioStatus('error');
                          }}
                        >
                          Your browser does not support the audio element.
                        </audio>
                    )}
                  </div>
               )}

               {/* Transcript */}
               <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-xs font-bold text-base-800 uppercase tracking-wider">Transcript</h4>
                  </div>

                  <div className="space-y-3">
                      {loadingTranscript ? (
                         <div className="text-center py-8 text-sm text-base-400 italic">Loading transcript…</div>
                      ) : callTranscript.length > 0 ? (
                        callTranscript.map((msg: any, idx: number) => {
                          const isAgent = msg.role === 'agent' || msg.role === 'assistant';
                          return (
                            <motion.div
                              initial={{ opacity: 0, x: isAgent ? -8 : 8 }}
                              animate={{ opacity: 1, x: 0 }}
                              key={idx}
                              className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}
                            >
                               <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${isAgent ? 'bg-primary-600 text-white' : 'bg-base-100 text-base-500'}`}>
                                  {isAgent ? <Zap className="w-3.5 h-3.5" /> : <Smile className="w-3.5 h-3.5" />}
                               </div>
                               <div className={`flex-1 px-4 py-3 rounded-xl text-sm leading-relaxed ${
                                 isAgent
                                 ? 'bg-primary-600 text-white rounded-tl-none'
                                 : 'bg-base-100 text-base-800 rounded-tr-none'
                               }`}>
                                  {msg.text || msg.content}
                               </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <div className="text-center py-8 text-sm text-base-300 italic">No transcript available for this call.</div>
                      )}
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-out Ticket Detail Panel */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-50 flex flex-col pt-16"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-200 bg-rose-50">
               <div>
                 <h3 className="text-base font-bold text-base-900">Ticket Detail</h3>
                 <p className="text-sm text-rose-600 font-medium mt-0.5 font-mono">
                   {formatTicketId(selectedTicket.ticket_id || '', selectedTicket.user_id, changeTab)}
                 </p>
               </div>
               <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-rose-100 rounded-full transition-colors">
                 <X className="w-5 h-5 text-base-600" />
               </button>
            </div>

            <div className="px-6 py-5 border-b border-base-100 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Priority</dt>
                  <dd className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedTicket.priority === 'critical' ? 'bg-rose-50 text-rose-600' :
                    selectedTicket.priority === 'high' ? 'bg-orange-50 text-orange-600' :
                    selectedTicket.priority === 'medium' ? 'bg-amber-50 text-amber-600' :
                    'bg-base-100 text-base-600'
                  }`}>{selectedTicket.priority}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Status</dt>
                  <dd className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase ${
                    selectedTicket.status === 'open' ? 'bg-rose-50 text-rose-600' :
                    selectedTicket.status === 'in_progress' ? 'bg-amber-50 text-amber-600' :
                    'bg-success-50 text-success-600'
                  }`}>{selectedTicket.status?.replace('_', ' ')}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Product</dt>
                  <dd className="font-semibold text-base-900 text-sm">{PRODUCT_LABELS[selectedTicket.product] || selectedTicket.product}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Linked Call</dt>
                  <dd className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-base-900 text-xs bg-base-50 px-2 py-1 rounded border border-base-100">
                      {selectedTicket.call_id ? formatCallId(selectedTicket.call_id) : 'N/A'}
                    </span>
                    {selectedTicket.call_id && (
                      <button
                        onClick={() => {
                          const linkedCall = recentCalls.find((c: any) => (c.call_id || c.session_id) === selectedTicket.call_id);
                          if (linkedCall) {
                            setSelectedTicket(null);
                            handleSelectCall(linkedCall);
                          }
                        }}
                        className="text-[10px] font-bold text-primary-600 uppercase tracking-wider px-2 py-0.5 rounded border border-primary-200 hover:bg-primary-50 transition-colors"
                      >
                        View →
                      </button>
                    )}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Escalation Reason</dt>
                <dd className="font-semibold text-base-800 text-sm">{selectedTicket.reason}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-1">Created</dt>
                <dd className="text-sm text-base-600">{selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString() : 'N/A'}</dd>
              </div>
            </div>

            <div className="px-6 pb-2">
              <div 
                  onClick={() => {
                    if (selectedTicket.user_id) changeTab?.('customers', { type: 'show_user', id: selectedTicket.user_id });
                  }}
                  className="bg-primary-50 border border-primary-100 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:border-primary-300 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-100 group-hover:bg-primary-600 transition-colors flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-primary-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-base-800 group-hover:text-primary-700">
                      {selectedTicket.user_name || 'View User Profile'}
                    </div>
                    <div className="text-[10px] text-base-400 mt-0.5">
                      {selectedTicket.user_id || '—'} · {selectedTicket.user_company || 'Independent Account'}
                    </div>
                  </div>
                  <div className="bg-white px-2 py-1 rounded-lg border border-primary-100 text-[9px] font-bold text-primary-600 uppercase group-hover:bg-primary-600 group-hover:text-white transition-colors">
                      Profile →
                  </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-base-900 border-b border-base-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Issue Summary
              </div>
              <p className="text-sm text-base-700 leading-relaxed bg-base-50 rounded-xl p-4 border border-base-100">
                {selectedTicket.summary || selectedTicket.reason || 'No issue summary available. View the linked conversation for full details.'}
              </p>

              {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                <div>
                  <dt className="text-xs uppercase tracking-wider font-semibold text-base-400 mb-2">Tags</dt>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-base-100 text-base-600">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl border border-primary-100 bg-primary-50">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-600 mb-2">Recommended Action</p>
                <p className="text-sm text-primary-800">
                  {selectedTicket.priority === 'critical' ? 'Immediate attention required. Contact customer within 1 hour and dispatch technician if hardware-related.' :
                   selectedTicket.priority === 'high' ? 'Follow up within 4 hours. Review call transcript and prepare resolution plan.' :
                   'Standard follow-up within 24 hours. Monitor for any status changes.'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-out Topic Details Panel */}
      <AnimatePresence>
        {selectedTopic && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            {(() => {
                // Support pre-filtered call sets (from KPI card clicks) or topic-based filtering
                const matchingCalls = selectedTopic.calls
                  ? selectedTopic.calls
                  : filteredCalls.filter((c: any) => c.primary_topic === selectedTopic.name || c.primary_topic?.replace(/_/g, ' ') === selectedTopic.name);
                const avgDuration = matchingCalls.length ? Math.round(matchingCalls.reduce((s: number, c: any) => s + (c.duration_seconds || 0), 0) / matchingCalls.length) : 0;
                const callsWithCsat = matchingCalls.filter((c: any) => (c.actual_csat ?? c.predicted_csat) > 0);
                const avgCsat = callsWithCsat.length ? (callsWithCsat.reduce((s: number, c: any) => s + (c.actual_csat ?? c.predicted_csat), 0) / callsWithCsat.length).toFixed(1) : 'N/A';

                return (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-50">
                       <div>
                         <h3 className="text-base font-bold text-primary-900 capitalize">{selectedTopic.title || selectedTopic.name}</h3>
                         <p className="text-sm text-primary-700 font-medium mt-0.5">{matchingCalls.length} call{matchingCalls.length !== 1 ? 's' : ''}</p>
                       </div>
                       <button onClick={() => setSelectedTopic(null)} className="p-2 hover:bg-primary-100 rounded-full transition-colors">
                         <X className="w-5 h-5 text-primary-800" />
                       </button>
                    </div>

                    <div className="px-6 py-4 border-b border-base-100 bg-white grid grid-cols-3 gap-4">
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider font-semibold text-base-400 mb-1">Total Calls</dt>
                        <dd className="font-bold text-xl text-base-900">{matchingCalls.length}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider font-semibold text-base-400 mb-1">Avg Handle</dt>
                        <dd className="font-bold text-xl text-base-900">{avgDuration}s</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-wider font-semibold text-base-400 mb-1">Avg CSAT</dt>
                        <dd className="font-bold text-xl text-amber-500">{avgCsat}</dd>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-base-50 space-y-3">
                        <div className="text-xs uppercase font-bold text-base-400 tracking-wider mb-2 pl-2">Associated Calls</div>
                        {matchingCalls.length === 0 ? (
                           <div className="text-center p-6 text-sm text-base-400 bg-white rounded-xl border border-base-200">No calls found for this topic.</div>
                        ) : matchingCalls.map((call: any, i: number) => (
                           <div
                             key={i}
                             onClick={() => { handleSelectCall(call); setSelectedTopic(null); }}
                             className="p-4 rounded-xl border border-base-200 hover:border-primary-300 hover:shadow-sm transition-all bg-white cursor-pointer group"
                           >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-xs font-bold text-base-700 bg-base-100 px-2 py-0.5 rounded group-hover:text-primary-600 transition-colors">
                                  {formatCallId(call.call_id || call.session_id || '')}
                                </span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${call.outcome === 'resolved' ? 'bg-success-50 text-success-600' : 'bg-amber-50 text-amber-600'}`}>{call.outcome}</span>
                              </div>
                              <p className="text-xs text-base-600 truncate mb-2">&quot;{call.summary}&quot;</p>
                              <div className="flex justify-between">
                                  <span className="text-[10px] font-medium text-base-400">{PRODUCT_LABELS[call.product] || call.product}</span>
                                  {call.sentiment?.shift && (
                                     <span className="text-[10px] font-medium text-base-500 bg-base-100 px-1.5 rounded">{call.sentiment.shift.replace(/_/g, ' ')}</span>
                                  )}
                              </div>
                           </div>
                        ))}
                    </div>
                  </>
                );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-out Sentiment Filter Panel */}
      <AnimatePresence>
        {selectedSentimentFilter && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 h-full w-[450px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-[60] flex flex-col pt-16"
          >
            {(() => {
                const matchingCalls = filteredCalls.filter((c: any) => {
                    if (selectedSentimentFilter.type === 'distribution') {
                        let sent = (c.customer_sentiment || c.sentiment?.end || 'neutral').toLowerCase();
                        if (sent === 'negative') sent = 'angry';
                        return sent === selectedSentimentFilter.value;
                    } else {
                        return c.sentiment?.shift === selectedSentimentFilter.value;
                    }
                });

                return (
                  <>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-base-200 bg-base-50">
                       <div>
                         <h3 className="text-base font-bold text-base-900 capitalize">{selectedSentimentFilter.title}</h3>
                         <p className="text-sm text-base-500 font-medium mt-0.5">Call Segment</p>
                       </div>
                       <button onClick={() => setSelectedSentimentFilter(null)} className="p-2 hover:bg-base-100 rounded-full transition-colors">
                         <X className="w-5 h-5 text-base-600" />
                       </button>
                    </div>

                    <div className="px-6 py-3 border-b border-base-100 bg-white">
                      <dt className="text-[10px] uppercase tracking-wider font-semibold text-base-400 mb-1">Matched Calls</dt>
                      <dd className="font-bold text-xl text-base-900">{matchingCalls.length}</dd>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 bg-base-50 space-y-3">
                        <div className="text-xs uppercase font-bold text-base-400 tracking-wider mb-2 pl-2">Calls in Segment</div>
                        {matchingCalls.length === 0 ? (
                           <div className="text-center p-6 text-sm text-base-400 bg-white rounded-xl border border-base-200">No calls matched this criteria.</div>
                        ) : matchingCalls.map((call: any, i: number) => (
                           <div
                             key={i}
                             onClick={() => { handleSelectCall(call); setSelectedSentimentFilter(null); }}
                             className="p-4 rounded-xl border border-base-200 hover:border-primary-300 hover:shadow-sm transition-all bg-white cursor-pointer group"
                           >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-xs font-bold text-base-700 bg-base-100 px-2 py-0.5 rounded group-hover:text-primary-600 transition-colors">
                                  {formatCallId(call.call_id || call.session_id || '')}
                                </span>
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${call.outcome === 'resolved' ? 'bg-success-50 text-success-600' : 'bg-amber-50 text-amber-600'}`}>{call.outcome}</span>
                              </div>
                              <p className="text-xs text-base-600 leading-relaxed mb-2">&quot;{call.summary}&quot;</p>
                              <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded">{call.primary_topic?.replace(/_/g, ' ')}</span>
                                  {(call.actual_csat ?? call.predicted_csat) > 0 && (
                                     <span className="text-[10px] font-medium text-amber-600">CSAT: {call.actual_csat ?? call.predicted_csat}</span>
                                  )}
                              </div>
                           </div>
                        ))}
                    </div>
                  </>
                );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};


// VoiceAgentDashboard is already exported as default in the function definition.
