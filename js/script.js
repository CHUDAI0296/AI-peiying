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
            // --- NEW STEP 1: Get presigned URL from our backend ---
            loadingStatus.textContent = 'Preparing upload...';
            const prepareResponse = await fetch('/api/prepare-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: uploadedFile.name,
                    fileType: uploadedFile.type,
                }),
            });
            if (!prepareResponse.ok) {
                const errorText = await prepareResponse.text();
                throw new Error(`Could not prepare upload: ${errorText}`);
            }
            const { uploadUrl, servingUrl } = await prepareResponse.json();

            // --- NEW STEP 2: Upload the file directly to the prepared URL ---
            loadingStatus.textContent = 'Uploading video (this may take a moment)...';
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                body: uploadedFile,
                headers: {
                    'Content-Type': uploadedFile.type,
                },
            });
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`Failed to upload video file: ${errorText}`);
            }

            // --- NEW STEP 3: Start the translation job with the new URL ---
            loadingStatus.textContent = 'Initializing AI processing...';
            const sourceLang = getEl('source-lang').value;
            const targetLang = getEl('target-lang').value;

            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    videoUrl: servingUrl, // Use the servingUrl from Replicate
                    sourceLang: sourceLang,
                    targetLang: targetLang,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server failed to start job: ${errorText}`);
            }

            const result = await response.json();
            const dubId = result.dubId;

            if (!dubId) {
                throw new Error("Did not receive a job ID from the server.");
            }

            // Step 4: Poll for the result (this part is unchanged)
            pollForStatus(dubId);

        } catch (error) {
            console.error('Error:', error);
            alert(`Failed to process the video. ${error.message}`);
            resetStudio();
        }
    };

    // New function to poll for the job status
    const pollForStatus = async (dubId) => {
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
                const statusResponse = await fetch(`/api/status/${dubId}`);
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
                    showResult(statusData.dubbed_video_url);
                } else if (statusData.status === 'error') {
                    clearInterval(intervalId);
                    alert(`Processing failed: ${statusData.error_message || 'Unknown error'}`);
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