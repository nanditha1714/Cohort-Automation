const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// The block we want to replace is the Admin decision block inside MainDashboardPanel
// Starts around line 3054: {userProfile?.role?.toUpperCase() === 'ADMIN' && (

const oldBlockStart = "{userProfile?.role?.toUpperCase() === 'ADMIN' && (";
const oldBlockEnd = ")}"; // We need to be careful with the matching end brace

// I'll use a more precise string for the replacement
const targetContent = `                                                    {userProfile?.role?.toUpperCase() === 'ADMIN' && (
                                                        <div className="mt-12">
                                                            {!submission.is_internal_reviewed ? (
                                                                <div className="p-8 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-600/20 animate-fade-up">
                                                                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                                <ShieldCheck className="w-6 h-6 text-white" />
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="text-lg font-black uppercase tracking-widest mb-1">Final Internal Decision</h3>
                                                                                <p className="text-xs text-indigo-100 opacity-80 max-w-md">As an administrator, you can now finalize this application based on the evaluation.</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                                                            <button 
                                                                                onClick={() => handleAdminReviewSubmit('Accept')}
                                                                                disabled={isSaving !== null}
                                                                                className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                                                            >
                                                                                {isSaving === 'Accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept Application
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleAdminReviewSubmit('Reject')}
                                                                                disabled={isSaving !== null}
                                                                                className="flex-1 md:flex-none px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 border border-red-400/30"
                                                                            >
                                                                                {isSaving === 'Reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Application
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className={\`p-8 rounded-[24px] border-2 animate-fade-up \${(isJuryReviewPage ? !submission.is_jury_accepted : submission.is_rejected) ? 'bg-red-500/5 border-red-500/20 text-red-600' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'}\`}>
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-4">
                                                                            <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${(isJuryReviewPage ? !submission.is_jury_accepted : submission.is_rejected) ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}\`}>
                                                                                {(isJuryReviewPage ? !submission.is_jury_accepted : submission.is_rejected) ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                                                            </div>
                                                                            <div>
                                                                                <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                    {isJuryReviewPage ? \`Startup \${submission.is_jury_accepted ? 'Accepted' : 'Rejected'}\` : \`Application \${submission.form_data?.__is_withdrawn ? 'Withdrawn' : submission.is_rejected ? 'Rejected' : 'Accepted'}\`}
                                                                                </h3>
                                                                                <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Final decision recorded by Admin</p>
                                                                            </div>
                                                                        </div>
                                                                        {!submission.is_rejected && (
                                                                            <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Financial Verification Triggered ✓</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}`;

const newContent = `                                                    {userProfile?.role?.toUpperCase() === 'ADMIN' && (
                                                        <div className="mt-12">
                                                            {isJuryReviewPage ? (
                                                                /* JURY STAGE DECISION */
                                                                (submission.is_jury_reviewed && submission.is_jury_accepted === null && !submission.is_rejected) ? (
                                                                    <div className="p-8 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-600/20 animate-fade-up">
                                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                                    <ShieldCheck className="w-6 h-6 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-lg font-black uppercase tracking-widest mb-1">Final Jury Decision</h3>
                                                                                    <p className="text-xs text-indigo-100 opacity-80 max-w-md">Jury evaluation is complete. As an administrator, you must now provide the final verdict.</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                                                <button 
                                                                                    onClick={() => handleAdminJuryDecision('Accept')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                                                                >
                                                                                    {isSaving === 'admin_jury_Accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept Startup
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleAdminJuryDecision('Reject')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 border border-red-400/30"
                                                                                >
                                                                                    {isSaving === 'admin_jury_Reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Startup
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={\`p-8 rounded-[24px] border-2 animate-fade-up \${(submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false)) ? 'bg-red-500/5 border-red-500/20 text-red-600' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'}\`}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${(submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false)) ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}\`}>
                                                                                    {(submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false)) ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                        {submission.is_rejected ? 'Startup Rejected' : submission.is_jury_accepted ? 'Startup Accepted' : 'Evaluation Recorded'}
                                                                                    </h3>
                                                                                    <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Final verdict by Admin after Jury Review</p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                /* INTERNAL STAGE DECISION */
                                                                !submission.is_internal_reviewed ? (
                                                                    <div className="p-8 bg-indigo-600 rounded-[24px] text-white shadow-xl shadow-indigo-600/20 animate-fade-up">
                                                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                                                                                    <ShieldCheck className="w-6 h-6 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-lg font-black uppercase tracking-widest mb-1">Final Internal Decision</h3>
                                                                                    <p className="text-xs text-indigo-100 opacity-80 max-w-md">As an administrator, you can now finalize this application based on the evaluation.</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                                                <button 
                                                                                    onClick={() => handleAdminReviewSubmit('Accept')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                                                                                >
                                                                                    {isSaving === 'Accept' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept Application
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => handleAdminReviewSubmit('Reject')}
                                                                                    disabled={isSaving !== null}
                                                                                    className="flex-1 md:flex-none px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 border border-red-400/30"
                                                                                >
                                                                                    {isSaving === 'Reject' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Application
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={\`p-8 rounded-[24px] border-2 animate-fade-up \${submission.is_rejected ? 'bg-red-500/5 border-red-500/20 text-red-600' : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'}\`}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${submission.is_rejected ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}\`}>
                                                                                    {submission.is_rejected ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                        {submission.form_data?.__is_withdrawn ? 'Application Withdrawn' : submission.is_rejected ? 'Application Rejected' : 'Application Accepted'}
                                                                                    </h3>
                                                                                    <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">Final decision recorded by Admin</p>
                                                                                </div>
                                                                            </div>
                                                                            {!submission.is_rejected && (
                                                                                <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Financial Verification Triggered ✓</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>
                                                    )}`;

if (c.includes(targetContent)) {
    c = c.replace(targetContent, newContent);
    fs.writeFileSync(path, c);
    console.log('Admin decision logic updated.');
} else {
    console.log('Target content not found.');
}
