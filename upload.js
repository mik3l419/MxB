
const express = require('express');
const multer = require('multer');
const { supabaseAdmin } = require('../supabase');
const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

// Simple admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    const password = req.body.password || req.headers['x-admin-password'];

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// Upload file endpoint
router.post('/', upload.single('file'), authenticateAdmin, async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { customName } = req.body;

        if (!customName) {
            return res.status(400).json({ error: 'Custom name is required' });
        }

        // Get original file extension
        const originalExtension = req.file.originalname.split('.').pop();
        const filename = `${customName}.${originalExtension}`;
        const fileBuffer = req.file.buffer;

        // Upload to Supabase storage
        const { data, error } = await supabaseAdmin.storage
            .from('downloads')
            .upload(filename, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: true,
                metadata: {
                    originalName: req.file.originalname
                }
            });

        if (error) {
            console.error('Error uploading file:', error);
            return res.status(500).json({ error: 'Failed to upload file' });
        }

        res.json({
            message: 'File uploaded successfully',
            filename: filename,
            path: data.path
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
