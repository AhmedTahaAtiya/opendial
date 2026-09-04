// OpenDial Extension Service Worker (Manifest V3)
chrome.runtime.onInstalled?.addListener(() => {
  console.log('OpenDial Browser Extension initialized successfully.');
});

// Click action to launch new tab dashboard
chrome.action?.onClicked?.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
