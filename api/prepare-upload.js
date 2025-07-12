const Replicate = require("replicate");

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
        return res.status(400).json({ error: 'fileName and fileType are required.' });
    }

    try {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        const upload = await replicate.uploads.create({
            path: fileName,
            content_type: fileType,
        });
        
        res.status(200).json({ uploadUrl: upload.url, servingUrl: upload.serving_url });

    } catch (error) {
        console.error('Error creating Replicate upload:', error);
        res.status(500).json({ error: 'Failed to prepare file upload.' });
    }
}; 