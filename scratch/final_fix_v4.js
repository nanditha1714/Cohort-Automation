const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// 1. Add the useEffect redirection
const effectIdx = lines.findIndex(l => l.includes('useEffect(() => {'));
if (effectIdx !== -1) {
    lines.splice(effectIdx, 0, `    useEffect(() => {
        if (userProfile?.role?.toUpperCase() === 'JURY' && activeTab !== 'onepager') {
            setActiveTab('onepager');
        }
    }, [userProfile]);
`);
}

// 2. Fix the structural mess
const forceIdx = lines.findIndex(l => l.includes('Force Start AI Analysis'));
if (forceIdx !== -1) {
    const closingIdx = lines.findIndex((l, i) => i > forceIdx && l.includes(')}'));
    const nextPartIdx = lines.findIndex((l, i) => i > forceIdx && l.includes('absolute top-'));
    
    if (closingIdx !== -1 && nextPartIdx !== -1) {
        // Replace everything between closingIdx and nextPartIdx
        lines.splice(closingIdx + 1, nextPartIdx - (closingIdx + 1), 
`                    </div>
                )}
        </div>
    );

    return (
        <div className="min-h-screen p-6 md:p-12 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
            {/* Subtle mesh background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">`
        );
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Final fix applied v4');
