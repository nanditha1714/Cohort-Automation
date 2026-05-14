const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

const startMarker = ") : activeTab === 'jury_eval' ? (";
const endMarker = ") : activeTab === 'raw' ? (";

const startIdx = c.indexOf(startMarker);
const endIdx = c.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
    // We want to replace everything from the userProfile check until the closing ) of the jury_eval block
    // The jury_eval block starts right after startMarker
    // And ends right before endMarker's leading )
    
    // Actually, let's find the content between the start of the true branch and the end of the false branch.
    
    // The structure we want to fix is the one starting with evaluations.length check
    const blockStart = c.indexOf('userProfile?.role?.toUpperCase() === \'JURY\' ? (', startIdx);
    if (blockStart !== -1) {
        // We will replace from blockStart until endIdx
        const before = c.substring(0, blockStart);
        const after = c.substring(endIdx);
        
        const newBlock = `userProfile?.role?.toUpperCase() === 'JURY' ? (
                                        renderAnalysisContent(submission.one_pager_analysis, "*No one-pager analysis generated.*")
                                    ) : (
                                        <div className="space-y-12">
                                            {evaluations.length > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-6 text-center">
                                                            <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Score</div>
                                                            <div className="text-4xl font-black text-indigo-600 dark:text-indigo-400">{Math.round(evaluations.reduce((sum, e) => sum + e.total_score, 0) / evaluations.length)}/65</div>
                                                            <div className="text-[10px] text-gray-400 mt-2 font-medium">Avg. across {evaluations.length} jury members</div>
                                                        </div>
                                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center">
                                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Reviews Complete</div>
                                                            <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{evaluations.length}/{assignedJuryIds.length}</div>
                                                            <div className="text-[10px] text-gray-400 mt-2 font-medium">Assigned Jury Members</div>
                                                        </div>
                                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-6 text-center md:col-span-2 flex flex-col justify-center">
                                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Performance Index</div>
                                                            <div className="h-2 w-full bg-emerald-500/10 rounded-full mt-4 overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: \`\${(evaluations.reduce((sum, e) => sum + e.total_score, 0) / evaluations.length) * (100/65)}%\` }} /></div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-8">
                                                        <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-widest border-l-4 border-indigo-600 pl-4">Expert Remarks</h3>
                                                        <div className="grid grid-cols-1 gap-6">
                                                            {evaluations.map((evalItem) => (
                                                                <div key={evalItem.id} className="bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 rounded-[24px] p-8 shadow-sm relative overflow-hidden group">
                                                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Gavel className="w-20 h-20" /></div>
                                                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-white/5 relative z-10">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-sm">{evalItem.users?.name?.charAt(0) || 'J'}</div>
                                                                            <div><p className="text-sm font-bold text-gray-900 dark:text-white uppercase">{evalItem.users?.name || 'Jury Member'}</p><p className="text-[10px] text-gray-400 font-bold tracking-widest">{evalItem.users?.email}</p></div>
                                                                        </div>
                                                                        <div className="text-right flex flex-col items-end"><p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Total Score Card</p><span className="text-3xl font-black text-gray-900 dark:text-white">{evalItem.total_score}/65</span></div>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 relative z-10">
                                                                        {EVALUATION_CRITERIA.map(c => (
                                                                            <div key={c.id} className="space-y-3">
                                                                                <div className="flex items-center justify-between"><span className="text-[10px] font-black text-gray-500 dark:text-indigo-400/70 uppercase tracking-widest">{c.label}</span><span className="text-xs font-black text-gray-900 dark:text-white px-2 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">{evalItem.scores?.[c.id] || 0}/5</span></div>
                                                                                {evalItem.notes?.[c.id] && <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed shadow-inner">"\${evalItem.notes[c.id]}"</div>}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    <div className="mt-12 pt-8 border-t border-gray-100 dark:border-white/5 relative z-10">
                                                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6">Additional Inquiries</p>
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                            {ADDITIONAL_QUESTIONS.map(q => (
                                                                                <div key={q.id} className="space-y-3">
                                                                                    <div className="flex items-center justify-between"><span className="text-[10px] font-black text-gray-500 dark:text-emerald-400/70 uppercase tracking-widest">{q.label}</span>{evalItem.scores?.[q.id] && <span className="text-xs font-black text-gray-900 dark:text-white px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">{evalItem.scores[q.id]}/5</span>}</div>
                                                                                    {evalItem.notes?.[q.id] && <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 text-[11px] text-gray-600 dark:text-gray-400 italic leading-relaxed shadow-inner">"\${evalItem.notes[q.id]}"</div>}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {userProfile?.role?.toUpperCase() === 'ADMIN' && (
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
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                                    <Gavel className="w-16 h-16 text-gray-200 dark:text-gray-800 mb-4" />
                                                    <h3 className="text-lg font-bold text-gray-400">No Jury Evaluations Yet</h3>
                                                    <p className="text-sm text-gray-500 mt-2 max-w-xs">Once the jury submits their feedback, the complete scorecard will appear here.</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                `;
        fs.writeFileSync(path, before + newBlock + after);
        console.log('Jury dashboard section successfully reconstructed');
    } else {
        console.log('Could not find Jury check start');
    }
} else {
    console.log('Markers not found');
}
