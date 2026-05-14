'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import {
    Users, UserPlus, LogOut, Shield, ChevronDown,
    RefreshCw, PowerOff, Database, Bot, ArrowLeft, Edit2, Menu, FileText, Save
} from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import { useSidebar } from '@/app/dashboard/layout';

type UserProfile = {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
    created_at: string;
};

function CustomSelect({ value, options, onChange, dropUp = false }: { value: string, options: string[], onChange: (v: string) => void, dropUp?: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative w-full">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="input-premium flex items-center justify-between cursor-pointer"
            >
                <span className="truncate">{value.replace('_', ' ') || 'Select...'}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className={`absolute left-0 w-full glass-panel flex flex-col p-1 z-50 animate-fade-up max-h-60 overflow-y-auto border border-gray-200 dark:border-white/10 shadow-xl bg-white/80 dark:bg-black/60 ${dropUp ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'}`}>
                        {options.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => { onChange(opt); setIsOpen(false); }}
                                className={`text-left px-4 py-2.5 text-sm rounded-lg transition-colors ${value === opt ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 font-semibold' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white'}`}
                            >
                                {opt.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { isOpen, setIsOpen } = useSidebar();
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const searchParams = useSearchParams();
    const [activeSection, setActiveSection] = useState<'USERS' | 'AI'>('USERS');


    // Template State
    const [templateText, setTemplateText] = useState('');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [isSyncingTemplate, setIsSyncingTemplate] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [templateText, activeSection]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'ai') setActiveSection('AI');
        if (tab === 'users') setActiveSection('USERS');
    }, [searchParams]);


    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'INTERNAL_TEAM' | 'JURY' | 'ADMIN'>('INTERNAL_TEAM');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newDepartment, setNewDepartment] = useState('iPreneur');

    // Password Reset State
    const [resetId, setResetId] = useState<string | null>(null);
    const [resetPassword, setResetPassword] = useState('');

    // Edit User State
    const [editUserId, setEditUserId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editRole, setEditRole] = useState('INTERNAL_TEAM');
    const [editDepartment, setEditDepartment] = useState('iPreneur');

    // AI Criteria State
    const [activeCriteria, setActiveCriteria] = useState('');
    const [currentCriteriaData, setCurrentCriteriaData] = useState<any>(null);
    const [criteriaHistory, setCriteriaHistory] = useState<any[]>([]);
    const [isSavingCriteria, setIsSavingCriteria] = useState(false);


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

        if (!profile || profile.status === 'INACTIVE' || profile.role !== 'ADMIN') {
            router.push('/dashboard');
            return;
        }

        setCurrentUser({ ...session.user, profile });
        fetchUsers();
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCriteria = async () => {
        try {
            const res = await fetch('/api/admin/criteria');
            const data = await res.json();
            if (data.activeCriteria) {
                setActiveCriteria(data.activeCriteria.criteria_text);
                setCurrentCriteriaData(data.activeCriteria);
            }
            if (data.history) {
                setCriteriaHistory(data.history);
            }
        } catch (error) {
            console.error('Error fetching criteria:', error);
        }
    };

    useEffect(() => {
        if (currentUser?.profile?.role === 'ADMIN') {
            fetchCriteria();
            fetchTemplate();
        }
    }, [currentUser]);

    const fetchTemplate = async () => {
        try {
            const res = await fetch('/api/admin/mou-template-text');
            const data = await res.json();
            if (data.content) setTemplateText(data.content);
        } catch (err) { console.error('Error fetching template:', err); }
    };

    const handleSaveTemplate = async () => {
        setIsSavingTemplate(true);
        try {
            const res = await fetch('/api/admin/mou-template-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: templateText })
            });
            if (res.ok) alert('Master MOU Template saved successfully!');
        } catch (err) { alert('Failed to save template'); }
        finally { setIsSavingTemplate(false); }
    };

    const handleSyncTemplate = async () => {
        if (!confirm('This will replace the current editor content with the text from your uploaded Word file. Continue?')) return;
        setIsSyncingTemplate(true);
        try {
            const res = await fetch('/api/admin/mou-template/sync', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setTemplateText(data.content);
                alert('Synchronized successfully!');
            } else {
                alert(data.error || 'Failed to sync');
            }
        } catch (err) { alert('Error syncing from Word file'); }
        finally { setIsSyncingTemplate(false); }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, type: modalType, department: newDepartment })
            });

            const data = await res.json();
            if (data.error) alert(`Error: ${data.error}`);
            else {
                setIsModalOpen(false);
                setNewEmail(''); setNewPassword(''); setNewName(''); setNewDepartment('iPreneur');
                fetchUsers();
            }
        } catch (error) {
            alert('Failed to create user');
        }
    };

    const submitEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editUserId) return;
        try {
            const res = await fetch('/api/admin/edit-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: editUserId, name: editName, email: editEmail, role: editRole, department: editDepartment })
            });

            const data = await res.json();
            if (data.error) alert(`Error: ${data.error}`);
            else {
                setEditUserId(null);
                fetchUsers();
                alert('User details updated successfully');
            }
        } catch (error) {
            alert('Failed to update user');
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            const res = await fetch('/api/admin/change-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: newStatus })
            });
            const data = await res.json();
            if (!data.error) fetchUsers();
        } catch (err) {
            alert('Failed to update status');
        }
    };

    const submitResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetId) return;
        try {
            const res = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: resetId, newPassword: resetPassword })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                alert('Password reset successfully');
                setResetId(null);
                setResetPassword('');
            }
        } catch (err) {
            alert('Failed to reset password');
        }
    };

    const handleSaveCriteria = async () => {
        if (!activeCriteria.trim()) return;
        setIsSavingCriteria(true);
        try {
            const res = await fetch('/api/admin/criteria', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ criteriaText: activeCriteria, adminId: currentUser.id })
            });
            const data = await res.json();
            if (!data.error) {
                alert('AI Criteria updated successfully!');
                fetchCriteria();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to save criteria');
        } finally {
            setIsSavingCriteria(false);
        }
    };

    if (loading || !currentUser) {
        return (
            <div className="flex h-full min-h-[50vh] items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 relative w-full max-w-[1600px] mx-auto">
            <header className="flex items-center justify-between mb-8 animate-fade-up pl-12 lg:pl-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-2 -ml-12 lg:-ml-0 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors lg:hidden"
                        title="Toggle Sidebar"
                    >
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    </button>
                    <button onClick={() => router.back()} className="p-2 hover:bg-white dark:hover:bg-white/10 rounded-lg transition text-black dark:text-black dark:text-gray-400 hover:text-black dark:text-white dark:hover:text-white cursor-pointer">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-black dark:text-white">Admin Settings</h1>
                        <p className="text-xs text-black dark:text-black dark:text-gray-400">Manage Teams and AI Behaviors</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 group z-50">
                    <ThemeToggle />
                    <div className="flex items-center gap-3 glass-panel px-4 py-2 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                            {currentUser?.profile?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="hidden sm:block text-left text-sm">
                            <p className="font-bold text-black dark:text-white uppercase tracking-wider leading-tight text-xs">{currentUser?.profile?.name}</p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-tight">{currentUser?.profile?.role.toLowerCase()}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto space-y-8 animate-fade-up">

                {/* Section Navigation */}
                <div className="flex bg-white dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 w-fit shadow-sm">
                    <button 
                        onClick={() => setActiveSection('USERS')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSection === 'USERS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        <Users className="w-4 h-4" /> Teams
                    </button>

                    <button 
                        onClick={() => setActiveSection('AI')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSection === 'AI' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-indigo-600'}`}
                    >
                        <Bot className="w-4 h-4" /> AI Criteria
                    </button>
                </div>

                {activeSection === 'USERS' && (
                    <div className="glass-panel p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-black dark:text-white">
                                <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> User Management
                            </h2>
                            <div className="flex gap-3">
                                <button onClick={() => { setModalType('JURY'); setIsModalOpen(true); }} className="btn-secondary text-sm px-3 py-1.5 hover:bg-white/10 dark:hover:bg-white/5 transition flex items-center shadow-sm">
                                    <UserPlus className="w-4 h-4 mr-2" /> Add Jury
                                </button>
                                <button onClick={() => { setModalType('INTERNAL_TEAM'); setIsModalOpen(true); }} className="btn-secondary text-sm px-3 py-1.5 hover:bg-white/10 dark:hover:bg-white/5 transition flex items-center shadow-sm">
                                    <UserPlus className="w-4 h-4 mr-2" /> Add Internal
                                </button>
                                <button onClick={() => { setModalType('ADMIN'); setIsModalOpen(true); }} className="btn-primary text-sm px-3 py-1.5 shadow-md flex items-center">
                                    <UserPlus className="w-4 h-4 mr-2" /> Add Admin
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="data-table w-full">
                                <thead className="bg-black/5 dark:bg-black/20">
                                    <tr>
                                        <th>User</th>
                                        <th>Department</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th>Created</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id}>
                                            <td>
                                                <p className="font-medium text-black dark:text-white">{u.name}</p>
                                                <p className="text-xs text-black dark:text-black dark:text-gray-400">{u.email}</p>
                                            </td>
                                            <td>
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{u.department || 'None'}</span>
                                            </td>
                                            <td>
                                                <span className={`badge-role ${u.role === 'ADMIN' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : ''}`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={u.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}>{u.status}</span>
                                            </td>
                                            <td className="dark:text-gray-300">{new Date(u.created_at).toLocaleDateString()}</td>
                                            <td className="text-right space-x-2">
                                                <button onClick={() => {
                                                    setEditUserId(u.id);
                                                    setEditName(u.name);
                                                    setEditEmail(u.email);
                                                    setEditRole(u.role);
                                                    setEditDepartment(u.department || 'iPreneur');
                                                }} className="p-2 border border-gray-200 dark:border-transparent bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg text-black dark:text-gray-300 transition" title="Edit Profile">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setResetId(u.id)} className="p-2 border border-gray-200 dark:border-transparent bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 rounded-lg text-black dark:text-gray-300 transition" title="Reset Password">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => toggleStatus(u.id, u.status)} className={`p-2 rounded-lg transition border border-gray-200 dark:border-transparent ${u.status === 'ACTIVE' ? 'bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`} title={u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                                                    <PowerOff className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}



                {activeSection === 'AI' && (
                    <div className="glass-panel p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Bot className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                            <h2 className="text-xl font-bold text-black dark:text-white">
                                Global AI Evaluation Criteria
                            </h2>
                        </div>
                        <p className="text-sm text-black dark:text-black dark:text-gray-400 mb-6">Define the instructions used by the AI to analyze pitch decks.</p>

                        <div className="space-y-4">
                            <textarea className="input-premium w-full min-h-[150px] resize-y" value={activeCriteria} onChange={(e) => setActiveCriteria(e.target.value)} />
                            <div className="flex items-center justify-end">
                                <button onClick={handleSaveCriteria} disabled={isSavingCriteria || !activeCriteria.trim()} className="btn-primary w-auto px-6 py-2">
                                    {isSavingCriteria ? 'Saving...' : 'Save New Criteria Version'}
                                </button>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
                                <h3 className="text-sm font-semibold text-black dark:text-gray-300">Criteria Log</h3>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin">

                                    {/* Present / Active Criteria */}
                                    {currentCriteriaData && (
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-lg p-4 border border-emerald-200 dark:border-emerald-500/30">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wide">Present Criteria (Active)</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-1 rounded-full">
                                                        Updated: {new Date(currentCriteriaData.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-black dark:text-gray-200 whitespace-pre-wrap">{currentCriteriaData.criteria_text}</p>
                                        </div>
                                    )}

                                    {/* Historical Criteria */}
                                    {criteriaHistory.length > 0 ? (
                                        criteriaHistory.map((h) => (
                                            <div key={h.id} className="bg-white dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/5">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-black dark:text-black dark:text-gray-400">Replaced: {new Date(h.created_at).toLocaleString()}</span>
                                                    <span className="text-xs text-purple-700 dark:text-indigo-400 bg-purple-100 dark:bg-indigo-500/10 px-2 py-1 rounded-full">By: {h.user_profiles?.name || 'Admin'}</span>
                                                </div>
                                                <p className="text-sm text-black dark:text-gray-300 whitespace-pre-wrap">{h.criteria_text}</p>
                                            </div>
                                        ))
                                    ) : (
                                        !currentCriteriaData && <p className="text-sm text-black dark:text-black dark:text-gray-400 italic">No criteria versions found.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="glass-panel w-full max-w-md p-6 relative z-10 animate-fade-up">
                        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
                            Create New {modalType.replace('_', ' ')}
                        </h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Full Name</label>
                                <input type="text" className="input-premium" value={newName} onChange={e => setNewName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Email</label>
                                <input type="email" className="input-premium" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Password</label>
                                <input type="text" className="input-premium" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Department</label>
                                <CustomSelect
                                    value={newDepartment}
                                    onChange={setNewDepartment}
                                    options={['iPreneur', 'Digital', 'Investments', 'None']}
                                    dropUp={true}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Password Reset Modal */}
            {resetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setResetId(null)} />
                    <div className="glass-panel w-full max-w-sm p-6 relative z-10 animate-fade-up">
                        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">Reset Password</h2>
                        <form onSubmit={submitResetPassword} className="space-y-4">
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">New Password</label>
                                <input type="text" className="input-premium" value={resetPassword} onChange={e => setResetPassword(e.target.value)} required minLength={6} />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setResetId(null)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Edit User Modal */}
            {editUserId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEditUserId(null)} />
                    <div className="glass-panel w-full max-w-md p-6 relative z-10 animate-fade-up">
                        <h2 className="text-xl font-bold mb-4 text-black dark:text-white">
                            Edit User Profile
                        </h2>
                        <form onSubmit={submitEditUser} className="space-y-4">
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Full Name</label>
                                <input type="text" className="input-premium" value={editName} onChange={e => setEditName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Email</label>
                                <input type="email" className="input-premium" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Role</label>
                                <CustomSelect
                                    value={editRole}
                                    onChange={setEditRole}
                                    options={['INTERNAL_TEAM', 'JURY', 'ADMIN']}
                                    dropUp={true}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-black dark:text-black dark:text-gray-400 block mb-1 font-medium dark:font-normal">Department</label>
                                <CustomSelect
                                    value={editDepartment}
                                    onChange={setEditDepartment}
                                    options={['iPreneur', 'Digital', 'Investments', 'None']}
                                    dropUp={true}
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={() => setEditUserId(null)} className="btn-secondary flex-1">Cancel</button>
                                <button type="submit" className="btn-primary flex-1">Update Details</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
