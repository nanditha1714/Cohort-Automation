'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { 
    FileText, 
    Upload, 
    Trash2, 
    Download, 
    Search, 
    Plus,
    Loader2,
    ChevronRight,
    Building2,
    Calendar,
    ShieldCheck,
    Briefcase,
    Layout,
    AlertCircle,
    CheckCircle2,
    ExternalLink,
    Menu
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useSidebar } from '@/app/dashboard/layout';

type Startup = {
    id: string;
    company_name: string;
    created_at: string;
};

type StartupDocument = {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    uploaded_at: string;
};

export default function StartupDocumentsPage() {
    const [startups, setStartups] = useState<Startup[]>([]);
    const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);
    const [documents, setDocuments] = useState<StartupDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<'general' | 'financial'>('general');
    const [financialDocs, setFinancialDocs] = useState<any[]>([]);
    const [financialLoading, setFinancialLoading] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    const { isOpen: sidebarOpen, setIsOpen } = useSidebar();

    useEffect(() => {
        checkAccessAndFetch();
    }, []);

    const checkAccessAndFetch = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        setUserProfile(profile);

        if (profile?.role === 'ADMIN' || (profile?.role === 'INTERNAL_TEAM' && profile?.department === 'iPreneur')) {
            fetchStartups();
        } else {
            setLoading(false);
        }
    };

    const fetchStartups = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/submissions');
            const data = await res.json();
            if (data.submissions) {
                setStartups(data.submissions);
            }
        } catch (error) {
            console.error('Error fetching startups:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (startupId: string) => {
        setDocsLoading(true);
        try {
            const { data, error } = await supabase
                .from('startup_documents')
                .select('*')
                .eq('submission_id', startupId)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setDocsLoading(false);
        }
    };

    const handleSelectStartup = (startup: Startup) => {
        setSelectedStartup(startup);
        if (activeView === 'general') {
            fetchDocuments(startup.id);
        } else {
            fetchFinancialDocs(startup.id);
        }
    };

    const fetchFinancialDocs = async (startupId: string) => {
        setFinancialLoading(true);
        try {
            const res = await fetch(`/api/admin/financial-documents?id=${startupId}`);
            const data = await res.json();
            setFinancialDocs(data.documents || []);
        } catch (error) {
            console.error('Error fetching financial docs:', error);
        } finally {
            setFinancialLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStartup) {
            if (activeView === 'general') {
                fetchDocuments(selectedStartup.id);
            } else {
                fetchFinancialDocs(selectedStartup.id);
            }
        }
    }, [activeView]);

    const getSignedUrl = async (path: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('financial-documents')
                .createSignedUrl(path, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Error generating signed URL:', error);
            alert('Failed to generate download link. Please check permissions.');
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedStartup) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `startups/${selectedStartup.id}/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Save metadata to database
            const { error: dbError } = await supabase
                .from('startup_documents')
                .insert({
                    submission_id: selectedStartup.id,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    uploaded_by: (await supabase.auth.getSession()).data.session?.user.id
                });

            if (dbError) throw dbError;

            fetchDocuments(selectedStartup.id);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please ensure the "documents" storage bucket exists.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc: StartupDocument) => {
        if (!confirm(`Are you sure you want to delete ${doc.file_name}?`)) return;

        try {
            // 1. Delete from Storage
            await supabase.storage.from('documents').remove([doc.file_path]);

            // 2. Delete from DB
            const { error } = await supabase
                .from('startup_documents')
                .delete()
                .eq('id', doc.id);

            if (error) throw error;

            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDownload = async (doc: StartupDocument) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .createSignedUrl(doc.file_path, 60);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, '_blank');
            }
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const filteredStartups = startups.filter(s => 
        s.company_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-black">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!userProfile || (userProfile.role !== 'ADMIN' && (userProfile.role !== 'INTERNAL_TEAM' || userProfile.department !== 'iPreneur'))) {
        return (
            <div className="flex items-center justify-center h-screen bg-white dark:bg-black p-8 text-center text-gray-500">
                You do not have permission to access Startup Documents.
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 relative w-full max-w-[1600px] mx-auto min-h-screen">
            <header className="flex items-center justify-between mb-8 animate-fade-up pl-12 lg:pl-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!sidebarOpen)}
                        className="p-2 -ml-12 lg:-ml-0 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        title="Toggle Sidebar"
                    >
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight">Startup Documents</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Internal Startup Repository</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Startup List Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-panel p-4 flex items-center gap-3 border-none bg-white dark:bg-white/5">
                        <Search className="w-4 h-4 text-indigo-500" />
                        <input 
                            type="text" 
                            placeholder="Search startups..."
                            className="bg-transparent border-none outline-none text-sm w-full dark:text-white font-bold placeholder:font-normal"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="glass-panel overflow-hidden border-none shadow-xl">
                        <div className="p-4 border-b border-gray-200 dark:border-white/10 bg-indigo-500/5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">All Registered Startups</h3>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100 dark:divide-white/5">
                            {filteredStartups.map(startup => (
                                <button
                                    key={startup.id}
                                    onClick={() => handleSelectStartup(startup)}
                                    className={`w-full text-left p-5 transition-all flex items-center justify-between group relative ${
                                        selectedStartup?.id === startup.id 
                                        ? 'bg-indigo-600 text-white' 
                                        : 'hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`p-2 rounded-lg transition-colors ${selectedStartup?.id === startup.id ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600'}`}>
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-black text-sm uppercase tracking-tight">{startup.company_name}</p>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${selectedStartup?.id === startup.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                                EST. {new Date(startup.created_at).getFullYear()}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 relative z-10 ${selectedStartup?.id === startup.id ? 'text-white' : 'text-gray-300'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Document Viewer Content */}
                <div className="lg:col-span-8">
                    {selectedStartup ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-indigo-500/20 rounded-2xl border border-white/10 relative overflow-hidden">
                                <div className="relative z-10 text-left">
                                    <div className="flex items-center gap-3 mb-1">
                                        <CheckCircle2 className="w-4 h-4 text-indigo-200" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-100">Startup Repository</p>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">{selectedStartup.company_name}</h2>
                                </div>
                                <div className="flex items-center gap-3 relative z-10">
                                    <label className={`
                                        flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer
                                        ${uploading ? 'opacity-50 pointer-events-none' : ''}
                                    `}>
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {uploading ? 'Uploading...' : 'Upload File'}
                                        <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                                    </label>
                                </div>

                                {/* Abstract Background Shapes - Scaled Down */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                            </div>

                            <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-6 w-fit shadow-sm">
                                <button
                                    onClick={() => setActiveView('general')}
                                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'general' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:bg-white/5'}`}
                                >
                                    <FileText className="w-4 h-4" /> General
                                </button>
                                <button
                                    onClick={() => setActiveView('financial')}
                                    className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeView === 'financial' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-indigo-600 dark:hover:bg-white/5'}`}
                                >
                                    <ShieldCheck className="w-4 h-4" /> Financial
                                </button>
                            </div>

                            {activeView === 'general' ? (
                                <div className="glass-panel border-none shadow-xl overflow-hidden">
                                    <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-white/5">
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="w-5 h-5 text-indigo-500" />
                                            <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-tight">Access Controlled Files</h3>
                                        </div>
                                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border border-indigo-200 dark:border-indigo-500/20">
                                            {documents.length} Files
                                        </span>
                                    </div>
                                    {docsLoading ? (
                                        <div className="p-20 flex justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
                                        </div>
                                    ) : documents.length > 0 ? (
                                        <div className="divide-y divide-gray-100 dark:divide-white/5">
                                            {documents.map(doc => (
                                                <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                            <FileText className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors uppercase tracking-tight">{doc.file_name}</p>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase flex items-center gap-2 mt-0.5">
                                                                <Calendar className="w-3 h-3" />
                                                                {new Date(doc.uploaded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleDownload(doc)}
                                                            className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDelete(doc)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto">
                                                <FileText className="w-8 h-8 text-gray-300" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">No documents uploaded</h4>
                                                <p className="text-sm text-gray-500">Upload agreements, one-pagers, or other files for this startup.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {financialLoading ? (
                                        <div className="glass-panel p-20 flex justify-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                        </div>
                                    ) : financialDocs.length > 0 ? (
                                        financialDocs.map((bundle, idx) => (
                                            <div key={bundle.id} className="glass-panel overflow-hidden border-indigo-500/20">
                                                <div className="p-6 bg-indigo-500/5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-600/20">
                                                            <Briefcase className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">Verification Package</p>
                                                            <h3 className="text-xl font-black text-black dark:text-white uppercase tracking-tighter">Submission #{financialDocs.length - idx}</h3>
                                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Received {new Date(bundle.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase rounded-xl border border-emerald-500/20">
                                                        <CheckCircle2 className="w-3 h-3" /> Status: Verified
                                                    </div>
                                                </div>
                                                
                                                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {Object.entries(bundle.form_response_data || {}).map(([category, paths]: [string, any]) => (
                                                        <div key={category} className="space-y-4">
                                                            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                <Layout className="w-3.5 h-3.5 text-indigo-500" /> {category}
                                                            </h4>
                                                            <div className="space-y-2">
                                                                {Array.isArray(paths) && paths.length > 0 ? paths.map((path: string, pIdx: number) => {
                                                                    const fileName = path.split('/').pop();
                                                                    return (
                                                                        <button 
                                                                            key={pIdx}
                                                                            onClick={() => getSignedUrl(path)}
                                                                            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 hover:bg-white dark:hover:bg-indigo-500/10 border border-gray-100 dark:border-white/10 rounded-2xl transition-all group shadow-sm hover:shadow-md"
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                                                    <FileText className="w-4 h-4" />
                                                                                </div>
                                                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[200px] uppercase tracking-tight">{fileName}</span>
                                                                            </div>
                                                                            <Download className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                                                                        </button>
                                                                    );
                                                                }) : (
                                                                    <div className="flex items-center gap-2 p-4 bg-gray-100/50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 italic text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                                                        <AlertCircle className="w-3.5 h-3.5" /> No files available
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="glass-panel p-20 flex flex-col items-center justify-center text-center space-y-4">
                                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/5 rounded-full flex items-center justify-center">
                                                <AlertCircle className="w-8 h-8 text-amber-500" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">Waiting for Verification</h4>
                                                <p className="text-sm text-gray-500 max-w-sm">
                                                    The startup has not yet submitted their financial verification documents.
                                                </p>
                                                <div className="mt-4 p-2 bg-gray-100 dark:bg-white/5 rounded text-[10px] font-mono text-gray-400">
                                                    Looking for ID: {selectedStartup.id}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="glass-panel p-20 flex flex-col items-center justify-center text-center space-y-6 min-h-[600px] border-dashed border-2">
                            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-500/5 rounded-full flex items-center justify-center animate-pulse">
                                <Building2 className="w-12 h-12 text-indigo-200 dark:text-indigo-500/20" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Select a Startup</h3>
                                <p className="text-sm text-gray-500 max-w-sm mt-2">
                                    Choose a startup from the left panel to manage its specific documents, agreements, and uploads.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
