// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const nodePath = require('path');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');

let store;

// --- Configure electron-log & AutoUpdater ---
log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('App starting...');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.on('checking-for-update', () => { log.info('Updater: Checking...'); });
autoUpdater.on('update-available', (info) => { log.info('Updater: Update available.', info); });
autoUpdater.on('update-not-available', (info) => { log.info('Updater: No update.', info); });
autoUpdater.on('error', (err) => { log.error('Updater: Error: ' + err); });
autoUpdater.on('download-progress', (p) => { log.info(`Updater: Download ${p.percent}%`); });
autoUpdater.on('update-downloaded', (info) => { log.info('Updater: Downloaded.', info); });

// --- Node.js File System Functions --- (Keep as is)
async function listDirectory(dirPath) { try{const t=await fs.readdir(dirPath,{withFileTypes:!0});return log.info(`Main FS: Listed ${t.length} items in ${dirPath}`),t.map(t=>({name:t.name,isDirectory:t.isDirectory(),path:nodePath.join(dirPath,t.name)}))}catch(t){return log.error(`Main FS: Error reading dir ${dirPath}: ${t.message}`),Promise.reject(new Error(t.code==="EPERM"||t.code==="EACCES"?`Permission denied: ${nodePath.basename(dirPath)}`:t.code==="ENOENT"?`Not found: ${nodePath.basename(dirPath)}`:`Failed to read: ${nodePath.basename(dirPath)}`))} }
async function readFilesRecursively(pathsToRead) { log.info(`Main FS: readFilesRecursively called with:`,pathsToRead);let t=[];const e=[".txt",".pdf",".rtf"];async function r(o){try{const s=await fs.stat(o);if(s.isDirectory()){log.info(`Main FS: Processing dir: ${o}`);let i=[];try{i=await fs.readdir(o,{withFileTypes:!0})}catch(n){log.error(`Main FS: Failed dir contents ${o}:`,n);return}await Promise.all(i.map(n=>r(nodePath.join(o,n.name))))}else if(s.isFile()){const i=nodePath.extname(o).toLowerCase();if(e.includes(i)){log.info(`Main FS: Reading valid file: ${o}`);try{const n=await fs.readFile(o);let a,l="text";i===".pdf"?(l="pdf",a=n.toString("base64")):i===".rtf"?(l="rtf",a=n.toString("utf-8")):(l="text",a=n.toString("utf-8")),t.push({id:o,path:o,name:nodePath.basename(o),rawContent:a,contentType:i===".pdf"?"base64":"text",size:s.size,type:l,tokenCount:0})}catch(n){log.error(`Main FS: Failed to read file ${o}:`,n)}}}}catch(s){log.error(`Main FS: Failed stats for ${o}:`,s)}}await Promise.all(pathsToRead.map(o=>r(o)));return log.info(`Main FS: Finished reading. Found ${t.length} valid files.`),t }

// --- createWindow function --- (Keep as is)
async function createWindow() { /* ... */ const isDevModule=await import("electron-is-dev");const isDev=isDevModule.default;log.info(`Electron Main Process: isDev = ${isDev}`);const iconPath=path.join(__dirname,"KJ_AI_SMALL-v2.png");log.info("Icon path:",iconPath);const win=new BrowserWindow({width:1200,height:800,title:"KJ's AI Studio",icon:iconPath,webPreferences:{preload:path.join(__dirname,"preload.js")}});win.removeMenu();win.loadURL(isDev?"http://localhost:3000":`file://${path.join(__dirname,"../build/index.html")}`);if(isDev)win.webContents.openDevTools({mode:"detach"});win.webContents.once("did-finish-load",()=>{log.info("Main: Window loaded. Checking updates...");if(!isDev){autoUpdater.checkForUpdatesAndNotify();log.info("Updater: Check initiated.")}else log.info("Updater: Skipping check in dev.")})}

