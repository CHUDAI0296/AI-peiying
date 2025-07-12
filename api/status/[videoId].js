const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { videoId } = req.query;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  try {
    const response = await fetch(`https://api.tavus.io/v2/videos/${videoId}`, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.TAVUS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Tavus status API error:', errorData);
      return res.status(response.status).json({ error: `Tavus API Error: ${errorData.message || 'Failed to get status'}` });
    }

    const data = await response.json();
    // Forward the status directly from Tavus to our frontend
    res.status(200).json(data);

  } catch (error) {
    console.error('Error calling Tavus status API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 