const express = require('express');
const cors = require('cors');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // Add JSON body parser

// This new endpoint gets a pre-signed URL from Replicate
app.post('/api/prepare-upload', async (req, res) => {
    const { fileName, fileType } = req.body;
    const replicateApiKey = process.env.REPLICATE_API_KEY;

    if (!replicateApiKey) {
        console.error('Replicate API key is not set.');
        return res.status(500).send('Server configuration error: Replicate API key not found.');
    }

    try {
        console.log(`Requesting upload URL for ${fileName}`);
        const response = await fetch('https://api.replicate.com/v1/uploads', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${replicateApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: fileName,
                content_type: fileType,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Replicate API Error:', data);
            throw new Error('Failed to get upload URL from Replicate.');
        }
        
        console.log('Successfully got upload URL from Replicate.');
        res.json({ uploadUrl: data.upload_url, servingUrl: data.serving_url });

    } catch (error) {
        console.error('Error preparing upload with Replicate:', error.message);
        res.status(500).send('Failed to prepare file upload.');
    }
});


// This endpoint starts the dubbing process using a video URL
app.post('/api/translate', async (req, res) => {
    const { videoUrl, sourceLang, targetLang } = req.body;

    if (!videoUrl) {
        return res.status(400).send('No video URL provided.');
    }

    const apiKey = process.env.TAVUS_API_KEY;

    if (!apiKey) {
        console.error('Tavus API key is not set in .env file.');
        return res.status(500).send('Server configuration error: API key not found.');
    }

    const dubPayload = {
        video_url: videoUrl,
        source_language: sourceLang,
        destination_language: targetLang,
    };

    try {
        console.log('Sending request to Tavus API with video URL to start dubbing job...');
        const initialDubResponse = await fetch('https://api.tavus.io/v2/dub', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(dubPayload),
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
        res.json({ dubId: dubId });

    } catch (error) {
        console.error('Error starting dubbing job with Tavus API:', error.message);
        res.status(500).send('Failed to start video processing job.');
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