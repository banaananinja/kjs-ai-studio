// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
// const isDev = require('electron-is-dev'); // REMOVE this CommonJS require
const fs = require('fs').promises; // Use promises version of fs
const nodePath = require('path'); // Use nodePath to avoid conflict with browser path

// --- Node.js File System Functions --- (Keep as is)
async function listDirectory(dirPath) {
    try {
        const dirents = await fs.readdir(dirPath, { withFileTypes: true });
        return dirents.map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            path: nodePath.join(dirPath, dirent.name)
        }));
    } catch (err) {
        console.error(`Error reading directory ${dirPath}:`, err);
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            throw new Error(`Permission denied accessing: ${dirPath}`);
        }
        throw new Error(`Failed to read directory: ${dirPath}`);
    }
}

async function readFilesRecursively(paths) {
   console.log("Main Process: Received request to read paths:", paths);
   // TODO: Implement recursive reading logic later
   await new Promise(resolve => setTimeout(resolve, 100));
   console.log("Main Process: Recursive reading not fully implemented yet.");
   return [];
}
// --- End File System Functions ---


// --- Make createWindow async to allow top-level await for dynamic import ---
async function createWindow() {
    // *** Use dynamic import() for electron-is-dev ***
    const isDevModule = await import('electron-is-dev');
    const isDev = isDevModule.default; // ESM default export
    console.log(`Electron Main Process: isDev = ${isDev}`); // Log confirmation
    // *** End dynamic import change ***

    // Create the browser window.
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // Keep contextIsolation true (default and recommended)
            // Keep nodeIntegration false (default and recommended)
            preload: path.join(__dirname, 'preload.js'), // Point to preload script
        },
    });

    // Load the React app URL
    win.loadURL(
        isDev // Use the dynamically imported value
            ? 'http://localhost:3000' // Dev server URL
            : `file://${path.join(__dirname, '../build/index.html')}` // Production build path
    );

    // Open DevTools if in development mode
    if (isDev) { // Use the dynamically imported value
        win.webContents.openDevTools({ mode: 'detach' });
    }
}

// --- IPC Handlers --- (Keep as is)
ipcMain.handle('browse-directory', async (event, dirPath) => {
    console.log(`Main: Received browse-directory request for: ${dirPath}`);
    const startPath = dirPath || app.getPath('home');
    try {
        const contents = await listDirectory(startPath);
        return { success: true, contents: contents };
    } catch (error) {
        console.error("Error in browse-directory handler:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('read-files-recursive', async (event, paths) => {
    console.log(`Main: Received read-files-recursive request for paths:`, paths);
    try {
        const results = await readFilesRecursively(paths);
        return { success: true, files: results };
    } catch (error) {
        console.error("Error in read-files-recursive handler:", error);
        return { success: false, error: error.message };
    }
});

// --- App Lifecycle --- (Keep as is)
// app.whenReady().then(createWindow) still works because .then() handles the promise from async createWindow
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});