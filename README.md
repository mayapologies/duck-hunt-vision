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

## How to play

1. Hold one hand up to the camera and make a **finger gun**: index finger pointing at the screen, thumb up like a hammer, other fingers curled.
2. When the status says **Ready**, the crosshair turns solid and follows where you point. Without a finger gun it is dimmed.
3. **Flick your hand upward** quickly (like a gun's recoil) to fire. The shot lands where you were aiming just before the flick, and the corner preview shows **BANG!**.
4. Hit the drifting targets to pop them (+100). Misses still count as shots.

### Gesture tips

- Keep your whole hand inside the camera preview, about an arm's length away, in good light.
- Keep the thumb clearly up and away from the index finger; tucking it in drops the finger gun.
- Make the flick short and sharp, then return to aiming. Slow raises do not fire.
- After a shot there is a short cooldown before the next one can fire.
- If shots fire on their own or are hard to trigger, open the tuning panel (`D`) and adjust the flick speed/angle.

### Keys

| Key | Action |
| --- | --- |
| `M` | Toggle mouse mode (move to aim, click to shoot). Turns on automatically if the camera can't start. |
| `D` | Toggle the tuning panel |

### Tuning panel

Sliders for aim gain, smoothing, flick speed and angle, flick depth weight and shot cooldown. Values are saved in the browser (localStorage); **Reset to defaults** clears them. The live readout shows the pose, the flick angle and speed (with a 1-second peak, compared to the firing threshold) and the tracking FPS.

The flick angle comes from how far the index tip rises above its knuckle in the camera image. MediaPipe's depth estimate is noisy, so it is not used by default; the **depth (z) weight** slider blends it back in (0 = image only, 1 = full 3D angle).

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
- `src/gesture/` — finger-gun pose, smoothed aim and flick-to-shoot (pure logic)
- `src/game/` — canvas target scene
- `src/debug/` — tuning panel and saved settings
- `src/main.ts` — page wiring (camera → gestures → game), keys and status messages
