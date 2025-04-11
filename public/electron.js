// public/electron.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises; // Use promises version of fs
const nodePath = require('path'); // Alias to avoid conflict

// --- Node.js File System Functions ---

// Function to list directory contents (Improved Error Handling)
async function listDirectory(dirPath) {
    console.log(`Attempting to read directory: ${dirPath}`); // Log path
    try {
        const dirents = await fs.readdir(dirPath, { withFileTypes: true });
        const items = dirents.map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
            path: nodePath.join(dirPath, dirent.name) // Use nodePath
        }));
        console.log(`Successfully listed ${items.length} items in ${dirPath}`);
        return items;
    } catch (err) {
        console.error(`Error reading directory ${dirPath}: Code=${err.code}, Message=${err.message}`);
        if (err.code === 'EPERM' || err.code === 'EACCES') {
            throw new Error(`Permission denied accessing folder: ${nodePath.basename(dirPath)}`); // More user-friendly
        } else if (err.code === 'ENOENT') {
            throw new Error(`Folder not found: ${nodePath.basename(dirPath)}`);
        }
        throw new Error(`Failed to read folder: ${nodePath.basename(dirPath)}`);
    }
}

// Function to recursively read VALID files from given paths (files or folders)
async function readFilesRecursively(pathsToRead) {
    console.log(`Main: readFilesRecursively called with:`, pathsToRead);
    let validFilesData = [];
    const validExtensions = ['.txt', '.pdf', '.rtf'];

    // Helper function to process a single entry (file or directory)
    async function processEntry(entryPath) {
        try {
            const stats = await fs.stat(entryPath);

            if (stats.isDirectory()) {
                // If it's a directory, read its contents and process them recursively
                console.log(`Main: Processing directory: ${entryPath}`);
                const dirents = await fs.readdir(entryPath, { withFileTypes: true });
                for (const dirent of dirents) {
                    await processEntry(nodePath.join(entryPath, dirent.name)); // Recurse
                }
            } else if (stats.isFile()) {
                // If it's a file, check the extension
                const ext = nodePath.extname(entryPath).toLowerCase();
                if (validExtensions.includes(ext)) {
                    console.log(`Main: Reading valid file: ${entryPath}`);
                    try {
                        // Read raw content as a buffer initially
                        const buffer = await fs.readFile(entryPath);
                        let content;
                        let type = 'text'; // Default

                        // Determine type and how to send content
                        if (ext === '.pdf') {
                            type = 'pdf';
                            // Send PDF as base64 for renderer to handle with pdfjs
                            content = buffer.toString('base64');
                        } else {
                           // For txt and rtf, send as UTF-8 string
                           // RTF will be parsed later in the renderer
                           content = buffer.toString('utf-8');
                           if (ext === '.rtf') type = 'rtf';
                        }

                        validFilesData.push({
                            id: entryPath, // Use path as unique ID for now
                            path: entryPath,
                            name: nodePath.basename(entryPath),
                            // Send raw content (string or base64) - parsing happens in Renderer
                            rawContent: content, // Use a different key to avoid confusion
                            contentType: (ext === '.pdf' ? 'base64' : 'text'), // Indicate content type
                            size: stats.size,
                            type: type, // txt, pdf, rtf
                            // Placeholder for token count - will be calculated in Renderer
                            tokenCount: 0,
                        });
                    } catch (readErr) {
                        console.error(`Main: Failed to read file ${entryPath}:`, readErr);
                        // Optionally add an error entry to the results?
                        // validFilesData.push({ path: entryPath, name: nodePath.basename(entryPath), error: `Failed to read: ${readErr.message}` });
                    }
                } else {
                   // console.log(`Main: Skipping file with invalid extension: ${entryPath}`);
                }
            }
        } catch (statErr) {
            console.error(`Main: Failed to get stats for ${entryPath}:`, statErr);
             // Optionally add an error entry if stats fail (e.g., permission denied on file)
             // validFilesData.push({ path: entryPath, name: nodePath.basename(entryPath), error: `Failed to access: ${statErr.message}` });
        }
    }

    // Process all initial paths provided
    for (const p of pathsToRead) {
        await processEntry(p);
    }

    console.log(`Main: Finished reading. Found ${validFilesData.length} valid files.`);
    return validFilesData; // Return array of file data objects
}
// --- End File System Functions ---


// --- createWindow function (Ensure dynamic import for isDev is still here) ---
async function createWindow() {
    const isDevModule = await import('electron-is-dev');
    const isDev = isDevModule.default;
    console.log(`Electron Main Process: isDev = ${isDev}`);

    const win = new BrowserWindow({ /* ... window options ... */
        width: 1200, height: 800, webPreferences: { preload: path.join(__dirname, 'preload.js') },
    });

    win.loadURL( isDev ? 'http://localhost:3000' : `file://${path.join(__dirname, '../build/index.html')}` );
    if (isDev) { win.webContents.openDevTools({ mode: 'detach' }); }
}

// --- IPC Handlers --- (Mostly the same, just logging updates)
ipcMain.handle('browse-directory', async (event, dirPath) => {
    const startPath = dirPath || app.getPath('home'); // Use home dir if no path given
    console.log(`Main IPC: Handling 'browse-directory' for: ${startPath}`);
    try {
        const contents = await listDirectory(startPath);
        return { success: true, contents: contents };
    } catch (error) {
        console.error("Main IPC: Error in 'browse-directory':", error);
        return { success: false, error: error.message }; // Send error message back
    }
});

ipcMain.handle('read-files-recursive', async (event, paths) => {
    console.log(`Main IPC: Handling 'read-files-recursive' for paths:`, paths);
    if (!Array.isArray(paths) || paths.length === 0) {
        return { success: true, files: [] }; // Return empty if no paths
    }
    try {
        const results = await readFilesRecursively(paths);
        return { success: true, files: results };
    } catch (error) {
        console.error("Main IPC: Error in 'read-files-recursive':", error);
        return { success: false, error: error.message }; // Send error message back
    }
});

// --- App Lifecycle --- (Keep as is)
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });