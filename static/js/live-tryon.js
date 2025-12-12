const video = document.getElementById('inputVideo');
const canvas = document.getElementById('overlayCanvas');
const ctx = canvas.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');

// Adjustment controls
const inputs = {
    offsetX: document.getElementById('offsetX'),
    offsetY: document.getElementById('offsetY'),
    scale: document.getElementById('scaleScale')
};
const displays = {
    offsetX: document.getElementById('offsetXValue'),
    offsetY: document.getElementById('offsetYValue'),
    scale: document.getElementById('scaleScaleValue')
};

let currentFrame = new Image();
let isFrameLoaded = false;
let canvasSize = { width: 640, height: 480 };

// Load models
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/static/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/static/models')
]).then(startVideo).catch(err => {
    console.error(err);
    alert('Error loading AI models. Check console.');
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error('Error accessing webcam:', err));
}

video.addEventListener('loadedmetadata', () => {
    canvasSize.width = video.videoWidth;
    canvasSize.height = video.videoHeight;
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;
    faceapi.matchDimensions(canvas, canvasSize);
    
    loadingOverlay.style.display = 'none'; // Hide loading when video starts
});

video.addEventListener('play', () => {
    // Run detection loop
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        // Detect face
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection && isFrameLoaded) {
            const resizedDetections = faceapi.resizeResults(detection, displaySize);
            const landmarks = resizedDetections.landmarks;

            // Get eye coordinates
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Calculate centers
            const leftEyeCenter = getCenter(leftEye);
            const rightEyeCenter = getCenter(rightEye);

            // Calculate glasses parameters
            // 1. Center
            const nose = landmarks.getNose();
            // Approximating glasses center: midpoint between eyes, slightly adjusted down or using nose bridge
            // Standard simple approach: Midpoint of eye centers
            const glassesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const glassesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

            // 2. Rotation
            const dY = rightEyeCenter.y - leftEyeCenter.y;
            const dX = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dY, dX);

            // 3. Width/Size
            const eyeDistance = Math.sqrt(dX * dX + dY * dY);
            // Multiplier depends on the glasses asset, usually 2x - 2.5x the eye distance covers the face
            const baseScale = 2.2; 
            const userScale = parseFloat(inputs.scale.value);
            const glassesWidth = eyeDistance * baseScale * userScale;
            
            // Maintain aspect ratio
            const aspectRatio = currentFrame.height / currentFrame.width;
            const glassesHeight = glassesWidth * aspectRatio;

            // Apply offsets (user adjustment)
            const offsetX = parseInt(inputs.offsetX.value);
            const offsetY = parseInt(inputs.offsetY.value);

            // Draw
            ctx.save();
            ctx.translate(glassesCenterX + offsetX, glassesCenterY + offsetY);
            ctx.rotate(angle);
            ctx.drawImage(currentFrame, -glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);
            ctx.restore();
            
            // Debug: Show skeleton (optional, for testing)
            // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
    }, 100); // 10 fps usually sufficient for trying on, increase for smoothness
});

function getCenter(points) {
    const sum = points.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
}

// Frame Selection Logic
const frameOptions = document.querySelectorAll('.frame-option');
frameOptions.forEach(option => {
    option.addEventListener('click', function() {
        frameOptions.forEach(opt => opt.classList.remove('active'));
        this.classList.add('active');
        
        const src = this.getAttribute('data-frame');
        currentFrame.src = src;
        currentFrame.onload = () => { isFrameLoaded = true; };
    });
});

// Update value displays
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', (e) => {
        displays[key].textContent = e.target.value;
    });
});

// Select first frame by default if available
if (frameOptions.length > 0) {
    frameOptions[0].click();
}
