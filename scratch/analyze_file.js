const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const lines = fs.readFileSync(path, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('id="report-content"'));
const endIdx = lines.findIndex(l => l.includes('{NavigationHeader}')) - 12; // Approximation

console.log('Start Index:', startIdx + 1);
console.log('End Index:', endIdx + 1);

// I'll look for a better end marker.
// The block ends before "Scheduled Jury Session Banner".
const bannerIdx = lines.findIndex(l => l.includes('Scheduled Jury Session Banner'));
console.log('Banner Index:', bannerIdx + 1);
