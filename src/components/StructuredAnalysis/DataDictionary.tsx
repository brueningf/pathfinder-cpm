import React, { useState, useMemo } from 'react';
import { DataDictionaryEntry } from '../../types/structuredAnalysis';
import { Search, Edit2, Trash2, ChevronRight, ChevronDown, Database, Box, Users, Layers, FileText } from 'lucide-react';

interface DataDictionaryProps {
    dictionary: DataDictionaryEntry[];
    onUpdate: (dictionary: DataDictionaryEntry[]) => void;
    theme: 'dark' | 'light';
}

interface TreeNode extends DataDictionaryEntry {
    children: TreeNode[];
}

const TreeItem: React.FC<{
    node: TreeNode;
    depth: number;
    onEdit: (entry: DataDictionaryEntry) => void;
    onDelete: (id: string) => void;
    isDark: boolean;
    isLast?: boolean; // To handle line termination
}> = ({ node, depth, onEdit, onDelete, isDark, isLast }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children.length > 0;

    const getIcon = () => {
        switch (node.type) {
            case 'process': return <Box size={14} className="text-blue-500" />;
            case 'data_store': return <Database size={14} className="text-emerald-500" />;
            case 'external_entity': return <Users size={14} className="text-amber-500" />;
            case 'data_structure': return <Layers size={14} className="text-purple-500" />;
            default: return <FileText size={14} className="text-slate-500" />;
        }
    };

    return (
        <div className="relative">
            <div
                className={`group flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors relative z-10 ${isDark ? 'hover:bg-slate-800' : 'hover:bg-stone-100'}`}
            >
                {/* Connector Lines for current level */}
                {depth > 0 && (
                    <div className={`absolute -left-3 top-1/2 w-3 h-px ${isDark ? 'bg-slate-800' : 'bg-stone-200'}`} />
                )}

                <button
                    onClick={() => setExpanded(!expanded)}
                    className={`p-0.5 rounded hover:bg-black/10 ${hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getIcon()}
                    {node.label && (
                        <span className={`font-mono text-xs font-bold ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                            {node.label}
                        </span>
                    )}
                    <span className={`font-medium truncate text-sm ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>
                        {node.name}
                    </span>
                    {node.definition && (
                        <span className={`text-xs truncate flex-1 opacity-50 ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
                            — {node.definition}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(node)} className={`p-1.5 rounded hover:bg-blue-500 hover:text-white ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                        <Edit2 size={12} />
                    </button>
                    <button onClick={() => onDelete(node.id)} className={`p-1.5 rounded hover:bg-red-500 hover:text-white ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {expanded && hasChildren && (
                <div className={`ml-4 pl-2 border-l ${isDark ? 'border-slate-800' : 'border-stone-200'}`}>
                    {node.children.map((child, index) => (
                        <TreeItem
                            key={`${child.id}-${index}`} // Use index to allow duplicate children (composition)
                            node={child}
                            depth={depth + 1}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            isDark={isDark}
                            isLast={index === node.children.length - 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export const DataDictionary: React.FC<DataDictionaryProps> = ({ dictionary, onUpdate, theme }) => {
    const isDark = theme === 'dark';
    const [searchTerm, setSearchTerm] = useState('');
    const [editingEntry, setEditingEntry] = useState<DataDictionaryEntry | null>(null);

    const treeData = useMemo(() => {
        // 1. Filter first
        const filtered = dictionary.filter(entry =>
            entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entry.definition.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (entry.label && entry.label.includes(searchTerm))
        );

        // 2. Separate by type
        const processes = filtered.filter(e => e.type === 'process');
        const stores = filtered.filter(e => e.type === 'data_store');
        const entities = filtered.filter(e => e.type === 'external_entity');
        // Data elements/structures
        const dataItems = filtered.filter(e => !['process', 'data_store', 'external_entity'].includes(e.type));

        // 3. Build Process Tree
        const processMap = new Map<string, TreeNode>();
        const rootProcesses: TreeNode[] = [];

        // Initialize map
        processes.forEach(p => processMap.set(p.label || p.id, { ...p, children: [] }));

        // Sort by label length
        const sortedProcesses = [...processes].sort((a, b) => (a.label || '').localeCompare(b.label || '', undefined, { numeric: true }));

        sortedProcesses.forEach(p => {
            const node = processMap.get(p.label || p.id)!;
            if (p.label) {
                const parts = p.label.split('.');
                let parentLabel = '';
                if (parts.length > 1) {
                    parentLabel = parts.slice(0, -1).join('.');
                } else if (p.label !== '0') {
                    parentLabel = '0';
                }

                if (parentLabel && processMap.has(parentLabel)) {
                    processMap.get(parentLabel)!.children.push(node);
                } else {
                    rootProcesses.push(node);
                }
            } else {
                rootProcesses.push(node);
            }
        });

        // 4. Build Data Composition Tree
        // Create a map for fast lookup
        const dataMap = new Map<string, TreeNode>();
        dataItems.forEach(d => dataMap.set(d.name.toLowerCase(), { ...d, children: [] }));

        // We want to show root items (those that are NOT components of others, OR are top-level structures)
        // But in DFD, everything is a root unless we want to hide components.
        // Let's show all, but populate children for those with composition.

        const dataNodes: TreeNode[] = [];

        // Helper to parse composition
        const parseComposition = (node: TreeNode, visited = new Set<string>()) => {
            if (visited.has(node.name)) return; // Prevent cycles
            visited.add(node.name);

            if (node.composition) {
                // Split by +
                const parts = node.composition.split('+').map(s => s.trim());
                parts.forEach(partName => {
                    const childNode = dataMap.get(partName.toLowerCase());
                    if (childNode) {
                        // Clone to avoid reference issues in tree
                        const childClone = { ...childNode, children: [] };
                        parseComposition(childClone, new Set(visited));
                        node.children.push(childClone);
                    } else {
                        // Virtual node for missing definition
                        node.children.push({
                            id: `virtual-${partName}-${Math.random()}`,
                            name: partName,
                            type: 'data_element',
                            definition: 'Undefined component',
                            relatedDiagramIds: [],
                            children: []
                        });
                    }
                });
            }
        };

        dataItems.forEach(item => {
            // We create a fresh node for the list
            const node: TreeNode = { ...item, children: [] };
            parseComposition(node);
            dataNodes.push(node);
        });

        return {
            processes: rootProcesses,
            stores: stores.map(s => ({ ...s, children: [] } as TreeNode)),
            entities: entities.map(e => ({ ...e, children: [] } as TreeNode)),
            data: dataNodes
        };
    }, [dictionary, searchTerm]);

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntry) return;

        const updatedDictionary = dictionary.map(entry =>
            entry.id === editingEntry.id ? editingEntry : entry
        );
        onUpdate(updatedDictionary);
        setEditingEntry(null);
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm('Are you sure you want to delete this entry?')) {
            onUpdate(dictionary.filter(e => e.id !== id));
        }
    };

    return (
        <div className="h-full flex flex-col p-6 max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-center mb-6">
                <h2 className={`text-2xl font-bold ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>Data Dictionary</h2>
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-stone-400'}`} size={16} />
                    <input
                        type="text"
                        placeholder="Search definitions..."
                        className={`pl-10 pr-4 py-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-stone-200 text-stone-800'}`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={`flex-1 overflow-auto rounded-xl border p-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-stone-200'}`}>
                <div className="space-y-6">
                    {/* External Entities */}
                    {treeData.entities.length > 0 && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase mb-2 px-2 flex items-center gap-2 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                                <Users size={14} /> External Entities
                            </h3>
                            <div className="space-y-1">
                                {treeData.entities.map(node => (
                                    <TreeItem key={node.id} node={node} depth={0} onEdit={setEditingEntry} onDelete={handleDeleteEntry} isDark={isDark} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Data Stores */}
                    {treeData.stores.length > 0 && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase mb-2 px-2 flex items-center gap-2 ${isDark ? 'text-emerald-500' : 'text-emerald-600'}`}>
                                <Database size={14} /> Data Stores
                            </h3>
                            <div className="space-y-1">
                                {treeData.stores.map(node => (
                                    <TreeItem key={node.id} node={node} depth={0} onEdit={setEditingEntry} onDelete={handleDeleteEntry} isDark={isDark} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Processes */}
                    {treeData.processes.length > 0 && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase mb-2 px-2 flex items-center gap-2 ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                                <Layers size={14} /> Process Hierarchy
                            </h3>
                            <div className="space-y-1">
                                {treeData.processes.map(node => (
                                    <TreeItem key={node.id} node={node} depth={0} onEdit={setEditingEntry} onDelete={handleDeleteEntry} isDark={isDark} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Data Elements & Structures */}
                    {treeData.data.length > 0 && (
                        <div>
                            <h3 className={`text-xs font-bold uppercase mb-2 px-2 flex items-center gap-2 ${isDark ? 'text-slate-500' : 'text-stone-500'}`}>
                                <FileText size={14} /> Data Elements & Structures
                            </h3>
                            <div className="space-y-1">
                                {treeData.data.map(node => (
                                    <TreeItem key={node.id} node={node} depth={0} onEdit={setEditingEntry} onDelete={handleDeleteEntry} isDark={isDark} />
                                ))}
                            </div>
                        </div>
                    )}

                    {dictionary.length === 0 && (
                        <div className="text-center py-12 opacity-50">
                            No entries found. Add elements to diagrams to populate the dictionary.
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editingEntry && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className={`w-full max-w-lg rounded-xl shadow-2xl p-6 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
                        <h3 className={`text-lg font-bold mb-4 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>Edit Dictionary Entry</h3>
                        <form onSubmit={handleSaveEntry} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Name</label>
                                <input
                                    type="text"
                                    className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-stone-200'}`}
                                    value={editingEntry.name}
                                    onChange={e => setEditingEntry({ ...editingEntry, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Type</label>
                                <select
                                    className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-stone-200'}`}
                                    value={editingEntry.type}
                                    onChange={e => setEditingEntry({ ...editingEntry, type: e.target.value as any })}
                                >
                                    <option value="data_element">Data Element</option>
                                    <option value="data_structure">Data Structure</option>
                                    <option value="data_store">Data Store</option>
                                    <option value="process">Process</option>
                                    <option value="external_entity">External Entity</option>
                                </select>
                            </div>

                            {(editingEntry.type === 'data_structure' || editingEntry.type === 'data_element') && (
                                <div>
                                    <label className="block text-xs font-bold uppercase opacity-50 mb-1">Composition (e.g. "Street + City")</label>
                                    <input
                                        type="text"
                                        className={`w-full px-3 py-2 rounded border ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-stone-200'}`}
                                        placeholder="Component A + Component B"
                                        value={editingEntry.composition || ''}
                                        onChange={e => setEditingEntry({ ...editingEntry, composition: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase opacity-50 mb-1">Definition (Structured English)</label>
                                <textarea
                                    className={`w-full px-3 py-2 rounded border h-32 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-stone-200'}`}
                                    placeholder="Structured English..."
                                    value={editingEntry.definition}
                                    onChange={e => setEditingEntry({ ...editingEntry, definition: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setEditingEntry(null)} className={`btn ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-stone-100 text-stone-500'}`}>Cancel</button>
                                <button type="submit" className="btn bg-blue-600 text-white hover:bg-blue-500">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
