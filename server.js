import express from 'express';
import pkg from 'pdf-to-printer';
const { print, getDefaultPrinter } = pkg;
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const app = express();
const PORT = process.env.PRINT_HELPER_PORT || 3929;
const RECIEVED_PDFS_DIR = path.join(process.cwd(), 'recieved-pdfs');

app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));

app.post('/print', async (req, res) => {
    if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: 'No PDF data received'});
    }

    // NEW CODE
    try {
        // Make sure we are working with a Buffer
        const pdfBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body);

        // Ensure the received-pdfs directory exists
        await fs.mkdir(RECIEVED_PDFS_DIR, { recursive: true });

        // Save incoming PDF to a stable, inspectable location
        const savePath = path.join(RECIEVED_PDFS_DIR, `cloudcut-label-${Date.now()}.pdf`);
        await fs.writeFile(savePath, pdfBuffer);
        console.log(`[Print Helper] Saved PDF to ${savePath} (size: ${pdfBuffer.length} bytes)`);

        // Send the saved file to the printer
        await print(savePath, { silent: true });

        // If you want to delete after printing, uncomment this:
        // await fs.unlink(savePath).catch(() => {});
        // END NEW CODE

        res.json({ success: true });
    } catch (err) {
        console.error('[Print Helper] Print failed:', err);
        res.status(500).json({ error: err.message || 'Print failed' });
    }
});

app.get('/status', async (req, res) => {
    try {
        const defaultPrinter = await getDefaultPrinter();
        res.json({
            ok: true,
            defaultPrinter: defaultPrinter?.name ?? null,
            platform: process.platform,
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    const { networkInterfaces } = os;
    const nets = networkInterfaces();
    const addr = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address ?? 'localhost';
    console.log(`[Print Helper] Listening on http://${addr}:${PORT}`);
    console.log('[Print Helper] POST PDF to /print to print labels');
});