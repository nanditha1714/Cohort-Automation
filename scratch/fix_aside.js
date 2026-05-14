const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find the aside block end
const asideEndPattern = /}\s*<\/aside>\s*\)}\s*<\/main>/;
if (asideEndPattern.test(c)) {
    c = c.replace(/}\s*<\/aside>\s*\)}\s*<\/main>/, '} \n                        </div>\n                    </aside>\n                )}\n            </main>');
    console.log('Fixed aside block.');
} else {
    // Try line-based fix
    const lines = c.split('\n');
    const asideIdx = lines.findIndex(l => l.includes('</aside>'));
    if (asideIdx !== -1 && !lines[asideIdx-1].includes('</div>')) {
        lines.splice(asideIdx, 0, '                        </div>');
        c = lines.join('\n');
        console.log('Fixed aside block (line-based).');
    }
}

fs.writeFileSync(path, c);
