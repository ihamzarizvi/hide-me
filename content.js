// content.js - Content script bridge for extension state sync

(function () {
  console.log('[Thanos FX] Content script initialized in isolated world.');

  // Listen for messages from background script / extension popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_DISINTEGRATION' || message.type === 'UPDATE_SETTINGS') {
      window.postMessage({ source: 'THANOS_EXTENSION', ...message }, '*');
      sendResponse({ status: 'relayed' });
    }
  });

  // Relay state changes from inject.js to chrome.storage
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'THANOS_INJECT') return;

    if (event.data.type === 'STATE_CHANGED') {
      chrome.runtime.sendMessage({ type: 'SET_DISINTEGRATED', value: event.data.disintegrated });
    }
  });
})();
