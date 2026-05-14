const fs = require('fs'); 
const txt = fs.readFileSync('src/app/dashboard/submissions/[id]/page.tsx', 'utf8'); 
let lines = txt.split(/\r?\n/); 
let content = lines.slice(2816, 3542).join('\n'); 
let quotes = content.split('"').length - 1; 
let singleQuotes = content.split("'").length - 1; 
let backticks = content.split('`').length - 1; 
console.log({quotes, singleQuotes, backticks});
