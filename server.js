import express from 'express';
import pkg from 'pdf-to-printer';
const { print, getDefaultPrinter } = pkg;
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const PORT = process.env.PRINT_HELPER_PORT || 3929;

app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));

app.post('/print', async (req, res) => {
    if (!req.body || req.body.length === 0) {
        return res.status(400).json({ error: 'No PDF data received'});
    }

    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `cloudcut-label-${Date.now()}.pdf`);

    try {
        await fs.writeFile(tempPath, req.body);
        await print(tempPath, { silent: true });
        await fs.unlink(tempPath).catch(() => {});
        res.json({ success: true });
      } catch (err) {
        await fs.unlink(tempPath).catch(() => {});
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