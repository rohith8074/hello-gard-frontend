"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, X, Calendar, PhoneCall, AlertTriangle,
  CheckCircle2, Clock, Wrench, TrendingUp, Wifi, Tag, Cpu, Star,
  ArrowRight, Activity, CalendarCheck, Filter, Building2, User
} from 'lucide-react';
import { getCalendarEvents, getCalendarStreamUrl } from '@/lib/api';
import { getToken } from '@/lib/auth';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CalendarEvent {
  call_id: string;
  user_id?: string;
  user_name?: string;
  user_company?: string;
  outcome: string;
  primary_topic: string;
  product: string;
  robot_model: string;
  duration_seconds: number;
  summary: string;
  processed_at: string;
  follow_up_action: string | null;
  escalation_reason: string | null;
  predicted_csat: number | null;
  actual_csat: number | null;
  sentiment: { start?: string; end?: string; shift?: string };
  tags: string[];
  ticket_info?: { priority?: string; category?: string; recap?: string };
  sales_lead_info?: { is_lead?: boolean; opportunity_type?: string; estimated_revenue?: number; confidence_score?: string };
}

interface DayData {
  total: number;
  resolved: number;
  escalated: number;
  abandoned: number;
  partial: number;
  out_of_scope: number;
  technician_visits: number;
  sales_leads: number;
  demo_meetings: number;
  events: CalendarEvent[];
}