// --- IPC Handlers with Explicit Return Logging ---
ipcMain.handle('browse-directory', async (event, dirPath) => {
    const startPath = dirPath || app.getPath('home');
    log.info(`Main IPC: Handling 'browse-directory' for: ${startPath}`);
    try {
        const contents = await listDirectory(startPath);
        const result = { success: true, contents: contents };
        log.info("Main IPC: 'browse-directory' TRYING TO RETURN (Success):", result); // Log return
        return result;
    } catch (error) {
        log.error("Main IPC: Error caught in 'browse-directory':", error);
        const result = { success: false, error: error.message };
        log.info("Main IPC: 'browse-directory' TRYING TO RETURN (Error):", result); // Log return
        return result;
    }
});

ipcMain.handle('read-files-recursive', async (event, paths) => {
    log.info(`Main IPC: Handling 'read-files-recursive' for paths:`, paths);
    if (!Array.isArray(paths) || paths.length === 0) {
        log.info("Main IPC: 'read-files-recursive' returning empty success (no paths).");
        return { success: true, files: [] }; // Ensure return
    }
    try {
        const filesData = await readFilesRecursively(paths);
        const result = { success: true, files: filesData };
        log.info("Main IPC: 'read-files-recursive' TRYING TO RETURN (Success):", { success: true, fileCount: filesData.length });
        return result;
    } catch (error) {
        log.error("Main IPC: Error caught in 'read-files-recursive':", error);
        const result = { success: false, error: error.message };
        log.info("Main IPC: 'read-files-recursive' TRYING TO RETURN (Error):", result);
        return result;
    }
});

ipcMain.handle('load-api-key', async (event) => {
    log.info("Main IPC: Handling 'load-api-key'.");
    if (!store) {
        log.error('Main IPC: Store not initialized for load-api-key.');
        const result = { success: false, error: 'Storage not ready.' };
        log.info("Main IPC: 'load-api-key' TRYING TO RETURN (Error - Store Init):", result);
        return result;
    }
    try {
        const apiKey = store.get('geminiApiKey', '');
        log.info('Main IPC: Loaded API Key (length):', apiKey ? apiKey.length : 0);
        const result = { success: true, apiKey: apiKey };
        log.info("Main IPC: 'load-api-key' TRYING TO RETURN (Success):", result);
        return result;
    } catch (error) {
        log.error('Main IPC: Error loading API Key:', error);
        const result = { success: false, error: 'Failed to load API key.' };
        log.info("Main IPC: 'load-api-key' TRYING TO RETURN (Error):", result);
        return result;
    }
});

ipcMain.handle('save-api-key', async (event, apiKey) => {
    log.info("Main IPC: Handling 'save-api-key'.");
    if (!store) {
         log.error('Main IPC: Store not initialized for save-api-key.');
         const result = { success: false, error: 'Storage not ready.' };
         log.info("Main IPC: 'save-api-key' TRYING TO RETURN (Error - Store Init):", result);
         return result;
    }
    try {
        store.set('geminiApiKey', apiKey);
        log.info('Main IPC: Saved API Key (length):', apiKey ? apiKey.length : 0);
        const result = { success: true };
        log.info("Main IPC: 'save-api-key' TRYING TO RETURN (Success):", result);
        return result;
    } catch (error) {
        log.error('Main IPC: Error saving API Key:', error);
        const result = { success: false, error: 'Failed to save API key.' };
        log.info("Main IPC: 'save-api-key' TRYING TO RETURN (Error):", result);
        return result;
    }
});


// --- App Lifecycle ---
app.whenReady().then(async () => {
    try {
        log.info("Main: App ready, initializing electron-store...");
        const StoreModule = await import('electron-store');
        const Store = StoreModule.default;
        store = new Store();
        log.info("Main: Electron-store initialized successfully.");
        await createWindow();
    } catch (err) {
        log.error("Main: FATAL - Failed to initialize electron-store:", err);
        dialog.showErrorBox("Application Error", "Failed to initialize storage.\nError: " + err.message);
        app.quit();
    }
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') { log.info("Main: All windows closed, quitting."); app.quit(); } });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0 && store) { log.info("Main: Activating window."); createWindow(); } else if (!store) { log.error("Main: Cannot activate, store failed."); } });