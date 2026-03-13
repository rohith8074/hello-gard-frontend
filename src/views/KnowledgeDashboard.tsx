"use client";

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { BookOpen, Target, FileText, CheckCircle, Search, Layers, RefreshCw, AlertCircle, RotateCcw, Cpu, Zap, X, Smile, PhoneCall, User, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { getRagMetrics } from '@/lib/api';

import CalendarRangePicker from '@/components/CalendarRangePicker';

const COLORS = ['#2563eb', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

interface KnowledgeDashboardProps {
    productFilter?: string;
    startDate?: string;
    endDate?: string;
    onRangeChange?: (start: string, end: string) => void;
    changeTab?: (tab: string, context?: any) => void;
    initialAction?: any;
}

const KnowledgeDashboard = ({ productFilter = 'all', startDate, endDate, onRangeChange, changeTab, initialAction }: KnowledgeDashboardProps) => {
    const [metrics, setMetrics] = useState<any>(null);
    const [allTimeMetrics, setAllTimeMetrics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isRestored, setIsRestored] = useState(true);
    const [localStartDate, setLocalStartDate] = useState(startDate || format(subDays(new Date(), 6), 'yyyy-MM-dd'));
    const [localEndDate, setLocalEndDate] = useState(endDate || format(new Date(), 'yyyy-MM-dd'));
    const [selectedCall, setSelectedCall] = useState<any>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [res, allRes] = await Promise.all([
                getRagMetrics(productFilter, localStartDate, localEndDate),
                getRagMetrics(productFilter)
            ]);
            setMetrics(res);
            setAllTimeMetrics(allRes);
        } catch (e) {
            console.error("Failed to fetch RAG metrics", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialAction && initialAction.type === 'show_knowledge' && initialAction.call) {
            setSelectedCall(initialAction.call);
        }
    }, [initialAction]);

    useEffect(() => {
        fetchData();
    }, [productFilter, localStartDate, localEndDate]);

    const handleRestore = () => {
        console.log("Restoring Knowledge defaults...");
        setLocalStartDate(format(subDays(new Date(), 6), 'yyyy-MM-dd'));
        setLocalEndDate(format(new Date(), 'yyyy-MM-dd'));
        setIsRestored(true);
    };

    if (loading || !metrics) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
            </div>
        );
    }

    const modalityData = [
        { name: 'Text', value: metrics.modality_distribution.text },
        { name: 'Image', value: metrics.modality_distribution.image },
        { name: 'Table', value: metrics.modality_distribution.table },
        { name: 'Graph', value: metrics.modality_distribution.graph },
    ].filter(d => d.value > 0);
    
    // Helper to clean up citation labels
    const formatCiteLabel = (cite: string) => {
        if (!cite) return 'Unknown Source';
        const parts = cite.split('|');
        const rawLabel = parts[0]?.trim() || '';
        
        // Remove paths (storage/manuals/doc.pdf -> doc.pdf)
        const filename = rawLabel.split('/').pop() || rawLabel;
        
        // Remove common prefixes/suffixes
        return filename
            .replace('1CenoBots ', '')
            .replace('.pdf', '')
            .replace('.txt', '')
            .replace('.md', '')
            .trim() || 'Document';
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-base-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-6 h-6 text-primary-600" />
                        <div>
                            <h2 className="text-xl font-bold text-base-900">Knowledge & RAG Dashboard</h2>
                            <p className="text-sm text-base-500">Monitoring document retrieval accuracy and modality distribution</p>
                        </div>
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
                <button onClick={fetchData} className="p-2 hover:bg-base-100 rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5 text-base-600" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: "RAG Confidence", val: `${(isRestored && allTimeMetrics ? allTimeMetrics.avg_kb_confidence : metrics.avg_kb_confidence)}%`, icon: Target, color: "text-primary-600", bg: "bg-primary-50", tooltip: "Average confidence score of the AI's knowledge retrieval across all technical queries.", sub: isRestored ? "All-time" : "Range" },
                    { label: "Resolved via KB", val: "84%", icon: CheckCircle, color: "text-blue-600", bg: "bg-blue-50", tooltip: "Percentage of troubleshooting issues resolved solely using AI-retrieved documentation.", sub: "Standard baseline" }
                ].map((stat, idx) => (
                    <div key={idx} className="classic-card p-6">
                        <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-4`}>
                            <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-base-900 mb-0.5">{stat.val}</div>
                        <div className="text-[10px] font-bold text-base-400 uppercase tracking-tighter mb-2">{stat.sub}</div>
                        <div className="flex items-center gap-1.5 group cursor-help relative">
                            <div className="text-sm font-medium text-base-500">{stat.label}</div>
                            <div className="w-3.5 h-3.5 rounded-full border border-base-300 flex items-center justify-center text-[9px] text-base-400">?</div>
                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none shadow-xl border border-gray-700">
                                {stat.tooltip}
                                <div className="absolute top-full left-4 -ml-1 border-4 border-transparent border-t-gray-900"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 classic-card p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">System Knowledge Activity</h3>
                        <p className="text-sm text-slate-400 font-medium">Interaction volume & Accuracy (Last 7 days)</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary-500" />
                            <span className="text-xs font-bold text-slate-500">Confidence %</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-xs font-bold text-slate-500">Volume</span>
                        </div>
                    </div>
                </div>
                <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.rag_trend} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                            <defs>
                                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                                dy={15}
                                tickFormatter={(val) => {
                                    try {
                                        return format(new Date(val), 'MM/dd');
                                    } catch (e) {
                                        return val;
                                    }
                                }}
                            />
                            <YAxis 
                                yAxisId="left"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 11, fontWeight: 600}} 
                                domain={[0, 100]}
                                tickCount={6}
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                hide={true}
                                domain={[0, 'auto']}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', padding: '12px' }}
                                labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}
                                formatter={(value: any, name: any) => [
                                    Math.round(value), 
                                    name === 'confidence' ? 'Confidence' : 'Volume'
                                ]}
                                labelFormatter={(label) => {
                                    try {
                                        return format(new Date(label), 'EEEE, MMM dd');
                                    } catch (e) {
                                        return label;
                                    }
                                }}
                            />
                            <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="confidence" 
                                stroke="#3b82f6" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorConf)" 
                                animationDuration={1500}
                            />
                            <Area 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="volume" 
                                stroke="#f97316" 
                                strokeWidth={4}
                                fillOpacity={1} 
                                fill="url(#colorVol)" 
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                </div>

                <div className="classic-card p-6">
                    <h3 className="text-lg font-bold text-base-900 mb-6 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-primary-600" />
                        Most Cited Documents
                    </h3>
                    <div className="space-y-4">
                        {metrics.top_cited_docs.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-base-100 hover:bg-base-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="text-sm font-bold text-base-400 w-5">{i+1}</div>
                                    <div className="text-sm font-semibold text-base-800 truncate max-w-[120px]" title={doc.name}>{doc.name}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-1.5 rounded-full bg-base-100 overflow-hidden shrink-0">
                                        <div className="h-full bg-primary-600 rounded-full" style={{ width: `${(doc.count / metrics.top_cited_docs[0].count) * 100}%` }} />
                                    </div>
                                    <div className="text-[10px] font-bold text-base-500 whitespace-nowrap">{doc.count} pts</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="classic-card p-6">
                <h3 className="text-lg font-bold text-base-900 mb-6 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-500" />
                    Knowledge Grounding Feed
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.recent_events?.length > 0 ? metrics.recent_events.map((call: any, i: number) => (
                        <div 
                            key={i} 
                            onClick={() => setSelectedCall(call)}
                            className={`p-4 rounded-2xl border transition-all bg-base-50/50 cursor-pointer group ${
                                selectedCall?.call_id === call.call_id 
                                ? 'border-primary-500 ring-2 ring-primary-100 shadow-md translate-y-[-2px] bg-white' 
                                : 'border-base-100 hover:border-primary-300 hover:shadow-md'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white border border-base-200 flex items-center justify-center shrink-0">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-base-800">{call.user_name || 'Individual Customer'}</div>
                                        <div className="text-[10px] text-base-400 font-medium uppercase">{call.product}</div>
                                    </div>
                                </div>
                                <div className="bg-emerald-50 text-[10px] font-black text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                                    {Math.round((call.rag_performance?.avg_kb_confidence || 0) * 100)}% Match
                                </div>
                            </div>
                            <p className="text-xs text-base-600 italic leading-relaxed mb-4 line-clamp-2">
                                "{call.summary || 'AI successfully retrieved technical documentation for this interaction.'}"
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {call.rag_performance?.citation_list?.slice(0, 2).map((cite: string, j: number) => (
                                    <div key={j} className="px-2 py-0.5 bg-white border border-base-100 rounded text-[9px] font-bold text-base-500 flex items-center gap-1">
                                        <FileText className="w-2.5 h-2.5 text-indigo-400" />
                                        {formatCiteLabel(cite)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-12 text-center text-sm text-base-400 italic">No recent knowledge-grounded calls found.</div>
                    )}
                </div>
            </div>

            {/* Slide-out Call Detail Panel */}
            <AnimatePresence>
                {selectedCall && (
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                        className="fixed top-0 right-0 h-full w-[500px] bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.1)] border-l border-base-200 z-[70] flex flex-col pt-16"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-base-200 bg-indigo-50">
                            <div>
                                <h3 className="text-base font-bold text-indigo-900">{selectedCall.user_name || 'Individual Customer'}</h3>
                                <p className="text-xs text-indigo-600 font-bold mt-0.5 font-mono uppercase tracking-widest">
                                    Knowledge Grounding Context
                                </p>
                            </div>
                            <button onClick={() => setSelectedCall(null)} className="p-2 hover:bg-white rounded-full transition-all">
                                <X className="w-5 h-5 text-indigo-800" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* RAG Context Overlay */}
                            <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Cpu className="w-24 h-24" />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Knowledge Base RAG Confidence</span>
                                </div>
                                <div className="text-4xl font-black mb-1">{Math.round((selectedCall.rag_performance?.avg_kb_confidence || 0) * 100)}%</div>
                                <div className="text-xs font-medium text-slate-400 mb-6">Match Score based on Vector Overlap & Semantic Relevance</div>
                                
                                <div className="space-y-3">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Most Cited Documents</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedCall.rag_performance?.citation_list?.map((cite: string, j: number) => (
                                            <div key={j} className="flex items-center justify-between bg-white/5 border border-white/10 p-2.5 rounded-xl">
                                                <div className="flex items-center gap-2.5">
                                                    <FileText className="w-4 h-4 text-indigo-400" />
                                                    <span className="text-xs font-bold">{formatCiteLabel(cite)}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded uppercase">{cite.split('|')[1]?.trim()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-base-50 p-4 rounded-2xl border border-base-100">
                                <h4 className="text-[10px] font-black text-base-400 uppercase tracking-widest mb-3">Interaction Summary</h4>
                                <p className="text-sm font-bold text-base-800 italic leading-relaxed italic">
                                    "{selectedCall.summary || 'Summary not processed.'}"
                                </p>
                            </div>

                            <div>
                                <h4 className="text-[10px] font-black text-base-400 uppercase tracking-widest mb-4">Transcript Context</h4>
                                <div className="space-y-3">
                                    {selectedCall.transcript?.slice(-5).map((msg: any, i: number) => {
                                        const isAgent = msg.role === 'agent' || msg.role === 'assistant';
                                        return (
                                            <div key={i} className={`flex gap-3 ${isAgent ? 'flex-row' : 'flex-row-reverse'}`}>
                                                <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center ${isAgent ? 'bg-indigo-600 text-white' : 'bg-base-200 text-base-500'}`}>
                                                    {isAgent ? <Zap className="w-3 h-3" /> : <Smile className="w-3 h-3" />}
                                                </div>
                                                <div className={`flex-1 px-3 py-2 rounded-xl text-xs leading-relaxed ${
                                                    isAgent ? 'bg-indigo-50 text-indigo-900 border border-indigo-100' : 'bg-base-100 text-base-800'
                                                }`}>
                                                    {msg.text || msg.content}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-base-100 bg-base-50 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => changeTab?.('customers', { userId: selectedCall.user_id })}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-white border border-base-200 text-base-800 text-xs font-bold rounded-xl hover:bg-base-100 transition-colors shadow-sm"
                                >
                                    <User className="w-3.5 h-3.5" />
                                    View Profile
                                </button>
                                <button 
                                    onClick={() => changeTab?.('performance', { sessionId: selectedCall.session_id || selectedCall.call_id })}
                                    className="flex items-center justify-center gap-2 py-2.5 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Full Conversation
                                </button>
                            </div>
                            <button 
                                onClick={() => setSelectedCall(null)}
                                className="w-full py-2.5 bg-base-200 text-base-600 text-xs font-bold rounded-xl hover:bg-base-300 transition-colors"
                            >
                                Close Detail
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default KnowledgeDashboard;
