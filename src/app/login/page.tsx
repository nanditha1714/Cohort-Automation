'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-client';
import { Lock, Mail, Loader2, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) throw signInError;

            // Upon successful login, check role from user_profiles
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profile?.role === 'ADMIN' || profile?.role === 'INTERNAL_TEAM' || profile?.role === 'JURY') {
                router.push('/dashboard');
            } else {
                // Normal user page or handle appropriately
                router.push('/dashboard');
            }

        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            {/* Theme Toggle */}
            <div className="absolute top-6 right-6 z-50 animate-fade-up">
                <ThemeToggle />
            </div>

            {/* Background Orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-[128px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-[128px] pointer-events-none" />

            <div className="w-full max-w-md animate-fade-up mt-8">
                <div className="glass-panel p-8">
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative w-48 h-20 mb-4">
                            <Image 
                                src="/ipreneur_logo.png" 
                                alt="iPreneur Logo" 
                                fill 
                                className="object-contain drop-shadow-md mix-blend-multiply dark:mix-blend-screen dark:grayscale dark:invert dark:brightness-200" 
                            />
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {error && (
                            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                                {error}
                            </div>
                        )}

                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400 group-focus-within:text-purple-500 transition-colors pointer-events-none" />
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-premium !pl-12"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400 group-focus-within:text-purple-500 transition-colors pointer-events-none" />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-premium !pl-12"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary mt-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
                        </button>
                    </form>

                    <div className="mt-4 text-center">
                        <button 
                            type="button"
                            onClick={() => alert("Please contact support to reset your password.")}
                            className="text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                        >
                            Forgot Password?
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
