// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload Script: Starting execution...'); // Log start

try {
    // Expose specific IPC functions to the Renderer process (React app)
    contextBridge.exposeInMainWorld('electronAPI', {
        // Function React can call to browse a directory
        browseDirectory: (dirPath) => {
            console.log('Preload: Invoking browse-directory for', dirPath);
            return ipcRenderer.invoke('browse-directory', dirPath);
        },

        // Function React can call to read files recursively
        readFilesRecursive: (paths) => {
            console.log('Preload: Invoking read-files-recursive for', paths);
            return ipcRenderer.invoke('read-files-recursive', paths);
        },

        // API Key Functions
        loadApiKey: () => {
            console.log('Preload: Invoking load-api-key');
            return ipcRenderer.invoke('load-api-key');
        },
        saveApiKey: (apiKey) => {
            console.log('Preload: Invoking save-api-key');
            // Avoid logging the key itself here too
            return ipcRenderer.invoke('save-api-key', apiKey);
        },
    });

    console.log('Preload Script: electronAPI exposed successfully.'); // Log success

} catch (error) {
    console.error('Preload Script Error:', error); // Log any error during contextBridge setup
}