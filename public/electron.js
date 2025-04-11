// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const nodePath = require('path');

let store; // Declare store in module scope

// --- Node.js File System Functions ---

async function listDirectory(dirPath) {
    console.log(`Attempting to read directory: ${dirPath}`);
    try {
        const dirents = await fs.readdir(dirPath, { withFileTypes: true });
        const items = dirents.map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            path: nodePath.join(dirPath, dirent.name)
        }));
        console.log(`Successfully listed ${items.length} items in ${dirPath}`);
        return items;
    } catch (err) {
        console.error(`Error reading directory ${dirPath}: Code=${err.code}, Message=${err.message}`);
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            // Use reject to ensure the promise fails correctly for the ipcMain.handle
            return Promise.reject(new Error(`Permission denied accessing folder: ${nodePath.basename(dirPath)}`));
        } else if (err.code === 'ENOENT') {
            return Promise.reject(new Error(`Folder not found: ${nodePath.basename(dirPath)}`));
        }
        return Promise.reject(new Error(`Failed to read folder: ${nodePath.basename(dirPath)}`));
    }
}

async function readFilesRecursively(pathsToRead) {
    console.log(`Main: readFilesRecursively called with:`, pathsToRead);
    let validFilesData = [];
    const validExtensions = ['.txt', '.pdf', '.rtf'];

    // *** CORRECTED processEntry function with proper try/catch ***
    async function processEntry(entryPath) {
        try { // Outer try for fs.stat
            const stats = await fs.stat(entryPath);

            if (stats.isDirectory()) {
                console.log(`Main: Processing directory: ${entryPath}`);
                let dirents = [];
                try { // Inner try for fs.readdir
                    dirents = await fs.readdir(entryPath, { withFileTypes: true });
                } catch(readDirErr) {
                    console.error(`Main: Failed to read directory contents ${entryPath}:`, readDirErr);
                    // Optional: Add an error marker for this folder? Or just skip. Skip for now.
                    return; // Stop processing this directory if unreadable
                }
                // Use Promise.all to process directory contents concurrently (optional, but can speed up)
                await Promise.all(dirents.map(dirent => processEntry(nodePath.join(entryPath, dirent.name))));

            } else if (stats.isFile()) {
                const ext = nodePath.extname(entryPath).toLowerCase();
                if (validExtensions.includes(ext)) {
                    console.log(`Main: Reading valid file: ${entryPath}`);
                    try { // Inner try for fs.readFile
                        const buffer = await fs.readFile(entryPath);
                        let content;
                        let type = 'text';

                        if (ext === '.pdf') {
                            type = 'pdf';
                            content = buffer.toString('base64');
                        } else {
                           content = buffer.toString('utf-8');
                           if (ext === '.rtf') type = 'rtf';
                        }

                        validFilesData.push({
                            id: entryPath, path: entryPath, name: nodePath.basename(entryPath),
                            rawContent: content, contentType: (ext === '.pdf' ? 'base64' : 'text'),
                            size: stats.size, type: type, tokenCount: 0,
                        });
                    } catch (readErr) { // Catch for fs.readFile
                        console.error(`Main: Failed to read file ${entryPath}:`, readErr);
                    }
                } // else { console.log(`Main: Skipping file with invalid extension: ${entryPath}`); }
            }
        } catch (statErr) { // Catch for fs.stat
            console.error(`Main: Failed to get stats for ${entryPath}:`, statErr);
        }
    } // End of processEntry function

    // Process all initial paths provided
    // Use Promise.all to run processing for multiple root paths concurrently
    await Promise.all(pathsToRead.map(p => processEntry(p)));

    console.log(`Main: Finished reading. Found ${validFilesData.length} valid files.`);
    return validFilesData;
} // *** End of readFilesRecursively function ***

// --- createWindow function --- (Remains async)
async function createWindow() {
    const isDevModule = await import('electron-is-dev');
    const isDev = isDevModule.default;
    console.log(`Electron Main Process: isDev = ${isDev}`);
    const win = new BrowserWindow({ width: 1200, height: 800, webPreferences: { preload: path.join(__dirname, 'preload.js') } });
    win.loadURL( isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}` );
    if (isDev) { win.webContents.openDevTools({ mode: 'detach' }); }
}

// --- IPC Handlers ---
ipcMain.handle('browse-directory', async (event, dirPath) => {
    const startPath = dirPath || app.getPath('home');
    console.log(`Main IPC: Handling 'browse-directory' for: ${startPath}`);
    try {
        const contents = await listDirectory(startPath);
        return { success: true, contents: contents };
    } catch (error) { // Catch errors rejected by listDirectory
        console.error("Main IPC: Error in 'browse-directory':", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-files-recursive', async (event, paths) => {
    console.log(`Main IPC: Handling 'read-files-recursive' for paths:`, paths);
    if (!Array.isArray(paths) || paths.length === 0) return { success: true, files: [] };
    try {
        const results = await readFilesRecursively(paths);
        return { success: true, files: results };
    } catch (error) { // Catch errors from readFilesRecursively if any bubble up unexpectedly
        console.error("Main IPC: Error in 'read-files-recursive':", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-api-key', async (event) => {
    if (!store) return { success: false, error: 'Storage not ready.' };
    try {
        const apiKey = store.get('geminiApiKey', '');
        console.log('Main IPC: Loaded API Key (length):', apiKey ? apiKey.length : 0);
        return { success: true, apiKey: apiKey };
    } catch (error) { console.error('Main IPC: Error loading API Key:', error); return { success: false, error: 'Failed to load API key.' }; }
});

ipcMain.handle('save-api-key', async (event, apiKey) => {
    if (!store) return { success: false, error: 'Storage not ready.' };
    try {
        store.set('geminiApiKey', apiKey);
        console.log('Main IPC: Saved API Key (length):', apiKey ? apiKey.length : 0);
        return { success: true };
    } catch (error) { console.error('Main IPC: Error saving API Key:', error); return { success: false, error: 'Failed to save API key.' }; }
});


// --- App Lifecycle ---
app.whenReady().then(async () => {
    try {
        console.log("Main: App ready, initializing electron-store...");
        const StoreModule = await import('electron-store');
        const Store = StoreModule.default;
        store = new Store();
        console.log("Main: Electron-store initialized successfully.");
        await createWindow(); // Create window only after store is ready
    } catch (err) {
        console.error("Main: FATAL - Failed to initialize electron-store:", err);
        dialog.showErrorBox("Application Error", "Failed to initialize storage.\nError: " + err.message);
        app.quit();
    }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && store) { createWindow(); } else if (!store) { console.error("Main: Cannot activate window, store failed."); } });