// src/components/SettingsView.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './SettingsView.css';

function SettingsView() {
    const [apiKey, setApiKey] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('');
    const [isMasked, setIsMasked] = useState(true);

    // Load existing key when component mounts
    useEffect(() => {
        const loadKey = async () => {
            setIsLoading(true);
            setStatusMessage('');
            try {
                const result = await window.electronAPI.loadApiKey();
                if (result.success) {
                    setApiKey(result.apiKey || '');
                } else {
                    setStatusMessage(`Error loading key: ${result.error}`);
                }
            } catch (error) {
                setStatusMessage(`IPC Error loading key: ${error.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        loadKey();
    }, []);

    const handleSave = useCallback(async () => {
        setIsLoading(true);
        setStatusMessage('Saving...');
        try {
            const result = await window.electronAPI.saveApiKey(apiKey);
            if (result.success) {
                setStatusMessage('API Key saved successfully!');
            } else {
                setStatusMessage(`Error saving key: ${result.error}`);
            }
        } catch (error) {
            setStatusMessage(`IPC Error saving key: ${error.message}`);
        } finally {
            setIsLoading(false);
            // Clear success message after a delay
            setTimeout(() => setStatusMessage(prev => prev === 'API Key saved successfully!' ? '' : prev), 3000);
        }
    }, [apiKey]);

    const toggleMask = () => {
      setIsMasked(prev => !prev);
    }

    return (
        <div className="settings-view">
            <h2>Settings</h2>
            <div className="setting-item">
                <label htmlFor="api-key-input">Gemini API Key:</label>
                <div className="api-key-input-wrapper">
                   <input
                        type={isMasked ? "password" : "text"}
                        id="api-key-input"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your Google AI Studio API Key"
                        className="api-key-input"
                        disabled={isLoading}
                    />
                    <button onClick={toggleMask} className="mask-toggle-button" title={isMasked ? "Show Key" : "Hide Key"}>
                      {isMasked ? '👁️' : '🙈'}
                    </button>
                </div>

                <button onClick={handleSave} disabled={isLoading} className="save-button">
                    {isLoading ? 'Saving...' : 'Save API Key'}
                </button>
                {statusMessage && <p className={`status-message ${statusMessage.startsWith('Error') ? 'error' : 'success'}`}>{statusMessage}</p>}
                <p className="api-key-help">
                    You can get an API key from Google AI Studio. The key will be stored securely on your local machine.
                </p>
            </div>

            {/* Add more settings here later */}
        </div>
    );
}

export default SettingsView;