document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element Selection ---
    const getEl = (id) => document.getElementById(id);

    // Studio Steps
    const uploadStep = getEl('upload-step');
    const processStep = getEl('process-step');
    const loadingStep = getEl('loading-step');
    const resultStep = getEl('result-step');

    // Upload Area
    const uploadArea = getEl('upload-area');
    const fileInput = getEl('file-input');

    // Process Step Elements
    const videoPreview = getEl('video-preview');
    const videoFilename = getEl('video-filename');
    const translateBtn = getEl('translate-btn');

    // Loading Step Elements
    const loadingStatus = getEl('loading-status');

    // Result Step Elements
    const originalVideo = getEl('original-video');
    const dubbedVideo = getEl('dubbed-video');
    const restartBtn = getEl('restart-btn');

    let uploadedFile = null;
    let uploadedFileUrl = null; // Will store the object URL

    // --- Functions ---

    // Function to switch between steps
    const showStep = (stepToShow) => {
        [uploadStep, processStep, loadingStep, resultStep].forEach(step => {
            step.classList.remove('active');
            // Special handling for grid/flex displays
            if (step.id === 'process-step') {
                 step.style.display = 'none';
            }
        });
        
        stepToShow.classList.add('active');
        if (stepToShow.id === 'process-step') {
            stepToShow.style.display = 'grid';
        }
    };

    // Handle the selected file
    const handleFile = (file) => {
        if (!file || !file.type.startsWith('video/')) {
            alert('Please select a valid video file.');
            return;
        }

        // Clean up previous object URL if it exists
        if (uploadedFileUrl) {
            URL.revokeObjectURL(uploadedFileUrl);
        }

        uploadedFile = file;
        uploadedFileUrl = URL.createObjectURL(file); // Assign to the outer scope variable
        videoPreview.src = uploadedFileUrl;
        videoFilename.textContent = file.name;

        showStep(processStep);
    };

    // Start the real processing by calling the backend
    const startProcessing = async () => {
        if (!uploadedFile) {
            alert("No file selected!");
            return;
        }

        showStep(loadingStep);

        try {
            // --- NEW SIMPLIFIED FLOW ---
            // STEP 1: Upload the file through our backend proxy
            loadingStatus.textContent = 'Uploading video (this may take a moment)...';
            
            const formData = new FormData();
            formData.append('video', uploadedFile); // The key 'video' must match the backend

            const proxyResponse = await fetch('/api/proxy-upload', {
                method: 'POST',
                body: formData, // No 'Content-Type' header needed; browser sets it for FormData
            });

            if (!proxyResponse.ok) {
                const errorBody = await proxyResponse.json();
                throw new Error(`Could not upload video: ${errorBody.error}`);
            }
            
            const { fileUrl } = await proxyResponse.json();
            
            // --- STEP 2: Start the dubbing job with the new URL ---
            loadingStatus.textContent = 'Initializing AI processing...';
            const sourceLang = getEl('source-lang').value;
            const targetLang = getEl('target-lang').value;

            const response = await fetch('/api/start-dubbing', { // Use the new endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl: fileUrl, // Use the fileUrl from Bytescale
                    sourceLanguage: sourceLang,
                    targetLanguage: targetLang,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(`Server failed to start job: ${errorBody.error}`);
            }

            const result = await response.json();
            const videoId = result.videoId; // Use videoId from Tavus

            if (!videoId) {
                throw new Error("Did not receive a job ID from the server.");
            }

            // Step 3: Poll for the result
            pollForStatus(videoId); // Poll with the new videoId

        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to process the video. ${error.message}`);
            resetStudio();
        }
    };

    // New function to poll for the job status
    const pollForStatus = async (videoId) => { // Parameter changed to videoId
        const pollInterval = 5000; // 5 seconds
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;

        const intervalId = setInterval(async () => {
            if (attempts >= maxAttempts) {
                clearInterval(intervalId);
                alert("Processing timed out. Please try again.");
                resetStudio();
                return;
            }

            try {
                const statusResponse = await fetch(`/api/status/${videoId}`); // Use videoId in URL
                if (!statusResponse.ok) {
                    // Stop polling on server error
                    clearInterval(intervalId);
                    alert("An error occurred while checking the status. Please try again.");
                    resetStudio();
                    return;
                }

                const statusData = await statusResponse.json();
                
                // Update loading status text
                loadingStatus.textContent = `Processing... (${statusData.status || 'initializing'})`;

                if (statusData.status === 'completed') {
                    clearInterval(intervalId);
                    showResult(statusData.video_url); // Use video_url from Tavus
                } else if (statusData.status === 'error') {
                    clearInterval(intervalId);
                    alert(`Processing failed: ${statusData.message || 'Unknown error'}`);
                    resetStudio();
                }

            } catch (error) {
                clearInterval(intervalId);
                alert("Failed to check processing status. Please check your connection and try again.");
                resetStudio();
            }

            attempts++;
        }, pollInterval);
    };

    // Show the final result
    const showResult = (dubbedUrl) => {
        if (uploadedFile) {
            originalVideo.src = uploadedFileUrl; // Use the existing object URL
            dubbedVideo.src = dubbedUrl;
        }
        showStep(resultStep);
    };
    
    // Reset the studio to the initial state
    const resetStudio = () => {
        if (uploadedFileUrl) {
            URL.revokeObjectURL(uploadedFileUrl);
        }
        uploadedFile = null;
        uploadedFileUrl = null; // Reset the URL variable
        fileInput.value = ''; // Reset file input
        videoPreview.src = '';
        originalVideo.src = '';
        dubbedVideo.src = '';
        videoFilename.textContent = '';
        showStep(uploadStep);
    };


    // --- Event Listeners ---

    // Upload Area click triggers file input
    uploadArea.addEventListener('click', () => fileInput.click());

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and Drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    // Translate button click
    translateBtn.addEventListener('click', startProcessing);
    
    // Restart button click
    restartBtn.addEventListener('click', resetStudio);

    // Add shadow to header on scroll
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.header');
        if (window.scrollY >= 50) {
            header.classList.add('header-shadow');
        } else {
            header.classList.remove('header-shadow');
        }
    });

}); 