import React, { useState, useMemo } from 'react';
import { StateTransitionDiagram, DataDictionaryEntry, DiagramNode, DiagramConnection } from '../../types/structuredAnalysis';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { BaseDiagramEditor } from './BaseDiagramEditor';
import { Circle, Trash2 } from 'lucide-react'; // Added Trash2

interface STDEditorProps {
    stds: StateTransitionDiagram[];
    dictionary: DataDictionaryEntry[];
    onUpdate: (stds: StateTransitionDiagram[], dictionary: DataDictionaryEntry[]) => void;
    theme: 'dark' | 'light';
    undo?: () => void;
    redo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

export const STDEditor: React.FC<STDEditorProps> = ({
    stds,
    dictionary,
    onUpdate,
    theme,
    undo,
    redo,
    canUndo,
    canRedo
}) => {
    const isDark = theme === 'dark';
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Ensure at least one STD exists
    const currentSTD = useMemo(() => {
        if (stds.length === 0) {
            // We return a default structure, but we can't update state here.
            // The parent should ideally ensure at least one STD exists or handle creation.
            return { id: 'std-main', nodes: [], connections: [] };
        }
        return stds[0];
    }, [stds]);

    const handleAddState = () => {
        const newState: DiagramNode = {
            id: crypto.randomUUID(),
            type: 'state',
            name: 'New State',
            position: { x: 100, y: 100 },
            size: { width: 120, height: 120 }
        };

        // Update dictionary
        const newDictEntry: DataDictionaryEntry = {
            id: newState.id,
            name: newState.name,
            type: 'state',
            definition: '',
            relatedDiagramIds: [currentSTD.id]
        };

        const updatedSTD = {
            ...currentSTD,
            nodes: [...currentSTD.nodes, newState]
        };

        const updatedSTDs = stds.length === 0 ? [updatedSTD] : stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
        if (stds.length > 0 && !stds.find(d => d.id === currentSTD.id)) updatedSTDs.push(updatedSTD);

        onUpdate(updatedSTDs, dictionary);
        setActiveTool('select');
    };

    const handleMoveNode = (id: string, x: number, y: number) => {
        const updatedNodes = currentSTD.nodes.map(n => n.id === id ? { ...n, position: { x, y } } : n);
        const updatedSTD = { ...currentSTD, nodes: updatedNodes };
        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
        onUpdate(updatedSTDs, dictionary);
    };

    const handleConnectionCreate = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;
        if (currentSTD.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return;

        const newConnection: DiagramConnection = {
            id: crypto.randomUUID(),
            sourceId,
            targetId,
            label: 'Event'
        };

        const updatedSTD = {
            ...currentSTD,
            connections: [...currentSTD.connections, newConnection]
        };
        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
        onUpdate(updatedSTDs, dictionary);
        setActiveTool('select');
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;

        let updatedSTD = { ...currentSTD };

        // Filter out nodes and connections
        const updatedNodes = currentSTD.nodes.filter(n => !selectedIds.includes(n.id));
        const updatedConnections = currentSTD.connections.filter(c =>
            !selectedIds.includes(c.id) &&
            !selectedIds.includes(c.sourceId) &&
            !selectedIds.includes(c.targetId)
        );

        updatedSTD = { ...currentSTD, nodes: updatedNodes, connections: updatedConnections };

        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
        onUpdate(updatedSTDs, dictionary);
        setSelectedIds([]);
    };

    const canvasNodes: CanvasNode[] = currentSTD.nodes.map(node => ({
        id: node.id,
        x: node.position.x,
        y: node.position.y,
        width: node.size?.width || 120,
        height: node.size?.height || 120,
        shape: 'rounded-rectangle',
        content: (
            <div
                className={`flex items-center justify-center p-2 transition-all w-full h-full border-2 shadow-sm ${isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-white border-stone-800 text-stone-900'
                    } ${selectedIds.includes(node.id) ? 'ring-2 ring-blue-500' : ''} rounded-xl`}
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
            >
                <div className="text-center font-bold text-sm">{node.name}</div>
            </div>
        ),
        resizable: true
    }));

    const canvasConnections: CanvasConnection[] = currentSTD.connections.map(conn => {
        const startNode = currentSTD.nodes.find(n => n.id === conn.sourceId);
        const endNode = currentSTD.nodes.find(n => n.id === conn.targetId);

        const startW = startNode?.size?.width || 120;
        const startH = startNode?.size?.height || 120;
        const endW = endNode?.size?.width || 120;
        const endH = endNode?.size?.height || 120;

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

    const selectedNode = selectedIds.length === 1 ? currentSTD.nodes.find(n => n.id === selectedIds[0]) : null;
    const selectedConnection = selectedIds.length === 1 ? currentSTD.connections.find(c => c.id === selectedIds[0]) : null;

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
            onConnectionCreate={handleConnectionCreate}
            onDelete={handleDelete}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            toolbarContent={
                <button
                    onClick={handleAddState}
                    className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'} `}
                >
                    <Circle size={14} /> Add State
                </button>
            }
            propertiesPanelContent={
                <>
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-stone-800'} `}>Properties</h3>
                    <div className="space-y-4">
                        {selectedNode && (
                            <div>
                                <label className="text-xs font-bold uppercase opacity-50 block mb-1">State Name</label>
                                <input
                                    type="text"
                                    className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'} `}
                                    value={selectedNode.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const updatedNodes = currentSTD.nodes.map(n => n.id === selectedNode.id ? { ...n, name: newName } : n);
                                        const updatedSTD = { ...currentSTD, nodes: updatedNodes };
                                        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                        const updatedDictionary = dictionary.map(d => d.id === selectedNode.id ? { ...d, name: newName } : d);
                                        onUpdate(updatedSTDs, updatedDictionary);
                                    }}
                                />
                            </div>
                        )}
                        {selectedConnection && (
                            <div>
                                <label className="text-xs font-bold uppercase opacity-50 block mb-1">Event/Trigger</label>
                                <input
                                    type="text"
                                    className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'} `}
                                    value={selectedConnection.label || ''}
                                    onChange={(e) => {
                                        const newLabel = e.target.value;
                                        const updatedConnections = currentSTD.connections.map(c => c.id === selectedConnection.id ? { ...c, label: newLabel } : c);
                                        const updatedSTD = { ...currentSTD, connections: updatedConnections };
                                        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                        onUpdate(updatedSTDs, dictionary);
                                    }}
                                />

                                <div className="mt-4">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Line Style</label>
                                    <select
                                        className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'} `}
                                        value={selectedConnection.lineStyle || 'straight'}
                                        onChange={(e) => {
                                            const newStyle = e.target.value as any;
                                            const updatedConnections = currentSTD.connections.map(c => c.id === selectedConnection.id ? { ...c, lineStyle: newStyle } : c);
                                            const updatedSTD = { ...currentSTD, connections: updatedConnections };
                                            const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                            onUpdate(updatedSTDs, dictionary);
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
                                                const updatedConnections = currentSTD.connections.map(c => c.id === selectedConnection.id ? { ...c, sourceArrow: e.target.checked } : c);
                                                const updatedSTD = { ...currentSTD, connections: updatedConnections };
                                                const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                                onUpdate(updatedSTDs, dictionary);
                                            }}
                                        />
                                        Start Arrow
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedConnection.targetArrow || false}
                                            onChange={(e) => {
                                                const updatedConnections = currentSTD.connections.map(c => c.id === selectedConnection.id ? { ...c, targetArrow: e.target.checked } : c);
                                                const updatedSTD = { ...currentSTD, connections: updatedConnections };
                                                const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                                onUpdate(updatedSTDs, dictionary);
                                            }}
                                        />
                                        End Arrow
                                    </label>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => {
                                            const updatedConnections = currentSTD.connections.filter(c => c.id !== selectedConnection.id);
                                            const updatedSTD = { ...currentSTD, connections: updatedConnections };
                                            const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                            onUpdate(updatedSTDs, dictionary);
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
                                        const updatedNodes = currentSTD.nodes.filter(n => n.id !== selectedNode.id);
                                        const updatedConnections = currentSTD.connections.filter(c => c.sourceId !== selectedNode.id && c.targetId !== selectedNode.id);
                                        const updatedSTD = { ...currentSTD, nodes: updatedNodes, connections: updatedConnections };
                                        const updatedSTDs = stds.map(d => d.id === currentSTD.id ? updatedSTD : d);
                                        onUpdate(updatedSTDs, dictionary);
                                        setSelectedIds([]);
                                    }}
                                    className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center gap-2"
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
