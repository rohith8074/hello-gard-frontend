"use client";

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, PhoneOff, Phone, Activity } from 'lucide-react';
import { useLiveKitVoice } from '@/hooks/useLiveKitVoice';

const LiveVoiceTerminal = () => {
  const { status, error, transcripts, startSession, disconnect, isConnected } = useLiveKitVoice();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const handleStart = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hg_user') || 'null') : null;
      await startSession(user?.id);
    } catch (err) {
      alert("Microphone permission is required for Voice Agent testing.");
    }
  };

  const isSpeaking = status === "agent_speaking";

  const renderMessageContent = (text: string) => {
    // Look for [IMAGE: filename.jpg] or [IMAGE: /path/to/image.jpg]
    const imageRegex = /\[IMAGE:\s*(.*?)\]/g;
    
    // Split text by the regex to interleave text and images
    const parts = text.split(imageRegex);
    
    // If no image, just return the text
    if (parts.length === 1) return <p className="text-sm leading-relaxed">{text}</p>;

    return (
        <div className="space-y-3 mt-1">
            {parts.map((part, i) => {
                if (i % 2 === 1) {
                    // This is an image URL
                    return (
                        <div key={i} className="mt-3 rounded-lg overflow-hidden border border-base-200 shadow-sm max-w-[280px]">
                            <img src={part} alt="Reference Diagram" className="w-full h-auto object-cover" />
                        </div>
                    );
                } else if (part.trim()) {
                    // This is regular text
                    return <p key={i} className="text-sm leading-relaxed">{part}</p>;
                }
                return null;
            })}
        </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-base-900">Interactive Support Agent</h2>
      </div>

      <div className="classic-card overflow-hidden">
        {/* Top Status Bar */}
        <div className="bg-base-50 border-b border-base-200 px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               {isConnected ? (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-success-500 animate-pulse" />
                    <span className="text-sm font-semibold text-success-600 uppercase tracking-wide">Session Active</span>
                  </>
               ) : (
                  <>
                    <div className="w-2.5 h-2.5 rounded-full bg-base-300" />
                    <span className="text-sm font-semibold text-base-500 uppercase tracking-wide">Ready to Connect</span>
                  </>
               )}
            </div>
            
            <div className="text-xs font-mono text-base-500 bg-white px-3 py-1.5 rounded-md border border-base-200 shadow-sm">
               Status: {status.toUpperCase()}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Visualizer Panel */}
            <div className="p-10 flex flex-col items-center justify-center border-r border-base-100 bg-white min-h-[400px]">
                <div className="relative flex justify-center items-center w-64 h-64">
                    {/* Ring Animations */}
                    {isConnected && (
                        <>
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0, 0.2] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-0 rounded-full bg-primary-500 pointer-events-none"
                          />
                          <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0, 0.1] }}
                            transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: "linear" }}
                            className="absolute inset-0 rounded-full bg-primary-500 pointer-events-none"
                          />
                        </>
                    )}

                    {/* Core Orb */}
                    <div className={`z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
                        status === 'connected' ? 'bg-primary-50 border border-primary-200 shadow-primary-500/20' :
                        status === 'agent_speaking' ? 'bg-primary-600 shadow-primary-500/40 text-white' :
                        status === 'connecting' ? 'bg-warning-50 animate-pulse border border-warning-200 text-warning-600' :
                        status === 'error' ? 'bg-danger-50 border border-danger-200 text-danger-600' :
                        'bg-base-50 border border-base-200 text-base-400'
                    }`}>
                        {isSpeaking ? (
                            <Activity className="w-10 h-10 animate-pulse" />
                        ) : (
                            <Mic className="w-10 h-10" />
                        )}
                    </div>
                </div>

                <div className="mt-12 w-full flex justify-center">
                    {!isConnected ? (
                        <button
                          onClick={handleStart}
                          disabled={status === "connecting"}
                          className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-8 rounded-full shadow-md transition-all disabled:opacity-50 min-w-[200px]"
                        >
                            {status === "connecting" ? "Establishing Link..." : <><Phone className="w-5 h-5"/> Start Voice Session</>}
                        </button>
                    ) : (
                        <button
                          onClick={disconnect}
                          className="flex items-center justify-center gap-2 bg-danger-50 hover:bg-danger-100 text-danger-700 font-medium py-3 px-8 rounded-full shadow-sm transition-all border border-danger-200 min-w-[200px]"
                        >
                            <PhoneOff className="w-5 h-5"/> Disconnect
                        </button>
                    )}
                </div>
                {error && <p className="mt-4 text-xs font-medium text-danger-500 text-center">{error}</p>}
            </div>

            {/* Transcript Panel */}
            <div className="bg-base-50 flex flex-col pt-4">
                <div className="px-6 py-2 border-b border-base-200">
                    <h4 className="text-sm font-bold text-base-900">Live Transcription</h4>
                </div>
                
                <div 
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[400px]"
                >
                    {transcripts.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-sm font-medium text-base-400 italic">
                            {isConnected ? "Listening for audio..." : "Press Start Session to begin."}
                        </div>
                    ) : (
                        transcripts.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-5 py-3 ${
                                    msg.role === "user" 
                                    ? "bg-primary-600 text-white shadow-md rounded-tr-sm" 
                                    : "bg-white border border-base-200 text-base-800 shadow-sm rounded-tl-sm"
                                }`}>
                                    <span className={`text-[10px] font-bold block mb-1 uppercase tracking-wider ${
                                        msg.role === "user" ? "text-primary-100" : "text-base-400"
                                    }`}>
                                        {msg.role === "user" ? "You" : "Support Agent"}
                                    </span>
                                    {renderMessageContent(msg.text)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveVoiceTerminal;
