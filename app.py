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
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

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
            
            # Calculate face metrics for auto-positioning
            face_data = None
            if len(faces) > 0:
                # Use the first face found (usually largest/clearest)
                (x, y, w, h) = faces[0]
                img_h, img_w, _ = img.shape
                
                # Calculate ideal positions (0-1000 scale to match sliders)
                # Center X: middle of face
                center_x = ((x + w/2) / img_w) * 1000
                
                # Eye Y: approx 35-40% down from top of face box
                # Face box usually includes forehead, so eyes are roughly at top 1/3
                eye_y = ((y + h*0.37) / img_h) * 1000
                
                # Try to detect eyes for better precision
                roi_gray = gray[y:y+h, x:x+w]
                # Detect eyes in the upper half of the face to avoid false positives
                eyes = eye_cascade.detectMultiScale(roi_gray[:int(h/2), :])
                
                if len(eyes) >= 2:
                    # Sort eyes by size to get the two most prominent ones (usually the actual eyes)
                    eyes = sorted(eyes, key=lambda e: e[2] * e[3], reverse=True)[:2]
                    # Convert to absolute coordinates
                    eye_centers = []
                    for (ex, ey, ew, eh) in eyes:
                        eye_centers.append((x + ex + ew/2, y + ey + eh/2))
                    
                    # Calculate center point between eyes
                    avg_eye_x = (eye_centers[0][0] + eye_centers[1][0]) / 2
                    avg_eye_y = (eye_centers[0][1] + eye_centers[1][1]) / 2
                    
                    center_x = (avg_eye_x / img_w) * 1000
                    eye_y = (avg_eye_y / img_h) * 1000

                # Width: glasses should be slightly wider than face (e.g. 90-100% of face width)
                # We map this to % of image width
                width_percent = (w / img_w) * 1000 * 1.0 # 1.0 scaling factor
                
                face_data = {
                    'x': round(center_x, 1),
                    'y': round(eye_y, 1),
                    'width': round(width_percent, 1)
                }

# /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                # # --- VISUALIZATION FOR DEBUGGING ---
                # # Draw Face Box (Blue)
                # cv2.rectangle(img, (x, y), (x+w, y+h), (255, 0, 0), 2)
                
                # # Draw Eyes (Green)
                # if 'eyes' in locals():
                #     for (ex, ey, ew, eh) in eyes:
                #         # Eye coordinates are relative to ROI, so add x,y
                #         # Wait, in the detection loop above we calculated absolute eye centers
                #         # But 'eyes' variable held relative coordinates (ex, ey, ew, eh)
                #         cv2.rectangle(img, (x+ex, y+ey), (x+ex+ew, y+ey+eh), (0, 255, 0), 2)
                
                # # Draw Calculated Center Point (Red) for Glasses Center
                # # Convert back from 0-1000 scale to pixels for drawing
                # draw_cx = int((center_x / 1000) * img_w)
                # draw_cy = int((eye_y / 1000) * img_h)
                # cv2.circle(img, (draw_cx, draw_cy), 5, (0, 0, 255), -1)
                # # -----------------------------------
            
            processed_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + file.filename)
            cv2.imwrite(processed_path, img)
            
            # Return only the path relative to static folder
            relative_path = 'uploads/processed_' + file.filename
            return render_template('tryon_image.html', uploaded_image=relative_path, frames=available_frames, face_data=face_data)
    return render_template('tryon_image.html', uploaded_image=None, frames=available_frames, face_data=None)


if __name__ == '__main__':
    from livereload import Server
    app.debug = True
    server = Server(app.wsgi_app)
    # Watch static and templates folders for changes
    server.watch('static/')
    server.watch('templates/')
    server.serve(port=5000)
