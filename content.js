// content.js - Content script to bridge Chrome Extension & Page Execution Context

(function () {
  console.log('[Thanos FX] Content script initializing...');

  // Inject main world script (inject.js) into Google Meet context
  function injectMainWorldScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject.js');
    script.type = 'text/javascript';
    script.onload = function () {
      console.log('[Thanos FX] inject.js successfully loaded in main world.');
      this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
  }

  injectMainWorldScript();

  // Listen for extension commands (e.g., keyboard shortcuts, popup toggles)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'TOGGLE_DISINTEGRATION' || message.type === 'UPDATE_SETTINGS') {
      window.postMessage({ source: 'THANOS_EXTENSION', ...message }, '*');
      sendResponse({ status: 'relayed' });
    }
  });

  // Listen for messages from inject.js to sync state back to extension storage
  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.source !== 'THANOS_INJECT') return;

    if (event.data.type === 'STATE_CHANGED') {
      chrome.runtime.sendMessage({ type: 'SET_DISINTEGRATED', value: event.data.disintegrated });
    }
  });
})();
