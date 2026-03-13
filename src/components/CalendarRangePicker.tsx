"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';

interface CalendarRangePickerProps {
    startDate: string; // ISO yyyy-mm-dd
    endDate: string;   // ISO yyyy-mm-dd
    onChange: (start: string, end: string) => void;
}

export default function CalendarRangePicker({ startDate, endDate, onChange }: CalendarRangePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentViewDate, setCurrentViewDate] = useState(new Date(endDate));
    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const days = eachDayOfInterval({
        start: startOfMonth(currentViewDate),
        end: endOfMonth(currentViewDate),
    });

    const [tempStart, setTempStart] = useState<string | null>(null);

    const handleDateClick = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        
        if (!tempStart) {
            setTempStart(dateStr);
        } else {
            // If picking a second date
            const startStr = tempStart;
            const endStr = dateStr;
            
            // Sort them
            if (new Date(startStr) <= new Date(endStr)) {
                onChange(startStr, endStr);
            } else {
                onChange(endStr, startStr);
            }
            setTempStart(null);
            setIsOpen(false);
        }
    };

    const presets = [
        { label: 'Today', days: 0 },
        { label: 'Last 7 Days', days: 6 },
        { label: 'Last 30 Days', days: 29 },
        { label: 'Last 90 Days', days: 89 },
    ];

    const applyPreset = (daysDiff: number) => {
        const end = new Date();
        const start = subDays(end, daysDiff);
        onChange(format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'));
        setIsOpen(false);
    };

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-base-200 hover:border-primary-300 hover:shadow-sm transition-all group"
            >
                <Calendar className="w-4 h-4 text-base-400 group-hover:text-primary-500 transition-colors" />
                <span className="text-sm font-bold text-base-800">
                    {startDate === endDate 
                        ? format(new Date(startDate), 'MMM d, yyyy') 
                        : `${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}`}
                </span>
                <ChevronDown className={`w-4 h-4 text-base-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 p-4 bg-white rounded-2xl shadow-2xl border border-base-200 z-[100] w-[320px]"
                    >
                        <div className="flex flex-col gap-4">
                            {/* Presets */}
                            <div className="grid grid-cols-2 gap-2">
                                {presets.map((p) => (
                                    <button
                                        key={p.label}
                                        onClick={() => applyPreset(p.days)}
                                        className="text-xs font-bold py-2 px-3 rounded-lg bg-base-50 hover:bg-primary-50 hover:text-primary-600 transition-colors border border-base-100"
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            <div className="h-px bg-base-100" />

                            {/* Simple Calendar */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <button 
                                        onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() - 1, 1))}
                                        className="p-1.5 hover:bg-base-50 rounded-lg text-base-400"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-black text-base-800 uppercase tracking-wider">
                                        {format(currentViewDate, 'MMMM yyyy')}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentViewDate(new Date(currentViewDate.getFullYear(), currentViewDate.getMonth() + 1, 1))}
                                        className="p-1.5 hover:bg-base-50 rounded-lg text-base-400"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-7 gap-1">
                                    {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
                                        <div key={d} className="text-[10px] font-black text-base-400 text-center py-1">{d}</div>
                                    ))}
                                    {days.map((day, i) => {
                                        const dateStr = format(day, 'yyyy-MM-dd');
                                        const isSelected = isWithinInterval(day, { start, end });
                                        const isTemp = tempStart === dateStr;
                                        
                                        // Visual range preview if tempStart is picked
                                        let isHoverRange = false;
                                        if (tempStart) {
                                            const ts = new Date(tempStart);
                                            const ds = day;
                                            if (ts <= ds) {
                                                // Previewing forward
                                                // We can't easily track hover state without more state, 
                                                // so just highlighting the start is fine for now
                                            }
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleDateClick(day)}
                                                className={`text-[11px] font-bold h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                                                    isTemp ? 'bg-primary-100 text-primary-600 border border-primary-300' :
                                                    isSelected 
                                                        ? 'bg-primary-600 text-white shadow-md' 
                                                        : 'hover:bg-primary-50 text-base-600'
                                                }`}
                                                style={{ gridColumnStart: i === 0 ? day.getDay() + 1 : undefined }}
                                            >
                                                {format(day, 'd')}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-xs font-black uppercase text-base-400 hover:text-base-600 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
