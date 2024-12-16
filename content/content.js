let editorFrame = null;

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openEditor") {
    createEditorFrame(request.text);
  }
});

function createEditorFrame(selectedText) {
  if (editorFrame) {
    editorFrame.remove();
  }

  editorFrame = document.createElement('iframe');
  editorFrame.src = chrome.runtime.getURL('editor/editor.html');
  editorFrame.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 800px;
    height: 600px;
    border: none;
    box-shadow: 0 0 20px rgba(0,0,0,0.3);
    z-index: 2147483647;
  `;

  document.body.appendChild(editorFrame);

  // 等待iframe加载完成后发送选中的文本
  editorFrame.onload = () => {
    editorFrame.contentWindow.postMessage({
      type: 'selectedText',
      text: selectedText
    }, '*');
  };
}

// 监听编辑器发来的消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'closeEditor') {
    editorFrame?.remove();
    editorFrame = null;
  }
}); 