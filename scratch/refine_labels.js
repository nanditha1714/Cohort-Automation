const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Update the success labels and the financial verification trigger label
const oldLabelsTarget = "{submission.is_rejected ? 'Startup Rejected' : submission.is_jury_accepted ? 'Startup Accepted' : 'Evaluation Recorded'}";
const newLabelsReplacement = "{submission.is_rejected ? 'Startup Rejected' : submission.is_jury_accepted ? 'Startup Accepted' : submission.is_jury_reviewed ? 'Jury Review Completed' : 'Pending Jury Decision'}";

if (c.includes(oldLabelsTarget)) {
    c = c.replace(oldLabelsTarget, newLabelsReplacement);
}

// Update the "Financial Verification Triggered" label logic
const oldTriggerBlock = `                                                                        {!submission.is_rejected && (
                                                                            <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Financial Verification Triggered ✓</p>
                                                                            </div>
                                                                        )}`;

const newTriggerBlock = `                                                                        {!submission.is_rejected && (
                                                                            <div className="hidden md:block px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                                                    {submission.is_jury_accepted ? 'Financial Verification Triggered ✓' : 'Ready for Jury Evaluation ✓'}
                                                                                </p>
                                                                            </div>
                                                                        )}`;

if (c.includes(oldTriggerBlock)) {
    c = c.replace(oldTriggerBlock, newTriggerBlock);
}

// Also fix the internal review success block labels if needed
// (I already updated it in the previous script, but let's make it even clearer)
c = c.replace("submission.is_rejected ? 'Application Rejected' : 'Application Accepted'", "submission.is_rejected ? 'Application Rejected' : 'Application Accepted & Passed to Jury'");

fs.writeFileSync(path, c);
console.log('UI labels and status logic refined.');
