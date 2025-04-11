// src/components/FileBrowser.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './FileBrowser.css';

// BrowserItem component
function BrowserItem({ item, level = 0, selectedPaths, ancestorPaths, onSelectionChange, onExpand, parentIsSelected = false }) {
    const isDirectlySelected = !!selectedPaths[item.path];
    const isEffectivelySelected = isDirectlySelected || parentIsSelected;
    const isImplicitlySelected = parentIsSelected && !isDirectlySelected;
    // Check if this folder contains a selection (directly or indirectly)
    const containsSelection = !!ancestorPaths[item.path]; // Check if it's an ancestor of a selected item

    const indent = level * 20;
    const handleCheckboxChange = (event) => { onSelectionChange(item.path, event.target.checked); };
    const handleToggleExpand = (event) => { if (event.target.type !== 'checkbox') { onExpand(item); } };

    return (
        // Apply 'contains-selection' if it's an ancestor, regardless of expansion state
        // Apply 'implicitly-selected' if parent is selected but this isn't directly
        <div className={`browser-item ${item.isDirectory ? 'folder' : 'file'} ${isImplicitlySelected ? 'implicitly-selected' : ''} ${containsSelection ? 'contains-selection' : ''}`}>
            <div className="item-content" style={{ paddingLeft: `${indent}px` }}>
                {item.isDirectory && (<span className="expander" onClick={handleToggleExpand}>{item.isExpanded ? '▼' : '►'}</span>)}
                <input
                    type="checkbox" id={`cb-${item.path}`}
                    checked={isDirectlySelected} // Checkbox state reflects only direct selection
                    onChange={handleCheckboxChange} className="item-checkbox"
                />
                <label htmlFor={`cb-${item.path}`} className="item-label" onClick={item.isDirectory ? handleToggleExpand : undefined}>
                   <span className="item-icon">{item.isDirectory ? '📁' : '📄'}</span>
                   <span className="item-name" title={item.path}>{item.name}</span>
                   {/* Render asterisk if it contains a selection, regardless of expansion */}
                   {containsSelection && <span className="contains-indicator"> *</span>}
                </label>
            </div>
            {item.isDirectory && item.isExpanded && item.children && (
                <div className="item-children">
                    {item.children.length === 0 && <div className="empty-folder" style={{ paddingLeft: `${indent + 20}px` }}> (empty)</div>}
                    {item.children.map(child => (
                        <BrowserItem
                            key={child.path} item={child} level={level + 1}
                            selectedPaths={selectedPaths} ancestorPaths={ancestorPaths}
                            onSelectionChange={onSelectionChange} onExpand={onExpand}
                            parentIsSelected={isEffectivelySelected} // Pass down effective selection
                        />
                     ))}
                </div>
            )}
        </div>
    );
}


// Main File Browser component
function FileBrowser({ initialPath = '', selectedPaths = {}, ancestorPaths = {}, onSelectedPathsChange }) {
    const [currentRootItems, setCurrentRootItems] = useState([]);
    // Simplified display path - could potentially get this from electron main process later
    const [currentDisplayPath, setCurrentDisplayPath] = useState('File Browser'); // Static title now
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // --- REMOVED getParentPath ---
    // --- REMOVED goUp ---

    // Helper to update children (remains the same)
    const updateItemChildren = (currentItems, targetPath, newChildren, expand) => { return currentItems.map(item => { if (item.path === targetPath) return { ...item, children: newChildren, isExpanded: expand }; if (item.isDirectory && item.children) return { ...item, children: updateItemChildren(item.children, targetPath, newChildren, expand) }; return item; }); };

    // Function to load directory contents (remains mostly the same)
    const loadDirectory = useCallback(async (dirPath, targetItem = null) => {
        setLoading(true); setError(null);
        // Request home directory if dirPath is empty or undefined
        const actualPath = dirPath === undefined || dirPath === null ? '' : dirPath;
        console.log(`FileBrowser: Requesting directory - '${actualPath}' (Empty means Home)`);
        try {
            const result = await window.electronAPI.browseDirectory(actualPath);
            if (result.success) {
                const fetchedItems = result.contents .map(item => ({ ...item, isExpanded: false, children: null })).sort((a, b) => { if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1; return a.name.localeCompare(b.name); });
                if (targetItem) { setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, fetchedItems, true)); }
                else {
                    setCurrentRootItems(fetchedItems);
                    // Update display path more reliably - maybe main process returns it?
                    // For now, just use a generic title or keep initialPath if provided
                    setCurrentDisplayPath(dirPath || 'Home'); // Display Home if initial load was empty path
                }
            } else { setError(result.error || "Failed..."); if (targetItem) setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, [], false)); else setCurrentRootItems([]); }
        } catch (apiError) { setError(apiError.message || "Error..."); if (targetItem) setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, [], false)); else setCurrentRootItems([]); }
        finally { setLoading(false); }
    }, []); // Removed updateItemChildren dependency

    // Initial load
    useEffect(() => { loadDirectory(initialPath); }, [initialPath, loadDirectory]);

    // Handler for expanding/collapsing folders (remains the same)
    const handleExpand = useCallback((item) => { if (!item.isDirectory) return; setCurrentRootItems(prevItems => { const toggleRecursively = (nodes, targetPath) => nodes.map(node => { if (node.path === targetPath) { const needsLoad = !node.isExpanded && node.children === null; if (needsLoad) loadDirectory(node.path, node); return { ...node, isExpanded: needsLoad ? true : !node.isExpanded }; } if (node.isDirectory && node.children) return { ...node, children: toggleRecursively(node.children, targetPath) }; return node; }); return toggleRecursively(prevItems, item.path); }); }, [loadDirectory]);

    // Handler for checkbox changes (remains the same)
    const handleSelectionChange = useCallback((path, isChecked) => { onSelectedPathsChange(path, isChecked); }, [onSelectedPathsChange]);

    return (
        <div className="file-browser">
            <div className="browser-header">
                 {/* --- REMOVED Up Button --- */}
                <span className="current-path" title={currentDisplayPath}>
                     {currentDisplayPath} {/* Show the determined path */}
                 </span>
            </div>
            {loading && <div className="loading-indicator">Loading...</div>}
            {error && <div className="error-message">{error}</div>}
            <div className="browser-tree">
                {currentRootItems.length === 0 && !loading && !error && <div className="empty-folder">(Directory empty or loading failed)</div>}
                {/* Pass ancestorPaths down */}
                {currentRootItems.map(item => (
                   <BrowserItem
                       key={item.path} item={item} level={0} // Start level at 0
                       selectedPaths={selectedPaths}
                       ancestorPaths={ancestorPaths} // Pass down
                       onSelectionChange={handleSelectionChange}
                       onExpand={handleExpand}
                       parentIsSelected={false} // Root items have no selected parent initially
                   />
                 ))}
            </div>
        </div>
    );
}

export default FileBrowser;