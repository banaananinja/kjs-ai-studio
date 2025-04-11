// src/components/FileBrowser.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './FileBrowser.css';

// BrowserItem component
function BrowserItem({ item, level = 0, selectedPaths, ancestorPaths, onSelectionChange, onExpand, parentIsSelected = false }) {
    const isDirectlySelected = !!selectedPaths[item.path];
    const isEffectivelySelected = isDirectlySelected || parentIsSelected;
    const isImplicitlySelected = parentIsSelected && !isDirectlySelected;
    const containsSelection = !!ancestorPaths[item.path];

    const indent = level * 20;
    const handleCheckboxChange = (event) => { onSelectionChange(item.path, event.target.checked); };
    const handleToggleExpand = (event) => { if (event.target.type !== 'checkbox') { onExpand(item); } };

    return (
        <div className={`browser-item ${item.isDirectory ? 'folder' : 'file'} ${isImplicitlySelected ? 'implicitly-selected' : ''} ${containsSelection ? 'contains-selection' : ''}`}>
            <div className="item-content" style={{ paddingLeft: `${indent}px` }}>
                {item.isDirectory && (<span className="expander" onClick={handleToggleExpand}>{item.isExpanded ? '▼' : '►'}</span>)}
                <input type="checkbox" id={`cb-${item.path}`} checked={isDirectlySelected} onChange={handleCheckboxChange} className="item-checkbox" />
                <label htmlFor={`cb-${item.path}`} className="item-label" onClick={item.isDirectory ? handleToggleExpand : undefined}>
                   <span className="item-icon">{item.isDirectory ? '📁' : '📄'}</span>
                   <span className="item-name" title={item.path}>{item.name}</span>
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
                            parentIsSelected={isEffectivelySelected}
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
    const [currentDisplayPath, setCurrentDisplayPath] = useState('File Browser');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const updateItemChildren = (currentItems, targetPath, newChildren, expand) => { return currentItems.map(item => { if (item.path === targetPath) return { ...item, children: newChildren, isExpanded: expand }; if (item.isDirectory && item.children) return { ...item, children: updateItemChildren(item.children, targetPath, newChildren, expand) }; return item; }); };
    const loadDirectory = useCallback(async (dirPath, targetItem = null) => { setLoading(true); setError(null); const actualPath = dirPath === undefined || dirPath === null ? '' : dirPath; console.log(`FileBrowser: Requesting directory - '${actualPath}' (Empty means Home)`); try { const result = await window.electronAPI.browseDirectory(actualPath); if (result.success) { const fetchedItems = result.contents .map(item => ({ ...item, isExpanded: false, children: null })).sort((a, b) => { if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1; return a.name.localeCompare(b.name); }); if (targetItem) setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, fetchedItems, true)); else { setCurrentRootItems(fetchedItems); setCurrentDisplayPath(actualPath || 'Home'); } } else { setError(result.error || "Failed..."); if (targetItem) setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, [], false)); else { setCurrentRootItems([]); } } } catch (apiError) { setError(apiError.message || "Error..."); if (targetItem) { setCurrentRootItems(prevItems => updateItemChildren(prevItems, targetItem.path, [], false)); } else { setCurrentRootItems([]); } } finally { setLoading(false); } }, []);
    useEffect(() => { loadDirectory(initialPath); }, [initialPath, loadDirectory]);
    const handleExpand = useCallback((item) => { if (!item.isDirectory) return; setCurrentRootItems(prevItems => { const toggleRecursively = (nodes, targetPath) => nodes.map(node => { if (node.path === targetPath) { const needsLoad = !node.isExpanded && node.children === null; if (needsLoad) loadDirectory(node.path, node); return { ...node, isExpanded: needsLoad ? true : !node.isExpanded }; } if (node.isDirectory && node.children) return { ...node, children: toggleRecursively(node.children, targetPath) }; return node; }); return toggleRecursively(prevItems, item.path); }); }, [loadDirectory]);
    const handleSelectionChange = useCallback((path, isChecked) => { onSelectedPathsChange(path, isChecked); }, [onSelectedPathsChange]);

    return (
        <div className="file-browser">
            <div className="browser-header">
                <span className="current-path" title={currentDisplayPath}> {currentDisplayPath} </span>
            </div>
            {loading && <div className="loading-indicator">Loading...</div>}
            {error && <div className="error-message">{error}</div>}
            <div className="browser-tree">
                {currentRootItems.length === 0 && !loading && !error && <div className="empty-folder">(Directory empty or loading failed)</div>}
                {currentRootItems.map(item => ( <BrowserItem key={item.path} item={item} level={0} selectedPaths={selectedPaths} ancestorPaths={ancestorPaths} onSelectionChange={handleSelectionChange} onExpand={handleExpand} parentIsSelected={false} /> ))}
            </div>
        </div>
    );
}
export default FileBrowser;