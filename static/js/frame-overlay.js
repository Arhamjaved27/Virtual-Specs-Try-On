// Frame Overlay Control Script

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
    
    // Reset button
    const resetBtn = document.getElementById('resetBtn');
    
    let currentFrame = null;
    
    // Frame selection
    frameOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            frameOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to selected option
            this.classList.add('active');
            
            // Get frame URL
            const frameSrc = this.getAttribute('data-frame');
            currentFrame = frameSrc;
            
            // Set and show frame overlay
            frameOverlay.src = frameSrc;
            frameOverlay.style.display = 'block';
            
            // Apply current position settings
            updateFramePosition();
        });
    });
    
    // Update frame position and size
    function updateFramePosition() {
        if (!currentFrame) return;
        
        const x = frameX.value;
        const y = frameY.value;
        const width = frameWidth.value;
        const opacity = frameOpacity.value / 100;
        
        // Update overlay styles
        frameOverlay.style.left = x + '%';
        frameOverlay.style.top = y + '%';
        frameOverlay.style.width = width + '%';
        frameOverlay.style.opacity = opacity;
        frameOverlay.style.transform = 'translate(-50%, -50%)';
        
        // Update value displays
        frameXValue.textContent = x;
        frameYValue.textContent = y;
        frameWidthValue.textContent = width;
        frameOpacityValue.textContent = Math.round(opacity * 100);
    }
    
    // Slider event listeners
    frameX.addEventListener('input', updateFramePosition);
    frameY.addEventListener('input', updateFramePosition);
    frameWidth.addEventListener('input', updateFramePosition);
    frameOpacity.addEventListener('input', updateFramePosition);
    
    // Reset button
    resetBtn.addEventListener('click', function() {
        frameX.value = 50;
        frameY.value = 30;
        frameWidth.value = 40;
        frameOpacity.value = 100;
        updateFramePosition();
    });
    
    // Initialize if a frame is already loaded
    if (frameOptions.length > 0) {
        // Optionally auto-select first frame
        // frameOptions[0].click();
    }
});
