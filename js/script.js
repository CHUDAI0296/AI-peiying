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
        loadingStatus.textContent = 'Uploading video... (0/4)';

        const formData = new FormData();
        formData.append('video', uploadedFile);
        formData.append('sourceLang', getEl('source-lang').value);
        formData.append('targetLang', getEl('target-lang').value);

        try {
            const response = await fetch('http://localhost:3000/api/translate', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Server responded with an error.');
            }

            const result = await response.json();
            
            // Simulate the rest of the steps based on backend response
            loadingStatus.textContent = 'Processing... (2/4)';
            
            // In a real app, you might poll a status endpoint using result.jobId
            // For now, we just use the returned URL directly after a delay
            setTimeout(() => {
                 showResult(result.translatedVideoUrl); // Corrected property name
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            alert('Failed to process the video. Please try again.');
            resetStudio(); // Go back to the start
        }
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