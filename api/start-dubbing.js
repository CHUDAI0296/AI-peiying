const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { videoUrl, sourceLanguage, targetLanguage } = req.body;

  if (!videoUrl || !sourceLanguage || !targetLanguage) {
    return res.status(400).json({ error: 'Missing required parameters: videoUrl, sourceLanguage, targetLanguage' });
  }

  try {
    const response = await fetch('https://api.tavus.io/v2/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.TAVUS_API_KEY,
      },
      body: JSON.stringify({
        video_url: videoUrl,
        source_language: sourceLanguage,
        destination_language: targetLanguage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Tavus API error:', errorData);
      return res.status(response.status).json({ error: `Tavus API Error: ${errorData.message || 'Failed to start job'}` });
    }

    const data = await response.json();
    res.status(200).json({ videoId: data.video_id });

  } catch (error) {
    console.error('Error calling Tavus API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 