import React, { useState } from 'react';
import { ContextDiagram, DataDictionaryEntry, DiagramNode, DiagramConnection } from '../../types/structuredAnalysis';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { BaseDiagramEditor } from './BaseDiagramEditor';
import { Square, Circle, BoxSelect, Trash2 } from 'lucide-react';

interface ContextDiagramEditorProps {
    data: ContextDiagram;
    dictionary: DataDictionaryEntry[];
    onUpdate: (data: ContextDiagram, dictionary: DataDictionaryEntry[]) => void;
    theme: 'dark' | 'light';
    onNavigateToDFD?: () => void;
    undo?: () => void;
    redo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

export const ContextDiagramEditor: React.FC<ContextDiagramEditorProps> = ({
    data,
    dictionary,
    onUpdate,
    theme,
    onNavigateToDFD,
    undo,
    redo,
    canUndo,
    canRedo
}) => {
    const isDark = theme === 'dark';
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    const handleAddNode = (type: 'process' | 'external_entity' | 'boundary') => {
        const newNode: DiagramNode = {
            id: crypto.randomUUID(),
            type,
            name: type === 'process' ? 'System' : type === 'boundary' ? 'System Boundary' : 'New Entity',
            position: { x: 100, y: 100 },
            size: { width: type === 'boundary' ? 400 : 150, height: type === 'boundary' ? 300 : 80 }
        };

        // Update dictionary
        const newDictEntry: DataDictionaryEntry = {
            id: newNode.id,
            name: newNode.name,
            type: type,
            definition: '',
            relatedDiagramIds: ['context'],
            label: type === 'process' ? '0' : undefined
        };

        onUpdate(
            { ...data, nodes: [...data.nodes, newNode] },
            [...dictionary, newDictEntry]
        );
        setActiveTool('select'); // Switch back to select after adding
    };

    const handleMoveNode = (id: string, x: number, y: number) => {
        const updatedNodes = data.nodes.map(n => n.id === id ? { ...n, position: { x, y } } : n);
        onUpdate({ ...data, nodes: updatedNodes }, dictionary);
    };

    const handleNodeResize = (id: string, width: number, height: number) => {
        const updatedNodes = data.nodes.map(n => n.id === id ? { ...n, size: { width, height } } : n);
        onUpdate({ ...data, nodes: updatedNodes }, dictionary);
    };

    const handleConnectionCreate = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;
        if (data.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)) return;

