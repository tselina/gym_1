# GymTracker Pro

A minimalist, privacy-focused PWA for tracking gym workouts and free training.

## Features
- **Offline Capable**: Works without internet once installed.
- **Privacy Focused**: All data stored locally on your device.
- **Flexible Plans**: Create custom workout templates.
- **Detailed History**: Track sets, reps, weights, and comments.
- **Free Training**: Track runs, walks, and other activities.

## How to Install (Mobile)
1. Open the application in Chrome or Safari on your phone.
2. Tap "Share" (iOS) or "Menu" (Android).
3. Select "Add to Home Screen".

## Development / Running
To enable PWA features (Service Worker), serve this directory via HTTP:

```bash
# Using Python
python -m http.server

# Using Node
npx http-server
```

Then open `http://localhost:8000` (or the port shown).
