const fs = require('fs');
const path = 'src/app/dashboard/submissions/[id]/page.tsx';
let c = fs.readFileSync(path, 'utf8');

// Fix 1: Restore correct closing for the panel logic
const oldPanelEnd = `                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );`;

// Wait! I need to be careful with indentation in the actual file.
// Let's use a more flexible approach.
const lines = c.split('\n');

// Find the line with "Force Start AI Analysis"
const forceStartIdx = lines.findIndex(l => l.includes('Force Start AI Analysis'));
if (forceStartIdx !== -1) {
    // Correct the block after it
    // Original was 3153-3159
    lines[forceStartIdx + 2] = '                                </button>';
    lines[forceStartIdx + 3] = '                            </div>';
    lines[forceStartIdx + 4] = '                        )}';
    lines[forceStartIdx + 5] = '                    </div>';
    lines[forceStartIdx + 6] = '                )}';
    lines[forceStartIdx + 7] = '            </div>';
    lines[forceStartIdx + 8] = '        </div>';
    lines[forceStartIdx + 9] = '    );';
}

// Find the stray div at the end of the aside
const strayDivIdx = lines.findIndex(l => l.includes(') : null}') && lines[l+1] && lines[l+1].trim() === '</div>' && lines[l+2] && lines[l+2].includes('</aside>'));
if (strayDivIdx !== -1) {
    // Remove lines[strayDivIdx + 1]
    lines.splice(strayDivIdx + 1, 1);
} else {
    // Try another search for the stray div
    const asideEndIdx = lines.findIndex(l => l.includes('</aside>'));
    if (asideEndIdx !== -1 && lines[asideEndIdx - 1].trim() === '</div>' && lines[asideEndIdx - 2].includes(') : null}')) {
        lines.splice(asideEndIdx - 1, 1);
    }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Final structural fixes applied.');
