// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readConfig: (filePath) => ipcRenderer.invoke("read-config", filePath),
  readViewConfig: () => ipcRenderer.invoke("read-view-config"),
  writeViewConfig: (config) => ipcRenderer.invoke("write-view-config", config),
  shell: {
    openExternal: (url) => ipcRenderer.invoke("open-external", url),
  },
  readGoogleChatConfig: () => ipcRenderer.invoke("read-google-chat-config"),
});
