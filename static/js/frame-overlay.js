document.addEventListener('DOMContentLoaded', function() {
    const frameOptions = document.querySelectorAll('.frame-option');
    const frameOverlay = document.getElementById('frameOverlay');
    const imageContainer = document.getElementById('imageContainer');
    
    // Sliders
    const frameX = document.getElementById('frameX');
    const frameY = document.getElementById('frameY');
    const frameWidth = document.getElementById('frameWidth');
    const frameOpacity = document.getElementById('frameOpacity');
    
    // Value displays
    const frameXValue = document.getElementById('frameXValue');
    const frameYValue = document.getElementById('frameYValue');
    const frameWidthValue = document.getElementById('frameWidthValue');
    const frameOpacityValue = document.getElementById('frameOpacityValue');
    
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
        
        frameOverlay.style.left = x + '%';
        frameOverlay.style.top = y + '%';
        frameOverlay.style.width = width + '%';
        frameOverlay.style.opacity = opacity;
        frameOverlay.style.transform = 'translate(-50%, -50%)';
        
        frameXValue.textContent = x.toFixed(1);
        frameYValue.textContent = y.toFixed(1);
        frameWidthValue.textContent = width.toFixed(1);
        frameOpacityValue.textContent = Math.round(opacity * 100);
    }
    
    frameX.addEventListener('input', updateFramePosition);
    frameY.addEventListener('input', updateFramePosition);
    frameWidth.addEventListener('input', updateFramePosition);
    frameOpacity.addEventListener('input', updateFramePosition);
    
    resetBtn.addEventListener('click', function() {
        frameX.value = 500;   // 50%
        frameY.value = 300;   // 30%
        frameWidth.value = 400; // 40%
        frameOpacity.value = 100;
        updateFramePosition();
    });
    
    if (frameOptions.length > 0) {
        // frameOptions[0].click();
    }
});
