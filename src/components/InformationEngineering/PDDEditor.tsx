import React, { useState } from 'react';
import { BaseDiagramEditor } from '../StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { ProcessNode, ProcessDependency } from '../../types/ie';

interface PDDEditorProps {
    processes: ProcessNode[];
    dependencies: ProcessDependency[];
    onDependenciesChange: (deps: ProcessDependency[]) => void;
    onProcessesChange: (processes: ProcessNode[]) => void;
}

export const PDDEditor: React.FC<PDDEditorProps> = ({ processes, dependencies, onDependenciesChange, onProcessesChange }) => {
    // No local state for data
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Convert to CanvasNodes
    const nodes: CanvasNode[] = processes.map(p => ({
        id: p.id,
        x: p.position.x, 
        y: p.position.y,
        width: p.size.width,
        height: p.size.height,
        shape: 'rounded-rectangle',
        resizable: false, // Keep size fixed for PDD
        content: (
            <div className={`w-full h-full border-2 bg-white rounded flex items-center justify-center p-2 text-center shadow-sm ${selectedIds.includes(p.id) ? 'border-blue-500' : 'border-slate-400'}`}>
                <span className="font-medium text-sm">{p.name}</span>
            </div>
        )
    }));

    // Convert Dependencies to CanvasConnections
    const connections: CanvasConnection[] = dependencies.map(d => {
        const sourceNode = processes.find(p => p.id === d.sourceProcessId);
        const targetNode = processes.find(p => p.id === d.targetProcessId);
        
        let sourceSide: 'top' | 'bottom' | 'left' | 'right' = 'right';
        let targetSide: 'top' | 'bottom' | 'left' | 'right' = 'left';

        if (sourceNode && targetNode) {
            const dx = targetNode.position.x - sourceNode.position.x;
            const dy = targetNode.position.y - sourceNode.position.y;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal
                sourceSide = dx > 0 ? 'right' : 'left';
                targetSide = dx > 0 ? 'left' : 'right';
            } else {
                // Vertical
                sourceSide = dy > 0 ? 'bottom' : 'top';
                targetSide = dy > 0 ? 'top' : 'bottom';
            }
        }

        return {
            id: d.id,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
            sourceNodeId: d.sourceProcessId,
            targetNodeId: d.targetProcessId,
            label: d.type === 'selection' ? '?' : undefined,
            color: d.type === 'iteration' ? '#eab308' : '#64748b',
            targetArrow: true,
            lineStyle: d.lineStyle || 'orthogonal',
            anchors: {
                source: { 
                    x: 0, y: 0, 
                    side: d.sourceAnchorSide || sourceSide, 
                    offset: d.sourceAnchorOffset ?? 0.5 
                },
                target: { 
                    x: 0, y: 0, 
                    side: d.targetAnchorSide || targetSide, 
                    offset: d.targetAnchorOffset ?? 0.5 
                }
            }
        };
    });

    const handleConnectionCreate = (src: string, tgt: string) => {
        // Prevent duplicates
        if (dependencies.some(d => d.sourceProcessId === src && d.targetProcessId === tgt)) return;

        const newDep: ProcessDependency = {
            id: crypto.randomUUID(),
            sourceProcessId: src,
            targetProcessId: tgt,
            type: 'sequence',
            lineStyle: 'orthogonal'
            // Defaults: auto side, 0.5 offset
        };
        onDependenciesChange([...dependencies, newDep]);
    };
    
    // Helper for anchor controls
    const renderAnchorControls = (label: string, sideKey: 'sourceAnchorSide' | 'targetAnchorSide', offsetKey: 'sourceAnchorOffset' | 'targetAnchorOffset') => {
        const dep = dependencies.find(d => d.id === selectedIds[0]);
        if (!dep) return null;
        
        return (
            <div className="border-t pt-2 mt-2">
                <label className="text-xs font-bold uppercase opacity-50 block mb-1">{label} Anchor</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <select 
                        className="p-1 border rounded text-xs"
                        value={dep[sideKey] || ''}
                        onChange={(e) => {
                            const val = e.target.value || undefined; // Empty = Auto
                            onDependenciesChange(dependencies.map(d => d.id === selectedIds[0] ? { ...d, [sideKey]: val } : d));
                        }}
                    >
                        <option value="">Auto</option>
                        <option value="top">Top</option>
                        <option value="bottom">Bottom</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                    </select>
                    {dep[sideKey] && (
                        <input 
                            type="range" min="0" max="1" step="0.05"
                            className="w-full"
                            value={dep[offsetKey] ?? 0.5}
                            onChange={(e) => {
                                onDependenciesChange(dependencies.map(d => d.id === selectedIds[0] ? { ...d, [offsetKey]: parseFloat(e.target.value) } : d));
                            }}
                            title={`Offset: ${Math.round((dep[offsetKey] ?? 0.5) * 100)}%`}
                        />
                    )}
                </div>
            </div>
        );
    };

    return (
        <BaseDiagramEditor
            nodes={nodes}
            connections={connections}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            isDark={false}
            onConnectionCreate={handleConnectionCreate}
            // In PDD we might change dependency type (seq/sel/iter) on selection
            propertiesPanelContent={
                selectedIds.length === 1 && dependencies.find(d => d.id === selectedIds[0]) ? (
                    <div className="p-4 bg-white border-l h-full w-64 flex flex-col gap-4 overflow-y-auto">
                         <div>
                             <h3 className="font-bold mb-2 text-sm text-slate-700">Dependency Type</h3>
                             <select 
                                className="w-full p-2 border rounded text-sm bg-slate-50"
                                value={dependencies.find(d => d.id === selectedIds[0])?.type}
                                onChange={(e) => {
                                    const newType = e.target.value as any;
                                    onDependenciesChange(dependencies.map(d => d.id === selectedIds[0] ? { ...d, type: newType } : d));
                                }}
                             >
                                <option value="sequence">Sequence (Gradient Line)</option>
                                <option value="selection">Selection (If/Branch)</option>
                                <option value="iteration">Iteration (Loop)</option>
                             </select>
                         </div>
                         
                         <div>
                             <h3 className="font-bold mb-2 text-sm text-slate-700">Line Style</h3>
                             <select 
                                className="w-full p-2 border rounded text-sm bg-slate-50"
                                value={dependencies.find(d => d.id === selectedIds[0])?.lineStyle || 'orthogonal'}
                                onChange={(e) => {
                                    const newStyle = e.target.value as any;
                                    onDependenciesChange(dependencies.map(d => d.id === selectedIds[0] ? { ...d, lineStyle: newStyle } : d));
                                }}
                             >
                                <option value="orthogonal">Orthogonal</option>
                                <option value="straight">Straight</option>
                                <option value="curved">Curved (Bezier)</option>
                             </select>
                         </div>
                         
                         {renderAnchorControls("Source (Start)", "sourceAnchorSide", "sourceAnchorOffset")}
                         {renderAnchorControls("Target (End)", "targetAnchorSide", "targetAnchorOffset")}
                    </div>
                ) : undefined
            }
             onNodeMove={(id, x, y) => {
                const updated = processes.map(p => p.id === id ? { ...p, position: { x, y } } : p);
                onProcessesChange(updated);
            }}
            onDelete={() => {
                const toDelete = new Set(selectedIds);
                // In PDD, we typically don't delete processes here (defined in FDD), only Dependencies
                // But filtering dependencies is safe
                const newDependencies = dependencies.filter(d => !toDelete.has(d.id));
                if (newDependencies.length !== dependencies.length) {
                    onDependenciesChange(newDependencies);
                    setSelectedIds([]);
                }
            }}
        />
    );
};
