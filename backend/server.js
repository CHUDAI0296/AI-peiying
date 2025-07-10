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

// This endpoint starts the dubbing process and returns a job ID
app.post('/api/translate', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No video file uploaded.');
    }

    const videoPath = req.file.path;
    const { sourceLang, targetLang } = req.body;
    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey) {
        console.error('Tavus API key is not set in .env file.');
        fs.unlinkSync(videoPath);
        return res.status(500).send('Server configuration error: API key not found.');
    }

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

        console.log(`Dubbing job started successfully. Returning dub_id: ${dubId}`);
        // Immediately return the job ID to the client
        res.json({ dubId: dubId });

    } catch (error) {
        console.error('Error starting dubbing job with Tavus API:', error.message);
        res.status(500).send('Failed to start video processing job.');
    } finally {
        fs.unlinkSync(videoPath);
    }
});

// This new endpoint checks the status of a dubbing job
app.get('/api/status/:id', async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey) {
        return res.status(500).send('Server configuration error: API key not found.');
    }

    try {
        const statusResponse = await fetch(`https://api.tavus.io/v2/dub/${id}`, {
            method: 'GET',
            headers: { 'x-api-key': apiKey }
        });

        if (!statusResponse.ok) {
            return res.status(statusResponse.status).send(`Failed to get status for job ${id}.`);
        }

        const statusData = await statusResponse.json();
        res.json(statusData);

    } catch (error) {
        console.error(`Error fetching status for job ${id}:`, error.message);
        res.status(500).send('Failed to fetch job status.');
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});