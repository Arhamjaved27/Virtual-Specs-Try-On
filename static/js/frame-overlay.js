document.addEventListener('DOMContentLoaded', function() {
    const frameOptions = document.querySelectorAll('.frame-option');
    const frameOverlay = document.getElementById('frameOverlay');
    const imageContainer = document.getElementById('imageContainer');
    
    // Sliders
    const frameX = document.getElementById('frameX');
    const frameY = document.getElementById('frameY');
    const frameWidth = document.getElementById('frameWidth');
    const frameOpacity = document.getElementById('frameOpacity');
    const frameRotation = document.getElementById('frameRotation');
    
    // Value displays
    const frameXValue = document.getElementById('frameXValue');
    const frameYValue = document.getElementById('frameYValue');
    const frameWidthValue = document.getElementById('frameWidthValue');
    const frameOpacityValue = document.getElementById('frameOpacityValue');
    const frameRotationValue = document.getElementById('frameRotationValue');
    
    const resetBtn = document.getElementById('resetBtn');
    
    let currentFrame = null;
    
    // Frame selection
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            frameOptions.forEach(opt => opt.classList.remove('active'));
            
            this.classList.add('active');
            
            const frameSrc = this.getAttribute('data-frame');
            currentFrame = frameSrc;
            
            frameOverlay.src = frameSrc;
            frameOverlay.style.display = 'block';
            
            // Auto-align if face data is available
            if (typeof faceData !== 'undefined' && faceData) {
                frameX.value = faceData.x;
                frameY.value = faceData.y;
                frameWidth.value = faceData.width;
                // frameRotation.value = faceData.rotation;
                
                console.log(faceData);
            }
            
            updateFramePosition();
        });
    });
    
    // Update frame position and size
    function updateFramePosition() {
        if (!currentFrame) return;
        
        const x = frameX.value / 10;
        const y = frameY.value / 10;
        const width = frameWidth.value / 10;
        const opacity = frameOpacity.value / 100;
        const rotation = frameRotation.value;
        
        frameOverlay.style.left = x + '%';
        frameOverlay.style.top = y + '%';
        frameOverlay.style.width = width + '%';
        frameOverlay.style.opacity = opacity;
        frameOverlay.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
        
        frameXValue.textContent = x.toFixed(1);
        frameYValue.textContent = y.toFixed(1);
        frameWidthValue.textContent = width.toFixed(1);
        frameOpacityValue.textContent = Math.round(opacity * 100);
        frameRotationValue.textContent = rotation;
    }
    
    frameX.addEventListener('input', updateFramePosition);
    frameY.addEventListener('input', updateFramePosition);
    frameWidth.addEventListener('input', updateFramePosition);
    frameOpacity.addEventListener('input', updateFramePosition);
    frameRotation.addEventListener('input', updateFramePosition);
    
    resetBtn.addEventListener('click', function() {
        frameX.value = 500;   // 50%
        frameY.value = 300;   // 30%
        frameWidth.value = 400; // 40%
        frameOpacity.value = 100;
        frameRotation.value = 0;
        updateFramePosition();
    });
    
    if (frameOptions.length > 0) {
        // frameOptions[0].click();
    }

    // Download functionality
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadCompositeImage);
    }

    function downloadCompositeImage() {
        if (!currentFrame) {
            alert('Please select a frame first.');
            return;
        }

        const uploadedImg = document.getElementById('uploadedImage');
        const frameImg = document.getElementById('frameOverlay');

        if (!uploadedImg || !frameImg) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = uploadedImg.naturalWidth;
        canvas.height = uploadedImg.naturalHeight;

        ctx.drawImage(uploadedImg, 0, 0, canvas.width, canvas.height);

        const xPercent = parseFloat(frameX.value) / 1000; // 0.0 to 1.0 (value is 0-1000)
        const yPercent = parseFloat(frameY.value) / 1000; // 0.0 to 1.0
        const widthPercent = parseFloat(frameWidth.value) / 1000; // 0.0 to 1.0
        
        const frameCenterX = xPercent * canvas.width;
        const frameCenterY = yPercent * canvas.height;
        const frameW = widthPercent * canvas.width;
        
        const aspectRatio = frameImg.naturalHeight / frameImg.naturalWidth;
        const frameH = frameW * aspectRatio;

        const rotation = parseFloat(frameRotation.value);

        const glassesImg = new Image();
        glassesImg.crossOrigin = "anonymous"; // Handle potential CORS issues if images are external
        glassesImg.src = frameImg.src;

        glassesImg.onload = function() {
            ctx.save();
            
            ctx.translate(frameCenterX, frameCenterY);
            
            // Rotate
            ctx.rotate(rotation * Math.PI / 180);
            ctx.globalAlpha = parseFloat(frameOpacity.value) / 100;
            ctx.drawImage(glassesImg, -frameW / 2, -frameH / 2, frameW, frameH);
            ctx.restore();

            const link = document.createElement('a');
            link.download = 'virtual-tryon-result.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
        
        
        if (glassesImg.complete && glassesImg.naturalHeight !== 0) {
           // It's safer to just rely on onload for the new Image object, 
           // or we can reuse the DOM element if we are sure.
           // Let's stick to the onload pattern which is robust for new Image().
        }
    }
});
