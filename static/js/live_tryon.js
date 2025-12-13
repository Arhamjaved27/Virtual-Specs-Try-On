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

const videoPanel = document.querySelector('.video-panel');

function resizeVideoInContainer() {
    if (!video.videoWidth || !video.videoHeight) return;

    const containerWidth = videoPanel.clientWidth;
    const containerHeight = videoPanel.clientHeight;
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = containerWidth / containerHeight;

    let finalWidth, finalHeight;

    if (containerAspect > videoAspect) {
        finalWidth = containerWidth;
        finalHeight = containerWidth / videoAspect;
    } else {
        finalHeight = containerHeight;
        finalWidth = containerHeight * videoAspect;
    }

    video.style.width = `${finalWidth}px`;
    video.style.height = `${finalHeight}px`;
    canvas.style.width = `${finalWidth}px`;
    canvas.style.height = `${finalHeight}px`;

    canvas.width = finalWidth;
    canvas.height = finalHeight;
    
    // Update global for detection loop
    canvasSize = { 
        width: finalWidth, 
        height: finalHeight 
    };
    faceapi.matchDimensions(canvas, canvasSize);
}

// Handle window resize
window.addEventListener('resize', () => {
    resizeVideoInContainer();
});

function startVideo() {
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: 'user'
        } 
    })
    .then(stream => {
        video.srcObject = stream;
        video.play();
    })
    .catch(err => {
        console.error('Error accessing webcam:', err);
        alert("Cannot access camera. Ensure permissions are granted.");
    });
}

video.addEventListener('loadedmetadata', () => {
    resizeVideoInContainer();
    loadingOverlay.style.display = 'none';
});

video.addEventListener('play', () => {
    resizeVideoInContainer();
    
    setInterval(async () => {
        // I use the video as input. FaceAPI detects on the video's intrinsic resolution.
        
        const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (detection && isFrameLoaded) {
            // Resize to the current calculated display size
            const resizedDetections = faceapi.resizeResults(detection, canvasSize);
            const landmarks = resizedDetections.landmarks;

            // Get eye coordinates
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Calculate centers
            const leftEyeCenter = getCenter(leftEye);
            const rightEyeCenter = getCenter(rightEye);

            // Calculate glasses parameters
            const nose = landmarks.getNose();
            const glassesCenterX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
            const glassesCenterY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

            const dY = rightEyeCenter.y - leftEyeCenter.y;
            const dX = rightEyeCenter.x - leftEyeCenter.x;
            const angle = Math.atan2(dY, dX);

            // Use Jaw outline to determine face width
            const jaw = landmarks.getJawOutline();
            const jawLeft = jaw[0];
            const jawRight = jaw[16];
            const faceWidth = Math.sqrt(Math.pow(jawRight.x - jawLeft.x, 2) + Math.pow(jawRight.y - jawLeft.y, 2));
            const baseScale = 1.1; 
            const userScale = parseFloat(inputs.scale.value);
            const glassesWidth = faceWidth * baseScale * userScale;
            
            // Maintain aspect ratio
            const aspectRatio = currentFrame.height / currentFrame.width;
            const glassesHeight = glassesWidth * aspectRatio;

            // Apply offsets (user adjustment)
            const offsetX = parseInt(inputs.offsetX.value);
            const offsetY = parseInt(inputs.offsetY.value);

            ctx.save();
            ctx.translate(glassesCenterX + offsetX, glassesCenterY + offsetY);
            ctx.rotate(angle);
            ctx.drawImage(currentFrame, -glassesWidth / 2, -glassesHeight / 2, glassesWidth, glassesHeight);
            ctx.restore();
            
            //  Show skeleton
            //  faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }
    }, 100); // 10 fps
});

function getCenter(points) {
    const sum = points.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
}

/////////////////////////// Frame Selection Logic /////////////////////////////
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

/////////////////////////// Update value displays /////////////////////////////
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', (e) => {
        displays[key].textContent = e.target.value;
    });
});

/////////////////////////// Select first frame by default /////////////////////////////
if (frameOptions.length > 0) {
    // frameOptions[0].click();
}

