# KJ's AI Studio

Personal AI chat interface leveraging the power of Google Gemini models with local file context integration. Built with React and Electron.

## Features (Current - v0.5.1)

*   Chat interface powered by various Google Gemini models.
*   Adjustable parameters (Temperature, Top P, Output Length).
*   System instructions support.
*   Integrated File Browser:
    *   Navigate local file system.
    *   Select individual files or entire folders (including subfolders recursively).
    *   Supports `.txt`, `.pdf`, and `.rtf` files.
    *   Selected file contents are added to the context sent with prompts.
*   Token counting for conversation and loaded files relative to model limits.
*   Message management: Edit, Regenerate, Delete, Copy.
*   Debug panel for viewing API interactions and logs.
*   Persistent API Key storage via Settings panel.
*   Expandable/Collapsable right sidebar.

## Development

1.  **Prerequisites:** Node.js and npm installed.
2.  **Clone:** Clone this repository.
3.  **Install Dependencies:** `npm install`
4.  **API Key:** Create a `.env` file in the root (optional for dev if using Settings) OR go to the in-app Settings page to add your Google AI Studio API key.
5.  **Run Development:** `npm run electron-dev`

## Build

To create distributable installers/packages:

```bash
npm run electron-build

(Run terminal as Administrator on Windows if you encounter build errors related to symbolic links). Output will be in the dist folder.

## TODO / Future Ideas
Implement Auto-Update functionality.
Add "Library" section features (e.g., saving prompts/conversations).
Improve File Browser UI/UX.
Consider Image Recognition support.
Add more robust error handling and user feedback.