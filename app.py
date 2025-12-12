from flask import Flask, render_template, request, redirect, url_for, send_file
import cv2
import numpy as np
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load OpenCV face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/tryon/image', methods=['GET', 'POST'])
def tryon_image():
    # Get available frames
    frames_dir = os.path.join('static', 'frames')
    available_frames = []
    if os.path.exists(frames_dir):
        available_frames = [f'frames/{f}' for f in os.listdir(frames_dir) 
                           if f.endswith(('.png', '.PNG', '.jpg', '.jpeg'))]
    
    if request.method == 'POST':
        file = request.files['photo']
        if file:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(filepath)
            
            # Read image and detect face
            img = cv2.imread(filepath)
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            # Draw rectangle on face (for now, just a placeholder)
            for (x, y, w, h) in faces:
                cv2.rectangle(img, (x, y), (x+w, y+h), (0, 255, 0), 2)
            
            processed_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + file.filename)
            cv2.imwrite(processed_path, img)
            
            # Return only the path relative to static folder
            relative_path = 'uploads/processed_' + file.filename
            return render_template('tryon_image.html', uploaded_image=relative_path, frames=available_frames)
    return render_template('tryon_image.html', uploaded_image=None, frames=available_frames)


if __name__ == '__main__':
    from livereload import Server
    app.debug = True
    server = Server(app.wsgi_app)
    # Watch static and templates folders for changes
    server.watch('static/')
    server.watch('templates/')
    server.serve(port=5000)
