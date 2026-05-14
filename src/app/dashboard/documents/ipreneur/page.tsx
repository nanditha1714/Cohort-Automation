'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { 
    FolderOpen, 
    Upload, 
    Trash2, 
    Download, 
    Loader2,
    FileText,
    Calendar,
    Plus,
    Shield,
    Menu
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { useSidebar } from '@/app/dashboard/layout';

type DepartmentDocument = {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    uploaded_at: string;
};

export default function IPreneurDocumentsPage() {
    const [documents, setDocuments] = useState<DepartmentDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
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
            fetchDocuments();
        } else {
            setLoading(false);
        }
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('department_documents')
                .select('*')
                .eq('department', 'iPreneur')
                .order('uploaded_at', { ascending: false });

            if (error) throw error;
            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `departments/ipreneur/${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Save metadata to database
            const { error: dbError } = await supabase
                .from('department_documents')
                .insert({
                    department: 'iPreneur',
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    uploaded_by: (await supabase.auth.getSession()).data.session?.user.id
                });

            if (dbError) throw dbError;

            fetchDocuments();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please ensure the "documents" storage bucket exists.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc: DepartmentDocument) => {
        if (!confirm(`Are you sure you want to delete ${doc.file_name}?`)) return;

        try {
            // 1. Delete from Storage
            await supabase.storage.from('documents').remove([doc.file_path]);

            // 2. Delete from DB
            const { error } = await supabase
                .from('department_documents')
                .delete()
                .eq('id', doc.id);

            if (error) throw error;

            setDocuments(prev => prev.filter(d => d.id !== doc.id));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDownload = async (doc: DepartmentDocument) => {
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
                You do not have permission to access iPreneur Department Documents.
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
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-black dark:text-white tracking-tight">iPreneur Documents</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Internal Team Portal</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                </div>
            </header>

            <main className="space-y-8 animate-fade-up">
                {/* Header Section */}
                <div className="p-8 bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-xl shadow-indigo-500/20 rounded-2xl overflow-hidden relative border border-white/10">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                             <Shield className="w-4 h-4 text-indigo-200" />
                             <p className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-100">Team Shared Drive</p>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">iPreneur Resources</h2>
                    </div>
                    
                    <div className="relative z-10">
                        <label className={`
                            flex items-center gap-3 px-6 py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer
                            ${uploading ? 'opacity-50 pointer-events-none' : ''}
                        `}>
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {uploading ? 'Uploading...' : 'Upload Resource'}
                            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                </div>

                {/* Submissions Table / Grid */}
                <div className="glass-panel border-none shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/10 rounded-lg">
                                <FolderOpen className="w-5 h-5 text-indigo-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-black dark:text-white tracking-widest uppercase">Shared Resources</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Available for iPreneur Team</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500 text-white px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20">
                            {documents.length} Files
                        </span>
                    </div>

                    {documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 p-1 bg-gray-100 dark:bg-white/5">
                            {documents.map(doc => (
                                <div key={doc.id} className="bg-white dark:bg-zinc-900/50 p-8 flex flex-col justify-between group hover:bg-indigo-50 dark:hover:bg-indigo-500/5 transition-all duration-300">
                                    <div className="space-y-6">
                                        <div className="flex items-start justify-between">
                                            <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                                                <FileText className="w-7 h-7" />
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleDownload(doc)}
                                                    className="p-2.5 text-gray-400 hover:text-indigo-600 rounded-xl hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(doc)}
                                                    className="p-2.5 text-gray-400 hover:text-red-500 rounded-xl hover:bg-white dark:hover:bg-zinc-800 shadow-sm transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-900 dark:text-white line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight text-base">
                                                {doc.file_name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-4 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] bg-gray-50 dark:bg-black/20 w-fit px-2 py-1 rounded border border-gray-100 dark:border-white/5">
                                                <Calendar className="w-3 h-3 text-indigo-500" />
                                                {new Date(doc.uploaded_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-32 text-center flex flex-col items-center justify-center space-y-6">
                            <div className="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center">
                                <FolderOpen className="w-12 h-12 text-gray-200" />
                            </div>
                            <div className="max-w-xs mx-auto">
                                <h4 className="text-xl font-bold text-gray-900 dark:text-white">No documents here yet</h4>
                                <p className="text-sm text-gray-500 mt-2">
                                    Start by uploading the first document for the iPreneur department.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
