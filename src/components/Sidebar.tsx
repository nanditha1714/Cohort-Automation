'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
    LayoutDashboard,
    Cpu,
    Users,
    Gavel,
    Settings,
    CreditCard,
    Rocket,
    X,
    FileText,
    FolderOpen,
    Calendar,
    ShieldCheck,
    FileCode,
    LogOut
} from 'lucide-react';
import { useSidebar } from '@/app/dashboard/layout';
import { supabase } from '@/lib/supabase-client';
import { useEffect, useState } from 'react';

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get('tab') || 'all';
    const { isOpen, setIsOpen } = useSidebar();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                setUserProfile(data);
            }
        };
        fetchProfile();
    }, []);

    const navItems: { id: string; label: string; icon: any; href: string; matchPath?: boolean }[] = [
        { id: 'all', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/dashboard' },
        { id: 'ai_analysis', label: 'AI Processed', icon: <Cpu className="w-5 h-5" />, href: '/dashboard?tab=ai_analysis' },
        { id: 'internal_review', label: 'Internal Review', icon: <Users className="w-5 h-5" />, href: '/dashboard?tab=internal_review' },
        { id: 'jury_review', label: 'Jury Review', icon: <Gavel className="w-5 h-5" />, href: '/dashboard?tab=jury_review' },
        { id: 'financial_verification', label: 'Financial Verification', icon: <ShieldCheck className="w-5 h-5" />, href: '/dashboard?tab=financial_verification' },
        { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" />, href: '/dashboard/calendar', matchPath: true },
        { id: 'payments_ledger', label: 'Payments', icon: <CreditCard className="w-5 h-5" />, href: '/dashboard/payments', matchPath: true },
        { id: 'onboarded_list', label: 'Onboarding', icon: <Rocket className="w-5 h-5" />, href: '/dashboard/onboarded', matchPath: true },
    ].filter(item => {
        if (userProfile?.role === 'ADMIN') return true;

        if (userProfile?.role === 'JURY') {
            return item.id === 'jury_review' || item.id === 'calendar';
        }

        const dept = userProfile?.department?.toUpperCase();
        if (dept === 'DIGITAL') {
            return ['all', 'ai_analysis', 'internal_review'].includes(item.id);
        }
        if (dept === 'INVESTMENT' || dept === 'INVESTMENTS') {
            return ['all', 'ai_analysis', 'internal_review', 'financial_verification'].includes(item.id);
        }

        return true;
    });

    // Add Document links for Admin and iPreneur department
    if (userProfile?.role === 'ADMIN' || (userProfile?.role === 'INTERNAL_TEAM' && userProfile?.department === 'iPreneur')) {
        navItems.push(
            { id: 'startup_docs', label: 'Startup Documents', icon: <FileText className="w-5 h-5" />, href: '/dashboard/documents/startup', matchPath: true },
            { id: 'ipreneur_docs', label: 'iPreneur Documents', icon: <FolderOpen className="w-5 h-5" />, href: '/dashboard/documents/ipreneur', matchPath: true }
        );
    }

    if (userProfile?.role === 'ADMIN' || (userProfile?.role === 'INTERNAL_TEAM' && userProfile?.department === 'iPreneur')) {
        navItems.push({ id: 'settings', label: 'Management', icon: <Settings className="w-5 h-5" />, href: '/dashboard/settings', matchPath: true });
    }

    const isActive = (item: any) => {
        if (item.matchPath) {
            return pathname?.startsWith(item.href);
        }
        return pathname === '/dashboard' && currentTab === item.id;
    };

    return (
        <>
            {/* Sidebar Overlay - Only on mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed lg:static top-0 left-0 z-40 h-screen w-64 
                transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="h-full px-4 py-8 overflow-y-auto no-scrollbar bg-[#2e1065] shadow-2xl">
                    <div className="mb-10 px-4">
                        <div className="relative w-40 h-16 bg-white rounded-xl p-2 shadow-sm">
                            <Image 
                                src="/ipreneur_logo.png" 
                                alt="iPreneur Logo" 
                                fill 
                                className="object-contain p-2" 
                            />
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const active = isActive(item);
                            return (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200
                                        ${active
                                            ? 'bg-purple-600 text-white shadow-lg'
                                            : 'text-purple-100/70 hover:bg-white/10 hover:text-white'
                                        }
                                    `}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="mt-auto pt-8 border-t border-white/5">
                        <button
                            onClick={async () => {
                                await supabase.auth.signOut();
                                window.location.href = '/login';
                            }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200 w-full text-left"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
