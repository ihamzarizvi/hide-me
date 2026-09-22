# 🌌 Google Meet "Thanos Disintegration Exit" Chrome Extension

A Manifest V3 Chrome Extension that adds a dramatic **"Thanos Snap" Disintegration Effect** to your live webcam video feed in Google Meet and WebRTC video calling applications.

---

## 📸 Overview & Effect Preview

```
+-------------------------------------------------------------------+
|  [ Live Webcam Feed ] ---> [ MediaPipe Selfie Segmentation Mask ] |
|                                          |                        |
|                                          v                        |
|  [ Clean Background Plate ] <--- [ Particle Disintegration Grid ] |
|                                          |                        |
|                                          v                        |
|            [ 3D Wind Vector Field / Alpha Dissolve ]              |
+-------------------------------------------------------------------+
```

When activated, your webcam feed isolates your person, freezes the foreground, breaks it into thousands of pixel voxels, and blows them away in a turbulent wind vector field towards the top-right corner over 1.5–2.0 seconds—leaving behind only your static background plate!

---

## 🌟 Key Features

- 🎥 **Real-time Stream Interception:** Hooks `navigator.mediaDevices.getUserMedia` seamlessly in page main world.
- 👤 **AI Person Segmentation:** Integrated `@mediapipe/selfie_segmentation` with automatic background-difference fallback.
- 💨 **Dynamic Particle FX:** Simulated 3D noise vector field with customizable voxel particle sizes (2px–6px) and duration curves.
- ⏪ **Reverse Animation:** Snap again to trigger particle reassembly and return back to your live video stream.
- ⚡ **Floating Controls & Hotkeys:** Injected floating badge inside Google Meet (`Option + S` / `Cmd + Shift + X` / `Alt + S`).
- 🦁 **Brave & macOS Compatible:** Configured specially to avoid default Brave Browser shortcut collisions (`Cmd + Shift + D` is reserved in Brave for Bookmark All Tabs).
- 📦 **Downloadable Zip Package:** Comes pre-packaged with `thanos-disintegration-extension.zip` for instant unpacked installation.

---

## 🎮 Shortcut & Controls Cheat Sheet

| Trigger Method | Key / Action | Description |
| :--- | :--- | :--- |
| **Primary Mac / Brave Shortcut** | `Option + S` (or `Cmd + Shift + X`) | Toggle disintegration / reassembly on macOS / Brave |
| **Windows / Linux Shortcut** | `Alt + S` | Toggle disintegration / reassembly on Windows/Linux |
| **In-Call Badge** | Click **✨ Snap Disintegrate** | Interactive floating badge injected in Google Meet UI |
| **Popup UI** | Extension Icon -> **Snap Disintegrate** | Extension toolbar popup controls |

> 💡 **Customizing Shortcuts in Brave / Chrome:**
> Go to `brave://extensions/shortcuts` (or `chrome://extensions/shortcuts`) to bind your own custom hotkey!

---

## 📦 Installation Guide

### Option 1: Unpacked Extension Package (`thanos-disintegration-extension.zip`)

1. **Download / Extract:** Unzip `thanos-disintegration-extension.zip` in your preferred directory.
2. **Browser Extensions:** Open Brave or Chrome and visit `brave://extensions/` or `chrome://extensions/`.
3. **Enable Developer Mode:** Turn on **Developer mode** (top-right toggle switch).
4. **Load Unpacked:** Click **Load unpacked** and select the unzipped directory containing `manifest.json`.

---

## 🧪 Automated Testing & Verification

Run the built-in Node.js verification test suite:

```bash
node tests/test_extension.js
```

Expected output:
```text
--- Running Thanos Disintegration FX Extension Verification Tests ---
✓ Test 1: manifest.json structure verified.
✓ Test 2: All core extension files verified.
✓ Test 3: Engine stream interception and particle logic verified.

All 3 test suites passed successfully! 🎉
```

---

## 📂 Repository File Structure

```
├── manifest.json                       # Manifest V3 Configuration
├── background.js                      # Service Worker & Hotkey Command Handlers
├── content.js                         # Content Script Bridge
├── inject.js                          # Main World Stream Interception & Canvas FX
├── popup.html                         # Toolbar Popup HTML
├── popup.js                           # Popup Interaction Logic
├── styles.css                         # UI Styling
├── thanos-disintegration-extension.zip # Pre-packaged ready-to-load ZIP
├── tests/
│   └── test_extension.js               # Automated Verification Suite
└── README.md                          # Interactive Documentation
```

---

## ❓ Troubleshooting & FAQ

<details>
<summary><b>Q: Why didn't Cmd + Shift + D work on macOS in Brave Browser?</b></summary>
<p>Brave Browser reserves <code>Cmd + Shift + D</code> natively for the "Bookmark All Tabs" shortcut. We have configured the extension to use <code>Option + S</code> or <code>Cmd + Shift + X</code> on macOS/Brave, and you can also click the floating <b>✨ Snap Disintegrate</b> badge on screen.</p>
</details>

<details>
<summary><b>Q: Does Google Meet detect that the stream is intercepted?</b></summary>
<p>No. Google Meet receives a standard <code>MediaStream</code> returned by <code>canvas.captureStream()</code> via standard <code>getUserMedia</code> intercept. Audio tracks remain untouched.</p>
</details>

<details>
<summary><b>Q: What happens if MediaPipe CDN is slow or blocked?</b></summary>
<p>The engine automatically falls back to built-in frame-difference segmentation with oval center-weighting, ensuring the disintegration effect still works seamlessly offline.</p>
</details>
