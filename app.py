from flask import Flask, render_template, request, redirect, url_for, send_file

import os

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

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
            
            # Read image to validation
            # img = cv2.imread(filepath)
            
            # Simple process - just use the original image for now
            # processed_path = os.path.join(app.config['UPLOAD_FOLDER'], 'processed_' + file.filename)
            # cv2.imwrite(processed_path, img) # If we needed to process it
            
            # For now, just use the uploaded file directly
            relative_path = 'uploads/' + file.filename
            
            return render_template('tryon_image.html', uploaded_image=relative_path, frames=available_frames, face_data=None)
            
    return render_template('tryon_image.html', uploaded_image=None, frames=available_frames, face_data=None)

@app.route('/tryon/live')
def tryon_live():
    # Get available frames logic is duplicated, but okay for now or could refactor
    frames_dir = os.path.join('static', 'frames')
    available_frames = []
    if os.path.exists(frames_dir):
        available_frames = [f'frames/{f}' for f in os.listdir(frames_dir) 
                           if f.endswith(('.png', '.PNG', '.jpg', '.jpeg'))]
    return render_template('tryon_live.html', frames=available_frames)



if __name__ == '__main__':
    from livereload import Server
    app.debug = True
    server = Server(app.wsgi_app)
    server.watch('static/')
    server.watch('templates/')
    server.serve(port=5000)
