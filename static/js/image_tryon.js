document.addEventListener('DOMContentLoaded', function() {
    
    ///////////////////////////// CONFIGURATION & STATE /////////////////////////////
    const MODEL_URL = '/static/models';
    
    let faceData = null;       // Stores detected face metrics {x, y, width, rotation}
    let currentFrameSrc = null; // Currently selected frame URL
    let isModelLoaded = false;
    
    ///////////////////////////// ZOOM & PAN /////////////////////////////
    let currentZoom = 1;
    let panX = 0;
    const ZOOM_STEP = 0.1;
    const MIN_ZOOM = 0.5;
    const MAX_ZOOM = 3.0;

    ///////////////////////////// DOM ELEMENTS /////////////////////////////
    
    // Main Components
    const uploadedImage = document.getElementById('uploadedImage');
    const frameOverlay = document.getElementById('frameOverlay');
    const imageZoomWrapper = document.getElementById('imageZoomWrapper');
    const frameOptions = document.querySelectorAll('.frame-option');
    
    // File Upload UI
    const fileInput = document.getElementById('file');
    const fileTextSpan = document.querySelector('.custum-file-upload .text span');

    // Control Buttons
    const detectFaceBtn = document.getElementById('detectFaceBtn');
    const resetBtn = document.getElementById('resetBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');
    
    // Sliders & Inputs
    const panXSlider = document.getElementById('panXSlider');
    
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

    ///////////////////////////// CORE FUNCTIONS (LOGIC) /////////////////////////////

    // Initialize the app Load models and run initial detection.
    async function init() { 
        if (!uploadedImage) return;

        try {
            console.log("Loading FaceAPI models...");
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
            ]);
            console.log("Models loaded.");
            isModelLoaded = true;
            
            // Auto-detect face on load
            await detectFace();
            
        } catch (err) {
            console.error("Error loading models:", err);
            alert("Failed to load facial recognition models. Manual adjustment required.");
        }
    }

    async function detectFace() {
        if (!uploadedImage) return;

        // Ensure image is fully loaded before detection
        if (!uploadedImage.complete) {
            uploadedImage.onload = detectFace;
            return;
        }

        console.log("Detecting face...");
        
        // Detect Face
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 });
        const result = await faceapi.detectSingleFace(uploadedImage, options).withFaceLandmarks();

        if (result) {
            console.log("Face detected!", result);
            
            // Calculate Key Points
            const landmarks = result.landmarks;
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Get centroid of a point array
            const getCenter = (points) => {
                const sum = points.reduce((acc, curr) => ({ x: acc.x + curr.x, y: acc.y + curr.y }), { x: 0, y: 0 });
                return { x: sum.x / points.length, y: sum.y / points.length };
            };

            const leftEyeCenter = getCenter(leftEye);
            const rightEyeCenter = getCenter(rightEye);

            // Calculate Rotation (Angle)
            const dy = rightEyeCenter.y - leftEyeCenter.y;
            const dx = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Calculate Position & Width
            const dims = result.detection.imageDims; 
            const centerX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const centerY = (leftEyeCenter.y + rightEyeCenter.y) / 2;


            // // IPD (Inter-pupillary distance) used for scaling
            // const ipd = Math.sqrt(dx*dx + dy*dy);
            // const widthPixels = ipd * 2.2; 

            // Calculate Width based on Jawline (Face Width)
            const jaw = landmarks.getJawOutline();
            const leftFacePoint = jaw[0];
            const rightFacePoint = jaw[16];
            
            const dxFace = rightFacePoint.x - leftFacePoint.x;
            const dyFace = rightFacePoint.y - leftFacePoint.y;
            const faceWidth = Math.sqrt(dxFace*dxFace + dyFace*dyFace);

            // Glasses usually sit slightly wider than the face (zygomatic width)
            // Using a factor of 1.1 to genericize frame sizes
            const widthPixels = faceWidth * 1.05;

            // Compute Sliders Values (Normalized 0-1000 range)
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

    // Applies calculated face data to the UI sliders.
    function applyFaceData(data) {
        if (!data) return;

        sliders.x.value = data.x;
        sliderValues.x.textContent = data.x.toFixed(1);

        sliders.y.value = data.y;
        sliderValues.y.textContent = data.y.toFixed(1);

        sliders.width.value = data.width;
        sliderValues.width.textContent = data.width.toFixed(1);

        sliders.rotation.value = data.rotation;
        sliderValues.rotation.textContent = data.rotation.toFixed(1);

        updateFramePosition();
    }

    // Reads slider values and updates the Frame Overlay styles.
    function updateFramePosition() {
        if (!currentFrameSrc) return;
        
        // Convert slider values to CSS percentages/degrees
        const x = sliders.x.value / 10;
        const y = sliders.y.value / 10;
        const width = sliders.width.value / 10;
        const opacity = sliders.opacity.value / 100;
        const rotation = sliders.rotation.value;
        
        // Apply Styles
        frameOverlay.style.left = x + '%';
        frameOverlay.style.top = y + '%';
        frameOverlay.style.width = width+ '%';
        frameOverlay.style.opacity = opacity;
        frameOverlay.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        
        // Update Text Labels
        sliderValues.x.textContent = x.toFixed(1);
        sliderValues.y.textContent = y.toFixed(1);
        sliderValues.width.textContent = width.toFixed(1);
        sliderValues.opacity.textContent = Math.round(opacity * 100);
        sliderValues.rotation.textContent = rotation;
    }

    // Frame Selection
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Highlight active frame
            frameOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Set frame source
            currentFrameSrc = this.getAttribute('data-frame');
            frameOverlay.src = currentFrameSrc;
            frameOverlay.style.display = 'block';
            
            // Update position (uses current slider values)
            updateFramePosition();
        });
    });

    // Sliders (Live Update)
    Object.values(sliders).forEach(slider => {
        if (slider) {
            slider.addEventListener('input', updateFramePosition);
        }
    });

    //////////////////////////////// EVENT LISTENERS ////////////////////////////////

    // File Upload UI
    if (fileInput && fileTextSpan) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                let fileName = e.target.files[0].name;
                if (fileName.length > 25) {
                    fileName = fileName.substring(0, 22) + '...';
                }
                fileTextSpan.textContent = fileName;
                fileTextSpan.style.color = '#ffffff';
                
                const container = document.querySelector('.custum-file-upload');
                container.style.borderColor = 'var(--color-primary)';
                container.style.backgroundColor = 'rgba(88, 67, 43, 0.9)';
            } else {
                fileTextSpan.textContent = 'Click to upload image';
            }
        });
    }

    


//////////////////// Handles zoom in and out functionality. ////////////////////////////

    //  Applies Zoom and Pan transforms to the image wrapper.

    function updateTransform() {
        if(imageZoomWrapper) {
            imageZoomWrapper.style.transform = `scale(${currentZoom}) translate(${panX}px, 0px)`;
        }
    }

    // Zoom & Pan Controls
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (currentZoom < MAX_ZOOM) {
                currentZoom += ZOOM_STEP;
                updateTransform();
            }
        });
    }

    // Ensure transform-origin is set to center for proper scaling
    if (imageZoomWrapper) {
        imageZoomWrapper.style.transformOrigin = '50% 50%';
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (currentZoom > MIN_ZOOM) {
                currentZoom -= ZOOM_STEP;
                updateTransform();
            }
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

    if (panXSlider) {
        panXSlider.addEventListener('input', (e) => {
            const PAN_FACTOR = 5; // Adjust this value to control the range of horizontal movement
            panX = parseInt(e.target.value) * PAN_FACTOR;
            updateTransform();
        });
    }

//////////////////// Handles reset frame position functionality. ////////////////////////////
    // Reset Frame Position
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

    // Detect Face Manually
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

    ///////////////////////////// INITIALIZATION /////////////////////////////
    init();

});

