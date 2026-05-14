const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

const target = "{(!submission?.is_onboarded || isAIAnalysisPage || isInternalReviewPage || isJuryReviewPage) && !isPaymentContext && (";
const replacement = "{(!submission?.is_onboarded || isAIAnalysisPage || isInternalReviewPage || isJuryReviewPage) && !isPaymentContext && userProfile?.role?.toUpperCase() !== 'JURY' && (";

if (c.includes(target)) {
    c = c.replace(target, replacement);
    fs.writeFileSync(path, c);
    console.log('Tabs hidden for Jury.');
} else {
    console.log('Target not found.');
}
