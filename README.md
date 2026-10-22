# duck-hunt-vision

Browser prototype for a camera-controlled Duck Hunt: point a finger gun at the webcam to aim, flick upward to shoot.

## Requirements

- Node.js 20+ and npm
- Desktop Chrome or Edge with a webcam

## Run

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173) and allow camera access. A mirrored camera preview with your hand landmarks appears in the bottom-right corner.

The hand model (`public/models/hand_landmarker.task`) and MediaPipe WebAssembly files are served locally; no CDN is needed at runtime.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run typecheck` | Type-check only |

## Project layout

- `src/types.ts` — shared types (`Landmark`, `HandFrame`, `HandLandmark` indices)
- `src/vision/` — webcam, MediaPipe hand tracking (`startHandTracking`, `onHands`) and the corner preview
- `src/main.ts` — page wiring and status messages
