const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Add the useEffect
// We search for the first useEffect in the component
const searchEffect = '    useEffect(() => {\n        if (textareaRef.current) {';
if (c.includes(searchEffect)) {
    const newEffect = `    useEffect(() => {
        if (userProfile?.role?.toUpperCase() === 'JURY' && activeTab !== 'onepager') {
            setActiveTab('onepager');
        }
    }, [userProfile]);

    useEffect(() => {
        if (textareaRef.current) {`;
    c = c.replace(searchEffect, newEffect);
} else {
    console.log('Search effect not found');
}

// 2. Fix the broken MainDashboardPanel and Return
const brokenPart = \`                                </button>
                            </div>
                        )}
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />\`;

const fixedPart = \`                                </button>
                            </div>
                        )}
                    </div>
                )}
        </div>
    );

    return (
        <div className="min-h-screen p-6 md:p-12 relative flex flex-col bg-[#f8fafc] dark:bg-[#08080a] selection:bg-indigo-500/30">
            {/* Subtle mesh background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40 dark:opacity-20 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px]" />\`;

if (c.includes(brokenPart)) {
    c = c.replace(brokenPart, fixedPart);
} else {
    console.log('Broken part not found');
    // Try without indentation
    const brokenPartNoInd = brokenPart.trim();
    // This is risky, let's look for pieces
    if (c.includes('Force Start AI Analysis')) {
        console.log('Found Force Start AI Analysis');
    }
}

fs.writeFileSync(path, c);
console.log('Final fix applied');
