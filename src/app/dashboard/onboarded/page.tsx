'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { 
    RefreshCw, 
    Rocket, 
    ArrowLeft, 
    Trash2, 
    ExternalLink, 
    Calendar,
    Search,
    Filter,
    ShieldCheck,
    X,
    Download,
    Upload,
    FileText,
    CheckCircle2,
    Clock
} from 'lucide-react';
import Link from 'next/link';

type Submission = {
    id: string;
    company_name: string;
    created_at: string;
    is_onboarded: boolean;
    is_payment_completed: boolean;
    is_withdrawn: boolean;
    onboarded_at?: string;
    form_data?: any;
    financial_docs?: any;
};

function OnboardedStartupsContent() {
    const router = useRouter();
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState<string | null>(null);

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
            .select('department')
            .eq('id', session.user.id)
            .single();

        const dept = profile?.department?.toUpperCase();
        if (dept === 'DIGITAL' || dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
            router.push('/dashboard');
            return;
        }

        fetchOnboardedStartups();
    };

    const fetchOnboardedStartups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/submissions?onboarded=true');
            const data = await res.json();
            if (data.submissions) {
                setSubmissions(data.submissions);
            }
        } catch (error) {
            console.error('Error fetching onboarded startups:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to withdraw the application for ${name}? This will remove them from the onboarded list.`)) return;
        
        setIsWithdrawing(id);
        try {
            const res = await fetch(`/api/admin/submissions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    is_onboarded: false,
                    is_rejected: false,
                    is_withdrawn: true, // Flag for specific withdrawal email/doc
                    internal_review_notes: `Application withdrawn by admin on ${new Date().toLocaleString()}`
                })
            });
            
            if (res.ok) {
                alert(`${name} has been withdrawn.`);
                fetchOnboardedStartups();
            } else {
                alert('Failed to withdraw application.');
            }
        } catch (err) {
            alert('Error during withdrawal process.');
        } finally {
            setIsWithdrawing(null);
        }
    };

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [selectedStartup, setSelectedStartup] = useState<Submission | null>(null);
    const [withdrawalFile, setWithdrawalFile] = useState<{ name: string; base64: string } | null>(null);
    const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);

    const openWithdrawModal = (startup: Submission) => {
        setSelectedStartup(startup);
        setIsWithdrawModalOpen(true);
        setWithdrawalFile(null);
    };

    const handleDownloadWithdrawalDraft = async () => {
        if (!selectedStartup) return;
        setIsProcessingWithdrawal(true);
        try {
            // Re-using the generate-mou-draft logic but we should ideally have a withdrawal one
            // For now, we'll call the submission patch with a special flag to get the doc
            const res = await fetch(`/api/admin/submissions/${selectedStartup.id}/generate-withdrawal-draft`, {
                method: 'POST'
            });
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Withdrawal_Notice_${selectedStartup.company_name.replace(/\s+/g, '_')}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            } else {
                alert('Failed to generate withdrawal draft.');
            }
        } catch (err) {
            alert('Error generating draft.');
        } finally {
            setIsProcessingWithdrawal(false);
        }
    };

    const handleWithdrawalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setWithdrawalFile({
                    name: file.name,
                    base64: (event.target?.result as string).split(',')[1]
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleFinalizeWithdrawal = async () => {
        if (!selectedStartup || !withdrawalFile) {
            alert('Please upload the finalized withdrawal PDF first.');
            return;
        }

        setIsProcessingWithdrawal(true);
        try {
            const isWord = withdrawalFile.name.toLowerCase().endsWith('.docx');

            const res = await fetch(`/api/admin/submissions/${selectedStartup.id}/send-withdrawal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pdfBase64: isWord ? null : withdrawalFile.base64,
                    docxBase64: isWord ? withdrawalFile.base64 : null,
                    company_name: selectedStartup.company_name
                })
            });

            if (res.ok) {
                alert('Withdrawal notice sent and startup removed from cohort.');
                setIsWithdrawModalOpen(false);
                fetchOnboardedStartups();
            } else {
                const errorData = await res.json();
                alert(`Failed to send withdrawal notice: ${errorData.error || 'Unknown error'}`);
            }
        } catch (err) {
            alert('Error finalizing withdrawal.');
        } finally {
            setIsProcessingWithdrawal(false);
        }
    };

    const filtered = submissions.filter(s => 
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen p-6 md:p-12 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
            {/* Withdrawal Modal */}
            {isWithdrawModalOpen && selectedStartup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsWithdrawModalOpen(false)} />
                    <div className="relative bg-white dark:bg-[#0c0c0e] border border-gray-200 dark:border-white/10 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-red-500/5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                                    <Trash2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Withdraw Startup</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest">{selectedStartup.company_name}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsWithdrawModalOpen(false)} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Step 1: Generate Documentation</h4>
                                </div>
                                <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 uppercase">Withdrawal Draft (.docx)</p>
                                        <p className="text-[10px] text-gray-500">Generate a formal notice with startup details.</p>
                                    </div>
                                    <button 
                                        onClick={handleDownloadWithdrawalDraft}
                                        disabled={isProcessingWithdrawal}
                                        className="px-6 py-2.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center gap-2"
                                    >
                                        {isProcessingWithdrawal ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <h4 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Step 2: Upload Final Document</h4>
                                </div>
                                <div className={`p-6 rounded-2xl border-2 border-dashed transition-all ${withdrawalFile ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'}`}>
                                    <input 
                                        type="file" 
                                        id="withdrawal-upload" 
                                        accept=".pdf,.docx" 
                                        onChange={handleWithdrawalFileChange}
                                        className="hidden" 
                                    />
                                    <label htmlFor="withdrawal-upload" className="flex flex-col items-center justify-center cursor-pointer gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${withdrawalFile ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-white/10 text-gray-400'}`}>
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                {withdrawalFile ? 'File Selected' : 'Upload Final PDF or Word'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {withdrawalFile ? withdrawalFile.name : 'Word files will be auto-converted to PDF'}
                                            </p>
                                        </div>
                                    </label>
                                </div>
                                <div className="flex items-start gap-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                        <strong className="text-indigo-600 dark:text-indigo-400">Pro Tip:</strong> Re-uploading as a <strong className="text-gray-700 dark:text-gray-200">PDF</strong> ensures 100% layout accuracy. If you upload a <strong className="text-gray-700 dark:text-gray-200">Word</strong> file, we will convert it to PDF for you using LibreOffice.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic max-w-[200px]">This will notify the startup and remove them from the cohort.</p>
                            <button 
                                onClick={handleFinalizeWithdrawal}
                                disabled={!withdrawalFile || isProcessingWithdrawal}
                                className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isProcessingWithdrawal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Send & Finalize
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subtle mesh background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-[1400px] mx-auto w-full animate-fade-up">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="w-12 h-12 flex items-center justify-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl hover:scale-110 transition-all shadow-sm">
                            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">Cohort Management</span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase">Onboarded Startups</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Manage and monitor startups that have joined the cohort</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search startups..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all w-72 shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={fetchOnboardedStartups}
                            className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 hover:rotate-180 transition-all duration-500 shadow-xl shadow-indigo-600/20"
                        >
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>


                {/* Main Table Container */}
                <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-500/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-black/20">
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">Startup Details</th>
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">Onboarding Date</th>
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">MOU Status</th>
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">Payment</th>
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5">Financials</th>
                                    <th className="p-8 text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] border-b border-gray-100 dark:border-white/5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center">
                                            <div className="relative inline-block">
                                                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                                <RefreshCw className="w-6 h-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.length > 0 ? (
                                    filtered.map((sub, i) => (
                                        <tr key={sub.id} className="hover:bg-indigo-500/[0.02] dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="p-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-500">
                                                        <Rocket className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <span className="block font-black text-gray-900 dark:text-white uppercase tracking-tight text-lg leading-tight mb-1">{sub.company_name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${sub.is_withdrawn ? 'bg-red-500' : 'bg-emerald-500'}`} />
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">
                                                                {sub.is_withdrawn ? 'Withdrawn' : 'Active Member'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-xs text-gray-600 dark:text-gray-400 font-bold">
                                                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                                    {new Date(sub.onboarded_at || sub.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 w-fit shadow-sm ${
                                                    sub.is_withdrawn 
                                                        ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/5'
                                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/5'
                                                }`}>
                                                    {sub.is_withdrawn ? <Trash2 className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                                    {sub.is_withdrawn ? 'Withdrawn' : 'Finalized'}
                                                </span>
                                            </td>
                                            <td className="p-8">
                                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm transition-all ${
                                                    sub.is_payment_completed 
                                                        ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/20 shadow-indigo-500/5' 
                                                        : 'bg-amber-500/5 text-amber-500 border-amber-500/20 shadow-amber-500/5'
                                                }`}>
                                                    {sub.is_payment_completed ? (
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Clock className="w-3.5 h-3.5" />
                                                    )}
                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                        {sub.is_payment_completed ? 'Paid' : 'Pending'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                                        {sub.financial_docs ? Object.keys(sub.financial_docs).length : 0} Docs
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-8 text-right">
                                                {sub.is_withdrawn ? (
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                                                        Withdrawn
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-4">
                                                        <Link 
                                                            href={`/dashboard/submissions/${sub.id}`} 
                                                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-gray-400 hover:text-indigo-600 hover:border-indigo-600/30 transition-all hover:scale-110 shadow-sm"
                                                            title="View Profile"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </Link>
                                                        <button 
                                                            onClick={() => openWithdrawModal(sub)}
                                                            disabled={isWithdrawing === sub.id}
                                                            className="px-5 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                                                            title="Withdraw Application"
                                                        >
                                                            {isWithdrawing === sub.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                            Withdraw
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="p-40 text-center">
                                            <div className="flex flex-col items-center gap-6 opacity-30">
                                                <div className="w-24 h-24 rounded-[32px] bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                                    <Rocket className="w-12 h-12" />
                                                </div>
                                                <div className="space-y-2">
                                                    <p className="text-2xl font-black uppercase tracking-[0.2em]">Zero Onboarded</p>
                                                    <p className="text-sm font-medium">Startups will appear here once they complete onboarding</p>
                                                </div>
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

export default function OnboardedStartupsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#08080a]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Cohort...</p>
                </div>
            </div>
        }>
            <OnboardedStartupsContent />
        </Suspense>
    );
}
