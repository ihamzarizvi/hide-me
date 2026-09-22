document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('toggleBtn');
  const statusValue = document.getElementById('statusValue');
  const particleSize = document.getElementById('particleSize');
  const duration = document.getElementById('duration');

  // Load current settings
  chrome.storage.local.get(['disintegrated', 'particleSize', 'animationDuration'], (res) => {
    if (res.disintegrated) {
      statusValue.textContent = 'Disintegrated';
      statusValue.classList.add('active');
      toggleBtn.textContent = 'Reassemble User';
    }
    if (res.particleSize) particleSize.value = res.particleSize;
    if (res.animationDuration) duration.value = res.animationDuration;
  });

  toggleBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_DISINTEGRATION' });
        setTimeout(updateStatus, 100);
      }
    });
  });

  particleSize.addEventListener('input', (e) => {
    chrome.storage.local.set({ particleSize: parseInt(e.target.value) });
  });

  duration.addEventListener('input', (e) => {
    chrome.storage.local.set({ animationDuration: parseFloat(e.target.value) });
  });

  function updateStatus() {
    chrome.storage.local.get(['disintegrated'], (res) => {
      if (res.disintegrated) {
        statusValue.textContent = 'Disintegrated';
        statusValue.classList.add('active');
        toggleBtn.textContent = 'Reassemble User';
      } else {
        statusValue.textContent = 'Normal Stream';
        statusValue.classList.remove('active');
        toggleBtn.textContent = 'Snap Disintegrate (Alt + S)';
      }
    });
  }
});
