'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { 
    CheckCircle2, 
    Clock, 
    ChevronRight,
    Calendar,
    IndianRupee,
    Rocket,
    Activity,
    CreditCard,
    Menu
} from 'lucide-react';
import Link from 'next/link';
import { useSidebar } from '@/app/dashboard/layout';

export default function PaymentsPage() {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { isOpen, setIsOpen } = useSidebar();

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('department')
                .eq('id', session.user.id)
                .single();

            const dept = profile?.department?.toUpperCase();
            if (dept === 'DIGITAL' || dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
                window.location.href = '/dashboard';
            } else {
                fetchPayments();
            }
        };
        checkAccess();
    }, []);

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    submission:form_submissions (
                        company_name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayments(data || []);
        } catch (error: any) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: payments.length,
        paid: payments.filter(p => p.status === 'PAID').length,
        pending: payments.filter(p => p.status === 'PENDING').length
    };

    return (
        <div className="p-6 md:p-8 relative w-full max-w-[1600px] mx-auto animate-in fade-in duration-700">
            <header className="flex items-center justify-between mb-8 animate-fade-up pl-12 lg:pl-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 -ml-12 lg:-ml-0 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        title="Toggle Sidebar"
                    >
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <h2 className="text-lg font-extrabold text-black dark:text-white uppercase tracking-tight">
                        PAYMENT LEDGER
                    </h2>
                </div>
            </header>
            
            {/* Quick Stats - The 3 blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white dark:bg-[#0c0c0e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl">
                            <CreditCard className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Attempts</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0c0c0e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid & Confirmed</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.paid}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-[#0c0c0e] p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                            <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Sessions</p>
                            <p className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.pending}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="bg-white dark:bg-[#0c0c0e] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead className="bg-[#f1f5f9] dark:bg-black/20">
                                <tr>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Startup Name</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Transaction Info</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Amount</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="p-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.length > 0 ? payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-indigo-500/5 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                                    <Rocket className="w-4 h-4" />
                                                </div>
                                                <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm">
                                                    {p.submission?.company_name || 'Unknown Startup'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-bold text-gray-500 flex items-center gap-2 tracking-tight">
                                                    <span className="text-gray-400 uppercase tracking-wider">Order:</span> {p.razorpay_order_id}
                                                </p>
                                                {p.razorpay_payment_id && (
                                                    <p className="text-[10px] font-bold text-gray-500 flex items-center gap-2 tracking-tight">
                                                        <span className="text-emerald-500 font-extrabold uppercase tracking-wider">PayID:</span> {p.razorpay_payment_id}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 border-t border-gray-100 dark:border-white/5 text-center">
                                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                                                ₹{p.amount}
                                            </span>
                                        </td>
                                        <td className="p-4 border-t border-gray-100 dark:border-white/5">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                p.status === 'PAID' 
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                : p.status === 'PENDING'
                                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                            }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-4 border-t border-gray-100 dark:border-white/5 text-right">
                                            <Link 
                                                href={`/dashboard/submissions/${p.submission_id}?from=payments`}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all"
                                            >
                                                View Submission <span className="text-lg leading-none">&rarr;</span>
                                            </Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Activity className="w-10 h-10" />
                                                <span className="text-sm font-bold uppercase tracking-widest italic">No transactions found</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
