import React, { useState } from 'react';
import { BaseDiagramEditor } from '../StructuredAnalysis/BaseDiagramEditor';
import { CanvasNode, CanvasConnection } from '../common/DiagramCanvas';
import { ProcessNode, ProcessDependency, Entity, DataFlowRef, TriggerNode } from '../../types/ie';
import { Database, ArrowRight, Zap } from 'lucide-react';
import { AnchorControls } from '../common/PropertiesPanel/AnchorControls';
import { NodeProperties } from '../common/PropertiesPanel/NodeProperties';

interface PDFDEditorProps {
    processes: ProcessNode[];
    entities: Entity[];
    dependencies: ProcessDependency[];
    dataFlows: DataFlowRef[];
    triggers: TriggerNode[]; // New prop
    onDataFlowsChange: (flows: DataFlowRef[]) => void;
    onDependenciesChange: (deps: ProcessDependency[]) => void;
    onProcessesChange: (processes: ProcessNode[]) => void;
    onEntitiesChange: (entities: Entity[]) => void;
    onTriggersChange: (triggers: TriggerNode[]) => void; // New handler
}

export const PDFDEditor: React.FC<PDFDEditorProps> = ({ 
    processes, 
    entities, 
    dependencies, 
    dataFlows,
    triggers,
    onDataFlowsChange, 
    onDependenciesChange,
    onProcessesChange, 
    onEntitiesChange,
    onTriggersChange
}) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<'select' | 'connect' | 'pan'>('select');

    // Combine all nodes
    const nodes: CanvasNode[] = [
        ...processes.map(p => ({
            id: p.id,
            x: p.position.x,
            y: p.position.y,
            width: p.size.width,
            height: p.size.height,
            shape: 'rounded-rectangle' as const,
            resizable: false,
            content: (
                <div className={`w-full h-full border-2 ${selectedIds.includes(p.id) ? 'border-blue-500' : 'border-slate-400'} bg-white rounded flex items-center justify-center p-2 text-center shadow-sm`}>
                    <span className="font-medium text-sm">{p.name}</span>
                </div>
            )
        })),
        ...entities.map(e => ({
            id: e.id,
            x: e.position.x,
            y: e.position.y,
            width: e.size.width,
            height: e.size.height,
            shape: 'rectangle' as const,
            resizable: false,
            content: (
                <div className={`w-full h-full border-x-2 border-y-0 ${selectedIds.includes(e.id) ? 'border-blue-500' : 'border-slate-600'} bg-slate-50 flex items-center justify-center p-2 text-center`}>
                     <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                         <Database size={12} /> {e.name}
                     </div>
                </div>
            )
        })),
        ...triggers.map(t => ({
            id: t.id,
            x: t.position.x,
            y: t.position.y,
            width: 40, 
            height: 40,
            shape: 'circle' as const,
            resizable: false,
            content: (
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className={`w-full h-full rounded-full border-2 ${selectedIds.includes(t.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-400 bg-white'} flex items-center justify-center shadow-sm z-10`} title={t.name}>
                        <Zap size={20} className={selectedIds.includes(t.id) ? "text-blue-500" : "text-slate-500"} fill="currentColor" fillOpacity={0.2} />
                    </div>
                    {/* External Label */}
                    <div className="absolute top-10 w-32 text-center pointer-events-none">
                        <span className="text-[10px] font-medium text-slate-600 bg-white/80 px-1 rounded truncate block max-w-full">
                            {t.name}
                        </span>
                    </div>
                </div>
            )
        }))
    ];

    // Helper to calculate anchors (Auto-default)
    const getAnchorSides = (sourceId: string, targetId: string) => {
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        if (!sourceNode || !targetNode) {
             return { source: 'right', target: 'left' } as const;
        }
        
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal
            return {
                source: dx > 0 ? 'right' : 'left',
                target: dx > 0 ? 'left' : 'right'
            } as const;
        } else {
            // Vertical
            return {
                source: dy > 0 ? 'bottom' : 'top',
                target: dy > 0 ? 'top' : 'bottom'
            } as const;
        }
    };

    // Connections
    const connections: CanvasConnection[] = [
        // 1. Control Flows (Dependencies: Process -> Process OR Trigger -> Process)
        ...dependencies.map(d => {
            const srcId = d.sourceTriggerId || d.sourceProcessId;
            const sides = getAnchorSides(srcId, d.targetProcessId);
            return {
                id: d.id,
                start: { x: 0, y: 0 },
                end: { x: 0, y: 0 },
                sourceNodeId: srcId,
                targetNodeId: d.targetProcessId,
                targetArrow: true,
                color: '#94a3b8', // Gray for Control
                lineStyle: d.lineStyle || 'orthogonal',
                lineDash: [5, 5],
                controlPoints: d.controlPoints,
                anchors: {
                    source: { 
                        x: 0, y: 0, 
                        side: d.sourceAnchorSide || sides.source, 
                        offset: d.sourceAnchorOffset ?? 0.5 
                    },
                    target: { 
                        x: 0, y: 0, 
                        side: d.targetAnchorSide || sides.target, 
                        offset: d.targetAnchorOffset ?? 0.5 
                    }
                }
            };
        }),
        // 2. Data Flows (Process <-> Entity)
        ...dataFlows.map(df => {
            let srcId = '';
            let tgtId = '';

            if (df.processId) {
                if (df.accessType === 'create' || df.accessType === 'update' || df.accessType === 'delete') {
                    srcId = df.processId;
                    tgtId = df.entityId;
                } else {
                    srcId = df.entityId;
                    tgtId = df.processId;
                }
            } else if (df.processDependencyId) {
                const dep = dependencies.find(d => d.id === df.processDependencyId);
                if (dep) {
                     if (df.accessType === 'read') {
                         srcId = df.entityId;
                         tgtId = dep.sourceProcessId;
                     } else {
                         srcId = dep.sourceProcessId;
                         tgtId = df.entityId;
                     }
                }
            }

            if (!srcId || !tgtId) return null;

            const sides = getAnchorSides(srcId, tgtId);
            return {
                id: df.id,
                start: { x: 0, y: 0 },
                end: { x: 0, y: 0 },
                sourceNodeId: srcId, 
                targetNodeId: tgtId,
                lineStyle: df.lineStyle || 'curved', 
                controlPoints: df.controlPoints,
                color: '#f59e0b', 
                label: df.accessType.toUpperCase(),
                targetArrow: true,
                anchors: {
                    source: { 
                        x: 0, y: 0, 
                        side: df.sourceAnchorSide || sides.source, 
                        offset: df.sourceAnchorOffset ?? 0.5 
                    },
                    target: { 
                        x: 0, y: 0, 
                        side: df.targetAnchorSide || sides.target, 
                        offset: df.targetAnchorOffset ?? 0.5 
                    }
                }
            };
        }).filter(Boolean) as CanvasConnection[]
    ];

    const handleConnectionCreate = (src: string, tgt: string) => {
        const sourceProcess = processes.find(p => p.id === src);
        const targetProcess = processes.find(p => p.id === tgt);
        const sourceEntity = entities.find(e => e.id === src);
        const targetEntity = entities.find(e => e.id === tgt);
        const sourceTrigger = triggers.find(t => t.id === src);

        // 1. Process -> Process (Sequence)
        if (sourceProcess && targetProcess) {
             if (dependencies.some(d => d.sourceProcessId === src && d.targetProcessId === tgt)) return;
             const newDep: ProcessDependency = {
                 id: crypto.randomUUID(),
                 sourceProcessId: src,
                 targetProcessId: tgt,
                 type: 'sequence',
                 lineStyle: 'orthogonal'
             };
             onDependenciesChange([...dependencies, newDep]);
             return;
        }

        // 2. Trigger -> Process (Sequence initiated by Trigger)
        if (sourceTrigger && targetProcess) {
             if (dependencies.some(d => d.sourceTriggerId === src && d.targetProcessId === tgt)) return;
             const newDep: ProcessDependency = {
                 id: crypto.randomUUID(),
                 sourceProcessId: '', // Empty or ignore if TriggerId set
                 sourceTriggerId: src,
                 targetProcessId: tgt,
                 type: 'sequence',
                 lineStyle: 'orthogonal'
             };
             onDependenciesChange([...dependencies, newDep]);
             return;
        }

        // 3. Process -> Entity
        if (sourceProcess && targetEntity) {
            const newFlow: DataFlowRef = {
                id: crypto.randomUUID(),
                processId: src,
                entityId: tgt,
                accessType: 'create',
                lineStyle: 'curved'
            };
            onDataFlowsChange([...dataFlows, newFlow]);
            return;
        }

        // 4. Entity -> Process
        if (sourceEntity && targetProcess) {
             const newFlow: DataFlowRef = {
                id: crypto.randomUUID(),
                processId: tgt,
                entityId: src,
                accessType: 'read',
                lineStyle: 'curved'
            };
            onDataFlowsChange([...dataFlows, newFlow]);
            return;
        }
    };

    const handleDelete = () => {
        const remainingDeps = dependencies.filter(d => !selectedIds.includes(d.id));
        const remainingFlows = dataFlows.filter(f => !selectedIds.includes(f.id));
        const remainingTriggers = triggers.filter(t => !selectedIds.includes(t.id)); // Delete triggers too!
        
        let changed = false;
        if (remainingDeps.length !== dependencies.length) {
            onDependenciesChange(remainingDeps);
            changed = true;
        }
        if (remainingFlows.length !== dataFlows.length) {
            onDataFlowsChange(remainingFlows);
            changed = true;
        }
        if (remainingTriggers.length !== triggers.length) {
            onTriggersChange(remainingTriggers);
            changed = true;
        }
        
        if (changed) {
            setSelectedIds([]);
        }
    };

    const handleNodeMove = (id: string, x: number, y: number) => {
        const proc = processes.find(p => p.id === id);
        if (proc) {
            onProcessesChange(processes.map(p => p.id === id ? { ...p, position: { x, y } } : p));
            return;
        }
        const ent = entities.find(e => e.id === id);
        if (ent) {
             onEntitiesChange(entities.map(e => e.id === id ? { ...e, position: { x, y } } : e));
             return;
        }
        const trig = triggers.find(t => t.id === id);
        if (trig) {
            onTriggersChange(triggers.map(t => t.id === id ? { ...t, position: { x, y } } : t));
        }
    };

    const handleNodeResize = (id: string, width: number, height: number) => {
        const proc = processes.find(p => p.id === id);
        if (proc) {
            onProcessesChange(processes.map(p => p.id === id ? { ...p, size: { width, height } } : p));
            return;
        }
        const ent = entities.find(e => e.id === id);
        if (ent) {
            onEntitiesChange(entities.map(e => e.id === id ? { ...e, size: { width, height } } : e));
        }
        // Triggers not resizable
    };

    const handleConnectionControlPointMove = (id: string, index: number, x: number, y: number) => {
        const dep = dependencies.find(d => d.id === id);
        if (dep) {
            const currentPoints = dep.controlPoints || [];
            let newPoints = [...currentPoints];
            if (newPoints.length !== 2) newPoints = [{ x, y }, { x, y }];
            newPoints[index] = { x, y };
            onDependenciesChange(dependencies.map(d => d.id === id ? { ...d, controlPoints: newPoints } : d));
            return;
        }
        const flow = dataFlows.find(f => f.id === id);
        if (flow) {
            const currentPoints = flow.controlPoints || [];
            let newPoints = [...currentPoints];
            if (newPoints.length !== 2) newPoints = [{ x, y }, { x, y }];
            newPoints[index] = { x, y };
            onDataFlowsChange(dataFlows.map(f => f.id === id ? { ...f, controlPoints: newPoints } : f));
        }
    };

    // Add Trigger Tool Logic
    const handleAddTrigger = () => {
        const newTrigger: TriggerNode = {
            id: crypto.randomUUID(),
            name: 'Trigger',
            position: { x: 100, y: 100 } // Default pos
        };
        onTriggersChange([...triggers, newTrigger]);
    };

    // --- Properties Panel Helpers ---
    // renderAnchorControls removed - using shared component directly or refactored below
    
    const renderPropertiesPanel = () => {
        if (selectedIds.length !== 1) return null;
        const id = selectedIds[0];
        const dep = dependencies.find(d => d.id === id);
        const flow = dataFlows.find(f => f.id === id);
        const trig = triggers.find(t => t.id === id);
        const proc = processes.find(p => p.id === id);
        const entity = entities.find(e => e.id === id);

        if (proc) {
            return (
                <div className="h-full w-full flex flex-col gap-4">
                     <NodeProperties 
                        name={proc.name}
                        description={proc.description}
                        onNameChange={(name) => onProcessesChange(processes.map(p => p.id === id ? { ...p, name } : p))}
                        onDescriptionChange={(description) => onProcessesChange(processes.map(p => p.id === id ? { ...p, description } : p))}
                        typeLabel="Process"
                        id={proc.id}
                     />
                </div>
            )
        }
        
        if (entity) {
            return (
                <div className="h-full w-full flex flex-col gap-4">
                     <NodeProperties 
                        name={entity.name}
                        description={entity.description}
                        onNameChange={(name) => onEntitiesChange(entities.map(e => e.id === id ? { ...e, name } : e))}
                        onDescriptionChange={(description) => onEntitiesChange(entities.map(e => e.id === id ? { ...e, description } : e))}
                        typeLabel="Entity"
                        id={entity.id}
                     />
                </div>
            )
        }

        if (trig) {
             return (
                 <div className="h-full w-full flex flex-col gap-4">
                     <NodeProperties 
                        name={trig.name}
                        description={trig.description}
                        onNameChange={(name) => onTriggersChange(triggers.map(t => t.id === id ? { ...t, name } : t))}
                        onDescriptionChange={(description) => onTriggersChange(triggers.map(t => t.id === id ? { ...t, description } : t))}
                        onDelete={() => {
                            onTriggersChange(triggers.filter(t => t.id !== id));
                            setSelectedIds([]);
                        }}
                        typeLabel="Trigger Event"
                        id={trig.id}
                     />
                 </div>
             );
        }

        if (!dep && !flow) return null;

        const updateItem = (updates: any) => {
            if (dep) onDependenciesChange(dependencies.map(d => d.id === id ? { ...d, ...updates } : d));
            if (flow) onDataFlowsChange(dataFlows.map(f => f.id === id ? { ...f, ...updates } : f));
        };

        const currentItem = dep || flow;
        if (!currentItem) return null;

        return (
            <div className="h-full w-full flex flex-col gap-4 overflow-y-auto">
                <div className="pb-2 border-b">
                    <h3 className="font-bold text-sm text-slate-800">{dep ? 'Control Flow' : 'Data Flow'}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-1" title={id}>{id.slice(0, 8)}...</div>
                </div>
                 {flow && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Access Type</label>
                        <select 
                            className="w-full p-2 border rounded text-sm bg-white"
                            value={flow.accessType}
                            onChange={(e) => onDataFlowsChange(dataFlows.map(f => f.id === id ? { ...f, accessType: e.target.value as any } : f))}
                        >
                            <option value="create">Create</option>
                            <option value="read">Read</option>
                            <option value="update">Update</option>
                            <option value="delete">Delete</option>
                        </select>
                    </div>
                )}
                 <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Line Style</label>
                    <div className="grid grid-cols-3 gap-1">
                        {['orthogonal', 'straight', 'curved'].map(style => (
                            <button
                                key={style}
                                onClick={() => {
                                    if (dep) onDependenciesChange(dependencies.map(d => d.id === id ? { ...d, lineStyle: style as any } : d));
                                    if (flow) onDataFlowsChange(dataFlows.map(f => f.id === id ? { ...f, lineStyle: style as any } : f));
                                }}
                                className={`px-2 py-1.5 text-xs border rounded capitalize ${
                                    (dep?.lineStyle || flow?.lineStyle || 'orthogonal') === style 
                                    ? 'bg-blue-50 border-blue-500 text-blue-700' 
                                    : 'bg-white text-slate-600'
                                }`}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
                <AnchorControls 
                    label="Source" 
                    sideValue={currentItem.sourceAnchorSide} 
                    offsetValue={currentItem.sourceAnchorOffset}
                    onSideChange={(val) => updateItem({ sourceAnchorSide: val })}
                    onOffsetChange={(val) => updateItem({ sourceAnchorOffset: val })}
                />
                <AnchorControls 
                    label="Target" 
                    sideValue={currentItem.targetAnchorSide} 
                    offsetValue={currentItem.targetAnchorOffset}
                    onSideChange={(val) => updateItem({ targetAnchorSide: val })}
                    onOffsetChange={(val) => updateItem({ targetAnchorOffset: val })}
                />
            </div>
        );
    };

    return (
        <div className="relative w-full h-full overflow-hidden">
            <BaseDiagramEditor
                nodes={nodes}
                connections={connections}
                onConnectionCreate={handleConnectionCreate}
                onConnectionControlPointMove={handleConnectionControlPointMove}
                onSelectionChange={setSelectedIds}
                selectedIds={selectedIds}
                activeTool={activeTool}
                setActiveTool={setActiveTool}
                isDark={false}
                onNodeMove={handleNodeMove}
                onNodeResize={handleNodeResize}
                onDelete={handleDelete}
                propertiesPanelContent={renderPropertiesPanel()}
                toolbarContent={(
                    <button 
                        onClick={handleAddTrigger}
                        className="bg-white border border-slate-200 shadow-sm rounded-lg px-3 py-1.5 text-xs font-semibold flex items-center gap-2 hover:bg-slate-50 transition-colors text-slate-700"
                        title="Add Event Trigger"
                    >
                        <Zap size={14} className="text-blue-500" fill="currentColor" />
                        <span>Add Trigger</span>
                    </button>
                )}
            />
            
            {/* Legend */}
            <div className="absolute bottom-4 left-4 p-3 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-lg text-xs z-10 space-y-2 pointer-events-none select-none">
                <div className="font-bold text-slate-800 mb-1">Legend</div>
                <div className="flex items-center gap-2">
                    <div className="w-8 flex justify-center"><Zap size={12} className="text-slate-500" /></div>
                    <span className="text-slate-600">Event Trigger</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0 border-t-2 border-dashed border-slate-400"></div>
                    <span className="text-slate-600">Control Flow</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-0 border-t-2 border-amber-500"></div>
                    <span className="text-slate-600">Data Flow</span>
                </div>
            </div>
        </div>
    );
 };
