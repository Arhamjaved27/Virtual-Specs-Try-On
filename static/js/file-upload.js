document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file');
    const fileTextSpan = document.querySelector('.custum-file-upload .text span');

    if (fileInput && fileTextSpan) {
        fileInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files.length > 0) {
                // Get file name and truncate if too long
                let fileName = e.target.files[0].name;
                if (fileName.length > 25) {
                    fileName = fileName.substring(0, 22) + '...';
                }
                fileTextSpan.textContent = fileName;
                fileTextSpan.style.color = 'var(--white)'; // Ensure text is visible/highlighted
                
                // Add success styling
                const container = document.querySelector('.custum-file-upload');
                container.style.borderColor = 'var(--primary)';
                container.style.backgroundColor = 'rgba(102, 126, 234, 0.9)';
            } else {
                fileTextSpan.textContent = 'Click to upload image';
            }
        });
    }
});
