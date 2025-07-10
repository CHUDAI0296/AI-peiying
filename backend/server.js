const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3000;

app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.post('/api/translate', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    const videoPath = req.file.path;
    const { sourceLang, targetLang } = req.body;
    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey) {
        console.error('Tavus API key is not set in .env file.');
        fs.unlinkSync(videoPath); // Clean up the uploaded file
        return res.status(500).send('Server configuration error: API key not found.');
    }

    console.log(`Processing video: ${req.file.originalname}`);
    console.log(`Source: ${sourceLang}, Target: ${targetLang}`);
    
    const dubFormData = new FormData();
    dubFormData.append('video', fs.createReadStream(videoPath));
    dubFormData.append('source_language', sourceLang);
    dubFormData.append('destination_language', targetLang);

    try {
        console.log('Sending request to Tavus API to start dubbing job...');
        const initialDubResponse = await fetch('https://api.tavus.io/v2/dub', {
            method: 'POST',
            headers: {
                ...dubFormData.getHeaders(),
                'x-api-key': apiKey,
            },
            body: dubFormData,
        });

        const initialDubData = await initialDubResponse.json();
        if (!initialDubResponse.ok) {
            console.error('Tavus API Error Response:', initialDubData);
            throw new Error(`Failed to start dubbing job: ${initialDubResponse.status} ${initialDubResponse.statusText}`);
        }

        const dubId = initialDubData.dub_id;
        if (!dubId) {
             throw new Error('Could not get dub_id from Tavus API response.');
        }

        console.log(`Dubbing job started with ID: ${dubId}. Polling for result...`);

        let finalResult = null;
        let pollAttempts = 0;
        const maxPollAttempts = 30; // Poll for 5 minutes (30 * 10s)
        const pollInterval = 10000; // 10 seconds

        while (pollAttempts < maxPollAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval)); // Wait before polling
            
            console.log(`Polling attempt ${pollAttempts + 1}...`);
            const statusResponse = await fetch(`https://api.tavus.io/v2/dub/${dubId}`, {
                method: 'GET',
                headers: { 'x-api-key': apiKey }
            });

            if (!statusResponse.ok) {
                console.error(`Failed to get status for dub_id ${dubId}. Status: ${statusResponse.status}`);
                pollAttempts++;
                continue;
            }

            const statusData = await statusResponse.json();
            
            if (statusData.status === 'completed') {
                console.log('Dubbing completed!');
                finalResult = statusData;
                break;
            } else if (statusData.status === 'error') {
                console.error(`Dubbing job failed with error:`, statusData.error_message);
                throw new Error(`Dubbing job failed with error.`);
            }

            console.log(`Current status: ${statusData.status}. Waiting...`);
            pollAttempts++;
        }

        if (!finalResult) {
            throw new Error('Dubbing job timed out after 5 minutes.');
        }

        const videoUrl = finalResult.dubbed_video_url;
        console.log('Successfully dubbed video. Result URL:', videoUrl);
        
        res.json({ translatedVideoUrl: videoUrl });

    } catch (error) {
        console.error('Error processing video with Tavus API:', error.message);
        res.status(500).send('Failed to process video.');
    } finally {
        // Clean up the originally uploaded file from the server
        fs.unlinkSync(videoPath);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});