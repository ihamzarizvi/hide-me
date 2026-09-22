// inject.js - Runs natively in Main Page World (Google Meet context)

(function () {
  console.log('[Thanos FX Engine] Main world injection initializing...');

  // State
  let isDisintegrated = false;
  let particleSize = 3;
  let animationDuration = 1.8; // seconds

  // Offscreen Video & Canvas Elements
  let realVideo = document.createElement('video');
  realVideo.autoplay = true;
  realVideo.playsInline = true;
  realVideo.muted = true;
  realVideo.style.display = 'none';

  // Safely attach video element when DOM body/documentElement exists
  function appendElementSafely(el) {
    try {
      if (document.body) {
        document.body.appendChild(el);
      } else if (document.documentElement) {
        document.documentElement.appendChild(el);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (document.body || document.documentElement) {
            (document.body || document.documentElement).appendChild(el);
          }
        });
      }
    } catch (err) {
      console.warn('[Thanos FX] Element attachment deferred:', err);
    }
  }

  appendElementSafely(realVideo);

  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = 640;
  canvas.height = 480;

  let bgCanvas = document.createElement('canvas');
  let bgCtx = bgCanvas.getContext('2d', { willReadFrequently: true });
  bgCanvas.width = 640;
  bgCanvas.height = 480;

  let hasBackgroundPlate = false;
  let bgPlateData = null;

  // Particle Engine State
  let particles = [];
  let isAnimating = false;
  let animProgress = 0; // 0 (normal) to 1 (disintegrated)
  let animDirection = 1; // 1 for disintegrating, -1 for reassembling
  let lastTimestamp = 0;
  let frozenPersonCanvas = null;

  // --- Segmentation Engine ---
  let selfieSegmentation = null;
  let currentMask = null;
  let isMediaPipeLoaded = false;

  function loadMediaPipeSegmentation() {
    if (window.SelfieSegmentation) {
      initSegmentation();
      return;
    }
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('[Thanos FX] MediaPipe Selfie Segmentation library loaded.');
        initSegmentation();
      };
      script.onerror = () => {
        console.warn('[Thanos FX] MediaPipe script load prevented by CSP. Using fast built-in background-difference segmentation.');
      };
      appendElementSafely(script);
    } catch (e) {
      console.warn('[Thanos FX] Script append restricted by page CSP. Falling back to built-in segmentation engine.');
    }
  }

  function initSegmentation() {
    if (!window.SelfieSegmentation) return;
    try {
      selfieSegmentation = new window.SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });
      selfieSegmentation.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });
      selfieSegmentation.onResults((results) => {
        currentMask = results.segmentationMask;
      });
      isMediaPipeLoaded = true;
      console.log('[Thanos FX] MediaPipe Selfie Segmentation initialized.');
    } catch (e) {
      console.error('[Thanos FX] Error initializing MediaPipe:', e);
    }
  }

  loadMediaPipeSegmentation();

  // Background Plate Interpolation / Auto Capture
  let frameCount = 0;
  function updateBackgroundPlate(videoEl) {
    if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return;
    if (bgCanvas.width !== videoEl.videoWidth || bgCanvas.height !== videoEl.videoHeight) {
      bgCanvas.width = videoEl.videoWidth;
      bgCanvas.height = videoEl.videoHeight;
    }

    if (!hasBackgroundPlate) {
      bgCtx.drawImage(videoEl, 0, 0, bgCanvas.width, bgCanvas.height);
      hasBackgroundPlate = true;
      bgPlateData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
    } else if (frameCount % 60 === 0 && !isDisintegrated && !isAnimating) {
      // Slow temporal interpolation of static background areas
      bgCtx.globalAlpha = 0.05;
      bgCtx.drawImage(videoEl, 0, 0, bgCanvas.width, bgCanvas.height);
      bgCtx.globalAlpha = 1.0;
      bgPlateData = bgCtx.getImageData(0, 0, bgCanvas.width, bgCanvas.height);
    }
    frameCount++;
  }

  // --- Fallback Person Segmentation (when MediaPipe offline/loading/CSP restricted) ---
  function createFallbackPersonMask(videoEl, width, height) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tCtx.drawImage(videoEl, 0, 0, width, height);

    const frameData = tCtx.getImageData(0, 0, width, height);
    const maskData = tCtx.createImageData(width, height);

    const fPixels = frameData.data;
    const mPixels = maskData.data;

    // Use oval center weighting + color/luminance background difference heuristic
    const centerX = width / 2;
    const centerY = height * 0.55;
    const radiusX = width * 0.35;
    const radiusY = height * 0.45;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const dx = (x - centerX) / radiusX;
        const dy = (y - centerY) / radiusY;
        const dist = dx * dx + dy * dy;

        let isPerson = dist <= 1.0;

        // Background subtraction check if background plate is available
        if (bgPlateData) {
          const bgR = bgPlateData.data[idx];
          const bgG = bgPlateData.data[idx + 1];
          const bgB = bgPlateData.data[idx + 2];
          const diff = Math.abs(fPixels[idx] - bgR) + Math.abs(fPixels[idx + 1] - bgG) + Math.abs(fPixels[idx + 2] - bgB);
          if (diff > 50) isPerson = true;
        }

        const alpha = isPerson ? 255 : 0;
        mPixels[idx] = alpha;
        mPixels[idx + 1] = alpha;
        mPixels[idx + 2] = alpha;
        mPixels[idx + 3] = alpha;
      }
    }
    tCtx.putImageData(maskData, 0, 0);
    return tempCanvas;
  }

  // --- Particle Engine (Thanos Snap Effect) ---
  function initializeParticles(width, height, personCanvas) {
    particles = [];
    const pCtx = personCanvas.getContext('2d', { willReadFrequently: true });
    const imgData = pCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const step = particleSize;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const alpha = data[idx + 3];

        if (alpha > 30) {
          // Calculate curl noise / wind vector blowing toward top-right
          const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6; // ~-45 deg (top-right)
          const speed = 80 + Math.random() * 200; // px / sec
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          // Per-particle staggered delay for organic dissolving effect
          const delay = (x / width) * 0.3 + (1 - y / height) * 0.3 + Math.random() * 0.2;

          particles.push({
            x: x,
            y: y,
            originX: x,
            originY: y,
            vx: vx,
            vy: vy,
            size: step,
            r: data[idx],
            g: data[idx + 1],
            b: data[idx + 2],
            a: data[idx + 3] / 255,
            delay: delay,
            rotation: (Math.random() - 0.5) * 4,
            turbulence: Math.random() * 50
          });
        }
      }
    }
  }

  function createPersonSnapshot(videoEl, width, height) {
    const snapCanvas = document.createElement('canvas');
    snapCanvas.width = width;
    snapCanvas.height = height;
    const sCtx = snapCanvas.getContext('2d', { willReadFrequently: true });

    // Draw full video frame
    sCtx.drawImage(videoEl, 0, 0, width, height);

    let maskCanvas;
    if (isMediaPipeLoaded && currentMask) {
      maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.drawImage(currentMask, 0, 0, width, height);
    } else {
      maskCanvas = createFallbackPersonMask(videoEl, width, height);
    }

    // Isolate foreground person using composite operation
    sCtx.globalCompositeOperation = 'destination-in';
    sCtx.drawImage(maskCanvas, 0, 0, width, height);
    sCtx.globalCompositeOperation = 'source-over';

    return snapCanvas;
  }

  function triggerDisintegration(disintegrate) {
    if (disintegrate === isDisintegrated) return;

    isDisintegrated = disintegrate;
    animDirection = disintegrate ? 1 : -1;
    isAnimating = true;

    if (disintegrate) {
      // Freeze frame and build particle grid
      const w = canvas.width;
      const h = canvas.height;
      frozenPersonCanvas = createPersonSnapshot(realVideo, w, h);
      initializeParticles(w, h, frozenPersonCanvas);
    }

    window.postMessage({
      source: 'THANOS_INJECT',
      type: 'STATE_CHANGED',
      disintegrated: isDisintegrated
    }, '*');
  }

  // Render Pipeline Loop
  function render(timestamp) {
    requestAnimationFrame(render);

    if (!lastTimestamp) lastTimestamp = timestamp;
    const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
    lastTimestamp = timestamp;

    if (realVideo.readyState < 2) return;

    if (canvas.width !== realVideo.videoWidth || canvas.height !== realVideo.videoHeight) {
      canvas.width = realVideo.videoWidth || 640;
      canvas.height = realVideo.videoHeight || 480;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Send frame to MediaPipe if available
    if (isMediaPipeLoaded && selfieSegmentation && frameCount % 2 === 0 && !isDisintegrated) {
      selfieSegmentation.send({ image: realVideo }).catch(() => {});
    }

    updateBackgroundPlate(realVideo);

    // Clear frame
    ctx.clearRect(0, 0, w, h);

    // Update Animation Progress
    if (isAnimating) {
      animProgress += (dt / animationDuration) * animDirection;
      if (animProgress >= 1) {
        animProgress = 1;
        isAnimating = false;
      } else if (animProgress <= 0) {
        animProgress = 0;
        isAnimating = false;
      }
    }

    // Render Background Plate
    if (hasBackgroundPlate) {
      ctx.drawImage(bgCanvas, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#1a1a24';
      ctx.fillRect(0, 0, w, h);
    }

    if (animProgress === 0 && !isDisintegrated) {
      // Normal webcam feed
      ctx.drawImage(realVideo, 0, 0, w, h);
    } else if (particles.length > 0) {
      // Render Thanos Snap Particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Calculate progress relative to particle delay
        const pProgress = Math.max(0, Math.min(1, (animProgress - p.delay) / (1 - p.delay || 0.01)));

        if (pProgress <= 0 && !isDisintegrated) {
          // Particle hasn't dissolved yet: render original pixel
          ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.a})`;
          ctx.fillRect(p.originX, p.originY, p.size, p.size);
        } else if (pProgress > 0) {
          // Particle actively disintegrating / blowing in 3D noise wind
          const displacement = pProgress * pProgress; // Ease acceleration
          const noiseX = Math.sin(pProgress * 10 + p.turbulence) * 15;
          const noiseY = Math.cos(pProgress * 8 + p.turbulence) * 10;

          const currentX = p.originX + p.vx * displacement + noiseX;
          const currentY = p.originY + p.vy * displacement + noiseY;

          // Fade alpha out as particle travels
          const currentAlpha = Math.max(0, p.a * (1 - pProgress));

          if (currentAlpha > 0.01) {
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${currentAlpha})`;
            ctx.fillRect(currentX, currentY, p.size, p.size);
          }
        }
      }
    }
  }

  requestAnimationFrame(render);

  // --- Intercept getUserMedia ---
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async function (constraints) {
      console.log('[Thanos FX] getUserMedia intercepted with constraints:', constraints);

      if (!constraints || !constraints.video) {
        return originalGetUserMedia(constraints);
      }

      const realStream = await originalGetUserMedia(constraints);
      realVideo.srcObject = realStream;
      await realVideo.play().catch((e) => console.warn('[Thanos FX] Video play warning:', e));

      const processedStream = canvas.captureStream(30);

      // Preserve audio tracks from real webcam/mic stream
      const audioTracks = realStream.getAudioTracks();
      audioTracks.forEach((track) => processedStream.addTrack(track));

      console.log('[Thanos FX] Returning processed disintegration stream to application.');
      return processedStream;
    };
  }

  // --- Communication & Shortcuts ---
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'THANOS_EXTENSION') return;

    if (event.data.type === 'TOGGLE_DISINTEGRATION') {
      triggerDisintegration(!isDisintegrated);
    }
  });

  window.addEventListener('keydown', (e) => {
    // Support multiple hotkeys for Mac / Brave compatibility:
    // Option + S (Alt + KeyS), Cmd + Shift + D, Cmd + Shift + X, or Cmd + Shift + E
    const isOptionS = e.altKey && e.code === 'KeyS';
    const isCmdShiftD = e.metaKey && e.shiftKey && e.code === 'KeyD';
    const isCmdShiftX = e.metaKey && e.shiftKey && e.code === 'KeyX';
    const isCmdShiftE = e.metaKey && e.shiftKey && e.code === 'KeyE';

    if (isOptionS || isCmdShiftD || isCmdShiftX || isCmdShiftE) {
      e.preventDefault();
      triggerDisintegration(!isDisintegrated);
    }
  });

  // Floating Control Badge
  function createFloatingBadge() {
    if (document.getElementById('thanos-floating-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'thanos-floating-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 20px;
      z-index: 999999;
      background: rgba(20, 20, 30, 0.85);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #fff;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    `;

    const icon = document.createElement('span');
    icon.textContent = '✨';
    icon.style.fontSize = '16px';

    const text = document.createElement('span');
    text.id = 'thanos-badge-text';
    text.textContent = 'Snap Disintegrate';

    badge.appendChild(icon);
    badge.appendChild(text);

    badge.addEventListener('click', () => {
      triggerDisintegration(!isDisintegrated);
    });

    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'translateY(-2px)';
      badge.style.borderColor = 'rgba(139, 92, 246, 0.6)';
    });

    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'translateY(0)';
      badge.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    });

    window.addEventListener('message', (event) => {
      if (event.data?.type === 'STATE_CHANGED') {
        if (event.data.disintegrated) {
          text.textContent = 'Reassemble User';
          badge.style.background = 'rgba(225, 29, 72, 0.85)';
        } else {
          text.textContent = 'Snap Disintegrate';
          badge.style.background = 'rgba(20, 20, 30, 0.85)';
        }
      }
    });

    appendElementSafely(badge);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFloatingBadge);
  } else {
    createFloatingBadge();
  }

})();
