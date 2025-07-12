const { Bytescale } = require("@bytescale/sdk");

const uploadManager = new Bytescale.UploadManager({
  apiKey: process.env.BYTESCALE_API_KEY
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    const { uploadUrl, fileUrl } = await uploadManager.createUploadUrl({
      // No specific parameters needed for a simple upload URL
    });

    res.status(200).json({ uploadUrl: uploadUrl, fileUrl: fileUrl });
  } catch (error) {
    console.error('Error creating Bytescale upload URL:', error);
    res.status(500).json({ error: 'Failed to prepare file upload.' });
  }
} 