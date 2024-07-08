chrome.runtime.onInstalled.addListener(() => {
  console.log("Class Data Extension Installed");
});

chrome.browserAction.onClicked.addListener((tab) => {
  chrome.tabs.executeScript(tab.id, { file: "content.js" });
});
