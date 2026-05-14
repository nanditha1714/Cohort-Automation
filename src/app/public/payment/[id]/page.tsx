'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Rocket, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import Script from 'next/script';

export default function PublicPaymentPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    const FEE_AMOUNT = 1; // ₹1 for testing

    useEffect(() => {
        if (id) {
            fetchSubmission();
        }
    }, [id]);

    // Polling for payment status (useful for UPI/Webhook updates)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        
        if (!loading && submission && !paymentSuccess && !error) {
            interval = setInterval(() => {
                console.log("Polling payment status...");
                fetchSubmission(true); // silent fetch
            }, 3000);
        }
        
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [loading, submission, paymentSuccess, error]);


    const fetchSubmission = async (silent = false) => {
        if (!silent) setLoading(true);
        try {

            console.log("Fetching submission for payment:", id);
            const { data, error: sbError } = await supabase
                .from('form_submissions')
                .select('id, company_name, form_data, created_at')
                .eq('id', id)
                .single();

            if (sbError) {
                throw sbError;
            }
            
            if (!data) throw new Error("Submission not found");

            // Check if already paid
            if (data.form_data?.__payment_status === 'PAID' || data.is_payment_completed === true) {
                setPaymentSuccess(true);
            }

            setSubmission(data);
        } catch (err: any) {
            if (!silent) {
                console.error("Error fetching submission details:", err);
                setError(err.message || "Failed to load submission details.");
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };


    const handlePayment = async () => {
        if (paymentSuccess) return;
        try {
            setPaymentLoading(true);

            // 1. Create Order on Backend
            const res = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: FEE_AMOUNT,
                    submissionId: id
                })
            });

            const { order, error: orderError } = await res.json();
            if (orderError) throw new Error(orderError);

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
                amount: order.amount,
                currency: order.currency,
                name: "iPreneur Cohort",
                description: `Enrollment Fee for ${submission.company_name}`,
                image: "https://cohort-ipreneur.vercel.app/ipreneur_logo.png", // Explicit logo to avoid mixed content issues
                order_id: order.id,
                handler: async function (response: any) {
                    console.log("Razorpay payment successful, verifying...", response);
                    try {
                        // 3. Verify Payment on Backend
                        const verifyRes = await fetch('/api/payment/verify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature,
                                submissionId: id
                            })
                        });

                        const verifyData = await verifyRes.json();
                        console.log("Verification result:", verifyData);
                        
                        if (verifyData.success) {
                            setPaymentSuccess(true);
                            // Optional: Small delay before redirect to show success state
                            setTimeout(() => {
                                window.location.href = '/dashboard';
                            }, 3000);
                        } else {
                            console.error("Verification failed:", verifyData.error);
                            alert("Payment verification failed: " + (verifyData.error || "Unknown error"));
                        }
                    } catch (vErr) {
                        console.error("Verification fetch error:", vErr);
                        alert("Error connecting to verification server. Please refresh the page.");
                    }
                },


                prefill: {
                    name: submission.company_name,
                    email: submission.form_data?.email || "",
                },
                theme: {
                    color: "#4f46e5"
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (err: any) {
            console.error("Payment initiation failed:", err);
            alert(`Error: ${err.message}`);
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#08080a] flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#08080a] flex flex-col items-center justify-center p-4">
                <div className="bg-red-50 dark:bg-red-900/10 p-10 rounded-[2.5rem] border border-red-100 max-w-md w-full text-center">
                    <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-black uppercase tracking-tight mb-2">Access Denied</h1>
                    <p className="text-sm text-gray-500 font-medium">This payment link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#08080a] flex flex-col items-center justify-center p-4 animate-fade-up">
                <div className="bg-white dark:bg-[#0c0c0e] p-10 rounded-[2.5rem] border border-gray-100 dark:border-white/5 max-w-md w-full text-center shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500">
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-tight mb-2 text-black dark:text-white">Payment Confirmed</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8">
                        Your enrollment fee for <span className="text-indigo-600 font-bold">{submission?.company_name}</span> has been processed successfully.
                    </p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={() => window.location.href = '/dashboard'}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                        >
                            Go to Dashboard <Rocket className="w-4 h-4" />
                        </button>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            Redirecting in a few seconds...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#08080a] p-6 lg:p-12 flex flex-col pt-32 w-full max-w-7xl mx-auto animate-fade-up">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />
            
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
                <h1 className="text-xl font-extrabold text-black dark:text-white uppercase tracking-tight">
                    FEE ENROLLMENT
                </h1>
                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 tracking-widest uppercase">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Secure Checkout
                </div>
            </div>

            <div className="bg-white dark:bg-[#0c0c0e] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
                        <thead className="bg-[#f1f5f9] dark:bg-black/20">
                            <tr>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest w-1/3">Startup Name</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Applied On</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fee Amount</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Status</th>
                                <th className="px-6 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="hover:bg-indigo-500/5 dark:hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-5 border-t border-gray-100 dark:border-white/5">
                                    <div className="flex flex-row items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 flex-shrink-0">
                                            <Rocket className="w-5 h-5" />
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-sm truncate">
                                            {submission.company_name}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                        {submission.created_at ? new Date(submission.created_at).toLocaleDateString() : 'N/A'}
                                    </span>
                                </td>
                                <td className="px-6 py-5 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tighter">
                                        ₹{FEE_AMOUNT}
                                    </span>
                                </td>
                                <td className="px-6 py-5 border-t border-gray-100 dark:border-white/5">
                                    <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-500 border-amber-500/20">
                                        PENDING
                                    </span>
                                </td>
                                <td className="px-6 py-5 border-t border-gray-100 dark:border-white/5 text-right w-48 align-middle">
                                    <button 
                                        onClick={handlePayment}
                                        disabled={paymentLoading}
                                        className="inline-flex items-center justify-end gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:gap-2 transition-all disabled:opacity-50 w-full"
                                    >
                                        {paymentLoading ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                                        ) : (
                                            <>Pay Now <span className="text-lg leading-none">&rarr;</span></>
                                        )}
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <p className="text-center mt-12 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                Protected by Razorpay & iPreneur Academy
            </p>
        </div>
    );
}
