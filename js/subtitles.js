document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.querySelector('.studio__upload-area');
    const uploadInput = document.getElementById('video-upload');
    const fileNameDisplay = document.getElementById('file-name');
    const uploadText = document.querySelector('.studio__upload-text');
    const generateBtn = document.getElementById('generate-btn');
    const loadingIndicator = document.getElementById('loading-indicator');
    const resultArea = document.getElementById('result-area');
    const workspace = document.querySelector('.studio__workspace');
    const downloadBtn = document.getElementById('download-btn');
    const subtitlePreview = document.querySelector('.subtitle-preview-text');
    const subtitleFormatSelect = document.getElementById('subtitle-format');

    let uploadedFile = null;

    uploadArea.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', () => handleFile(uploadInput.files[0]));
    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('is-dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('is-dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('is-dragover');
        handleFile(e.dataTransfer.files[0]);
    });

    function handleFile(file) {
        if (file) {
            uploadedFile = file;
            fileNameDisplay.textContent = file.name;
            uploadText.textContent = 'File Selected';
        }
    }

    generateBtn.addEventListener('click', () => {
        if (!uploadedFile) {
            alert('Please upload a video file first.');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        workspace.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        resultArea.classList.add('hidden');

        setTimeout(() => {
            const format = subtitleFormatSelect.value;
            const mockSubtitles = generateMockSubtitles(format);
            subtitlePreview.textContent = mockSubtitles;

            loadingIndicator.classList.add('hidden');
            resultArea.classList.remove('hidden');

            const blob = new Blob([mockSubtitles], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            downloadBtn.href = url;
            downloadBtn.download = `${uploadedFile.name.split('.')[0]}.${format}`;

        }, 3000);
    });

    function generateMockSubtitles(format) {
        if (format === 'vtt') {
            return `WEBVTT

00:01.000 --> 00:03.500
- Hello, and welcome to our demonstration.

00:04.000 --> 00:06.000
- Today, we're showcasing AI-generated subtitles.`;
        }
        return `1
00:00:01,000 --> 00:00:03,500
Hello, and welcome to our demonstration.

2
00:00:04,000 --> 00:00:06,000
Today, we're showcasing AI-generated subtitles.`;
    }
}); 