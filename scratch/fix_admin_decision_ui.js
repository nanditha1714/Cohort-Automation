const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Refined Admin Jury Decision Block with distinct states for Pending, Accepted, and Rejected
const targetStart = "{isJuryReviewPage ? (";
const targetEnd = "/* INTERNAL STAGE DECISION */";

const refinedJuryDecisionBlock = `{isJuryReviewPage ? (
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
                                                                    <div className={\`p-8 rounded-[24px] border-2 animate-fade-up \${
                                                                        submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                            ? 'bg-red-500/5 border-red-500/20 text-red-600' 
                                                                            : submission.is_jury_accepted === true 
                                                                                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                                                                                : 'bg-blue-500/5 border-blue-500/20 text-blue-600'
                                                                    }\`}>
                                                                        <div className="flex items-center justify-between">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className={\`w-12 h-12 rounded-xl flex items-center justify-center \${
                                                                                    submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                        ? 'bg-red-500 text-white' 
                                                                                        : submission.is_jury_accepted === true 
                                                                                            ? 'bg-emerald-500 text-white'
                                                                                            : 'bg-blue-500 text-white'
                                                                                }\`}>
                                                                                    {submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                        ? <XCircle className="w-6 h-6" /> 
                                                                                        : submission.is_jury_accepted === true 
                                                                                            ? <CheckCircle className="w-6 h-6" />
                                                                                            : <RefreshCw className="w-6 h-6 animate-pulse" />
                                                                                    }
                                                                                </div>
                                                                                <div>
                                                                                    <h3 className="text-xl font-black uppercase tracking-wider">
                                                                                        {submission.is_rejected || (submission.is_jury_reviewed && submission.is_jury_accepted === false) 
                                                                                            ? 'Startup Rejected' 
                                                                                            : submission.is_jury_accepted === true 
                                                                                                ? 'Startup Accepted' 
                                                                                                : 'Jury Review in Progress'}
                                                                                    </h3>
                                                                                    <p className="text-xs opacity-70 font-bold uppercase tracking-widest mt-1">
                                                                                        {submission.is_jury_accepted !== null || submission.is_rejected 
                                                                                            ? 'Final verdict recorded by Admin' 
                                                                                            : 'Waiting for all Jury evaluations to complete'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            ) : (
                                                                /* INTERNAL STAGE DECISION */`;

// I'll replace the block.
// I need to find the start and end of the first branch of the ternary.
const lines = c.split('\n');
const startIdx = lines.findIndex(l => l.includes('{isJuryReviewPage ? ('));
const internalStageIdx = lines.findIndex(l => l.includes('/* INTERNAL STAGE DECISION */'));

if (startIdx !== -1 && internalStageIdx !== -1) {
    const before = lines.slice(0, startIdx).join('\n');
    const after = lines.slice(internalStageIdx).join('\n');
    c = before + '\n' + refinedJuryDecisionBlock + '\n' + after;
    fs.writeFileSync(path, c);
    console.log('Admin decision UI logic fixed.');
} else {
    console.log('Could not find injection points.');
}
