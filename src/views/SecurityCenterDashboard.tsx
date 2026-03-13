"use client";

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, Lock, FileKey, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const auditLogs = Array.from({ length: 6 }).map((_, i) => ({
  id: `EVT-${Math.floor(Math.random() * 90000) + 10000}`,
  type: ['Auth', 'Data Access', 'System Change', 'API Key Rotate'][Math.floor(Math.random() * 4)],
  user: ['s.jenkins', 'system_auto', 'a.smith', 'api_service'][Math.floor(Math.random() * 4)],
  status: Math.random() > 0.9 ? 'Denied' : 'Success',
  time: `${i + 1} hr ago`
}));

const piiMetrics = Array.from({ length: 14 }).map((_, i) => ({
  day: `Day ${i+1}`,
  redacted: Math.floor(Math.random() * 1500) + 500
}));

const SecurityCenterDashboard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "System Compliance Score", val: "100%", trend: "0%", icon: ShieldCheck, color: "text-success-600", bg: "bg-success-50" },
          { label: "PII Entities Redacted", val: "14,204", trend: "+24 today", icon: Lock, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "Unauthorized Attempts", val: "0", trend: "-2 this week", icon: AlertTriangle, color: "text-success-500", bg: "bg-success-500/10" },
          { label: "Active Audit Policies", val: "12", trend: "Active", icon: FileKey, color: "text-purple-600", bg: "bg-purple-50" }
        ].map((stat, idx) => (
          <div key={idx} className="classic-card p-6 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.label === 'Unauthorized Attempts' ? 'bg-success-500/10 text-success-500' : 'bg-base-100 text-base-600'}`}>{stat.trend}</span>
            </div>
            <div className="text-3xl font-bold text-base-900 mb-1">{stat.val}</div>
            <div className="text-sm font-medium text-base-500">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 classic-card p-6 flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-base-900">PII Redaction Engine</h3>
              <p className="text-sm text-base-500">Volume of sensitive tokens automatically redacted from Voice AI transcripts</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100">
              <Shield className="w-3.5 h-3.5" /> Enforcing SOC2
            </div>
          </div>
          <div className="h-[300px] mt-auto">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={piiMetrics} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPii" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickMargin={12} axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="step" name="Tokens Redacted" dataKey="redacted" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorPii)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="classic-card flex flex-col overflow-hidden">
          <div className="p-6 border-b border-base-100 bg-base-50/50">
            <h3 className="text-lg font-bold text-base-900">Security Audit Log</h3>
            <p className="text-xs text-base-500 mt-1">Immutable access events</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 border-b border-base-100 last:border-0 hover:bg-base-50 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-base-900 text-sm">{log.id}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${log.status === 'Success' ? 'bg-success-500/10 text-success-600' : 'bg-danger-50 text-danger-600'}`}>{log.status}</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-base-500">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold">{log.user}</span>
                    <span>•</span>
                    <span>{log.type}</span>
                  </div>
                  <span>{log.time}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-base-100 bg-base-50 text-center">
            <button className="text-sm font-medium text-primary-600 hover:text-primary-700">View Full Logs</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SecurityCenterDashboard;
