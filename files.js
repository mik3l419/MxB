
const express = require('express');
const { supabaseAdmin } = require('../supabase');
const router = express.Router();

// Get all files
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin.storage
            .from('downloads')
            .list('', {
                limit: 100,
                offset: 0
            });

        if (error) {
            console.error('Error fetching files:', error);
            return res.status(500).json({ error: 'Failed to fetch files' });
        }

        // Function to determine category based on file extension
        const getFileCategory = (filename) => {
            const ext = filename.split('.').pop()?.toLowerCase() || '';
            const appExtensions = ['apk', 'exe', 'msi', 'dmg', 'deb', 'rpm', 'pkg', 'ipa'];
            return appExtensions.includes(ext) ? 'apps' : 'documents';
        };

        // Filter out folders and add download URLs
        const files = data
            .filter(file => file.name && !file.name.endsWith('/'))
            .map(file => ({
                name: file.name,
                size: file.metadata?.size || 0,
                created_at: file.created_at,
                category: file.metadata?.category || getFileCategory(file.name),
                download_url: `/api/files/download/${encodeURIComponent(file.name)}`
            }));

        res.json(files);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download a specific file
router.get('/download/:filename', async (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);

        const { data, error } = await supabaseAdmin.storage
            .from('downloads')
            .download(filename);

        if (error) {
            console.error('Error downloading file:', error);
            return res.status(404).json({ error: 'File not found' });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Convert blob to buffer and send
        const buffer = Buffer.from(await data.arrayBuffer());
        res.send(buffer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
