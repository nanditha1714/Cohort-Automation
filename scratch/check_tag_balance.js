const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

let openDivs = 0;
let closeDivs = 0;
for (let i = 1973; i < 2176; i++) {
    const line = lines[i];
    openDivs += (line.match(/<div(?![a-z])/g) || []).length;
    closeDivs += (line.match(/<\/div>/g) || []).length;
}
console.log(`Open: ${openDivs}, Close: ${closeDivs}, Diff: ${openDivs - closeDivs}`);
