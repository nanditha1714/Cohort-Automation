const officeParser = require('officeparser');
const path = require('path');
const fs = require('fs');

const docxPath = path.join(__dirname, 'public', 'templates', 'mou_template.docx');

if (!fs.existsSync(docxPath)) {
    console.error('File not found:', docxPath);
    process.exit(1);
}

officeParser.parse(docxPath, (data, err) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Success! Extracted text length:', data.length);
    console.log('First 100 chars:', data.substring(0, 100));
});
