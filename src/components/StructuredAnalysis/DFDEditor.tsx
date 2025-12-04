import React, { useState, useMemo } from 'react';
import { DataFlowDiagram, DataDictionaryEntry, DiagramNode, DiagramConnection } from '../../types/structuredAnalysis';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { BaseDiagramEditor } from './BaseDiagramEditor';
import { Square, Circle, Database, CornerDownRight, Plus, Trash2, ChevronRight } from 'lucide-react';

interface DFDEditorProps {
    dfds: DataFlowDiagram[];
    dictionary: DataDictionaryEntry[];
    onUpdate: (dfds: DataFlowDiagram[], dictionary: DataDictionaryEntry[]) => void;
    theme: 'dark' | 'light';
    undo?: () => void;
    redo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

export const DFDEditor: React.FC<DFDEditorProps> = ({
    dfds,
    dictionary,
    onUpdate,
    theme,
    undo,
    redo,
    canUndo,
    canRedo
}) => {
    const isDark = theme === 'dark';
    const [currentDFDId, setCurrentDFDId] = useState<string>('level-0');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Ensure Level 0 exists
    const currentDFD = useMemo(() => {
        let dfd = dfds.find(d => d.id === currentDFDId);
        if (!dfd && currentDFDId === 'level-0') {
            dfd = {
                id: 'level-0',
                level: 0,
                nodes: [],
                connections: []
            };
        }
        return dfd || { id: 'level-0', level: 0, nodes: [], connections: [] };
    }, [dfds, currentDFDId]);

    const getBreadcrumbs = () => {
        const crumbs = [];
        let curr: DataFlowDiagram | undefined = currentDFD;
        while (curr) {
            crumbs.unshift(curr);
            if (curr.parentId) {
                curr = dfds.find(d => d.id === curr?.parentId);
            } else {
                curr = undefined;
            }
        }
        return crumbs;
    };

    // Helper to get process number prefix
    const getProcessNumber = (node: DiagramNode, allDfds: DataFlowDiagram[]): string => {
        if (node.type !== 'process') return '';

        // Find the DFD this node belongs to
        const currentDfd = allDfds.find(d => d.nodes.some(n => n.id === node.id));
        if (!currentDfd) return '';

        // Calculate index among processes in this DFD
        const processes = currentDfd.nodes.filter(n => n.type === 'process');
        const index = processes.findIndex(n => n.id === node.id) + 1;

        // If it's a top-level DFD (level 0) or we can't find a parent DFD
        if (currentDfd.level === 0 || !currentDfd.parentId || !currentDfd.parentProcessId) {
            return `${index}`;
        }

        // Find the parent DFD
        const parentDfd = allDfds.find(d => d.id === currentDfd.parentId);
        if (!parentDfd) return `${index}`;

        const parentProcess = parentDfd.nodes.find(n => n.id === currentDfd.parentProcessId);
        if (!parentProcess) {
            // Parent process might be in Context Diagram (not in dfds array)
            return `${index}`;
        }

        const parentNumber = getProcessNumber(parentProcess, allDfds);
        return `${parentNumber}.${index}`;
    };

    const syncDictionaryLabels = (currentDfds: DataFlowDiagram[], currentDict: DataDictionaryEntry[]) => {
        return currentDict.map(entry => {
            if (entry.type === 'process') {
                // Find node in dfds
                let node: DiagramNode | undefined;
                for (const dfd of currentDfds) {
                    node = dfd.nodes.find(n => n.id === entry.id);
                    if (node) break;
                }
                if (node) {
                    return { ...entry, label: getProcessNumber(node, currentDfds) };
                }
            }
            return entry;
        });
    };

    const handleAddNode = (type: 'process' | 'data_store' | 'external_entity') => {
        const newNode: DiagramNode = {
            id: crypto.randomUUID(),
            type,
            name: type === 'process' ? 'New Process' : type === 'data_store' ? 'New Store' : 'New Entity',
            position: { x: 100, y: 100 },
            size: { width: 150, height: 80 },
            level: currentDFD.level
        };

        // Update dictionary
        const newDictEntry: DataDictionaryEntry = {
            id: newNode.id,
            name: newNode.name,
            type: type,
            definition: '',
            relatedDiagramIds: [currentDFD.id]
        };

        const updatedDFD = {
            ...currentDFD,
            nodes: [...currentDFD.nodes, newNode]
        };

        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
        if (!dfds.find(d => d.id === currentDFD.id)) updatedDFDs.push(updatedDFD);

        const updatedDictionary = [...dictionary, newDictEntry];
        onUpdate(updatedDFDs, syncDictionaryLabels(updatedDFDs, updatedDictionary));
        setActiveTool('select');
    };

    const handleMoveNode = (id: string, x: number, y: number) => {
        const updatedNodes = currentDFD.nodes.map(n => n.id === id ? { ...n, position: { x, y } } : n);
        const updatedDFD = { ...currentDFD, nodes: updatedNodes };
        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
        onUpdate(updatedDFDs, dictionary);
    };

    const handleNodeResize = (id: string, width: number, height: number) => {
        const updatedNodes = currentDFD.nodes.map(n => n.id === id ? { ...n, size: { width, height } } : n);
        const updatedDFD = { ...currentDFD, nodes: updatedNodes };
        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
        onUpdate(updatedDFDs, dictionary);
    };

    const handleConnectionCreate = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;
        if (currentDFD.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return;

        const newConnection: DiagramConnection = {
            id: crypto.randomUUID(),
            sourceId,
            targetId,
            label: 'Data Flow'
        };

        const updatedDFD = {
            ...currentDFD,
            connections: [...currentDFD.connections, newConnection]
        };
        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
        onUpdate(updatedDFDs, dictionary);
        setActiveTool('select');
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;

        let updatedDFD = { ...currentDFD };

        // Filter out nodes and connections
        const updatedNodes = currentDFD.nodes.filter(n => !selectedIds.includes(n.id));
        const updatedConnections = currentDFD.connections.filter(c =>
            !selectedIds.includes(c.id) &&
            !selectedIds.includes(c.sourceId) &&
            !selectedIds.includes(c.targetId)
        );

        updatedDFD = { ...currentDFD, nodes: updatedNodes, connections: updatedConnections };

        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
        onUpdate(updatedDFDs, syncDictionaryLabels(updatedDFDs, dictionary));
        setSelectedIds([]);
    };

    const handleNodeDoubleClick = (nodeId: string) => {
        const node = currentDFD.nodes.find(n => n.id === nodeId);
        if (node && node.type === 'process') {
            const existingChild = dfds.find(d => d.parentProcessId === nodeId);
            if (existingChild) {
                setCurrentDFDId(existingChild.id);
            } else {
                const newDFD: DataFlowDiagram = {
                    id: crypto.randomUUID(),
                    level: currentDFD.level + 1,
                    parentId: currentDFD.id,
                    parentProcessId: nodeId,
                    nodes: [],
                    connections: []
                };
                onUpdate([...dfds, newDFD], dictionary);
                setCurrentDFDId(newDFD.id);
            }
        }
    };



    // Sync inherited data stores
    React.useEffect(() => {
        if (currentDFD.level === 0) return;

        const parentDfd = dfds.find(d => d.id === currentDFD.parentId);
        if (!parentDfd || !currentDFD.parentProcessId) return;

        // Find data stores connected to the parent process in the parent DFD
        const connectedDataStoreIds = new Set<string>();
        parentDfd.connections.forEach(conn => {
            if (conn.sourceId === currentDFD.parentProcessId) {
                const targetNode = parentDfd.nodes.find(n => n.id === conn.targetId);
                if (targetNode && targetNode.type === 'data_store') {
                    connectedDataStoreIds.add(targetNode.id);
                }
            }
            if (conn.targetId === currentDFD.parentProcessId) {
                const sourceNode = parentDfd.nodes.find(n => n.id === conn.sourceId);
                if (sourceNode && sourceNode.type === 'data_store') {
                    connectedDataStoreIds.add(sourceNode.id);
                }
            }
        });

        // Check if we need to add any nodes
        const nodesToAdd: DiagramNode[] = [];
        connectedDataStoreIds.forEach(storeId => {
            if (!currentDFD.nodes.find(n => n.id === storeId)) {
                const storeNode = parentDfd.nodes.find(n => n.id === storeId);
                if (storeNode) {
                    // Create a copy for this level, but keep the same ID and Level (to indicate origin)
                    // We give it a new position for this diagram (defaulting to center or offset)
                    nodesToAdd.push({
                        ...storeNode,
                        position: { x: 100, y: 100 + (nodesToAdd.length * 100) }, // Stagger positions
                        // Keep original level to track inheritance
                    });
                }
            }
        });

        if (nodesToAdd.length > 0) {
            const updatedDFD = {
                ...currentDFD,
                nodes: [...currentDFD.nodes, ...nodesToAdd]
            };
            const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
            onUpdate(updatedDFDs, dictionary);
        }
    }, [currentDFD.id, currentDFD.nodes.length, dfds]); // Depend on nodes.length to avoid infinite loops if ids match

    const canvasNodes: CanvasNode[] = currentDFD.nodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.size?.width || (node.type === 'process' ? 160 : node.type === 'data_store' ? 160 : 128),
        height: node.size?.height || (node.type === 'process' ? 96 : node.type === 'data_store' ? 64 : 80),
        shape: node.type === 'process' ? 'rounded-rectangle' : 'rectangle',
        content: (
            <div
                className={`flex items-center justify-center p-2 transition-all w-full h-full border-2 shadow-sm ${isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-stone-800 text-stone-900'
                    } ${selectedIds.includes(node.id) ? 'ring-2 ring-blue-500' : ''} ${node.type === 'process' ? 'rounded-xl' : ''
                    } ${node.type === 'data_store' ? 'border-r-0' : ''}`}
                onClick={(e) => {
                    if (activeTool === 'select') {
                        e.stopPropagation();
                        if (e.ctrlKey || e.shiftKey) {
                            setSelectedIds(prev => prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]);
                        } else {
                            setSelectedIds([node.id]);
                        }
                    }
                }}
                onDoubleClick={(e) => { e.stopPropagation(); handleNodeDoubleClick(node.id); }}
            >
                {node.type === 'data_store' && <div className={`absolute left-0 top-0 bottom-0 w-4 border-r-2 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-stone-800 bg-stone-100'}`}></div>}
                <div className="text-center pointer-events-none select-none px-2">
                    <div className="text-[10px] opacity-50 mb-1">{node.type === 'process' ? getProcessNumber(node, dfds) : ''}</div>
                    <div className="text-xs font-bold uppercase">{node.name}</div>
                    {node.level !== undefined && node.level < currentDFD.level && (
                        <div className="text-[9px] opacity-40 mt-1">(Inherited)</div>
                    )}
                </div>
                {node.type === 'process' && (
                    <div className="absolute bottom-1 right-2 opacity-30">
                        <CornerDownRight size={12} />
                    </div>
                )}
            </div>
        ),
        resizable: true
    }));

    const canvasConnections: CanvasConnection[] = currentDFD.connections.map(conn => {
        const startNode = currentDFD.nodes.find(n => n.id === conn.sourceId);
        const endNode = currentDFD.nodes.find(n => n.id === conn.targetId);

        const startW = startNode?.size?.width || (startNode?.type === 'process' ? 160 : startNode?.type === 'data_store' ? 160 : 128);
        const startH = startNode?.size?.height || (startNode?.type === 'process' ? 96 : startNode?.type === 'data_store' ? 64 : 80);

        const endW = endNode?.size?.width || (endNode?.type === 'process' ? 160 : endNode?.type === 'data_store' ? 160 : 128);
        const endH = endNode?.size?.height || (endNode?.type === 'process' ? 96 : endNode?.type === 'data_store' ? 64 : 80);

        const start = startNode ? {
            x: startNode.position.x + startW / 2,
            y: startNode.position.y + startH / 2
        } : { x: 0, y: 0 };

        const end = endNode ? {
            x: endNode.position.x + endW / 2,
            y: endNode.position.y + endH / 2
        } : { x: 0, y: 0 };

        return {
            id: conn.id,
            start,
            end,
            label: conn.label,
            isSelected: selectedIds.includes(conn.id),
            lineStyle: conn.lineStyle,
            sourceArrow: conn.sourceArrow,
            targetArrow: conn.targetArrow,
            sourceNodeId: conn.sourceId,
            targetNodeId: conn.targetId
        };
    });

    const selectedNode = selectedIds.length === 1 ? currentDFD.nodes.find(n => n.id === selectedIds[0]) : null;
    const selectedConnection = selectedIds.length === 1 ? currentDFD.connections.find(c => c.id === selectedIds[0]) : null;

    return (
        <BaseDiagramEditor
            nodes={canvasNodes}
            connections={canvasConnections}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isDark={isDark}
            onNodeMove={handleMoveNode}
            onNodeResize={handleNodeResize}
            onConnectionCreate={handleConnectionCreate}
            onDelete={handleDelete}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            breadcrumbs={
                <div className="flex items-center text-sm">
                    {
                        getBreadcrumbs().map((crumb, index, arr) => (
                            <React.Fragment key={crumb.id}>
                                <button
                                    onClick={() => setCurrentDFDId(crumb.id)}
                                    className={`text-xs font-bold flex items-center hover:underline ${crumb.id === currentDFDId ? (isDark ? 'text-white' : 'text-stone-900') : (isDark ? 'text-slate-500' : 'text-stone-500')}`}
                                >
                                    {crumb.level === 0 ? 'Context (L0)' : `Level ${crumb.level}`}
                                </button>
                                {index < arr.length - 1 && <ChevronRight size={12} className="text-slate-500 mx-1" />}
                            </React.Fragment>
                        ))
                    }
                </div>
            }
            toolbarContent={
                <>
                    <button
                        onClick={() => handleAddNode('process')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <Circle size={14} /> Process
                    </button>
                    <button
                        onClick={() => handleAddNode('data_store')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <Database size={14} /> Store
                    </button>
                    <button
                        onClick={() => handleAddNode('external_entity')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <Square size={14} /> Entity
                    </button>
                </>
            }
            propertiesPanelContent={
                <>
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>Properties</h3>
                    <div className="space-y-4">
                        {selectedNode && (
                            <>
                                <div>
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Name</label>
                                    <input
                                        type="text"
                                        className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                        value={selectedNode.name}
                                        onChange={(e) => {
                                            const newName = e.target.value;

                                            // Update ALL nodes with this ID across ALL DFDs (Global Sync)
                                            const updatedDFDs = dfds.map(d => ({
                                                ...d,
                                                nodes: d.nodes.map(n => n.id === selectedNode.id ? { ...n, name: newName } : n)
                                            }));

                                            const updatedDictionary = dictionary.map(d => d.id === selectedNode.id ? { ...d, name: newName } : d);
                                            onUpdate(updatedDFDs, updatedDictionary);
                                        }}
                                    />
                                </div>

                                {selectedNode.type === 'process' && (
                                    <div>
                                        <label className="text-xs font-bold uppercase opacity-50 block mb-1">Process Logic (P-Spec)</label>
                                        <textarea
                                            className={`w-full px-2 py-1 border rounded h-24 text-xs ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                            placeholder="Structured English..."
                                            value={dictionary.find(d => d.id === selectedNode.id)?.definition || ''}
                                            onChange={(e) => {
                                                const newDef = e.target.value;
                                                const updatedDict = dictionary.map(d => d.id === selectedNode.id ? { ...d, definition: newDef } : d);
                                                onUpdate(dfds, updatedDict);
                                            }}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                        {selectedConnection && (
                            <div>
                                <label className="text-xs font-bold uppercase opacity-50 block mb-1">Label</label>
                                <input
                                    type="text"
                                    className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                    value={selectedConnection.label || ''}
                                    onChange={(e) => {
                                        const newLabel = e.target.value;
                                        const updatedConnections = currentDFD.connections.map(c => c.id === selectedConnection.id ? { ...c, label: newLabel } : c);
                                        const updatedDFD = { ...currentDFD, connections: updatedConnections };
                                        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                        onUpdate(updatedDFDs, dictionary);
                                    }}
                                />

                                <div className="mt-4">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Line Style</label>
                                    <select
                                        className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                        value={selectedConnection.lineStyle || 'straight'}
                                        onChange={(e) => {
                                            const newStyle = e.target.value as any;
                                            const updatedConnections = currentDFD.connections.map(c => c.id === selectedConnection.id ? { ...c, lineStyle: newStyle } : c);
                                            const updatedDFD = { ...currentDFD, connections: updatedConnections };
                                            const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                            onUpdate(updatedDFDs, dictionary);
                                        }}
                                    >
                                        <option value="straight">Straight</option>
                                        <option value="orthogonal">Orthogonal</option>
                                        <option value="curved">Curved</option>
                                    </select>
                                </div>

                                <div className="mt-4 flex gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedConnection.sourceArrow || false}
                                            onChange={(e) => {
                                                const updatedConnections = currentDFD.connections.map(c => c.id === selectedConnection.id ? { ...c, sourceArrow: e.target.checked } : c);
                                                const updatedDFD = { ...currentDFD, connections: updatedConnections };
                                                const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                                onUpdate(updatedDFDs, dictionary);
                                            }}
                                        />
                                        Start Arrow
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedConnection.targetArrow || false}
                                            onChange={(e) => {
                                                const updatedConnections = currentDFD.connections.map(c => c.id === selectedConnection.id ? { ...c, targetArrow: e.target.checked } : c);
                                                const updatedDFD = { ...currentDFD, connections: updatedConnections };
                                                const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                                onUpdate(updatedDFDs, dictionary);
                                            }}
                                        />
                                        End Arrow
                                    </label>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => {
                                            const updatedConnections = currentDFD.connections.filter(c => c.id !== selectedConnection.id);
                                            const updatedDFD = { ...currentDFD, connections: updatedConnections };
                                            const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                            onUpdate(updatedDFDs, dictionary);
                                            setSelectedIds([]);
                                        }}
                                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={16} /> Delete Connection
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedNode && (
                            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={() => {
                                        // Check if node is inherited (level < currentDFD.level)
                                        if (selectedNode.level !== undefined && selectedNode.level < currentDFD.level) {
                                            alert('Cannot delete inherited node. Please delete it from its original level.');
                                            return;
                                        }

                                        const updatedNodes = currentDFD.nodes.filter(n => n.id !== selectedNode.id);
                                        const updatedConnections = currentDFD.connections.filter(c => c.sourceId !== selectedNode.id && c.targetId !== selectedNode.id);
                                        const updatedDFD = { ...currentDFD, nodes: updatedNodes, connections: updatedConnections };
                                        const updatedDFDs = dfds.map(d => d.id === currentDFD.id ? updatedDFD : d);
                                        onUpdate(updatedDFDs, dictionary);
                                        setSelectedIds([]);
                                    }}
                                    className={`w-full py-2 text-white rounded flex items-center justify-center gap-2 ${selectedNode.level !== undefined && selectedNode.level < currentDFD.level
                                        ? 'bg-slate-400 cursor-not-allowed'
                                        : 'bg-red-500 hover:bg-red-600'
                                        }`}
                                    disabled={selectedNode.level !== undefined && selectedNode.level < currentDFD.level}
                                >
                                    <Trash2 size={16} /> Delete Node
                                </button>
                            </div>
                        )}
                    </div>
                </>
            }
        />
    );
};
