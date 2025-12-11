// Image upload handling
const photoInput = document.getElementById('photoInput');
const userPhoto = document.getElementById('userPhoto');
const frame = document.getElementById('frame');

if(photoInput) {
    photoInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if(file) {
            userPhoto.src = URL.createObjectURL(file);
        }
    });
}

// Frame controls
const moveX = document.getElementById('moveX');
const moveY = document.getElementById('moveY');
const scale = document.getElementById('scale');

function updateFrame() {
    frame.style.transform = `translate(${moveX.value}px, ${moveY.value}px) scale(${scale.value/100})`;
}

[moveX, moveY, scale].forEach(input => {
    input.addEventListener('input', updateFrame);
});
