const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically from the 'uploads' directory
app.use('/uploads', express.static('uploads'));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API route for translation
app.post('/api/translate', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded.' });
        }

        const { targetLanguage } = req.body;
        
        console.log('File received:', req.file.originalname);
        console.log('Target Language:', targetLanguage);

        // --- REALISTIC MOCK RESPONSE ---
        // We now serve the uploaded file back to the user.
        
        console.log("Simulating processing and generating response URL...");

        setTimeout(() => {
            // Construct the URL to the uploaded file so the frontend can access it.
            const videoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

            const responseData = {
                message: "Video processing complete",
                jobId: `job_${Date.now()}`,
                dubbedVideoUrl: videoUrl // The URL of the user's own uploaded video
            };
            
            // We DO NOT delete the file here anymore because we need to serve it.
            // fs.unlinkSync(req.file.path); 
            
            res.json(responseData);

        }, 3000); // 3-second delay to simulate processing

    } catch (error) {
        console.error('Error processing video:', error);
        res.status(500).json({ error: 'Failed to process video.' });
        // Clean up file if it exists on error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});