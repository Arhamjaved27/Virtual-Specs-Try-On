document.addEventListener('DOMContentLoaded', function() {
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
    let faceData = null; // { x, y, width, rotation } 
    let currentFrameSrc = null;
    let isModelLoaded = false;

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

            // FaceAPI result dimensions:
            const dims = result.detection.imageDims; 
            const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

            // Width based on IPD
            const ipd = Math.sqrt(dx*dx + dy*dy);
            const widthPixels = ipd * 2.2; 

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
        if (slider) {
            slider.addEventListener('input', updateFramePosition);
        }
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
            
            // Retain manual adjustments logic
            updateFramePosition();
        });
    });
    
    // Select first frame by default
    if (frameOptions.length > 0) {
        // frameOptions[0].click();
    }

    //  ///////////////////////////  Zoom & Pan Logic ///////////////////////////
    let currentZoom = 1;
    let panX = 0;
    const ZOOM_STEP = 0.1;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3.0;
    
    const imageZoomWrapper = document.getElementById('imageZoomWrapper');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    const panXSlider = document.getElementById('panXSlider');

    function updateTransform() {
        if(imageZoomWrapper) {
            imageZoomWrapper.style.transform = `scale(${currentZoom}) translate(${panX}px, 0px)`;
        }
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (currentZoom < MAX_ZOOM) {
                currentZoom += ZOOM_STEP;
                updateTransform();
            }
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom > MIN_ZOOM) {
                currentZoom -= ZOOM_STEP;
                updateTransform();
            }
        });
    }

    if (panXSlider) {
        panXSlider.addEventListener('input', (e) => {
            panX = parseInt(e.target.value);
            updateTransform();
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            currentZoom = 1;
            panX = 0;
            if(panXSlider) panXSlider.value = 0;
            updateTransform();
        });
    }

    // Detect Face Button
    const detectFaceBtn = document.getElementById('detectFaceBtn');
    if (detectFaceBtn) {
        detectFaceBtn.addEventListener('click', async () => {
             console.log("Manual face detection triggered.");
             
             if (!isModelLoaded) {
                 alert("Please wait for AI models to load.");
                 return;
             }
             
             try {
                await detectFace();
             } catch (error) {
                 console.error("Manual detection failed:", error);
                 alert("Face detection failed: " + error.message);
             }
        });
    }

    // Initialize
    init();

    const fileInput = document.getElementById('file');
    const fileTextSpan = document.querySelector('.custum-file-upload .text span');

    if (fileInput && fileTextSpan) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                let fileName = e.target.files[0].name;
                if (fileName.length > 25) {
                    fileName = fileName.substring(0, 22) + '...';
                }
                fileTextSpan.textContent = fileName;
                fileTextSpan.style.color = '#ffffff'; // Ensure text is visible
                
                const container = document.querySelector('.custum-file-upload');
                container.style.borderColor = 'var(--color-primary)';
                container.style.backgroundColor = 'rgba(88, 67, 43, 0.9)';
            } else {
                fileTextSpan.textContent = 'Click to upload image';
            }
        });
    }

});

