'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Clock, 
    Users, 
    ArrowLeft,
    Search
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CalendarPage() {
    const router = useRouter();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Profile
            const { data: { session } } = await supabase.auth.getSession();
            let profile = null;
            if (session) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                const dept = data?.department?.toUpperCase();
                if (dept === 'DIGITAL' || dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
                    router.push('/dashboard');
                    return;
                }

                profile = data;
                setUserProfile(data);
            }

            // 2. Fetch Assignments
            const res = await fetch('/api/admin/calendar', { cache: 'no-store' });
            const data = await res.json();
            
            if (data.assignments) {
                // Filter by jury_id if user is JURY
                if (profile?.role === 'JURY') {
                    setAssignments(data.assignments.filter((a: any) => a.jury_id === profile.id));
                } else {
                    setAssignments(data.assignments);
                }
            }
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Calendar Logic ---
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const calendarHeader = monthNames[month] + " " + year;

    const days = [];
    // Padding for start of month
    for (let i = 0; i < startDay; i++) {
        days.push(<div key={`pad-${i}`} className="h-24 md:h-32 border border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-transparent"></div>);
    }

    // Actual days
    for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayAssignments = assignments.filter(a => a.date === dateStr);
        const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

        days.push(
            <div 
                key={d} 
                className={`h-24 md:h-32 border border-gray-100 dark:border-white/5 p-2 transition-all hover:bg-white dark:hover:bg-white/5 cursor-pointer relative ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''}`}
                onClick={() => setSelectedDate(new Date(year, month, d))}
            >
                <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {d}
                </span>
                
                <div className="mt-1 space-y-1 overflow-y-auto max-h-[80%]">
                    {dayAssignments.length > 0 && dayAssignments.slice(0, 3).map((a, idx) => (
                        <div key={idx} className="text-[10px] px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 truncate font-medium">
                            {a.startup_name}
                        </div>
                    ))}
                    {dayAssignments.length > 3 && (
                        <div className="text-[10px] text-gray-400 pl-1">
                            +{dayAssignments.length - 3} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 relative w-full max-w-[1600px] mx-auto min-h-screen">
            <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 animate-fade-up">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-gray-400 cursor-pointer"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6 text-indigo-500" />
                            Assignments Calendar
                        </h1>
                        <p className="text-xs text-black/60 dark:text-gray-400 font-medium">View and manage scheduled startup presentations</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 glass-panel p-1">
                    <button 
                        onClick={prevMonth}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <span className="text-sm font-bold min-w-[140px] text-center text-black dark:text-white">
                        {calendarHeader}
                    </span>
                    <button 
                        onClick={nextMonth}
                        className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-md transition-all"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div className="w-[1px] h-6 bg-gray-200 dark:bg-white/10 mx-1"></div>
                    <button 
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                    >
                        Today
                    </button>
                </div>
            </header>

            <div className="glass-panel overflow-hidden animate-fade-up shadow-2xl shadow-indigo-500/5" style={{ animationDelay: '0.1s' }}>
                {/* Weekday Labels */}
                <div className="grid grid-cols-7 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-7">
                    {days}
                </div>
            </div>

            {/* Selected Day View (Modal-ish) */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-panel max-w-lg w-full p-8 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-black dark:text-white">
                                    {selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mt-1">Assignments Detail</p>
                            </div>
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {assignments.filter(a => a.date === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`).length > 0 ? (
                                assignments.filter(a => a.date === `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`).map((a, idx) => (
                                    <Link 
                                        key={idx}
                                        href={`/dashboard/submissions/${a.startup_id}`}
                                        className="block glass-panel p-4 hover:border-indigo-500/50 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <h4 className="font-bold text-black dark:text-white group-hover:text-indigo-500 transition-colors">{a.startup_name}</h4>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-black uppercase tracking-tighter">
                                                <Clock className="w-3 h-3" /> {a.time}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] font-bold">
                                                {a.jury_name.charAt(0)}
                                            </div>
                                            <span className="text-xs font-medium">Jury: {a.jury_name}</span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                                        <CalendarIcon className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-medium">No presentations scheduled for this day.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Simple X icon replacement since I missed importing it
function X({ className }: { className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    )
}
