document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Elements ---
    const video = document.getElementById('inputVideo');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const frameOptions = document.querySelectorAll('.frame-option');
    
    // Sliders for manual adjustments
    const offsetXSlider = document.getElementById('offsetX');
    const offsetYSlider = document.getElementById('offsetY');
    const scaleSlider = document.getElementById('scaleScale');
    const offsetXValue = document.getElementById('offsetXValue');
    const offsetYValue = document.getElementById('offsetYValue');
    const scaleValue = document.getElementById('scaleScaleValue');

    // --- State Variables ---
    let currentFrameSrc = null; // URL of the selected specs image
    let currentFrameImg = new Image(); // The actual Image object
    let isModelLoaded = false;
    let lastFaceData = null; // { x, y, width, rotation }
    
    // Path to models
    const MODEL_URL = '/static/models';

    // --- 1. Initialization: Load Models & Start Camera ---
    async function init() {
        try {
            console.log("Loading models from:", MODEL_URL);
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            console.log("Models loaded successfully");
            isModelLoaded = true;
            
            // Start Camera
            startCamera();
        } catch (err) {
            console.error("Error loading models:", err);
            loadingOverlay.innerHTML = `<p style='color:red;'>Error loading AI models.<br>${err.message}</p>`;
        }
    }

    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
            });
            video.srcObject = stream;
            video.play();
        } catch (err) {
            console.error("Camera Error:", err);
            alert("Could not access camera. Please allow camera permissions.");
        }
    }

    // --- 2. Video Event Handlers ---
    video.addEventListener('loadedmetadata', () => {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
    });

    video.addEventListener('play', () => {
        // Ensure dimensions match
        const displaySize = { width: video.videoWidth, height: video.videoHeight };
        faceapi.matchDimensions(overlayCanvas, displaySize);

        // Hide loading overlay
        loadingOverlay.style.display = 'none';

        // Start loops
        detectFaceLoop();
        drawLoop();
    });

    // --- 3. Face Detection Loop ---
    async function detectFaceLoop() {
        if (video.paused || video.ended || !isModelLoaded) {
            setTimeout(detectFaceLoop, 100);
            return;
        }

        // Use TinyFaceDetector
        // Lowered score threshold to 0.5 to ensure detection
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        
        // Detect
        const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks();

        if (result) {
            const displaySize = { width: video.videoWidth, height: video.videoHeight };
            const resizedResult = faceapi.resizeResults(result, displaySize);
            const landmarks = resizedResult.landmarks;
            
            // Helper to get average point
            const getCenter = (points) => {
                const sum = points.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
                return { x: sum.x / points.length, y: sum.y / points.length };
            };

            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            const leftEyeCenter = getCenter(leftEye);
            const rightEyeCenter = getCenter(rightEye);

            // Calculate Angle
            const dy = rightEyeCenter.y - leftEyeCenter.y;
            const dx = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Center between eyes
            const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

            // Width based on IPD (Inter-pupillary distance)
            const ipd = Math.sqrt(dx*dx + dy*dy);
            const width = ipd * 2.2; // Adjust multiplier for glasses size

            lastFaceData = {
                x: centerX,
                y: centerY,
                width: width,
                rotation: angle,
                box: resizedResult.detection.box // Save for debug drawing
            };
        } else {
            // Optional: clear lastFaceData if you want frames to disappear when face is lost
            // lastFaceData = null; 
        }

        setTimeout(detectFaceLoop, 0); 
    }

    // --- 4. Rendering Loop ---
    function drawLoop() {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // Ensure canvas matches video size
        if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
             overlayCanvas.width = video.videoWidth;
             overlayCanvas.height = video.videoHeight;
        }

        if (lastFaceData) {
            // Draw Debug Box (Green) - Visual confirmation of detection
            const box = lastFaceData.box;
            if (box) {
                overlayCtx.strokeStyle = 'cyan';
                overlayCtx.lineWidth = 2;
                overlayCtx.strokeRect(box.x, box.y, box.width, box.height);
            }

            if (currentFrameSrc) {
                let { x, y, width, rotation } = lastFaceData;

                // Apply Manual Offsets
                const offX = parseInt(offsetXSlider.value);
                const offY = parseInt(offsetYSlider.value);
                const scale = parseFloat(scaleSlider.value);

                x += offX;
                y += offY;
                width *= scale;

                const aspect = currentFrameImg.naturalWidth > 0 ? (currentFrameImg.naturalHeight / currentFrameImg.naturalWidth) : 0.5;
                const height = width * aspect;

                // Draw Specs
                overlayCtx.save();
                overlayCtx.translate(x, y);
                overlayCtx.rotate(rotation * Math.PI / 180);
                overlayCtx.drawImage(currentFrameImg, -width/2, -height/2, width, height);
                overlayCtx.restore();
            }
        }

        requestAnimationFrame(drawLoop);
    }

    // --- 5. Event Listeners (UI) ---

    // Frame Selection
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active from all
            frameOptions.forEach(opt => opt.classList.remove('active'));
            // Add active to click
            this.classList.add('active');

            currentFrameSrc = this.getAttribute('data-frame');
            console.log("Selected frame:", currentFrameSrc);
            
            // Update Image Object
            currentFrameImg = new Image();
            currentFrameImg.src = currentFrameSrc;
            
            // Optional: reset sliders on new frame? 
            // offsetXSlider.value = 0; offsetYSlider.value = 0; scaleSlider.value = 1.0;
            // updateDisplays();
        });
    });

    // Default select first frame
    if (frameOptions.length > 0) {
        frameOptions[0].click();
    } else {
        console.warn("No frames found in DOM");
    }

    // Slider Updates
    function updateVal(slider, display) {
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
        });
    }
    updateVal(offsetXSlider, offsetXValue);
    updateVal(offsetYSlider, offsetYValue);
    updateVal(scaleSlider, scaleValue);

    // Run Init
    init();
});
