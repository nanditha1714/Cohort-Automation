'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import {
    LogOut, Shield, ChevronDown, RefreshCw, Settings, Play,
    Activity, Cpu, Users, Gavel, XCircle, CreditCard, Rocket, Menu, Layout
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useSidebar } from '@/app/dashboard/layout';

type Submission = {
    id: string;
    company_name: string;
    analysis_status: string;
    created_at: string;
    is_internal_reviewed: boolean;
    is_jury_reviewed: boolean;
    is_jury_accepted: boolean;
    is_rejected: boolean;
    is_payment_completed: boolean;
    is_onboarded: boolean;
    needs_admin_review: boolean;
    financial_status?: string | null;
    review_count?: number;
    departments_reviewed?: string[];
    assigned_jury_ids?: string[];
    jury_scores?: number[];
    financial_docs?: any;
    form_data?: any;
    payment_status?: string;
};

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'all';
    const { isOpen, setIsOpen } = useSidebar();

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isTriggeringAI, setIsTriggeringAI] = useState(false);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (!profile || profile.status === 'INACTIVE') {
            await supabase.auth.signOut();
            router.push('/login');
            return;
        }

        setCurrentUser({ ...session.user, profile });
        fetchSubmissions();
    };

    const fetchSubmissions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/submissions?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.submissions) {
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error('Error fetching submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Silent AI Background Poller & Realtime Listener ---
    useEffect(() => {
        if (!currentUser) return; // Wait for the session to load!

        // Run background poller for internal team and admins so queue is reliably processed
        if (currentUser.profile?.role === 'JURY' || currentUser.profile?.role === 'USER') return;

        console.log('--- AI Background Poller Activated (runs every 30s) ---');

        // 1. Realtime Listener: Instantly refresh table when new data is inserted or updated
        const subscription = supabase
            .channel('db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'form_submissions' }, () => {
                fetchSubmissions();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jury_assignments' }, () => {
                fetchSubmissions();
            })
            .subscribe();

        // 2. Background Poller: Push queue automatically
        const interval = setInterval(async () => {
            try {
                console.log('Background Ping: Checking for new applications to process...');
                // Silently run the queue
                const aiRes = await fetch(`/api/cron/process-queue?t=${Date.now()}`, { cache: 'no-store' });
                const aiData = await aiRes.json();

                // If the AI actually processed a new startup, refresh the table so the user sees it!
                if (aiData.success && aiData.message !== 'No pending jobs in queue.') {
                    console.log('New application processed successfully!');
                    fetchSubmissions();
                }

                // Silently trigger the email digest as well, to mimic the Vercel cron functionality while on localhost
                await fetch(`/api/cron/email-digest?t=${Date.now()}`, { cache: 'no-store' });
            } catch (error) {
                console.error('Silent queue ping failed:', error);
            }
        }, 30000); // Check every 30 seconds

        return () => {
            clearInterval(interval);
            supabase.removeChannel(subscription);
        };
    }, [currentUser]);

    const dept = currentUser?.profile?.department?.toUpperCase();

    // Redirect restricted tabs
    useEffect(() => {
        if (!dept) return;
        if (dept === 'DIGITAL') {
            if (['jury_review', 'financial_verification', 'payment', 'onboarding'].includes(currentTab)) {
                router.push('/dashboard?tab=all');
            }
        } else if (dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
            if (['jury_review', 'payment', 'onboarding'].includes(currentTab)) {
                router.push('/dashboard?tab=all');
            }
        }
    }, [dept, currentTab, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleProcessQueue = async () => {
        setIsTriggeringAI(true);
        try {
            const res = await fetch(`/api/cron/process-queue?t=${Date.now()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.message === 'No pending jobs in queue.') {
                alert('No pending startups to analyze.');
            } else if (data.success) {
                alert('AI Analysis completed for oldest startup in queue!');
                fetchSubmissions(); // Refresh the table visually
            } else {
                alert(data.error || 'Failed to analyze startup.');
            }
        } catch (err) {
            alert('Failed to reach AI trigger.');
        } finally {
            setIsTriggeringAI(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-medium">Completed</span>;
            case 'PROCESSING': return <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-medium animate-pulse">Processing...</span>;
            case 'PENDING': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-medium">Pending Queue</span>;
            default: return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-medium">{status}</span>;
        }
    };

    if (loading && !submissions.length) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    // --- KPI Statistics Calculations ---
    const stats = {
        total: submissions.length,
        aiProcessed: submissions.filter(s => s.analysis_status === 'COMPLETED').length,
        internalReviewed: submissions.filter(s => s.is_internal_reviewed).length,
        juryReviewed: submissions.filter(s => s.is_jury_reviewed).length,
        financialVerification: submissions.filter(s => s.is_jury_accepted === true && !s.is_onboarded && !s.is_rejected).length,
        rejected: submissions.filter(s => s.is_rejected).length,
        paymentCompleted: submissions.filter(s => s.is_payment_completed).length,
    };

    const statCards = [
        { id: 'total', label: 'Total Applications', value: stats.total, icon: <Activity className="w-5 h-5 text-indigo-400" /> },
        { id: 'ai', label: 'AI Processed', value: stats.aiProcessed, icon: <Cpu className="w-5 h-5 text-purple-400" /> },
        { id: 'financial', label: 'Financial Verification', value: stats.financialVerification, icon: <Shield className="w-5 h-5 text-emerald-400" /> },
        { id: 'internal', label: 'Internal Reviewed', value: stats.internalReviewed, icon: <Users className="w-5 h-5 text-blue-400" /> },
        { id: 'jury', label: 'Jury Reviewed', value: stats.juryReviewed, icon: <Gavel className="w-5 h-5 text-amber-400" /> },
        { id: 'rejected', label: 'Rejected', value: stats.rejected, icon: <XCircle className="w-5 h-5 text-red-400" /> },
        { id: 'payment', label: 'Payment Completed', value: stats.paymentCompleted, icon: <CreditCard className="w-5 h-5 text-emerald-400" /> },
    ].filter(card => {
        if (dept === 'DIGITAL') {
            return ['total', 'ai', 'internal', 'rejected'].includes(card.id);
        }
        if (dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
            return ['total', 'ai', 'internal', 'rejected', 'financial'].includes(card.id);
        }
        return true;
    });

    const filteredSubmissions = submissions.filter(s => {
        const isAdminReviewed = s.departments_reviewed?.includes('Admin');

        if (currentTab === 'all') return true;
        if (currentTab === 'ai_analysis') return ['COMPLETED', 'PENDING', 'PROCESSING', 'FAILED'].includes(s.analysis_status);
        if (currentTab === 'internal_review') return s.analysis_status === 'COMPLETED' && (s.review_count || 0) > 0;
        if (currentTab === 'jury_review') {
            const hasReviews = s.is_internal_reviewed;
            if (currentUser?.profile?.role === 'JURY') {
                return hasReviews && (s.assigned_jury_ids || []).includes(currentUser.profile.id);
            }
            return hasReviews;
        }
        if (currentTab === 'financial_verification') {
            // Show startups that have been accepted after jury review, ensuring they stay visible even if rejected/withdrawn
            // We include them if they are NOT onboarded OR if they have been officially withdrawn
            return (s.is_jury_accepted === true || s.admin_jury_decision === 'ACCEPTED') && 
                   (!s.is_onboarded || s.form_data?.__is_withdrawn === true || s.is_withdrawn === true);
        }
        if (currentTab === 'payment') return s.is_payment_completed || s.payment_status === 'PAID' || s.form_data?.__payment_status === 'PAID';
        if (currentTab === 'onboarding') return s.is_onboarded || s.form_data?.__is_withdrawn === true || s.is_withdrawn;
        return true;
    });

    return (
        <div className="p-6 md:p-8 relative w-full max-w-[1600px] mx-auto">
            {/* Navbar / Header */}
            <header className="flex items-center justify-between mb-8 animate-fade-up pl-12 lg:pl-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 -ml-12 lg:-ml-0 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        title="Toggle Sidebar"
                    >
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-xl flex items-center justify-center shadow-sm">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight">Cohort Automation Dashboard</h1>
                        <p className="text-xs text-black/60 dark:text-gray-400 font-medium">Monitoring the startup pipeline lifecycle</p>
                    </div>
                </div>

                {/* Profile Dropdown */}
                <div className="flex items-center gap-4 group z-50">
                    <ThemeToggle />
                    <div className="flex items-center gap-3 bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-white/10 px-4 py-2 rounded-xl shadow-sm">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                            {currentUser?.profile?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-xs font-black text-black dark:text-white uppercase tracking-wider leading-tight">{currentUser?.profile?.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">{currentUser?.profile?.role.toLowerCase()}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full space-y-8 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                {(() => {
                    // Force JURY to the jury_review tab if they are elsewhere
                    if (currentUser?.profile?.role === 'JURY' && currentTab !== 'jury_review') {
                        setTimeout(() => router.push('/dashboard?tab=jury_review'), 0);
                        return (
                            <div className="flex items-center justify-center p-20">
                                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                            </div>
                        );
                    }

                    return (
                        <>
                        {/* Dashboard Stats Grid */}
                        {currentTab === 'all' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                                {statCards.map((stat, idx) => (
                                    <div key={idx} className="bg-white dark:bg-[#0c0c0e] border border-gray-100 dark:border-white/5 p-6 flex flex-col justify-between items-start transition-all shadow-sm">
                                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-6">
                                            {stat.icon}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-1">{stat.label}</p>
                                            <h3 className="text-3xl font-extrabold text-black dark:text-white tracking-tight">{stat.value}</h3>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {currentTab !== 'all' && (
                            <>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-extrabold text-black dark:text-white uppercase tracking-tight">
                                        {currentTab === 'ai_analysis' ? 'AI Processed' :
                                            currentTab === 'internal_review' ? 'Internally Reviewed' :
                                                currentTab === 'jury_review' ? 'Jury Evaluation' :
                                                    currentTab === 'financial_verification' ? 'Financial Verification' :
                                                        currentTab === 'payment' ? 'Payment Completed' : 'Incoming Pipeline'}
                                    </h2>
                                    {currentUser?.profile?.role === 'ADMIN' && currentTab === 'ai_analysis' && (
                                        <button
                                            onClick={handleProcessQueue}
                                            disabled={isTriggeringAI}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                                        >
                                            {isTriggeringAI ? 'Processing...' : 'Manually Trigger AI'}
                                        </button>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <div className="bg-white dark:bg-[#0c0c0e] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-separate border-spacing-0">
                                                <thead className="bg-[#f1f5f9] dark:bg-black/20">
                                                    <tr>
                                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Startup Name</th>
                                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Applied On</th>
                                                        {currentTab !== 'onboarding' && ['all', 'ai_analysis'].includes(currentTab) && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Status</th>}
                                                        {currentTab !== 'onboarding' && currentTab === 'internal_review' && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Team reviews</th>}
                                                        {currentTab !== 'onboarding' && currentTab === 'jury_review' && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avg Score</th>}
                                                        {currentTab !== 'onboarding' && ['internal_review', 'jury_review'].includes(currentTab) && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jury Status</th>}
                                                        {currentTab !== 'onboarding' && currentTab === 'financial_verification' && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Financial Status</th>}
                                                        {(currentTab === 'financial_verification' || currentTab === 'onboarding') && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Docs</th>}
                                                        {currentTab !== 'onboarding' && currentTab === 'payment' && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Status</th>}
                                                        {currentTab === 'onboarding' && <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cohort Status</th>}
                                                        <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredSubmissions.length > 0 ? (
                                                        filteredSubmissions.map((sub) => (
                                                            <tr key={sub.id} className="hover:bg-indigo-500/5 dark:hover:bg-white/[0.02] transition-colors group">
                                                                <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                                            <Rocket className="w-4 h-4" />
                                                                        </div>
                                                                        <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">{sub.company_name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                                        {new Date(sub.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </td>
                                                                {['all', 'ai_analysis'].includes(currentTab) && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">{getStatusBadge(sub.analysis_status)}</td>
                                                                )}
                                                                {currentTab === 'internal_review' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-semibold text-gray-500">{sub.review_count}/3</span>
                                                                            {sub.needs_admin_review && <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1 py-0.5 rounded uppercase font-black">Admin</span>}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                {currentTab === 'jury_review' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                                                                            {sub.jury_scores && sub.jury_scores.length > 0 
                                                                                ? (sub.jury_scores.reduce((a:any, b:any) => a + b, 0) / sub.jury_scores.length).toFixed(1) 
                                                                                : '0'
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                {['internal_review', 'jury_review'].includes(currentTab) && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                            (sub as any).admin_jury_decision === 'ACCEPTED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                            (sub as any).admin_jury_decision === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                            sub.is_jury_reviewed ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                            'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                                                        }`}>
                                                                            {(sub as any).admin_jury_decision === 'ACCEPTED' ? 'Accepted' : (sub as any).admin_jury_decision === 'REJECTED' ? 'Rejected' : sub.is_jury_reviewed ? 'Jury Done' : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                {currentTab === 'financial_verification' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                            sub.financial_status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                                            sub.financial_status === 'INCORRECT' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                                        }`}>
                                                                            {sub.financial_status || 'PENDING'}
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                {currentTab === 'financial_verification' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        {sub.financial_docs ? (
                                                                            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-lg">
                                                                                {Object.keys(sub.financial_docs).length} Documents
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-gray-400">None</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                                                                                {currentTab === 'payment' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                            PAID
                                                                        </span>
                                                                    </td>
                                                                )}
                                                                {currentTab === 'onboarding' && (
                                                                    <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                                            (sub as any).form_data?.__is_withdrawn ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                                        }`}>
                                                                            {(sub as any).form_data?.__is_withdrawn ? 'Withdrawn' : 'Onboarded'}
                                                                        </span>
                                                                    </td>
                                                                )}

                                                                <td className="p-4 border-t border-gray-100 dark:border-white/5 text-right">
                                                                    <Link 
                                                                        href={`/dashboard/submissions/${sub.id}?from=${currentTab}`} 
                                                                        className={`inline-flex items-center gap-1 text-xs font-bold hover:gap-2 transition-all ${
                                                                            currentTab === 'financial_verification' && sub.financial_status === 'VERIFIED'
                                                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                                                : 'text-indigo-600 dark:text-indigo-400'
                                                                        }`}
                                                                    >
                                                                        {currentTab === 'onboarding' ? 'Manage Onboarding' :
                                                                         currentTab === 'financial_verification'
                                                                            ? sub.financial_status === 'VERIFIED'
                                                                                ? '✓ Verified'
                                                                                : sub.financial_status === 'INCORRECT'
                                                                                ? '✗ Re-verify'
                                                                                : 'Verify Documents'
                                                                            : 'View Review'}
                                                                        <span className="text-lg leading-none">&rarr;</span>
                                                                    </Link>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={10} className="text-center py-20">
                                                                <div className="flex flex-col items-center gap-2 opacity-30">
                                                                    <Activity className="w-10 h-10" />
                                                                    <span className="text-sm font-bold uppercase tracking-widest italic">No applications found in this category</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                    );
                })()}
            </main>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
