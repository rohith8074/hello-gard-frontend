"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Battery, Navigation, TriangleAlert, MapPin } from 'lucide-react';
import { getFleetStatus } from '@/lib/api';

const PRODUCT_LABELS: Record<string, string> = {
  all: 'All Products',
  sp50: 'CenoBots SP50',
  w3: 'Keenon W3',
  v3: 'temi V3',
  k5: 'Knightscope K5',
  yarbo: 'Yarbo Outdoor'
};

const mockFleetRaw = Array.from({ length: 24 }).map((_, i) => ({
  robot_id: `SP50-${Math.floor(Math.random() * 9000) + 1000}`,
  status: Math.random() > 0.85 ? (Math.random() > 0.5 ? 'error' : 'offline') : 'online',
  battery_level: Math.floor(Math.random() * 100),
  location: ['Main Lobby East', 'Hallway B-South', 'Casino Floor A', 'Rehab Wing 2', 'Atrium Plaza'][Math.floor(Math.random() * 5)],
  last_ping: `${Math.floor(Math.random() * 5)}m ago`,
  current_task: ['Mapping', 'Deep Cleaning', 'Patrol Mode', 'Idle', 'Charging'][Math.floor(Math.random() * 5)],
  product: 'sp50'
}));

interface FleetDashboardProps {
  productFilter?: string;
}

