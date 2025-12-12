import urllib.request
import os

models_dir = os.path.join('static', 'models')
os.makedirs(models_dir, exist_ok=True)

urls = [
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json",
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1",
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json",
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1"
]

print("Downloading models...")
for url in urls:
    filename = url.split('/')[-1]
    filepath = os.path.join(models_dir, filename)
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print("Done.")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

print("All downloads finished.")
