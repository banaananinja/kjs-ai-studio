// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose specific IPC functions to the Renderer process (React app)
contextBridge.exposeInMainWorld('electronAPI', {
    // Function React can call to browse a directory
    browseDirectory: (dirPath) => ipcRenderer.invoke('browse-directory', dirPath),

    // Function React can call to read files recursively
    readFilesRecursive: (paths) => ipcRenderer.invoke('read-files-recursive', paths),

    // You can expose other functions here as needed
    // Example: getHomePath: () => ipcRenderer.invoke('get-home-path')
});

console.log('Preload script loaded.');