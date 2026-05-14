import libre from 'libreoffice-convert';
import util from 'util';

const libreConvert = util.promisify(libre.convert);

/**
 * Converts a Word document buffer to a PDF buffer using LibreOffice.
 * Note: Requires LibreOffice (soffice) to be installed on the server.
 */
export async function convertDocxToPdf(buffer: Buffer): Promise<Buffer> {
    try {
        // .pdf is the output format, undefined is for additional options
        const pdfBuffer = await libreConvert(buffer, '.pdf', undefined);
        return pdfBuffer as Buffer;
    } catch (error) {
        console.error('LibreOffice conversion error:', error);
        throw new Error('Failed to convert document to PDF. Ensure LibreOffice is installed on the server.');
    }
}
