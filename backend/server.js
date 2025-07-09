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

        // --- MOCK API RESPONSE ---
        // In a real scenario, you would call the actual API here.
        // For now, we'll just simulate a successful response after a short delay.
        
        console.log("Simulating API call...");

        setTimeout(() => {
            const mockData = {
                message: "Video is being processed",
                jobId: `job_${Date.now()}`,
                dubbedVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" // Placeholder URL
            };
            
            // Clean up the uploaded file
            fs.unlinkSync(req.file.path);
            
            res.json(mockData);

        }, 5000); // 5-second delay to simulate processing

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