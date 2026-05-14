const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const openDivs = (content.match(/<div/g) || []).length;
const closeDivs = (content.match(/<\/div>/g) || []).length;

console.log(`Open Divs: ${openDivs}, Close Divs: ${closeDivs}, Diff: ${openDivs - closeDivs}`);
