// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // File System Functions
    browseDirectory: (dirPath) => ipcRenderer.invoke('browse-directory', dirPath),
    readFilesRecursive: (paths) => ipcRenderer.invoke('read-files-recursive', paths),

    // *** NEW API Key Functions ***
    loadApiKey: () => ipcRenderer.invoke('load-api-key'),
    saveApiKey: (apiKey) => ipcRenderer.invoke('save-api-key', apiKey),
});

console.log('Preload script loaded.');