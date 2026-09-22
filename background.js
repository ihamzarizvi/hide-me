// Background Service Worker for Thanos Disintegration FX Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Thanos FX] Extension Installed.');
  chrome.storage.local.set({
    disintegrated: false,
    particleSize: 3,
    animationDuration: 1.8,
    gestureTriggerEnabled: false
  });
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-disintegration') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_DISINTEGRATION' });
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_STATE') {
    chrome.storage.local.get(['disintegrated', 'particleSize', 'animationDuration'], (res) => {
      sendResponse(res);
    });
    return true;
  }
  if (message.type === 'SET_DISINTEGRATED') {
    chrome.storage.local.set({ disintegrated: message.value }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});
