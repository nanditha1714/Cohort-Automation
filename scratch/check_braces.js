const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
const content = fs.readFileSync(path, 'utf8');

const openBraces = (content.match(/\{/g) || []).length;
const closeBraces = (content.match(/\}/g) || []).length;
const openParens = (content.match(/\(/g) || []).length;
const closeParens = (content.match(/\)/g) || []).length;

console.log(`Braces: { : ${openBraces}, } : ${closeBraces}, Diff: ${openBraces - closeBraces}`);
console.log(`Parens: ( : ${openParens}, ) : ${closeParens}, Diff: ${openParens - closeParens}`);