interface CalendarDashboardProps {
  productFilter?: string;
  changeTab?: (tab: string, context?: any) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const OUTCOME_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string; icon: React.ElementType }> = {
  resolved:     { label: 'Resolved',     bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  escalated:    { label: 'Escalated',    bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500',     icon: AlertTriangle },
  partial:      { label: 'Partial',      bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   icon: Clock },
  abandoned:    { label: 'Abandoned',    bg: 'bg-base-100',    text: 'text-base-500',    dot: 'bg-base-400',    icon: PhoneCall },
  out_of_scope: { label: 'Out of Scope', bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-400',  icon: ArrowRight },
};

const CSAT_COLORS = ['', 'text-red-500', 'text-orange-500', 'text-amber-500', 'text-emerald-400', 'text-emerald-600'];

const toShortNum = (id: string) => {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '');
  const tail = clean.slice(-6);
  let n = 0;
  for (let i = 0; i < tail.length; i++) n = (n * 36 + parseInt(tail[i], 36)) % 100000;
  return String(n).padStart(4, '0');
};
const formatCallId = (id: string) => id ? `CALL-${toShortNum(id)}` : 'N/A';
const formatDuration = (s: number) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarDashboard({ productFilter = 'all', changeTab }: CalendarDashboardProps) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-based
  const [days, setDays]   = useState<Record<string, DayData>>({});
  const [loading, setLoading]           = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [panelFilter, setPanelFilter]   = useState<string | null>(null); // 'resolved'|'escalated'|'partial'|'technician'|'leads'|'abandoned'|null
  const [newDates, setNewDates]         = useState<Set<string>>(new Set());
  const [liveStatus, setLiveStatus]     = useState<'connecting' | 'live' | 'offline'>('connecting');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const sseRef = useRef<EventSource | null>(null);

  // Open detail panel (optionally pre-filtered) and scroll to it
  const openPanel = (date: string, filter: string | null = null) => {
    setSelectedDate(date);
    setPanelFilter(filter);
  };

  // ── Fetch month data ──────────────────────────────────────────────────────
  const fetchMonth = useCallback(async () => {
    setLoading(true);
    setDays({});
    const data = await getCalendarEvents(year, month, productFilter);
    setDays(data.days || {});
    setLoading(false);
  }, [year, month, productFilter]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  // ── SSE real-time stream ──────────────────────────────────────────────────
  useEffect(() => {
    if (sseRef.current) sseRef.current.close();

    const url = getCalendarStreamUrl(year, month, productFilter);
    // Append token for auth if needed (SSE doesn't support headers)
    const token = getToken();
    const es = new EventSource(token ? `${url}&token=${token}` : url);
    sseRef.current = es;
    setLiveStatus('connecting');

    es.onopen = () => setLiveStatus('live');
    es.onerror = () => setLiveStatus('offline');

    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'keepalive') return;
        if (msg.type === 'new_call' && msg.date && msg.call) {
          const { date, call } = msg;
          setDays(prev => {
            const existing = prev[date] || {
              total: 0, resolved: 0, escalated: 0, abandoned: 0,
              partial: 0, out_of_scope: 0, technician_visits: 0, sales_leads: 0, demo_meetings: 0, events: []
            };
            const updated: DayData = {
              ...existing,
              total: existing.total + 1,
              events: [...existing.events, call],
            };
            const outcome = call.outcome as string;
            if (outcome in updated) (updated as any)[outcome]++;
            if (call.follow_up_action === 'schedule_technician_visit') updated.technician_visits++;
            const DEMO_TOPICS = ['scheduling_service','pricing_sales','demo_request','service_scheduling','appointment_booking'];
            if (DEMO_TOPICS.includes(call.primary_topic)) updated.demo_meetings = (updated.demo_meetings || 0) + 1;
            return { ...prev, [date]: updated };
          });
          // Flash highlight
          setNewDates(prev => { const s = new Set(prev); s.add(date); return s; });
          setTimeout(() => setNewDates(prev => { const s = new Set(prev); s.delete(date); return s; }), 3000);
        }
      } catch { /* ignore */ }
    };

    return () => { es.close(); sseRef.current = null; };
  }, [year, month, productFilter]);

  // ── Calendar grid math ────────────────────────────────────────────────────
  const daysInMonth  = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const startOffset  = (firstDayOfWeek + 6) % 7;               // shift to Mon=0
  const totalCells   = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const navMonth = (delta: number) => {
    setMonth(m => {
      let nm = m + delta;
      if (nm < 1)  { setYear(y => y - 1); return 12; }
      if (nm > 12) { setYear(y => y + 1); return 1;  }
      return nm;
    });
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // ── Apply date range filter ───────────────────────────────────────────────
  const filteredDayEntries = Object.entries(days).filter(([dateStr]) => {
    if (dateFrom && dateStr < dateFrom) return false;
    if (dateTo   && dateStr > dateTo)   return false;
    return true;
  });
  const filteredDays = Object.fromEntries(filteredDayEntries);
  const rangeActive = dateFrom || dateTo;

  // ── Summary stats for the month ───────────────────────────────────────────
  const monthStats = Object.values(rangeActive ? filteredDays : days).reduce(
    (acc, d) => ({
      total:      acc.total      + d.total,
      resolved:   acc.resolved   + d.resolved,
      escalated:  acc.escalated  + d.escalated,
      technician: acc.technician + d.technician_visits,
      leads:      acc.leads      + d.sales_leads,
      demos:      acc.demos      + (d.demo_meetings || 0),
    }),
    { total: 0, resolved: 0, escalated: 0, technician: 0, leads: 0, demos: 0 }
  );

  const selectedDay = selectedDate ? days[selectedDate] : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-base-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-600" />
            Activity Calendar
          </h2>
          <p className="text-sm text-base-500 mt-0.5">All AI-handled calls, escalations & follow-ups</p>
        </div>

        {/* Live indicator */}
        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${
          liveStatus === 'live'        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
          liveStatus === 'connecting'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                         'bg-red-50 text-red-600 border-red-200'
        }`}>
          <Wifi className={`w-3.5 h-3.5 ${liveStatus === 'live' ? 'animate-pulse' : ''}`} />
          {liveStatus === 'live' ? 'Live updates' : liveStatus === 'connecting' ? 'Connecting…' : 'Offline'}
        </div>
      </div>



      {/* Month summary stats — click to filter detail panel */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Total Calls',  value: monthStats.total,     icon: PhoneCall,      bg: 'bg-primary-50',  text: 'text-primary-600',  filter: null,         field: 'total'             },
          { label: 'Resolved',     value: monthStats.resolved,  icon: CheckCircle2,   bg: 'bg-emerald-50',  text: 'text-emerald-600',  filter: 'resolved',   field: 'resolved'          },
          { label: 'Escalated',    value: monthStats.escalated, icon: AlertTriangle,  bg: 'bg-red-50',      text: 'text-red-600',      filter: 'escalated',  field: 'escalated'         },
          { label: 'Technician',   value: monthStats.technician,icon: Wrench,         bg: 'bg-blue-50',     text: 'text-blue-600',     filter: 'technician', field: 'technician_visits' },
          { label: 'Sales Leads',  value: monthStats.leads,     icon: TrendingUp,     bg: 'bg-violet-50',   text: 'text-violet-600',   filter: 'leads',      field: 'sales_leads'       },
          { label: 'Demo / Meet',  value: monthStats.demos,     icon: CalendarCheck,  bg: 'bg-purple-50',   text: 'text-purple-600',   filter: 'demo',       field: 'demo_meetings'     },
        ].map((s, i) => {
          const isActive = panelFilter === s.filter;
          // Find most recent day with this event type
          const handleClick = () => {
            const targetField = s.field as keyof DayData;
            const latestDay = Object.entries(days)
              .filter(([, d]) => s.filter === null ? d.total > 0 : (d[targetField] as number) > 0)
              .sort(([a], [b]) => b.localeCompare(a))[0];
            if (latestDay) openPanel(latestDay[0], s.filter);
            else setPanelFilter(s.filter);
          };
          return (
            <button
              key={i}
              onClick={handleClick}
              className={`classic-card px-4 py-3 flex items-center gap-3 text-left w-full transition-all hover:shadow-md hover:border-primary-200 ${isActive ? 'ring-2 ring-primary-300 border-primary-200' : ''}`}
            >
              <div className={`p-2 rounded-lg ${s.bg} flex-shrink-0`}>
                <s.icon className={`w-4 h-4 ${s.text}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-base-900 tabular-nums">{s.value}</div>
                <div className="text-xs text-base-400">{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Calendar card */}
      <div className="classic-card overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-100">
          <div className="flex items-center gap-3">
            <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-base-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-base-600" />
            </button>
            <h3 className="text-lg font-bold text-base-900 w-44 text-center">
              {MONTH_NAMES[month - 1]} {year}
            </h3>
            <button onClick={() => navMonth(1)} className="p-1.5 rounded-lg hover:bg-base-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-base-600" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-base-500">
              {[
                { dot: 'bg-emerald-500', label: 'Resolved' },
                { dot: 'bg-red-500',     label: 'Escalated' },
                { dot: 'bg-amber-400',   label: 'Partial' },
                { dot: 'bg-blue-500',    label: 'Technician' },
                { dot: 'bg-violet-500',  label: 'Lead' },
                { dot: 'bg-purple-500',  label: 'Demo/Meet' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${l.dot}`} />
                  {l.label}
                </div>
              ))}
            </div>

            <button
              onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-base-200 hover:border-primary-300 hover:text-primary-600 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-base-100">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-base-400 py-2.5 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <div className="grid grid-cols-7">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-28 border-r border-b border-base-50 animate-pulse bg-base-50/50" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {[...Array(totalCells)].map((_, idx) => {
              const dayNum = idx - startOffset + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const dateStr = isCurrentMonth
                ? `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
                : null;
              const dayData   = dateStr ? days[dateStr] : null;
              const isToday   = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isNew     = dateStr ? newDates.has(dateStr) : false;
              const isOutOfRange = rangeActive && dateStr && (
                (dateFrom && dateStr < dateFrom) || (dateTo && dateStr > dateTo)
              );

              return (
                <div
                  key={idx}
                  onClick={() => dateStr && !isOutOfRange && setSelectedDate(isSelected ? null : dateStr)}
                  className={`h-28 border-r border-b border-base-100 p-2 flex flex-col transition-all
                    ${!isCurrentMonth ? 'bg-base-50/40' : isOutOfRange ? 'opacity-30 bg-base-50/40' : 'hover:bg-primary-50/30 cursor-pointer'}
                    ${isSelected ? 'bg-primary-50 ring-2 ring-inset ring-primary-300' : ''}
                    ${isNew ? 'bg-emerald-50 animate-pulse' : ''}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-primary-600 text-white' : isCurrentMonth ? 'text-base-700' : 'text-base-300'}
                    `}>
                      {isCurrentMonth ? dayNum : ''}
                    </span>
                    {dayData && dayData.total > 0 && (
                      <span className="text-[10px] font-bold text-base-400">{dayData.total}</span>
                    )}
                  </div>

                  {/* Event chips — each chip opens panel filtered to that type */}
                  {dayData && isCurrentMonth && (
                    <div className="flex flex-col gap-0.5 flex-1 overflow-hidden">
                      {dayData.escalated > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'escalated'); }} className="flex items-center gap-1 bg-red-50 hover:bg-red-100 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-red-700 truncate">{dayData.escalated} Escalated</span>
                        </button>
                      )}
                      {dayData.resolved > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'resolved'); }} className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-emerald-700 truncate">{dayData.resolved} Resolved</span>
                        </button>
                      )}
                      {dayData.technician_visits > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'technician'); }} className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-blue-700 truncate">{dayData.technician_visits} Technician</span>
                        </button>
                      )}
                      {dayData.sales_leads > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'leads'); }} className="flex items-center gap-1 bg-violet-50 hover:bg-violet-100 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-violet-700 truncate">{dayData.sales_leads} Lead</span>
                        </button>
                      )}
                      {dayData.abandoned > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'abandoned'); }} className="flex items-center gap-1 bg-base-100 hover:bg-base-200 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-base-400 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-base-500 truncate">{dayData.abandoned} Abandoned</span>
                        </button>
                      )}
                      {(dayData.demo_meetings || 0) > 0 && (
                        <button onClick={e => { e.stopPropagation(); openPanel(dateStr!, 'demo'); }} className="flex items-center gap-1 bg-purple-50 hover:bg-purple-100 rounded px-1.5 py-0.5 text-left transition-colors">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0" />
                          <span className="text-[10px] font-medium text-purple-700 truncate">{dayData.demo_meetings} Demo/Meet</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day detail slide-out panel */}
      <AnimatePresence>
        {selectedDate && selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="classic-card overflow-hidden mt-6"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-base-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center border border-primary-100">
                  <Calendar className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-base-900 tracking-tight">
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-base-500 font-medium">{selectedDay.total} events recorded</p>
                    {panelFilter && (
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary-600 text-white shadow-sm ring-2 ring-primary-100">
                        {panelFilter.replace(/_/g, ' ')} Only
                        <button onClick={() => setPanelFilter(null)} className="hover:text-primary-200 ml-1 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedDate(null); setPanelFilter(null); }} 
                className="p-2 hover:bg-base-100 rounded-2xl transition-all border border-transparent hover:border-base-200"
              >
                <X className="w-6 h-6 text-base-400" />
              </button>
            </div>

            {/* Day summary segments — click each stat to filter event list */}
            <div className="flex border-b border-base-100 bg-base-50/30 overflow-x-auto no-scrollbar">
              {[
                { label: 'Resolved',   value: selectedDay.resolved,           color: 'text-emerald-700', active: 'bg-emerald-50 border-emerald-500 text-emerald-700', filter: 'resolved'   },
                { label: 'Escalated',  value: selectedDay.escalated,          color: 'text-red-700',     active: 'bg-red-50 border-red-500 text-red-700',       filter: 'escalated'  },
                { label: 'Partial',    value: selectedDay.partial,            color: 'text-amber-700',   active: 'bg-amber-50 border-amber-500 text-amber-700',   filter: 'partial'    },
                { label: 'Technician', value: selectedDay.technician_visits,  color: 'text-blue-700',    active: 'bg-blue-50 border-blue-500 text-blue-700',    filter: 'technician' },
                { label: 'Leads',      value: selectedDay.sales_leads,        color: 'text-violet-700',  active: 'bg-violet-50 border-violet-500 text-violet-700',  filter: 'leads'      },
                { label: 'Demo/Meet',  value: selectedDay.demo_meetings || 0, color: 'text-purple-700',  active: 'bg-purple-50 border-purple-500 text-purple-700',  filter: 'demo'       },
              ].map(s => {
                const isActive = panelFilter === s.filter;
                return (
                  <button
                    key={s.label}
                    onClick={() => setPanelFilter(isActive ? null : s.filter)}
                    disabled={s.value === 0}
                    className={`flex-1 min-w-[120px] py-4 px-2 text-center transition-all border-b-2
                      ${isActive ? s.active : 'border-transparent hover:bg-white'}
                      ${s.value === 0 ? 'opacity-30 cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    <div className="text-xl font-black mb-0.5">{s.value}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.15em] opacity-60">{s.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Event list — card form */}
            <div className="divide-y divide-base-100 max-h-[600px] overflow-y-auto bg-white p-6 space-y-6 no-scrollbar">
              {(() => {
                // Deduplicate by call_id — prefer records with user_name populated
                const deduped = Object.values(
                  (selectedDay.events || []).reduce((acc: Record<string, any>, ev: any) => {
                    const key = ev.call_id || ev.session_id || ev.processed_at;
                    if (!key) return acc;
                    const existing = acc[key];
                    if (!existing) { acc[key] = ev; return acc; }
                    const score = (e: any) => (e.user_name ? 2 : 0) + (e.user_id ? 1 : 0);
                    if (score(ev) > score(existing)) acc[key] = ev;
                    return acc;
                  }, {} as Record<string, any>)
                );
                const filtered = deduped
                  .slice()
                  .sort((a: any, b: any) => b.processed_at.localeCompare(a.processed_at))
                  .filter((ev: any) => {
                    if (!panelFilter) return true;
                    if (panelFilter === 'technician') return ev.follow_up_action === 'schedule_technician_visit';
                    if (panelFilter === 'leads') return ev.sales_lead_info?.is_lead === true;
                    if (panelFilter === 'demo') return ['scheduling_service','pricing_sales','demo_request','service_scheduling','appointment_booking'].includes(ev.primary_topic);
                    return ev.outcome === panelFilter;
                  });
                return filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-base-300">
                    <Calendar className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium italic">No {panelFilter || ''} events on this day</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                    {filtered.map((ev, i) => {
                      const cfg = OUTCOME_CONFIG[ev.outcome] || OUTCOME_CONFIG.abandoned;
                      const Icon = cfg.icon;
                      const userInitial = ev.user_name ? ev.user_name[0].toUpperCase() : 'U';
                      
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -4 }}
                          className="classic-card p-5 group cursor-default hover:border-primary-200 transition-all flex flex-col justify-between"
                        >
                          <div>
                            {/* Header: User Info + Outcome */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                                  {userInitial}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-sm font-bold text-base-900 truncate">
                                    {ev.user_name || ev.user_id || formatCallId(ev.call_id)}
                                  </h4>
                                  {ev.user_company && (
                                    <p className="text-[10px] font-medium text-base-400 truncate flex items-center gap-1">
                                      <Building2 className="w-3 h-3" />
                                      {ev.user_company}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} border-current/10`}>
                                {ev.outcome.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {/* Call Details */}
                            <div className="space-y-3 mb-4">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span className="text-base-400 font-mono tracking-tight">{formatCallId(ev.call_id)}</span>
                                <div className="flex items-center gap-2 text-base-400">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>{formatTime(ev.processed_at)}</span>
                                  <span className="opacity-40">·</span>
                                  <span>{formatDuration(ev.duration_seconds)}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-base-50 rounded-lg text-[10px] font-bold text-base-500 border border-base-100">
                                  <Cpu className="w-2.5 h-2.5" />
                                  {ev.robot_model !== 'unknown' ? ev.robot_model : ev.product}
                                </div>
                                <div className="text-[10px] font-bold text-base-400 bg-base-50 px-2 py-0.5 rounded-lg border border-base-100 capitalize">
                                  {ev.primary_topic.replace(/_/g, ' ')}
                                </div>
                                {ev.predicted_csat && (
                                  <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border shadow-sm ${CSAT_COLORS[ev.predicted_csat] || 'text-base-500'} bg-white`}>
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    {ev.actual_csat ?? ev.predicted_csat}/5
                                  </div>
                                )}
                              </div>

                              {ev.summary && (
                                <p className="text-xs font-medium text-base-500 leading-relaxed line-clamp-2 italic">
                                  "{ev.summary}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-4 border-t border-base-50">
                            {/* Always Conversation */}
                            <button
                              onClick={() => changeTab?.('performance', { type: 'show_call', id: ev.call_id })}
                              className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 text-white text-[10px] font-bold hover:bg-primary-700 transition-all shadow-sm shadow-primary-100"
                            >
                              <Activity className="w-3 h-3" />
                              Conversation
                            </button>

                            {/* User Profile */}
                            {ev.user_id && (
                              <button
                                onClick={() => changeTab?.('customers', { type: 'show_user', id: ev.user_id })}
                                className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-base-200 text-base-600 text-[10px] font-bold hover:bg-base-50 transition-all"
                              >
                                <User className="w-3 h-3 text-primary-500" />
                                Profile
                              </button>
                            )}

                            {/* Sales */}
                            {ev.sales_lead_info?.is_lead && (
                              <button
                                onClick={() => changeTab?.('engagement', { type: 'show_sales_leads', id: ev.call_id })}
                                className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition-all"
                              >
                                <TrendingUp className="w-3 h-3" />
                                Sales
                              </button>
                            )}

                            {/* Escalation */}
                            {ev.outcome === 'escalated' && (
                              <button
                                onClick={() => changeTab?.('performance', { type: 'show_escalations', id: ev.call_id })}
                                className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-bold border border-red-100 hover:bg-red-100 transition-all"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                Escalation
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
