chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "textToImage",
    title: "将选中文字转换为图片",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "textToImage") {
    chrome.tabs.sendMessage(tab.id, {
      action: "openEditor",
      text: info.selectionText
    });
  }
});

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveImage") {
    chrome.downloads.download({
      url: request.imageUrl,
      filename: `share-image-${Date.now()}.png`,
      saveAs: true
    });
  }
}); 