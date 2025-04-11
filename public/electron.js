// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const nodePath = require('path');
// Note: We still need the dynamic import for electron-store

let store; // Declare store in module scope

// --- Node.js File System Functions --- (Should be correct from previous step)
async function listDirectory(dirPath) { /* ... */ try{const t=await fs.readdir(dirPath,{withFileTypes:!0});return console.log(`Main: Listed ${t.length} items in ${dirPath}`),t.map(t=>({name:t.name,isDirectory:t.isDirectory(),path:nodePath.join(dirPath,t.name)}))}catch(t){return console.error(`Error reading directory ${dirPath}: Code=${t.code}, Message=${t.message}`),Promise.reject(new Error(t.code==="EPERM"||t.code==="EACCES"?`Permission denied: ${nodePath.basename(dirPath)}`:t.code==="ENOENT"?`Not found: ${nodePath.basename(dirPath)}`:`Failed to read: ${nodePath.basename(dirPath)}`))} }
async function readFilesRecursively(pathsToRead) { /* ... */ console.log(`Main: readFilesRecursively called with:`,pathsToRead);let t=[];const e=[".txt",".pdf",".rtf"];async function r(o){try{const s=await fs.stat(o);if(s.isDirectory()){console.log(`Main: Processing directory: ${o}`);let i=[];try{i=await fs.readdir(o,{withFileTypes:!0})}catch(n){console.error(`Main: Failed directory contents ${o}:`,n);return}await Promise.all(i.map(n=>r(nodePath.join(o,n.name))))}else if(s.isFile()){const i=nodePath.extname(o).toLowerCase();if(e.includes(i)){console.log(`Main: Reading valid file: ${o}`);try{const n=await fs.readFile(o);let a,l="text";i===".pdf"?(l="pdf",a=n.toString("base64")):i===".rtf"?(l="rtf",a=n.toString("utf-8")):(l="text",a=n.toString("utf-8")),t.push({id:o,path:o,name:nodePath.basename(o),rawContent:a,contentType:i===".pdf"?"base64":"text",size:s.size,type:l,tokenCount:0})}catch(n){console.error(`Main: Failed to read file ${o}:`,n)}}}}catch(s){console.error(`Main: Failed stats for ${o}:`,s)}}await Promise.all(pathsToRead.map(o=>r(o)));return console.log(`Main: Finished reading. Found ${t.length} valid files.`),t }

// --- createWindow function --- (Should be correct)
async function createWindow() { /* ... */ const isDevModule=await import("electron-is-dev");const isDev=isDevModule.default;console.log(`Electron Main Process: isDev = ${isDev}`);const iconPath=path.join(__dirname,"KJ_AI_SMALL-v2.png");console.log("Icon path:",iconPath);const win=new BrowserWindow({width:1200,height:800,title:"KJ's AI Studio",icon:iconPath,webPreferences:{preload:path.join(__dirname,"preload.js")}});win.removeMenu();win.loadURL(isDev?"http://localhost:3000":`file://${path.join(__dirname,"../build/index.html")}`);if(isDev)win.webContents.openDevTools({mode:"detach"}) }

// --- IPC Handlers with Return Logging ---
ipcMain.handle('browse-directory', async (event, dirPath) => {
    const startPath = dirPath || app.getPath('home');
    console.log(`Main IPC: Handling 'browse-directory' for: ${startPath}`);
    try {
        const contents = await listDirectory(startPath);
        const result = { success: true, contents: contents };
        console.log("Main IPC: 'browse-directory' returning success:", result); // Log success return
        return result;
    } catch (error) {
        console.error("Main IPC: Error in 'browse-directory':", error);
        const result = { success: false, error: error.message };
        console.log("Main IPC: 'browse-directory' returning error:", result); // Log error return
        return result; // Ensure error object is returned
    }
});

ipcMain.handle('read-files-recursive', async (event, paths) => {
    console.log(`Main IPC: Handling 'read-files-recursive' for paths:`, paths);
    if (!Array.isArray(paths) || paths.length === 0) {
        console.log("Main IPC: 'read-files-recursive' returning empty success (no paths).");
        return { success: true, files: [] };
    }
    try {
        const results = await readFilesRecursively(paths);
        const result = { success: true, files: results };
        console.log("Main IPC: 'read-files-recursive' returning success:", { success: true, fileCount: results.length }); // Log success return (don't log all file data)
        return result;
    } catch (error) {
        console.error("Main IPC: Error in 'read-files-recursive':", error);
        const result = { success: false, error: error.message };
        console.log("Main IPC: 'read-files-recursive' returning error:", result); // Log error return
        return result; // Ensure error object is returned
    }
});

ipcMain.handle('load-api-key', async (event) => {
    console.log("Main IPC: Handling 'load-api-key'."); // Log entry
    if (!store) {
        console.error('Main IPC: Store not initialized for load-api-key.');
        const result = { success: false, error: 'Storage not ready.' };
        console.log("Main IPC: 'load-api-key' returning error:", result);
        return result;
    }
    try {
        const apiKey = store.get('geminiApiKey', '');
        console.log('Main IPC: Loaded API Key (length):', apiKey ? apiKey.length : 0);
        const result = { success: true, apiKey: apiKey };
        console.log("Main IPC: 'load-api-key' returning success."); // Log success return
        return result;
    } catch (error) {
        console.error('Main IPC: Error loading API Key:', error);
        const result = { success: false, error: 'Failed to load API key.' };
        console.log("Main IPC: 'load-api-key' returning error:", result); // Log error return
        return result;
    }
});

ipcMain.handle('save-api-key', async (event, apiKey) => {
    console.log("Main IPC: Handling 'save-api-key'."); // Log entry
    if (!store) {
         console.error('Main IPC: Store not initialized for save-api-key.');
         const result = { success: false, error: 'Storage not ready.' };
         console.log("Main IPC: 'save-api-key' returning error:", result);
         return result;
    }
    try {
        store.set('geminiApiKey', apiKey);
        console.log('Main IPC: Saved API Key (length):', apiKey ? apiKey.length : 0);
        const result = { success: true };
        console.log("Main IPC: 'save-api-key' returning success."); // Log success return
        return result;
    } catch (error) {
        console.error('Main IPC: Error saving API Key:', error);
        const result = { success: false, error: 'Failed to save API key.' };
        console.log("Main IPC: 'save-api-key' returning error:", result); // Log error return
        return result;
    }
});


// --- App Lifecycle --- (Should be correct)
app.whenReady().then(async () => {
    try {
        console.log("Main: App ready, initializing electron-store...");
        const StoreModule = await import('electron-store');
        const Store = StoreModule.default;
        store = new Store();
        console.log("Main: Electron-store initialized successfully.");
        await createWindow();
    } catch (err) {
        console.error("Main: FATAL - Failed to initialize electron-store:", err);
        dialog.showErrorBox("Application Error", "Failed to initialize storage.\nError: " + err.message);
        app.quit();
    }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && store) { createWindow(); } else if (!store) { console.error("Main: Cannot activate window, store failed."); } });