        const newConnection: DiagramConnection = {
            id: crypto.randomUUID(),
            sourceId,
            targetId,
            label: 'Data Flow',
            targetArrow: true
        };
        onUpdate({ ...data, connections: [...data.connections, newConnection] }, dictionary);
        setActiveTool('select'); // Switch back to select after connecting
    };

    const handleConnectionControlPointMove = (id: string, index: number, x: number, y: number) => {
        const conn = data.connections.find(c => c.id === id);
        if (!conn) return;

        let newControlPoints = conn.controlPoints ? [...conn.controlPoints] : [];

        // Initialize if missing (Standard Bezier Logic)
        if (newControlPoints.length !== 2) {
            const startNode = data.nodes.find(n => n.id === conn.sourceId);
            const endNode = data.nodes.find(n => n.id === conn.targetId);
            
            if (!startNode || !endNode) return;

             // Helper to get center (duplicated logic, but necessary here)
            const getCenter = (n: typeof startNode) => ({
                x: n.position.x + (n.size?.width || (n.type === 'process' ? 128 : n.type === 'boundary' ? 400 : 128)) / 2,
                y: n.position.y + (n.size?.height || (n.type === 'process' ? 128 : n.type === 'boundary' ? 300 : 80)) / 2
            });

            const start = getCenter(startNode);
            const end = getCenter(endNode);

            const dx = Math.abs(end.x - start.x);
            const offset = Math.max(dx * 0.5, 50);
            
            newControlPoints = [
                { x: start.x + offset, y: start.y },
                { x: end.x - offset, y: end.y }
            ];
        }

        // Update the specific point
        newControlPoints[index] = { x, y };

        const updatedConnections = data.connections.map(c => c.id === id ? { ...c, controlPoints: newControlPoints } : c);
        onUpdate({ ...data, connections: updatedConnections }, dictionary);
    };

    const handleDelete = () => {
        if (selectedIds.length === 0) return;

        // Filter out nodes and connections
        const updatedNodes = data.nodes.filter(n => !selectedIds.includes(n.id));
        const updatedConnections = data.connections.filter(c =>
            !selectedIds.includes(c.id) &&
            !selectedIds.includes(c.sourceId) &&
            !selectedIds.includes(c.targetId)
        );

        onUpdate({ ...data, nodes: updatedNodes, connections: updatedConnections }, dictionary);
        setSelectedIds([]);
    };

    // Convert DiagramNode to CanvasNode
    const sortedNodes = [...data.nodes].sort((a, b) => a.type === 'boundary' ? -1 : 1);

    const canvasNodes: CanvasNode[] = sortedNodes.map(node => {
        const width = node.size?.width || (node.type === 'process' ? 128 : node.type === 'boundary' ? 400 : 128);
        const height = node.size?.height || (node.type === 'process' ? 128 : node.type === 'boundary' ? 300 : 80);

        const isBoundary = node.type === 'boundary';

        return {
            id: node.id,
            x: node.position.x,
            y: node.position.y,
            width,
            height,
            shape: node.type === 'process' ? 'ellipse' : 'rectangle',
            resizable: isBoundary,
            content: isBoundary ? (
                <div className="relative w-full h-full" data-diagram-ignore="true">
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                        {/* Hit area for easier selection */}
                        <rect
                            x="2" y="2"
                            width="calc(100% - 4px)"
                            height="calc(100% - 4px)"
                            fill="none"
                            stroke="transparent"
                            strokeWidth="10"
                            pointerEvents="stroke"
                            className="cursor-pointer"
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
                        />
                        <rect
                            x="2" y="2"
                            width="calc(100% - 4px)"
                            height="calc(100% - 4px)"
                            fill="none"
                            stroke={isDark ? '#475569' : '#a8a29e'}
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            rx="8"
                            pointerEvents="none" // Visual only, hit area handles clicks
                            className={selectedIds.includes(node.id) ? 'stroke-blue-500 stroke-[3px]' : ''}
                        />
                    </svg>
                    <div
                        className="absolute top-2 left-2 text-xs opacity-50 font-bold uppercase pointer-events-auto select-none cursor-pointer"
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
                        {node.name}
                    </div>
                </div>
            ) : (
                <div
                    className={`flex items-center justify-center p-4 transition-all w-full h-full ${node.type === 'process'
                        ? 'rounded-full border-2 shadow-sm'
                        : 'rounded-none border-2 shadow-sm'
                        } ${isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-200'
                            : 'bg-white border-stone-800 text-stone-900'
                        } ${selectedIds.includes(node.id) ? 'ring-2 ring-blue-500' : ''}`}
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
                    onDoubleClick={(e) => {
                        if (node.type === 'process' && onNavigateToDFD) {
                            e.stopPropagation();
                            onNavigateToDFD();
                        }
                    }}
                >
                    <div className="text-xs text-center font-bold uppercase pointer-events-none select-none">
                        {node.name}
                    </div>
                </div>
            )
        };
    });

    const canvasConnections: CanvasConnection[] = data.connections.map(conn => {
        const startNode = data.nodes.find(n => n.id === conn.sourceId);
        const endNode = data.nodes.find(n => n.id === conn.targetId);

        const startW = startNode?.size?.width || (startNode?.type === 'process' ? 128 : startNode?.type === 'boundary' ? 400 : 128);
        const startH = startNode?.size?.height || (startNode?.type === 'process' ? 128 : startNode?.type === 'boundary' ? 300 : 80);

        const endW = endNode?.size?.width || (endNode?.type === 'process' ? 128 : endNode?.type === 'boundary' ? 400 : 128);
        const endH = endNode?.size?.height || (endNode?.type === 'process' ? 128 : endNode?.type === 'boundary' ? 300 : 80);

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
            sourceNodeId: conn.sourceId,
            targetNodeId: conn.targetId,
            sourceArrow: conn.sourceArrow,
            targetArrow: conn.targetArrow,
            lineStyle: conn.lineStyle,
            textPosition: conn.textPosition,
            anchors: conn.anchors,
            controlPoints: conn.controlPoints
        };
    });

    const selectedNode = selectedIds.length === 1 ? data.nodes.find(n => n.id === selectedIds[0]) : null;
    const selectedConnection = selectedIds.length === 1 ? data.connections.find(c => c.id === selectedIds[0]) : null;

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
            onConnectionControlPointMove={handleConnectionControlPointMove}
            onDelete={handleDelete}
            // Undo/Redo props will be passed from parent, but I need to add them to interface first
            // Actually, I should update the interface above first.
            // But for now, I'll assume they are passed via spread or I'll add them to props.
            // I'll do it in a separate edit or assume TS will complain.
            // I'll add them to the props interface in the same file if possible, but I'm editing the body.
            // I'll just pass them through if they exist in props (which I need to update).
            // Let's assume I'll update            onDelete={handleDelete}
            undo={undo}
            redo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            toolbarContent={
                <>
                    <button
                        onClick={() => handleAddNode('process')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <Circle size={14} /> System
                    </button>
                    <button
                        onClick={() => handleAddNode('external_entity')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <Square size={14} /> Entity
                    </button>
                    <button
                        onClick={() => handleAddNode('boundary')}
                        className={`btn text-xs flex items-center gap-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-stone-100 hover:bg-stone-200 text-stone-800'}`}
                    >
                        <BoxSelect size={14} /> Boundary
                    </button>
                </>
            }
            propertiesPanelContent={
                <>
                    <h3 className={`font-bold mb-2 ${isDark ? 'text-slate-200' : 'text-stone-800'}`}>Properties</h3>
                    <div className="space-y-4">
                        {selectedNode && (
                            <div>
                                <label className="text-xs font-bold uppercase opacity-50 block mb-1">Name</label>
                                <input
                                    type="text"
                                    className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                    value={selectedNode.name}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const updatedNodes = data.nodes.map(n => n.id === selectedNode.id ? { ...n, name: newName } : n);
                                        const updatedDictionary = dictionary.map(d => d.id === selectedNode.id ? { ...d, name: newName } : d);
                                        onUpdate({ ...data, nodes: updatedNodes }, updatedDictionary);
                                    }}
                                />
                            </div>
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
                                        const updatedConnections = data.connections.map(c => c.id === selectedConnection.id ? { ...c, label: newLabel } : c);
                                        onUpdate({ ...data, connections: updatedConnections }, dictionary);
                                    }}
                                />

                                <div className="mt-4">
                                    <label className="text-xs font-bold uppercase opacity-50 block mb-1">Line Style</label>
                                    <select
                                        className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-stone-300'}`}
                                        value={selectedConnection.lineStyle || 'straight'}
                                        onChange={(e) => {
                                            const newStyle = e.target.value as any;
                                            const updatedConnections = data.connections.map(c => c.id === selectedConnection.id ? { ...c, lineStyle: newStyle } : c);
                                            onUpdate({ ...data, connections: updatedConnections }, dictionary);
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
                                                const updatedConnections = data.connections.map(c => c.id === selectedConnection.id ? { ...c, sourceArrow: e.target.checked } : c);
                                                onUpdate({ ...data, connections: updatedConnections }, dictionary);
                                            }}
                                        />
                                        Start Arrow
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selectedConnection.targetArrow || false}
                                            onChange={(e) => {
                                                const updatedConnections = data.connections.map(c => c.id === selectedConnection.id ? { ...c, targetArrow: e.target.checked } : c);
                                                onUpdate({ ...data, connections: updatedConnections }, dictionary);
                                            }}
                                        />
                                        End Arrow
                                    </label>
                                </div>

                                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => {
                                            const updatedConnections = data.connections.filter(c => c.id !== selectedConnection.id);
                                            onUpdate({ ...data, connections: updatedConnections }, dictionary);
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
                                        const updatedNodes = data.nodes.filter(n => n.id !== selectedNode.id);
                                        // Also remove connections attached to this node
                                        const updatedConnections = data.connections.filter(c => c.sourceId !== selectedNode.id && c.targetId !== selectedNode.id);
                                        onUpdate({ ...data, nodes: updatedNodes, connections: updatedConnections }, dictionary);
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
