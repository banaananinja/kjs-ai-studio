// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const nodePath = require('path');
const log = require('electron-log'); // Optional logging
// Note: Store is dynamically imported later

let store;

log.transports.file.level = 'info';
log.transports.console.level = 'info';
log.info('App starting...');

// --- Node.js File System Functions ---
async function listDirectory(dirPath) { /* ... */ try{const t=await fs.readdir(dirPath,{withFileTypes:!0});return console.log(`Main: Listed ${t.length} items in ${dirPath}`),t.map(t=>({name:t.name,isDirectory:t.isDirectory(),path:nodePath.join(dirPath,t.name)}))}catch(t){return console.error(`Error reading directory ${dirPath}: Code=${t.code}, Message=${t.message}`),Promise.reject(new Error(t.code==="EPERM"||t.code==="EACCES"?`Permission denied: ${nodePath.basename(dirPath)}`:t.code==="ENOENT"?`Not found: ${nodePath.basename(dirPath)}`:`Failed to read: ${nodePath.basename(dirPath)}`))} }
async function readFilesRecursively(pathsToRead) { /* ... */ console.log(`Main: readFilesRecursively called with:`,pathsToRead);let t=[];const e=[".txt",".pdf",".rtf"];async function r(o){try{const s=await fs.stat(o);if(s.isDirectory()){console.log(`Main: Processing directory: ${o}`);let i=[];try{i=await fs.readdir(o,{withFileTypes:!0})}catch(n){console.error(`Main: Failed directory contents ${o}:`,n);return}await Promise.all(i.map(n=>r(nodePath.join(o,n.name))))}else if(s.isFile()){const i=nodePath.extname(o).toLowerCase();if(e.includes(i)){console.log(`Main: Reading valid file: ${o}`);try{const n=await fs.readFile(o);let a,l="text";i===".pdf"?(l="pdf",a=n.toString("base64")):i===".rtf"?(l="rtf",a=n.toString("utf-8")):(l="text",a=n.toString("utf-8")),t.push({id:o,path:o,name:nodePath.basename(o),rawContent:a,contentType:i===".pdf"?"base64":"text",size:s.size,type:l,tokenCount:0})}catch(n){console.error(`Main: Failed to read file ${o}:`,n)}}}}catch(s){console.error(`Main: Failed stats for ${o}:`,s)}}await Promise.all(pathsToRead.map(o=>r(o)));return console.log(`Main: Finished reading. Found ${t.length} valid files.`),t }

// --- createWindow function ---
async function createWindow() {
    const isDevModule = await import('electron-is-dev');
    const isDev = isDevModule.default;
    log.info(`Electron Main Process: isDev = ${isDev}`);
    const iconPath = path.join(__dirname, 'KJ_AI_SMALL-v2.png');
    log.info("Icon path:", iconPath);
    const win = new BrowserWindow({
        width: 1200, height: 800,
        title: "KJ's AI Studio", // Keep title
        icon: iconPath,
        webPreferences: { preload: path.join(__dirname, 'preload.js') },
    });
    win.removeMenu();
    win.loadURL( isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}` );
    if (isDev) { win.webContents.openDevTools({ mode: 'detach' }); }
    // No update check here yet, we'll add it after this step
}

// --- IPC Handlers ---
ipcMain.handle('browse-directory', async (event, dirPath) => { const startPath=dirPath||app.getPath("home");log.info(`Main IPC: Handling 'browse-directory' for: ${startPath}`);try{const t=await listDirectory(startPath);return log.info("Main IPC: 'browse-directory' returning success:",{success:!0}),{success:!0,contents:t}}catch(t){return log.error("Main IPC: Error in 'browse-directory':",t),log.info("Main IPC: 'browse-directory' returning error:",{success:!1,error:t.message}),{success:!1,error:t.message}} });
ipcMain.handle('read-files-recursive', async (event, paths) => { log.info(`Main IPC: Handling 'read-files-recursive' for paths:`,paths);if(!Array.isArray(paths)||paths.length===0)return log.info("Main IPC: 'read-files-recursive' returning empty success."),{success:!0,files:[]};try{const t=await readFilesRecursively(paths);return log.info("Main IPC: 'read-files-recursive' returning success:",{success:!0,fileCount:t.length}),{success:!0,files:t}}catch(t){return log.error("Main IPC: Error in 'read-files-recursive':",t),log.info("Main IPC: 'read-files-recursive' returning error:",{success:!1,error:t.message}),{success:!1,error:t.message}} });
ipcMain.handle('load-api-key', async (event) => { log.info("Main IPC: Handling 'load-api-key'.");if(!store)return log.error("Main IPC: Store not initialized for load."),log.info("Main IPC: 'load-api-key' returning error (store init)"),{success:!1,error:"Storage not ready."};try{const t=store.get("geminiApiKey","");return log.info("Main IPC: Loaded API Key (length):",t?t.length:0),log.info("Main IPC: 'load-api-key' returning success."),{success:!0,apiKey:t}}catch(t){return log.error("Main IPC: Error loading API Key:",t),log.info("Main IPC: 'load-api-key' returning error:",{success:!1,error:"Failed load"}),{success:!1,error:"Failed to load API key."}} });
ipcMain.handle('save-api-key', async (event, apiKey) => { log.info("Main IPC: Handling 'save-api-key'.");if(!store)return log.error("Main IPC: Store not initialized for save."),log.info("Main IPC: 'save-api-key' returning error (store init)"),{success:!1,error:"Storage not ready."};try{return store.set("geminiApiKey",apiKey),log.info("Main IPC: Saved API Key (length):",apiKey?apiKey.length:0),log.info("Main IPC: 'save-api-key' returning success."),{success:!0}}catch(t){return log.error("Main IPC: Error saving API Key:",t),log.info("Main IPC: 'save-api-key' returning error:",{success:!1,error:"Failed save"}),{success:!1,error:"Failed to save API key."}} });

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