const FleetDashboard = ({ productFilter = 'all' }: FleetDashboardProps) => {
  const [robots, setRobots] = useState<any[]>([]);
  const [summary, setSummary] = useState({ online: 0, errors: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    const loadFleet = async () => {
      setIsLoading(true);
      try {
        const res = await getFleetStatus(productFilter);
        if (res?.robots && res.robots.length > 0) {
          setRobots(res.robots);
          setSummary(res.summary);
        } else {
          // Fallback to transformed mock data if backend empty
          setRobots(mockFleetRaw);
          const online = mockFleetRaw.filter(r => r.status === 'online').length;
          const errors = mockFleetRaw.filter(r => r.status === 'error').length;
          setSummary({ online, errors, total: mockFleetRaw.length });
        }
      } catch (err) {
        console.error("Failed to fetch fleet", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadFleet();
  }, [productFilter]);
    
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 text-center sm:text-left">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-base-900">Active Fleet Topology</h2>
          <p className="text-sm text-base-600 mt-1 italic opacity-80">Ignoring product filters for complete facility oversight.</p>
        </div>
        
        <div className="flex gap-3 justify-center">
          <div className="px-4 py-2 bg-white border border-base-200 rounded-lg shadow-sm text-sm font-semibold text-base-800 flex items-center gap-2 group cursor-help relative">
             <div className="w-2 h-2 rounded-full bg-success-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> 
             Online <span className="text-base-500 font-normal ml-1">{summary.online}</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                  Robots actively connected and reporting no errors.
                  <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
          </div>
          <div className="px-4 py-2 bg-white border border-base-200 rounded-lg shadow-sm text-sm font-semibold text-base-800 flex items-center gap-2 group cursor-help relative">
             <div className="w-2 h-2 rounded-full bg-danger-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" /> 
             Errors <span className="text-base-500 font-normal ml-1">{summary.errors}</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                  Robots reporting hardware faults or network drops.
                  <div className="absolute top-full left-1/2 -ml-1 border-4 border-transparent border-t-gray-900"></div>
              </div>
          </div>
        </div>
      </div>

      {/* Spatial Topology Map */}
      <div className="classic-card relative overflow-hidden h-[350px] mb-8 flex items-center justify-center bg-[#0B1120] rounded-xl border border-gray-800 shadow-2xl">
         {/* Grid Background */}
         <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px', backgroundPosition: 'center center' }} />
         
         {/* Animated Robot Dots */}
         {robots.map((robot, i) => (
            <motion.div
               key={i}
               initial={{ x: Math.random() * 400 - 200, y: Math.random() * 150 - 75 }}
               animate={{
                  x: [Math.random() * 400 - 200, Math.random() * 400 - 200, Math.random() * 400 - 200],
                  y: [Math.random() * 150 - 75, Math.random() * 150 - 75, Math.random() * 150 - 75],
               }}
               transition={{ duration: 25 + Math.random() * 15, repeat: Infinity, ease: "linear", repeatType: "reverse" }}
               className="absolute"
            >
                <div className="group relative cursor-crosshair flex items-center justify-center">
                   <div className={`w-3.5 h-3.5 rounded-full shadow-[0_0_15px_currentColor] border-2 border-[#0B1120] ${
                       robot.status?.toUpperCase() === 'ONLINE' ? 'bg-success-400 text-success-400' : 
                       robot.status?.toUpperCase() === 'ERROR' ? 'bg-danger-500 text-danger-500 animate-pulse' : 
                       'bg-gray-500 text-gray-500'
                   }`}>
                      {robot.status?.toUpperCase() === 'ERROR' && <div className="absolute inset-[-2px] bg-danger-500 rounded-full animate-ping opacity-75" />}
                   </div>
                   
                   <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-max bg-white text-base-900 border border-base-200 shadow-xl text-xs px-3 py-2 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 flex items-center gap-2 font-medium">
                      <Bot size={14} className="text-primary-600" />
                      {robot.robot_id || robot.id} <span className="text-base-300">|</span> {robot.location || robot.area}
                   </div>
                </div>
            </motion.div>
         ))}
         
         {/* Terminal Header Info */}
         <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="flex items-center gap-2 font-semibold text-white/90 text-[13px] tracking-wide bg-white/5 px-4 py-2 rounded-lg border border-white/10 backdrop-blur-md">
               <MapPin size={16} className="text-primary-400" /> Facility Map: Sector A (Live)
            </span>
         </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {robots.map((robot, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ delay: i * 0.02 }}
            className={`classic-card p-5 border-t-4 transition-all ${
              robot.status?.toUpperCase() === 'ONLINE' ? 'border-t-success-500 hover:border-success-600' : 
              robot.status?.toUpperCase() === 'ERROR' ? 'border-t-danger-500 bg-danger-50/30' : 
              'border-t-base-300 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                    robot.status?.toUpperCase() === 'ONLINE' ? 'bg-success-50 text-success-600' : 
                    robot.status?.toUpperCase() === 'ERROR' ? 'bg-danger-50 text-danger-600' : 
                    'bg-base-100 text-base-500'
                }`}>
                  <Bot size={20} />
                </div>
                <div>
                  <div className="font-bold text-base-900 text-[15px]">{robot.robot_id || robot.id}</div>
                  <div className="text-[10px] uppercase font-bold text-primary-500 mb-0.5">{PRODUCT_LABELS[robot.product] || robot.product}</div>
                  <div className="text-xs text-base-500 font-medium flex items-center gap-1">
                      <MapPin size={12}/> {robot.location || robot.area}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-base-700 mb-1.5">
                    <span className="flex items-center gap-1.5"><Battery size={14}/> Battery</span>
                    <span className={`${(robot.battery_level || robot.battery) < 20 ? 'text-danger-600' : ''}`}>{robot.battery_level || robot.battery}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-base-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${(robot.battery_level || robot.battery) < 20 ? 'bg-danger-500' : 'bg-primary-500'}`} style={{ width: `${robot.battery_level || robot.battery}%` }} />
                  </div>
              </div>
              
              <div className="flex items-center justify-between text-xs bg-base-50 rounded-lg p-2 border border-base-100">
                <span className="text-base-700 font-medium flex items-center gap-1.5">
                    <Navigation size={14} className="text-base-400"/> {robot.current_task || robot.task}
                </span>
                <span className="text-base-400 font-medium">{robot.last_ping || robot.lastPing}</span>
              </div>
            </div>
            
            {robot.status?.toUpperCase() === 'ERROR' && (
              <div className="mt-4 bg-danger-50 border border-danger-100 p-3 rounded-lg text-xs text-danger-700 flex items-start gap-2 shadow-sm">
                <TriangleAlert size={14} className="shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{robot.last_error || 'Sensors blocked: clean LiDAR lens. Sent to Triage Agent.'}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default FleetDashboard;
