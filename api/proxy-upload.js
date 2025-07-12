const fetch = require('node-fetch');
const Busboy = require('busboy');

// This function will wrap busboy in a Promise.
const parseMultipartForm = (req) => {
    return new Promise((resolve, reject) => {
        const busboy = Busboy({ headers: req.headers });
        const fields = {};
        const files = {};

        busboy.on('file', (fieldname, file, { filename, encoding, mimeType }) => {
            const chunks = [];
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
                files[fieldname] = {
                    content: Buffer.concat(chunks),
                    filename,
                    encoding,
                    mimeType
                };
            });
        });

        busboy.on('field', (fieldname, val) => {
            fields[fieldname] = val;
        });

        busboy.on('close', () => resolve({ files, fields }));
        busboy.on('error', reject);

        req.pipe(busboy);
    });
};


module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { files } = await parseMultipartForm(req);
        const videoFile = files.video; // Assuming the frontend sends the file with the key 'video'

        if (!videoFile) {
            return res.status(400).json({ error: 'No video file uploaded.' });
        }

        const bytescaleResponse = await fetch('https://api.bytescale.com/v2/accounts/G22nhqm/uploads/binary', {
            method: 'POST',
            body: videoFile.content,
            headers: {
                'Authorization': `Bearer ${process.env.BYTESCALE_API_KEY}`,
                'Content-Type': videoFile.mimeType
            }
        });

        if (!bytescaleResponse.ok) {
            const errorData = await bytescaleResponse.json();
            console.error('Bytescale API Error:', errorData);
            return res.status(bytescaleResponse.status).json({ error: 'Failed to upload to Bytescale' });
        }

        const uploadResult = await bytescaleResponse.json();

        res.status(200).json({ fileUrl: uploadResult.fileUrl });

    } catch (error) {
        console.error('Error in proxy upload:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 