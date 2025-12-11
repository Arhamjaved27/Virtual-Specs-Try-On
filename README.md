# Virtual-Specs-Try-On

Simple Flask app for uploading images. Contains a minimal `app.py`, `templates/` and `uploads/`.

Prerequisites
- Python 3.8+ (recommended)
- Git (optional, to track the repository)

Install
1. Create and activate a virtual environment (PowerShell):

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

Run

```powershell
python app.py
```

Open `http://127.0.0.1:5000/` in your browser to upload images.

Notes
- The `uploads/` directory is present with a `.gitkeep`. Uploaded files are saved there at runtime and are ignored by Git.
- If you want to track uploaded files remove `uploads/` from `.gitignore`.
