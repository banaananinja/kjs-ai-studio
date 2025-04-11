// public/preload.js
const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload Script: Starting execution...'); // Log start

try {
    // Expose specific IPC functions to the Renderer process (React app)
    contextBridge.exposeInMainWorld('electronAPI', {
        // Function React can call to browse a directory
        browseDirectory: async (dirPath) => { // Make async to await log
            console.log('Preload: Invoking browse-directory for', dirPath);
            const result = await ipcRenderer.invoke('browse-directory', dirPath);
            console.log('Preload: browse-directory received result:', result); // Log received result
            return result;
        },

        // Function React can call to read files recursively
        readFilesRecursive: async (paths) => { // Make async to await log
            console.log('Preload: Invoking read-files-recursive for', paths);
            const result = await ipcRenderer.invoke('read-files-recursive', paths);
            console.log('Preload: read-files-recursive received result:', result); // Log received result
            return result;
        },

        // API Key Functions
        loadApiKey: async () => { // Make async to await log
            console.log('Preload: Invoking load-api-key');
            const result = await ipcRenderer.invoke('load-api-key');
            console.log('Preload: load-api-key received result:', result); // Log received result
            return result;
        },
        saveApiKey: async (apiKey) => { // Make async to await log
            console.log('Preload: Invoking save-api-key');
            // Avoid logging the key itself here too
            const result = await ipcRenderer.invoke('save-api-key', apiKey);
            console.log('Preload: save-api-key received result:', result); // Log received result
            return result;
        },
    });

    console.log('Preload Script: electronAPI exposed successfully.'); // Log success

} catch (error) {
    console.error('Preload Script Error:', error); // Log any error during contextBridge setup
}