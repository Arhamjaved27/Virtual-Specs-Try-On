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

