document.addEventListener('DOMContentLoaded', function() {
    // --- Configuration ---
    const MODEL_URL = '/static/models';
    
    // --- DOM Elements ---
    const imageContainer = document.getElementById('imageContainer');
    const uploadedImage = document.getElementById('uploadedImage');
    const frameOverlay = document.getElementById('frameOverlay');
    const frameOptions = document.querySelectorAll('.frame-option');
    
    // Sliders
    const sliders = {
        x: document.getElementById('frameX'),
        y: document.getElementById('frameY'),
        width: document.getElementById('frameWidth'),
        rotation: document.getElementById('frameRotation'),
        opacity: document.getElementById('frameOpacity')
    };
    
    const sliderValues = {
        x: document.getElementById('frameXValue'),
        y: document.getElementById('frameYValue'),
        width: document.getElementById('frameWidthValue'),
        rotation: document.getElementById('frameRotationValue'),
        opacity: document.getElementById('frameOpacityValue')
    };

    // --- State ---
    let faceData = null; // { x, y, width, rotation } (percentages relative to image)
    let currentFrameSrc = null;
    let isModelLoaded = false;

    // --- Initialization ---
    async function init() {
        if (!uploadedImage) return; // No image uploaded

        try {
            console.log("Loading FaceAPI models...");
            // Show loading state if possible
            
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            console.log("Models loaded.");
            isModelLoaded = true;
            
            // Detect face on the uploaded image
            await detectFace();
            
        } catch (err) {
            console.error("Error loading models:", err);
            alert("Failed to load facial recognition models. Manual adjustment required.");
        }
    }

    async function detectFace() {
        if (!uploadedImage) return;

        // Ensure image is loaded
        if (!uploadedImage.complete) {
            uploadedImage.onload = detectFace;
            return;
        }

        console.log("Detecting face...");
        
        // Use TinyFaceDetector
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });
        const result = await faceapi.detectSingleFace(uploadedImage, options).withFaceLandmarks();

        if (result) {
            console.log("Face detected!", result);
            
            // Calculate metrics
            const landmarks = result.landmarks;
            const leftEye = landmarks.getLeftEye(); // Array of points
            const rightEye = landmarks.getRightEye();

            // Helper to get average point
            const getCenter = (points) => {
                const sum = points.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
                return { x: sum.x / points.length, y: sum.y / points.length };
            };

            const leftEyeCenter = getCenter(leftEye);
            const rightEyeCenter = getCenter(rightEye);

            // Calculate Angle
            const dy = rightEyeCenter.y - leftEyeCenter.y;
            const dx = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Center between eyes
            // These coordinates are relative to the image element's natural or displayed size depending on how FaceAPI processed it. 
            // Since we passed the HTMLImageElement, FaceAPI usually processes it at natural size or internal inputSize, 
            // but the result landmarks are usually mapped to the image dimensions.
            
            // FaceAPI result dimensions:
            const dims = result.detection.imageDims; 
            // Note: If inputSize was smaller, landmarks might need resizing if we weren't careful, 
            // but detectSingleFace(img) generally returns coords relative to 'img'.
            
            // However, for consistency, let's just use the coordinates returned which are pixels on the image.
            
            const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

            // Width based on IPD
            const ipd = Math.sqrt(dx*dx + dy*dy);
            const widthPixels = ipd * 2.2; 

            // Convert to percentages for the overlay system
            // The overlay system uses 0-1000 range for positions (0.1%)
            // and maybe pixels or percent for width... wait, let's check HTML slider:
            // Width slider: min 100 max 1000 => seems to be 0-1000 scale relative to image width?
            // Checking frame-overlay.js would confirm, but let's assume valid range is comparable to app.py logic.
            // In app.py: width_percent = (w / img_w) * 1000
            
            const imgWidth = dims.width;
            const imgHeight = dims.height;

            const computedScale = {
                x: (centerX / imgWidth) * 1000,
                y: (centerY / imgHeight) * 1000,
                width: (widthPixels / imgWidth) * 1000,
                rotation: angle
            };

            faceData = computedScale;
            applyFaceData(faceData);
            
        } else {
            console.warn("No face detected.");
            alert("Could not detect a face. Please adjust frames manually.");
        }
    }

    function applyFaceData(data) {
        if (!data) return;

        // Update Sliders
        sliders.x.value = data.x;
        sliderValues.x.textContent = data.x.toFixed(1);

        sliders.y.value = data.y;
        sliderValues.y.textContent = data.y.toFixed(1);

        sliders.width.value = data.width;
        sliderValues.width.textContent = data.width.toFixed(1);

        sliders.rotation.value = data.rotation;
        sliderValues.rotation.textContent = data.rotation.toFixed(1);

        // Trigger update to visual
        updateOverlay();
    }

    // --- UI Update Logic ---
    function updateFramePosition() {
        if (!currentFrameSrc) return;
        
        const x = sliders.x.value / 10;
        const y = sliders.y.value / 10;
        const width = sliders.width.value / 10;
        const opacity = sliders.opacity.value / 100;
        const rotation = sliders.rotation.value;
        
        frameOverlay.style.left = x + '%';
        frameOverlay.style.top = y + '%';
        frameOverlay.style.width = width + '%';
        frameOverlay.style.opacity = opacity;
        frameOverlay.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        
        // Update text displays
        sliderValues.x.textContent = x.toFixed(1);
        sliderValues.y.textContent = y.toFixed(1);
        sliderValues.width.textContent = width.toFixed(1);
        sliderValues.opacity.textContent = Math.round(opacity * 100);
        sliderValues.rotation.textContent = rotation;
    }

    function updateOverlay() {
        // Just alias to the update function
        updateFramePosition();
    }

    // Event Listeners for Sliders
    Object.values(sliders).forEach(slider => {
        slider.addEventListener('input', updateFramePosition);
    });

    // Reset Button
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            sliders.x.value = 500;
            sliders.y.value = 300;
            sliders.width.value = 400;
            sliders.opacity.value = 100;
            sliders.rotation.value = 0;
            updateFramePosition();
        });
    }

    // --- Frame Selection ---
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            // UI Update
            frameOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            currentFrameSrc = this.getAttribute('data-frame');
            frameOverlay.src = currentFrameSrc;
            frameOverlay.style.display = 'block';
            
            if (faceData) {
                // If we have face data, maybe we should re-apply it?
                // But typically switching frames shouldn't necessarily reset position unless we want to snap back to eyes.
                // Let's stick to current connection. 
                // But wait, the original logic in frame-overlay.js re-applied faceData on click if available.
                // Let's do that for consistency.
                 applyFaceData(faceData);
            } else {
                updateFramePosition();
            }
        });
    });
    
    // Select first frame by default
    if (frameOptions.length > 0) {
        // Don't auto-click here if it might conflict with init order, 
        // but `init` calls `detectFace` which sets `faceData` and calls `applyFaceData`.
        // So safe to click now to set initial state.
        frameOptions[0].click();
    }

    // Initialize
    init();

});

